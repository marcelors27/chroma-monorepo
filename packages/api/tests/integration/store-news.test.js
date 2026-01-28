const { describe, it, expect } = require("vitest");
const { ContainerRegistrationKeys } = require("@medusajs/framework/utils");
const { createDbMock } = require("../helpers/db");
const { createRes } = require("../helpers/http");
const { GET } = require("../../src/api/store/news/route");

describe("store/news GET", () => {
  it("retorna noticias publicadas com paginacao", async () => {
    const rows = [{ id: "news_1", title: "A", is_published: true }];
    const { db, calls } = createDbMock(rows);
    const req = {
      query: { limit: "10", offset: "5" },
      scope: { resolve: (key) => (key === ContainerRegistrationKeys.PG_CONNECTION ? db : null) }
    };
    const res = createRes();

    await GET(req, res);

    expect(calls.table).toBe("news");
    expect(calls.limit).toBe(10);
    expect(calls.offset).toBe(5);
    expect(res.body.news).toHaveLength(1);
    expect(res.body.news[0].id).toBe("news_1");
  });
});
