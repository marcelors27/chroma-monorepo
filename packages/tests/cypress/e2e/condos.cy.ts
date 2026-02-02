const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Condominios", () => {
  itIf("lista condominios", () => {
    cy.loginAndVisit("/condos");
    cy.get("[data-testid='condos-title']").should("exist");
  });

  itIf("abre modal de novo condominio", () => {
    cy.loginAndVisit("/condos");
    cy.get("[data-testid='condos-new']").click({ force: true });
  });
});
