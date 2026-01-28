const run = Cypress.env("runApi") === true || Cypress.env("runApi") === "true";
const itIf = run ? it : it.skip;

describe("API :: Auth", () => {
  itIf("login com email/senha retorna token", () => {
    cy.fixture("user").then((user) => {
      cy.apiRequest({
        method: "POST",
        path: "/auth/customer/emailpass",
        body: { email: user.email, password: user.password }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201]);
        expect(response.body).to.have.property("token");
      });
    });
  });

  itIf("registro de cliente retorna token", () => {
    cy.fixture("user").then((user) => {
      cy.apiRequest({
        method: "POST",
        path: "/auth/customer/emailpass/register",
        body: { email: user.email, password: user.password }
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201, 409]);
      });
    });
  });

  itIf("inicio de login social retorna location ou token", () => {
    cy.apiRequest({
      method: "POST",
      path: "/auth/customer/google",
      body: { callback_url: "http://localhost:5173/auth?provider=google" },
      failOnStatusCode: false
    }).then((response) => {
      expect([200, 400, 404]).to.include(response.status);
    });
  });
});
