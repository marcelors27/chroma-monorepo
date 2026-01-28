const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Pedidos", () => {
  itIf("lista pedidos e abre detalhes", () => {
    cy.visit("/orders");
    cy.contains("Meus Pedidos");
    cy.contains("Detalhes").first().click({ force: true });
  });

  itIf("cria recorrencia a partir de pedido", () => {
    cy.visit("/orders");
    cy.contains("Recorrência").first().click({ force: true });
  });
});
