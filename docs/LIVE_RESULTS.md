# Live Otari results

Latest India-focused case: `live-1794441824508.json`  
Verified at: `2026-11-12T00:03:44.507Z`  
Deployment: `0.44.0+0925283`

| Check                   | Observed result                                                            |
| ----------------------- | -------------------------------------------------------------------------- |
| Fictional case          | Completed; typed facts, rules, award statistics and explanation returned   |
| Extraction              | Qwen2.5-VL-72B-Instruct on OVHcloud, real request ID                       |
| Explanation             | Meta-Llama-3_3-70B-Instruct on OVHcloud, real request ID                   |
| Sandbox                 | Two executions, both return code zero, stdout saved                        |
| Search                  | Built-in web searches completed with gateway-returned Indian source URLs   |
| Legal-source fetch      | Indian Kanoon returned HTTP 403; no inaccessible page accepted as verified |
| Past orders             | Reviewed category-matched seed fallback shown explicitly                   |
| Run cost                | $0.071381 from actual inline cost and request-ledger reconciliation        |
| Cost completeness       | True                                                                       |
| End-user budget         | Real attribution and spend recorded; remaining budget reported             |
| Forced routing fallback | Not verified; configured backups alone are not proof                       |
| Gateway guardrails      | Disabled and excluded from feature claims                                  |
| Video                   | Not recorded                                                               |

The strict verification command exits unsuccessfully if all legal-page fetches fail, even when the case remains usable through seed fallback. This distinction is intentional. See the JSON evidence for failed calls as well as successful ones; no mock transport was used.

Earlier attempts are preserved as troubleshooting evidence. The first two did not complete web search/fetch; an intermediate run fetched irrelevant foreign pages and correctly excluded them. Do not use those pages as consumer-order citations.

## Browser check

A second fictional manufacturer/warranty case was run through the browser. The result card displayed eligibility, District commission, nil fee, Python limitation output, reviewed seed orders, award statistics and a grievance draft. Real Qwen and Llama headers and sandbox costs appeared in the expanded trace. That browser run hit the earlier ninety-second search timeout, so its displayed total was explicitly marked incomplete and outstanding spend remained reserved. The request timeout is now bounded at three minutes, and interrupted stages retain visible unsettled trace entries. No claim is made that this browser run retrieved live Indian orders.
