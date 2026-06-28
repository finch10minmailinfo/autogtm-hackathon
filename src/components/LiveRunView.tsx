"use client";

import { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

const B2C_AGENTS = [
  { id: "market", label: "Market Pulse", color: "var(--amber)", desc: "Reddit + X + LinkedIn scrape" },
  { id: "demand", label: "Demand Gap", color: "var(--green)", desc: "Locks the angle" },
  { id: "creative", label: "Creative Studio", color: "var(--violet)", desc: "Image + caption" },
] as const;

const B2B_AGENTS = [
  { id: "market", label: "Market Pulse", color: "var(--amber)", desc: "Scrape + intent signals" },
  { id: "demand", label: "Demand Gap", color: "var(--green)", desc: "Locks the angle" },
  { id: "audience", label: "Audience Finder", color: "var(--orange)", desc: "Audience + enrichment" },
  { id: "creative", label: "Creative Studio", color: "var(--violet)", desc: "Post + outreach drafts" },
] as const;

// Agent ids that map to a card in the live pod (excludes the "system" channel).
const KNOWN_AGENTS = new Set(["market", "demand", "audience", "creative"]);

type Props = {
  campaignId: Id<"campaigns">;
  product: string;
  onConfirmAudience?: () => void;
  confirmingAudience?: boolean;
};

export function LiveRunView({ campaignId, product, onConfirmAudience, confirmingAudience }: Props) {
  const campaign = useQuery(api.campaigns.get, { campaignId });
  const logs = useQuery(api.campaigns.getActivityLogs, { campaignId });
  const signals = useQuery(api.campaigns.getSignals, { campaignId });
  const prospects = useQuery(api.campaigns.getProspects, { campaignId });
  const audience = useQuery(api.campaigns.getAudience, { campaignId });

  const isB2B = (campaign?.mode ?? "b2c") === "b2b";
  const AGENTS = isB2B ? B2B_AGENTS : B2C_AGENTS;
  const status = campaign?.status ?? "queued";

  // Status only flips at phase boundaries, so it lags the work in progress
  // (e.g. in B2C, creative runs while status is still `angle_ready`). Each agent
  // logs right before it starts, so the most recent agent log is the truest
  // "who's working now" signal. Fall back to status before any logs arrive.
  const statusAgent =
    status === "researching"
      ? "market"
      : status === "angle_ready"
        ? (isB2B ? "demand" : "creative")
        : status === "building_audience" || status === "finding_audience"
          ? "audience"
          : status === "audience_ready" || status === "creative_ready" || status === "ready_to_post"
            ? "creative"
            : "system";
  const lastAgentLog = logs
    ?.filter((log) => KNOWN_AGENTS.has(log.agent))
    .at(-1);
  const activeAgent = lastAgentLog?.agent ?? statusAgent;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div>
          <p className="mono text-xs text-[var(--accent-text)]">LIVE RUN — {product}</p>
          <h2 className="text-2xl font-semibold mt-1">
            Agent pod executing {isB2B ? "(B2B)" : "(B2C)"}
          </h2>
          {(campaign?.isSampleData || campaign?.isSampleProspects) && (
            <p className="mt-2 text-xs text-[var(--amber)] border border-[var(--amber)]/35 bg-[var(--amber)]/10 rounded px-3 py-2">
              Sample mode active — claims labeled sample:// until API keys connect.
            </p>
          )}
        </div>

        <div className={`grid gap-3 ${isB2B ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
          {AGENTS.map((agent) => {
            const isActive = activeAgent === agent.id;
            return (
              <div
                key={agent.id}
                className={`rounded-xl border p-4 transition ${isActive ? "agent-pulse" : "opacity-60"}`}
                style={{ borderColor: isActive ? agent.color : "var(--border)" }}
              >
                <div className="h-2 w-2 rounded-full mb-3" style={{ background: agent.color }} />
                <p className="font-medium text-sm">{agent.label}</p>
                <p className="text-xs text-[var(--faint)] mt-1">{agent.desc}</p>
              </div>
            );
          })}
        </div>

        {isB2B && (
          <AudiencePanel
            prospects={prospects ?? []}
            status={status}
            isSample={campaign?.isSampleProspects}
            audience={audience ?? null}
            onConfirmAudience={onConfirmAudience}
            confirmingAudience={confirmingAudience}
          />
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--field)] p-4 h-64 overflow-y-auto mono text-xs">
          <p className="text-[var(--faint)] mb-3">{"// activity stream"}</p>
          {(logs ?? []).map((log, i) => (
            <div key={i} className="log-line mb-2">
              <span style={{ color: agentColor(log.agent) }}>[{log.agent}]</span>{" "}
              <span className="text-[var(--ink)]">{log.message}</span>
            </div>
          ))}
          {(!logs || logs.length === 0) && (
            <p className="text-[var(--faint)]">Waiting for agent output…</p>
          )}
        </div>
      </div>

      <ConvexStateTable
        status={status}
        signalCount={signals?.length ?? 0}
        prospectCount={prospects?.length ?? 0}
        audienceEstimate={audience?.estimatedCredits}
        audienceState={audience?.state}
        isB2B={isB2B}
        isSample={campaign?.isSampleData}
        isSampleProspects={campaign?.isSampleProspects}
      />
    </div>
  );
}

function AudiencePanel({
  prospects,
  status,
  isSample,
  audience,
  onConfirmAudience,
  confirmingAudience,
}: {
  prospects: Array<{
    name: string;
    role: string;
    company: string;
    intentSignal: string;
    sourceUrl: string;
  }>;
  status: string;
  isSample?: boolean;
  audience?: {
    estimatedCredits: number;
    availableCredits?: number;
    listSize: number;
    state: string;
  } | null;
  onConfirmAudience?: () => void;
  confirmingAudience?: boolean;
}) {
  const waitingForConfirm =
    status === "building_audience" &&
    audience?.state === "estimated" &&
    prospects.length === 0;
  const loading =
    (status === "building_audience" && !waitingForConfirm) ||
    status === "finding_audience" ||
    (status === "angle_ready" && prospects.length === 0);

  return (
    <div className="rounded-xl border border-[var(--orange)]/30 bg-[var(--orange)]/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="mono text-xs text-[var(--accent-text)]">audience.orangeslice</p>
        <span className="text-xs text-[var(--faint)]">
          {waitingForConfirm ? "estimate ready" : loading ? "building..." : `${prospects.length} prospects`}
          {isSample && prospects.length > 0 ? " (sample)" : ""}
        </span>
      </div>
      {waitingForConfirm && audience ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--orange)]/40 bg-[var(--field)] p-3">
            <p className="text-sm text-[var(--ink)]">
              This will cost{" "}
              <span className="font-semibold text-[var(--accent-text)]">{audience.estimatedCredits} enrichment credits</span>{" "}
              to enrich up to {audience.listSize} prospects. Proceed?
            </p>
            {audience.availableCredits !== undefined && (
              <p className="mt-1 text-xs text-[var(--faint)]">
                Credits available: {audience.availableCredits}
              </p>
            )}
          </div>
          <button
            onClick={onConfirmAudience}
            disabled={!onConfirmAudience || confirmingAudience}
            className="w-full lex-pill px-4 py-2 text-xs font-semibold text-[var(--accent-ink)] disabled:opacity-50"
          >
            {confirmingAudience ? "Enriching with Orange Slice..." : "Confirm enrichment"}
          </button>
        </div>
      ) : prospects.length === 0 ? (
        <p className="text-sm text-[var(--faint)]">Resolving ICP into a qualified buyer list...</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {prospects.slice(0, 4).map((p, i) => (
            <div key={i} className="text-xs border-l-2 border-[var(--orange)] pl-3">
              <p className="font-medium">{p.name} · {p.role}</p>
              <p className="text-[var(--faint)]">{p.company}</p>
              <p className="text-[var(--muted)] mt-0.5">{p.intentSignal}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function agentColor(agent: string) {
  if (agent === "market") return "var(--amber)";
  if (agent === "demand") return "var(--green)";
  if (agent === "audience") return "var(--orange)";
  if (agent === "creative") return "var(--violet)";
  return "var(--orange)";
}

function ConvexStateTable({
  status,
  signalCount,
  prospectCount,
  audienceEstimate,
  audienceState,
  isB2B,
  isSample,
  isSampleProspects,
}: {
  status: string;
  signalCount: number;
  prospectCount: number;
  audienceEstimate?: number;
  audienceState?: string;
  isB2B: boolean;
  isSample?: boolean;
  isSampleProspects?: boolean;
}) {
  const rows = [
    { table: "campaigns", field: "status", value: status },
    { table: "signals", field: "count", value: String(signalCount) },
    ...(isB2B
      ? [{ table: "prospects", field: "count", value: String(prospectCount) }]
      : []),
    ...(isB2B && audienceEstimate !== undefined
      ? [{ table: "audiences", field: "estimate", value: `${audienceEstimate} credits` }]
      : []),
    ...(isB2B && audienceState
      ? [{ table: "audiences", field: "state", value: audienceState }]
      : []),
    { table: "demand", field: "locked", value: ["angle_ready", "building_audience", "finding_audience", "audience_ready", "creative_ready", "ready_to_post", "posted"].includes(status) ? "yes" : "pending" },
    { table: "creatives", field: "ready", value: status === "ready_to_post" || status === "posted" ? "yes" : "pending" },
    { table: "meta", field: "sample_mode", value: isSample ? "true" : "false" },
    ...(isB2B
      ? [{ table: "meta", field: "sample_prospects", value: isSampleProspects ? "true" : "false" }]
      : []),
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)] p-4 h-fit">
      <p className="mono text-xs text-[var(--faint)] mb-3">convex.state</p>
      <table className="w-full text-xs mono">
        <thead>
          <tr className="text-[var(--faint)] border-b border-[var(--border)]">
            <th className="text-left py-2">table</th>
            <th className="text-left py-2">field</th>
            <th className="text-right py-2">value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.table}-${row.field}-${i}`} className="border-b border-[var(--border)]/50">
              <td className="py-2 text-[var(--muted)]">{row.table}</td>
              <td className="py-2 text-[var(--faint)]">{row.field}</td>
              <td className="py-2 text-right text-[var(--green)]">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
