const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Auth", () => {
  itIf("login com credenciais validas", () => {
    cy.fixture("user").then((user) => {
      cy.visit("/auth");
      cy.get("input#email").type(user.email);
      cy.get("input#password").type(user.password);
      cy.contains("button", "Entrar").click();
      cy.location("pathname", { timeout: 10000 }).should("match", /dashboard|company-link|access-pending/);
    });
  });

  itIf("validacoes de cadastro", () => {
    cy.visit("/auth?mode=register");
    cy.contains("button", "Criar conta").click();
    cy.contains("Erro");
  });

  itIf("registro de usuario direciona para vinculo de empresa", () => {
    cy.fixture("user").then((user) => {
      cy.visit("/auth?mode=register");
      cy.get("input#name").type(user.name);
      cy.get("input#email").type(user.email);
      cy.get("input#password").type(user.password);
      cy.get("input#confirmPassword").type(user.password);
      cy.contains("button", "Criar conta").click();
      cy.location("pathname", { timeout: 10000 }).should("eq", "/company-link");
    });
  });
});
