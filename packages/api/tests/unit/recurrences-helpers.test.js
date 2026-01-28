const { describe, it, expect, vi } = require("vitest");
const { _test } = require("../../src/api/store/recurrences/route");

describe("store/recurrences helpers", () => {
  it("normalizeRecurrences filtra itens invalidos", () => {
    const input = [{ id: "1", items: [] }, { id: "2", items: [{ id: "i" }] }, null];
    expect(_test.normalizeRecurrences(input)).toEqual([{ id: "2", items: [{ id: "i" }] }]);
  });

  it("clampDayOfMonth respeita limites do mes", () => {
    expect(_test.clampDayOfMonth(31, 2024, 1)).toBe(29); // Fevereiro 2024
    expect(_test.clampDayOfMonth(0, 2024, 5)).toBe(1);
  });

  it("computeNextRun para mensal retorna data futura", () => {
    const now = new Date("2024-01-10T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const next = _test.computeNextRun({ frequency: "monthly", dayOfMonth: 5 });
    expect(new Date(next).getTime()).toBeGreaterThan(now.getTime());
    vi.useRealTimers();
  });
});
