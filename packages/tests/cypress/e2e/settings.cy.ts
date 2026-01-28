const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Configuracoes", () => {
  itIf("atualiza perfil", () => {
    cy.visit("/settings");
    cy.get("input#nome").clear().type("QA");
    cy.contains("button", "Salvar").click({ force: true });
  });

  itIf("altera senha", () => {
    cy.visit("/settings");
    cy.contains("Segurança").click({ force: true });
    cy.get("input#senhaAtual").type("senha-atual");
    cy.get("input#novaSenha").type("senha-nova");
    cy.get("input#confirmarSenha").type("senha-nova");
    cy.contains("button", "Alterar Senha").click({ force: true });
  });
});
