import type { CartItem, DiscountRule } from '../core/types';

/** One rejected input row. `row` is the spreadsheet row number (header = row 1). */
export interface RowIssue { row: number; reason: string; raw: Record<string, string>; }
export interface ImportReport { source: string; total: number; imported: number; failed: number; issues: RowIssue[]; }

export type AdapterResult<T> =
  | { status: 'success'; data: T; report: ImportReport | null }
  | { status: 'ambiguous'; missingFields: string[]; guidance: string }
  | { status: 'error'; message: string; report?: ImportReport };

export interface RuleAdapter<I> { id: string; ingest(input: I, existingIds: Set<string>): Promise<AdapterResult<DiscountRule[]>>; }
export interface CartAdapter<I> { id: string; ingest(input: I): Promise<AdapterResult<CartItem[]>>; }
