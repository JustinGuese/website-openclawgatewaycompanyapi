# Plan: `/for-investors` Marketing Page

## Context

AgentBureau wants a public-facing investor relations page to attract angel investors and seed-stage VCs in the DACH region. Source content is in [MARKETING.md](MARKETING.md) — a long-form thesis covering the Embodiment-as-a-Service positioning, x402/MCP technical foundations, ZAG/Störerhaftung regulatory moat, unit economics, KPIs, valuation benchmarks, and roadmap.

Goal: distill that thesis into a scannable single-page pitch with the same look-and-feel as [pricing.astro](src/pages/pricing.astro) and [gmbh-gruenden.astro](src/pages/gmbh-gruenden.astro), wired into the top nav and the 5-locale i18n system. The page is a high-trust shop window for inbound investor interest, with a clear CTA into a private data room.

## Page Structure (top → bottom)

1. **Hero** — headline ("The Embodiment Protocol for the Agentic Economy"), one-line thesis, two CTAs: *Request Data Room* (mailto/Calendly) and *Read the Thesis* (anchors to MARKETING.md content / blog).
2. **Headline numbers strip** — 4 stat cards (target placeholders, editable):
   - Agent Economy TAM 2033: **$182.97B** (CAGR 49.6%)
   - On-chain settlement margin advantage vs. Stripe (~30% reclaimed on small tickets)
   - Services live: **5** (fax, letter, invoice, GmbH, UG)
   - Locales / languages supported: **5 / 6**
3. **The Embodiment Gap** (Problem) — 3-column grid: Identity / Finance / Action, each with the legacy requirement vs. AgentBureau solution (table from MARKETING.md "Institutional Pillar").
4. **Why Now** — x402 + MCP inflection, two-column: legacy API model vs. MCP+x402 model (table from MARKETING.md).
5. **Product / Revenue Mix** — reuse the pricing table style; show service, price, cost basis, margin (95% / 71% / 98% / 40% / 40%).
6. **Regulatory Moat** — three cards: ZAG §2(1) No.10 a/b exemption, Störerhaftung + ProdHaftG 2026 alignment, HITL Concierge as duty-of-care layer. Link to existing [/docs/legal/zag-exemption](src/content/docs/docs/legal/zag-exemption.md) and [/docs/legal/storerhaftung](src/content/docs/docs/legal/storerhaftung.md).
7. **KPIs / Traction Dashboard** — placeholder grid of metric tiles (API calls/mo, paying agents, USDC GMV, ARPA, MCP installs, median time-to-first-call, uptime). Numbers in `t('for-investors.kpis.*')` so the founder can update without touching code.
8. **Roadmap** — 3 phases (Pan-EU expansion AT/CH/NL, BaaS for agent-owned entities, On-chain reputation/credit scoring) as a numbered milestones block (mirrors gmbh-gruenden.astro milestones pattern).
9. **Comparable Benchmarks** — Bittensor + Akash callouts (2-card row) framing the DePIN/agent-infra comp set.
10. **Valuation & Round** — small table: $100k–500k → $9M cap, $500k–1M → $11M, $1M–2M → $15M, plus a single line for the current ask (placeholder, edited via i18n).
11. **Risks & Mitigations** — 4-row table (Regulatory, Counterparty, Crypto rails, Agent abuse) directly from MARKETING.md.
12. **Trust Signals row** — BaFin compliance, public legal docs, runnable examples repo, live MCP endpoint, Imprint/Datenschutz/AGB.
13. **Closing CTA** — *Request the data room* button → mailto:info@agentbureau.de with subject prefilled, and a secondary "Book a 30-min intro" link (Calendly placeholder).

## Files to Create / Modify

**Create:**
- `src/pages/for-investors.astro` — English default page (no locale prefix).
- `src/pages/[lang]/for-investors.astro` — locale variant; uses `getStaticPaths` mirroring sibling files in [src/pages/[lang]/](src/pages/[lang]/).

**Modify:**
- [src/layouts/Landing.astro](src/layouts/Landing.astro) line ~51 — add nav link `<a href={l('/for-investors')}>{t('nav.forInvestors')}</a>` between Pricing and Playground (or under the About dropdown if nav is getting crowded — see open question below).
- [src/i18n/en.json](src/i18n/en.json), `de.json`, `fr.json`, `es.json`, `zh.json` — add:
  - `nav.forInvestors`
  - `for-investors.hero.*`
  - `for-investors.stats.*` (4 keys)
  - `for-investors.problem.*`
  - `for-investors.whyNow.*`
  - `for-investors.revenue.*`
  - `for-investors.moat.*`
  - `for-investors.kpis.*`
  - `for-investors.roadmap.*`
  - `for-investors.benchmarks.*`
  - `for-investors.valuation.*`
  - `for-investors.risks.*`
  - `for-investors.cta.*`

## Components to Reuse

- `Landing` layout — [src/layouts/Landing.astro](src/layouts/Landing.astro) for header/footer/nav.
- `useTranslations`, `getLocaleFromUrl` — [src/i18n/t.ts](src/i18n/t.ts).
- Card/grid/table styling — copy section patterns straight from [pricing.astro](src/pages/pricing.astro) (price table, feature grid) and [gmbh-gruenden.astro](src/pages/gmbh-gruenden.astro) (milestones, comparison table, FAQ-style accordions if needed).
- No new React islands required; the page is fully static Astro + Tailwind.

## Content Source

All long-form copy is distilled from [MARKETING.md](MARKETING.md). The plan is *not* to dump the full document — every section above is one tight paragraph + a table or grid. Reading time target: under 3 minutes; full data lives in the gated data room.

## Confirmed Decisions

1. **CTA**: dual buttons — `mailto:info@agentbureau.de?subject=Investor%20Inquiry%20%E2%80%94%20Data%20Room%20Request` + Calendly placeholder URL (founder to swap in real link).
2. **KPI tiles**: ship with em-dash placeholders and a small "Metrics updated quarterly — last update {date}" caption beneath the grid. Values live in i18n JSON so updates require no code change.
3. **Nav**: top-level link between Pricing and Playground in [src/layouts/Landing.astro](src/layouts/Landing.astro) line ~51. Label key `nav.forInvestors`.
4. **Localization**: full 5-locale launch (en/de/fr/es/zh). All translations land in the corresponding `src/i18n/{locale}.json` files in the same commit as the page.

## Verification

- `npm run build` — must produce 217+ pages across 5 locales without i18n key warnings.
- `npm run dev` — visit `/for-investors`, `/de/for-investors`, `/fr/for-investors`, `/es/for-investors`, `/zh/for-investors`; confirm nav link, hero, all 13 sections render, CTA mailto opens with correct subject.
- Check `LocaleSwitcher` round-trips between `/for-investors` ↔ `/de/for-investors`.
- Lighthouse pass on the EN page (target 95+ perf/SEO since this is investor-facing).
- Mobile breakpoint check (sm/md) — investors will open this on phone from email.
