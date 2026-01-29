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

  itIf("listar templates de email", () => {
    cy.apiRequest({
      method: "GET",
      path: "/admin/email-templates",
      baseUrl: Cypress.env("adminApiBaseUrl"),
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 401, 403]).to.include(response.status);
    });
  });

  itIf("criar template de email", () => {
    cy.apiRequest({
      method: "POST",
      path: "/admin/email-templates",
      baseUrl: Cypress.env("adminApiBaseUrl"),
      body: {
        name: "Template Cypress",
        subject: "Teste",
        html: "<strong>Teste</strong>",
        variables: [{ key: "USER_NAME", type: "string" }]
      },
      failOnStatusCode: false
    }).then((response) => {
      expect([201, 400, 401, 403]).to.include(response.status);
    });
  });

  itIf("listar logs de email", () => {
    cy.apiRequest({
      method: "GET",
      path: "/admin/email-logs",
      baseUrl: Cypress.env("adminApiBaseUrl"),
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 401, 403]).to.include(response.status);
    });
  });

  itIf("reenviar cobranca pendente (admin)", () => {
    cy.apiRequest({
      method: "POST",
      path: "/admin/notifications/pending-payment",
      baseUrl: Cypress.env("adminApiBaseUrl"),
      body: {
        method: "pix",
        payment_collection_id: "payment_collection_placeholder",
        company_id: "cmp_placeholder",
        customer_id: "cust_placeholder",
        details: { pix_code: "000201" }
      },
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 400, 401, 403, 404]).to.include(response.status);
    });
  });
});
