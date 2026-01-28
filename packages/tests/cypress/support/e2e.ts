import "./commands";

Cypress.on("uncaught:exception", () => {
  // Avoid failing tests due to unexpected frontend exceptions.
  return false;
});
