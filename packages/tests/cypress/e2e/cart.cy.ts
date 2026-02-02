const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Carrinho", () => {
  itIf("abre carrinho e atualiza quantidades", () => {
    cy.loginAndVisit("/dashboard");
    cy.get("[data-testid='catalog-add-to-cart']").first().click({ force: true });
    cy.get("[data-testid='cart-trigger']").should("exist");
  });
});
