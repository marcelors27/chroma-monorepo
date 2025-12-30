export type RootStackParamList = {
  Index: undefined;
  Auth: { mode?: "login" | "register" } | undefined;
  CompanyLink: undefined;
  AccessPending: undefined;
  Onboarding: undefined;
  Main: undefined;
  NewsDetails: { id: string };
  ProductDetails: { id: string };
  Checkout: undefined;
  Condos: undefined;
  Recurrences: undefined;
};

export type TabParamList = {
  Home: undefined;
  Dashboard: undefined;
  Cart: undefined;
  Orders: undefined;
  Settings: undefined;
};
