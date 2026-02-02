const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const adminBaseUrl = Cypress.env("adminBaseUrl");
const adminEmail = Cypress.env("adminEmail");
const adminPassword = Cypress.env("adminPassword");

const itIf = run && adminBaseUrl ? it : it.skip;
const itIfAuth = run && adminBaseUrl && adminEmail && adminPassword ? it : it.skip;

const visitAdmin = (path = "/") => {
  const base = adminBaseUrl.endsWith("/") ? adminBaseUrl.slice(0, -1) : adminBaseUrl;
  const url = path === "/" ? base : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  cy.visit(url);
};

const loginAdmin = () => {
  visitAdmin("/");
  cy.get("[data-testid='admin-login']").should("exist");
  cy.get("[data-testid='admin-email']").clear().type(adminEmail);
  cy.get("[data-testid='admin-password']").clear().type(adminPassword, { log: false });
  cy.get("[data-testid='admin-submit']").click();
};

describe("E2E :: Admin e-mails", () => {
  itIf("renderiza a tela de login", () => {
    visitAdmin("/");
    cy.get("[data-testid='admin-login']").should("exist");
  });

  itIfAuth("navega para templates de email", () => {
    loginAdmin();
    cy.get("[data-testid='admin-nav-emails']").click();
    cy.get("[data-testid='admin-email-templates-title']").should("exist");
  });

  itIfAuth("navega para reenvio de cobrancas", () => {
    loginAdmin();
    cy.get("[data-testid='admin-nav-cobrancas']").click();
    cy.get("[data-testid='admin-billing-resend-title']").should("exist");
  });

  itIfAuth("navega para historico de emails", () => {
    loginAdmin();
    cy.get("[data-testid='admin-nav-email-logs']").click();
    cy.get("[data-testid='admin-email-logs-title']").should("exist");
  });
});
