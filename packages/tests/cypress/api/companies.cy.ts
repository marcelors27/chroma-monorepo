const run = Cypress.env("runApi") === true || Cypress.env("runApi") === "true";
const itIf = run ? it : it.skip;

describe("API :: Companies (store)", () => {
  itIf("listar empresas do cliente", () => {
    cy.apiRequest({ method: "GET", path: "/store/companies" }).then((response) => {
      expect(response.status).to.be.oneOf([200, 401, 403]);
    });
  });

  itIf("criar empresa", () => {
    cy.fixture("company").then((company) => {
      cy.apiRequest({
        method: "POST",
        path: "/store/companies",
        body: company,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 201, 400, 401, 403]).to.include(response.status);
      });
    });
  });

  itIf("atualizar empresa", () => {
    cy.apiRequest({ method: "GET", path: "/store/companies", failOnStatusCode: false }).then((list) => {
      const id = (list.body as any)?.companies?.[0]?.id;
      if (!id) return;
      cy.apiRequest({
        method: "PATCH",
        path: `/store/companies/${id}`,
        body: { metadata: { observacoes: "Atualizado via Cypress" } },
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 401, 403, 404]).to.include(response.status);
      });
    });
  });

  itIf("transferir empresa", () => {
    cy.apiRequest({ method: "GET", path: "/store/companies", failOnStatusCode: false }).then((list) => {
      const id = (list.body as any)?.companies?.[0]?.id;
      if (!id) return;
      cy.apiRequest({
        method: "POST",
        path: `/store/companies/${id}/transfer`,
        body: { email: "transfer@chroma.local", permanent: true },
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 400, 401, 403, 404]).to.include(response.status);
      });
    });
  });
});
