const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Compra Tablet", () => {
  itIf("fluxo home -> produto -> checkout", () => {
    cy.viewport("ipad-2");

    cy.loginAndVisit("/dashboard");
    cy.get("[data-testid='catalog-product-link']").first().click({ force: true });
    cy.location("pathname", { timeout: 10000 }).should("match", /product/);

    cy.get("[data-testid='product-add-to-cart']").click({ force: true });
    cy.get("[data-testid='product-checkout']").click({ force: true });

    cy.location("pathname", { timeout: 10000 }).should("eq", "/checkout");
    cy.get("[data-testid='checkout-submit']");
  });
});
