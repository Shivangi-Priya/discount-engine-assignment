// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import Dashboard from '../src/components/Dashboard';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const csv = (name: string, text: string) => new File([text], name, { type: 'text/csv' });
const rulesText = readFileSync('sample-data/rules.csv', 'utf8');
const cartText = readFileSync('sample-data/cart.csv', 'utf8');

async function loaded() {
  const user = userEvent.setup();
  render(<Dashboard />);
  await user.click(screen.getByRole('button', { name: /load sample data/i }));
  await screen.findByText('RULE-04');
  return user;
}

describe('Dashboard', () => {
  it('CSV uploads show an import report and populate rules + cart', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.upload(screen.getByTestId('rules-file'), csv('rules.csv', rulesText));
    await user.upload(screen.getByTestId('cart-csv-file'), csv('cart.csv', cartText));
    expect(await screen.findByText('RULE-04')).toBeInTheDocument();
    expect(await screen.findByText('Desk Organiser')).toBeInTheDocument();
    const reports = screen.getAllByTestId('import-report');
    expect(reports[0]).toHaveTextContent(/Total rows: 4/);
    expect(reports[0]).toHaveTextContent(/Imported: 4/);
    expect(reports[1]).toHaveTextContent(/Imported: 6/);
    expect(screen.getByTestId('session-status')).toHaveTextContent('4 rules · 6 items');
  });

  it('invalid CSV: shows row errors and keeps the existing cart', async () => {
    const user = await loaded();
    await user.upload(screen.getByTestId('cart-csv-file'), csv('bad.csv', 'item_id,product,brand,platform,base_price\nX,Chair,Acme,Noon,abc'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/No valid cart rows/);
    expect(screen.getByText(/Row 2:/)).toBeInTheDocument();
    expect(screen.getByTestId('session-status')).toHaveTextContent('6 items');
    expect(screen.getByRole('button', { name: /download rejected rows/i })).toBeInTheDocument();
  });

  it('GENERATE FINAL PRICE shows the golden summary', async () => {
    const user = await loaded();
    await user.click(screen.getByRole('button', { name: 'GENERATE FINAL PRICE' }));
    expect(await screen.findByTestId('final-total')).toHaveTextContent('Rs.5,339');
    const s = within(screen.getByTestId('summary'));
    expect(s.getByText('Rs.6,594')).toBeInTheDocument();
    expect(s.getByText(/Cart offer: 10%, Rs.593 saved/)).toBeInTheDocument();
  });

  it('editing a rule shows real impact, saves, recalculates and offers report/final buttons', async () => {
    const user = await loaded();
    await user.click(screen.getByRole('button', { name: 'GENERATE FINAL PRICE' }));
    await user.click(screen.getByRole('button', { name: 'Edit RULE-04' }));
    const ed = within(screen.getByTestId('rule-editor'));
    const v = ed.getByLabelText('Discount Value');
    await user.clear(v); await user.type(v, '20');
    const impact = within(await screen.findByTestId('impact'));
    expect(impact.getByText('Rs.5,339')).toBeInTheDocument();   // previous final
    expect(impact.getByText('Rs.4,746')).toBeInTheDocument();   // new final
    expect(impact.getByText(/Customer savings increase by Rs.593/)).toBeInTheDocument();
    expect(ed.getByRole('button', { name: /save & generate report/i })).toBeEnabled();
    await user.click(ed.getByRole('button', { name: /save & generate final price/i }));
    await waitFor(() => expect(screen.getByTestId('final-total')).toHaveTextContent('Rs.4,746'));
    expect(screen.queryByTestId('rule-editor')).toBeNull();
  });

  it('invalid edit (percentage > 100) blocks saving', async () => {
    const user = await loaded();
    await user.click(screen.getByRole('button', { name: 'Edit RULE-01' }));
    const ed = within(screen.getByTestId('rule-editor'));
    const v = ed.getByLabelText('Discount Value');
    await user.clear(v); await user.type(v, '150');
    expect(ed.getByRole('alert')).toHaveTextContent(/cannot exceed 100/);
    expect(ed.getByRole('button', { name: /confirm & save/i })).toBeDisabled();
    await user.click(ed.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByTestId('rule-editor')).toBeNull();
  });

  it('delete rule recalculates', async () => {
    const user = await loaded();
    await user.click(screen.getByRole('button', { name: 'GENERATE FINAL PRICE' }));
    await user.click(screen.getByRole('button', { name: 'Delete RULE-04' }));
    await user.click(screen.getByRole('button', { name: 'Confirm delete RULE-04' }));
    await waitFor(() => expect(screen.getByTestId('final-total')).toHaveTextContent('Rs.5,932'));
    expect(screen.queryByText('RULE-04')).toBeNull();
  });

  it('report buttons require a final price first, then export the latest data', async () => {
    const user = await loaded();
    await user.click(screen.getByRole('button', { name: /download csv report/i }));
    expect((await screen.findAllByText(/Generate the final price first/)).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: /generate updated report/i })[0]);
    expect(await screen.findByTestId('report-preview')).toHaveTextContent('OPPTRA DISCOUNT ENGINE - PRICING REPORT');
    expect(screen.getByTestId('report-preview')).toHaveTextContent('Rs.5,339');
  });

  it('NL parse: success opens an editable staging card; confirm adds the rule', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'parsed', rule: { scope: 'brand', appliesTo: 'Nordic Basics', type: 'flat', value: 50, stackable: false, minCartValue: null } }))));
    const user = await loaded();
    await user.type(screen.getByLabelText('Rule in plain English'), 'Rs.50 off Nordic Basics');
    await user.click(screen.getByRole('button', { name: /parse rule/i }));
    const ed = within(await screen.findByTestId('rule-editor'));
    expect(ed.getByLabelText('Applies To')).toHaveValue('Nordic Basics');
    await user.click(ed.getByRole('button', { name: /confirm & add rule/i }));
    expect(await screen.findByText('USER-01')).toBeInTheDocument();
  });

  it('NL parse: ambiguous shows clarification and changes nothing; server errors are actionable', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ambiguous', missingFields: ['discount value'], clarification: 'Please specify the discount percentage or amount and minimum cart value.' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'error', code: 'invalid_rule', message: 'Please specify the discount value and target.' }), { status: 500 }));
    vi.stubGlobal('fetch', f);
    const user = await loaded();
    const box = screen.getByLabelText('Rule in plain English');
    await user.type(box, 'discount for big orders'); await user.click(screen.getByRole('button', { name: /parse rule/i }));
    expect(await screen.findByText(/Need a bit more detail/)).toBeInTheDocument();
    await user.clear(box); await user.type(box, '10% off Sony'); await user.click(screen.getByRole('button', { name: /parse rule/i }));
    expect(await screen.findByText(/specify the discount value and target/i)).toBeInTheDocument();
    expect(screen.getByTestId('session-status')).toHaveTextContent('4 rules');
  });
});
