import { useEffect, useMemo, useState } from 'react';
import { Droplet, Save, RotateCcw, Minus, Plus, AlertTriangle, Clock } from 'lucide-react';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import Badge from '../../shared/components/Badge';
import { Spinner, ErrorState } from '../../shared/components/States';
import { useAuth } from '../../shared/context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';
import { dbGetAll, dbUpdate } from '../../shared/data/db';
import { timeAgo } from '../../shared/utils/format';
import {
  BLOOD_GROUPS, UNIVERSAL_DONOR, UNIVERSAL_RECIPIENT,
  CAPACITY_PER_GROUP, getBloodStatus, BLOOD_STATUS_LABEL,
} from '../../shared/data/bloodGroups';

const STATUS_RING = {
  critical: 'border-lifeline-red ring-1 ring-lifeline-red/30',
  low: 'border-amber-400 ring-1 ring-amber-300/40',
  adequate: 'border-lifeline-border',
  good: 'border-lifeline-border',
};

const STATUS_DROP = {
  critical: 'text-lifeline-red bg-red-50',
  low: 'text-amber-600 bg-amber-50',
  adequate: 'text-blue-600 bg-blue-50',
  good: 'text-emerald-600 bg-emerald-50',
};

const BAR_COLOR = {
  critical: 'bg-lifeline-red',
  low: 'bg-amber-500',
  adequate: 'bg-blue-500',
  good: 'bg-emerald-500',
};

export default function BloodAvailability() {
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('loading');
  const [records, setRecords] = useState([]); // as loaded from db (source of truth)
  const [form, setForm] = useState({});       // group -> units (editable draft)
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setStatus('loading');
    try {
      const all = await dbGetAll('blood_inventory');
      const mine = all.filter((r) => r.hospitalId === user.hospitalId);
      setRecords(mine);
      setForm(Object.fromEntries(mine.map((r) => [r.group, r.units])));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => { load(); }, []);

  const dirty = useMemo(
    () => records.some((r) => Number(form[r.group]) !== r.units),
    [records, form],
  );

  const totalUnits = useMemo(
    () => Object.values(form).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [form],
  );

  const criticalGroups = useMemo(
    () => BLOOD_GROUPS.filter((g) => getBloodStatus(Number(form[g]) || 0) === 'critical'),
    [form],
  );

  const lastUpdated = useMemo(() => {
    const dates = records.map((r) => r.lastDonation).filter(Boolean).sort().reverse();
    return dates[0] || null;
  }, [records]);

  const adjust = (group, delta) => {
    setForm((f) => ({ ...f, [group]: Math.max(0, (Number(f[group]) || 0) + delta) }));
  };

  const setUnits = (group, value) => {
    const n = value === '' ? '' : Math.max(0, Math.floor(Number(value)));
    setForm((f) => ({ ...f, [group]: n }));
  };

  const handleCancel = () => {
    setForm(Object.fromEntries(records.map((r) => [r.group, r.units])));
  };

  const handleSave = async () => {
    const changed = records.filter((r) => Number(form[r.group]) !== r.units);
    if (!changed.length) return;
    setSaving(true);
    try {
      await Promise.all(changed.map((r) =>
        dbUpdate('blood_inventory', r.id, { units: Number(form[r.group]) || 0 })
      ));
      toast.success(`Blood stock updated for ${changed.length} group${changed.length > 1 ? 's' : ''}.`);
      await load();
    } catch {
      toast.error('Could not update blood stock. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') return <Spinner label="Loading blood bank inventory…" />;
  if (status === 'error') return <ErrorState onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-2 rounded-lg inline-flex items-center gap-1.5">
        <span className="demo-badge">DEMO DATA</span> — connect Firebase to replace with live blood bank records.
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-lifeline-border bg-white shadow-sm p-5">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-lifeline-red flex items-center justify-center mb-4">
            <Droplet size={18} />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-lifeline-sub mb-1">Total Units in Stock</p>
          <p className="text-3xl font-extrabold">{totalUnits}</p>
        </div>

        <div className={`rounded-2xl border shadow-sm p-5 ${criticalGroups.length ? 'bg-lifeline-red text-white border-lifeline-red' : 'bg-white border-lifeline-border'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${criticalGroups.length ? 'bg-white/20' : 'bg-red-50 text-lifeline-red'}`}>
            <AlertTriangle size={18} />
          </div>
          <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${criticalGroups.length ? 'text-white/80' : 'text-lifeline-sub'}`}>Groups Critical</p>
          <p className="text-3xl font-extrabold">{criticalGroups.length}</p>
          {criticalGroups.length > 0 && (
            <p className="text-xs text-white/90 mt-1 font-medium">{criticalGroups.join(', ')}</p>
          )}
        </div>

        <div className="rounded-2xl border border-lifeline-border bg-white shadow-sm p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Droplet size={18} />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-lifeline-sub mb-1">O- (Universal Donor)</p>
          <p className="text-3xl font-extrabold">{form[UNIVERSAL_DONOR] ?? '—'}</p>
        </div>

        <div className="rounded-2xl border border-lifeline-border bg-white shadow-sm p-5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-lifeline-ink flex items-center justify-center mb-4">
            <Clock size={18} />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-lifeline-sub mb-1">Last Donation Logged</p>
          <p className="text-lg font-extrabold">{lastUpdated ? timeAgo(lastUpdated) : '—'}</p>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Droplet size={20} className="text-lifeline-red" />
          <h3 className="font-bold text-lg">Blood Group Inventory</h3>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BLOOD_GROUPS.map((group) => {
            const units = Number(form[group]) || 0;
            const st = getBloodStatus(units);
            const pct = Math.min(100, Math.round((units / CAPACITY_PER_GROUP) * 100));
            const record = records.find((r) => r.group === group);

            return (
              <div key={group} className={`rounded-xl border bg-white p-4 flex flex-col ${STATUS_RING[st]}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${STATUS_DROP[st]}`}>
                      <Droplet size={16} fill="currentColor" />
                    </div>
                    <div>
                      <p className="font-extrabold text-lg leading-none">{group}</p>
                      {group === UNIVERSAL_DONOR && <p className="text-[10px] font-bold text-lifeline-sub uppercase tracking-wide mt-1">Universal Donor</p>}
                      {group === UNIVERSAL_RECIPIENT && <p className="text-[10px] font-bold text-lifeline-sub uppercase tracking-wide mt-1">Universal Recipient</p>}
                    </div>
                  </div>
                  <Badge value={`blood_${st}`} label={BLOOD_STATUS_LABEL[st]} />
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                  <div className={`h-full rounded-full ${BAR_COLOR[st]}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => adjust(group, -1)}
                    className="w-8 h-8 shrink-0 rounded-lg border border-lifeline-border flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
                    disabled={units <= 0}
                    aria-label={`Remove one unit of ${group}`}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={form[group] ?? 0}
                    onChange={(e) => setUnits(group, e.target.value)}
                    className="w-full text-center font-bold text-sm rounded-lg border border-lifeline-border px-2 py-1.5 outline-none focus:border-lifeline-red focus:ring-2 focus:ring-lifeline-red/20"
                  />
                  <button
                    type="button"
                    onClick={() => adjust(group, 1)}
                    className="w-8 h-8 shrink-0 rounded-lg border border-lifeline-border flex items-center justify-center hover:bg-slate-50"
                    aria-label={`Add one unit of ${group}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <p className="text-xs text-lifeline-sub">
                  {units} of {CAPACITY_PER_GROUP} units capacity
                </p>
                {record?.lastDonation && (
                  <p className="text-[11px] text-lifeline-sub mt-1">Last donation {timeAgo(record.lastDonation)}</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-0 bg-lifeline-bg py-2">
        <Button variant="outline" icon={RotateCcw} onClick={handleCancel} disabled={!dirty || saving}>Cancel</Button>
        <Button icon={Save} onClick={handleSave} loading={saving} disabled={!dirty}>Save Changes</Button>
      </div>
    </div>
  );
}
