const { describe, it, expect } = require("vitest");
const { mapPushNotificationRow } = require("../../src/utils/push-notifications");

describe("utils/push-notifications", () => {
  it("normaliza json arrays e datas", () => {
    const row = {
      id: "push_1",
      title: "Titulo",
      message: "Mensagem",
      target_type: "company",
      target_company_ids: "[\"cmp_1\", \"cmp_2\"]",
      target_user_ids: null,
      send_at: 1700000000000,
      status: "queued",
      last_error: "",
      sent_at: null,
      created_at: "2024-02-01T00:00:00.000Z",
      updated_at: new Date("2024-02-05T00:00:00.000Z")
    };

    const mapped = mapPushNotificationRow(row);
    expect(mapped.target_company_ids).toEqual(["cmp_1", "cmp_2"]);
    expect(mapped.target_user_ids).toEqual([]);
    expect(mapped.last_error).toBeNull();
    expect(mapped.send_at).toContain("T");
    expect(mapped.created_at).toBe("2024-02-01T00:00:00.000Z");
  });
});
