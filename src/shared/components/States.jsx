import { Loader2, Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-lifeline-sub">
      <Loader2 size={28} className="animate-spin text-lifeline-red" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', description, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-1">
        <Icon size={20} className="text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-lifeline-ink">{title}</p>
      {description && <p className="text-sm text-lifeline-sub max-w-sm">{description}</p>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle size={20} className="text-lifeline-red" />
      </div>
      <p className="text-sm font-semibold text-lifeline-ink">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRetry}>Retry</Button>
      )}
    </div>
  );
}
