# Otari API notes — 11 November 2026 UTC

Live verification now includes real model completions, Python sandbox execution, built-in search, budget attribution and ledger-reconciled costs on deployment `0.44.0+0925283`. The final India-focused run used seed fallback because source fetches returned HTTP 403. No successful forced routing fallback or gateway guardrail evaluation is claimed. Documentation checks use UTC timestamps; the corresponding local date is 12 November in Asia/Kolkata. The deployment OpenAPI document takes precedence over repository examples. Run `npm run verify:live` to collect actual response metadata and sandbox outputs.

## Confirmed in documentation

| Contract                                                                                                                                         | Source                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Hosted OpenAI-style base includes `/api/v1`; Bearer key authentication                                                                           | [API reference](https://github.com/mozilla-ai/otari/blob/main/docs/api-reference.md)                        |
| POST `/chat/completions`, `/messages`, `/responses` under that base                                                                              | API reference, inference section                                                                            |
| POST `/code/execute`: `code`, `timeout_seconds`, optional `container`, `file_ids`, `user`; Python only; output `stdout`, `stderr`, `return_code` | API reference, code execution section; [tools](https://github.com/mozilla-ai/otari/blob/main/docs/tools.md) |
| POST `/search`: `query`, `max_results`, `user`; `results` hold source URLs                                                                       | API reference, search section                                                                               |
| POST `/fetch`: `url`, `max_chars`, `user`; returns `text`, `url`, `final_url`                                                                    | API reference, fetch section                                                                                |
| Model-loop tool types `otari_code_execution`, `otari_web_search`, `otari_web_fetch`; Chat exposes `otari_tool_calls`                             | Tools and API reference. This app uses direct search/fetch/execute to keep code and queries deterministic.  |
| Response headers `Otari-Request-ID`, `Otari-Model`, `Otari-Provider`, `Otari-Attempt-Count`, `Otari-Fallback`, timing headers                    | API reference and [routing](https://github.com/mozilla-ai/otari/blob/main/docs/routing.md)                  |
| Inline cost `usage.cost_usd` is a USD string, absent on unpriced results                                                                         | API reference. Unknown cost stays null and marks the total incomplete; it is not zero.                      |
| GET `/key/budget`, `/key/usage/summary` are API-key-scoped reads                                                                                 | API reference. Budget response has `remaining_usd`; null means no finite overall dollar cap.                |
| Service keys attribute requests using `user`; `Otari-End-User-Budget` chooses allowed budget for a new end user                                  | [End users](https://github.com/mozilla-ai/otari/blob/main/docs/end-users.md)                                |
| GET `/end-users?external_id=...` is a list, GET `/end-user-budgets` lists allowed templates                                                      | End users. App exposes the raw response instead of guessing remaining-balance field names.                  |
| Routing policy name is sent literally as `model`; backups live in policy configuration, not a fabricated client parameter                        | Routing                                                                                                     |
| `Otari-Conversation-Id` is the conversation routing context                                                                                      | Routing                                                                                                     |

## Verification gaps / disagreements

- The prompt mentions `${OTARI_BASE_URL}/openapi.json` as well as `/api/v1/openapi.json`. With this project's base already ending in `/api/v1`, the former resolves to the latter. The credentialed live-spec check succeeded; 332 routes were returned by deployment `0.44.0+0925283`.
- The former `docs/guardrails.md` path returns 404 on current main. Its replacements are [configure-guardrails.md](https://github.com/mozilla-ai/otari/blob/main/docs/configure-guardrails.md) and [guardrails-reference.md](https://github.com/mozilla-ai/otari/blob/main/docs/guardrails-reference.md), checked against main commit `ed09882255a1cd50bd0cf3abd1e858343301c7ea`. The reference documents a top-level **list** of entries with `profile`, `mode`, `on_unavailable` and optional `on`, and the `Otari-Guardrails` response header. This confirms the documentation contract, not a live evaluation. Gateway guardrails remain disabled by default and excluded from submitted feature claims.
- PDF/image understanding differs by provider and model; raw uploads are blocked pending reliable OCR redaction. Text extraction uses the configured open-weight vision policy with text input only.
- The live model catalog was read. Workspace policies now select `ovhcloud:Qwen2.5-VL-72B-Instruct` and `ovhcloud:Meta-Llama-3_3-70B-Instruct`, each with the other as backup. Real completion headers confirmed these model/provider names. Forced fallback remains unverified.
- Selecting an invalid standalone model does not create a fallback. The failure control uses a dedicated policy whose primary is deliberately invalid and whose fallback is real. Actual fallback is displayed only if Otari reports it.
- The server never substitutes local Python for an unavailable sandbox. Python subprocesses are used only by tests.
- Retrieved URLs establish provenance, not correctness of a model's extraction. Amount extraction needs human review against the linked final order before relying on it; lower-court quotations and appeal dispositions can be confused.

## Live acceptance checklist

1. Configure a service key, both working routing policies, the failure-demo policy and an end-user budget. Set provider access and key allowed models to open-weight targets only.
2. Configure sandbox, search and fetch, each with explicit pricing; set workspace/key caps.
3. Fetch `<base>/openapi.json` with that key. Compare schemas above. Document deployment/version and differences here without saving the key.
4. Run a text-only case. Inspect real request IDs, provider/model headers, sandbox outputs, retrieved URLs, costs and end-user counters.
5. Enable failure simulation; confirm gateway fallback header and attempt count. Switch demo user to inspect isolated end-user counters. This control is for local demos, not abuse prevention.
6. Exhaust a test budget and inspect the refusal card. Disable a tool to inspect partial results. Validate guardrails with the deployment's current schema.

## Live deployment differences

- Live OpenAPI version: `0.44.0+0925283`; latest case evidence timestamp: `2026-11-12T00:03:44.507Z`.
- `/search` returned 400 because this hosted deployment has no configured _direct_ search instances. Its legacy built-in Tavily search does work during chat completions. The app supports that route and validates returned URLs against completed search and fetch tool calls.
- This deployment rejects `max_uses` on an `otari_web_fetch` declaration: the declaration may contain only `type`. Search accepts `max_uses`; fetch is bounded by the workspace's shared attempted-call ceiling. The prompt also asks the model not to repeat fetched URLs.
- Tool-enabled model calls omit `response_format`; their final JSON is still validated locally. Fetch failures remain visible in tool metadata.
- Direct sandbox responses omit inline cost. `/usage/requests/{request_id}` returns settled `cost_usd`; the client now reconciles it before accumulating the total. The latest run cost matches the synthetic end user's spend.
- Real per-user fields are `spend`, `reserved`, `budget_id`. `/end-user-budgets` supplies `max_budget`. Remaining budget is calculated only when all required fields are reported.
- All India-focused Indian Kanoon fetch attempts in the latest run were refused upstream with HTTP 403. Failed pages are excluded; source access is not bypassed. Earlier fetches of other public pages succeeded, but were not Indian commission decisions and contributed no award figures.
