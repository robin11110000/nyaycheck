# Hosted Otari setup

Sign in at https://otari.ai/. Creating service keys requires an organization owner or admin. If those controls are missing, check your organization role before creating a regular key instead.

## Budgets and service key

1. In **Spend & budgets**, create an end-user budget. Name it `nyaycheck-free`, choose a small daily limit, and copy its actual **budget ID**. The app needs the ID, which may differ from its display name.
2. Open **API keys → Create key**. Name the key `NyayCheck`.
3. Under **Advanced**, select **Service key**. Add the budget to **End-user budgets**, then select it as the **Default end-user budget**.
4. Create the key and save it directly into your local `.env`. Keep it out of screenshots, recordings, Git and chat.
5. Apply a small spend ceiling to the key as well. An end-user budget and a key-wide ceiling serve different purposes.

Official guide: [Track spend per end user](https://github.com/mozilla-ai/otari/blob/main/docs/end-users.md).

## Models and tools

Create two routing policies in **Routing**, using available open-weight models from your deployment's catalog:

- `nyaycheck-vision`: extraction, with a working backup. Text-only demo cases do not require vision input.
- `nyaycheck-reason`: explanation and source extraction, with a working backup.

The model IDs in `otari-config.example.yml` are examples, not a guarantee of hosted availability. If a provider needs your own credential, configure it in Otari; the application never talks directly to model providers.

Confirm that Python code execution, web search and web fetch are available and priced on the deployment. Hosted users may not have deployment-operator controls. If those settings are absent, ask Otari support which tools your workspace can use; a client-side setting cannot enable a missing sandbox or search backend.

Leave gateway guardrails and the failure-demo control off for the first run. They require additional verified configuration.

## Configure NyayCheck

From the project directory:

```powershell
Copy-Item .env.example .env
notepad .env
```

Fill these values, using the actual budget ID:

```dotenv
OTARI_BASE_URL=https://api.otari.ai/api/v1
OTARI_API_KEY=your-service-key
OTARI_EXTRACT_MODEL=nyaycheck-vision
OTARI_VERDICT_MODEL=nyaycheck-reason
OTARI_END_USER_BUDGET=actual-budget-id
OTARI_GUARDRAILS=
```

EU-region keys use `https://eu.api.otari.ai/api/v1`. A key sent to the wrong region may be refused. Save the file, close the editor and run:

```powershell
npm run verify:live
```

This runs a fictional case and saves evidence without exposing the key. If it fails, keep the error text but do not share `.env`. A successful demo requires actual model response metadata, sandbox output, web-tool success and reported cost. Follow `DEMO.md` to record the browser flow afterward.
