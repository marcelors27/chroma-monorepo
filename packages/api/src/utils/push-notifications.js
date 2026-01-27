const normalizeDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

const mapPushNotificationRow = (row) => {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    target_type: row.target_type,
    target_company_ids: row.target_company_ids || [],
    target_user_ids: row.target_user_ids || [],
    send_at: normalizeDate(row.send_at),
    status: row.status,
    sent_at: normalizeDate(row.sent_at),
    created_at: normalizeDate(row.created_at),
    updated_at: normalizeDate(row.updated_at),
  }
}

module.exports = { mapPushNotificationRow }
