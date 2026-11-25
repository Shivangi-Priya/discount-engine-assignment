import { DiscountRuleSchema, type DiscountRule } from '../core/types';
import { parseCurrency } from '../utils/currency';
import type { AdapterResult, ImportReport, RowIssue, RuleAdapter } from './contracts';
import { blank, EXTRA_COLS_MSG, parseCsvWithAliases } from './csvCommon';

export const RULE_ALIASES: Record<string, string[]> = {
  rule_id: ['ruleid', 'id', 'rule', 'rule_no', 'rule_name'],
  scope: ['level', 'rule_scope'],
  applies_to: ['appliesto', 'target', 'applies', 'apply_to', 'applies_on'],
  type: ['discount_type', 'dtype', 'rule_type'],
  value: ['discount', 'discount_value', 'amount', 'discount_amount'],
  stackable: ['is_stackable', 'stackable_with_others', 'stacks'],
  min_cart_value: ['mincartvalue', 'minimum_cart_value', 'min_cart', 'min_value', 'threshold', 'min_order_value'],
};
export const RULE_REQUIRED = ['rule_id', 'scope', 'type', 'value'];

const TYPE_MAP: Record<string, string> = { percentage: 'percentage', percent: 'percentage', pct: 'percentage', '%': 'percentage', flat: 'flat', fixed: 'flat', amount: 'flat', rs: 'flat' };

/** Returns true/false, or null when the text is not a recognisable boolean. Empty = false. */
export function parseBool(v: unknown): boolean | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === '') return false;
  if (['true', 'yes', 'y', '1', 't'].includes(s)) return true;
  if (['false', 'no', 'n', '0', 'f'].includes(s)) return false;
  return null;
}

export const csvRuleAdapter: RuleAdapter<string> = {
  id: 'csv-rules',
  async ingest(text, existingIds = new Set()) {
    if (!text || !text.trim()) return { status: 'error', message: 'The rules file is empty. Add a header row and at least one rule, or download the sample CSV.' };
    const csv = parseCsvWithAliases(text, RULE_ALIASES, RULE_REQUIRED);
    if (csv.missing.length)
      return { status: 'error', message: `Rules CSV is missing required column(s): ${csv.missing.join(', ')}. Found: ${csv.headers.join(', ') || 'none'}. Expected: rule_id,scope,applies_to,type,value,stackable,min_cart_value.` };
    if (!csv.rows.length) return { status: 'error', message: 'Rules CSV has a header but no data rows.' };

    const data: DiscountRule[] = [];
    const issues: RowIssue[] = [];
    const seen = new Set<string>();
    for (const { rowNumber, cells, raw, extra } of csv.rows) {
      const reasons: string[] = [];
      if (extra) reasons.push(EXTRA_COLS_MSG);
      const typeRaw = (cells.type ?? '').trim().toLowerCase();
      const stackable = parseBool(cells.stackable);
      if (stackable === null) reasons.push(`stackable "${cells.stackable}" must be true or false.`);
      const valueNum = blank(cells.value) ? undefined : parseCurrency(String(cells.value).replace(/%/g, ''));
      if (!blank(cells.value) && valueNum === null) reasons.push(`value "${cells.value}" is not a valid non-negative number.`);
      const minNum = blank(cells.min_cart_value) ? null : parseCurrency(cells.min_cart_value);
      if (!blank(cells.min_cart_value) && minNum === null) reasons.push(`min_cart_value "${cells.min_cart_value}" is not a valid number.`);

      const res = DiscountRuleSchema.safeParse({
        ruleId: cells.rule_id ?? '', scope: (cells.scope ?? '').trim().toLowerCase(),
        appliesTo: blank(cells.applies_to) ? null : cells.applies_to.trim(),
        type: TYPE_MAP[typeRaw] ?? typeRaw, value: valueNum === null ? undefined : valueNum,
        stackable: stackable ?? false, minCartValue: minNum, source: 'csv',
      });
      if (!res.success) reasons.push(...res.error.issues.filter(i => !(valueNum === null && i.path[0] === 'value')).map(i => i.message));
      else {
        if (seen.has(res.data.ruleId)) reasons.push(`Duplicate rule_id "${res.data.ruleId}" in this file.`);
        else if (existingIds.has(res.data.ruleId)) reasons.push(`rule_id "${res.data.ruleId}" already exists.`);
      }
      if (reasons.length || !res.success) issues.push({ row: rowNumber, reason: reasons.join(' '), raw });
      else { seen.add(res.data.ruleId); data.push(res.data); }
    }

    const report: ImportReport = { source: 'Rules CSV', total: csv.rows.length, imported: data.length, failed: issues.length, issues };
    if (!data.length) return { status: 'error', message: `No valid rules found: all ${issues.length} row(s) failed. Your existing rules were not changed. See the row errors below.`, report };
    return { status: 'success', data, report } satisfies AdapterResult<DiscountRule[]>;
  },
};
