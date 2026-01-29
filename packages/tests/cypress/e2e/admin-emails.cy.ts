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
  cy.contains("Chroma Admin").should("exist");
  cy.get("input[type='email']").clear().type(adminEmail);
  cy.get("input[type='password']").clear().type(adminPassword, { log: false });
  cy.contains("button", "Acessar admin").click();
};

describe("E2E :: Admin e-mails", () => {
  itIf("renderiza a tela de login", () => {
    visitAdmin("/");
    cy.contains("Chroma Admin").should("exist");
    cy.contains("Entrar").should("exist");
  });

  itIfAuth("navega para templates de email", () => {
    loginAdmin();
    cy.contains("a", "E-mails").click();
    cy.contains("Templates de email").should("exist");
    cy.contains("Templates cadastrados").should("exist");
  });

  itIfAuth("navega para reenvio de cobrancas", () => {
    loginAdmin();
    cy.contains("a", "Reenvio cobranças").click();
    cy.contains("Reenvio de cobranças").should("exist");
  });

  itIfAuth("navega para historico de emails", () => {
    loginAdmin();
    cy.contains("a", "Histórico e-mails").click();
    cy.contains("Histórico geral de e-mails").should("exist");
  });
});
