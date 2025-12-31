const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")
const { loadEnv } = require("./load-env")

loadEnv()

const DATABASE_TYPE = process.env.DATABASE_TYPE || "postgres"
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://medusa:medusa@localhost:5432/chroma"

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    })
    child.on("exit", (code) => {
      if (code === 0) return resolve()
      reject(new Error(`${command} exited with code ${code}`))
    })
    child.on("error", reject)
  })
}

async function hasTablePostgres(tableName) {
  const { Client } = require("pg")
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    const result = await client.query(
      "select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = $1) as exists",
      [tableName]
    )
    return Boolean(result.rows[0]?.exists)
  } finally {
    await client.end()
  }
}

function parseSqlitePath(url) {
  if (url.startsWith("sqlite://")) {
    return url.replace("sqlite://", "")
  }
  if (url.startsWith("sqlite:")) {
    return url.replace("sqlite:", "")
  }
  return url
}

async function hasTableSqlite(tableName) {
  const sqlite3 = require("sqlite3")
  const dbPath = parseSqlitePath(DATABASE_URL)
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err)
    })
    db.get(
      "select name from sqlite_master where type = 'table' and name = ?",
      [tableName],
      (err, row) => {
        db.close()
        if (err) return reject(err)
        resolve(Boolean(row))
      }
    )
  })
}

async function shouldRunMigrations() {
  try {
    if (DATABASE_TYPE === "sqlite") {
      return !(await hasTableSqlite("store"))
    }
    return !(await hasTablePostgres("store"))
  } catch (error) {
    console.warn(
      "[start-with-migrations] Failed to check database tables:",
      error?.message || error
    )
    return false
  }
}

async function main() {
  const apiDir = path.join(__dirname, "..")
  const adminIndexPath = path.join(apiDir, "public", "admin", "index.html")
  const needsAdminBuild = !fs.existsSync(adminIndexPath)

  if (await shouldRunMigrations()) {
    console.log("[start-with-migrations] Running migrations...")
    await runCommand("pnpm", ["migrate"], { cwd: apiDir })
  }

  if (needsAdminBuild) {
    console.log("[start-with-migrations] Building admin...")
    await runCommand("pnpm", ["medusa", "build"], { cwd: apiDir })
  }

  await runCommand("pnpm", ["medusa", "start"], { cwd: apiDir })
}

main().catch((error) => {
  console.error("[start-with-migrations] Startup failed:", error)
  process.exit(1)
})
