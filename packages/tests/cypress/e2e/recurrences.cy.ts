const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Recorrencias", () => {
  itIf("lista recorrencias", () => {
    cy.loginAndVisit("/recurrences");
    cy.get("[data-testid='recurrences-title']").should("exist");
  });

  itIf("pausa e retoma recorrencia", () => {
    cy.loginAndVisit("/recurrences");
    cy.get("[data-testid='recurrence-toggle']").first().click({ force: true });
  });
});
