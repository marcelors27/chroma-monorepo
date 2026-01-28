const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")
const { loadEnv } = require("./load-env")

loadEnv()

const DATABASE_TYPE = process.env.DATABASE_TYPE || "postgres"
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://medusa:medusa@localhost:5432/chroma"
const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations")

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

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".js"))
}

async function getAppliedMigrationsPostgres() {
  const { Client } = require("pg")
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    const result = await client.query(
      "select name from mikro_orm_migrations"
    )
    return result.rows.map((row) => row.name)
  } finally {
    await client.end()
  }
}

async function getAppliedMigrationsSqlite() {
  const sqlite3 = require("sqlite3")
  const dbPath = parseSqlitePath(DATABASE_URL)
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err)
    })
    db.all("select name from mikro_orm_migrations", (err, rows) => {
      db.close()
      if (err) return reject(err)
      resolve(rows.map((row) => row.name))
    })
  })
}

async function shouldRunMigrations() {
  try {
    const migrationFiles = new Set(listMigrationFiles())
    if (migrationFiles.size === 0) return false

    if (DATABASE_TYPE === "sqlite") {
      const hasStore = await hasTableSqlite("store")
      const hasPushTokens = await hasTableSqlite("push_device_tokens")
      if (!hasStore || !hasPushTokens) return true

      const applied = new Set(await getAppliedMigrationsSqlite())
      for (const file of migrationFiles) {
        if (!applied.has(file)) return true
      }
      return false
    }

    const hasStore = await hasTablePostgres("store")
    const hasPushTokens = await hasTablePostgres("push_device_tokens")
    if (!hasStore || !hasPushTokens) return true

    const applied = new Set(await getAppliedMigrationsPostgres())
    for (const file of migrationFiles) {
      if (!applied.has(file)) return true
    }
    return false
  } catch (error) {
    console.warn(
      "[start-with-migrations] Failed to check database tables:",
      error?.message || error
    )
    return true
  }
}

async function main() {
  const apiDir = path.join(__dirname, "..")
  const adminBuildDir = path.join(apiDir, "public", "admin")
  const adminIndexPath = path.join(adminBuildDir, "index.html")
  const adminBuildFromServerDir = path.join(
    apiDir,
    ".medusa",
    "server",
    "public",
    "admin"
  )
  const needsAdminBuild = !fs.existsSync(adminIndexPath)

  if (await shouldRunMigrations()) {
    console.log("[start-with-migrations] Running migrations...")
    await runCommand("pnpm", ["migrate"], { cwd: apiDir })
  }

  if (needsAdminBuild) {
    console.log("[start-with-migrations] Building admin...")
    await runCommand("pnpm", ["medusa", "build"], { cwd: apiDir })
  }

  if (!fs.existsSync(adminIndexPath) && fs.existsSync(adminBuildFromServerDir)) {
    fs.mkdirSync(adminBuildDir, { recursive: true })
    fs.cpSync(adminBuildFromServerDir, adminBuildDir, { recursive: true })
  }

  if (!fs.existsSync(adminIndexPath)) {
    console.error(
      `[start-with-migrations] Admin build missing: ${adminIndexPath}.`
    )
    console.error(
      "[start-with-migrations] medusa start requires the admin build. Check build logs above."
    )
    process.exit(1)
  }

  await runCommand("pnpm", ["medusa", "start"], { cwd: apiDir })
}

main().catch((error) => {
  console.error("[start-with-migrations] Startup failed:", error)
  process.exit(1)
})
