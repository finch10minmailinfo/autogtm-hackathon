import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { runAudienceFinder } from "@/lib/agents/audienceFinder";
import { runCreativeStudio } from "@/lib/agents/creativeStudio";
import { runDemandGap, runMarketPulse, runPersonalizedOutreach } from "@/lib/agents";
import { GooseworksClient } from "@/lib/gooseworks/client";

function getConvex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}

async function saveCreativeResult(
  convex: ConvexHttpClient,
  campaignId: Id<"campaigns">,
  result: Awaited<ReturnType<typeof runCreativeStudio>>
) {
  let imageStorageId: Id<"_storage"> | undefined;
  if (result.imageBase64) {
    const uploadUrl = await convex.mutation(api.campaigns.generateUploadUrl, {});
    const bytes = Buffer.from(result.imageBase64, "base64");
    const upload = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: bytes,
    });
    const { storageId } = (await upload.json()) as { storageId: Id<"_storage"> };
    imageStorageId = storageId;
  }

  await convex.mutation(api.campaigns.saveCreative, {
    campaignId,
    imageStorageId,
    imagePrompt: result.creative.image_prompt,
    caption: result.creative.caption,
    cta: result.creative.cta,
    hashtags: result.creative.hashtags,
    postTime: result.creative.post_time,
    platform: result.creative.platform,
    qcStatus: result.qcStatus,
    qcReportUrl: result.qcReportUrl,
    source: result.source,
    format: result.format,
    brandKitId: result.brandKitId,
  });
}

export async function runPipeline(campaignId: Id<"campaigns">) {
  const convex = getConvex();
  const campaign = await convex.query(api.campaigns.get, { campaignId });
  if (!campaign) throw new Error("Campaign not found");

  const isB2B = (campaign.mode ?? "b2c") === "b2b";
  const goose = new GooseworksClient();

  try {
    await convex.mutation(api.campaigns.setStatus, { campaignId, status: "researching" });
    await convex.mutation(api.campaigns.appendLog, {
      campaignId,
      agent: "market",
      message: isB2B
        ? "Market Pulse — Firecrawl + Orange Slice intent + Gooseworks competitor-ad-intelligence…"
        : "Market Pulse — Firecrawl reviews + Gooseworks competitor creative watch…",
      level: "info",
    });

    const market = await runMarketPulse({
      product: campaign.product,
      description: campaign.description,
      audience: campaign.audience,
      differentiator: campaign.differentiator,
      mode: campaign.mode,
      icp: campaign.icpQuery ?? campaign.audience,
    });

    await convex.mutation(api.campaigns.saveMarketPulse, {
      campaignId,
      output: market.output,
      isSample: market.isSample,
    });

    await convex.mutation(api.campaigns.appendLog, {
      campaignId,
      agent: "demand",
      message: "Demand Gap agent analyzing verified signals…",
      level: "info",
    });

    const signals = await convex.query(api.campaigns.getSignals, { campaignId });
    const demand = await runDemandGap({
      product: campaign.product,
      differentiator: campaign.differentiator,
      signals,
    });

    await convex.mutation(api.campaigns.saveDemand, {
      campaignId,
      gap: demand.gap,
      angleHeadline: demand.angle_headline,
      reason: demand.supporting_reason,
      emotion: demand.target_emotion,
    });

    await convex.mutation(api.campaigns.setStatus, {
      campaignId,
      status: "angle_ready",
      isSampleData: market.isSample,
    });

    if (isB2B) {
      await convex.mutation(api.campaigns.setStatus, { campaignId, status: "finding_audience" });
      await convex.mutation(api.campaigns.appendLog, {
        campaignId,
        agent: "audience",
        message: "Audience Finder (Orange Slice) — resolving ICP into enriched prospect list…",
        level: "info",
      });

      const audience = await runAudienceFinder({
        icp: campaign.icpQuery ?? campaign.audience,
        angleHeadline: demand.angle_headline,
        product: campaign.product,
      });

      await convex.mutation(api.campaigns.saveProspects, {
        campaignId,
        prospects: audience.prospects.map((p) => ({
          name: p.name,
          role: p.role,
          company: p.company,
          linkedinUrl: p.linkedin_url,
          companyContext: p.company_context,
          intentSignal: p.intent_signal,
          sourceUrl: p.source_url,
        })),
        isSample: audience.isSample,
      });

      await convex.mutation(api.campaigns.setStatus, { campaignId, status: "audience_ready" });
    }

    await convex.mutation(api.campaigns.appendLog, {
      campaignId,
      agent: "creative",
      message: "Creative Studio — Gooseworks brand kit + ad gen + verify-product-image QC…",
      level: "info",
    });

    const brandKit = await goose.buildBrandKit({
      product: campaign.product,
      description: campaign.description,
      audience: campaign.audience,
      differentiator: campaign.differentiator,
      angleHeadline: demand.angle_headline,
      priceTier: campaign.priceTier,
    });

    await convex.mutation(api.campaigns.saveBrandKit, {
      campaignId,
      brandKitId: brandKit.brandKitId,
      positioning: brandKit.positioning,
      audience: brandKit.audience,
      voice: brandKit.voice,
      valueProps: brandKit.valueProps,
      primaryColor: brandKit.colors.primary,
      accentColor: brandKit.colors.accent,
      productPhotos: brandKit.productPhotos,
      source: brandKit.source,
    });

    const creativeResult = await runCreativeStudio({
      product: campaign.product,
      description: campaign.description,
      audience: campaign.audience,
      differentiator: campaign.differentiator,
      angleHeadline: demand.angle_headline,
      platform: isB2B ? "linkedin" : campaign.platform,
      priceTier: campaign.priceTier,
      brandKit,
    });

    await saveCreativeResult(convex, campaignId, creativeResult);

    if (isB2B) {
      const prospects = await convex.query(api.campaigns.getProspects, { campaignId });
      const outreachDrafts = await runPersonalizedOutreach({
        product: campaign.product,
        angleHeadline: demand.angle_headline,
        differentiator: campaign.differentiator,
        prospects: prospects.map((p) => ({
          name: p.name,
          role: p.role,
          company: p.company,
          companyContext: p.companyContext,
          intentSignal: p.intentSignal,
          linkedinUrl: p.linkedinUrl,
        })),
      });
      await convex.mutation(api.campaigns.saveOutreach, { campaignId, items: outreachDrafts });
    }

    const platform = isB2B ? "linkedin" : campaign.platform === "both" ? "instagram" : campaign.platform;

    if (creativeResult.qcStatus === "pass") {
      await convex.mutation(api.campaigns.setStatus, { campaignId, status: "creative_ready" });
      await convex.mutation(api.campaigns.createDraftPost, { campaignId, platform });
      if (!isB2B && campaign.platform === "both") {
        await convex.mutation(api.campaigns.createDraftPost, { campaignId, platform: "linkedin" });
      }
      await convex.mutation(api.campaigns.setStatus, { campaignId, status: "ready_to_post" });
      await convex.mutation(api.campaigns.appendLog, {
        campaignId,
        agent: "system",
        message: isB2B
          ? "QC passed — review broadcast + outreach drafts before sending"
          : "QC passed — awaiting your approval to publish",
        level: "success",
      });
    } else {
      await convex.mutation(api.campaigns.setStatus, { campaignId, status: "creative_ready" });
      await convex.mutation(api.campaigns.appendLog, {
        campaignId,
        agent: "creative",
        message: `QC ${creativeResult.qcStatus} — human override required before ready_to_post`,
        level: "warn",
      });
    }
  } catch (error) {
    await convex.mutation(api.campaigns.setStatus, {
      campaignId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Pipeline failed",
    });
    throw error;
  }
}
