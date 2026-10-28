import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/context/AuthContext';
import { ToastProvider } from './shared/context/ToastContext';
import ProtectedRoute from './shared/components/ProtectedRoute';

import HospitalLogin from './hospital-portal/pages/Login';
import HospitalLayout from './hospital-portal/HospitalLayout';
import HospitalDashboard from './hospital-portal/pages/Dashboard';
import BedManagement from './hospital-portal/pages/BedManagement';
import BloodAvailability from './hospital-portal/pages/BloodAvailability';
import IncomingPatients from './hospital-portal/pages/IncomingPatients';
import AmbulanceArrivals from './hospital-portal/pages/AmbulanceArrivals';
import AIPrediction from './hospital-portal/pages/AIPrediction';
import HospitalNotifications from './hospital-portal/pages/Notifications';
import HospitalProfile from './hospital-portal/pages/Profile';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<HospitalLogin />} />

            <Route path="/" element={
              <ProtectedRoute role="hospital" loginPath="/login">
                <HospitalLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<HospitalDashboard />} />
              <Route path="beds" element={<BedManagement />} />
              <Route path="blood-availability" element={<BloodAvailability />} />
              <Route path="patients" element={<IncomingPatients />} />
              <Route path="ambulances" element={<AmbulanceArrivals />} />
              <Route path="ai-prediction" element={<AIPrediction />} />
              <Route path="notifications" element={<HospitalNotifications />} />
              <Route path="profile" element={<HospitalProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
