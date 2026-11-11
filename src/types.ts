import { z } from 'zod';
export const FactsSchema = z.object({
  purchaseType: z.enum(['goods', 'services']),
  purpose: z.enum(['personal', 'resale', 'commercial', 'self_employment']),
  amountPaidInr: z.number().finite().nonnegative().nullable(),
  compensationSoughtInr: z.number().finite().nonnegative().nullable(),
  purchaseDate: z.string().nullable(),
  causeOfActionDate: z.string().nullable(),
  oppositeParty: z.object({
    name: z.string().nullable(),
    type: z.enum([
      'ecommerce',
      'manufacturer',
      'airline',
      'bank',
      'insurer',
      'builder',
      'telecom',
      'other',
    ]),
  }),
  category: z.string(),
  complainantCity: z.string().nullable(),
  evidenceMentioned: z.array(z.string()),
  alreadyEscalated: z.object({
    grievanceOfficer: z.boolean(),
    nch: z.boolean(),
    legalNotice: z.boolean(),
  }),
  summary: z.string(),
});
export type Facts = z.infer<typeof FactsSchema>;
export const VerdictSchema = z.object({
  strength: z.enum(['strong', 'moderate', 'weak', 'likely_ineligible']),
  helps: z.array(z.string()),
  hurts: z.array(z.string()),
  nextStep: z.enum(['grievance_officer', 'nch', 'legal_notice', 'file_commission']),
  nextStepReason: z.string(),
  nchDraft: z.string(),
  caveats: z.array(z.string()),
});
export type Stage = 'extract' | 'rules' | 'search' | 'award' | 'verdict' | 'assemble';
export type TraceEvent = {
  stage: Stage;
  model: string | null;
  provider: string | null;
  fallback: boolean | null;
  attempts: number | null;
  requestId: string | null;
  guardrails: string | null;
  costUsd: number | null;
  ms: number;
  status: number;
  headers: Record<string, string>;
};
export type Result<T> =
  { ok: true; data: T } | { ok: false; error: string; stage: Stage; code?: string };
export const OrderSchema = z.object({
  url: z.string().url(),
  commission: z.string(),
  caseNumber: z.string(),
  date: z.string(),
  category: z.string(),
  summary: z.string(),
  outcome: z.enum(['allowed', 'partly_allowed', 'dismissed', 'unclear']),
  refund: z.number().finite().nonnegative().nullable(),
  compensation: z.number().finite().nonnegative().nullable(),
  costs: z.number().finite().nonnegative().nullable(),
  verified: z.boolean(),
});
export type Order = z.infer<typeof OrderSchema>;
export const DISCLAIMER =
  'Not legal advice. An advocate should review anything significant. Figures reflect past orders and are not predictions.';
