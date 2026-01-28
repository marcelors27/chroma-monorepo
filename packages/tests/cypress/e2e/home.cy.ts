const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Home", () => {
  itIf("carrega banners e noticias", () => {
    cy.visit("/home");
    cy.contains("Promoções");
    cy.contains("Notícias");
  });

  itIf("adiciona promocao ao carrinho", () => {
    cy.visit("/home");
    cy.contains("button", "Adicionar ao carrinho").first().click({ force: true });
    cy.get("button").contains("Carrinho").click({ force: true });
  });
});
