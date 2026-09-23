import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BedDouble, Droplet, Users, Siren, Sparkles, Bell, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppShell from '../shared/components/AppShell';
import { useAuth } from '../shared/context/AuthContext';
import { useToast } from '../shared/context/ToastContext';
import { dbSubscribe } from '../shared/data/db';
import { getBloodStatus } from '../shared/data/bloodGroups';

const TITLES = {
  '/dashboard': 'Hospital Dashboard',
  '/beds': 'Bed Management',
  '/blood-availability': 'Blood Availability',
  '/patients': 'Incoming Patients',
  '/ambulances': 'Ambulance Arrivals',
  '/ai-prediction': 'AI Prediction',
  '/notifications': 'Notifications',
  '/profile': 'Hospital Profile',
};

export default function HospitalLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [criticalBlood, setCriticalBlood] = useState(0);

  useEffect(() => {
    const unsub = dbSubscribe('notifications', (list) => {
      setUnread(list.filter((n) => n.scope === 'hospital' && !n.read).length);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = dbSubscribe('blood_inventory', (list) => {
      const mine = list.filter((r) => r.hospitalId === user?.hospitalId);
      setCriticalBlood(mine.filter((r) => getBloodStatus(r.units) === 'critical').length);
    });
    return unsub;
  }, [user?.hospitalId]);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/beds', label: 'Bed Management', icon: BedDouble },
    { to: '/blood-availability', label: 'Blood Availability', icon: Droplet, badge: criticalBlood },
    { to: '/patients', label: 'Incoming Patients', icon: Users },
    { to: '/ambulances', label: 'Ambulance Arrivals', icon: Siren },
    { to: '/ai-prediction', label: 'AI Prediction', icon: Sparkles },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: unread },
    { to: '/profile', label: 'Hospital Profile', icon: UserCog },
  ];

  const handleLogout = async () => {
    await logout();
    toast.success('You have been logged out.');
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      brandLabel="HOSPITAL PORTAL"
      navItems={navItems}
      user={user}
      onLogout={handleLogout}
      notifCount={unread}
      onBellClick={() => navigate('/notifications')}
      pageTitle={TITLES[location.pathname] || 'Hospital Portal'}
    >
      <Outlet />
    </AppShell>
  );
}
