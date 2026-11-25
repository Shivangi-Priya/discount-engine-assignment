/**
 * POST /api/parse-rule { text }
 * Deterministic, offline rule parser. No API key, external model, or network call required.
 * Parsed rules are still validated by the client-side Zod schema before becoming drafts.
 */
import { z } from 'zod';

export type ParseCode = 'bad_request' | 'invalid_rule' | 'method' | 'server';
export interface ApiOut { status: number; body: Record<string, unknown>; }

const err = (status: number, code: ParseCode, message: string): ApiOut => ({ status, body: { status: 'error', code, message } });

export function numbersIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) out.push(Number(m[0].replace(/,/g, '')));
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*k\b/gi)) out.push(Number(m[1]) * 1000);
  return out.filter(Number.isFinite);
}

const STACK_YES = /\bstackable\b|\bstack(?:s|ed)?\b|\bcombin(?:e|ed|able)\b|\bon top of\b|\bin addition\b|\balong with other\b|\bwith other (?:offers|discounts|deals)\b/i;
const STACK_NO = /\bnon[- ]?stackable\b|\bnot stackable\b|\b(?:cannot|can't|can not|won't|doesn't|does not) (?:be )?(?:stack|combin)|\bno stacking\b|\bwithout stacking\b/i;
export const detectStackable = (text: string) => !STACK_NO.test(text) && STACK_YES.test(text);

const cleanName = (s: string) => s.replace(/[.,;:!?]+$/g, '').replace(/\s+/g, ' ').trim();
const ambiguous = (missingFields: string[], clarification?: string): ApiOut => ({
  status: 200,
  body: {
    status: 'ambiguous', missingFields,
    clarification: clarification || `Please specify ${missingFields.join(' and ')} clearly.`,
  },
});

/** Extracts one simple discount rule from plain English without calling an LLM. */
export function parseRuleText(text: string): ApiOut {
  const valueMatch = text.match(/(?:\b(\d[\d,]*(?:\.\d+)?)\s*%|\b(?:rs\.?|inr|₹)\s*(\d[\d,]*(?:\.\d+)?)(?!\s*%))/i);
  if (!valueMatch) return ambiguous(['discount value'], 'Please include a discount value, e.g. "10% off Sony" or "Rs.100 off Flipkart items".');
  const isPercent = valueMatch[1] !== undefined;
  const value = Number((valueMatch[1] ?? valueMatch[2]).replace(/,/g, ''));
  if (!Number.isFinite(value) || value <= 0) return err(422, 'invalid_rule', 'The discount value must be greater than zero.');
  if (isPercent && value > 100) return err(422, 'invalid_rule', 'A percentage discount cannot exceed 100.');

  const lower = text.toLowerCase();
  const cartRule = /\bcart\b|\border\s+value\b|\bbasket\b/i.test(text);
  let scope: 'cart' | 'brand' | 'platform';
  let appliesTo: string | null = null;
  let minCartValue: number | null = null;

  if (cartRule) {
    scope = 'cart';
    const thresholdMatch = text.match(/(?:cart|order|basket)\s*(?:value|total)?\s*(?:is\s*)?(?:more than|greater than|above|over|at least|minimum of|>=|>)\s*(?:rs\.?|inr|₹)?\s*(\d[\d,]*(?:\.\d+)?)/i)
      || text.match(/(?:minimum|min\.?|above|over|greater than)\s*(?:cart\s*)?(?:value\s*)?(?:of\s*)?(?:rs\.?|inr|₹)?\s*(\d[\d,]*(?:\.\d+)?)/i);
    if (!thresholdMatch) return ambiguous(['minimum cart value'], 'Please specify the minimum cart value, e.g. "10% off if cart value is more than Rs.5000".');
    minCartValue = Number(thresholdMatch[1].replace(/,/g, ''));
  } else {
    const platformMatch = text.match(/\b(?:on|for)\s+(?:all\s+)?([A-Za-z][A-Za-z0-9 &.'-]*?)\s+(?:items|products|orders|purchase|platform|marketplace)\b/i)
      || text.match(/\b(?:platform|marketplace)\s*[:=]?\s*([A-Za-z][A-Za-z0-9 &.'-]*)/i);
    const brandMatch = text.match(/\b(?:for|on)\s+([A-Za-z][A-Za-z0-9 &.'-]*?)\s+brand\b/i)
      || text.match(/\bbrand\s*[:=]\s*([A-Za-z][A-Za-z0-9 &.'-]*)/i);

    // Explicit brand wording wins; otherwise marketplace wording is inferred from known channel names.
    if (brandMatch) {
      scope = 'brand'; appliesTo = cleanName(brandMatch[1]);
    } else if (platformMatch) {
      const candidate = cleanName(platformMatch[1]);
      if (/^(amazon(?:\s+india)?|flipkart|myntra|noon|ebay|walmart)$/i.test(candidate)) {
        scope = 'platform'; appliesTo = candidate;
      } else {
        scope = 'brand'; appliesTo = candidate;
      }
    } else {
      const knownChannel = text.match(/\b(Amazon(?:\s+India)?|Flipkart|Myntra|Noon|eBay|Walmart)\b/i);
      const afterOff = text.match(/\boff\s+(?:all\s+)?([A-Za-z][A-Za-z0-9 &.'-]*?)(?:\s+(?:products?|items?|brand))?\s*[.!]?$/i);
      if (knownChannel && /\b(?:platform|marketplace|items|products)\b/i.test(text)) {
        scope = 'platform'; appliesTo = knownChannel[1];
      } else if (afterOff && !/^(?:all|items?|products?|everything)$/i.test(cleanName(afterOff[1]))) {
        scope = 'brand'; appliesTo = cleanName(afterOff[1]);
      } else {
        return ambiguous(['brand or platform name'], 'Please specify the brand or marketplace this discount applies to.');
      }
    }
  }

  if (scope !== 'cart' && !appliesTo) return ambiguous([`${scope} name`]);
  const rule = {
    scope,
    appliesTo,
    type: isPercent ? 'percentage' : 'flat',
    value,
    stackable: detectStackable(text),
    minCartValue,
  };
  const checked = z.object({
    scope: z.enum(['platform', 'brand', 'cart']),
    appliesTo: z.string().nullable(),
    type: z.enum(['percentage', 'flat']),
    value: z.number().positive().finite(),
    stackable: z.boolean(),
    minCartValue: z.number().positive().finite().nullable(),
  }).safeParse(rule);
  if (!checked.success) return err(422, 'invalid_rule', 'The rule could not be validated. Please rephrase it with one clear discount value and target.');
  return { status: 200, body: { status: 'parsed', rule: checked.data, parser: 'deterministic-local' } };
}

export async function processParseRequest(body: unknown): Promise<ApiOut> {
  const text = typeof (body as { text?: unknown })?.text === 'string' ? (body as { text: string }).text.trim() : '';
  if (!text) return err(400, 'bad_request', 'Type a discount rule first, for example "20% off for Natura Casa brand, stackable with other offers".');
  if (text.length > 500) return err(400, 'bad_request', 'The rule text is too long (max 500 characters). Describe one rule at a time.');
  return parseRuleText(text);
}

/** Vercel Node serverless entry. */
export default async function handler(
  req: { method?: string; body?: unknown },
  res: { status(code: number): { json(b: unknown): void }; setHeader(k: string, v: string): void },
) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', code: 'method', message: 'Use POST.' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  try {
    const out = await processParseRequest(body);
    return res.status(out.status).json(out.body);
  } catch (e) {
    return res.status(500).json({ status: 'error', code: 'server', message: `Unexpected server error: ${(e as Error).message}` });
  }
}
