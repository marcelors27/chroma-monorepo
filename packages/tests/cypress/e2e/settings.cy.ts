const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Configuracoes", () => {
  itIf("atualiza perfil", () => {
    cy.loginAndVisit("/settings");
    cy.get("[data-testid='settings-profile-first-name']").clear().type("QA");
    cy.get("[data-testid='settings-profile-save']").click({ force: true });
  });

  itIf("altera senha", () => {
    cy.loginAndVisit("/settings");
    cy.get("[data-testid='settings-tab-security']").click({ force: true });
    cy.get("[data-testid='settings-password-current']").type("senha-atual");
    cy.get("[data-testid='settings-password-new']").type("senha-nova");
    cy.get("[data-testid='settings-password-confirm']").type("senha-nova");
    cy.get("[data-testid='settings-password-save']").click({ force: true });
  });
});
