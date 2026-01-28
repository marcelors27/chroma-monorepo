const { describe, it, expect } = require("vitest");
const { mapMarketingBannerRow } = require("../../src/utils/marketing-banners");

describe("utils/marketing-banners", () => {
  it("retorna null para row vazio", () => {
    expect(mapMarketingBannerRow(null)).toBeNull();
  });

  it("mapeia campos e normaliza datas", () => {
    const row = {
      id: "banner_1",
      title: "Titulo",
      subtitle: "Sub",
      image_url: "img",
      image_mobile_url: "img-m",
      animation_url: "anim",
      animation_mobile_url: "anim-m",
      link_type: "url",
      link_value: "https://example.com",
      sort_order: 3,
      active_from: "2024-01-01T00:00:00.000Z",
      active_until: new Date("2024-02-01T00:00:00.000Z"),
      is_active: true,
      created_at: 1700000000000,
      updated_at: "2024-03-01T00:00:00.000Z"
    };

    const mapped = mapMarketingBannerRow(row);
    expect(mapped).toMatchObject({
      id: "banner_1",
      title: "Titulo",
      subtitle: "Sub",
      link_type: "url",
      link_value: "https://example.com",
      sort_order: 3,
      is_active: true
    });
    expect(mapped.active_from).toBe("2024-01-01T00:00:00.000Z");
    expect(mapped.active_until).toBe("2024-02-01T00:00:00.000Z");
    expect(mapped.created_at).toContain("T");
  });
});
