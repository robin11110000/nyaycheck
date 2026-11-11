# Docs: preserve a pointer from the former docs/guardrails.md path

While integrating Otari into NyayCheck, I followed the previous inference-guardrail documentation URL, `docs/guardrails.md`, from a cached/search-indexed GitHub page. The current raw file and GitHub contents API return 404, although a cached view still describes the earlier request field.

Checked on 2026-11-11 UTC against main commit `ed09882255a1cd50bd0cf3abd1e858343301c7ea`:

- `https://raw.githubusercontent.com/mozilla-ai/otari/main/docs/guardrails.md` → HTTP 404
- `GET https://api.github.com/repos/mozilla-ai/otari/contents/docs/guardrails.md` → HTTP 404
- `docs/configure-guardrails.md` → HTTP 200
- `docs/guardrails-reference.md` → HTTP 200

The replacement reference documents a top-level **list** of guardrail entries and the `Otari-Guardrails` response header. This is a discoverability request, not a claim that guardrail support is missing or broken. I have not validated a live guardrail execution.

Would a short compatibility page at `docs/guardrails.md`, pointing to the configuration guide and reference, be appropriate? A docs-site redirect or migration note would also help developers arriving through older links distinguish a moved guide from a removed feature.

I searched existing issues for the old path and a redirect request and did not find a matching report.
