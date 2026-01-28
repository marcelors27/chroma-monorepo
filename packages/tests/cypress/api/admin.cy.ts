const run = Cypress.env("runApi") === true || Cypress.env("runApi") === "true";
const itIf = run ? it : it.skip;

describe("API :: Admin", () => {
  itIf("listar empresas pendentes", () => {
    cy.apiRequest({
      method: "GET",
      path: "/admin/companies/pending",
      baseUrl: Cypress.env("adminApiBaseUrl"),
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 401, 403]).to.include(response.status);
    });
  });

  itIf("listar banners e noticias", () => {
    cy.apiRequest({
      method: "GET",
      path: "/admin/marketing-banners",
      baseUrl: Cypress.env("adminApiBaseUrl"),
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 401, 403]).to.include(response.status);
    });

    cy.apiRequest({
      method: "GET",
      path: "/admin/news",
      baseUrl: Cypress.env("adminApiBaseUrl"),
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 401, 403]).to.include(response.status);
    });
  });

  itIf("listar notificacoes e processar fila", () => {
    cy.apiRequest({
      method: "GET",
      path: "/admin/push-notifications",
      baseUrl: Cypress.env("adminApiBaseUrl"),
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 401, 403]).to.include(response.status);
    });

    cy.apiRequest({
      method: "POST",
      path: "/admin/push-notifications/process",
      baseUrl: Cypress.env("adminApiBaseUrl"),
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 400, 401, 403]).to.include(response.status);
    });
  });
});
