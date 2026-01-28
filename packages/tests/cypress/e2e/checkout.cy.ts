const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Checkout", () => {
  itIf("exige itens no carrinho", () => {
    cy.visit("/checkout");
    cy.contains("Carrinho vazio");
  });

  itIf("seleciona metodo de pagamento e finaliza", () => {
    cy.visit("/checkout");
    cy.contains("PIX").click({ force: true });
    cy.contains("button", "Finalizar Pedido").click({ force: true });
  });
});
