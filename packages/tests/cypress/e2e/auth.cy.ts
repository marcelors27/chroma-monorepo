const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Auth", () => {
  itIf("login com credenciais validas", () => {
    cy.fixture("user").then((user) => {
      cy.visit("/auth");
      cy.get("[data-testid='auth-email']").type(user.email);
      cy.get("[data-testid='auth-password']").type(user.password);
      cy.get("[data-testid='auth-submit']").click();
      cy.location("pathname", { timeout: 10000 }).should("match", /dashboard|company-link|access-pending/);
    });
  });

  itIf("validacoes de cadastro", () => {
    cy.visit("/auth?mode=register");
    cy.get("[data-testid='auth-submit']").click();
    cy.get("[data-testid='auth-form']").should("exist");
  });

  itIf("registro de usuario direciona para vinculo de empresa", () => {
    cy.fixture("user").then((user) => {
      cy.visit("/auth?mode=register");
      cy.get("[data-testid='auth-name']").type(user.name);
      cy.get("[data-testid='auth-email']").type(user.email);
      cy.get("[data-testid='auth-password']").type(user.password);
      cy.get("[data-testid='auth-confirm-password']").type(user.password);
      cy.get("[data-testid='auth-submit']").click();
      cy.location("pathname", { timeout: 10000 }).should("eq", "/company-link");
    });
  });
});
