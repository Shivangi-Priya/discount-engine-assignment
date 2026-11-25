# HANDOFF — Opptra Discount Engine (paste to another Claude)

## Status: ~95% built. Remaining ~5% needs owner's token/browser/Vercel.
| Item | State |
|---|---|
| Core engine + golden (5,932 / 593 / 5,339) | DONE, tested |
| CSV rules/cart adapters (row errors, rejected-rows CSV, BOM, aliases) | DONE, tested |
| PDF cart adapter + Undo | DONE, tested on a real PDF |
| Offline deterministic `api/parse-rule.ts` + dev middleware | DONE, mocks + curl |
| Rule add/edit/delete + impact analysis + Save&Generate buttons | DONE, RTL-tested |
| GENERATE FINAL PRICE + report (CSV, print/PDF) | DONE, tested |
| External LLM integration | Not required; parser runs offline |
| Manual browser QA, Vercel deploy | TODO |

## Root causes in the old zip
1. Parser called Anthropic (`LLM_API_KEY`); every error became a generic 502 -> "Rule parsing is unavailable…".
2. `vite dev` did not serve /api/* (404) -> fixed by `apiDev` plugin in vite.config.ts.
3. CSV: wrong sample data, no import feedback, silent File.text() failure, unquoted-comma rows imported wrong prices.

## Commands
npm install · npm run dev · npm test · npm run build · vercel dev · vercel --prod

## Map
src/core (pure) · src/adapters · api/parse-rule.ts (exports processParseRequest) · src/hooks/useDiscountEngine.ts · src/components · src/utils/report.ts · tests/ · docs/checkpoints/CP1-4.md

## Decisions
Whole-rupee rounding per step; percentage before flat; tie-break brand>platform>ruleId; cart threshold inclusive; `stackable` decided from text keywords; numbers must appear in user text.
