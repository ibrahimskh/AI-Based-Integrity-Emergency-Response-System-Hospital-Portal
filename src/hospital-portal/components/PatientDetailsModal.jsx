import { useState } from 'react';
import { Phone, MapPin, Clock, Droplet, Ambulance, History } from 'lucide-react';
import { Modal, ConfirmDialog } from '../../shared/components/Modal';
import Button from '../../shared/components/Button';
import Badge from '../../shared/components/Badge';
import { Field, Input, Select } from '../../shared/components/Field';
import { useToast } from '../../shared/context/ToastContext';
import { dbUpdate, dbGetById } from '../../shared/data/db';
import { fmtDateTime } from '../../shared/utils/format';

const STATUSES = ['incoming', 'arrived', 'admitted', 'emergency_treatment', 'icu', 'discharged', 'cancelled'];

export default function PatientDetailsModal({ patient, onClose, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [bedInput, setBedInput] = useState(patient?.assignedBed || '');
  const [nextStatus, setNextStatus] = useState(patient?.status || 'incoming');
  const [confirmReject, setConfirmReject] = useState(false);

  if (!patient) return null;

  const addTimeline = (event) => [...(patient.timeline || []), { ts: new Date().toISOString(), event }];

  const releaseResources = async (hospital, patch) => {
    const updates = {};
    if (patient.assignedBed) updates.availableBeds = Math.min(hospital.totalBeds, hospital.availableBeds + 1);
    if (patient.assignedICU) updates.availableIcuBeds = Math.min(hospital.icuBeds, hospital.availableIcuBeds + 1);
    if (Object.keys(updates).length) await dbUpdate('hospitals', hospital.id, updates);
  };

  const runAction = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      onChanged();
    } catch (err) {
      toast.error(err.message || 'Action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = () => runAction(async () => {
    await dbUpdate('patients', patient.id, { status: 'arrived', timeline: addTimeline('Accepted by hospital staff') });
  }, `${patient.name} accepted. Marked as arrived.`);

  const handleReject = () => runAction(async () => {
    const hospital = await dbGetById('hospitals', patient.assignedHospitalId);
    if (hospital) await releaseResources(hospital);
    await dbUpdate('patients', patient.id, { status: 'cancelled', timeline: addTimeline('Rejected by hospital staff') });
    setConfirmReject(false);
  }, `${patient.name} was rejected.`);

  const handleMarkArrived = () => runAction(async () => {
    await dbUpdate('patients', patient.id, { status: 'arrived', timeline: addTimeline('Marked arrived at hospital') });
  }, 'Patient marked as arrived.');

  const handleAssignBed = () => runAction(async () => {
    if (!bedInput.trim()) throw new Error('Enter a bed number first.');
    const hospital = await dbGetById('hospitals', patient.assignedHospitalId);
    if (!hospital) throw new Error('Hospital record not found.');
    if (!patient.assignedBed) {
      if (hospital.availableBeds <= 0) throw new Error('No available beds to assign.');
      await dbUpdate('hospitals', hospital.id, { availableBeds: hospital.availableBeds - 1 });
    }
    await dbUpdate('patients', patient.id, { assignedBed: bedInput.trim(), status: 'admitted', timeline: addTimeline(`Assigned bed ${bedInput.trim()}`) });
  }, `Bed ${bedInput.trim()} assigned.`);

  const handleAssignICU = () => runAction(async () => {
    const hospital = await dbGetById('hospitals', patient.assignedHospitalId);
    if (!hospital) throw new Error('Hospital record not found.');
    if (!patient.assignedICU) {
      if (hospital.availableIcuBeds <= 0) throw new Error('No ICU beds available.');
      await dbUpdate('hospitals', hospital.id, { availableIcuBeds: hospital.availableIcuBeds - 1 });
      await dbUpdate('patients', patient.id, { assignedICU: true, status: 'icu', timeline: addTimeline('Assigned to ICU') });
    } else {
      await dbUpdate('hospitals', hospital.id, { availableIcuBeds: hospital.availableIcuBeds + 1 });
      await dbUpdate('patients', patient.id, { assignedICU: false, timeline: addTimeline('Released from ICU') });
    }
  }, patient.assignedICU ? 'Patient released from ICU.' : 'Patient assigned to ICU.');

  const handleUpdateStatus = () => runAction(async () => {
    const patch = { status: nextStatus, timeline: addTimeline(`Status updated to ${nextStatus.replace(/_/g, ' ')}`) };
    if (['discharged', 'cancelled'].includes(nextStatus)) {
      const hospital = await dbGetById('hospitals', patient.assignedHospitalId);
      if (hospital) await releaseResources(hospital);
      patch.assignedBed = null;
      patch.assignedICU = false;
    }
    await dbUpdate('patients', patient.id, patch);
  }, 'Patient status updated.');

  return (
    <>
      <Modal open={!!patient} onClose={onClose} title={`Patient — ${patient.name}`} size="lg" footer={
        <Button variant="outline" onClick={onClose}>Close</Button>
      }>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge value={patient.severity} />
            <Badge value={patient.status} />
            {patient.assignedICU && <Badge value="icu" label="In ICU" />}
          </div>

          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Info label="Patient ID" value={patient.id} />
            <Info label="Age" value={patient.age} />
            <Info label="Emergency Type" value={patient.emergencyType} />
            <Info label="Blood Group" icon={Droplet} value={patient.bloodGroup} />
            <Info label="Ambulance ID" icon={Ambulance} value={patient.ambulanceId || '—'} />
            <Info label="ETA" icon={Clock} value={patient.eta != null ? `${patient.eta} min` : '—'} />
            <Info label="Current Location" icon={MapPin} value={patient.location} />
            <Info label="Assigned Bed" value={patient.assignedBed || 'Not assigned'} />
            <Info label="Created" value={fmtDateTime(patient.createdAt)} />
          </div>

          <div className="border-t border-lifeline-border pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-lifeline-sub mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {patient.status === 'incoming' && (
                <>
                  <Button size="sm" variant="success" onClick={handleAccept} loading={busy}>Accept Patient</Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirmReject(true)} disabled={busy}>Reject</Button>
                </>
              )}
              {['incoming', 'arrived'].includes(patient.status) && (
                <Button size="sm" variant="outline" onClick={handleMarkArrived} loading={busy}>Mark Arrived</Button>
              )}
              <Button size="sm" variant={patient.assignedICU ? 'outline' : 'dark'} onClick={handleAssignICU} loading={busy}>
                {patient.assignedICU ? 'Release ICU Bed' : 'Assign ICU'}
              </Button>
            </div>
          </div>

          <div className="border-t border-lifeline-border pt-4 grid sm:grid-cols-2 gap-4">
            <Field label="Assign Bed Number">
              <div className="flex gap-2">
                <Input value={bedInput} onChange={(e) => setBedInput(e.target.value)} placeholder="e.g. 14B" />
                <Button size="md" onClick={handleAssignBed} loading={busy}>Assign</Button>
              </div>
            </Field>
            <Field label="Update Status">
              <div className="flex gap-2">
                <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </Select>
                <Button size="md" variant="dark" onClick={handleUpdateStatus} loading={busy}>Update</Button>
              </div>
            </Field>
          </div>

          <div className="border-t border-lifeline-border pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-lifeline-sub mb-3 flex items-center gap-1.5"><History size={14} /> Timeline</p>
            <ul className="space-y-2">
              {(patient.timeline || []).slice().reverse().map((t, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-lifeline-red mt-1.5 shrink-0" />
                  <span><span className="font-medium">{t.event}</span> <span className="text-lifeline-sub">· {fmtDateTime(t.ts)}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmReject}
        onClose={() => setConfirmReject(false)}
        onConfirm={handleReject}
        title={`Reject ${patient.name}?`}
        description="This will cancel the incoming case and release any reserved beds. This action can't be undone."
        confirmLabel="Reject Patient"
        loading={busy}
      />
    </>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-lifeline-sub mb-0.5 flex items-center gap-1">
        {Icon && <Icon size={12} />} {label}
      </p>
      <p className="font-medium text-lifeline-ink">{value}</p>
    </div>
  );
}
