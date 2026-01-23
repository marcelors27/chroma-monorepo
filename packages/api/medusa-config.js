const dotenv = require("dotenv")
const fs = require("fs")
const path = require("path")
const { Modules } = require("@medusajs/framework/utils")

// Load env from packages/api/.env.development when available (default for dev)
const preferredEnv =
  process.env.NODE_ENV === "production" ? ".env" : ".env.development"
const preferredEnvPath = path.join(__dirname, preferredEnv)
const fallbackEnvPath = path.join(__dirname, ".env")
const envPath = fs.existsSync(preferredEnvPath) ? preferredEnvPath : fallbackEnvPath
dotenv.config({ path: envPath })

const DATABASE_TYPE = process.env.DATABASE_TYPE || "postgres"
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://medusa:medusa@localhost:5432/chroma"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
const STORE_CORS =
  process.env.STORE_CORS ||
  "http://localhost:3000,https://localhost:3000,http://localhost:8080,https://localhost:8080"
const ADMIN_CORS =
  process.env.ADMIN_CORS || "http://localhost:3001,https://localhost:3001"
const AUTH_CORS =
  process.env.AUTH_CORS ||
  "http://localhost:3000,https://localhost:3000,http://localhost:8080,https://localhost:8080"
const JWT_SECRET = "supersecret"
const COOKIE_SECRET = "supersecret"
const S3_BUCKET = process.env.S3_BUCKET
const S3_REGION = process.env.S3_REGION || "auto"
const S3_ENDPOINT = process.env.S3_ENDPOINT
const S3_FILE_URL = process.env.S3_FILE_URL
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY
const S3_PREFIX = process.env.S3_PREFIX || ""
const S3_CACHE_CONTROL = process.env.S3_CACHE_CONTROL
const S3_DOWNLOAD_FILE_DURATION = process.env.S3_DOWNLOAD_FILE_DURATION
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === "true"

module.exports = {
  projectConfig: {
    databaseUrl: DATABASE_URL,
    databaseType: DATABASE_TYPE,
    databaseExtra:
      DATABASE_TYPE === "postgres"
        ? {
          ssl:
            process.env.NODE_ENV !== "development"
              ? { rejectUnauthorized: false }
              : false,
        }
        : {},
    redisUrl: REDIS_URL,
    http: {
      storeCors: STORE_CORS,
      adminCors: ADMIN_CORS,
      authCors: AUTH_CORS,
      jwtSecret: JWT_SECRET,
      cookieSecret: COOKIE_SECRET,
    },
    // Enable Medusa Dashboard at /app
    admin: { disable: false },
    store: { disable: false },
    // Ajuste os domínios de produção nos .env
  },
  admin: {
    disable: false,
    path: "/app",
  },
  plugins: [
    `medusa-payment-manual`,
  ],
  modules: {
    [Modules.AUTH]: {
      resolve: "@medusajs/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/auth-emailpass",
            id: "emailpass",
          },
          {
            resolve: path.join(__dirname, "src/auth/google"),
            id: "google",
            options: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              callbackUrl: process.env.GOOGLE_CALLBACK_URL,
            },
          },
          {
            resolve: path.join(__dirname, "src/auth/facebook"),
            id: "facebook",
            options: {
              clientId: process.env.FACEBOOK_CLIENT_ID,
              clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
              callbackUrl: process.env.FACEBOOK_CALLBACK_URL,
            },
          },
          {
            resolve: "@medusajs/auth-github",
            id: "github",
            options: {
              clientId: process.env.GITHUB_CLIENT_ID,
              clientSecret: process.env.GITHUB_CLIENT_SECRET,
              callbackUrl: process.env.GITHUB_CALLBACK_URL,
            },
          },
          {
            resolve: path.join(__dirname, "src/auth/apple"),
            id: "apple",
            options: {
              clientId: process.env.APPLE_CLIENT_ID,
              teamId: process.env.APPLE_TEAM_ID,
              keyId: process.env.APPLE_KEY_ID,
              privateKey: process.env.APPLE_PRIVATE_KEY,
              callbackUrl: process.env.APPLE_CALLBACK_URL,
            },
          },
        ],
      },
    },
    [Modules.USER]: {
      resolve: "@medusajs/user",
      options: {
        jwt_secret: process.env.JWT_SECRET || "supersecret",
      },
    },
    [Modules.LOCKING]: {
      resolve: path.join(__dirname, "locking-inmemory"),
    },
    [Modules.CACHE]: {
      resolve: "@medusajs/cache-inmemory",
    },
    [Modules.EVENT_BUS]: {
      resolve: "@medusajs/event-bus-local",
    },
    [Modules.WORKFLOW_ENGINE]: {
      resolve: "@medusajs/workflow-engine-inmemory",
    },
    [Modules.STORE]: {
      resolve: "@medusajs/store",
    },
    [Modules.PRODUCT]: {
      resolve: "@medusajs/product",
    },
    [Modules.PRICING]: {
      resolve: "@medusajs/pricing",
    },
    [Modules.CUSTOMER]: {
      resolve: "@medusajs/customer",
    },
    [Modules.CART]: {
      resolve: "@medusajs/cart",
    },
    [Modules.ORDER]: {
      resolve: "@medusajs/order",
    },
    [Modules.PAYMENT]: {
      resolve: "@medusajs/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    },
    [Modules.REGION]: {
      resolve: "@medusajs/region",
    },
    [Modules.SALES_CHANNEL]: {
      resolve: "@medusajs/sales-channel",
    },
    [Modules.INVENTORY]: {
      resolve: "@medusajs/inventory",
    },
    [Modules.STOCK_LOCATION]: {
      resolve: "@medusajs/stock-location",
    },
    [Modules.FULFILLMENT]: {
      resolve: "@medusajs/fulfillment",
      options: {
        providers: [
          {
            resolve: "@medusajs/fulfillment-manual",
            id: "manual",
          },
        ],
      },
    },
    [Modules.TAX]: {
      resolve: "@medusajs/tax",
    },
    [Modules.PROMOTION]: {
      resolve: "@medusajs/promotion",
    },
    [Modules.CURRENCY]: {
      resolve: "@medusajs/currency",
    },
    [Modules.API_KEY]: {
      resolve: "@medusajs/api-key",
    },
    [Modules.NOTIFICATION]: {
      resolve: "@medusajs/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/notification-local",
            id: "local",
          },
        ],
      },
    },
    [Modules.FILE]: {
      resolve: "@medusajs/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-s3",
            id: "s3",
            options: {
              file_url: S3_FILE_URL,
              access_key_id: S3_ACCESS_KEY_ID,
              secret_access_key: S3_SECRET_ACCESS_KEY,
              region: S3_REGION,
              bucket: S3_BUCKET,
              prefix: S3_PREFIX,
              endpoint: S3_ENDPOINT,
              cache_control: S3_CACHE_CONTROL,
              download_file_duration: S3_DOWNLOAD_FILE_DURATION
                ? Number(S3_DOWNLOAD_FILE_DURATION)
                : undefined,
              additional_client_config: S3_FORCE_PATH_STYLE
                ? { forcePathStyle: true }
                : {},
            },
          },
        ],
      },
    },
  },
}
