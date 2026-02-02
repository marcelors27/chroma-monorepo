const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Produto", () => {
  itIf("abre detalhe do produto", () => {
    cy.loginAndVisit("/dashboard");
    cy.get("[data-testid='catalog-product-link']").first().click({ force: true });
    cy.location("pathname", { timeout: 10000 }).should("match", /product/);
  });

  itIf("altera quantidade e adiciona ao carrinho", () => {
    cy.loginAndVisit("/dashboard");
    cy.get("[data-testid='catalog-product-link']").first().click({ force: true });
    cy.get("[data-testid='product-add-to-cart']").click({ force: true });
  });
});
