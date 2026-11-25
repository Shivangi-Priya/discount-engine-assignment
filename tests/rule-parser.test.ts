import { describe, it, expect, vi } from 'vitest';
import { processParseRequest, parseRuleText, detectStackable, numbersIn } from '../api/parse-rule';
import { makeNlRuleAdapter, toDraftRule } from '../src/adapters/nlRuleAdapter';

const run = (text: string) => processParseRequest({ text });

describe('offline deterministic discount-rule parser', () => {
  it('parses a stackable brand percentage rule', async () => {
    const out = await run('20% off for Natura Casa brand, stackable with other offers');
    expect(out.status).toBe(200);
    expect(out.body).toMatchObject({ status: 'parsed', parser: 'deterministic-local', rule: { scope: 'brand', appliesTo: 'Natura Casa', type: 'percentage', value: 20, stackable: true, minCartValue: null } });
  });
  it('parses a flat platform rule', async () => {
    const out = await run('Rs.100 flat discount on all Flipkart items.');
    expect(out.body).toMatchObject({ status: 'parsed', rule: { scope: 'platform', appliesTo: 'Flipkart', type: 'flat', value: 100, stackable: false } });
  });
  it('parses a cart threshold rule', async () => {
    const out = await run('10% off if cart value is more than Rs.5000.');
    expect(out.body).toMatchObject({ status: 'parsed', rule: { scope: 'cart', appliesTo: null, type: 'percentage', value: 10, minCartValue: 5000 } });
  });
  it('returns clarification when discount value or target is missing', async () => {
    expect((await run('Give a discount for big orders.')).body).toMatchObject({ status: 'ambiguous' });
    expect((await run('10% off all items')).body).toMatchObject({ status: 'ambiguous' });
  });
  it('rejects percentages above 100', async () => {
    expect(await run('150% off Sony brand')).toMatchObject({ status: 422, body: { status: 'error', code: 'invalid_rule' } });
  });
  it('rejects empty and over-long input', async () => {
    expect((await run('  ')).status).toBe(400);
    expect((await run('a'.repeat(501))).status).toBe(400);
  });
  it('detects stackability conservatively and parses Indian number formats', () => {
    expect(detectStackable('stackable with other offers')).toBe(true);
    expect(detectStackable('non-stackable 10% off')).toBe(false);
    expect(detectStackable('10% off Sony')).toBe(false);
    expect(numbersIn('Rs.5,000. 10% and 2k')).toEqual(expect.arrayContaining([5000, 10, 2000]));
  });
  it('exposes a pure parser for direct use', () => {
    expect(parseRuleText('15% off for Sony brand').body.status).toBe('parsed');
  });
});

describe('client NL adapter', () => {
  const ids = new Set(['USER-01']);
  it('turns parsed response into a draft with a unique USER id', () => {
    const r = toDraftRule({ status: 'parsed', rule: { scope: 'platform', appliesTo: 'Noon', type: 'flat', value: 50, stackable: false, minCartValue: null } }, ids);
    expect(r.status).toBe('success');
    if (r.status === 'success') expect(r.data[0]).toMatchObject({ ruleId: 'USER-02', source: 'nl' });
  });
  it('re-validates: percentage > 100 never becomes a draft', () => {
    expect(toDraftRule({ status: 'parsed', rule: { scope: 'brand', appliesTo: 'X', type: 'percentage', value: 150, stackable: false, minCartValue: null } }, ids).status).toBe('error');
  });
  it('passes through ambiguous responses and server errors', () => {
    expect(toDraftRule({ status: 'ambiguous', missingFields: ['a'], clarification: 'say more' }, ids)).toMatchObject({ status: 'ambiguous', guidance: 'say more' });
    expect(toDraftRule({ status: 'error', code: 'invalid_rule', message: 'Bad rule' }, ids)).toMatchObject({ status: 'error', message: 'Bad rule' });
  });
  it('explains non-JSON API response and network failure', async () => {
    const html = makeNlRuleAdapter((async () => new Response('<html>404</html>', { status: 404 })) as typeof fetch);
    const a = await html.ingest('10% off Sony brand', ids);
    expect(a).toMatchObject({ status: 'error' });
    if (a.status === 'error') expect(a.message).toMatch(/npm run dev/);
    const down = makeNlRuleAdapter((async () => { throw new TypeError('x'); }) as typeof fetch);
    expect((await down.ingest('10% off Sony brand', ids)).status).toBe('error');
  });
});
