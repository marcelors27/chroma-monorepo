const { Client } = require("pg")
const { loadEnv } = require("./load-env")

loadEnv()

const DATABASE_TYPE = process.env.DATABASE_TYPE || "postgres"
const DATABASE_URL = process.env.DATABASE_URL
const DATABASE_SCHEMA =
  process.env.DATABASE_SCHEMA ||
  process.env.DB_SCHEMA ||
  process.env.MEDUSA_DB_SCHEMA ||
  "public"
const BATCH_SIZE = 200

async function listColumns(client, tableName) {
  const { rows } = await client.query(
    `select column_name
     from information_schema.columns
     where table_schema = $1
       and table_name = $2`,
    [DATABASE_SCHEMA, tableName]
  )
  return rows.map((row) => row.column_name).filter(Boolean)
}

async function listCartIdTables(client) {
  const { rows } = await client.query(
    `select table_name
     from information_schema.columns
     where table_schema = $1
       and column_name = 'cart_id'`,
    [DATABASE_SCHEMA]
  )
  return rows.map((row) => row.table_name).filter(Boolean)
}

async function listTablesWithColumn(client, columnName) {
  const { rows } = await client.query(
    `select table_name
     from information_schema.columns
     where table_schema = $1
       and column_name = $2`,
    [DATABASE_SCHEMA, columnName]
  )
  return rows.map((row) => row.table_name).filter(Boolean)
}

async function findOrderTable(client) {
  const { rows } = await client.query(
    `select table_name
     from information_schema.columns
     where table_schema = $1
       and column_name = 'cart_id'`,
    [DATABASE_SCHEMA]
  )

  for (const row of rows) {
    const table = row.table_name
    if (!table) continue
    if (table.includes("order")) {
      return table
    }
  }

  return null
}

async function findCartTable(client) {
  const { rows } = await client.query(
    `select table_name
     from information_schema.tables
     where table_schema = $1
       and table_type = 'BASE TABLE'
       and table_name in ('cart', 'carts')`,
    [DATABASE_SCHEMA]
  )

  for (const row of rows) {
    const table = row.table_name
    const cols = await listColumns(client, table)
    if (cols.includes("currency_code") && cols.includes("region_id")) {
      return table
    }
  }

  const { rows: candidates } = await client.query(
    `select table_name
     from information_schema.tables
     where table_schema = $1
       and table_type = 'BASE TABLE'
       and table_name like '%cart%'`,
    [DATABASE_SCHEMA]
  )

  for (const row of candidates) {
    const table = row.table_name
    const cols = await listColumns(client, table)
    if (cols.includes("currency_code") && cols.includes("region_id")) {
      return table
    }
  }

  return null
}

async function findPaymentSessionTable(client) {
  const candidates = ["payment_session", "payment_sessions"]
  for (const table of candidates) {
    const cols = await listColumns(client, table)
    if (cols.includes("payment_collection_id") && cols.includes("provider_id")) {
      return table
    }
  }
  return null
}

async function findPaymentTable(client) {
  const candidates = ["payment", "payments"]
  for (const table of candidates) {
    const cols = await listColumns(client, table)
    if (cols.includes("payment_collection_id") && cols.includes("amount")) {
      return table
    }
  }
  return null
}

async function fetchCartIdsWithoutOrder(client, orderTable) {
  const cartTable = await findCartTable(client)
  if (!cartTable) {
    throw new Error(
      `Tabela cart nao encontrada no schema ${DATABASE_SCHEMA}.`
    )
  }

  const cartColumns = await listColumns(client, cartTable)
  if (cartColumns.includes("completed_at")) {
    const { rows } = await client.query(
      `select id from "${cartTable}" where completed_at is null limit $1`,
      [BATCH_SIZE]
    )
    return rows.map((row) => row.id).filter(Boolean)
  }

  if (cartColumns.includes("order_id")) {
    const { rows } = await client.query(
      `select id from "${cartTable}" where order_id is null limit $1`,
      [BATCH_SIZE]
    )
    return rows.map((row) => row.id).filter(Boolean)
  }

  if (orderTable) {
    const { rows } = await client.query(
      `select c.id
       from "${cartTable}" c
       where not exists (
         select 1 from "${orderTable}" o where o.cart_id = c.id
       )
       limit $1`,
      [BATCH_SIZE]
    )
    return rows.map((row) => row.id).filter(Boolean)
  }

  throw new Error(
    "Nao foi possivel determinar a relacao entre cart e order."
  )
}

async function deleteCartsByIds(client, cartIds, cartIdTables) {
  const ids = cartIds.filter(Boolean)
  if (!ids.length) return 0

  const cartTable = await findCartTable(client)
  const paymentCollectionIds = []
  if (cartTable) {
    const cartColumns = await listColumns(client, cartTable)
    if (cartColumns.includes("payment_collection_id")) {
      const { rows } = await client.query(
        `select payment_collection_id
         from "${cartTable}"
         where id = any($1::text[])
           and payment_collection_id is not null`,
        [ids]
      )
      rows.forEach((row) => {
        if (row.payment_collection_id) {
          paymentCollectionIds.push(row.payment_collection_id)
        }
      })
    }
  }

  const orderedTables = [...new Set(cartIdTables)].sort((a, b) => {
    if (a === "cart") return 1
    if (b === "cart") return -1
    return a.localeCompare(b)
  })

  let deleted = 0
  await client.query("begin")
  try {
    if (paymentCollectionIds.length) {
      const paymentCollectionTables = await listTablesWithColumn(
        client,
        "payment_collection_id"
      )
      const paymentSessionTables = await listTablesWithColumn(
        client,
        "payment_session_id"
      )
      const paymentTables = await listTablesWithColumn(client, "payment_id")

      const paymentCollectionSet = new Set(paymentCollectionTables)
      const paymentSessionSet = new Set(paymentSessionTables)
      const paymentSet = new Set(paymentTables)

      let paymentSessionIds = []
      let paymentSessionIdsFromCollection = 0
      let paymentSessionIdsFromCart = 0
      const paymentSessionTable = await findPaymentSessionTable(client)
      if (paymentSessionTable) {
        const paymentSessionColumns = await listColumns(
          client,
          paymentSessionTable
        )
        if (paymentCollectionSet.has(paymentSessionTable)) {
          const { rows } = await client.query(
            `select id
             from "${paymentSessionTable}"
             where payment_collection_id = any($1::text[])`,
            [paymentCollectionIds]
          )
          paymentSessionIdsFromCollection = rows.length
          paymentSessionIds.push(...rows.map((row) => row.id).filter(Boolean))
        }

        if (paymentSessionColumns.includes("cart_id")) {
          const { rows } = await client.query(
            `select id
             from "${paymentSessionTable}"
             where cart_id = any($1::text[])`,
            [ids]
          )
          paymentSessionIdsFromCart = rows.length
          paymentSessionIds.push(...rows.map((row) => row.id).filter(Boolean))
        }
      }

      paymentSessionIds = [...new Set(paymentSessionIds)]

      if (paymentSessionIds.length) {
        for (const table of paymentSessionTables) {
          if (table === paymentSessionTable) continue
          const res = await client.query(
            `delete from "${table}" where payment_session_id = any($1::text[])`,
            [paymentSessionIds]
          )
          deleted += res.rowCount || 0
        }
      }

      if (paymentSessionTable && paymentSessionIds.length) {
        const res = await client.query(
          `delete from "${paymentSessionTable}" where id = any($1::text[])`,
          [paymentSessionIds]
        )
        deleted += res.rowCount || 0
      }

      if (paymentSessionIds.length) {
        console.log(
          `Payment sessions removidas: total=${paymentSessionIds.length} (collection=${paymentSessionIdsFromCollection}, cart=${paymentSessionIdsFromCart})`
        )
      }

      let paymentIds = []
      const paymentTable = await findPaymentTable(client)
      if (paymentTable && paymentCollectionSet.has(paymentTable)) {
        const { rows } = await client.query(
          `select id
           from "${paymentTable}"
           where payment_collection_id = any($1::text[])`,
          [paymentCollectionIds]
        )
        paymentIds = rows.map((row) => row.id).filter(Boolean)
      }

      if (paymentIds.length) {
        for (const table of paymentTables) {
          if (table === paymentTable) continue
          const res = await client.query(
            `delete from "${table}" where payment_id = any($1::text[])`,
            [paymentIds]
          )
          deleted += res.rowCount || 0
        }
      }

      if (paymentTable && paymentSet.has(paymentTable)) {
        const res = await client.query(
          `delete from "${paymentTable}" where id = any($1::text[])`,
          [paymentIds]
        )
        deleted += res.rowCount || 0
      }

      for (const table of paymentCollectionTables) {
        if (table === "payment_collection") continue
        const res = await client.query(
          `delete from "${table}" where payment_collection_id = any($1::text[])`,
          [paymentCollectionIds]
        )
        deleted += res.rowCount || 0
      }

      if (paymentCollectionSet.has("payment_collection")) {
        const res = await client.query(
          `delete from "payment_collection" where id = any($1::text[])`,
          [paymentCollectionIds]
        )
        deleted += res.rowCount || 0
      }
    }

    for (const table of orderedTables) {
      const res = await client.query(
        `delete from "${table}" where cart_id = any($1::text[])`,
        [ids]
      )
      deleted += res.rowCount || 0
    }

    if (cartTable) {
      await client.query(
        `delete from "${cartTable}" where id = any($1::text[])`,
        [ids]
      )
      deleted += ids.length
    }
    await client.query("commit")
    return deleted
  } catch (err) {
    await client.query("rollback")
    throw err
  }
}

async function runPostgres() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL nao encontrado no .env")
  }

  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  try {
    const cartIdTables = await listCartIdTables(client)
    const cartTable = await findCartTable(client)
    if (!cartTable) {
      console.log(`Tabela cart nao encontrada no schema ${DATABASE_SCHEMA}.`)
      return
    }

    const orderTable = await findOrderTable(client)
    let total = 0

    while (true) {
      const cartIds = await fetchCartIdsWithoutOrder(client, orderTable)
      if (!cartIds.length) break
      total += await deleteCartsByIds(client, cartIds, cartIdTables)
    }

    if (!total) {
      console.log("Nenhum cart sem order encontrado.")
      return
    }

    console.log(`Carts sem order removidos. Total de linhas: ${total}`)
  } finally {
    await client.end()
  }
}

async function run() {
  if (DATABASE_TYPE !== "postgres") {
    throw new Error(
      `DATABASE_TYPE=${DATABASE_TYPE} nao suportado por este script.`
    )
  }

  await runPostgres()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
