import { CheckCircle2, Download, XCircle } from 'lucide-react';
import type { ImportReport } from '../adapters/contracts';

export default function ImportReportCard({ report, onDownload }: { report: ImportReport; onDownload: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" data-testid="import-report">
      <p className="font-medium text-slate-700">{report.source} import</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <span>Total rows: <b>{report.total}</b></span>
        <span className="text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />Imported: <b>{report.imported}</b></span>
        <span className={report.failed ? 'text-red-600' : 'text-slate-500'}><XCircle className="mr-1 inline h-4 w-4" />Failed: <b>{report.failed}</b></span>
      </div>
      {report.issues.length > 0 && (
        <>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto rounded-lg bg-white p-2 text-xs text-red-700">
            {report.issues.map(i => <li key={i.row}><b>Row {i.row}:</b> {i.reason}</li>)}
          </ul>
          <button className="btn-ghost mt-2 !py-1 text-xs" onClick={onDownload}><Download className="h-3.5 w-3.5" />Download rejected rows (CSV)</button>
        </>
      )}
    </div>
  );
}
