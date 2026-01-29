import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "node:module";
import * as httpHelpers from "../helpers/http";

const require = createRequire(import.meta.url);
const resendPath = require.resolve("../../src/services/resend-templates");
const routePath = require.resolve("../../src/api/admin/email-templates/route");

const createMocks = () => ({
  listTemplates: vi.fn(),
  createTemplate: vi.fn()
});

const { createRes } = httpHelpers;

const loadRoute = (mocks) => {
  delete require.cache[resendPath];
  delete require.cache[routePath];
  require.cache[resendPath] = {
    id: resendPath,
    filename: resendPath,
    loaded: true,
    exports: mocks
  };
  return require(routePath);
};

describe("admin/email-templates", () => {
  beforeEach(() => {
    delete require.cache[resendPath];
    delete require.cache[routePath];
  });

  it("lista templates", async () => {
    const mocks = createMocks();
    mocks.listTemplates.mockResolvedValue({ data: [{ id: "tpl_1", name: "Template 1" }] });
    const req = { query: {}, scope: {} };
    const res = createRes();

    const { GET } = loadRoute(mocks);
    await GET(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.templates).toHaveLength(1);
    expect(res.body.templates[0].id).toBe("tpl_1");
  });

  it("cria template com variaveis normalizadas", async () => {
    const mocks = createMocks();
    mocks.createTemplate.mockResolvedValue({ id: "tpl_new" });
    const req = {
      body: {
        name: "Novo",
        subject: "Assunto",
        html: "<strong>Oi</strong>",
        variables: [{ name: "USER_NAME", type: "string" }]
      }
    };
    const res = createRes();

    const { POST } = loadRoute(mocks);
    await POST(req, res);

    expect(res.statusCode).toBe(201);
    expect(mocks.createTemplate).toHaveBeenCalledWith({
      name: "Novo",
      subject: "Assunto",
      html: "<strong>Oi</strong>",
      variables: [{ key: "USER_NAME", type: "string", fallback: undefined }]
    });
  });
});
