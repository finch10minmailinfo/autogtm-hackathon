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
  product: "",
  description: "",
  audience: "",
  differentiator: "",
  platform: "linkedin",
  priceTier: "mid",
  mode: "b2b",
};

export const CRUITICAL_DEMO: IntakeData = {
  product: "Cruitical",
  description: "Automated virtual work trials for screening software engineers",
  audience: "VP Engineering and talent leaders at Series A-B SaaS companies",
  differentiator: "Replaces resume screens and LeetCode proxies with realistic async work trials",
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
