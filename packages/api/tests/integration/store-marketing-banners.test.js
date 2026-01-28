const { describe, it, expect, vi } = require("vitest");
const { ContainerRegistrationKeys } = require("@medusajs/framework/utils");
const { createDbMock } = require("../helpers/db");
const { createRes } = require("../helpers/http");
const { GET } = require("../../src/api/store/marketing-banners/route");

describe("store/marketing-banners GET", () => {
  it("retorna banners ativos com paginacao", async () => {
    const rows = [{ id: "ban_1", title: "Promo" }];
    const { db, calls } = createDbMock(rows);
    const req = {
      query: { limit: "5", offset: "2" },
      scope: { resolve: (key) => (key === ContainerRegistrationKeys.PG_CONNECTION ? db : null) }
    };
    const res = createRes();

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    await GET(req, res);

    expect(calls.table).toBe("marketing_banners");
    expect(calls.limit).toBe(5);
    expect(calls.offset).toBe(2);
    expect(res.body.banners).toHaveLength(1);
    expect(res.body.banners[0].id).toBe("ban_1");

    vi.useRealTimers();
  });
});
