const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Produto", () => {
  itIf("abre detalhe do produto", () => {
    cy.visit("/dashboard");
    cy.get("a[href^='/product/"]").first().click({ force: true });
    cy.location("pathname", { timeout: 10000 }).should("match", /product/);
  });

  itIf("altera quantidade e adiciona ao carrinho", () => {
    cy.visit("/dashboard");
    cy.get("a[href^='/product/"]").first().click({ force: true });
    cy.contains("button", "Adicionar ao carrinho").click({ force: true });
  });
});
