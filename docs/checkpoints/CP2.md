# CP2 — Adapters + Offline Rule Parser   (progress: ~50% built / ~50% remaining)

## Built (56 tests passing)
- `src/adapters/`: contracts (ImportReport/RowIssue), csvCommon (BOM, header aliases, rejected-rows CSV), csvRuleAdapter, csvCartAdapter, pdfCartAdapter, nlRuleAdapter
- CSV: row-level errors (header = row 1), duplicate IDs, bool parsing, % > 100 / negative rejected, extra-column rows rejected (an unquoted "₹2,499" used to import as Rs.2), partial success, all-invalid returns error + report, existing data never touched
- `api/parse-rule.ts` (self-contained, deterministic local TypeScript parser (no external API)):
  Zod-validates; numbers must appear in user text (no invented values); stackable decided from text keywords; appliesTo must appear in text.
- `vite.config.ts` apiDev plugin serves /api/parse-rule in `npm run dev` (fixes the old always-404).
- `tests/{engine,csv,rule-parser,pdf-roundtrip}.test.ts`; `sample-data/{rules,cart}.csv,cart.pdf`; `scripts/make_sample_pdf.py`

## Remaining
hook/store (useDiscountEngine) → report util → UI components (Tailwind) → component tests → README → build check → zip.
