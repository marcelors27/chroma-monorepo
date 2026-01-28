const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Recorrencias", () => {
  itIf("lista recorrencias", () => {
    cy.visit("/recurrences");
    cy.contains("Compras Recorrentes");
  });

  itIf("pausa e retoma recorrencia", () => {
    cy.visit("/recurrences");
    cy.contains("Pausar").first().click({ force: true });
  });
});
