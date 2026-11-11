# NyayCheck

A Node 20+ / TypeScript application for understanding Indian consumer disputes. One HTML page, vanilla JavaScript, streamed stage progress, no frontend framework, database or account system. All production inference and calculations go through Otari. Python rule and award programs are standard-library only.

**Build status:** runnable locally; TypeScript builds and 19 automated checks pass. The live Otari acceptance run is pending credentials. Invoice OCR/redaction is not complete. This is a transparent implementation for review, not a claim that the original prompt's live acceptance conditions have all been met.

## Run

```powershell
npm install
npm run build
Copy-Item .env.example .env
# Edit .env locally with your service key and verified routing policy names.
npm start
```

Open http://localhost:3000. Run commands from this directory. Python 3.10+ must be on PATH for `npm test`; the production server needs no local Python because it sends source to Otari's sandbox. Set `PYTHON` for tests if your Python executable has a different path.

The page works without a key and explains the required setup. A live check then returns a configuration card, never fabricated output. Use `npm test` to run the ten golden scenarios and additional boundary, statistics, redaction and failure tests. Mock transport tests are explicitly mocks, not live API validation.

## What it does

Extracts typed case facts, computes eligibility / limitation / consideration / commission / fee / checklist through Python in Otari, searches and fetches orders, computes descriptive award statistics, screens an explanation and prepares an editable NCH draft. Displays partial results when a tool fails. Known calculations stay unavailable on sandbox failure; the LLM does not replace them.

It does not file cases, submit grievances, fill government forms, predict success, guarantee an award or replace an advocate. Evidence strength is a qualitative assessment, not a probability of winning.

## Gateway setup

Read [API verification notes](docs/OTARI_API_NOTES.md) first. Use [example configuration](docs/otari-config.example.yml) as a starting point for self-hosted Otari, or configure equivalent controls in your hosted dashboard:

- A service key owned by the application user, with `nyaycheck-free` as an allowed and default end-user budget. New anonymous cookie values become end users using the request's `user` field. All calls in one case share a random conversation ID.
- A workspace or key budget cap. The application checks the key's reported remaining dollars against `ESTIMATED_RUN_USD` before admitting a run; gateway enforcement remains authoritative for each call. The estimate is not a reservation and shared spending can change concurrently.
- A vision policy and a reasoning policy, each with a backup. Use only open-weight model families and confirm every actual provider model ID from the deployment catalog. Set allowed models accordingly. The app cannot inspect private policy contents with an inference key.
- A code sandbox and a code-execution price (`otari:code_execution`); search provider credentials and pricing; web fetch enabled and priced. Missing pricing can produce `402`, missing providers/tool configuration a clean partial result.
- Optional gateway guardrails using your deployment's current schema. Configure policy-level guardrails or set `OTARI_GUARDRAILS` to a verified JSON object. Do not claim gateway guardrails until live trace evidence exists. Local promise screening is always enabled.
- For the failure demo, a dedicated policy with an invalid primary model and working open-weight backup. The checkbox selects that policy; the client never fabricates fallback flags. An unknown policy simply fails.

Keep `.env` out of version control. The supplied server binds only to loopback. Hosting this Node process needs a Node-capable host; it has not been published. The requested Node architecture differs from Sites' Worker runtime.

## Feature evidence

| Feature | Implementation | Endpoint / evidence | Verified here |
| --- | --- | --- | --- |
| Gateway-only inference | `src/otari.ts`, `extract.ts`, `verdict.ts` | `/chat/completions` | Contract + mock |
| Routing and real fallback | `otari.ts`, config example | `model` policy; `Otari-Fallback`, `Otari-Attempt-Count` | Contract + mock; live pending |
| Python execution | `rules.ts`, `award.ts`, `python/` | `/code/execute`, `stdout`, `return_code` | Python + mock integration |
| Search and fetch | `search.ts` | `/search`, `/fetch`; gateway-returned URL/text | Contract + failure tests |
| JSON validation | `types.ts`, `extract.ts` | `response_format` JSON; Zod validation and one corrective retry | Mock invalid JSON test |
| Guardrails | `guardrail.ts`, `verdict.ts` | Deterministic phrase screen, regenerate then remove sentences | Local test; gateway unverified |
| Budgets | `pipeline.ts`, `otari.ts` | `/key/budget`; `user`, `Otari-End-User-Budget`; `/end-users` | Budget exhaustion mock |
| Usage and cost | `otari.ts`, UI | `usage.cost_usd`, `/key/usage/summary` method | Mock; unknown remains unknown |
| Session grouping | `server.ts`, `otari.ts` | `Otari-Conversation-Id` per case | Code; live pending |
| Trace | `otari.ts`, UI | Request/model/provider/fallback/attempt headers; all `Otari-*` metadata | Mock; live pending |
| Streaming stages | `server.ts`, UI | POST `/api/check` → SSE | Local HTTP smoke check |
| PII screen | `redact.ts`, `extract.ts` | Text patterns redacted; raw image/PDF transmission blocked | Local tests |

The client exposes `jsonSchema`, tools, explicit user and end-user-budget options. Current stages use JSON mode plus Zod rather than claiming provider-specific strict schema support. Direct search/fetch/execute are Otari's documented tool endpoints, chosen so a model never writes legal calculation code or chooses personal search queries.

## Rules and source limitations

All thresholds live in `rules/constants.ts` with URLs and checked date. District/State/National jurisdiction is based on consideration paid, not compensation sought. The alternative comparison adds compensation only; interest is explicitly omitted because no rate or period is collected. A forum disagreement is flagged.

Limitation uses calendar-year arithmetic, including leap-day clamping. A missing or invalid date gives an unknown deadline; the expiry day is treated as in time. Cause-of-action disputes, exclusions, continuing causes, holidays and condonation require an advocate. This is an indicative baseline, not an authoritative procedural deadline.

The prompt asks to expose a ₹500 versus ₹1,000 fee conflict for the ₹20–50 lakh band. The official [2023 Gazette](https://egazette.gov.in/WriteReadData/2023/248158.pdf) says ₹1,000, while a [secondary guide](https://niyam.ai/blog/file-consumer-complaint-edaakhil) reproduces ₹500. The UI preserves the requested low-confidence range and links both; the primary official figure is ₹1,000. Other bands come from the notified fee table. Always confirm with the registry. The range is not a statement that both fees are equally authoritative.

Commercial-purpose exclusions are nuanced. The simplified baseline excludes commercial/resale and includes livelihood/self-employment. Insurance taken to indemnify business risks and other exceptions require legal review; the baseline must not decide a complex commercial case conclusively.

## Order corpus and statistics

`data/seed_orders.json` contains 25 real, source-linked order references across electronics, e-commerce, airlines, insurance and builders. All 25 were source-reviewed on 12 November 2026. Unknown amounts, formula-dependent interest and ambiguous final components remain null. Remands are coded unclear; dismissed provider appeals are distinguished from dismissed consumer claims. Seed provenance is offline review, not a gateway fetch during the current case. The sample is curated and nonrepresentative; it includes older Act cases and procedural decisions.

Live search uses category-based queries without user names, places or opposite-party names. Only gateway-fetched pages can become live verified records. Retrieved-source verification is distinct from legal/extraction accuracy; review the linked final order. Source content is treated as untrusted data. Appeal outcomes are represented as the consumer's substantive relief, rather than automatically treating a dismissed provider appeal as a dismissed consumer claim.

When fewer than three live orders are available, category-matched reviewed seed records supplement them and the result prominently flags fallback. Source duplicates are excluded. A seed may therefore contribute only one order or none. No median is shown unless both sample size and known compensation count reach three. Unknown figures remain null; penalties paid to a legal-aid account and uncomputed interest are excluded. Total award ranges require every component known. Rates use only orders with known refund amounts and expose the denominator.

## Privacy and deployment limits

No case text, uploads or results are written to disk by the app, and no request body logging is enabled. The cookie is a random HttpOnly SameSite identifier, not a personal identity. The gateway/provider may retain prompts or telemetry according to its own settings and policy. No gateway non-retention guarantee is made.

Raw images/PDFs are **not forwarded** because typed-pattern redaction cannot protect identifiers embedded in them. The drop area explains this and asks for transcribed details. Completing invoice support requires OCR, visual redaction, human confirmation and image/PDF model compatibility verification. The vision routing policy is ready, but invoice vision has not run.

Switch user is a local demo control and can create a fresh budget identity; it is not suitable abuse prevention. Before public deployment add identity binding, persistent global rate controls, edge request-size/time limits, transport security and deployment-specific privacy configuration. The existing in-memory concurrency cap only limits this process. No public deployment or upstream PR/issue was created. Browser visual QA was unavailable: the in-app browser timed out reaching loopback; local HTTP checks passed.

## Submission evidence

There is no remote project repository in this workspace, so no first-integration commit URL can be supplied yet. After publishing the source to your repository, use the actual first Otari integration commit. Do not submit feature claims based only on mock tests. No Otari repository PR or issue has been opened in this task.

Not legal advice. An advocate should review anything significant. Figures reflect past orders and are not predictions.
