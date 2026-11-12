import './env.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Otari } from './otari.js';
import { check } from './pipeline.js';

// This command uses the real fetch transport. It never imports the test mocks.
async function main() {
  if (!process.env.OTARI_API_KEY) {
    throw new Error('Set OTARI_API_KEY in .env locally, then run npm run verify:live.');
  }

  const sandbox: unknown[] = [];
  const webTools: { path: string; status: number }[] = [];
  const transport: typeof fetch = async (url, init) => {
    const response = await fetch(url, init);
    const path = new URL(String(url)).pathname;
    if (path.endsWith('/search') || path.endsWith('/fetch')) {
      webTools.push({ path, status: response.status });
    }
    if (String(url).endsWith('/code/execute')) {
      const body = await response
        .clone()
        .json()
        .catch(() => null);
      sandbox.push({
        status: response.status,
        requestId: response.headers.get('Otari-Request-ID'),
        stdout: body?.stdout ?? null,
        stderr: body?.stderr ?? null,
        returnCode: body?.return_code ?? null,
      });
    }
    return response;
  };

  const gateway = new Otari(
    process.env.OTARI_DEMO_USER || 'nyaycheck-live-demo',
    randomUUID(),
    transport,
  );
  const spec = await gateway.request('/openapi.json', undefined);
  if (!spec.ok || !spec.data?.paths) {
    throw new Error(
      'Cannot read the deployment OpenAPI specification. Check gateway URL and credentials.',
    );
  }
  const required = ['/chat/completions', '/code/execute', '/search', '/fetch', '/key/budget'];
  const missing = required.filter(
    (path) => !Object.keys(spec.data.paths).some((key) => key.endsWith(path)),
  );
  if (missing.length) {
    throw new Error(`Deployment is missing required endpoints: ${missing.join(', ')}`);
  }
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const result = await check(
    gateway,
    {
      story: `This is a fictional demo case. I bought a phone for INR 62000 for personal use on ${today}. It arrived defective today. I have an invoice, delivery confirmation and photos. I contacted the seller's grievance officer, who refused a refund in writing. I seek a refund and INR 10000 compensation. I have not contacted NCH, sent a legal notice or filed a complaint.`,
      attachments: [],
      simulateFailure: process.argv.includes('--simulate-failure'),
    },
    (event, data) => {
      if (event === 'stage') console.log(`Stage: ${(data as { stage: string }).stage}`);
    },
  );

  const evidence = {
    verifiedAt: new Date().toISOString(),
    mode: 'live',
    syntheticCase: true,
    openapiVersion: spec.data.info?.version ?? null,
    endpointChecks: required,
    result,
    sandbox,
    webTools,
    builtInToolCalls: gateway.toolCalls,
    checks: {
      completeCase: result.status === 'complete',
      requestHeadersPresent: gateway.trace.some(
        (event) => event.requestId && event.model && event.provider,
      ),
      sandboxCompleted: sandbox.length >= 2 && sandbox.every((item: any) => item.returnCode === 0),
      costReported: gateway.trace.some((event) => event.costUsd !== null),
      searchSucceeded:
        webTools.some((tool) => tool.path.endsWith('/search') && tool.status === 200) ||
        gateway.toolCalls.some((tool) => tool.type === 'web_search' && tool.status === 'completed'),
      fetchSucceeded:
        webTools.some((tool) => tool.path.endsWith('/fetch') && tool.status === 200) ||
        gateway.toolCalls.some((tool) => tool.type === 'web_fetch' && tool.status === 'completed'),
      fallbackReported: gateway.trace.some((event) => event.fallback === true),
      gatewayGuardrails: 'Not claimed; requires an evaluated verdict from a configured profile.',
    },
  };
  await mkdir('docs/evidence', { recursive: true });
  const path = `docs/evidence/live-${Date.now()}.json`;
  await writeFile(path, JSON.stringify(evidence, null, 2) + '\n');
  console.log(`Saved synthetic-case evidence: ${path}`);
  console.log(JSON.stringify(evidence.checks, null, 2));
  if (
    !evidence.checks.completeCase ||
    !evidence.checks.requestHeadersPresent ||
    !evidence.checks.sandboxCompleted ||
    !evidence.checks.costReported ||
    !evidence.checks.searchSucceeded ||
    !evidence.checks.fetchSucceeded
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
