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

    this.addSql(`
      INSERT INTO "marketing_banners" (
        "id",
        "title",
        "subtitle",
        "image_url",
        "image_mobile_url",
        "animation_url",
        "animation_mobile_url",
        "link_type",
        "link_value",
        "sort_order",
        "active_from",
        "active_until",
        "is_active",
        "created_at",
        "updated_at"
      )
      SELECT * FROM (VALUES
        (
          'banner-001',
          $$Campanha de abertura$$,
          $$Descontos especiais para condominios cadastrados$$,
          'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1440&auto=format&fit=crop&q=70',
          'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=720&auto=format&fit=crop&q=70',
          NULL,
          NULL,
          'area',
          'catalog',
          10,
          now(),
          NULL,
          TRUE,
          now(),
          now()
        )
      ) AS seed (
        "id",
        "title",
        "subtitle",
        "image_url",
        "image_mobile_url",
        "animation_url",
        "animation_mobile_url",
        "link_type",
        "link_value",
        "sort_order",
        "active_from",
        "active_until",
        "is_active",
        "created_at",
        "updated_at"
      )
      WHERE NOT EXISTS (SELECT 1 FROM "marketing_banners");
    `)
  }

  async down() {
    this.addSql('DROP TABLE IF EXISTS "marketing_banners";')
  }
}

module.exports = { default: Migration20250215 }
