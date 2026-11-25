import { Download, FileBarChart, Printer, Receipt } from 'lucide-react';
import type { Engine } from '../hooks/useDiscountEngine';

export default function ReportGenerator({ e }: { e: Engine }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-accent" onClick={e.generateFinal}><Receipt className="h-4 w-4" />Generate Final Price</button>
        <button className="btn-primary" onClick={e.generateReport}><FileBarChart className="h-4 w-4" />Generate Updated Report</button>
        <button className="btn-ghost" onClick={e.downloadCsvReport}><Download className="h-4 w-4" />Download CSV Report</button>
        <button className="btn-ghost" onClick={e.printReport}><Printer className="h-4 w-4" />Print / Save as PDF</button>
      </div>
      {!e.generated && <p className="mt-2 text-sm text-amber-700">Generate the final price first; reports are built from that calculation.</p>}
      {e.report && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm" data-testid="report-preview">
          <p className="font-semibold text-navy-900">{e.report.title}</p>
          <p className="text-xs text-slate-500">Generated {e.report.generatedAt} · {e.report.ruleCount} active rules · {e.report.itemCount} cart items</p>
          <div className="mt-2 overflow-x-auto"><table className="min-w-full text-xs">
            <thead><tr>{['Product', 'Matching', 'Winning rule', 'Rejected', 'Stackable', 'Discount', 'Final'].map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-200">{e.report.itemRows.map(i => (
              <tr key={i.itemId} className="align-top"><td className="td">{i.product}</td><td className="td">{i.matching}</td><td className="td">{i.winning}</td><td className="td">{i.rejected}</td><td className="td">{i.stacked}</td><td className="td">{i.totalDiscount}</td><td className="td font-semibold">{i.finalPrice}</td></tr>))}</tbody>
          </table></div>
          <p className="mt-2 text-xs text-slate-600">Final payable: <b>Rs.{e.report.result.finalTotal.toLocaleString('en-IN')}</b> · Total savings: Rs.{e.report.result.totalSavings.toLocaleString('en-IN')}</p>
        </div>
      )}
    </div>
  );
}
