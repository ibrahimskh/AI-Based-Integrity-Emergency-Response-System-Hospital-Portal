import { useEffect, useMemo, useState } from 'react';
import { Phone, MapPin, CheckCircle2 } from 'lucide-react';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import Badge from '../../shared/components/Badge';
import { Select } from '../../shared/components/Field';
import { Modal } from '../../shared/components/Modal';
import { Spinner, EmptyState } from '../../shared/components/States';
import { useAuth } from '../../shared/context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';
import { dbSubscribe, dbUpdate } from '../../shared/data/db';

const STATUSES = ['available', 'assigned', 'en_route', 'at_hospital', 'returning', 'offline'];

export default function AmbulanceArrivals() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [ambulances, setAmbulances] = useState([]);
  const [patients, setPatients] = useState([]);
  const [routeView, setRouteView] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const u1 = dbSubscribe('ambulances', (list) => { setAmbulances(list); setLoading(false); });
    const u2 = dbSubscribe('patients', (list) => setPatients(list.filter((p) => p.assignedHospitalId === user.hospitalId)));
    return () => { u1(); u2(); };
  }, []);

  const rows = useMemo(() => ambulances.map((a) => ({
    ...a,
    patient: patients.find((p) => p.ambulanceId === a.id) || null,
  })), [ambulances, patients]);

  const setStatus = async (a, status) => {
    setBusyId(a.id);
    try {
      await dbUpdate('ambulances', a.id, { status, lastUpdated: new Date().toISOString() });
      toast.success(`${a.id} status updated to ${status.replace(/_/g, ' ')}.`);
    } catch {
      toast.error('Could not update ambulance status.');
    } finally {
      setBusyId(null);
    }
  };

  const acceptArrival = (a) => setStatus(a, 'at_hospital');

  if (loading) return <Spinner label="Loading ambulance fleet…" />;

  return (
    <div className="space-y-4">
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState title="No ambulances tracked" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-lifeline-sub border-b border-lifeline-border">
                  <th className="px-5 py-3">Ambulance</th>
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">ETA</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lifeline-border">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-semibold">{a.id}</td>
                    <td className="px-5 py-3.5">{a.driverName}</td>
                    <td className="px-5 py-3.5">{a.patient ? a.patient.name : <span className="text-lifeline-sub">Unassigned</span>}</td>
                    <td className="px-5 py-3.5">{a.patient ? <Badge value={a.patient.severity} /> : '—'}</td>
                    <td className="px-5 py-3.5">{a.eta != null ? `${a.eta} min` : '—'}</td>
                    <td className="px-5 py-3.5">
                      <Select value={a.status} onChange={(e) => setStatus(a, e.target.value)} disabled={busyId === a.id} className="!py-1 !text-xs w-36">
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </Select>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        {a.status === 'en_route' && (
                          <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => acceptArrival(a)} loading={busyId === a.id}>Accept</Button>
                        )}
                        <a href={`tel:${a.driverPhone.replace(/\s+/g, '')}`}>
                          <Button size="sm" variant="outline" icon={Phone}>Contact</Button>
                        </a>
                        <Button size="sm" variant="outline" icon={MapPin} onClick={() => setRouteView(a)}>Route</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!routeView} onClose={() => setRouteView(null)} title={`Live Location — ${routeView?.id}`} footer={<Button variant="outline" onClick={() => setRouteView(null)}>Close</Button>}>
        <div className="bg-slate-900 text-white rounded-xl p-6 text-center">
          <MapPin size={28} className="mx-auto mb-2 text-lifeline-red" />
          <p className="font-semibold">{routeView?.currentLocation}</p>
          <p className="text-xs text-slate-400 mt-2">Live map tracking connects once a maps provider (e.g. Google Maps API) is configured.</p>
        </div>
      </Modal>
    </div>
  );
}
