import { FileSpreadsheet, Loader2 } from 'lucide-react';
import type { ImportReport } from '../adapters/contracts';
import ImportReportCard from './ImportReportCard';

export default function RuleUploader({ onFile, loading, report, onDownloadRejected }: { onFile: (f: File) => void; loading: boolean; report: ImportReport | null; onDownloadRejected: () => void }) {
  return (
    <div>
      <label className="btn-ghost w-full cursor-pointer">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
        Upload Rules CSV
        <input type="file" accept=".csv,text/csv" className="sr-only" data-testid="rules-file"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      </label>
      <a className="mt-1 block text-xs text-navy-600 underline" href="/sample-rules.csv" download>Download sample rules.csv</a>
      {report && <ImportReportCard report={report} onDownload={onDownloadRejected} />}
    </div>
  );
}
