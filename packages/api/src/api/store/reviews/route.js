const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const { Modules } = require("@medusajs/framework/utils")
const { remoteQueryObjectFromString, ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { updateCustomersWorkflow } = require("@medusajs/core-flows")

const DEFAULT_POINTS_PER_REVIEW = Number(process.env.POINTS_PER_PRODUCT_REVIEW || 15)
const clampRating = (value) => Math.max(1, Math.min(5, Number(value) || 0))
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const normalizeText = (value) => String(value || "").trim()

const safeLog = (logger, payload) => {
  try {
    logger?.debug?.(JSON.stringify(payload))
  } catch {
    logger?.debug?.(payload)
  }
}

const getAuthServices = (scope) => {
  const services = {}
  try {
    services.authIdentityService = scope.resolve("authIdentityService")
  } catch {}
  try {
    services.providerIdentityService = scope.resolve("providerIdentityService")
  } catch {}
  try {
    const authModule = scope.resolve(Modules.AUTH)
    services.authIdentityService =
      services.authIdentityService ||
      authModule?.authIdentityService_ ||
      authModule?.authIdentityService
    services.providerIdentityService =
      services.providerIdentityService ||
      authModule?.providerIdentityService_ ||
      authModule?.providerIdentityService
  } catch {}
  return services
}

const resolveCustomerIdFromIdentity = async (scope, authIdentityId, logger) => {
  if (!authIdentityId) return null
  try {
    const { authIdentityService, providerIdentityService } = getAuthServices(scope)
    if (!authIdentityService && !providerIdentityService) return null

    if (authIdentityService?.list) {
      const identities = await authIdentityService.list({ id: authIdentityId })
      const identity = identities?.[0]
      const candidate =
        identity?.entity_id ||
        identity?.app_metadata?.customer_id ||
        identity?.user_metadata?.customer_id ||
        null
      if (candidate && String(candidate).startsWith("cus_")) return candidate
    }

    if (authIdentityService?.retrieve) {
      const identity = await authIdentityService.retrieve(authIdentityId)
      const candidate =
        identity?.entity_id ||
        identity?.app_metadata?.customer_id ||
        identity?.user_metadata?.customer_id ||
        null
      if (candidate && String(candidate).startsWith("cus_")) return candidate
    }

    if (providerIdentityService?.list) {
      const providerIdentities = await providerIdentityService.list({ auth_identity_id: authIdentityId })
      const providerIdentity = providerIdentities?.[0]
      if (providerIdentity?.entity_id && String(providerIdentity.entity_id).startsWith("cus_")) {
        return providerIdentity.entity_id
      }
    }
  } catch (e) {
    safeLog(logger, { msg: "reviews:resolveCustomerIdFromIdentity:error", error: e?.message })
  }
  return null
}

const getCustomerId = async (req) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  if (req.auth_context?.actor_type === "customer" && req.auth_context.actor_id) {
    return req.auth_context.actor_id
  }
  if (req.auth_context?.actor_type === "store" && req.auth_context.auth_identity_id) {
    const resolved = await resolveCustomerIdFromIdentity(req.scope, req.auth_context.auth_identity_id, logger)
    if (resolved) return resolved
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return null
  const [, token] = authHeader.split(" ")
  if (!token) return null

  try {
    const config = req.scope.resolve("configModule")
    const http = config.projectConfig?.http || {}
    const verified = jwt.verify(
      token,
      http.jwtPublicKey || http.jwtSecret || config.projectConfig.jwtSecret,
      http.jwtVerifyOptions || http.jwtOptions || {}
    )
    const direct = verified.actor_id || verified.customer_id || verified.app_metadata?.customer_id
    if (direct && String(direct).startsWith("cus_")) return direct
    return await resolveCustomerIdFromIdentity(req.scope, verified.auth_identity_id, logger)
  } catch (e) {
    safeLog(logger, { msg: "reviews:jwt error", error: e?.message })
    return null
  }
}

const fetchCustomer = async (scope, customerId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id: customerId }, limit: 1 },
    fields: ["id", "first_name", "last_name", "metadata"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0]
}

const fetchOrdersForCustomer = async (scope, customerId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "order",
    variables: { filters: { customer_id: customerId }, limit: 200 },
    fields: [
      "id",
      "payment_status",
      "metadata",
      "shipping_address",
      "items.id",
      "items.product_id",
      "items.variant_id",
      "items.title",
    ],
  })
  return (await remoteQuery(query)) || []
}

const ensureReviewsTable = async (db) => {
  const exists = await db.schema.hasTable("product_reviews")
  if (!exists) {
    await db.schema.createTable("product_reviews", (table) => {
      table.string("id").primary()
      table.string("product_id").notNullable().index()
      table.string("customer_id").notNullable().index()
      table.string("company_id").nullable().index()
      table.string("order_id").nullable().index()
      table.integer("rating").notNullable()
      table.text("comment").notNullable()
      table.string("author_name").notNullable()
      table.integer("points_earned").notNullable().defaultTo(0)
      table.timestamp("created_at").notNullable().defaultTo(db.fn.now())
      table.timestamp("updated_at").notNullable().defaultTo(db.fn.now())
    })
    await db.schema.alterTable("product_reviews", (table) => {
      table.unique(["product_id", "customer_id", "order_id"])
    })
  }
}

const mapReviewRow = (row) => ({
  id: row.id,
  product_id: row.product_id,
  customer_id: row.customer_id,
  company_id: row.company_id,
  order_id: row.order_id,
  rating: Number(row.rating || 0),
  comment: row.comment || "",
  author_name: row.author_name || "Cliente",
  points_earned: Number(row.points_earned || 0),
  created_at: row.created_at,
  updated_at: row.updated_at,
})

const resolveCompanyId = (order) => {
  return (
    order?.shipping_address?.metadata?.company_id ||
    order?.shipping_address?.metadata?.condo_id ||
    order?.metadata?.company_id ||
    null
  )
}

const isPaidOrder = (order) => {
  const paymentStatus = String(order?.payment_status || "").toLowerCase()
  if (!paymentStatus) return true
  return ["captured", "paid", "authorized"].includes(paymentStatus)
}

const orderContainsProduct = (order, productId) => {
  const items = Array.isArray(order?.items) ? order.items : []
  return items.some((item) => item?.product_id === productId)
}

const pickEligibleOrder = (orders, productId, companyId, reviewedOrderIds = []) => {
  for (const order of orders) {
    if (!isPaidOrder(order)) continue
    if (!orderContainsProduct(order, productId)) continue
    const orderId = order?.id
    if (!orderId) continue
    if (reviewedOrderIds.includes(orderId)) continue
    if (companyId) {
      const orderCompanyId = resolveCompanyId(order)
      if (orderCompanyId && orderCompanyId !== companyId) continue
    }
    return order
  }
  return null
}

const GET = async (req, res) => {
  const productId = normalizeText(req.query?.product_id || req.query?.productId)
  if (!productId) {
    return res.status(400).json({ message: "product_id obrigatorio" })
  }

  const companyId = normalizeText(req.query?.company_id || req.query?.companyId) || null
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  await ensureReviewsTable(db)

  const limit = clamp(Number(req.query?.limit) || 50, 1, 200)
  const rows = await db("product_reviews")
    .select("*")
    .where({ product_id: productId })
    .modify((queryBuilder) => {
      if (companyId) queryBuilder.andWhere({ company_id: companyId })
    })
    .orderBy("created_at", "desc")
    .limit(limit)

  const reviews = rows.map(mapReviewRow)
  const totalCount = reviews.length
  const averageRating = totalCount
    ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / totalCount).toFixed(1))
    : 0

  const customerId = await getCustomerId(req)
  const pointsPerReview = DEFAULT_POINTS_PER_REVIEW

  if (!customerId) {
    return res.json({
      reviews,
      summary: { total_count: totalCount, average_rating: averageRating },
      eligibility: {
        can_review: false,
        points_per_review: pointsPerReview,
        remaining_reviews: 0,
      },
    })
  }

  const customerOrders = await fetchOrdersForCustomer(req.scope, customerId)
  const purchasedOrderIds = customerOrders
    .filter((order) => isPaidOrder(order) && orderContainsProduct(order, productId))
    .filter((order) => {
      if (!companyId) return true
      const orderCompanyId = resolveCompanyId(order)
      return !orderCompanyId || orderCompanyId === companyId
    })
    .map((order) => order.id)
    .filter(Boolean)

  const myReviewedOrderIds = reviews
    .filter((review) => review.customer_id === customerId)
    .map((review) => review.order_id)
    .filter(Boolean)

  const remainingReviews = Math.max(0, purchasedOrderIds.length - myReviewedOrderIds.length)

  return res.json({
    reviews,
    summary: { total_count: totalCount, average_rating: averageRating },
    eligibility: {
      can_review: remainingReviews > 0,
      points_per_review: pointsPerReview,
      purchased_orders: purchasedOrderIds.length,
      reviewed_orders: myReviewedOrderIds.length,
      remaining_reviews: remainingReviews,
    },
  })
}

const POST = async (req, res) => {
  const customerId = await getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const productId = normalizeText(req.body?.product_id || req.body?.productId)
  const companyId = normalizeText(req.body?.company_id || req.body?.companyId) || null
  const comment = normalizeText(req.body?.comment)
  const rating = clampRating(req.body?.rating)

  if (!productId || !comment || !rating) {
    return res.status(400).json({ message: "Campos obrigatorios: product_id, rating, comment" })
  }

  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  await ensureReviewsTable(db)

  const customer = await fetchCustomer(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const authorName = normalizeText(
    [customer.first_name, customer.last_name].filter(Boolean).join(" ")
  ) || "Cliente"

  const existingRows = await db("product_reviews")
    .select("order_id")
    .where({ product_id: productId, customer_id: customerId })
    .modify((queryBuilder) => {
      if (companyId) queryBuilder.andWhere({ company_id: companyId })
    })

  const reviewedOrderIds = existingRows.map((row) => row.order_id).filter(Boolean)

  const customerOrders = await fetchOrdersForCustomer(req.scope, customerId)
  const eligibleOrder = pickEligibleOrder(customerOrders, productId, companyId, reviewedOrderIds)
  if (!eligibleOrder) {
    return res.status(400).json({
      message: "Avaliacao disponivel apenas apos compra concluida deste produto.",
    })
  }

  const effectiveCompanyId = companyId || resolveCompanyId(eligibleOrder)
  const orderId = eligibleOrder.id
  const pointsPerReview = DEFAULT_POINTS_PER_REVIEW
  let pointsEarned = 0
  let pointsBalance = null
  let pointsTotal = null

  if (effectiveCompanyId) {
    const companies = Array.isArray(customer?.metadata?.companies) ? customer.metadata.companies : []
    const idx = companies.findIndex((company) => company.id === effectiveCompanyId)
    if (idx >= 0) {
      const currentCompany = companies[idx]
      const metadata = currentCompany?.metadata || {}
      const reviewEvents = Array.isArray(metadata.points_review_events) ? metadata.points_review_events : []
      const eventKey = `${orderId}:${productId}`
      const alreadyAwarded = reviewEvents.includes(eventKey)

      if (!alreadyAwarded) {
        pointsEarned = pointsPerReview
        pointsBalance = Number(metadata.points_balance || 0) + pointsEarned
        pointsTotal = Number(metadata.points_total || 0) + pointsEarned

        const nextCompanies = [...companies]
        nextCompanies[idx] = {
          ...currentCompany,
          metadata: {
            ...metadata,
            points_balance: pointsBalance,
            points_total: pointsTotal,
            points_review_events: [...reviewEvents, eventKey].slice(-500),
          },
        }

        await updateCustomersWorkflow(req.scope).run({
          input: {
            selector: { id: customerId },
            update: { metadata: { ...(customer.metadata || {}), companies: nextCompanies } },
          },
        })
      } else {
        pointsBalance = Number(metadata.points_balance || 0)
        pointsTotal = Number(metadata.points_total || 0)
      }
    }
  }

  const now = new Date()
  const reviewId = `prv_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`

  await db("product_reviews").insert({
    id: reviewId,
    product_id: productId,
    customer_id: customerId,
    company_id: effectiveCompanyId || null,
    order_id: orderId,
    rating,
    comment,
    author_name: authorName,
    points_earned: pointsEarned,
    created_at: now,
    updated_at: now,
  })

  const createdRow = await db("product_reviews").select("*").where({ id: reviewId }).first()

  return res.status(201).json({
    review: mapReviewRow(createdRow),
    points: {
      points_earned: pointsEarned,
      points_balance: pointsBalance,
      points_total: pointsTotal,
      points_per_review: pointsPerReview,
    },
  })
}

module.exports = { GET, POST }
