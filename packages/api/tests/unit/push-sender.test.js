const { describe, it, expect, vi, beforeEach, afterEach } = require("vitest");
const { sendExpo, sendWebPush, sendFcm, sendApns } = require("../../src/utils/push-sender");

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...originalEnv };
});

describe("utils/push-sender", () => {
  it("sendExpo retorna vazio quando nao ha tokens", async () => {
    const result = await sendExpo([], { title: "t", message: "m" });
    expect(result).toEqual({ sent: 0, failed: 0, invalidTokens: [], errors: [] });
  });

  it("sendExpo contabiliza falha em erro de rede", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network"))));
    const result = await sendExpo(["expo1"], { title: "t", message: "m" });
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain("expo:request_failed");
  });

  it("sendExpo contabiliza tickets", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: true,
      json: async () => ({ data: [{ status: "ok" }, { status: "error", message: "bad", details: { error: "DeviceNotRegistered" } }] })
    })));

    const result = await sendExpo(["expo1", "expo2"], { title: "t", message: "m" });
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.invalidTokens).toEqual(["expo2"]);
  });

  it("sendWebPush exige VAPID quando ha subscriptions", async () => {
    await expect(sendWebPush([{ endpoint: "https://example.test" }], { title: "t", message: "m" }))
      .rejects
      .toThrow("VAPID não configurado");
  });

  it("sendWebPush retorna vazio quando nao ha subscriptions", async () => {
    const result = await sendWebPush([], { title: "t", message: "m" });
    expect(result).toEqual({ sent: 0, failed: 0, invalidTokens: [] });
  });

  it("sendFcm retorna vazio quando nao ha tokens", async () => {
    const result = await sendFcm([], { title: "t", message: "m" });
    expect(result).toEqual({ sent: 0, failed: 0, invalidTokens: [] });
  });

  it("sendApns retorna vazio quando nao ha tokens", async () => {
    const result = await sendApns([], { title: "t", message: "m" });
    expect(result).toEqual({ sent: 0, failed: 0, invalidTokens: [] });
  });
});
