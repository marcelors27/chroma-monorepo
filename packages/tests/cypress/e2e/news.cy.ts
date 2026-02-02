const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Noticias", () => {
  itIf("abre noticia a partir do home", () => {
    cy.loginAndVisit("/home");
    cy.get("[data-testid='home-news-link']").first().click({ force: true });
    cy.location("pathname", { timeout: 10000 }).should("match", /news/);
  });
});
