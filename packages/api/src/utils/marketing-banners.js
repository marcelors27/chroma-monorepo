const normalizeDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

const mapMarketingBannerRow = (row) => {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    image_url: row.image_url,
    image_mobile_url: row.image_mobile_url,
    animation_url: row.animation_url,
    animation_mobile_url: row.animation_mobile_url,
    fallback_image_url: row.fallback_image_url,
    fallback_image_mobile_url: row.fallback_image_mobile_url,
    link_type: row.link_type,
    link_value: row.link_value,
    sort_order: row.sort_order,
    active_from: normalizeDate(row.active_from),
    active_until: normalizeDate(row.active_until),
    is_active: row.is_active,
    created_at: normalizeDate(row.created_at),
    updated_at: normalizeDate(row.updated_at),
  }
}

module.exports = { mapMarketingBannerRow }
