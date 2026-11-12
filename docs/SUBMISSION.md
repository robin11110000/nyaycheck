# Submission evidence

Repository: https://github.com/robin11110000/nyaycheck

Hackathon branch: https://github.com/robin11110000/nyaycheck/tree/hackathon

First commit containing the Otari integration:
https://github.com/robin11110000/nyaycheck/commit/570dfe000cab20c4c7e712f4471fef75e46538bf

The app was built with Otari from the start. That first commit includes the gateway client and pipeline. There is no separate pre-integration app commit.

## Feature claims

Real case evidence is available in `LIVE_RESULTS.md` and `evidence/`. Confirmed features: gateway calls to open-weight models, Python code execution, built-in web search, per-user and key budgets, conversation attribution, request metadata and cost accounting. Indian legal-page fetching is blocked upstream and the reviewed seed fallback is used.

Routing policies and backups are configured, but forced fallback has not been demonstrated. Built-in fetch executed successfully on other public pages; Indian Kanoon fetches returned HTTP 403. Do not describe the final case as using live-retrieved Indian orders.

Gateway guardrails are excluded from feature claims. Local phrase screening is application code.

## PRs and issues

The report is prepared in `OTARI_FEEDBACK.md`, but has **not been posted**: the GitHub connector returned HTTP 403 and no noninteractive Git credential was available. No upstream PR has been opened.

[Open the prepared issue on GitHub](https://github.com/mozilla-ai/otari/issues/new?title=Docs%3A+preserve+a+pointer+from+the+former+docs%2Fguardrails.md+path&body=While+integrating+Otari+into+NyayCheck%2C+I+followed+the+previous+inference-guardrail+documentation+URL%2C+%60docs%2Fguardrails.md%60%2C+from+a+cached%2Fsearch-indexed+GitHub+page.+The+current+raw+file+and+GitHub+contents+API+return+404%2C+although+a+cached+view+still+describes+the+earlier+request+field.%0A%0AChecked+on+2026-11-11+UTC+against+main+commit+%60ed09882255a1cd50bd0cf3abd1e858343301c7ea%60%3A%0A%0A-+%60https%3A%2F%2Fraw.githubusercontent.com%2Fmozilla-ai%2Fotari%2Fmain%2Fdocs%2Fguardrails.md%60+%E2%86%92+HTTP+404%0A-+%60GET+https%3A%2F%2Fapi.github.com%2Frepos%2Fmozilla-ai%2Fotari%2Fcontents%2Fdocs%2Fguardrails.md%60+%E2%86%92+HTTP+404%0A-+%60docs%2Fconfigure-guardrails.md%60+%E2%86%92+HTTP+200%0A-+%60docs%2Fguardrails-reference.md%60+%E2%86%92+HTTP+200%0A%0AThe+replacement+reference+documents+a+top-level+%2A%2Alist%2A%2A+of+guardrail+entries+and+the+%60Otari-Guardrails%60+response+header.+This+is+a+discoverability+request%2C+not+a+claim+that+guardrail+support+is+missing+or+broken.+I+have+not+validated+a+live+guardrail+execution.%0A%0AWould+a+short+compatibility+page+at+%60docs%2Fguardrails.md%60%2C+pointing+to+the+configuration+guide+and+reference%2C+be+appropriate%3F+A+docs-site+redirect+or+migration+note+would+also+help+developers+arriving+through+older+links+distinguish+a+moved+guide+from+a+removed+feature.%0A%0AI+searched+existing+issues+for+the+old+path+and+a+redirect+request+and+did+not+find+a+matching+report.)

## Video

No live demo video has been recorded. Use `DEMO.md` using the observed live behavior and clearly showing seed fallback, and show real trace metadata and sandbox output.
