import { buildBrandKit, generateAdImage, verifyAd, type BrandKitResult } from "@/lib/creative";
import { generateStructured, hasOrangeSliceKey } from "@/lib/orangeslice/client";

export type CreativeStudioResult = {
  creative: {
    image_prompt: string;
    caption: string;
    cta: string;
    hashtags: string[];
    post_time: string;
    platform: "instagram" | "linkedin";
  };
  imageBase64: string | null;
  qcStatus: "pass" | "fail" | "needs_human";
  qcReportUrl: string;
  source: "fallback";
  format: "image" | "video";
  brandKitId: string;
};

const CAPTION_SCHEMA = {
  type: "object",
  properties: {
    image_prompt: { type: "string" },
    caption: { type: "string" },
    cta: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    post_time: { type: "string" },
    platform: { type: "string", enum: ["instagram", "linkedin"] },
  },
  required: ["image_prompt", "caption", "cta", "hashtags"],
} as const;

export async function runCreativeStudio(input: {
  product: string;
  description: string;
  audience: string;
  differentiator: string;
  angleHeadline: string;
  platform: "instagram" | "linkedin" | "both";
  priceTier: string;
  brandKit?: BrandKitResult;
}): Promise<CreativeStudioResult> {
  const targetPlatform = input.platform === "both" ? "instagram" : input.platform;

  const brandKit =
    input.brandKit ??
    buildBrandKit({
      product: input.product,
      description: input.description,
      audience: input.audience,
      differentiator: input.differentiator,
      angleHeadline: input.angleHeadline,
      priceTier: input.priceTier,
    });

  let caption = `${input.angleHeadline} — built for ${input.audience}. ${input.description}`;
  let cta = "Learn more";
  let hashtags = ["#launch", "#startup", "#marketing"];
  let imagePrompt = `On-brand social ad for ${input.product}, angle '${input.angleHeadline}'. ${brandKit.voice}. Bold product hero, single CTA. No real logos or people.`;

  // Copy is written by Orange Slice AI; image is rendered by OpenAI gpt-image-1.
  if (hasOrangeSliceKey()) {
    const parsed = await generateStructured<{
      image_prompt?: string;
      caption?: string;
      cta?: string;
      hashtags?: string[];
      post_time?: string;
      platform?: "instagram" | "linkedin";
    }>({
      system: `Write a ${targetPlatform} caption using the brand kit context. Return image_prompt, caption, cta, hashtags[], post_time, platform.`,
      prompt: JSON.stringify({ ...input, brandKit, platform: targetPlatform }),
      schema: CAPTION_SCHEMA,
    });
    caption = parsed.caption ?? caption;
    cta = parsed.cta ?? cta;
    hashtags = parsed.hashtags ?? hashtags;
    imagePrompt = parsed.image_prompt ?? imagePrompt;
  }

  const ad = await generateAdImage({
    brandKit,
    angleHeadline: input.angleHeadline,
    platform: targetPlatform,
    imagePrompt,
  });

  const qc = verifyAd({
    imageBase64: ad.imageBase64,
    platform: targetPlatform,
    product: input.product,
    expectedFormat: ad.format,
  });

  return {
    creative: {
      image_prompt: ad.imagePrompt,
      caption,
      cta,
      hashtags,
      post_time: new Date(Date.now() + 3600000).toISOString(),
      platform: targetPlatform,
    },
    imageBase64: ad.imageBase64,
    qcStatus: qc.qcStatus,
    qcReportUrl: qc.qcReportUrl,
    source: ad.source,
    format: ad.format,
    brandKitId: brandKit.brandKitId,
  };
}
