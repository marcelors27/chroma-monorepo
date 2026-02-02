const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Catalogo", () => {
  itIf("filtra e ordena produtos", () => {
    cy.loginAndVisit("/dashboard");
    cy.get("[data-testid='catalog-search']").type("cimento");
    cy.get("[data-testid='catalog-filters-toggle']").click({ force: true });
    cy.get("[data-testid='catalog-filters-clear']").click({ force: true });
  });

  itIf("adiciona item do catalogo ao carrinho", () => {
    cy.loginAndVisit("/dashboard");
    cy.get("[data-testid='catalog-add-to-cart']").first().click({ force: true });
  });
});
