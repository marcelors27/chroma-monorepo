import { describe, it, expect, vi } from "vitest";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import * as dbHelpers from "../helpers/db";
import * as httpHelpers from "../helpers/http";
import * as marketingRoute from "../../src/api/store/marketing-banners/route";
const { createDbMock } = dbHelpers;
const { createRes } = httpHelpers;
const { GET } = marketingRoute;

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

    try {
      await GET(req, res);

      expect(res.statusCode).toBe(200);
      expect(calls.table).toBe("marketing_banners");
      expect(calls.limit).toBe(5);
      expect(calls.offset).toBe(2);
      expect(res.body.banners).toHaveLength(1);
      expect(res.body.banners[0].id).toBe("ban_1");
    } finally {
      vi.useRealTimers();
    }
  });

  it("aplica filtro de banners ativos no banco", async () => {
    const { db, calls } = createDbMock([{ id: "ban_inactive", is_active: false }]);
    const req = {
      query: {},
      scope: { resolve: (key) => (key === ContainerRegistrationKeys.PG_CONNECTION ? db : null) }
    };
    const res = createRes();

    await GET(req, res);

    expect(res.statusCode).toBe(200);
    expect(calls.where).toContainEqual({ is_active: true });
    expect(calls.andWhere.length).toBe(2);
  });
});
