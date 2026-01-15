import { sql } from "drizzle-orm";
import { createFlow } from "../lib/flowWrapper.js";
import { FlowContext } from "../resources/context.js";

export const healthcheckFlow = (ctx: FlowContext) =>
  createFlow("api.v1.healthcheck", async (_input, trace, ok) => {
    trace.push("Checking database connection");
    await ctx.db.execute(sql`SELECT 1`);

    trace.push("Checking NATS connection");
    // If we got here via NATS request/reply, NATS is working
    const natsHealthy = !ctx.nats.isClosed();

    if (!natsHealthy) {
      trace.push("NATS not healthy");
    }

    return ok({ status: "ok", database: true, nats: natsHealthy });
  });
