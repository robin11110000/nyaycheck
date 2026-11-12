# NyayCheck

NyayCheck helps people understand the next step in an Indian consumer dispute. Describe what happened, and it checks consumer eligibility, the appropriate commission, filing fees and the usual limitation period. It also finds source-linked past orders and prepares a National Consumer Helpline grievance draft for you to review.

Python handles the legal thresholds and award statistics. Open-weight models extract facts and explain the results. Every production model call and calculation goes through Otari.

NyayCheck does not file complaints, submit government forms or predict whether you will win.

## Run locally

You need Node 20+ and an Otari service key. Python 3.10+ is needed for the local tests, but not for the running server.

```powershell
npm install
Copy-Item .env.example .env
# Add your Otari service key and routing policy names to .env.
npm run build
npm start
```

Open http://localhost:3000. Without a key, the app shows a setup message.

## Configure Otari

Use [the example configuration](docs/otari-config.example.yml) for a self-hosted gateway, or configure the equivalent settings in the hosted dashboard:

1. Create a service key with an allowed, default end-user budget. Each anonymous cookie value is billed as an end user through the request's `user` field.
2. Create two routing policies: one for extraction and one for reasoning. Give each a working backup. Check that every primary and backup model is open-weight and available on your deployment.
3. Enable a Python sandbox and set its code-execution price. Configure a search provider, enable web fetch, and set the corresponding tool prices.
4. Set a workspace or key spend cap. The app checks `/key/budget` before starting, and Otari enforces budgets on individual calls.
5. Optionally create the failure-demo policy shown in the configuration example. Its primary model is deliberately invalid; its backup must work. The UI only reports fallback when Otari's response says it happened.

Keep the key in `.env`, which Git ignores. Gateway guardrails are disabled by default and are **not included in the features claimed for this submission**. The local language screen is a separate application feature.

Follow [the hosted setup steps](docs/SETUP.md) for the dashboard sequence and `.env` values. See [API notes](docs/OTARI_API_NOTES.md) for endpoint contracts and the remaining live checks.

## Test and record a demo

```powershell
npm test
npm run format:check
npm run verify:live
```

The automated suite covers ten fixed legal-rule scenarios, boundary dates, missing amounts, award statistics, redaction, the source corpus and failure handling. It uses mocked gateway responses; passing it does not prove Otari is configured correctly.

`verify:live` uses the real gateway and a fictional phone-purchase case. It first reads the deployment's OpenAPI document, then saves actual response headers, sandbox output and reported costs under `docs/evidence/`. It exits unsuccessfully if required evidence is missing. It does not print or save the API key.

**Live status:** a real fictional case completed on Otari `0.44.0+0925283`. Model headers, both Python sandbox outputs, search results, per-user budgets and run costs were captured. Indian Kanoon returned HTTP 403 to the gateway fetcher, so that run used reviewed seed orders. The strict live check remains unsuccessful when no legal page can be fetched. No video recording has been produced. See [live results](docs/LIVE_RESULTS.md) and [the recording guide](docs/DEMO.md).

## How the application works

1. Extract the typed facts into a validated JSON object.
2. Run deterministic Python rules in Otari's sandbox.
3. Search for similar orders using category-based queries, then fetch their source pages through Otari.
4. Compute descriptive award statistics in Python.
5. Explain the evidence and draft a grievance, without allowing the model to calculate legal figures.
6. Display the result, source links, stage trace, costs and budget response.

The server streams progress over SSE. Failed stages produce partial results. If sandbox execution fails, calculated figures remain unavailable; the model does not substitute its own numbers.

## Otari integration

| Capability                | Implementation                                     | Evidence to check during the live run                                       |
| ------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| Model gateway and routing | `src/otari.ts`, `src/extract.ts`, `src/verdict.ts` | `/chat/completions`; actual model/provider headers                          |
| Provider fallback         | Routing policy and failure-demo control            | `Otari-Fallback`, `Otari-Attempt-Count`                                     |
| Python sandbox            | `src/rules.ts`, `src/award.ts`, `python/`          | `/code/execute`; successful return code and stdout                          |
| Web search and fetch      | `src/search.ts`                                    | `/search`, `/fetch`; gateway-returned source URLs and page text             |
| End-user budgets          | `src/pipeline.ts`, `src/otari.ts`                  | `user`, `Otari-End-User-Budget`, `/end-users`                               |
| Key budget checks         | `src/pipeline.ts`                                  | `/key/budget` before a case starts                                          |
| Costs and traces          | `src/otari.ts`, result panel                       | `usage.cost_usd` or `/usage/requests/{id}`, request ID and routing metadata |
| Conversation grouping     | `src/server.ts`                                    | One `Otari-Conversation-Id` for each case                                   |

These are implemented paths, not a claim that every feature has passed live verification. Missing cost values stay unknown and mark the total incomplete. The local phrase screen, JSON validation and PII pattern redaction are application code, not Otari guardrails.

## Past orders and source checks

The fallback corpus contains 25 source-linked decisions across electronics, e-commerce, airlines, insurance and builders. All links were rechecked on **11 November 2026 UTC**. The machine-readable timestamps include `Z` explicitly; the same checks occurred on 12 November in Asia/Kolkata. [Source notes](docs/SOURCE_CHECKS.md) record three summary spot checks.

Live orders must come from pages Otari actually fetched. Hosted runs use the built-in `otari_web_search` and `otari_web_fetch` declarations (`OTARI_SEARCH_MODE=builtin`); direct endpoints remain an optional route for deployments with configured direct search tools. If fewer than three are available, category-matched reviewed seed orders supplement the sample and the card identifies the fallback. Seed provenance is offline source review, not a gateway fetch in the current case.

The sample is curated and nonrepresentative. It includes older-law decisions and procedural orders. Remands and ambiguous components remain unknown. Missing awards are not treated as zero, uncomputed interest is excluded, and a compensation median requires at least three known compensation amounts. Provider appeals are interpreted by the consumer relief left in force.

## Limits to know before using it

- **Invoice uploads:** image/PDF transmission is blocked until reliable OCR and visual redaction are implemented. Enter the invoice amount and dates as text for now.
- **Legal rules:** consideration paid is the primary jurisdiction basis. A secondary comparison adds requested compensation; unspecified interest is excluded. Commercial-purpose exceptions, continuing causes, excluded time and condonation need legal review.
- **Filing fees:** the official [2023 Gazette](https://egazette.gov.in/WriteReadData/2023/248158.pdf) gives ₹1,000 for the ₹20–50 lakh band. A [secondary guide](https://niyam.ai/blog/file-consumer-complaint-edaakhil) gives ₹500. The app shows the conflict as a low-confidence range and identifies the official amount. Confirm the current fee with the registry.
- **Privacy:** typed Aadhaar/PAN patterns are redacted. The app keeps case text in memory and does not log request bodies. Otari and its providers have their own retention policies; this app cannot promise non-retention by them.
- **Deployment:** the server binds to loopback. The switch-user button is a demo control, not abuse prevention. Public hosting needs identity binding, deployment-level rate limits and transport security.

## Repository and submission

Source: https://github.com/robin11110000/nyaycheck

The first commit already contains Otari, because that is how the application was built. There is no invented pre-integration version. Development for the submission is on `hackathon`; [submission evidence](docs/SUBMISSION.md) separates implemented features from live-confirmed ones.

Not legal advice. An advocate should review anything significant. Figures reflect past orders and are not predictions.
