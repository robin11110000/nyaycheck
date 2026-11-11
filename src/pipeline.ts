import { Otari } from './otari.js';
import { extract } from './extract.js';
import { rules } from './rules.js';
import { search } from './search.js';
import { award } from './award.js';
import { verdict } from './verdict.js';
import { DISCLAIMER, type Stage } from './types.js';
export async function check(
  g: Otari,
  input: { story: string; attachments: any[]; simulateFailure: boolean },
  emit: (event: string, data: unknown) => void,
) {
  const warnings: string[] = [];
  const progress = (stage: Stage) => emit('stage', { stage });
  progress('assemble');
  const budget = await g.keyBudget();
  if (!budget.ok)
    return {
      status: 'unavailable',
      message: budget.error,
      warnings,
      trace: g.trace,
      disclaimer: DISCLAIMER,
    };
  const estimate = Number(process.env.ESTIMATED_RUN_USD ?? '0.10');
  if (!Number.isFinite(estimate) || estimate <= 0)
    return {
      status: 'unavailable',
      message: 'Invalid estimated run budget configuration.',
      disclaimer: DISCLAIMER,
    };
  if (budget.data.remaining_usd !== null && typeof budget.data.remaining_usd !== 'number')
    return {
      status: 'unavailable',
      message: 'Gateway budget response could not be verified.',
      disclaimer: DISCLAIMER,
    };
  if (budget.data.remaining_usd !== null && budget.data.remaining_usd < estimate)
    return {
      status: 'budget',
      message: 'Workspace budget cannot cover an estimated check. Try after the budget resets.',
      disclaimer: DISCLAIMER,
    };
  progress('extract');
  const f = await extract(g, input.story, input.attachments, input.simulateFailure);
  if (!f.ok)
    return {
      status: f.code === 'budget_exceeded' ? 'budget' : 'partial',
      message: f.error,
      warnings,
      trace: g.trace,
      disclaimer: DISCLAIMER,
    };
  progress('rules');
  const r = await rules(g, f.data);
  if (!r.ok) warnings.push(r.error);
  if (!r.ok && r.code === 'budget_exceeded')
    return {
      status: 'budget',
      message: r.error,
      facts: f.data,
      trace: g.trace,
      disclaimer: DISCLAIMER,
    };
  progress('search');
  const s = await search(g, f.data, r.ok ? r.data.forum?.value : undefined);
  warnings.push(...s.warnings);
  if (s.budgetExceeded)
    return {
      status: 'budget',
      message: 'You have used your free checks. Try again after the budget resets.',
      facts: f.data,
      rules: r.ok ? r.data : null,
      orders: s.orders,
      warnings,
      trace: g.trace,
      disclaimer: DISCLAIMER,
    };
  progress('award');
  const a = await award(g, s.orders, f.data.amountPaidInr);
  if (!a.ok) warnings.push(a.error);
  if (!a.ok && a.code === 'budget_exceeded')
    return {
      status: 'budget',
      message: a.error,
      facts: f.data,
      rules: r.ok ? r.data : null,
      orders: s.orders,
      warnings,
      trace: g.trace,
      disclaimer: DISCLAIMER,
    };
  progress('verdict');
  const v = await verdict(g, f.data, r.ok ? r.data : null, s.orders, a.ok ? a.data : null);
  if (!v.ok) warnings.push(v.error);
  progress('assemble');
  const user = await g.endUsers();
  return {
    status: r.ok && a.ok && v.ok ? 'complete' : 'partial',
    facts: f.data,
    rules: r.ok ? r.data : null,
    orders: s.orders,
    usedSeed: s.usedSeed,
    stats: a.ok ? a.data : null,
    verdict: v.ok ? v.data : null,
    warnings,
    trace: g.trace,
    costUsd: g.costTotal,
    costIncomplete: g.unknownCosts > 0,
    budget: user.ok ? user.data : null,
    disclaimer: DISCLAIMER,
  };
}
