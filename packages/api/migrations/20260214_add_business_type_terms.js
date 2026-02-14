const { Migration } = require("@mikro-orm/migrations")

class Migration20260214 extends Migration {
  async up() {
    this.addSql(`
      ALTER TABLE "business_types"
      ADD COLUMN IF NOT EXISTS "terms" JSONB NOT NULL DEFAULT '{}'::jsonb;
    `)

    this.addSql(`
      UPDATE "business_types"
      SET "terms" = CASE
        WHEN "key" = 'condominio' THEN jsonb_build_object(
          'responsible_label', 'Síndico',
          'responsible_label_plural', 'Síndicos',
          'unit_label', 'Unidade',
          'unit_label_plural', 'Unidades',
          'block_label', 'Bloco',
          'block_label_plural', 'Blocos',
          'floor_label', 'Andar',
          'floor_label_plural', 'Andares',
          'parking_label', 'Vaga',
          'parking_label_plural', 'Vagas',
          'points_label', 'Pontos'
        )
        WHEN "key" = 'loja' THEN jsonb_build_object(
          'responsible_label', 'Gerente',
          'responsible_label_plural', 'Gerentes',
          'unit_label', 'Seção',
          'unit_label_plural', 'Seções',
          'block_label', 'Setor',
          'block_label_plural', 'Setores',
          'floor_label', 'Andar',
          'floor_label_plural', 'Andares',
          'parking_label', 'Vaga',
          'parking_label_plural', 'Vagas',
          'points_label', 'Pontos'
        )
        ELSE "terms"
      END
      WHERE "key" IN ('condominio', 'loja');
    `)
  }

  async down() {
    this.addSql(`
      ALTER TABLE "business_types"
      DROP COLUMN IF EXISTS "terms";
    `)
  }
}

module.exports = { default: Migration20260214 }
