const run = Cypress.env("runE2e") === true || Cypress.env("runE2e") === "true";
const itIf = run ? it : it.skip;

describe("E2E :: Catalogo", () => {
  itIf("filtra e ordena produtos", () => {
    cy.visit("/dashboard");
    cy.get("input[placeholder='Buscar por nome...']").type("cimento");
    cy.contains("button", "Filtros").click({ force: true });
    cy.contains("Limpar filtros").click({ force: true });
  });

  itIf("adiciona item do catalogo ao carrinho", () => {
    cy.visit("/dashboard");
    cy.contains("button", "Adicionar ao carrinho").first().click({ force: true });
  });
});
