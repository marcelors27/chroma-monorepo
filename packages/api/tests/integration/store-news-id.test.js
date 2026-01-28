const { describe, it, expect } = require("vitest");
const { ContainerRegistrationKeys } = require("@medusajs/framework/utils");
const { createDbMock } = require("../helpers/db");
const { createRes } = require("../helpers/http");
const { GET } = require("../../src/api/store/news/[id]/route");

describe("store/news/:id GET", () => {
  it("retorna 400 quando id ausente", async () => {
    const { db } = createDbMock([]);
    const req = {
      params: {},
      scope: { resolve: (key) => (key === ContainerRegistrationKeys.PG_CONNECTION ? db : null) }
    };
    const res = createRes();

    await GET(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Missing news id");
  });

  it("retorna 404 quando noticia nao existe", async () => {
    const { db } = createDbMock([]);
    const req = {
      params: { id: "news_1" },
      scope: { resolve: (key) => (key === ContainerRegistrationKeys.PG_CONNECTION ? db : null) }
    };
    const res = createRes();

    await GET(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Noticia nao encontrada");
  });

  it("retorna noticia quando encontrada", async () => {
    const { db } = createDbMock([{ id: "news_2", title: "B" }]);
    const req = {
      params: { id: "news_2" },
      scope: { resolve: (key) => (key === ContainerRegistrationKeys.PG_CONNECTION ? db : null) }
    };
    const res = createRes();

    await GET(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.news.id).toBe("news_2");
  });
});
