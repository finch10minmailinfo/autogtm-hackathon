import { OrangeSliceClient, hasOrangeSliceKey } from "@/lib/orangeslice/client";
import type { FiberAudienceEstimate, FiberAudienceResult, FiberProspect } from "@/lib/fiber/types";

const SAMPLE_PROSPECTS: FiberProspect[] = [
  {
    name: "Maya Chen",
    role: "VP Growth",
    company: "Northstar Metrics",
    linkedin_url: "sample://orangeslice/prospect/maya-chen",
    work_email: "sample@example.com",
    phone: "+1 555 0100",
    company_context: "Series A SaaS team scaling outbound and experimenting with agent-led GTM.",
    intent_signal: "Hiring outbound SDRs and testing new revenue workflows.",
    source: "sample",
    source_url: "sample://orangeslice/prospects",
  },
  {
    name: "Arjun Patel",
    role: "Head of RevOps",
    company: "LedgerLift",
    linkedin_url: "sample://orangeslice/prospect/arjun-patel",
    work_email: "sample@example.com",
    company_context: "Fintech RevOps leader with CRM hygiene and campaign velocity pain.",
    intent_signal: "Recent CRM migration suggests appetite for pipeline automation.",
    source: "sample",
    source_url: "sample://orangeslice/prospects",
  },
];

/**
 * Audience Finder — backed by Orange Slice Ocean people search (1.15B-profile DB).
 * Preview returns the match count + an encoded audience ref; enrichment pulls real
 * prospects with work emails/phones. No key → labeled sample mode. Key present +
 * failure → error propagates (the pipeline marks the campaign failed, never fakes data).
 */
export async function prepareAudience(input: {
  icp: string;
  angleHeadline: string;
  product: string;
}): Promise<FiberAudienceEstimate> {
  if (!hasOrangeSliceKey()) {
    return {
      fiberAudienceId: "sample://orangeslice/audience",
      query: input.icp,
      estimatedCredits: 0,
      listSize: SAMPLE_PROSPECTS.length,
      isSample: true,
    };
  }

  const preview = await new OrangeSliceClient().previewAudience({
    icp: input.icp,
    angleHeadline: input.angleHeadline,
  });

  return {
    fiberAudienceId: preview.audienceRef,
    query: input.icp,
    // 1 enrichment credit per prospect contact pulled (transparent estimate).
    estimatedCredits: preview.listSize,
    listSize: preview.listSize,
    isSample: false,
  };
}

export async function enrichAudience(input: {
  fiberAudienceId: string;
  estimatedCredits?: number;
}): Promise<FiberAudienceResult> {
  if (!hasOrangeSliceKey() || input.fiberAudienceId.startsWith("sample://")) {
    return {
      prospects: SAMPLE_PROSPECTS,
      list_size: SAMPLE_PROSPECTS.length,
      estimated_credits: input.estimatedCredits ?? 0,
      isSample: true,
    };
  }

  const prospects = await new OrangeSliceClient().enrichAudience(input.fiberAudienceId);

  // Key present: return the real enriched list as-is (even if empty). No sample injection.
  return {
    prospects,
    list_size: prospects.length,
    estimated_credits: input.estimatedCredits,
    isSample: false,
  };
}
