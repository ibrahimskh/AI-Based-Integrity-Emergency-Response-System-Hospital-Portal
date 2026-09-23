// ---------------------------------------------------------------------------
// MOCK DATA LAYER
// ---------------------------------------------------------------------------
// This file simulates a real backend (Firestore-shaped) so the UI can be
// built against real async CRUD + real-time subscriptions today.
//
// TO CONNECT REAL FIREBASE LATER:
//   Replace the bodies of dbGetAll / dbGetById / dbAdd / dbUpdate / dbDelete /
//   dbSubscribe below with the equivalent Firestore v9 calls
//   (getDocs/getDoc, addDoc, updateDoc, deleteDoc, onSnapshot). Every caller
//   in the app uses these functions only, never localStorage directly, so
//   no UI component needs to change.
// ---------------------------------------------------------------------------

const NS = 'lifeline_demo_';
const listeners = new Map(); // collection -> Set<callback>

function readCollection(name) {
  const raw = localStorage.getItem(NS + name);
  return raw ? JSON.parse(raw) : [];
}

function writeCollection(name, data) {
  localStorage.setItem(NS + name, JSON.stringify(data));
  const subs = listeners.get(name);
  if (subs) subs.forEach((cb) => cb(data));
}

function delay(min = 350, max = 750) {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

// ---- Generic async CRUD (mirrors Firestore call shape) --------------------

export async function dbGetAll(collectionName) {
  await delay();
  return readCollection(collectionName);
}

export async function dbGetById(collectionName, id) {
  await delay(150, 350);
  return readCollection(collectionName).find((d) => d.id === id) || null;
}

export async function dbAdd(collectionName, doc) {
  await delay();
  const list = readCollection(collectionName);
  const newDoc = { id: uid(collectionName.slice(0, 3).toUpperCase()), createdAt: new Date().toISOString(), ...doc };
  list.unshift(newDoc);
  writeCollection(collectionName, list);
  return newDoc;
}

export async function dbUpdate(collectionName, id, patch) {
  await delay();
  const list = readCollection(collectionName);
  const idx = list.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error('Record not found');
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  writeCollection(collectionName, list);
  return list[idx];
}

export async function dbDelete(collectionName, id) {
  await delay();
  const list = readCollection(collectionName).filter((d) => d.id !== id);
  writeCollection(collectionName, list);
  return true;
}

// Simulated real-time listener (mirrors Firestore onSnapshot signature)
export function dbSubscribe(collectionName, callback) {
  if (!listeners.has(collectionName)) listeners.set(collectionName, new Set());
  listeners.get(collectionName).add(callback);
  callback(readCollection(collectionName));

  const storageHandler = (e) => {
    if (e.key === NS + collectionName) callback(readCollection(collectionName));
  };
  window.addEventListener('storage', storageHandler);

  return () => {
    listeners.get(collectionName)?.delete(callback);
    window.removeEventListener('storage', storageHandler);
  };
}

export { uid };
export const IS_DEMO = true;

// ---------------------------------------------------------------------------
// SEED DATA (only written once; app behaves like a normal DB after that)
// ---------------------------------------------------------------------------

const SEED_MARKER = NS + 'seeded_v3';

export function seedIfEmpty() {
  if (localStorage.getItem(SEED_MARKER)) return;

  writeCollection('users', [
    { id: 'USR-h001', name: 'Dr. Meera Kapoor', email: 'hospital@lifeline.demo', password: 'demo1234', role: 'hospital', userType: 'Hospital Staff', hospitalId: 'HOSP-001', status: 'active', phone: '+92 300 1234567', createdAt: new Date().toISOString() },
    { id: 'USR-a001', name: 'Admin Unit-04', email: 'admin@lifeline.demo', password: 'demo1234', role: 'admin', userType: 'System Admin', status: 'active', phone: '+92 300 7654321', createdAt: new Date().toISOString() },
    { id: 'USR-u001', name: 'Robert Johnson', email: 'robert.j@example.com', role: 'patient', userType: 'Patient', status: 'active', phone: '+92 301 1112222', createdAt: new Date().toISOString() },
    { id: 'USR-u002', name: 'Alice Schmidt', email: 'alice.s@example.com', role: 'patient', userType: 'Patient', status: 'active', phone: '+92 301 3334444', createdAt: new Date().toISOString() },
    { id: 'USR-u003', name: 'Imran Sheikh', email: 'imran.sheikh@example.com', role: 'donor', userType: 'Blood Donor', status: 'active', phone: '+92 302 5556666', createdAt: new Date().toISOString() },
    { id: 'USR-u004', name: 'Carlos Mendes', email: 'carlos.m@example.com', role: 'driver', userType: 'Ambulance Driver', status: 'active', phone: '+92 302 7778888', createdAt: new Date().toISOString() },
    { id: 'USR-u005', name: 'Fatima Noor', email: 'fatima.n@example.com', role: 'hospital', userType: 'Hospital Staff', status: 'disabled', phone: '+92 303 9990000', createdAt: new Date().toISOString() },
  ]);

  writeCollection('hospitals', [
    { id: 'HOSP-001', name: 'Lifeline General Hospital', address: '221 Sector 9, Hyderabad', contact: '+92 22 3456789', emergencyContact: '+92 22 3456790', edInfo: 'Level 1 Trauma Center', totalBeds: 200, availableBeds: 58, icuBeds: 40, availableIcuBeds: 9, status: 'active', createdAt: new Date().toISOString() },
    { id: 'HOSP-002', name: 'St. Alexius Medical Center', address: '48 Riverside Ave, Hyderabad', contact: '+92 22 4567890', emergencyContact: '+92 22 4567891', edInfo: 'Level 2 Trauma Center', totalBeds: 140, availableBeds: 12, icuBeds: 25, availableIcuBeds: 2, status: 'active', createdAt: new Date().toISOString() },
    { id: 'HOSP-003', name: 'Northside Community Hospital', address: '9 Elm Street, Hyderabad', contact: '+92 22 5678901', emergencyContact: '+92 22 5678902', edInfo: 'General Emergency Dept.', totalBeds: 90, availableBeds: 31, icuBeds: 12, availableIcuBeds: 5, status: 'inactive', createdAt: new Date().toISOString() },
  ]);

  const patients = [
    { name: 'Robert Johnson', age: 42, emergencyType: 'Severe Trauma / Laceration', severity: 'critical', bloodGroup: 'O-', ambulanceId: 'AMB-102', eta: 4, location: 'Highway 4, Sector 6', status: 'incoming', assignedHospitalId: 'HOSP-001', assignedBed: null, assignedICU: false, timeline: [{ ts: new Date().toISOString(), event: 'Dispatch created' }] },
    { name: 'Alice Schmidt', age: 29, emergencyType: 'Respiratory Distress', severity: 'high', bloodGroup: 'A+', ambulanceId: 'AMB-114', eta: 12, location: 'Airlift en route', status: 'incoming', assignedHospitalId: 'HOSP-001', assignedBed: null, assignedICU: false, timeline: [{ ts: new Date().toISOString(), event: 'Airlift requested' }] },
    { name: 'Marcus Petrov', age: 35, emergencyType: 'Minor Fracture / Observation', severity: 'moderate', bloodGroup: 'B+', ambulanceId: 'AMB-098', eta: 25, location: 'Sector 9 Market Rd', status: 'incoming', assignedHospitalId: 'HOSP-001', assignedBed: null, assignedICU: false, timeline: [{ ts: new Date().toISOString(), event: 'Ambulance dispatched' }] },
    { name: 'Elena Wells', age: 61, emergencyType: 'Cardiac Event / Post-Op', severity: 'critical', bloodGroup: 'AB-', ambulanceId: 'AMB-121', eta: 2, location: 'Approaching ED bay 2', status: 'arrived', assignedHospitalId: 'HOSP-001', assignedBed: null, assignedICU: false, timeline: [{ ts: new Date().toISOString(), event: 'Arrived at hospital' }] },
    { name: 'Sana Yousaf', age: 8, emergencyType: 'Allergic Reaction', severity: 'high', bloodGroup: 'O+', ambulanceId: 'AMB-107', eta: 0, location: 'Bed 12A', status: 'admitted', assignedHospitalId: 'HOSP-001', assignedBed: '12A', assignedICU: false, timeline: [{ ts: new Date().toISOString(), event: 'Admitted to ward' }] },
  ];
  writeCollection('patients', patients.map((p) => ({ id: uid('PT'), createdAt: new Date().toISOString(), ...p })));

  writeCollection('ambulances', [
    { id: 'AMB-102', driverName: 'Carlos Mendes', driverPhone: '+92 302 7778888', status: 'en_route', currentLocation: 'Highway 4, Sector 6', assignedPatientId: null, eta: 4, lastUpdated: new Date().toISOString() },
    { id: 'AMB-114', driverName: 'Yusuf Raza', driverPhone: '+92 303 1112233', status: 'en_route', currentLocation: 'Airlift Corridor', assignedPatientId: null, eta: 12, lastUpdated: new Date().toISOString() },
    { id: 'AMB-098', driverName: 'Hina Baig', driverPhone: '+92 304 4445566', status: 'assigned', currentLocation: 'Sector 9 Market Rd', assignedPatientId: null, eta: 25, lastUpdated: new Date().toISOString() },
    { id: 'AMB-121', driverName: 'Omar Farooq', driverPhone: '+92 305 7778899', status: 'at_hospital', currentLocation: 'ED Bay 2', assignedPatientId: null, eta: 0, lastUpdated: new Date().toISOString() },
    { id: 'AMB-140', driverName: 'Noman Ali', driverPhone: '+92 306 2223344', status: 'available', currentLocation: 'Station 3', assignedPatientId: null, eta: null, lastUpdated: new Date().toISOString() },
    { id: 'AMB-141', driverName: 'Zainab Iqbal', driverPhone: '+92 307 5556677', status: 'offline', currentLocation: 'Depot', assignedPatientId: null, eta: null, lastUpdated: new Date().toISOString() },
  ]);

  writeCollection('emergencies', [
    { id: uid('EMG'), patientName: 'Robert Johnson', ambulanceId: 'AMB-102', hospitalId: 'HOSP-001', severity: 'critical', location: 'Highway 4, Sector 6', eta: 4, status: 'in_progress', createdAt: new Date().toISOString() },
    { id: uid('EMG'), patientName: 'Alice Schmidt', ambulanceId: 'AMB-114', hospitalId: 'HOSP-001', severity: 'high', location: 'Airlift Corridor', eta: 12, status: 'in_progress', createdAt: new Date().toISOString() },
    { id: uid('EMG'), patientName: 'Sana Yousaf', ambulanceId: 'AMB-107', hospitalId: 'HOSP-001', severity: 'high', location: 'Bed 12A', eta: 0, status: 'resolved', createdAt: new Date(Date.now() - 86400000).toISOString() },
  ]);

  writeCollection('notifications', [
    { id: uid('NTF'), scope: 'hospital', type: 'incoming_patient', message: 'New critical patient inbound: Robert Johnson (ETA 4 min)', read: false, severity: 'critical', createdAt: new Date().toISOString() },
    { id: uid('NTF'), scope: 'hospital', type: 'low_icu', message: 'ICU availability low: 9 beds remaining', read: false, severity: 'high', createdAt: new Date().toISOString() },
    { id: uid('NTF'), scope: 'hospital', type: 'low_blood', message: 'Blood stock critical: O- (4 units), B- (3 units), AB- (2 units)', read: false, severity: 'critical', createdAt: new Date().toISOString() },
    { id: uid('NTF'), scope: 'admin', type: 'low_beds', message: 'St. Alexius Medical Center reporting low bed availability (12 left)', read: false, severity: 'high', createdAt: new Date().toISOString() },
    { id: uid('NTF'), scope: 'admin', type: 'offline_ambulance', message: 'AMB-141 has gone offline', read: true, severity: 'moderate', createdAt: new Date(Date.now() - 3600000).toISOString() },
  ]);

  writeCollection('blood_inventory', [
    { id: 'BLD-h001', hospitalId: 'HOSP-001', group: 'O+', units: 32, lastDonation: new Date(Date.now() - 3 * 3600000).toISOString() },
    { id: 'BLD-h002', hospitalId: 'HOSP-001', group: 'O-', units: 4, lastDonation: new Date(Date.now() - 26 * 3600000).toISOString() },
    { id: 'BLD-h003', hospitalId: 'HOSP-001', group: 'A+', units: 24, lastDonation: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: 'BLD-h004', hospitalId: 'HOSP-001', group: 'A-', units: 9, lastDonation: new Date(Date.now() - 30 * 3600000).toISOString() },
    { id: 'BLD-h005', hospitalId: 'HOSP-001', group: 'B+', units: 18, lastDonation: new Date(Date.now() - 8 * 3600000).toISOString() },
    { id: 'BLD-h006', hospitalId: 'HOSP-001', group: 'B-', units: 3, lastDonation: new Date(Date.now() - 48 * 3600000).toISOString() },
    { id: 'BLD-h007', hospitalId: 'HOSP-001', group: 'AB+', units: 11, lastDonation: new Date(Date.now() - 12 * 3600000).toISOString() },
    { id: 'BLD-h008', hospitalId: 'HOSP-001', group: 'AB-', units: 2, lastDonation: new Date(Date.now() - 52 * 3600000).toISOString() },
  ]);

  writeCollection('ai_predictions', []);
  writeCollection('system_logs', [
    { id: uid('LOG'), level: 'info', message: 'System initialized with demo data', createdAt: new Date().toISOString() },
  ]);

  localStorage.setItem(SEED_MARKER, '1');
}

export function resetDemoData() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(NS))
    .forEach((k) => localStorage.removeItem(k));
  seedIfEmpty();
}
