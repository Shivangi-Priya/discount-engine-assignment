# CP4 — Verification   (~95% built)
- npm test: 6 files / 69 tests pass (engine 22 incl. golden, csv 12, rule-parser 18, pdf 4, report 4, dashboard 9)
- npm run build OK. Dev server: POST /api/parse-rule reachable; no token -> missing_token; unreachable HF -> upstream (curl-verified).
- NOT verified: live HF response, manual browser click-through, Vercel deploy.
