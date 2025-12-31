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
  plugins: [
    `medusa-payment-manual`,
    {
      resolve: `medusa-file-local`,
      options: {
        upload_dir: "uploads",
      },
    },
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
            resolve: "@medusajs/auth-google",
            id: "google",
            options: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              callbackUrl: process.env.GOOGLE_CALLBACK_URL,
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
  },
}
