declare namespace Cypress {
  interface Chainable {
    apiRequest(options: {
      method?: string;
      path: string;
      body?: any;
      qs?: Record<string, any>;
      token?: string;
      baseUrl?: string;
      failOnStatusCode?: boolean;
      headers?: Record<string, string>;
    }): Chainable<Cypress.Response<any>>;
    loginCustomer(email: string, password: string): Chainable<string | null>;
    withAuthToken(token: string): Chainable<void>;
  }
}

export {};
