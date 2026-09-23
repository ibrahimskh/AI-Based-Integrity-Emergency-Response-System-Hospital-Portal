export default function StatCard({ icon: Icon, label, value, trend, tone = 'default', alert = false }) {
  const tones = {
    default: 'bg-slate-100 text-lifeline-ink',
    red: 'bg-red-50 text-lifeline-red',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
  };
  return (
    <div className={`rounded-2xl border shadow-sm p-5 ${alert ? 'bg-lifeline-red text-white border-lifeline-red' : 'bg-white border-lifeline-border'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alert ? 'bg-white/20' : tones[tone]}`}>
          {Icon && <Icon size={18} />}
        </div>
        {trend && <span className={`text-xs font-semibold ${alert ? 'text-white/90' : 'text-emerald-600'}`}>{trend}</span>}
      </div>
      <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${alert ? 'text-white/80' : 'text-lifeline-sub'}`}>{label}</p>
      <p className="text-3xl font-extrabold">{value}</p>
    </div>
  );
}
