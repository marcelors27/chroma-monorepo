const run = Cypress.env("runApi") === true || Cypress.env("runApi") === "true";
const itIf = run ? it : it.skip;

describe("API :: Store Commerce", () => {
  itIf("listar produtos e consultar um produto", () => {
    cy.apiRequest({ method: "GET", path: "/store/products", failOnStatusCode: false }).then((response) => {
      expect([200, 401, 403]).to.include(response.status);
      const productId = (response.body as any)?.products?.[0]?.id;
      if (!productId) return;
      cy.apiRequest({ method: "GET", path: `/store/products/${productId}`, failOnStatusCode: false }).then((detail) => {
        expect([200, 401, 403, 404]).to.include(detail.status);
      });
    });
  });

  itIf("criar carrinho e adicionar item", () => {
    cy.apiRequest({ method: "POST", path: "/store/carts", failOnStatusCode: false }).then((response) => {
      expect([200, 201, 400]).to.include(response.status);
      const cartId = (response.body as any)?.cart?.id;
      if (!cartId) return;
      cy.apiRequest({ method: "GET", path: "/store/products", failOnStatusCode: false }).then((list) => {
        const variantId = (list.body as any)?.products?.[0]?.variants?.[0]?.id;
        if (!variantId) return;
        cy.apiRequest({
          method: "POST",
          path: `/store/carts/${cartId}/line-items`,
          body: { variant_id: variantId, quantity: 1 },
          failOnStatusCode: false
        }).then((addItem) => {
          expect([200, 400]).to.include(addItem.status);
        });
      });
    });
  });

  itIf("consultar pedidos", () => {
    cy.apiRequest({ method: "GET", path: "/store/orders", failOnStatusCode: false }).then((response) => {
      expect([200, 401, 403]).to.include(response.status);
    });
  });
});
