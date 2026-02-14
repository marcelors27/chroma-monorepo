const { Migration } = require("@mikro-orm/migrations")

class Migration20260213 extends Migration {
  async up() {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "business_types" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT NOT NULL UNIQUE,
        "label" TEXT NOT NULL,
        "label_plural" TEXT NOT NULL,
        "article_singular" TEXT,
        "article_plural" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)

    this.addSql(`
      INSERT INTO "business_types" (
        "id",
        "key",
        "label",
        "label_plural",
        "article_singular",
        "article_plural",
        "is_active",
        "created_at",
        "updated_at"
      )
      SELECT * FROM (VALUES
        (
          'bt_condominio',
          'condominio',
          'Condomínio',
          'Condomínios',
          'do',
          'dos',
          TRUE,
          now(),
          now()
        ),
        (
          'bt_loja',
          'loja',
          'Loja',
          'Lojas',
          'da',
          'das',
          TRUE,
          now(),
          now()
        ),
        (
          'bt_posto_gasolina',
          'posto_gasolina',
          'Posto de gasolina',
          'Postos de gasolina',
          'do',
          'dos',
          TRUE,
          now(),
          now()
        ),
        (
          'bt_conveniencia',
          'conveniencia',
          'Conveniência',
          'Conveniências',
          'da',
          'das',
          TRUE,
          now(),
          now()
        )
      ) AS seed (
        "id",
        "key",
        "label",
        "label_plural",
        "article_singular",
        "article_plural",
        "is_active",
        "created_at",
        "updated_at"
      )
      WHERE NOT EXISTS (SELECT 1 FROM "business_types");
    `)
  }

  async down() {
    this.addSql('DROP TABLE IF EXISTS "business_types";')
  }
}

module.exports = { default: Migration20260213 }
