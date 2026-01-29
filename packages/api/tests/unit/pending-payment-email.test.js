import { describe, it, expect } from "vitest";
import * as pendingPayment from "../../src/services/pending-payment-email";
const { buildPendingPaymentEmail } = pendingPayment;

describe("services/pending-payment-email", () => {
  it("gera conteudo para pix com QR e codigo", () => {
    const result = buildPendingPaymentEmail({
      method: "pix",
      companyName: "Condo A",
      details: { pix_code: "000201", pix_qr: "https://example.test/qr.png" },
      checkoutUrl: "https://store.test/checkout?pending=pc_1"
    });

    expect(result.html).toContain("PIX disponível");
    expect(result.html).toContain("000201");
    expect(result.html).toContain("qr.png");
    expect(result.html).toContain("Ver pagamento");
    expect(result.text).toContain("Codigo PIX: 000201");
    expect(result.text).toContain("Ver pagamento:");
  });

  it("gera conteudo para boleto com linha digitavel", () => {
    const result = buildPendingPaymentEmail({
      method: "boleto",
      companyName: "Condo B",
      details: { boleto_line: "23790.0000 00000.000000 00000.000000 0 000000000000", boleto_url: "https://example.test/boleto.pdf" },
      checkoutUrl: ""
    });

    expect(result.html).toContain("Boleto disponível");
    expect(result.html).toContain("Linha digitável");
    expect(result.html).toContain("boleto.pdf");
    expect(result.text).toContain("Linha digitável:");
    expect(result.text).toContain("Boleto:");
  });
});
