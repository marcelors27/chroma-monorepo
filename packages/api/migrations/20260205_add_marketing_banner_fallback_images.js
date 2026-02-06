const { Migration } = require("@mikro-orm/migrations")

class Migration20260205 extends Migration {
  async up() {
    this.addSql(`
      ALTER TABLE "marketing_banners"
        ADD COLUMN IF NOT EXISTS "fallback_image_url" TEXT,
        ADD COLUMN IF NOT EXISTS "fallback_image_mobile_url" TEXT;
    `)
  }

  async down() {
    this.addSql(`
      ALTER TABLE "marketing_banners"
        DROP COLUMN IF EXISTS "fallback_image_url",
        DROP COLUMN IF EXISTS "fallback_image_mobile_url";
    `)
  }
}

module.exports = { default: Migration20260205 }
