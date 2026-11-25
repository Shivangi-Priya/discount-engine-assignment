import { AlertTriangle, X } from 'lucide-react';
export default function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{message}</p>
      <button aria-label="Dismiss error" onClick={onDismiss} className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
    </div>
  );
}
