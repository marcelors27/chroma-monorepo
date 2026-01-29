import { describe, it, expect } from "vitest";
import * as emailTemplates from "../../src/services/email-templates";
const {
  buildWelcomeTemplate,
  buildCompanyAddedTemplate,
  buildBoletoAdminTemplate,
  buildPasswordResetTemplate,
  renderTemplateHtml
} = emailTemplates;

describe("services/email-templates", () => {
  it("substitui variaveis no HTML", () => {
    const template = buildWelcomeTemplate();
    const html = renderTemplateHtml(template, {
      USER_NAME: "Ana",
      CONDOS_LIST: "Condo 1",
      DASHBOARD_URL: "https://app.test"
    });

    expect(html).toContain("Ana");
    expect(html).toContain("Condo 1");
    expect(html).toContain("https://app.test");
  });

  it("retorna definicoes padrao com variaveis", () => {
    const defs = [
      buildCompanyAddedTemplate(),
      buildBoletoAdminTemplate(),
      buildPasswordResetTemplate()
    ];

    defs.forEach((def) => {
      expect(def.name).toBeTruthy();
      expect(def.subject).toBeTruthy();
      expect(def.html).toContain("{{{");
      expect(Array.isArray(def.variables)).toBe(true);
    });
  });
});
