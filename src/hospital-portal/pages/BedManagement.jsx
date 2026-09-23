import { useEffect, useState } from 'react';
import { Save, RotateCcw, BedDouble } from 'lucide-react';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import { Field, Input } from '../../shared/components/Field';
import { Spinner, ErrorState } from '../../shared/components/States';
import { useAuth } from '../../shared/context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';
import { dbGetById, dbUpdate } from '../../shared/data/db';
import { validateBedForm } from '../../shared/utils/validation';

const emptyForm = { totalBeds: '', availableBeds: '', icuBeds: '', availableIcuBeds: '' };

export default function BedManagement() {
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('loading');
  const [hospital, setHospital] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setStatus('loading');
    try {
      const h = await dbGetById('hospitals', user.hospitalId);
      setHospital(h);
      setForm({ totalBeds: h.totalBeds, availableBeds: h.availableBeds, icuBeds: h.icuBeds, availableIcuBeds: h.availableIcuBeds });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => { load(); }, []);

  const dirty = hospital && (
    Number(form.totalBeds) !== hospital.totalBeds ||
    Number(form.availableBeds) !== hospital.availableBeds ||
    Number(form.icuBeds) !== hospital.icuBeds ||
    Number(form.availableIcuBeds) !== hospital.availableIcuBeds
  );

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleCancel = () => {
    setForm({ totalBeds: hospital.totalBeds, availableBeds: hospital.availableBeds, icuBeds: hospital.icuBeds, availableIcuBeds: hospital.availableIcuBeds });
    setErrors({});
  };

  const handleSave = async () => {
    const e = validateBedForm(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const updated = await dbUpdate('hospitals', hospital.id, {
        totalBeds: Number(form.totalBeds), availableBeds: Number(form.availableBeds),
        icuBeds: Number(form.icuBeds), availableIcuBeds: Number(form.availableIcuBeds),
      });
      setHospital(updated);
      toast.success('Bed availability updated. Dashboard statistics refreshed.');
    } catch {
      toast.error('Could not update beds. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const quickAdjust = async (field, delta) => {
    const next = Math.max(0, (form[field] === '' ? hospital[field] : Number(form[field])) + delta);
    setForm((f) => ({ ...f, [field]: next }));
  };

  if (status === 'loading') return <Spinner label="Loading bed data…" />;
  if (status === 'error') return <ErrorState onRetry={load} />;

  const occupied = Math.max(0, (Number(form.totalBeds) || 0) - (Number(form.availableBeds) || 0));

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <BedDouble size={20} className="text-lifeline-red" />
          <h3 className="font-bold text-lg">General Ward Beds</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Total Beds" required error={errors.totalBeds}>
            <Input type="number" min={0} value={form.totalBeds} onChange={handleChange('totalBeds')} error={errors.totalBeds} />
          </Field>
          <Field label="Available Beds" required error={errors.availableBeds}>
            <Input type="number" min={0} value={form.availableBeds} onChange={handleChange('availableBeds')} error={errors.availableBeds} />
          </Field>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Button variant="outline" size="sm" onClick={() => quickAdjust('availableBeds', -1)}>− Mark 1 Occupied</Button>
          <Button variant="outline" size="sm" onClick={() => quickAdjust('availableBeds', 1)}>+ Mark 1 Available</Button>
        </div>
        <p className="text-sm text-lifeline-sub mt-3">Currently occupied: <span className="font-bold text-lifeline-ink">{occupied}</span> beds</p>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-5">
          <BedDouble size={20} className="text-lifeline-red" />
          <h3 className="font-bold text-lg">ICU Beds</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Total ICU Beds" required error={errors.icuBeds}>
            <Input type="number" min={0} value={form.icuBeds} onChange={handleChange('icuBeds')} error={errors.icuBeds} />
          </Field>
          <Field label="Available ICU Beds" required error={errors.availableIcuBeds}>
            <Input type="number" min={0} value={form.availableIcuBeds} onChange={handleChange('availableIcuBeds')} error={errors.availableIcuBeds} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-0 bg-lifeline-bg py-2">
        <Button variant="outline" icon={RotateCcw} onClick={handleCancel} disabled={!dirty || saving}>Cancel</Button>
        <Button icon={Save} onClick={handleSave} loading={saving} disabled={!dirty}>Save Changes</Button>
      </div>
    </div>
  );
}
