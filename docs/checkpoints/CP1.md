# CP1 — Core engine + golden tests   (progress: ~25% built / ~75% remaining)

## Built
- `src/core/{schemas,types,matching,engine,explain,impact}.ts` (pure, only imports zod)
- `src/utils/currency.ts` (formatINR, parseCurrency: Rs.1,299 / ₹1,299 / INR 1299)
- `sample-data/{rules,cart}.csv` = official Opptra data (Natura Casa / LivSpace Pro / Nordic Basics)
- `tests/engine.test.ts` — 22 tests, all pass. Golden: finals 1104/629/509/2499/382/809, subtotal 5932, cart discount 593, final 5339.
- Config: Vite + Tailwind 3 + Vitest(jsdom) + `vite.config.ts` with an `apiDev` plugin (serves /api/parse-rule in `npm run dev`).

## Root causes found in the old zip (all fixed in this rebuild)
1. `api/parse-rule.ts` called the Anthropic API with `LLM_API_KEY`; every failure became a generic 502, and the client mapped any non-OK to "Rule parsing is unavailable right now".
2. `vite dev` does not serve `/api/*`, so locally the call always 404'd.
3. CSV sample data was Sony/Nike (not the official data) and uploads showed no import summary, so a successful upload looked like nothing happened.

## Remaining
Adapters (CSV rules/cart, NL, PDF) → HF API → hook/store → UI (Tailwind) → report → tests → README → zip.
