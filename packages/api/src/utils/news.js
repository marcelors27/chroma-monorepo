const normalizeDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

const mapNewsRow = (row) => {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    category: row.category,
    image_url: row.image_url,
    author: row.author,
    source: row.source,
    read_time: row.read_time,
    published_at: normalizeDate(row.published_at),
    is_published: row.is_published,
    created_at: normalizeDate(row.created_at),
    updated_at: normalizeDate(row.updated_at),
  }
}

module.exports = { mapNewsRow }
