import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type ActivityAgent =
  | "system"
  | "market"
  | "demand"
  | "audience"
  | "creative"
  | "distribution";

export async function logActivity(
  ctx: MutationCtx,
  campaignId: Id<"campaigns">,
  agent: ActivityAgent,
  message: string,
  level: "info" | "success" | "warn" | "error" = "info"
) {
  await ctx.db.insert("activityLogs", { campaignId, agent, message, level });
}
