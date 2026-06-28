/**
 * OrangeSliceClient — adapter over the Orange Slice SDK.
 * Swap internals here when booth/docs provide updated endpoints; pipeline code
 * depends only on this interface.
 */
import type {
  AudienceFinderResult,
  IntentSignalsResult,
  OrangeSliceIntentSignal,
  OrangeSliceProspect,
} from "./types";

const SAMPLE_INTENT: OrangeSliceIntentSignal[] = [
  {
    text: "Hiring 2 SDRs and a RevOps lead — scaling outbound",
    source_url: "sample://orangeslice/intent",
    company: "Series A fintech (sample)",
  },
  {
    text: "Tech-stack change: migrated from HubSpot sequences to manual lists",
    source_url: "sample://orangeslice/intent",
    company: "B2B SaaS (50 employees, sample)",
  },
];

const SAMPLE_PROSPECTS: OrangeSliceProspect[] = [
  {
    name: "Alex Chen",
    role: "VP Revenue Operations",
    company: "LedgerFlow",
    linkedin_url: "sample://prospect/alex-chen",
    company_context: "Series A fintech, 48 employees, US",
    intent_signal: "Posted RevOps + 2 SDR roles in last 30 days",
    source_url: "sample://orangeslice/prospects",
  },
  {
    name: "Priya Sharma",
    role: "Head of Growth",
    company: "StackPilot",
    linkedin_url: "sample://prospect/priya-sharma",
    company_context: "Developer tools SaaS, 120 employees",
    intent_signal: "LinkedIn post asking for GTM automation recommendations",
    source_url: "sample://orangeslice/prospects",
  },
  {
    name: "Marcus Webb",
    role: "Founder & CEO",
    company: "CloseLoop CRM",
    linkedin_url: "sample://prospect/marcus-webb",
    company_context: "Early-stage CRM startup, 12 employees",
    intent_signal: "Complaint thread about generic outbound underperforming",
    source_url: "sample://orangeslice/prospects",
  },
];

type LinkedInJobRow = {
  title?: string;
  linkedin_company_id?: number;
  company_name?: string;
};

type LinkedInProfileRow = {
  first_name?: string;
  last_name?: string;
  headline?: string;
  public_profile_url?: string;
  title?: string;
  company_name?: string;
};

export class OrangeSliceClient {
  constructor(private readonly apiKey?: string) {}

  static fromEnv(): OrangeSliceClient {
    return new OrangeSliceClient(process.env.ORANGE_SLICE_API_KEY);
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey ?? process.env.ORANGE_SLICE_API_KEY);
  }

  private async withSdk<T>(fn: () => Promise<T>): Promise<T> {
    const key = this.apiKey ?? process.env.ORANGE_SLICE_API_KEY;
    if (!key) throw new Error("ORANGE_SLICE_API_KEY not set");

    const { configure, withApiKey } = await import("orangeslice");
    configure({ apiKey: key });
    return withApiKey(key, fn);
  }

  /** Buying-intent signals for Market Pulse (B2B lane). */
  async getIntentSignals(input: {
    product: string;
    category: string;
    icp: string;
  }): Promise<IntentSignalsResult> {
    void input;

    if (!this.isConfigured()) {
      return { signals: SAMPLE_INTENT, isSample: true };
    }

    try {
      return await this.withSdk(async () => {
        const { linkedinSearch } = await import("orangeslice");

        const [jobs] = await Promise.all([
          linkedinSearch<LinkedInJobRow>({
            sql: `
              SELECT title, linkedin_company_id, company_name
              FROM linkedin_job
              WHERE LOWER(title) LIKE '%sales%'
                 OR LOWER(title) LIKE '%revenue%'
                 OR LOWER(title) LIKE '%growth%'
              LIMIT 8
            `,
          }),
        ]);

        const signals: OrangeSliceIntentSignal[] = (jobs.rows ?? []).slice(0, 5).map((job) => ({
          text: `Active hiring signal: ${job.title ?? "GTM role"} at ${job.company_name ?? "target company"}`,
          source_url: `orangeslice://linkedin_job/${job.linkedin_company_id ?? "unknown"}`,
          company: job.company_name ?? "Unknown",
        }));

        if (signals.length === 0) {
          return { signals: SAMPLE_INTENT, isSample: true };
        }

        return { signals, isSample: false };
      });
    } catch {
      return { signals: SAMPLE_INTENT, isSample: true };
    }
  }

  /** Agent 4 — build enriched prospect list from ICP + locked angle. */
  async findProspects(input: {
    icp: string;
    angleHeadline: string;
    product: string;
  }): Promise<AudienceFinderResult> {
    if (!this.isConfigured()) {
      return {
        prospects: SAMPLE_PROSPECTS,
        list_size: SAMPLE_PROSPECTS.length,
        isSample: true,
      };
    }

    try {
      return await this.withSdk(async () => {
        const { linkedinSearch, oceanSearchPeople } = await import("orangeslice");

        const titleKeywords = extractTitleKeywords(input.icp);

        const [peopleResult, oceanResult] = await Promise.all([
          linkedinSearch<LinkedInProfileRow>({
            sql: `
              SELECT first_name, last_name, headline, public_profile_url, title, company_name
              FROM linkedin_profile
              WHERE LOWER(headline) LIKE '%${titleKeywords[0] ?? "growth"}%'
                 OR LOWER(title) LIKE '%${titleKeywords[0] ?? "head"}%'
              LIMIT 10
            `,
          }).catch(() => ({ rows: [] as LinkedInProfileRow[] })),
          oceanSearchPeople({
            peopleFilters: {
              jobTitleKeywords: titleKeywords,
              seniorities: ["Director", "VP", "C-Level", "Head"],
            },
            size: 8,
          }).catch(() => ({ people: [] as Array<Record<string, unknown>> })),
        ]);

        const fromSql: OrangeSliceProspect[] = (peopleResult.rows ?? []).slice(0, 5).map((row) => ({
          name: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Unknown",
          role: row.title ?? row.headline ?? "Decision maker",
          company: row.company_name ?? "Unknown company",
          linkedin_url: row.public_profile_url ?? "orangeslice://profile/unknown",
          company_context: row.headline ?? "",
          intent_signal: `Matches ICP: ${input.icp.slice(0, 80)}`,
          source_url: row.public_profile_url ?? "orangeslice://linkedin",
        }));

        const fromOcean: OrangeSliceProspect[] = ((oceanResult as { people?: Array<Record<string, unknown>> }).people ?? [])
          .slice(0, 5)
          .map((person) => {
            const name = String(person.name ?? person.fullName ?? "Unknown");
            const company = String(
              (person.company as { name?: string } | undefined)?.name ?? person.companyName ?? "Unknown"
            );
            return {
              name,
              role: String(person.title ?? person.jobTitle ?? "Decision maker"),
              company,
              linkedin_url: String(person.linkedinUrl ?? person.profileUrl ?? "orangeslice://ocean"),
              company_context: String(person.companyDescription ?? company),
              intent_signal: `Angle fit: ${input.angleHeadline}`,
              source_url: String(person.linkedinUrl ?? "orangeslice://ocean"),
            };
          });

        const merged = dedupeProspects([...fromSql, ...fromOcean]).slice(0, 8);

        if (merged.length === 0) {
          return {
            prospects: SAMPLE_PROSPECTS,
            list_size: SAMPLE_PROSPECTS.length,
            isSample: true,
          };
        }

        return { prospects: merged, list_size: merged.length, isSample: false };
      });
    } catch {
      return {
        prospects: SAMPLE_PROSPECTS,
        list_size: SAMPLE_PROSPECTS.length,
        isSample: true,
      };
    }
  }
}

function extractTitleKeywords(icp: string): string[] {
  const lower = icp.toLowerCase();
  const keywords = ["growth", "revenue", "sales", "marketing", "founder", "ops", "gtm"];
  const found = keywords.filter((k) => lower.includes(k));
  return found.length > 0 ? found : ["growth", "revenue"];
}

function dedupeProspects(prospects: OrangeSliceProspect[]): OrangeSliceProspect[] {
  const seen = new Set<string>();
  return prospects.filter((p) => {
    const key = `${p.name}|${p.company}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
