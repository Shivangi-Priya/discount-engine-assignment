import Papa from 'papaparse';
import type { RowIssue } from './contracts';

export const stripBom = (s: string) => s.replace(/^\uFEFF/, '');
export const normHeader = (h: string) =>
  stripBom(h).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
export const EXTRA_COLS_MSG = 'Row has more columns than the header. Wrap values that contain commas (like "Rs.1,299") in double quotes.';
export const blank = (v: unknown) => v === undefined || v === null || String(v).trim() === '';

export interface ParsedCsv { rows: { rowNumber: number; cells: Record<string, string>; raw: Record<string, string>; extra: boolean }[]; headers: string[]; missing: string[]; }

/**
 * Parses CSV text, normalises headers through an alias table (canonical -> accepted names)
 * and returns rows keyed by canonical column names plus the untouched raw row.
 */
export function parseCsvWithAliases(text: string, aliases: Record<string, string[]>, required: string[]): ParsedCsv {
  const parsed = Papa.parse<Record<string, string>>(stripBom(text), {
    header: true, skipEmptyLines: 'greedy', transformHeader: normHeader,
    transform: v => (typeof v === 'string' ? v.trim() : v),
  });
  const headers = (parsed.meta.fields ?? []).filter(Boolean);
  const canonicalOf: Record<string, string> = {};
  for (const [canon, names] of Object.entries(aliases)) for (const n of [canon, ...names]) canonicalOf[normHeader(n)] = canon;
  const present = new Set(headers.map(h => canonicalOf[h]).filter(Boolean));
  const missing = required.filter(r => !present.has(r));
  const rows = parsed.data.map((raw, i) => {
    const cells: Record<string, string> = {};
    for (const [h, v] of Object.entries(raw)) if (canonicalOf[h] && cells[canonicalOf[h]] === undefined) cells[canonicalOf[h]] = v ?? '';
    const extra = Array.isArray((raw as Record<string, unknown>).__parsed_extra);
    const clean = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== '__parsed_extra').map(([k, v]) => [k, v ?? '']));
    return { rowNumber: i + 2, cells, raw: clean, extra };
  });
  return { rows, headers, missing };
}

/** CSV of rejected rows + reasons, ready to download (UTF-8 BOM so Excel reads it correctly). */
export function rejectedRowsToCsv(issues: RowIssue[]): string {
  const keys = Array.from(new Set(issues.flatMap(i => Object.keys(i.raw))));
  const data = issues.map(i => ({ row_number: i.row, error_reason: i.reason, ...Object.fromEntries(keys.map(k => [k, i.raw[k] ?? ''])) }));
  return '\uFEFF' + Papa.unparse(data, { columns: ['row_number', 'error_reason', ...keys] });
}

/** Reads a File as text. Uses File.text() when present, else FileReader (older browsers, jsdom). */
export function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ''));
    fr.onerror = () => reject(fr.error ?? new Error('read failed'));
    fr.readAsText(file);
  });
}
