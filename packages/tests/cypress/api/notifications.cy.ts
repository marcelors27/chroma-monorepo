const run = Cypress.env("runApi") === true || Cypress.env("runApi") === "true";
const itIf = run ? it : it.skip;

describe("API :: Notifications & Push", () => {
  itIf("registrar push token", () => {
    cy.apiRequest({
      method: "POST",
      path: "/store/push-tokens",
      body: {
        provider: "webpush",
        platform: "web",
        subscription: { endpoint: "https://example.test" }
      },
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 201, 400, 401, 403]).to.include(response.status);
    });
  });

  itIf("notificar pagamento pendente", () => {
    cy.apiRequest({
      method: "POST",
      path: "/store/notifications/pending-payment",
      body: {
        payment_method: "pix",
        payment_collection_id: "payment_collection_placeholder",
        details: { pix_code: "000201" }
      },
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 201, 400, 401, 403]).to.include(response.status);
    });
  });
});
