# Opptra Discount Engine

A browser-based discount and pricing tool for evaluating product-level and cart-level promotions. Import cart and discount-rule data, create rules in plain English or CSV, calculate final prices with a deterministic engine, inspect why each discount did or did not apply, and export a pricing report.

The application is built with **React, TypeScript, Vite, Tailwind CSS, Zod, PapaParse, pdfjs-dist, and Vitest**. The rule parser runs locally; no paid AI service or API key is required.

## Features

- **Plain-English rule entry** — describe a discount in everyday language and convert it into a structured rule. The parser asks for clarification when key details are missing rather than guessing.
- **Rule management** — add, edit, and delete discount rules; review rule impact against the current cart.
- **CSV imports** — upload discount rules and cart items. Headers are case-insensitive and common aliases are supported.
- **PDF cart import** — extract cart rows from text-based PDFs. Scanned/image-only PDFs are not supported.
- **Row-level import feedback** — review rejected rows and their validation reasons; download rejected rows for correction.
- **Deterministic price calculation** — apply matching brand, platform, and cart rules using one shared pricing engine.
- **Decision explanations** — see matching, winning, rejected, and stacked rules.
- **Pricing reports** — generate an updated report, download it as CSV, or print/save it as PDF through the browser.
- **Channel price optimizer** — estimate per-unit profit across a seller-defined whole-rupee price range using configurable commission and fee assumptions.
- **Sample data** — load the included sample cart and rules to try the workflow.

## Getting started

### Requirements

- Node.js (18 or later recommended)
- npm

### Install and run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`).

The Vite development server also serves the local `POST /api/parse-rule` endpoint, so plain-English rule parsing works during development without a separate API process.

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check the TypeScript project and create the production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the Vitest test suite |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |

## Typical workflow

1. Start the application and load the sample data, or import your own cart and rules.
2. Add a discount rule in plain English or upload a rules CSV.
3. Review and manage the active rules. Use the impact analysis to compare pricing before and after rule changes.
4. Generate the final price to calculate the item and cart totals.
5. Review the checkout summary and rule explanations.
6. Generate an updated report, then download the CSV or use Print / Save as PDF.
7. Optionally use the channel pricing optimizer to compare estimated per-unit profit at different selling prices.

## Discount calculation logic

The calculation engine is deterministic: the same cart and rule set produce the same result.

### Rule scopes

- **Brand** — applies to cart items whose brand matches the rule target.
- **Platform** — applies to cart items whose platform matches the rule target.
- **Cart** — applies to the post-item-discount cart subtotal when its minimum cart value is met.

Brand and platform matching is case-insensitive and ignores repeated or leading/trailing whitespace. Cart rules are evaluated after item-level discounts.

### Applying rules

For each item (and separately for eligible cart-level rules):

1. Among non-stackable rules, the rule with the largest saving wins.
2. If non-stackable savings tie, priority is **brand**, then **platform**, then rule ID.
3. Stackable rules are applied in sequence: percentage rules first, then flat rules; rules of the same type are ordered by rule ID.
4. Each discount step uses whole-rupee rounding, and a discount cannot reduce a price below zero.

The cart minimum-value threshold is inclusive. The same rule-reduction logic is used for item-level and cart-level calculations.

## Plain-English rule parser

The parser is a deterministic TypeScript implementation in `api/parse-rule.ts`; it does not call an external language model.

A rule description should include:
- a discount value (for example, `10%` or `Rs.100`);
- a target brand or platform for item-level rules, or cart wording for a cart rule;
- a minimum cart value for cart-level rules.

Stackability is inferred from explicit wording such as “stackable” or “combine with other offers”. The parser limits each request to one rule and a maximum of 500 characters. Unsupported or incomplete wording returns a clarification response.

Parsed responses are validated again in the browser with Zod before a rule is added as a draft. If parsing or validation fails, existing rules and cart data are left unchanged.

Example descriptions:

```text
20% off for Natura Casa brand, stackable with other offers
Rs.100 flat discount on all Flipkart items
10% off if cart value is more than Rs.5000
```

## Import file formats

### Discount rules CSV

Required columns: `rule_id`, `scope`, `type`, and `value`.

The full supported format is:

```csv
rule_id,scope,applies_to,type,value,stackable,min_cart_value
RULE-01,platform,Amazon India,percentage,15,false,
RULE-04,cart,,percentage,10,false,4000
```

Supported scopes are `brand`, `platform`, and `cart`. Discount types are `percentage` and `flat`. Common header aliases are accepted (for example, `ruleid`, `level`, `discount_type`, `discount_value`, and `threshold`).

### Cart CSV

Required columns: `product`, `brand`, `platform`, and `base_price`. `item_id` is optional; missing IDs are generated during import.

```csv
item_id,product,brand,platform,base_price
ITEM-01,Cushion Cover,Natura Casa,Amazon India,1299
```

Common aliases are accepted (for example, `name`, `manufacturer`, `marketplace`, and `price`).

**CSV tips**
- Include a header row and at least one data row.
- Quote fields that contain commas. For example: `"Rs.1,299"`.
- Invalid rows are reported individually. Valid rows can still be imported when other rows fail.
- Duplicate item IDs within a cart file and duplicate rule IDs are rejected.

### Cart PDF

The PDF importer expects a selectable-text table with these column headings:

```text
Product | Brand | Platform | Base Price
```

Scanned or image-only PDFs without an extractable text layer are not supported. If a PDF cannot be parsed, use a text-based PDF or import the cart as CSV. A successful PDF import replaces the current cart and provides an Undo option.

### Included sample files

- `public/sample-rules.csv`
- `public/sample-cart.csv`
- `public/sample-cart.pdf`
- `sample-data/rules.csv`
- `sample-data/cart.csv`
- `sample-data/cart.pdf`

The dashboard also provides download links for sample import files.

## Channel commission and profit optimizer

The optimizer evaluates every whole-rupee selling price in the configured inclusive range. It estimates per-unit profit using:

- product cost;
- minimum and maximum selling price;
- commission threshold;
- commission rate above the threshold;
- optional commission rate at or below the threshold;
- optional other variable fees per unit.

It recommends the candidate with the highest estimated profit. If multiple candidates have the same profit, the lower selling price is selected.

**Important limitations:** commission rates and fees are user-configured assumptions, not live Amazon, Flipkart, or other marketplace rates. The optimizer does not model demand, conversion, competitor prices, sales volume, tax treatment, or future fee changes. The current comparison price is the selected cart item's post-discount price.

## Project structure

```text
.
├── api/
│   └── parse-rule.ts             # Offline plain-English rule parser and API handler
├── public/                       # Sample CSV and PDF files served by Vite
├── sample-data/                  # Source sample data
├── scripts/                      # Sample PDF generation utility
├── src/
│   ├── adapters/                 # CSV, PDF, and natural-language input adapters
│   ├── components/               # Dashboard and UI components
│   ├── core/                     # Schemas, matching, pricing engine, explanations, impact
│   ├── hooks/                    # Discount engine state and derived calculations
│   ├── utils/                    # Currency and report utilities
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── tests/                        # Unit and component tests
├── docs/checkpoints/             # Development checkpoint notes
├── index.html
├── package.json
├── vite.config.ts
└── vercel.json
```

## Tests

Run the automated test suite with:

```bash
npm test
```

The repository includes tests for the pricing engine, rule parsing, CSV imports, PDF parsing, report generation, channel pricing, and dashboard behavior.

## Production build

```bash
npm run build
npm run preview
```

The build runs TypeScript checking before Vite creates the production assets in `dist/`.

## Deploying to Vercel

The repository includes `vercel.json` with the Vite build command, `dist` output directory, and configuration for the `api/parse-rule.ts` serverless function.

1. Push the project to a Git provider such as GitHub.
2. Import the repository into Vercel.
3. Use the configured build command (`npm run build`) and output directory (`dist`).
4. Deploy.

No environment variables are required for the included deterministic parser. The same parser logic is used by the Vite development middleware and the Vercel API handler.

## Configuration and environment variables

No `.env` file, API key, or external service credentials are required for the current implementation. `.env.example` is included to document this.

## Known limitations

- The natural-language parser intentionally supports a focused set of rule patterns; it may request clarification for wording it cannot confidently interpret.
- The parser handles one rule per request.
- PDF import requires selectable text and the expected table headings; scanned PDFs are unsupported.
- Marketplace commission values are not fetched live and must be configured by the user.
- Profit optimization is a per-unit estimate and does not forecast demand or sales volume.

## Technology stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zod
- PapaParse
- pdfjs-dist
- Vitest and Testing Library
- Vercel serverless functions
