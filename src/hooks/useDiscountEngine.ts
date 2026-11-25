import { useCallback, useMemo, useRef, useState } from 'react';
import { csvCartAdapter } from '../adapters/csvCartAdapter';
import { csvRuleAdapter } from '../adapters/csvRuleAdapter';
import { readFileText, rejectedRowsToCsv } from '../adapters/csvCommon';
import type { ImportReport } from '../adapters/contracts';
import { nextUserId, nlRuleAdapter } from '../adapters/nlRuleAdapter';
import { pdfCartAdapter } from '../adapters/pdfCartAdapter';
import { evaluateCart } from '../core/engine';
import { computeImpact, type Impact } from '../core/impact';
import { DiscountRuleSchema, type CartItem, type DiscountRule } from '../core/types';
import { buildReport, downloadText, printHtml, reportToCsv, reportToHtml, type ReportData } from '../utils/report';
import rulesCsv from '../../sample-data/rules.csv?raw';
import cartCsv from '../../sample-data/cart.csv?raw';

/** Text-friendly form state so half-typed numbers never become NaN. */
export interface RuleForm { ruleId: string; scope: DiscountRule['scope']; appliesTo: string; type: DiscountRule['type']; value: string; stackable: boolean; minCartValue: string; source: DiscountRule['source']; }
export interface EditorState { mode: 'edit' | 'add' | 'ai'; originalId: string | null; form: RuleForm; }
export interface Toast { id: number; kind: 'success' | 'error' | 'info'; text: string; }

export const ruleToForm = (r: DiscountRule): RuleForm => ({ ruleId: r.ruleId, scope: r.scope, appliesTo: r.appliesTo ?? '', type: r.type, value: String(r.value), stackable: r.stackable, minCartValue: r.minCartValue == null ? '' : String(r.minCartValue), source: r.source });
export function formToRule(f: RuleForm) {
  const num = (s: string) => (s.trim() === '' ? null : Number(s));
  return DiscountRuleSchema.safeParse({
    ruleId: f.ruleId, scope: f.scope, appliesTo: f.scope === 'cart' ? null : f.appliesTo.trim() || null, type: f.type,
    value: f.value.trim() === '' ? undefined : Number(f.value), stackable: f.stackable,
    minCartValue: f.scope === 'cart' ? num(f.minCartValue) : null, source: f.source,
  });
}

export function useDiscountEngine() {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [items, setItems] = useState<CartItem[]>([]);
  const [prevItems, setPrevItems] = useState<CartItem[] | null>(null);
  const [ruleReport, setRuleReport] = useState<ImportReport | null>(null);
  const [cartReport, setCartReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [nlMessage, setNlMessage] = useState<{ kind: 'error' | 'ambiguous'; text: string; missing?: string[] } | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const tid = useRef(0);

  /** Derived, never stored: every on-screen price comes from here. */
  const result = useMemo(() => evaluateCart(items, rules), [items, rules]);
  const generated = generatedAt !== null;

  const toast = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++tid.current;
    setToasts(t => [...t, { id, kind, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  }, []);
  const dismissToast = (id: number) => setToasts(t => t.filter(x => x.id !== id));

  // ---- editor / impact ----
  const draft = useMemo(() => (editor ? formToRule(editor.form) : null), [editor]);
  const nextRules = useMemo(() => {
    if (!editor || !draft?.success) return null;
    return editor.originalId ? rules.map(r => (r.ruleId === editor.originalId ? draft.data : r)) : [...rules, draft.data];
  }, [editor, draft, rules]);
  const impact: Impact | null = useMemo(() => (nextRules ? computeImpact(items, rules, nextRules) : null), [items, rules, nextRules]);
  const idConflict = !!editor && !!draft?.success && draft.data.ruleId !== editor.originalId && rules.some(r => r.ruleId === draft.data.ruleId);

  const startEdit = (id: string) => { const r = rules.find(x => x.ruleId === id); if (r) setEditor({ mode: 'edit', originalId: id, form: ruleToForm(r) }); };
  const startAdd = () => setEditor({
    mode: 'add', originalId: null,
    form: { ruleId: nextUserId(new Set(rules.map(r => r.ruleId))), scope: 'brand', appliesTo: '', type: 'percentage', value: '', stackable: false, minCartValue: '', source: 'manual' },
  });
  const updateForm = (p: Partial<RuleForm>) => setEditor(e => (e ? { ...e, form: { ...e.form, ...p } } : e));
  const cancelEditor = () => setEditor(null);

  /** Returns true when saved. Nothing changes if validation fails. */
  const saveEditor = (then?: 'final' | 'report'): boolean => {
    if (!editor || !draft?.success || !nextRules) { toast('error', 'Fix the highlighted rule fields before saving.'); return false; }
    if (idConflict) { toast('error', `Rule ID "${draft.data.ruleId}" already exists. Choose a different ID.`); return false; }
    const adding = !editor.originalId;
    setRules(nextRules);
    setEditor(null);
    toast('success', adding ? `Rule ${draft.data.ruleId} added. Prices recalculated.` : `Rule ${draft.data.ruleId} updated. Prices recalculated.`);
    if (then) queueMicrotask(() => runGenerate(nextRules, items, then));
    return true;
  };

  const deleteRule = (id: string) => { setRules(rs => rs.filter(r => r.ruleId !== id)); if (editor?.originalId === id) setEditor(null); toast('success', `Rule ${id} deleted. Prices recalculated.`); };

  // ---- uploads (a failed upload never touches existing data) ----
  const importRules = async (file: File) => {
    setError(null); setBusy('rules');
    try {
      if (!/\.csv$/i.test(file.name) && !file.type.includes('csv') && file.type !== 'text/plain') { setError(`"${file.name}" is not a CSV file. Choose a .csv rules file.`); return; }
      const r = await csvRuleAdapter.ingest(await readFileText(file), new Set());
      if (r.status === 'success') { setRules(r.data); setRuleReport(r.report); toast('success', `Imported ${r.report?.imported} of ${r.report?.total} rules from ${file.name}.`); }
      else { setRuleReport(r.status === 'error' ? r.report ?? null : null); setError(r.status === 'error' ? r.message : r.guidance); }
    } catch (e) { setError(`Could not read "${file.name}": ${(e as Error).message}. Your rules were not changed.`); }
    finally { setBusy(null); }
  };
  const applyCart = (data: CartItem[], rep: ImportReport | null, label: string) => {
    setPrevItems(items.length ? items : null); setItems(data); setCartReport(rep);
    toast('success', `Imported ${rep?.imported ?? data.length} item(s) from ${label}. Prices recalculated.`);
  };
  const importCart = async (file: File) => {
    setError(null); setBusy('cart');
    try {
      const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
      if (!isPdf && !/\.csv$/i.test(file.name) && !file.type.includes('csv') && file.type !== 'text/plain') { setError(`"${file.name}" is not a CSV or PDF file.`); return; }
      const r = isPdf ? await pdfCartAdapter.ingest(file) : await csvCartAdapter.ingest(await readFileText(file));
      if (r.status === 'success') applyCart(r.data, r.report, file.name);
      else { setCartReport(r.status === 'error' ? r.report ?? null : null); setError(r.status === 'error' ? r.message : r.guidance); }
    } catch (e) { setError(`Could not read "${file.name}": ${(e as Error).message}. Your cart was not changed.`); }
    finally { setBusy(null); }
  };
  const undoCart = () => { if (!prevItems) return; setItems(prevItems); setPrevItems(null); setCartReport(null); toast('info', 'Previous cart restored.'); };
  const loadSample = async () => {
    setError(null);
    const [r, c] = [await csvRuleAdapter.ingest(rulesCsv, new Set()), await csvCartAdapter.ingest(cartCsv)];
    if (r.status === 'success') { setRules(r.data); setRuleReport(r.report); }
    if (c.status === 'success') { setItems(c.data); setCartReport(c.report); }
    toast('success', 'Loaded the official Opptra sample (4 rules, 6 items).');
  };
  const downloadRejected = (which: 'rules' | 'cart') => {
    const rep = which === 'rules' ? ruleReport : cartReport;
    if (rep?.issues.length) downloadText(`rejected-${which}-rows.csv`, rejectedRowsToCsv(rep.issues));
  };

  // ---- natural language ----
  const parseNl = async (text: string) => {
    setNlMessage(null); setBusy('nl');
    try {
      const r = await nlRuleAdapter.ingest(text, new Set(rules.map(x => x.ruleId)));
      if (r.status === 'success') setEditor({ mode: 'ai', originalId: null, form: ruleToForm(r.data[0]) });
      else if (r.status === 'ambiguous') setNlMessage({ kind: 'ambiguous', text: r.guidance, missing: r.missingFields });
      else setNlMessage({ kind: 'error', text: r.message });
    } finally { setBusy(null); }
  };

  // ---- final price + reports (always from the latest rules/cart) ----
  function runGenerate(r: DiscountRule[], i: CartItem[], what: 'final' | 'report'): boolean {
    if (!i.length) { toast('error', 'The cart is empty. Upload a cart CSV/PDF or load the sample first.'); return false; }
    if (!r.length) toast('info', 'No active rules: final prices equal base prices.');
    const res = evaluateCart(i, r);
    setGeneratedAt(new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }));
    if (what === 'report') { setReport(buildReport(res, r)); toast('success', 'Report updated from the latest rules and cart.'); }
    else toast('success', `Final price generated: Rs.${res.finalTotal.toLocaleString("en-IN")} payable.`);
    return true;
  }
  const generateFinal = () => runGenerate(rules, items, 'final');
  const generateReport = () => runGenerate(rules, items, 'report');
  const needGenerated = () => { if (!generated) { toast('error', 'Generate the final price first, then export the report.'); return false; } return true; };
  const fresh = () => buildReport(evaluateCart(items, rules), rules);
  const downloadCsvReport = () => { if (!needGenerated()) return; const d = fresh(); setReport(d); downloadText('opptra-pricing-report.csv', reportToCsv(d)); toast('success', 'CSV report downloaded.'); };
  const printReport = () => {
    if (!needGenerated()) return;
    const d = fresh(); setReport(d);
    if (!printHtml(reportToHtml(d))) { downloadText('opptra-pricing-report.html', reportToHtml(d), 'text/html'); toast('info', 'Print was blocked; downloaded the HTML report instead. Open it and use Print → Save as PDF.'); }
  };

  return {
    rules, items, result, prevItems, ruleReport, cartReport, error, busy, editor, draft, impact, idConflict, nlMessage, generated, generatedAt, report, toasts,
    setError, dismissToast, importRules, importCart, undoCart, loadSample, downloadRejected, parseNl, setNlMessage,
    startEdit, startAdd, updateForm, cancelEditor, saveEditor, deleteRule, generateFinal, generateReport, downloadCsvReport, printReport,
  };
}
export type Engine = ReturnType<typeof useDiscountEngine>;
