const MAP = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-amber-100 text-amber-700',
  moderate: 'bg-blue-100 text-blue-700',
  low: 'bg-slate-100 text-slate-600',

  incoming: 'bg-blue-100 text-blue-700',
  arrived: 'bg-amber-100 text-amber-700',
  admitted: 'bg-emerald-100 text-emerald-700',
  emergency_treatment: 'bg-red-100 text-red-700',
  icu: 'bg-purple-100 text-purple-700',
  discharged: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-slate-200 text-slate-500 line-through',

  available: 'bg-emerald-100 text-emerald-700',
  assigned: 'bg-blue-100 text-blue-700',
  en_route: 'bg-amber-100 text-amber-700',
  at_hospital: 'bg-purple-100 text-purple-700',
  returning: 'bg-slate-100 text-slate-600',
  offline: 'bg-slate-200 text-slate-500',

  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-200 text-slate-500',
  disabled: 'bg-red-100 text-red-700',

  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',

  read: 'bg-slate-100 text-slate-500',
  unread: 'bg-blue-100 text-blue-700',

  blood_critical: 'bg-red-100 text-red-700',
  blood_low: 'bg-amber-100 text-amber-700',
  blood_adequate: 'bg-blue-100 text-blue-700',
  blood_good: 'bg-emerald-100 text-emerald-700',
};

export default function Badge({ value, label }) {
  const key = String(value || '').toLowerCase().replace(/\s+/g, '_');
  const cls = MAP[key] || 'bg-slate-100 text-slate-600';
  const text = label || String(value || '').replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      {text}
    </span>
  );
}
