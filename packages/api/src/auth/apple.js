const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const {
  AbstractAuthModuleProvider,
  MedusaError,
  ModuleProvider,
  Modules,
} = require("@medusajs/framework/utils")

const APPLE_AUTH_URL = "https://appleid.apple.com/auth/authorize"
const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"
const DEFAULT_CLIENT_SECRET_TTL_SECONDS = 60 * 5

class AppleAuthService extends AbstractAuthModuleProvider {
  static identifier = "apple"
  static DISPLAY_NAME = "Apple Authentication"

  static validateOptions(options) {
    const provided = [
      options.clientId,
      options.teamId,
      options.keyId,
      options.privateKey,
      options.callbackUrl,
    ].filter(Boolean)

    if (provided.length === 0) {
      return
    }

    if (!options.clientId) {
      throw new Error("Apple clientId is required")
    }
    if (!options.teamId) {
      throw new Error("Apple teamId is required")
    }
    if (!options.keyId) {
      throw new Error("Apple keyId is required")
    }
    if (!options.privateKey) {
      throw new Error("Apple privateKey is required")
    }
    if (!options.callbackUrl) {
      throw new Error("Apple callbackUrl is required")
    }
  }

  constructor(cradle, options) {
    // @ts-ignore
    super(...arguments)
    this.config_ = options
    this.logger_ = cradle?.logger
  }

  async register() {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Apple does not support registration. Use method `authenticate` instead."
    )
  }

  async authenticate(req, authIdentityService) {
    const query = req.query ?? {}
    const body = req.body ?? {}

    if (query.error || body.error) {
      return {
        success: false,
        error: query.error_description || body.error_description || query.error,
      }
    }

    const stateKey = crypto.randomBytes(32).toString("hex")
    const state = {
      callback_url: body?.callback_url ?? this.config_.callbackUrl,
    }

    await authIdentityService.setState(stateKey, state)
    return this.getRedirect_(state.callback_url, stateKey)
  }

  async validateCallback(req, authIdentityService) {
    const query = req.query ?? {}
    const body = req.body ?? {}

    if (query.error || body.error) {
      return {
        success: false,
        error: query.error_description || body.error_description || query.error,
      }
    }

    const idToken =
      body?.identity_token ||
      body?.id_token ||
      query?.identity_token ||
      query?.id_token
    if (idToken) {
      try {
        const { authIdentity, success } = await this.verify_(
          idToken,
          authIdentityService
        )
        return { success, authIdentity }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }

    const code = query?.code ?? body?.code
    if (!code) {
      return { success: false, error: "No code provided" }
    }

    const stateKey = query?.state ?? body?.state
    const state = await authIdentityService.getState(stateKey)
    if (!state) {
      return { success: false, error: "No state provided, or session expired" }
    }

    try {
      const tokenResponse = await this.exchangeToken_(code, state.callback_url)
      const { authIdentity, success } = await this.verify_(
        tokenResponse.id_token,
        authIdentityService
      )
      return { success, authIdentity }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async exchangeToken_(code, callbackUrl) {
    const params = new URLSearchParams({
      client_id: this.config_.clientId,
      client_secret: this.buildClientSecret_(),
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
    })

    const response = await fetch(APPLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    })

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Could not exchange token, ${response.status}, ${response.statusText}`
      )
    }

    const data = await response.json()
    if (data.error) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        data.error_description || data.error
      )
    }

    return data
  }

  async verify_(idToken, authIdentityService) {
    if (!idToken) {
      return { success: false, error: "No ID token returned from Apple" }
    }

    const jwtData = jwt.decode(idToken, { complete: true })
    const payload = jwtData?.payload ?? {}

    if (!payload.sub) {
      return { success: false, error: "No subject found in Apple token" }
    }

    if (payload.email_verified === false || payload.email_verified === "false") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Email not verified, cannot proceed with authentication"
      )
    }

    const entity_id = payload.sub
    const userMetadata = {
      email: payload.email,
      email_verified: payload.email_verified,
      is_private_email: payload.is_private_email,
    }

    let authIdentity
    try {
      authIdentity = await authIdentityService.retrieve({ entity_id })
    } catch (error) {
      if (error.type === MedusaError.Types.NOT_FOUND) {
        const createdAuthIdentity = await authIdentityService.create({
          entity_id,
          user_metadata: userMetadata,
        })
        authIdentity = createdAuthIdentity
      } else {
        return { success: false, error: error.message }
      }
    }

    return { success: true, authIdentity }
  }

  buildClientSecret_() {
    const issuedAt = Math.floor(Date.now() / 1000)
    const expiresAt =
      issuedAt +
      (this.config_.clientSecretTtlSeconds ?? DEFAULT_CLIENT_SECRET_TTL_SECONDS)

    return jwt.sign(
      {
        iss: this.config_.teamId,
        iat: issuedAt,
        exp: expiresAt,
        aud: "https://appleid.apple.com",
        sub: this.config_.clientId,
      },
      this.normalizePrivateKey_(this.config_.privateKey),
      {
        algorithm: "ES256",
        keyid: this.config_.keyId,
      }
    )
  }

  normalizePrivateKey_(privateKey) {
    if (!privateKey) {
      return ""
    }
    return privateKey.includes("\\n")
      ? privateKey.replace(/\\n/g, "\n")
      : privateKey
  }

  getRedirect_(callbackUrl, stateKey) {
    const authUrl = new URL(APPLE_AUTH_URL)
    authUrl.searchParams.set("client_id", this.config_.clientId)
    authUrl.searchParams.set("redirect_uri", callbackUrl)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("response_mode", "query")
    authUrl.searchParams.set("scope", "name email")
    authUrl.searchParams.set("state", stateKey)

    return { success: true, location: authUrl.toString() }
  }
}

module.exports = ModuleProvider(Modules.AUTH, {
  services: [AppleAuthService],
})
