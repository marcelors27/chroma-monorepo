const { Migration } = require("@mikro-orm/migrations")

class Migration20250215 extends Migration {
  async up() {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "marketing_banners" (
        "id" TEXT PRIMARY KEY,
        "title" TEXT NOT NULL,
        "subtitle" TEXT,
        "image_url" TEXT,
        "image_mobile_url" TEXT,
        "animation_url" TEXT,
        "animation_mobile_url" TEXT,
        "link_type" TEXT,
        "link_value" TEXT,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "active_from" TIMESTAMPTZ,
        "active_until" TIMESTAMPTZ,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)

  }

  async down() {
    this.addSql('DROP TABLE IF EXISTS "marketing_banners";')
  }
}

module.exports = { default: Migration20250215 }
