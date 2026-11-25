# CP3 — Hook, report util, UI   (~85% built / ~15% remaining)
Built: hooks/useDiscountEngine.ts, utils/report.ts (sections A-E, CSV with BOM, printable HTML), all components, Tailwind theme.
Fixed: `File.text()` failing silently -> `readFileText` with FileReader fallback.
Rule editor footer: Confirm & Save · Save & Generate Final Price · Save & Generate Report · Cancel. Impact uses core/impact.ts (real engine).
