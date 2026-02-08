export const isUnauthorizedError = (err: any) => {
  const message = err?.message || "";
  const status = err?.status || err?.response?.status;
  return status === 401 || message.includes("401") || /unauthorized/i.test(message);
};
