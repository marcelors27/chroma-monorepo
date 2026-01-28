const { Migration } = require("@mikro-orm/migrations")

class Migration20260127 extends Migration {
  async up() {
    this.addSql(`
      ALTER TABLE "push_notifications"
      ADD COLUMN IF NOT EXISTS "last_error" TEXT;
    `)
  }

  async down() {
    this.addSql(`
      ALTER TABLE "push_notifications"
      DROP COLUMN IF EXISTS "last_error";
    `)
  }
}

module.exports = { default: Migration20260127 }
