const { describe, it, expect } = require("vitest");
const { mapNewsRow } = require("../../src/utils/news");

describe("utils/news", () => {
  it("retorna null para row vazio", () => {
    expect(mapNewsRow(undefined)).toBeNull();
  });

  it("mapeia noticia com datas normalizadas", () => {
    const row = {
      id: "news_1",
      title: "Titulo",
      summary: "Resumo",
      content: "Conteudo",
      category: "Categoria",
      image_url: "img",
      author: "Autor",
      source: "Fonte",
      read_time: 4,
      published_at: "2024-01-01T00:00:00.000Z",
      is_published: true,
      created_at: 1700000000000,
      updated_at: new Date("2024-01-10T00:00:00.000Z")
    };

    const mapped = mapNewsRow(row);
    expect(mapped).toMatchObject({
      id: "news_1",
      title: "Titulo",
      summary: "Resumo",
      category: "Categoria",
      is_published: true
    });
    expect(mapped.published_at).toBe("2024-01-01T00:00:00.000Z");
    expect(mapped.created_at).toContain("T");
    expect(mapped.updated_at).toBe("2024-01-10T00:00:00.000Z");
  });
});
