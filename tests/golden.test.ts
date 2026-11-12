import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { constants } from '../rules/constants.js';
import { Otari } from '../src/otari.js';
import { check } from '../src/pipeline.js';
import { search } from '../src/search.js';
import { FactsSchema, OrderSchema } from '../src/types.js';
import { redact } from '../src/redact.js';
import { screen, clean } from '../src/guardrail.js';
const facts = FactsSchema.parse({
  purchaseType: 'goods',
  purpose: 'personal',
  amountPaidInr: 62000,
  compensationSoughtInr: 10000,
  purchaseDate: '2026-01-01',
  causeOfActionDate: '2026-01-02',
  oppositeParty: { name: null, type: 'manufacturer' },
  category: 'phone',
  complainantCity: null,
  evidenceMentioned: ['invoice'],
  alreadyEscalated: { grievanceOfficer: false, nch: false, legalNotice: false },
  summary: 'Phone stopped working.',
});
function py(file: string, input: unknown) {
  const p = spawnSync(process.env.PYTHON || 'python', ['python/' + file], {
    input: JSON.stringify(input),
    encoding: 'utf8',
  });
  assert.equal(p.status, 0, p.stderr);
  return JSON.parse(p.stdout);
}
const scenarios: [string, Partial<typeof facts>, boolean, string | null, number | null][] = [
  ['phone', {}, true, 'District', 0],
  ['car', { amountPaidInr: 5500000 }, true, 'State', 2000],
  ['commercial', { purpose: 'commercial' }, false, 'District', 0],
  ['expired', { causeOfActionDate: '2020-01-01' }, true, 'District', 0],
  ['builder', { amountPaidInr: 30000000 }, true, 'National', 3000],
  ['null amount', { amountPaidInr: null }, true, null, null],
  ['exactly fifty lakh', { amountPaidInr: 5000000 }, true, 'District', 500],
  ['two years minus one day', { causeOfActionDate: '2024-11-13' }, true, 'District', 0],
  ['livelihood', { purpose: 'self_employment' }, true, 'District', 0],
  ['resale', { purpose: 'resale', amountPaidInr: 1000000 }, false, 'District', 200],
];
for (const [name, override, eligible, forum, fee] of scenarios)
  test('golden: ' + name, () => {
    const out = py('rules.py', {
      facts: { ...facts, ...override },
      constants,
      today: '2026-11-12',
    });
    assert.equal(out.eligibility.value, eligible);
    assert.equal(out.forum.value, forum);
    assert.equal(out.fee.value?.min ?? null, fee);
    if (name === 'expired') assert.equal(out.limitation.value.expired, true);
    if (name === 'two years minus one day') assert.equal(out.limitation.value.daysRemaining, 1);
  });
test('calendar leap day, missing dates and forum disagreement', () => {
  let r = py('rules.py', {
    facts: {
      ...facts,
      causeOfActionDate: '2024-02-29',
      amountPaidInr: 5000000,
      compensationSoughtInr: 1,
    },
    constants,
    today: '2026-02-28',
  });
  assert.equal(r.limitation.value.deadline, '2026-02-28');
  assert.equal(r.limitation.value.expired, false);
  assert.equal(r.forumConflict.value, true);
  r = py('rules.py', { facts: { ...facts, causeOfActionDate: null }, constants });
  assert.equal(r.limitation.value.deadline, null);
});
test('award statistics exclude unverified and missing figures', () => {
  const order = {
    verified: true,
    outcome: 'partly_allowed',
    refund: 100,
    compensation: 200,
    costs: 50,
  };
  let r = py('award.py', {
    orders: [order, { ...order, verified: false, compensation: 999999 }],
    claim: 100,
  });
  assert.equal(r.n, 1);
  assert.equal(r.compensationMedian, null);
  r = py('award.py', {
    orders: [order, { ...order, compensation: 300 }, { ...order, compensation: 400 }],
    claim: 100,
  });
  assert.equal(r.compensationMedian, 300);
  assert.deepEqual(r.totalAwardRange, [350, 550]);
});
test('PII redaction and promise screening', () => {
  assert.equal(redact('1234 5678 9012 ABCDE1234F'), '[AADHAAR REDACTED] [PAN REDACTED]');
  assert.equal(screen('You will win.'), false);
  assert.equal(clean('You will win. Review your evidence.'), 'Review your evidence.');
});
test('reviewed fallback corpus has unique source URLs and valid monetary fields', () => {
  const rows = JSON.parse(readFileSync('data/seed_orders.json', 'utf8'));
  assert.equal(rows.length, 25);
  assert.equal(new Set(rows.map((o: any) => o.url)).size, 25);
  for (const row of rows) {
    OrderSchema.parse(row);
    assert.equal(row.reviewed, true);
    assert.equal(row.verified, true);
  }
  assert.equal(new Set(rows.map((o: any) => o.category)).size, 5);
});
function mock(mode: string) {
  let calls = 0;
  const transport: typeof fetch = async (url, init) => {
    const path = String(url);
    let body: any = {};
    try {
      body = JSON.parse(String(init?.body ?? '{}'));
    } catch {}
    const headers = {
      'Otari-Request-ID': 'real-mock-id',
      'Otari-Provider': 'mock-provider',
      'Otari-Model': 'qwen-test',
      'Otari-Fallback': 'false',
      'Otari-Attempt-Count': '1',
    };
    let data: any = { usage: { cost_usd: '0.001' } };
    let status = 200;
    if (path.endsWith('/key/budget')) data = { remaining_usd: mode === 'budget' ? 0 : 1 };
    else if (path.includes('/end-users')) data = [];
    else if (path.endsWith('/search')) {
      status = 503;
      data = {};
    } else if (path.endsWith('/code/execute')) {
      if (mode === 'code') {
        status = 400;
      } else {
        const p = spawnSync(process.env.PYTHON || 'python', ['-c', body.code], {
          encoding: 'utf8',
        });
        data = {
          return_code: p.status,
          stdout: p.stdout,
          stderr: p.stderr,
          usage: { cost_usd: '0.001' },
        };
      }
    } else if (path.endsWith('/chat/completions')) {
      calls++;
      const isExtract = body.messages[0].content.startsWith('Extract facts');
      data = {
        choices: [
          {
            message: {
              content:
                mode === 'bad-json' && isExtract
                  ? 'not JSON'
                  : JSON.stringify(
                      isExtract
                        ? facts
                        : {
                            strength: 'moderate',
                            helps: ['Invoice available'],
                            hurts: ['Defect needs evidence'],
                            nextStep: 'grievance_officer',
                            nextStepReason: 'Ask for a written response.',
                            nchDraft:
                              'I request a review of my purchase and the remedy sought. [amount] [date]',
                            caveats: ['An advocate should review this.'],
                          },
                    ),
            },
          },
        ],
        usage: { cost_usd: '0.001' },
      };
    }
    return new Response(JSON.stringify(data), { status, headers });
  };
  return {
    transport,
    get calls() {
      return calls;
    },
  };
}
for (const mode of ['search', 'code', 'bad-json', 'budget'])
  test('failure degrades: ' + mode, async () => {
    process.env.OTARI_API_KEY = 'test-key';
    const m = mock(mode);
    const g = new Otari('anonymous', 'session', m.transport);
    const r: any = await check(
      g,
      { story: 'My personal phone stopped working.', attachments: [], simulateFailure: false },
      () => {},
    );
    assert.ok(r.disclaimer);
    if (mode === 'budget') {
      assert.equal(r.status, 'budget');
      assert.equal(m.calls, 0);
    } else if (mode === 'bad-json') {
      assert.equal(r.status, 'partial');
      assert.equal(m.calls, 2);
    } else if (mode === 'code') {
      assert.equal(r.rules, null);
      assert.equal(r.stats, null);
      assert.ok(r.verdict);
    } else {
      assert.equal(r.usedSeed, true);
      assert.ok(r.stats);
      assert.ok(r.warnings.length);
    }
  });
test('401 never retries, 429 retries once; missing cost remains unknown', async () => {
  process.env.OTARI_API_KEY = 'test';
  for (const status of [401, 429]) {
    let n = 0;
    const g = new Otari('u', 'c', async () => {
      n++;
      return new Response('{}', { status });
    });
    const r = await g.chat({ model: 'qwen', messages: [] });
    assert.equal(r.ok, false);
    assert.equal(n, status === 401 ? 1 : 2);
    assert.equal(g.trace[0].costUsd, null);
  }
});

test('gateway guardrail configuration must be a list and is off by default', async () => {
  const previous = process.env.OTARI_GUARDRAILS;
  process.env.OTARI_API_KEY = 'test';
  let calls = 0;
  const bodies: any[] = [];
  const gateway = new Otari('u', 'c', async (_url, init) => {
    calls++;
    bodies.push(JSON.parse(String(init?.body)));
    return new Response('{}', { status: 200 });
  });
  try {
    delete process.env.OTARI_GUARDRAILS;
    await gateway.chat({ model: 'qwen', messages: [] });
    assert.equal('guardrails' in bodies[0], false);
    process.env.OTARI_GUARDRAILS = '{"profile":"prompt-injection"}';
    const invalid = await gateway.chat({ model: 'qwen', messages: [] });
    assert.equal(invalid.ok, false);
    assert.equal(calls, 1);
    process.env.OTARI_GUARDRAILS = '[{"profile":"prompt-injection","mode":"monitor"}]';
    await gateway.chat({ model: 'qwen', messages: [] });
    assert.deepEqual(bodies[1].guardrails, [{ profile: 'prompt-injection', mode: 'monitor' }]);
  } finally {
    if (previous === undefined) delete process.env.OTARI_GUARDRAILS;
    else process.env.OTARI_GUARDRAILS = previous;
  }
});

test('direct sandbox costs are reconciled from the request ledger', async () => {
  process.env.OTARI_API_KEY = 'test';
  const gateway = new Otari('u', 'c', async (url) =>
    String(url).includes('/usage/requests/')
      ? new Response(JSON.stringify({ cost_usd: '0.010000' }))
      : new Response(JSON.stringify({ return_code: 0, stdout: '{}' }), {
          headers: { 'Otari-Request-ID': 'sandbox-id' },
        }),
  );
  await gateway.execute({ code: 'print(1)' });
  assert.equal(gateway.costTotal, 0.01);
  assert.equal(gateway.unknownCosts, 0);
  assert.equal(gateway.trace[0].costUsd, 0.01);
});

test('network interruptions remain visible as unsettled stage traces', async () => {
  process.env.OTARI_API_KEY = 'test';
  const gateway = new Otari('u', 'c', async () => {
    throw new Error('network');
  });
  const result = await gateway.chat({ model: 'qwen', messages: [], stage: 'search' });
  assert.equal(result.ok, false);
  assert.equal(gateway.trace[0].stage, 'search');
  assert.equal(gateway.trace[0].status, 0);
  assert.equal(gateway.trace[0].costUsd, null);
  assert.equal(gateway.unknownCosts, 1);
});

test('built-in search accepts only orders both retrieved and fetched by the gateway', async () => {
  process.env.OTARI_API_KEY = 'test';
  const validUrl = 'https://example.com/consumer-order';
  const order = {
    url: validUrl,
    commission: 'District',
    caseNumber: 'CC/1/2020',
    date: '2020-01-01',
    category: 'manufacturer',
    summary: 'Defect dispute',
    outcome: 'partly_allowed',
    refund: 100,
    compensation: 50,
    costs: 10,
    verified: false,
  };
  const gateway = new Otari('u', 'c', async (url, init) => {
    if (String(url).endsWith('/search')) return new Response('{}', { status: 400 });
    const body = JSON.parse(String(init?.body));
    assert.equal('response_format' in body, false);
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                orders: [order, { ...order, url: 'https://example.com/invented' }],
              }),
            },
          },
        ],
        usage: { cost_usd: '0.01' },
        otari_tool_calls: [
          { type: 'web_search', status: 'completed', sources: [{ url: validUrl }] },
          { type: 'web_fetch', status: 'completed', url: validUrl },
        ],
      }),
    );
  });
  const result = await search(gateway, facts);
  assert.ok(result.orders.some((item) => item.url === validUrl));
  assert.equal(
    result.orders.some((item) => item.url.includes('/invented')),
    false,
  );
});
