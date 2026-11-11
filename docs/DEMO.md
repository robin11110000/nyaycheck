# Recording the demo

Use only the fictional case below. Keep the key, .env file and account credentials out of the recording.

1. Configure the service key, open-weight routing policies, sandbox, search and budgets using the README.
2. Run `npm run verify:live`. This reads the live OpenAPI document and runs a fictional case. It saves actual response metadata, sandbox stdout and reported cost in `docs/evidence/`. A nonzero exit means some required evidence is missing; do not describe that run as a successful end-to-end demo.
3. Start `npm start`, open http://localhost:3000 and begin recording the browser window.
4. Describe a personal-use phone purchase for ₹62,000, its purchase and defect dates, invoice and photos, and a written refusal from the seller. Leave out personal identifiers.
5. Submit the case. Show stage progress, eligibility and commission, fee and limitation, linked orders, and the NCH draft.
6. Expand the trace. Show actual provider/model names, request IDs, cost and the budget response. Show the synthetic evidence file's sandbox outputs. A sample or mock run is not a live demo.
7. If the dedicated failure policy is configured, enable failure simulation and rerun. Claim fallback only if the actual gateway header reports it.

Keep the recording short enough for the submission requirements. No video has been recorded yet. Gateway guardrails are excluded from feature claims until an evaluated live verdict is captured.
