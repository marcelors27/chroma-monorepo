const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Vinculo de Empresas", () => {
  itIf("valida campos obrigatorios", () => {
    cy.visit("/company-link");
    cy.get("[data-testid='company-submit']").click();
    cy.get("[data-testid='company-submit']").should("exist");
  });

  itIf("adiciona e remove empresas", () => {
    cy.visit("/company-link");
    cy.get("[data-testid='company-add']").click();
    cy.get("[data-testid='company-card-2']").should("exist");
    cy.get("[data-testid='company-remove']").first().click();
  });
});
