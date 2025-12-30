const { Migration } = require("@mikro-orm/migrations")

class Migration20250106 extends Migration {
  async up() {
    this.addSql(
      'ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "approved" BOOLEAN NOT NULL DEFAULT FALSE;'
    )
  }

  async down() {
    this.addSql('ALTER TABLE "customer" DROP COLUMN IF EXISTS "approved";')
  }
}

module.exports = { default: Migration20250106 }
