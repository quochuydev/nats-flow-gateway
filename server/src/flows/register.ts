import { StringCodec } from "nats";
import { FlowContext } from "../resources/context";
import { healthcheckFlow } from "./healthcheck.flow";
import { authFlow } from "./auth.flow";
import { adminLoginFlow } from "./admin/login.flow";
import { createAdminFlow } from "./admin/createAdmin.flow";
import { getListFlow } from "./admin/getList.flow";
import { customerLoginFlow } from "./customer/login.flow";
import { customerRegisterFlow } from "./customer/register.flow";

const sc = StringCodec();

export const registerFlows = async (ctx: FlowContext) => {
  const nats = ctx.nats;

  const flows: Record<string, (input: any) => Promise<any>> = {
    "api.v1.healthcheck": healthcheckFlow(ctx),
    "api.v1.auth.validate": authFlow(ctx),
    "api.v1.admin.login": adminLoginFlow(ctx),
    "api.v1.admin.createAdmin": createAdminFlow(ctx),
    "api.v1.admin.getList": getListFlow(ctx),
    "api.v1.customer.login": customerLoginFlow(ctx),
    "api.v1.customer.register": customerRegisterFlow(ctx),
  };

  for (const [subject, flow] of Object.entries(flows)) {
    const sub = nats.subscribe(subject);
    (async () => {
      for await (const msg of sub) {
        try {
          const input = JSON.parse(sc.decode(msg.data));
          const result = await flow(input);
          msg.respond(sc.encode(JSON.stringify(result)));
        } catch (error) {
          const errorResult = {
            success: false,
            status: 500,
            errorCode: "INTERNAL_ERROR",
            message: "Flow execution failed",
            detailed: [],
            trace: [
              `ERROR: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            ],
          };
          msg.respond(sc.encode(JSON.stringify(errorResult)));
        }
      }
    })();
    console.log(`Registered flow: ${subject}`);
  }
};
