import { GooseworksClient } from "@/lib/gooseworks/client";
import OpenAI from "openai";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

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
  source: "gooseworks" | "fallback";
  format: "image" | "video";
  brandKitId: string;
};

export async function runCreativeStudio(input: {
  product: string;
  description: string;
  audience: string;
  differentiator: string;
  angleHeadline: string;
  platform: "instagram" | "linkedin" | "both";
  priceTier: string;
  brandKit?: Awaited<ReturnType<GooseworksClient["buildBrandKit"]>>;
}): Promise<CreativeStudioResult> {
  const targetPlatform = input.platform === "both" ? "instagram" : input.platform;
  const goose = new GooseworksClient();

  const brandKit =
    input.brandKit ??
    (await goose.buildBrandKit({
      product: input.product,
      description: input.description,
      audience: input.audience,
      differentiator: input.differentiator,
      angleHeadline: input.angleHeadline,
      priceTier: input.priceTier,
    }));

  const openai = getOpenAI();
  let caption = `${input.angleHeadline} — built for ${input.audience}. ${input.description}`;
  let cta = "Learn more";
  let hashtags = ["#launch", "#startup", "#marketing"];
  let imagePrompt = `On-brand social ad for ${input.product}, angle '${input.angleHeadline}'. ${brandKit.voice}. Bold product hero, single CTA. No real logos or people.`;

  if (openai) {
    const captionResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Write a ${targetPlatform} caption using brand kit context. Return JSON: { image_prompt, caption, cta, hashtags[], post_time, platform }`,
        },
        {
          role: "user",
          content: JSON.stringify({ ...input, brandKit, platform: targetPlatform }),
        },
      ],
    });
    const parsed = JSON.parse(captionResponse.choices[0]?.message?.content ?? "{}") as {
      image_prompt?: string;
      caption?: string;
      cta?: string;
      hashtags?: string[];
      post_time?: string;
      platform?: "instagram" | "linkedin";
    };
    caption = parsed.caption ?? caption;
    cta = parsed.cta ?? cta;
    hashtags = parsed.hashtags ?? hashtags;
    imagePrompt = parsed.image_prompt ?? imagePrompt;
  }


  const ad = await goose.generateAd({
    brandKit,
    angleHeadline: input.angleHeadline,
    platform: targetPlatform,
    imagePrompt,
  });

  const qc = await goose.verifyAd({
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
