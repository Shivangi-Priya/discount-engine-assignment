import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { csvRuleAdapter } from '../src/adapters/csvRuleAdapter';
import { csvCartAdapter } from '../src/adapters/csvCartAdapter';
import { rejectedRowsToCsv } from '../src/adapters/csvCommon';
import { parseCurrency } from '../src/utils/currency';
import { evaluateCart } from '../src/core/engine';

const rulesCsv = readFileSync('sample-data/rules.csv', 'utf8');
const cartCsv = readFileSync('sample-data/cart.csv', 'utf8');
const none = new Set<string>();

describe('rules CSV', () => {
  it('1. imports the official sample', async () => {
    const r = await csvRuleAdapter.ingest(rulesCsv, none);
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.data).toHaveLength(4);
    expect(r.report).toMatchObject({ total: 4, imported: 4, failed: 0 });
    expect(r.data[3]).toMatchObject({ scope: 'cart', appliesTo: null, minCartValue: 4000, value: 10 });
    expect(r.data[2].stackable).toBe(true);
  });
  it('2. reports row-level errors for invalid rows (partial success)', async () => {
    const csv = `rule_id,scope,applies_to,type,value,stackable,min_cart_value
OK-1,brand,Acme,percentage,10,false,
BAD-1,brand,Acme,percentage,150,false,
BAD-2,brand,Acme,flat,-5,false,
BAD-3,cart,,percentage,10,false,
BAD-4,brand,,flat,10,false,
BAD-5,brand,Acme,flat,10,maybe,
BAD-6,store,Acme,flat,10,false,`;
    const r = await csvRuleAdapter.ingest(csv, none);
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.data.map(x => x.ruleId)).toEqual(['OK-1']);
    expect(r.report).toMatchObject({ total: 7, imported: 1, failed: 6 });
    const reasons = r.report!.issues.map(i => i.reason).join(' | ');
    expect(reasons).toMatch(/cannot exceed 100/);
    expect(reasons).toMatch(/negative/);
    expect(reasons).toMatch(/minimum cart value/);
    expect(reasons).toMatch(/needs a target/);
    expect(reasons).toMatch(/true or false/);
    expect(reasons).toMatch(/Scope must be/);
    expect(r.report!.issues[0].row).toBe(3); // header is row 1
  });
  it('3. detects duplicate rule IDs', async () => {
    const csv = `rule_id,scope,applies_to,type,value\nA,brand,X,flat,10\nA,brand,Y,flat,20`;
    const r = await csvRuleAdapter.ingest(csv, none);
    expect(r.status).toBe('success');
    if (r.status === 'success') { expect(r.data).toHaveLength(1); expect(r.report!.issues[0].reason).toMatch(/Duplicate rule_id "A"/); }
  });
  it('4. missing required columns -> clear error, nothing imported', async () => {
    const r = await csvRuleAdapter.ingest('rule_id,scope\nA,brand', none);
    expect(r).toMatchObject({ status: 'error' });
    if (r.status === 'error') expect(r.message).toMatch(/missing required column\(s\): type, value/);
  });
  it('5. handles BOM, header aliases, CRLF, whitespace and case', async () => {
    const csv = '\uFEFFRule ID , Scope, Applies To ,Discount Type,Discount, Stackable ,Min Cart Value\r\n R1 , Brand , Natura Casa , Percent , 20 , YES , \r\n';
    const r = await csvRuleAdapter.ingest(csv, none);
    expect(r.status).toBe('success');
    if (r.status === 'success') expect(r.data[0]).toMatchObject({ ruleId: 'R1', scope: 'brand', appliesTo: 'Natura Casa', type: 'percentage', value: 20, stackable: true });
  });
  it('rejects an empty file and a header-only file', async () => {
    expect((await csvRuleAdapter.ingest('', none)).status).toBe('error');
    expect((await csvRuleAdapter.ingest('rule_id,scope,type,value\n', none)).status).toBe('error');
  });
  it('all rows invalid -> error WITH report so the UI can show row errors', async () => {
    const r = await csvRuleAdapter.ingest('rule_id,scope,applies_to,type,value\nA,brand,X,percentage,500', none);
    expect(r.status).toBe('error');
    if (r.status === 'error') expect(r.report?.failed).toBe(1);
  });
  it('builds a downloadable rejected-rows CSV', async () => {
    const r = await csvRuleAdapter.ingest('rule_id,scope,applies_to,type,value\nA,brand,X,percentage,500\nB,brand,Y,flat,5', none);
    if (r.status !== 'success') throw new Error('expected success');
    const out = rejectedRowsToCsv(r.report!.issues);
    expect(out.startsWith('\uFEFF')).toBe(true);
    expect(out).toContain('row_number,error_reason,rule_id');
    expect(out).toContain('cannot exceed 100');
  });
});

describe('cart CSV', () => {
  it('6. imports the official sample and reproduces the golden total', async () => {
    const [c, r] = [await csvCartAdapter.ingest(cartCsv), await csvRuleAdapter.ingest(rulesCsv, none)];
    expect(c.status).toBe('success'); expect(r.status).toBe('success');
    if (c.status === 'success' && r.status === 'success') {
      expect(c.data).toHaveLength(6);
      expect(evaluateCart(c.data, r.data).finalTotal).toBe(5339);
    }
  });
  it('7. parses currency values', () => {
    for (const v of ['1299', 'Rs.1,299', 'Rs 1,299', '₹1,299', 'INR 1299', '1,299.00', ' ₹ 1,299 ']) expect(parseCurrency(v)).toBe(1299);
    for (const v of ['abc', '', 'N/A', '12abc', '-5', '1e3']) expect(parseCurrency(v)).toBeNull();
  });
  it('8. partial success with row errors; rejects zero/negative/non-numeric; duplicate IDs', async () => {
    const csv = `item_id,product,brand,platform,base_price
I1,Chair,Acme,Amazon India,"Rs.1,299"
I2,Desk,Acme,Flipkart,0
I3,Lamp,Acme,Noon,-10
I4,Rug,,Noon,500
I5,Mat,Acme,Noon,abc
I1,Dup,Acme,Noon,100
I7,Frame,Acme,Noon,₹2,499`;
    const r = await csvCartAdapter.ingest(csv);
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.data.map(i => i.itemId)).toEqual(['I1']);
    expect(r.data[0].basePrice).toBe(1299);
    expect(r.report!.total).toBe(7);
    expect(r.report!.issues.some(i => /Duplicate item_id/.test(i.reason))).toBe(true);
    expect(r.report!.issues.some(i => /greater than 0/.test(i.reason))).toBe(true);
    expect(r.report!.issues.some(i => /Brand is required/.test(i.reason))).toBe(true);
    expect(r.report!.issues.some(i => /not a valid amount/.test(i.reason))).toBe(true);
    expect(r.report!.issues.some(i => /more columns than the header/.test(i.reason))).toBe(true);
  });
  it('missing columns -> error; BOM + aliases ok; auto item ids', async () => {
    const bad = await csvCartAdapter.ingest('product,brand\nA,B');
    expect(bad.status).toBe('error');
    const ok = await csvCartAdapter.ingest('\uFEFFProduct Name,Brand,Marketplace,Price\nChair,Acme,Noon,₹1,299\n'.replace('₹1,299', '"₹1,299"'));
    expect(ok.status).toBe('success');
    if (ok.status === 'success') expect(ok.data[0]).toMatchObject({ itemId: 'ITEM-01', platform: 'Noon', basePrice: 1299 });
  });
});
