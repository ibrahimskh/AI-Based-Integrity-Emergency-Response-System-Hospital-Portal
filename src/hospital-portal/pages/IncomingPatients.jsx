import { useEffect, useMemo, useState } from 'react';
import { Search, Eye, Check, X as XIcon } from 'lucide-react';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import Badge from '../../shared/components/Badge';
import { Input, Select } from '../../shared/components/Field';
import { Spinner, EmptyState } from '../../shared/components/States';
import { useAuth } from '../../shared/context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';
import { dbSubscribe, dbUpdate, dbGetById } from '../../shared/data/db';
import PatientDetailsModal from '../components/PatientDetailsModal';

export default function IncomingPatients() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const unsub = dbSubscribe('patients', (list) => {
      setPatients(list.filter((p) => p.assignedHospitalId === user.hospitalId));
      setLoading(false);
    });
    return unsub;
  }, []);

  // keep the open modal's data in sync with live updates
  useEffect(() => {
    if (selected) setSelected(patients.find((p) => p.id === selected.id) || null);
  }, [patients]);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchesQuery = !query || (p.name || '').toLowerCase().includes(query.toLowerCase()) || (p.id || '').toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesQuery && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [patients, query, statusFilter]);

  const quickAccept = async (p) => {
    try {
      await dbUpdate('patients', p.id, { status: 'arrived', timeline: [...(p.timeline || []), { ts: new Date().toISOString(), event: 'Accepted by hospital staff' }] });
      toast.success(`${p.name} accepted.`);
    } catch { toast.error('Could not accept patient.'); }
  };

  const quickReject = async (p) => {
    try {
      const hospital = await dbGetById('hospitals', p.assignedHospitalId);
      const updates = {};
      if (p.assignedBed && hospital) updates.availableBeds = Math.min(hospital.totalBeds, hospital.availableBeds + 1);
      if (p.assignedICU && hospital) updates.availableIcuBeds = Math.min(hospital.icuBeds, hospital.availableIcuBeds + 1);
      if (hospital && Object.keys(updates).length) await dbUpdate('hospitals', hospital.id, updates);
      await dbUpdate('patients', p.id, { status: 'cancelled', timeline: [...(p.timeline || []), { ts: new Date().toISOString(), event: 'Rejected by hospital staff' }] });
      toast.success(`${p.name} rejected.`);
    } catch { toast.error('Could not reject patient.'); }
  };

  if (loading) return <Spinner label="Loading incoming patients…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by patient name or ID…" className="pl-9" />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-56">
          <option value="all">All statuses</option>
          {['incoming', 'arrived', 'admitted', 'emergency_treatment', 'icu', 'discharged', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </Select>
      </div>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <EmptyState title="No matching patients" description="Try adjusting your search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-lifeline-sub border-b border-lifeline-border">
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Emergency</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">ETA</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lifeline-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-lifeline-sub">ID: {p.id}</p>
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px]">{p.emergencyType}</td>
                    <td className="px-5 py-3.5"><Badge value={p.severity} /></td>
                    <td className="px-5 py-3.5">{p.eta != null ? `${p.eta} min` : '—'}</td>
                    <td className="px-5 py-3.5"><Badge value={p.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        {p.status === 'incoming' && (
                          <>
                            <button title="Accept" onClick={() => quickAccept(p)} className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Check size={15} /></button>
                            <button title="Reject" onClick={() => quickReject(p)} className="p-1.5 rounded-md bg-red-50 text-lifeline-red hover:bg-red-100"><XIcon size={15} /></button>
                          </>
                        )}
                        <Button size="sm" variant="outline" icon={Eye} onClick={() => setSelected(p)}>View</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PatientDetailsModal patient={selected} onClose={() => setSelected(null)} onChanged={() => {}} />
    </div>
  );
}
