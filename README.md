# Opptra Discount Engine

AI-assisted discount pricing. **The local rule parser proposes structured rules, Zod validates them, and the deterministic engine decides every price.**

React + TypeScript + Vite + Tailwind · Vercel serverless function · PapaParse · pdfjs-dist · Zod · Vitest.

## Run (Windows PowerShell / macOS / Linux)

```powershell
npm install
npm run dev                 # http://localhost:5173  (also serves /api/parse-rule)
npm test                    # 69 tests, no network or paid API needed
npm run build
```
Click **Load sample data** then **GENERATE FINAL PRICE** → Rs.5,339.

## Environment variables
No `.env` file, API key, paid service, or external model is required. Plain-English discount rules are parsed locally using deterministic TypeScript patterns, then validated before they become draft rules.

## Deploy to Vercel
1. Push to GitHub. 2. Import the repo in Vercel (Vite defaults; `vercel.json` included). 3. Deploy. No environment variables are needed.

## Architecture
```
api/parse-rule.ts   Offline deterministic parser, Zod validation (self-contained)
src/core/           types, schemas, matching, engine (reducer), explain, impact  (pure)
src/adapters/       csvRuleAdapter, csvCartAdapter, pdfCartAdapter, nlRuleAdapter -> same DiscountRule / CartItem
src/hooks/          useDiscountEngine (prices derived with useMemo, never stored)
src/components/     Dashboard + panels;  src/utils/report.ts (CSV + printable HTML)
```
Pricing: best non-stackable saving wins (ties: brand > platform > ruleId); stackables compound (percentage first, then flat, by ruleId); whole-rupee rounding per step; never below zero. Cart rules run on the post-item subtotal (threshold inclusive) via the same reducer.

Rule parsing: discount numbers must be present in the user's text; `stackable` is decided from explicit keywords; percentage ≤ 100; brand/platform targets are extracted from the text; cart rules need a minimum cart value; ambiguous text returns a clarification; on any failure rules and cart are untouched. The local parser intentionally asks for clarification rather than guessing when wording is unsupported.

## Sample CSV formats
```
rule_id,scope,applies_to,type,value,stackable,min_cart_value
RULE-01,platform,Amazon India,percentage,15,false,
RULE-04,cart,,percentage,10,false,4000

item_id,product,brand,platform,base_price
ITEM-01,Cushion Cover,Natura Casa,Amazon India,1299
```
Quote values containing commas (`"Rs.1,299"`). Headers are case-insensitive with aliases (`price`, `marketplace`, `threshold`…). Rejected rows are listed with reasons and downloadable.

## Design decisions
Whole-rupee rounding per step (only policy that reproduces 5,932 / 593 / 5,339) · percentage before flat when stacking · PDF cart auto-replaces with Undo · scanned PDFs reported as unsupported.
Not verified in the build sandbox: a live external LLM call (no network access there).


## Channel commission & profit optimizer

The dashboard includes a deterministic, per-unit channel pricing optimizer. Select a cart item and configure:
- product cost and seller-approved minimum/maximum whole-rupee price;
- commission threshold and rate above it;
- optional rate at/below the threshold and other per-unit fees.

The optimizer evaluates every whole-rupee price in the range and recommends the price with the highest estimated per-unit profit. For example, with product cost ₹700, a 10% commission only above ₹999, and a candidate range of ₹800–₹1,100, ₹999 produces ₹299 profit versus ₹290 at ₹1,100.

**Important:** commission rates are editable assumptions, not live Amazon/Flipkart rates. Configure the correct category-specific fee schedule yourself. This first version maximizes estimated profit per unit; it does not model demand, conversion, competitor prices, tax treatment, or marketplace fee changes. It also treats the selected cart item's post-discount price as the current comparison price.
