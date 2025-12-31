const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")

function loadEnv() {
  const preferred =
    process.env.NODE_ENV === "production" ? ".env" : ".env.development"
  const preferredPath = path.join(__dirname, "..", preferred)
  const fallbackPath = path.join(__dirname, "..", ".env")
  const envPath = fs.existsSync(preferredPath) ? preferredPath : fallbackPath

  dotenv.config({ path: envPath })
}

module.exports = { loadEnv }
