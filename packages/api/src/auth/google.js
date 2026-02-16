const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const {
  AbstractAuthModuleProvider,
  MedusaError,
  ModuleProvider,
  Modules,
} = require("@medusajs/framework/utils")
const isEmail = (value) => typeof value === "string" && value.includes("@")
const maskEmail = (value) => {
  if (!isEmail(value)) return value || null
  const [user, domain] = value.split("@")
  const maskedUser = user.length <= 2 ? `${user[0] || ""}*` : `${user.slice(0, 2)}***`
  return `${maskedUser}@${domain}`
}
const readHeaderValue = (value) => {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

class GoogleAuthService extends AbstractAuthModuleProvider {
  static identifier = "google"
  static DISPLAY_NAME = "Google Authentication"

  static validateOptions(options) {
    if (!options.clientId) {
      throw new Error("Google clientId is required")
    }
    if (!options.clientSecret) {
      throw new Error("Google clientSecret is required")
    }
    if (!options.callbackUrl) {
      throw new Error("Google callbackUrl is required")
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
      "Google does not support registration. Use method `authenticate` instead."
    )
  }

  async authenticate(req, authIdentityService) {
    const query = req.query ?? {}
    const body = req.body ?? {}
    const flowId = readHeaderValue(req.headers?.["x-debug-flow-id"])

    if (query.error) {
      this.logger_?.warn?.(
        JSON.stringify({
          msg: "google authenticate provider error",
          flow_id: flowId,
          error: `${query.error_description}, read more at: ${query.error_uri}`,
        })
      )
      return {
        success: false,
        error: `${query.error_description}, read more at: ${query.error_uri}`,
      }
    }

    const stateKey = crypto.randomBytes(32).toString("hex")
    const state = {
      callback_url: body?.callback_url ?? this.config_.callbackUrl,
    }
    this.logger_?.info?.(
      JSON.stringify({
        msg: "google authenticate start",
        flow_id: flowId,
        callback_url: state.callback_url,
      })
    )

    await authIdentityService.setState(stateKey, state)
    return this.getRedirect_(this.config_.clientId, state.callback_url, stateKey)
  }

  async validateCallback(req, authIdentityService) {
    const query = req.query ?? {}
    const body = req.body ?? {}
    const flowId = readHeaderValue(req.headers?.["x-debug-flow-id"])
    const hasIdentityToken = !!(
      body?.identity_token ||
      body?.id_token ||
      query?.identity_token ||
      query?.id_token
    )
    const hasCode = !!(query?.code ?? body?.code)
    const hasState = !!(query?.state ?? body?.state)

    if (query.error || body.error) {
      this.logger_?.warn?.(
        JSON.stringify({
          msg: "google validateCallback provider error",
          flow_id: flowId,
          error: query.error_description || body.error_description || query.error,
        })
      )
      return {
        success: false,
        error: query.error_description || body.error_description || query.error,
      }
    }
    this.logger_?.info?.(
      JSON.stringify({
        msg: "google validateCallback start",
        flow_id: flowId,
        has_identity_token: hasIdentityToken,
        has_code: hasCode,
        has_state: hasState,
      })
    )

    const idToken =
      body?.identity_token ||
      body?.id_token ||
      query?.identity_token ||
      query?.id_token
    if (idToken) {
      try {
        const { authIdentity, success } = await this.verify_(idToken, authIdentityService)
        this.logger_?.info?.(
          JSON.stringify({
            msg: "google validateCallback identity token verified",
            flow_id: flowId,
            success,
            auth_identity_id: authIdentity?.id || null,
          })
        )
        return { success, authIdentity }
      } catch (error) {
        this.logger_?.warn?.(
          JSON.stringify({
            msg: "google validateCallback identity token failed",
            flow_id: flowId,
            error: error?.message || "unknown_error",
          })
        )
        return { success: false, error: error.message }
      }
    }

    const code = query?.code ?? body?.code
    if (!code) {
      return { success: false, error: "No code provided" }
    }

    const state = await authIdentityService.getState(query?.state)
    if (!state) {
      this.logger_?.warn?.(
        JSON.stringify({
          msg: "google validateCallback missing state",
          flow_id: flowId,
        })
      )
      return { success: false, error: "No state provided, or session expired" }
    }

    const params = `client_id=${this.config_.clientId}&client_secret=${this.config_.clientSecret}&code=${code}&redirect_uri=${state.callback_url}&grant_type=authorization_code`
    const exchangeTokenUrl = new URL(`https://oauth2.googleapis.com/token?${params}`)

    try {
      const response = await fetch(exchangeTokenUrl.toString(), {
        method: "POST",
      }).then((r) => {
        if (!r.ok) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Could not exchange token, ${r.status}, ${r.statusText}`
          )
        }
        return r.json()
      })

      const { authIdentity, success } = await this.verify_(response.id_token, authIdentityService)
      this.logger_?.info?.(
        JSON.stringify({
          msg: "google validateCallback code verified",
          flow_id: flowId,
          success,
          auth_identity_id: authIdentity?.id || null,
        })
      )
      return {
        success,
        authIdentity,
      }
    } catch (error) {
      this.logger_?.warn?.(
        JSON.stringify({
          msg: "google validateCallback code failed",
          flow_id: flowId,
          error: error?.message || "unknown_error",
        })
      )
      return { success: false, error: error.message }
    }
  }

  async verify_(idToken, authIdentityService) {
    if (!idToken) {
      return { success: false, error: "No ID found" }
    }

    const jwtData = jwt.decode(idToken, { complete: true })
    const payload = jwtData?.payload ?? {}

    if (!payload.email_verified) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Email not verified, cannot proceed with authentication"
      )
    }

    const entity_id = payload.sub
    const userMetadata = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name,
    }
    this.logger_?.info?.(
      JSON.stringify({
        msg: "google verify payload",
        entity_id: entity_id || null,
        email: maskEmail(payload.email),
        email_verified: payload.email_verified,
      })
    )

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
    const authUrl = new URL(`https://accounts.google.com/o/oauth2/v2/auth`)
    authUrl.searchParams.set("redirect_uri", callbackUrl)
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", "email profile openid")
    authUrl.searchParams.set("state", stateKey)
    return { success: true, location: authUrl.toString() }
  }
}

module.exports = ModuleProvider(Modules.AUTH, {
  services: [GoogleAuthService],
})
