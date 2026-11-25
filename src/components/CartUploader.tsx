import { FileText, Loader2, ShoppingCart } from 'lucide-react';
import type { ImportReport } from '../adapters/contracts';
import ImportReportCard from './ImportReportCard';

export default function CartUploader({ onFile, loading, report, onDownloadRejected }: { onFile: (f: File) => void; loading: boolean; report: ImportReport | null; onDownloadRejected: () => void }) {
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; };
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="btn-ghost cursor-pointer">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}Upload Cart CSV
          <input type="file" accept=".csv,text/csv" className="sr-only" data-testid="cart-csv-file" onChange={pick} />
        </label>
        <label className="btn-ghost cursor-pointer">
          <FileText className="h-4 w-4" />Upload Cart PDF
          <input type="file" accept=".pdf,application/pdf" className="sr-only" data-testid="cart-pdf-file" onChange={pick} />
        </label>
      </div>
      <p className="mt-1 text-xs"><a className="text-navy-600 underline" href="/sample-cart.csv" download>Download sample cart.csv</a> · <a className="text-navy-600 underline" href="/sample-cart.pdf" download>sample cart.pdf</a></p>
      {report && <ImportReportCard report={report} onDownload={onDownloadRejected} />}
    </div>
  );
}
