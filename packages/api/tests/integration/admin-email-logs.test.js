import { describe, it, expect, vi } from "vitest";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import * as httpHelpers from "../helpers/http";
import * as emailLogsRoute from "../../src/api/admin/email-logs/route";
const { createRes } = httpHelpers;
const { GET } = emailLogsRoute;

describe("admin/email-logs GET", () => {
  it("filtra, ordena e pagina logs", async () => {
    const customers = [
      {
        id: "cust_1",
        email: "ana@test.com",
        first_name: "Ana",
        last_name: "Silva",
        metadata: {
          email_logs: [
            {
              type: "pix_admin",
              company_id: "cmp_1",
              status: "sent",
              sent_at: "2024-01-10T10:00:00.000Z"
            },
            {
              type: "boleto_admin",
              company_id: "cmp_2",
              status: "failed",
              sent_at: "2024-01-08T10:00:00.000Z"
            }
          ]
        }
      },
      {
        id: "cust_2",
        email: "leo@test.com",
        first_name: "Leo",
        last_name: "Costa",
        metadata: {
          email_logs: [
            {
              type: "pix_admin",
              company_id: "cmp_1",
              status: "sent",
              sent_at: "2024-01-11T10:00:00.000Z"
            }
          ]
        }
      }
    ];

    const remoteQuery = vi.fn(async () => customers);
    const req = {
      query: { type: "pix_admin", company_id: "cmp_1", limit: "1", offset: "0" },
      scope: {
        resolve: (key) => (key === ContainerRegistrationKeys.REMOTE_QUERY ? remoteQuery : null)
      }
    };
    const res = createRes();

    await GET(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].user_id).toBe("cust_2");
    expect(res.body.logs[0].company_id).toBe("cmp_1");
  });
});
