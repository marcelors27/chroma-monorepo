const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Vinculo de Empresas", () => {
  itIf("valida campos obrigatorios", () => {
    cy.visit("/company-link");
    cy.contains("button", "Continuar").click();
    cy.contains("Erro");
  });

  itIf("adiciona e remove empresas", () => {
    cy.visit("/company-link");
    cy.contains("button", "Adicionar outra empresa").click();
    cy.contains("Empresa 2");
    cy.contains("button", "Remover").first().click();
  });
});
