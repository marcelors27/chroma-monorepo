type ApiRequestOptions = {
  method?: string;
  path: string;
  body?: any;
  qs?: Record<string, any>;
  token?: string;
  baseUrl?: string;
  failOnStatusCode?: boolean;
  headers?: Record<string, string>;
};

const buildUrl = (baseUrl: string, path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!baseUrl) return path;
  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
};

Cypress.Commands.add("apiRequest", (options: ApiRequestOptions) => {
  const baseUrl = options.baseUrl || Cypress.env("apiBaseUrl") || "";
  const url = buildUrl(baseUrl, options.path);
  const headers = { ...(options.headers || {}) } as Record<string, string>;
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  return cy.request({
    method: options.method || "GET",
    url,
    body: options.body,
    qs: options.qs,
    headers,
    failOnStatusCode: options.failOnStatusCode ?? false
  });
});

Cypress.Commands.add("loginCustomer", (email: string, password: string) => {
  return cy
    .apiRequest({
      method: "POST",
      path: "/auth/customer/emailpass",
      body: { email, password },
      failOnStatusCode: false
    })
    .then((response) => {
      const token = (response.body as any)?.token as string | undefined;
      if (token) {
        Cypress.env("authToken", token);
      }
      return token || null;
    });
});

Cypress.Commands.add("withAuthToken", (token: string) => {
  Cypress.env("authToken", token);
});

Cypress.Commands.add("loginAndVisit", (path: string) => {
  cy.fixture("user").then((user) => {
    cy.apiRequest({
      method: "POST",
      path: "/auth/customer/emailpass",
      body: { email: user.email, password: user.password },
      failOnStatusCode: false
    }).then((response) => {
      const token = (response.body as any)?.token;
      if (!token) {
        throw new Error("Auth token não encontrado para o teste");
      }
      cy.visit(path, {
        onBeforeLoad(win) {
          win.localStorage.setItem("chroma_front_store_token", token);
        }
      });
    });
  });
});
