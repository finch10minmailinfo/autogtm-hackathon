export type CampaignMode = "b2c" | "b2b";
export type Platform = "instagram" | "linkedin" | "both";
export type PriceTier = "budget" | "mid" | "premium";

export type IntakeData = {
  product: string;
  description: string;
  audience: string;
  differentiator: string;
  platform: Platform;
  priceTier: PriceTier;
  mode: CampaignMode;
};

export type View = "intake" | "followup" | "live" | "result";

export const B2B_DEFAULT: IntakeData = {
  product: "AutoGTM",
  description: "AI agent pod that turns market signals into publishable GTM campaigns",
  audience: "VP Growth at Series A–B SaaS companies scaling outbound",
  differentiator: "Collapses research → angle → creative → post in under 2 minutes",
  platform: "linkedin",
  priceTier: "mid",
  mode: "b2b",
};

export const B2C_DEFAULT: IntakeData = {
  product: "",
  description: "",
  audience: "",
  differentiator: "",
  platform: "instagram",
  priceTier: "mid",
  mode: "b2c",
};
