import { useEffect, useState } from 'react';
import { BedDouble, HeartPulse, Ambulance, Users, AlertTriangle, Activity, ClipboardList, Droplet } from 'lucide-react';
import Card from '../../shared/components/Card';
import StatCard from '../../shared/components/StatCard';
import Badge from '../../shared/components/Badge';
import { Spinner, EmptyState, ErrorState } from '../../shared/components/States';
import { useAuth } from '../../shared/context/AuthContext';
import { dbGetAll } from '../../shared/data/db';
import { timeAgo } from '../../shared/utils/format';
import { getBloodStatus } from '../../shared/data/bloodGroups';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [state, setState] = useState({ status: 'loading', hospital: null, patients: [], ambulances: [], blood: [] });

  const load = async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const [hospitals, patients, ambulances, blood] = await Promise.all([
        dbGetAll('hospitals'), dbGetAll('patients'), dbGetAll('ambulances'), dbGetAll('blood_inventory'),
      ]);
      const hospital = hospitals.find((h) => [h.id, h.recordId, h.docId].includes(user.hospitalId));
      setState({
        status: 'ready',
        hospital,
        patients: patients.filter((p) => p.assignedHospitalId === user.hospitalId),
        ambulances,
        blood: blood.filter((b) => b.hospitalId === user.hospitalId),
      });
    } catch {
      setState((s) => ({ ...s, status: 'error' }));
    }
  };

  useEffect(() => { load(); }, []);

  if (state.status === 'loading') return <Spinner label="Loading dashboard…" />;
  if (state.status === 'error') return <ErrorState onRetry={load} />;

  const { hospital, patients, ambulances, blood } = state;
  const incoming = patients.filter((p) => p.status === 'incoming' || p.status === 'arrived');
  const critical = patients.filter((p) => p.severity === 'critical' && p.status !== 'discharged' && p.status !== 'cancelled');
  const activeAmbulances = ambulances.filter((a) => ['assigned', 'en_route', 'at_hospital'].includes(a.status));
  const occupied = (hospital?.totalBeds || 0) - (hospital?.availableBeds || 0);
  const totalBloodUnits = blood.reduce((sum, b) => sum + (b.units || 0), 0);
  const criticalBloodGroups = blood.filter((b) => getBloodStatus(b.units) === 'critical');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BedDouble} label="Total Beds" value={hospital?.totalBeds ?? '—'} tone="blue" />
        <StatCard icon={BedDouble} label="Available Beds" value={hospital?.availableBeds ?? '—'} tone="emerald" />
        <StatCard icon={BedDouble} label="Occupied Beds" value={occupied} tone="amber" />
        <StatCard icon={HeartPulse} label="ICU Beds (Avail.)" value={`${hospital?.availableIcuBeds ?? 0} / ${hospital?.icuBeds ?? 0}`} tone="red" />
        <StatCard icon={Users} label="Incoming Patients" value={incoming.length} tone="blue" />
        <StatCard icon={Ambulance} label="Active Ambulances" value={activeAmbulances.length} tone="amber" />
        <StatCard icon={AlertTriangle} label="Critical Patients" value={critical.length} alert={critical.length > 0} />
        <StatCard icon={Activity} label="ED Capacity" value={hospital?.edInfo ? 'Operational' : '—'} tone="emerald" />
        <StatCard icon={Droplet} label="Blood Units in Stock" value={totalBloodUnits} tone="red" />
        <StatCard
          icon={Droplet}
          label="Blood Groups Critical"
          value={criticalBloodGroups.length}
          alert={criticalBloodGroups.length > 0}
        />
      </div>

      <Card padded={false}>
        <div className="px-6 py-4 border-b border-lifeline-border flex items-center gap-2">
          <ClipboardList size={18} className="text-lifeline-red" />
          <h3 className="font-bold">Recent Emergency Activity</h3>
        </div>
        {patients.length === 0 ? (
          <EmptyState title="No recent activity" description="New emergency cases will appear here as they come in." />
        ) : (
          <ul className="divide-y divide-lifeline-border">
            {[...patients].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6).map((p) => (
              <li key={p.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{p.name} <span className="text-lifeline-sub font-normal">· {p.emergencyType}</span></p>
                  <p className="text-xs text-lifeline-sub mt-0.5">{timeAgo(p.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge value={p.severity} />
                  <Badge value={p.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
