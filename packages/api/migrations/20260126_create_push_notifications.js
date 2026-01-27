const { Migration } = require("@mikro-orm/migrations")

class Migration20260126 extends Migration {
  async up() {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "push_notifications" (
        "id" TEXT PRIMARY KEY,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "target_type" TEXT NOT NULL,
        "target_company_ids" JSONB,
        "target_user_ids" JSONB,
        "send_at" TIMESTAMPTZ,
        "status" TEXT NOT NULL DEFAULT 'scheduled',
        "sent_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "push_device_tokens" (
        "id" TEXT PRIMARY KEY,
        "customer_id" TEXT NOT NULL,
        "company_id" TEXT,
        "provider" TEXT NOT NULL,
        "platform" TEXT NOT NULL,
        "token" TEXT,
        "subscription" JSONB,
        "device_id" TEXT,
        "last_seen_at" TIMESTAMPTZ,
        "disabled_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)
  }

  async down() {
    this.addSql('DROP TABLE IF EXISTS "push_notifications";')
    this.addSql('DROP TABLE IF EXISTS "push_device_tokens";')
  }
}

module.exports = { default: Migration20260126 }
