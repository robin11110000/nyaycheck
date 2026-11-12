import type { Result, Stage, TraceEvent } from './types.js';
import { redact } from './redact.js';
import { z } from 'zod';

const GuardrailsSchema = z.array(
  z
    .object({
      profile: z.string().min(1),
      mode: z.enum(['monitor', 'block']).optional(),
      on_unavailable: z.enum(['monitor', 'block']).optional(),
      on: z.array(z.enum(['input', 'tool_results', 'tool_calls', 'output'])).optional(),
    })
    .passthrough(),
);
type Options = {
  model: string;
  messages: unknown[];
  tools?: unknown[];
  user?: string;
  conversationId?: string;
  endUserBudget?: string;
  jsonSchema?: unknown;
  simulateFailure?: boolean;
  stage?: Stage;
};
export class Otari {
  readonly trace: TraceEvent[] = [];
  readonly toolCalls: any[] = [];
  costTotal = 0;
  unknownCosts = 0;
  constructor(
    readonly user: string,
    readonly conversationId: string,
    private transport: typeof fetch = fetch,
  ) {}
  async request<T = any>(
    path: string,
    body: unknown,
    stage: Stage = 'assemble',
    extra: Record<string, string> = {},
  ): Promise<Result<T>> {
    if (!process.env.OTARI_API_KEY)
      return {
        ok: false,
        error: 'Otari API key is not configured. Add it to .env to run a live check.',
        stage,
        code: 'not_configured',
      };
    const base = (process.env.OTARI_BASE_URL || 'https://api.otari.ai/api/v1').replace(/\/$/, '');
    if (!/^https:\/\//.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(base))
      return { ok: false, error: 'Use HTTPS for the gateway.', stage };
    for (let i = 0; i < 2; i++) {
      const start = Date.now();
      try {
        const response = await this.transport(base + path, {
          method: body === undefined ? 'GET' : 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OTARI_API_KEY}`,
            'Content-Type': 'application/json',
            'Otari-Conversation-Id': this.conversationId,
            ...(process.env.OTARI_END_USER_BUDGET
              ? { 'Otari-End-User-Budget': process.env.OTARI_END_USER_BUDGET }
              : {}),
            ...extra,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          // A bounded gateway search/fetch loop can include several model turns.
          signal: AbortSignal.timeout(180000),
        });
        const data = await response.json().catch(() => null);
        const h = response.headers;
        const raw = h.get('Otari-Cost-USD') ?? data?.usage?.cost_usd;
        let cost =
          raw !== null && raw !== undefined && Number.isFinite(Number(raw)) ? Number(raw) : null;
        const requestId = h.get('Otari-Request-ID');
        // Direct sandbox/search/fetch responses may omit inline usage. Reconcile
        // against the gateway's settled ledger instead of undercounting the run.
        if (cost === null && body !== undefined && requestId) {
          try {
            const usageResponse = await this.transport(
              `${base}/usage/requests/${encodeURIComponent(requestId)}`,
              {
                headers: { Authorization: `Bearer ${process.env.OTARI_API_KEY}` },
                signal: AbortSignal.timeout(15000),
              },
            );
            const usage = await usageResponse.json();
            if (
              usageResponse.ok &&
              usage.cost_usd !== undefined &&
              usage.cost_usd !== null &&
              Number.isFinite(Number(usage.cost_usd))
            ) {
              cost = Number(usage.cost_usd);
            }
          } catch {
            // Preserve null when settlement cannot be read; never assume zero.
          }
        }
        if (Array.isArray(data?.otari_tool_calls)) {
          this.toolCalls.push(
            ...data.otari_tool_calls.map((call: any) => ({
              stage,
              type: call.type,
              status: call.status,
              url: call.url,
              query: call.query,
              sources: call.sources,
              error: call.error,
            })),
          );
        }
        const headers = Object.fromEntries(
          [...h.entries()].filter(([k]) => k.startsWith('otari-') || k === 'server-timing'),
        );
        this.trace.push({
          stage,
          model: h.get('Otari-Model'),
          provider: h.get('Otari-Provider'),
          fallback: h.has('Otari-Fallback') ? h.get('Otari-Fallback') === 'true' : null,
          attempts: h.has('Otari-Attempt-Count') ? Number(h.get('Otari-Attempt-Count')) : null,
          requestId,
          guardrails: h.get('Otari-Guardrails'),
          costUsd: cost,
          ms: Date.now() - start,
          status: response.status,
          headers,
        });
        if (cost === null && body !== undefined) this.unknownCosts++;
        else this.costTotal += cost ?? 0;
        if (response.ok) return { ok: true, data: data as T };
        const code = h.get('Otari-Error-Code') ?? data?.code;
        if (i === 0 && (response.status === 429 || response.status >= 500)) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        return {
          ok: false,
          error:
            code === 'budget_exceeded'
              ? 'You have used your free checks. Try again after your budget resets.'
              : `Otari request failed (${response.status}${code ? `, ${code}` : ''}).`,
          stage,
          code,
        };
      } catch {
        // A network interruption can have incurred cost. Do not assume it was free or replay execution.
        this.trace.push({
          stage,
          model: null,
          provider: null,
          fallback: null,
          attempts: null,
          requestId: null,
          guardrails: null,
          costUsd: null,
          ms: Date.now() - start,
          status: 0,
          headers: {},
        });
        this.unknownCosts++;
        return {
          ok: false,
          error:
            'Otari could not be reached or timed out. This stage is unavailable; cost may be unsettled.',
          stage,
        };
      }
    }
    return { ok: false, error: 'Otari retry failed.', stage };
  }
  chat(o: Options): Promise<Result<any>> {
    const model = o.simulateFailure
      ? process.env.OTARI_FAILURE_MODEL || 'nyaycheck-failure-demo'
      : o.model;
    let guardrails: unknown;
    try {
      guardrails = process.env.OTARI_GUARDRAILS
        ? GuardrailsSchema.parse(JSON.parse(process.env.OTARI_GUARDRAILS))
        : undefined;
    } catch {
      return Promise.resolve({
        ok: false as const,
        error: 'OTARI_GUARDRAILS must be a JSON list of guardrail profiles.',
        stage: o.stage ?? ('verdict' as Stage),
      });
    }
    const messages = JSON.parse(
      JSON.stringify(o.messages, (_key, value) =>
        typeof value === 'string' ? redact(value) : value,
      ),
    );
    return this.request(
      '/chat/completions',
      {
        model,
        messages,
        tools: o.tools,
        user: o.user ?? this.user,
        max_tokens: 4096,
        temperature: 0,
        ...(o.tools?.length
          ? {}
          : {
              response_format: o.jsonSchema
                ? {
                    type: 'json_schema',
                    json_schema: { name: 'result', strict: true, schema: o.jsonSchema },
                  }
                : { type: 'json_object' },
            }),
        ...(guardrails ? { guardrails } : {}),
      },
      o.stage ?? 'extract',
      o.endUserBudget ? { 'Otari-End-User-Budget': o.endUserBudget } : {},
    );
  }
  execute(o: { code: string; language?: string; timeoutMs?: number; stage?: Stage }) {
    if (o.language && o.language !== 'python')
      return Promise.resolve({
        ok: false as const,
        error: 'Only Python execution is supported.',
        stage: o.stage ?? ('rules' as Stage),
      });
    return this.request(
      '/code/execute',
      { code: o.code, timeout_seconds: Math.ceil((o.timeoutMs ?? 30000) / 1000), user: this.user },
      o.stage ?? 'rules',
    );
  }
  keyBudget() {
    return this.request('/key/budget', undefined);
  }
  usageSummary() {
    return this.request('/key/usage/summary', undefined);
  }
  endUsers() {
    return this.request('/end-users?external_id=' + encodeURIComponent(this.user), undefined);
  }
  endUserBudgets() {
    return this.request('/end-user-budgets', undefined);
  }
}
export function content(data: any): string {
  const s = data?.choices?.[0]?.message?.content;
  if (typeof s !== 'string') throw new Error('No text result');
  return s.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
}
