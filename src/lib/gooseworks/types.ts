export type BrandKitInput = {
  product: string;
  description: string;
  audience: string;
  differentiator: string;
  angleHeadline: string;
  priceTier: string;
  voice?: string;
};

export type BrandKitResult = {
  brandKitId: string;
  positioning: string;
  audience: string;
  voice: string;
  valueProps: string[];
  colors: { primary: string; accent?: string };
  productPhotos: string[];
  source: "gooseworks" | "local";
};

export type AdGenerationInput = {
  brandKit: BrandKitResult;
  angleHeadline: string;
  platform: "instagram" | "linkedin";
  imagePrompt: string;
};

export type AdGenerationResult = {
  imageBase64: string | null;
  imageUrl?: string;
  imagePrompt: string;
  format: "image" | "video";
  source: "gooseworks" | "fallback";
  skillUsed: string;
};

export type QcInput = {
  imageBase64?: string | null;
  platform: "instagram" | "linkedin";
  product: string;
  expectedFormat: "image" | "video";
};

export type QcResult = {
  qcStatus: "pass" | "fail" | "needs_human";
  qcReportUrl: string;
  notes: string[];
};

export type CompetitorCreativeInput = {
  product: string;
  competitors: string[];
  angleHeadline?: string;
};

export type CompetitorCreativeGap = {
  text: string;
  source_url: string;
  competitor: string;
};

export type CompetitorCreativeResult = {
  gaps: CompetitorCreativeGap[];
  isSample: boolean;
  skillUsed: string;
};

/** Verified slugs from github.com/gooseworks-ai/goose-skills */
export const GOOSEWORKS_SKILLS = {
  brandKit: "update-brand-kit",
  adGeneration: "create-image-gpt-image-fal",
  adQc: "verify-product-image",
  competitorWatch: "competitor-ad-intelligence",
} as const;
