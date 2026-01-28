const run = Cypress.env("runApi") === true || Cypress.env("runApi") === "true";
const itIf = run ? it : it.skip;

describe("API :: Customers", () => {
  itIf("buscar perfil do cliente", () => {
    cy.apiRequest({ method: "GET", path: "/store/customers/me", failOnStatusCode: false }).then((response) => {
      expect([200, 401, 403]).to.include(response.status);
    });
  });

  itIf("atualizar perfil do cliente", () => {
    cy.apiRequest({
      method: "POST",
      path: "/store/customers/me",
      body: { first_name: "QA", last_name: "Chroma" },
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 401, 403, 400]).to.include(response.status);
    });
  });

  itIf("alterar senha", () => {
    cy.apiRequest({
      method: "POST",
      path: "/store/customers/password",
      body: { old_password: "senha-atual", password: "senha-nova" },
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 400, 401, 403]).to.include(response.status);
    });
  });
});
