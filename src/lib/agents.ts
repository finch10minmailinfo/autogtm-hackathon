import { OrangeSliceClient, generateStructured, hasOrangeSliceKey } from "@/lib/orangeslice/client";

export type MarketPulseOutput = {
  competitors: string[];
  reviews_scanned: number;
  why_buy: Array<{ text: string; source_url: string; competitor: string }>;
  why_not: Array<{ text: string; source_url: string; competitor: string }>;
  buying_intent?: Array<{ text: string; source_url: string; company: string }>;
  creative_gaps?: Array<{ text: string; source_url: string; competitor: string }>;
  quotes: Array<{ text: string; source_url: string }>;
};

const SAMPLE_MARKET: MarketPulseOutput = {
  competitors: ["Category leaders"],
  reviews_scanned: 0,
  why_buy: [
    { text: "Fast setup and clear onboarding", source_url: "sample://insights", competitor: "Category" },
    { text: "Reliable daily performance", source_url: "sample://insights", competitor: "Category" },
  ],
  why_not: [
    { text: "Generic messaging that misses buyer intent", source_url: "sample://insights", competitor: "Category" },
    { text: "Poor mobile experience at checkout", source_url: "sample://insights", competitor: "Category" },
  ],
  quotes: [{ text: "I wanted something that just works.", source_url: "sample://insights" }],
};

const MARKET_SCHEMA = {
  type: "object",
  properties: {
    competitors: { type: "array", items: { type: "string" } },
    reviews_scanned: { type: "number" },
    why_buy: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, source_url: { type: "string" }, competitor: { type: "string" } },
        required: ["text", "source_url"],
      },
    },
    why_not: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, source_url: { type: "string" }, competitor: { type: "string" } },
        required: ["text", "source_url"],
      },
    },
    creative_gaps: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, source_url: { type: "string" }, competitor: { type: "string" } },
        required: ["text", "source_url"],
      },
    },
    buying_intent: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, source_url: { type: "string" }, company: { type: "string" } },
        required: ["text", "source_url"],
      },
    },
    quotes: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, source_url: { type: "string" } },
        required: ["text", "source_url"],
      },
    },
  },
  required: ["competitors", "reviews_scanned", "why_buy", "why_not", "quotes"],
} as const;

export async function runMarketPulse(input: {
  product: string;
  description: string;
  audience: string;
  differentiator: string;
  mode?: "b2c" | "b2b";
  icp?: string;
}) {
  // Real buyer voice comes from Orange Slice webSearch across Reddit + Twitter/X + LinkedIn.
  // Key present + total search failure → error propagates so the pipeline reports an honest
  // failure (never fabricated data). No key → clearly-labeled sample mode below.
  const scrape = await new OrangeSliceClient().scrapeMarketSignals({
    product: input.product,
    description: input.description,
    differentiator: input.differentiator,
  });

  if (scrape.isSample || scrape.chunks.length === 0 || !hasOrangeSliceKey()) {
    return { output: { ...SAMPLE_MARKET } as MarketPulseOutput, isSample: true };
  }

  const intentInstruction =
    input.mode === "b2b"
      ? " Also populate buying_intent with any hiring, funding, tooling-migration or evaluation signals found in the text (cite source_url; include company when stated)."
      : "";

  const parsed = await generateStructured<MarketPulseOutput>({
    system:
      "You are a market researcher. The user gives you real search results from Reddit, Twitter/X and LinkedIn, each prefixed with its SOURCE URL. " +
      "Extract genuine buyer sentiment ONLY from the provided text. Every item MUST cite the exact source_url it came from — never invent a URL or a quote. " +
      "If a field has no support in the text, return an empty array for it." +
      intentInstruction,
    prompt: JSON.stringify({
      product: input.product,
      description: input.description,
      audience: input.audience,
      differentiator: input.differentiator,
      channels_scraped: scrape.channels,
      sources_scraped: scrape.sourceCount,
      scraped: scrape.text,
    }),
    schema: MARKET_SCHEMA,
  });

  if (!parsed.reviews_scanned) parsed.reviews_scanned = scrape.sourceCount;

  return { output: parsed, isSample: false };
}

const DEMAND_SCHEMA = {
  type: "object",
  properties: {
    gap: { type: "string" },
    angle_headline: { type: "string" },
    supporting_reason: { type: "string" },
    target_emotion: { type: "string" },
  },
  required: ["gap", "angle_headline", "supporting_reason", "target_emotion"],
} as const;

export async function runDemandGap(input: {
  product: string;
  differentiator: string;
  signals: Array<{ type: string; text: string; sourceUrl: string; competitor: string }>;
}) {
  if (!hasOrangeSliceKey()) {
    return {
      gap: "Buyers want proof before promise.",
      angle_headline: "Proof Before Promise",
      supporting_reason: "Lead with the outcome your differentiator guarantees.",
      target_emotion: "confidence",
    };
  }

  return generateStructured<{
    gap: string;
    angle_headline: string;
    supporting_reason: string;
    target_emotion: string;
  }>({
    system:
      "Identify the single highest-leverage demand gap from the provided verified signals. " +
      "angle_headline must be max 6 words.",
    prompt: JSON.stringify(input),
    schema: DEMAND_SCHEMA,
  });
}

const OUTREACH_SCHEMA = {
  type: "object",
  properties: { message: { type: "string" } },
  required: ["message"],
} as const;

export async function runPersonalizedOutreach(input: {
  product: string;
  angleHeadline: string;
  differentiator: string;
  prospects: Array<{
    name: string;
    role: string;
    company: string;
    companyContext: string;
    intentSignal: string;
    linkedinUrl: string;
  }>;
}) {
  const drafts: Array<{ prospectLinkedinUrl: string; draftMessage: string }> = [];

  if (!hasOrangeSliceKey()) {
    for (const p of input.prospects) {
      drafts.push({
        prospectLinkedinUrl: p.linkedinUrl,
        draftMessage: `Hi ${p.name.split(" ")[0]},\n\nSaw ${p.intentSignal.toLowerCase()} at ${p.company}. We help ${p.role}s with ${input.angleHeadline} — ${input.differentiator}.\n\nWorth a 10-min look?\n\n— [Your name]`,
      });
    }
    return drafts;
  }

  for (const p of input.prospects.slice(0, 8)) {
    const result = await generateStructured<{ message: string }>({
      system:
        "Write a short LinkedIn outreach message (under 120 words). Personalize using prospect enrichment. " +
        "Lead with their intent signal. End with a soft CTA. No spam. Return the message in the 'message' field.",
      prompt: JSON.stringify({
        product: input.product,
        angle: input.angleHeadline,
        differentiator: input.differentiator,
        prospect: p,
      }),
      schema: OUTREACH_SCHEMA,
    });
    drafts.push({ prospectLinkedinUrl: p.linkedinUrl, draftMessage: result.message?.trim() ?? "" });
  }

  return drafts;
}
