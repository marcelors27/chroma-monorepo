const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Checkout", () => {
  itIf("exige itens no carrinho", () => {
    cy.loginAndVisit("/checkout");
    cy.get("[data-testid='checkout-empty']").should("exist");
  });

  itIf("seleciona metodo de pagamento e finaliza", () => {
    cy.loginAndVisit("/checkout");
    cy.get("[data-testid='checkout-payment-pix']").click({ force: true });
    cy.get("[data-testid='checkout-submit']").click({ force: true });
  });
});
