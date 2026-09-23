import { useEffect, useState } from 'react';
import { Save, Building2 } from 'lucide-react';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import { Field, Input, Textarea } from '../../shared/components/Field';
import { Spinner, ErrorState } from '../../shared/components/States';
import { useAuth } from '../../shared/context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';
import { dbGetById, dbUpdate } from '../../shared/data/db';
import { validateHospitalForm } from '../../shared/utils/validation';

export default function HospitalProfile() {
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('loading');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setStatus('loading');
    try {
      const h = await dbGetById('hospitals', user.hospitalId);
      setForm(h);
      setStatus('ready');
    } catch { setStatus('error'); }
  };

  useEffect(() => { load(); }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validateHospitalForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const updated = await dbUpdate('hospitals', form.id, {
        name: form.name, address: form.address, contact: form.contact,
        emergencyContact: form.emergencyContact, edInfo: form.edInfo,
      });
      setForm(updated);
      toast.success('Hospital profile updated.');
    } catch {
      toast.error('Could not save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') return <Spinner label="Loading profile…" />;
  if (status === 'error') return <ErrorState onRetry={load} />;

  return (
    <form onSubmit={handleSave} className="max-w-2xl">
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Building2 size={20} className="text-lifeline-red" />
          <h3 className="font-bold text-lg">Hospital Information</h3>
        </div>
        <Field label="Hospital Name" required error={errors.name}>
          <Input value={form.name} onChange={set('name')} error={errors.name} />
        </Field>
        <Field label="Address" required error={errors.address}>
          <Textarea value={form.address} onChange={set('address')} error={errors.address} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Contact Number" required error={errors.contact}>
            <Input value={form.contact} onChange={set('contact')} error={errors.contact} />
          </Field>
          <Field label="Emergency Contact">
            <Input value={form.emergencyContact || ''} onChange={set('emergencyContact')} />
          </Field>
        </div>
        <Field label="Emergency Department Information" hint="Trauma level, ED name, etc.">
          <Input value={form.edInfo || ''} onChange={set('edInfo')} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4 pt-1">
          <Field label="Total Beds" hint="Update from Bed Management">
            <Input value={form.totalBeds} disabled />
          </Field>
          <Field label="ICU Beds" hint="Update from Bed Management">
            <Input value={form.icuBeds} disabled />
          </Field>
        </div>
        <Button type="submit" icon={Save} loading={saving}>Save Profile</Button>
      </Card>
    </form>
  );
}
