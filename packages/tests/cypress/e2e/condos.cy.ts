const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Condominios", () => {
  itIf("lista condominios", () => {
    cy.visit("/condos");
    cy.contains("Condomínios");
  });

  itIf("abre modal de novo condominio", () => {
    cy.visit("/condos");
    cy.contains("button", "Novo Condomínio").click({ force: true });
  });
});
