import { z } from 'zod';
import { DiscountRuleSchema, type DiscountRule } from '../core/types';
import type { AdapterResult, RuleAdapter } from './contracts';

/** Client-side re-validation of the server response: the model output stays untrusted. */
export const ServerResponse = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('parsed'),
    rule: z.object({
      scope: z.enum(['platform', 'brand', 'cart']), appliesTo: z.string().nullable(), type: z.enum(['percentage', 'flat']),
      value: z.number(), stackable: z.boolean(), minCartValue: z.number().nullable(),
    }),
  }),
  z.object({ status: z.literal('ambiguous'), missingFields: z.array(z.string()), clarification: z.string() }),
  z.object({ status: z.literal('error'), code: z.string().optional(), message: z.string() }),
]);

export const AMBIGUOUS_MSG = 'Please specify the discount percentage or amount and minimum cart value.';

export function nextUserId(existing: Set<string>): string {
  let n = 1;
  while (existing.has(`USER-${String(n).padStart(2, '0')}`)) n++;
  return `USER-${String(n).padStart(2, '0')}`;
}

/** Turns an untrusted server payload into a draft rule (never touches the store). Exported for tests. */
export function toDraftRule(payload: unknown, existingIds: Set<string>): AdapterResult<DiscountRule[]> {
  const r = ServerResponse.safeParse(payload);
  if (!r.success) return { status: 'error', message: 'The rule parser returned an unexpected response. Try rephrasing the rule. Your rules were not changed.' };
  if (r.data.status === 'error') return { status: 'error', message: r.data.message };
  if (r.data.status === 'ambiguous') return { status: 'ambiguous', missingFields: r.data.missingFields, guidance: r.data.clarification || AMBIGUOUS_MSG };
  const rule = DiscountRuleSchema.safeParse({ ...r.data.rule, ruleId: nextUserId(existingIds), source: 'nl' });
  if (!rule.success) return { status: 'error', message: `The parsed rule is not valid: ${rule.error.issues.map(i => i.message).join(' ')}` };
  return { status: 'success', data: [rule.data], report: null };
}

export function makeNlRuleAdapter(fetchImpl: typeof fetch = (...a) => fetch(...a)): RuleAdapter<string> {
  return {
    id: 'nl-rule',
    async ingest(text, existingIds) {
      if (!text.trim()) return { status: 'error', message: 'Type a discount rule first, e.g. "10% off if cart value is more than Rs.5000".' };
      let res: Response;
      try {
        res = await fetchImpl('/api/parse-rule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      } catch {
        return { status: 'error', message: 'Could not reach the rule parser (network error). Check your connection and that the dev server is running. Your rules and cart are unchanged.' };
      }
      let payload: unknown;
      try { payload = await res.json(); }
      catch {
        return { status: 'error', message: `The /api/parse-rule route did not return JSON (HTTP ${res.status}). Run the app with "npm run dev" (which serves the API) or "vercel dev". Your rules and cart are unchanged.` };
      }
      return toDraftRule(payload, existingIds);
    },
  };
}
export const nlRuleAdapter = makeNlRuleAdapter();
