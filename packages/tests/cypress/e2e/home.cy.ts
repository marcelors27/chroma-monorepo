const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Home", () => {
  itIf("carrega banners e noticias", () => {
    cy.loginAndVisit("/home");
    cy.get("[data-testid='home-promotions-title']");
    cy.get("[data-testid='home-news-title']");
  });

  itIf("adiciona promocao ao carrinho", () => {
    cy.loginAndVisit("/home");
    cy.get("[data-testid='home-promo-add']").first().click({ force: true });
    cy.get("[data-testid='cart-trigger']").click({ force: true });
  });
});
