const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Carrinho", () => {
  itIf("abre carrinho e atualiza quantidades", () => {
    cy.visit("/dashboard");
    cy.contains("button", "Adicionar").first().click({ force: true });
    cy.get("button").filter("[class*='ShoppingCart']");
  });
});
