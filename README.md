# AutoGTM

Autonomous multi-agent GTM pipeline: market research → demand gap → audience → creative → staged distribution. Built for the YC AI Growth Hackathon (hosted by **Orange Slice**).

## Stack

- **Next.js** (App Router, Turbopack) + React + Tailwind
- **Convex** — real-time state machine + file storage
- **Orange Slice** — the spine: structured AI reasoning (`generateObject`) + B2B audience over a 1.15B-profile LinkedIn database (`oceanSearchPeople`, real contacts)
- **Fiber AI** — live buyer voice: Reddit + Twitter/X + LinkedIn post scraping for Market Pulse
- **OpenAI** — `gpt-image-1` ad image generation

**Role split:** Orange Slice = the brain + WHO · Fiber = live social signal · OpenAI = the visual · AutoGTM = orchestration

## Quick start

```bash
npm install
npx convex dev          # creates deployment + writes NEXT_PUBLIC_CONVEX_URL to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
ORANGESLICE_API_KEY=          # AI + B2B audience
FIBER_API_KEY=                # live Reddit/X/LinkedIn buyer voice
OPENAI_API_KEY=               # gpt-image-1 ad images
NEXT_PUBLIC_CONVEX_URL=       # set by `npx convex dev`
CONVEX_DEPLOYMENT=            # set by `npx convex dev`
```

Without a key, the affected agent runs in **clearly-labeled sample mode** — no fabricated sources. When a key **is** present and a call fails, the pipeline reports an honest `failed` status instead of injecting sample data.

## Agent pipeline (B2C)

1. **Market Pulse** — Fiber scrapes Reddit + X + LinkedIn → Orange Slice AI extracts why_buy/why_not/quotes/creative_gaps, each cited to a real `source_url` → `signals` table
2. **Demand Gap** — Orange Slice AI locks the angle → `demand` table
3. **Creative Studio** — Orange Slice AI writes copy, OpenAI `gpt-image-1` renders the ad, byte-level QC gate → `creatives` + Convex storage
4. **Distribution** — human-in-the-loop: approve to stage, you publish from your own account → `posts` table

Status: `queued → researching → angle_ready → creative_ready → ready_to_post → posted`

## B2B lane (Orange Slice audience)

Toggle **B2B** on intake. Pipeline adds:

1. **Market Pulse** — Fiber buyer voice + Fiber buying-intent signals
2. **Demand Gap** — locks the marketing angle
3. **Audience Finder** — Orange Slice parses the ICP into Ocean filters, previews the match count, then waits for approval before pulling contacts
4. **Enrichment** — after approval, Orange Slice `oceanSearchPeople` exports real prospects with work emails/phones → `prospects`
5. **Creative Studio** — LinkedIn broadcast + per-prospect outreach drafts (Orange Slice AI)
6. **Distribution** — approve broadcast + each outreach draft; you send manually

Status: `queued → researching → angle_ready → building_audience → audience_ready → creative_ready → ready_to_post → posted`

## Compliance

- Posts only to the user's own account; nothing publishes automatically
- No cold-DM automation — outreach drafts are for the user to send
- Sample mode (clearly labeled) only when a key is absent
- Explicit human approval before any publish
