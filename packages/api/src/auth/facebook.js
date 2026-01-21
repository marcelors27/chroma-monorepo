const crypto = require("crypto")
const {
  AbstractAuthModuleProvider,
  MedusaError,
  ModuleProvider,
  Modules,
} = require("@medusajs/framework/utils")

const FACEBOOK_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth"
const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token"
const FACEBOOK_ME_URL = "https://graph.facebook.com/me"

class FacebookAuthService extends AbstractAuthModuleProvider {
  static identifier = "facebook"
  static DISPLAY_NAME = "Facebook Authentication"

  static validateOptions(options) {
    if (!options.clientId) {
      throw new Error("Facebook clientId is required")
    }
    if (!options.clientSecret) {
      throw new Error("Facebook clientSecret is required")
    }
    if (!options.callbackUrl) {
      throw new Error("Facebook callbackUrl is required")
    }
  }

  constructor({ logger }, options) {
    // @ts-ignore
    super(...arguments)
    this.config_ = options
    this.logger_ = logger
  }

  async register(_) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Facebook does not support registration. Use method `authenticate` instead."
    )
  }

  async authenticate(req, authIdentityService) {
    const query = req.query ?? {}
    const body = req.body ?? {}

    if (query.error) {
      return {
        success: false,
        error: `${query.error_description || query.error}, read more at: ${query.error_uri}`,
      }
    }

    const stateKey = crypto.randomBytes(32).toString("hex")
    const state = {
      callback_url: body?.callback_url ?? this.config_.callbackUrl,
    }

    await authIdentityService.setState(stateKey, state)
    return this.getRedirect_(this.config_.clientId, state.callback_url, stateKey)
  }

  async validateCallback(req, authIdentityService) {
    const query = req.query ?? {}
    const body = req.body ?? {}

    if (query.error || body.error) {
      return {
        success: false,
        error: query.error_description || body.error_description || query.error || body.error,
      }
    }

    const accessToken =
      body?.access_token ||
      query?.access_token

    if (accessToken) {
      try {
        const { authIdentity, success } = await this.verify_(accessToken, authIdentityService)
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

    const exchangeUrl = new URL(FACEBOOK_TOKEN_URL)
    exchangeUrl.searchParams.set("client_id", this.config_.clientId)
    exchangeUrl.searchParams.set("client_secret", this.config_.clientSecret)
    exchangeUrl.searchParams.set("redirect_uri", state.callback_url)
    exchangeUrl.searchParams.set("code", code)

    try {
      const response = await fetch(exchangeUrl.toString(), { method: "GET" }).then((r) => {
        if (!r.ok) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Could not exchange token, ${r.status}, ${r.statusText}`
          )
        }
        return r.json()
      })

      const { authIdentity, success } = await this.verify_(response.access_token, authIdentityService)
      return {
        success,
        authIdentity,
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async verify_(accessToken, authIdentityService) {
    if (!accessToken) {
      return { success: false, error: "No access token provided" }
    }

    const meUrl = new URL(FACEBOOK_ME_URL)
    meUrl.searchParams.set("fields", "id,name,email,picture")
    meUrl.searchParams.set("access_token", accessToken)

    const profile = await fetch(meUrl.toString(), { method: "GET" }).then((r) => {
      if (!r.ok) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Could not fetch profile, ${r.status}, ${r.statusText}`
        )
      }
      return r.json()
    })

    if (!profile?.id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Facebook profile not found")
    }

    if (!profile?.email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Email not provided by Facebook"
      )
    }

    const entity_id = profile.id
    const userMetadata = {
      name: profile.name,
      email: profile.email,
      picture: profile?.picture?.data?.url,
    }

    let authIdentity
    try {
      authIdentity = await authIdentityService.retrieve({
        entity_id,
      })
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

    return {
      success: true,
      authIdentity,
    }
  }

  getRedirect_(clientId, callbackUrl, stateKey) {
    const authUrl = new URL(FACEBOOK_AUTH_URL)
    authUrl.searchParams.set("redirect_uri", callbackUrl)
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", "email,public_profile")
    authUrl.searchParams.set("state", stateKey)
    return { success: true, location: authUrl.toString() }
  }
}

module.exports = ModuleProvider(Modules.AUTH, {
  services: [FacebookAuthService],
})
