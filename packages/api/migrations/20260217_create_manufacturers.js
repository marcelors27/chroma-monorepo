const { Migration } = require("@mikro-orm/migrations")

class Migration20260217 extends Migration {
  async up() {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "manufacturers" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL UNIQUE,
        "image_url" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)
  }

  async down() {
    this.addSql('DROP TABLE IF EXISTS "manufacturers";')
  }
}

module.exports = { default: Migration20260217 }
