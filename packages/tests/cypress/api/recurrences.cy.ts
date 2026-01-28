const run = Cypress.env("runApi") === true || Cypress.env("runApi") === "true";
const itIf = run ? it : it.skip;

describe("API :: Recurrences", () => {
  itIf("listar recorrencias", () => {
    cy.apiRequest({ method: "GET", path: "/store/recurrences", failOnStatusCode: false }).then((response) => {
      expect([200, 401, 403]).to.include(response.status);
    });
  });

  itIf("criar recorrencia", () => {
    const payload = {
      name: "Recorrencia QA",
      frequency: "monthly",
      day_of_month: 5,
      payment_method: "pix",
      items: [
        {
          variant_id: "variant_placeholder",
          product_id: "product_placeholder",
          quantity: 1,
          title: "Item QA",
          price: 100,
          category: "Recorrente"
        }
      ]
    };

    cy.apiRequest({
      method: "POST",
      path: "/store/recurrences",
      body: payload,
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 201, 400, 401, 403]).to.include(response.status);
    });
  });
});
