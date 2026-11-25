import type { CartResult, DiscountRule, ItemResult } from './types';

const fmt = (n: number) => n.toLocaleString('en-IN');
export const rs = (n: number) => `Rs.${fmt(n)}`;
export const describeRule = (r: DiscountRule) => (r.type === 'percentage' ? `${r.value}% off` : `${rs(r.value)} off`);
const withTarget = (r: DiscountRule) => (r.appliesTo ? `${describeRule(r)} ${r.appliesTo}` : describeRule(r));

export function explainItem(r: ItemResult): string {
  const { steps, rejected } = r.outcome;
  if (!steps.length) return 'No offers available for this item.';
  const total = r.item.basePrice - r.outcome.finalAmount;
  const winner = steps.find(s => s.role === 'winner');
  const stacked = steps.filter(s => s.role === 'stacked');
  if (stacked.length) {
    const parts = [
      ...(winner ? [`${winner.rule.ruleId} (${describeRule(winner.rule)})`] : []),
      ...stacked.map(s => `${s.rule.ruleId} (${describeRule(s.rule)}, stacked)`),
    ];
    return `${parts.join(' + ')}. You saved ${rs(total)}.`;
  }
  if (winner && rejected.length) {
    const best = rejected[0];
    return `${winner.rule.ruleId}: ${withTarget(winner.rule)} (${rs(winner.saving)}) beat ${best.rule.ruleId} ${describeRule(best.rule)}. You saved ${rs(total)}.`;
  }
  return `${steps[0].rule.ruleId}: ${withTarget(steps[0].rule)}. You saved ${rs(total)}.`;
}

/** Longer, line-per-decision explanation used by the report (section E). */
export function explainDecisionLines(r: ItemResult): string[] {
  const lines: string[] = [];
  const { steps, rejected } = r.outcome;
  if (!r.matchedRules.length) return ['No brand or platform rule matches this item.'];
  const winner = steps.find(s => s.role === 'winner');
  if (winner) {
    lines.push(`${winner.rule.ruleId} won: ${withTarget(winner.rule)} saves ${rs(winner.saving)} on ${rs(winner.priceBefore)}, the largest non-stackable saving.`);
    rejected.forEach(x => lines.push(`${x.rule.ruleId} rejected: ${withTarget(x.rule)} would save only ${rs(x.potentialSaving)} (${rs(winner.saving - x.potentialSaving)} less than ${winner.rule.ruleId}).`));
  } else if (r.matchedRules.some(m => !m.stackable)) {
    lines.push('Non-stackable rules matched but none produced a saving.');
  }
  steps.filter(s => s.role === 'stacked').forEach(s =>
    lines.push(`${s.rule.ruleId} stacked: ${withTarget(s.rule)} applied on ${rs(s.priceBefore)} and saved ${rs(s.saving)}.`));
  return lines;
}

export function explainCartLines(res: CartResult): string[] {
  const lines: string[] = [];
  const o = res.cartOutcome;
  if (o) {
    const w = o.steps.find(s => s.role === 'winner');
    if (w) {
      lines.push(`${w.rule.ruleId} won at cart level: ${describeRule(w.rule)} saves ${rs(w.saving)} (cart ${rs(res.subtotal)} meets the ${rs(w.rule.minCartValue ?? 0)} minimum).`);
      o.rejected.forEach(x => lines.push(`${x.rule.ruleId} rejected at cart level: would save only ${rs(x.potentialSaving)}.`));
    }
    o.steps.filter(s => s.role === 'stacked').forEach(s =>
      lines.push(`${s.rule.ruleId} stacked at cart level: ${describeRule(s.rule)} saves ${rs(s.saving)}.`));
  }
  res.cartIneligible.forEach(r =>
    lines.push(`${r.ruleId} not applied: cart ${rs(res.subtotal)} is below the ${rs(r.minCartValue ?? 0)} minimum.`));
  if (!o && !res.cartIneligible.length) lines.push('No cart-level rule is configured.');
  return lines;
}

export function explain(result: CartResult): CartResult {
  const items = result.items.map(i => ({ ...i, reasoning: explainItem(i) }));
  let cartOfferText: string | null = null;
  if (result.cartOutcome && result.cartOutcome.steps.length) {
    const saved = result.subtotal - result.cartOutcome.finalAmount;
    const w = result.cartOutcome.steps[0].rule;
    const names = result.cartOutcome.steps.map(s => describeRule(s.rule).replace(' off', '')).join(' + ');
    cartOfferText = `Cart offer: ${names}, ${rs(saved)} saved (cart ${rs(result.subtotal)} ≥ ${rs(w.minCartValue ?? 0)}).`;
  }
  return { ...result, items, cartOfferText };
}
