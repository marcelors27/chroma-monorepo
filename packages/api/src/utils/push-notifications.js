const normalizeDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

const normalizeJsonArray = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const mapPushNotificationRow = (row) => {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    target_type: row.target_type,
    target_company_ids: normalizeJsonArray(row.target_company_ids),
    target_user_ids: normalizeJsonArray(row.target_user_ids),
    send_at: normalizeDate(row.send_at),
    status: row.status,
    last_error: row.last_error || null,
    sent_at: normalizeDate(row.sent_at),
    created_at: normalizeDate(row.created_at),
    updated_at: normalizeDate(row.updated_at),
  }
}

module.exports = { mapPushNotificationRow }
