import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

export const IS_DEMO = false;
export function seedIfEmpty() {}
export function resetDemoData() {}

export function uid(prefix = 'DOC') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

const COLLECTION_MAP = {
  users: 'users',
  hospitals: 'hospitals',
  ambulances: 'ambulances',
  patients: 'patients',
  emergencies: 'emergency_requests',
  notifications: 'notifications',
  blood_inventory: 'blood_banks',
  ai_predictions: 'ai_predictions',
  system_logs: 'system_alerts',
};

const BLOOD_STOCK_FIELDS = {
  'O+': 'stock_O_pos',
  'O-': 'stock_O_neg',
  'A+': 'stock_A_pos',
  'A-': 'stock_A_neg',
  'B+': 'stock_B_pos',
  'B-': 'stock_B_neg',
  'AB+': 'stock_AB_pos',
  'AB-': 'stock_AB_neg',
};

const USER_TYPE_BY_ROLE = {
  admin: 'System Admin',
  hospital: 'Hospital Staff',
  patient: 'Patient',
  donor: 'Blood Donor',
  driver: 'Ambulance Driver',
  doctor: 'Hospital Staff',
};

const HOSPITAL_NOTIF_TYPES = new Set([
  'donor_request',
  'blood_shortage',
  'incoming_patient',
  'ambulance_dispatched',
  'patient_arrived',
  'low_icu',
  'low_blood',
]);

let driverCache = [];
let driversLoading = null;

function firestoreName(collectionName) {
  return COLLECTION_MAP[collectionName] || collectionName;
}

function rawValue(value) {
  if (value == null) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }
  return value;
}

function asString(value, fallback = '') {
  const v = rawValue(value);
  if (v == null || v === '') return fallback;
  return String(v);
}

function asNumber(value, fallback = 0) {
  const v = rawValue(value);
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value) {
  const v = rawValue(value);
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

function pick(data, ...keys) {
  for (const key of keys) {
    if (data[key] != null && data[key] !== '') return rawValue(data[key]);
  }
  return undefined;
}

function mapAmbulanceStatus(status) {
  const s = asString(status).toLowerCase();
  if (s === 'dispatched' || s === 'enroute' || s === 'en-route') return 'en_route';
  if (s === 'busy' || s === 'on_scene' || s === 'on-scene') return 'assigned';
  if (s === 'maintenance' || s === 'inactive') return 'offline';
  if (['available', 'assigned', 'en_route', 'at_hospital', 'returning', 'offline'].includes(s)) return s;
  return s || 'available';
}

function mapEmergencyStatus(status) {
  const s = asString(status).toLowerCase();
  if (['completed', 'resolved', 'cancelled', 'canceled', 'closed'].includes(s)) return 'resolved';
  return 'in_progress';
}

function mapPatientStatus(data) {
  const explicit = asString(pick(data, 'status')).toLowerCase();
  if (explicit) {
    if (explicit === 'completed') return 'discharged';
    return explicit.replace(/[\s-]/g, '_');
  }
  if (pick(data, 'discharge_at', 'discharged_at')) return 'discharged';
  if (pick(data, 'admitted_at')) return 'admitted';
  return 'incoming';
}

function mapUserRole(data) {
  const role = asString(pick(data, 'role'), '').toLowerCase();
  if (['hospital', 'hospital_admin', 'hospital staff', 'hospital_staff'].includes(role)) return 'hospital';
  if (['admin', 'system admin', 'system_admin'].includes(role)) return 'admin';
  if (['patient', 'driver', 'donor', 'doctor', 'user'].includes(role)) return role === 'user' ? 'patient' : role;
  if (data.bloodGroup != null || data.blood_group != null || data.isDonor != null || data.is_donor != null) return 'patient';
  return role || '';
}

function mapUser(id, data) {
  const docId = id;
  const recordId = asString(pick(data, 'id'), docId);
  const role = mapUserRole(data) || 'patient';
  const active = data.status != null
    ? asString(data.status).toLowerCase() !== 'disabled'
    : data.is_active == null ? true : asBool(data.is_active);
  return {
    ...data,
    id: recordId,
    docId,
    recordId,
    name: asString(pick(data, 'name', 'full_name', 'fullName'), 'Unknown user'),
    email: asString(pick(data, 'email')),
    phone: asString(pick(data, 'phone')),
    role,
    userType: asString(pick(data, 'userType', 'user_type'), USER_TYPE_BY_ROLE[role] || role || 'User'),
    status: active ? 'active' : 'disabled',
    hospitalId: asString(pick(data, 'hospitalId', 'hospital_id')) || null,
    createdAt: asString(pick(data, 'createdAt', 'created_at'), null),
  };
}

function mapHospital(id, data) {
  const docId = id;
  const recordId = asString(pick(data, 'id'), docId);
  const totalBeds = asNumber(pick(data, 'totalBeds', 'beds_total', 'total_beds'));
  const availableBeds = asNumber(pick(data, 'availableBeds', 'beds_available', 'available_beds'));
  const icuBeds = asNumber(pick(data, 'icuBeds', 'icu_beds', 'icu_total'));
  const ratio = asNumber(pick(data, 'beds_ratio'), totalBeds ? availableBeds / Math.max(totalBeds, 1) : 1);
  const availableIcu = data.availableIcuBeds != null || data.available_icu_beds != null
    ? asNumber(pick(data, 'availableIcuBeds', 'available_icu_beds'))
    : Math.max(0, Math.round(icuBeds * ratio));
  const active = data.status != null
    ? asString(data.status).toLowerCase() === 'active'
    : data.is_active == null ? true : asBool(data.is_active);
  return {
    ...data,
    id: recordId,
    docId,
    recordId,
    name: asString(pick(data, 'name'), 'Unnamed hospital'),
    address: asString(pick(data, 'address', 'area')),
    contact: asString(pick(data, 'contact', 'phone')),
    emergencyContact: asString(pick(data, 'emergencyContact', 'emergency_contact', 'phone')),
    edInfo: asString(pick(data, 'edInfo', 'ed_info')) || (asBool(data.trauma_center) ? 'Trauma Center' : asBool(data.emergency_24h) ? '24h Emergency Dept.' : ''),
    email: asString(pick(data, 'email')),
    totalBeds,
    availableBeds,
    icuBeds,
    availableIcuBeds: availableIcu,
    status: active ? 'active' : 'inactive',
    lat: asNumber(pick(data, 'lat', 'latitude'), null),
    lng: asNumber(pick(data, 'lng', 'lon', 'longitude'), null),
    createdAt: asString(pick(data, 'createdAt', 'created_at'), null),
  };
}

function mapAmbulance(id, data) {
  const docId = id;
  const recordId = asString(pick(data, 'id'), docId);
  const driver = driverCache.find((d) => d.ambulance_id === recordId || d.ambulance_id === docId || d.ambulanceId === recordId);
  const lat = asNumber(pick(data, 'lat', 'current_lat', 'currentLat'), null);
  const lng = asNumber(pick(data, 'lng', 'current_lng', 'currentLng'), null);
  return {
    ...data,
    id: recordId,
    docId,
    recordId,
    registrationNumber: asString(pick(data, 'registration_number', 'registrationNumber')),
    driverName: asString(pick(data, 'driverName', 'driver_name', 'full_name'), driver?.full_name || driver?.name || 'Unassigned'),
    driverPhone: asString(pick(data, 'driverPhone', 'driver_phone', 'phone'), driver?.phone || ''),
    currentLocation: asString(pick(data, 'currentLocation', 'current_location', 'area')),
    status: mapAmbulanceStatus(pick(data, 'status')),
    assignedPatientId: pick(data, 'assignedPatientId', 'assigned_patient_id') || null,
    assignedHospitalId: asString(pick(data, 'assignedHospitalId', 'hospital_id', 'hospitalId')) || null,
    eta: data.eta != null
      ? asNumber(data.eta, null)
      : data.eta_minutes != null
        ? asNumber(data.eta_minutes, null)
        : data.avg_response_time_sec != null
          ? Math.round(asNumber(data.avg_response_time_sec) / 60)
          : null,
    lat,
    lng,
    heading: asNumber(pick(data, 'heading', 'heading_deg'), 0),
    lastUpdated: asString(pick(data, 'lastUpdated', 'last_updated', 'updated_at', 'created_at'), null),
  };
}

function mapPatient(id, data) {
  const docId = id;
  const recordId = asString(pick(data, 'id'), docId);
  return {
    ...data,
    id: recordId,
    docId,
    recordId,
    name: asString(pick(data, 'name', 'full_name', 'fullName', 'patientName'), 'Unknown patient'),
    age: asNumber(pick(data, 'age'), null),
    emergencyType: asString(pick(data, 'emergencyType', 'emergency_type', 'condition', 'symptoms'), 'Emergency'),
    severity: asString(pick(data, 'severity', 'triage_severity'), 'moderate').toLowerCase(),
    bloodGroup: asString(pick(data, 'bloodGroup', 'blood_group', 'blood_type')),
    ambulanceId: asString(pick(data, 'ambulanceId', 'ambulance_id')) || null,
    eta: data.eta == null ? null : asNumber(data.eta, null),
    location: asString(pick(data, 'location', 'pickup_area', 'pickup_address', 'area')),
    status: mapPatientStatus(data),
    assignedHospitalId: asString(pick(data, 'assignedHospitalId', 'hospital_id', 'hospitalId')) || null,
    assignedBed: pick(data, 'assignedBed', 'assigned_bed') || null,
    assignedICU: asBool(pick(data, 'assignedICU', 'assigned_icu')),
    timeline: Array.isArray(data.timeline) ? data.timeline : [],
    createdAt: asString(pick(data, 'createdAt', 'created_at', 'admitted_at'), null),
  };
}

function mapEmergency(id, data) {
  const docId = id;
  const recordId = asString(pick(data, 'id'), docId);
  return {
    ...data,
    id: recordId,
    docId,
    recordId,
    patientName: asString(pick(data, 'patientName', 'patient_name', 'full_name', 'description'), 'Emergency request'),
    ambulanceId: asString(pick(data, 'ambulanceId', 'ambulance_id')) || '—',
    hospitalId: asString(pick(data, 'hospitalId', 'hospital_id')) || null,
    severity: asString(pick(data, 'severity', 'triage_severity'), 'moderate').toLowerCase(),
    location: asString(pick(data, 'location', 'pickup_address', 'pickup_area')),
    eta: data.eta == null && data.eta_minutes == null ? null : asNumber(pick(data, 'eta', 'eta_minutes'), null),
    status: mapEmergencyStatus(pick(data, 'status')),
    createdAt: asString(pick(data, 'createdAt', 'created_at'), null),
  };
}

function mapNotification(id, data) {
  const docId = id;
  const recordId = asString(pick(data, 'id'), docId);
  const type = asString(pick(data, 'type'), 'info');
  const scope = asString(pick(data, 'scope')) || (HOSPITAL_NOTIF_TYPES.has(type) ? 'hospital' : 'admin');
  return {
    ...data,
    id: recordId,
    docId,
    recordId,
    scope,
    type,
    message: asString(pick(data, 'message', 'title'), 'Notification'),
    read: data.read != null ? asBool(data.read) : asBool(pick(data, 'is_read')),
    severity: asString(pick(data, 'severity'), type.includes('blood') || type.includes('critical') ? 'critical' : 'moderate'),
    createdAt: asString(pick(data, 'createdAt', 'created_at'), null),
  };
}

function mapBloodBanks(id, data) {
  const hospitalId = asString(pick(data, 'hospitalId', 'hospital_id'), id);
  const lastDonation = asString(pick(data, 'lastDonation', 'last_updated', 'created_at'), null);
  return Object.entries(BLOOD_STOCK_FIELDS).map(([group, field]) => ({
    id: `${id}__${group}`,
    bankId: id,
    hospitalId,
    group,
    units: asNumber(pick(data, field), 0),
    lastDonation,
  }));
}

function mapPrediction(id, data) {
  const docId = id;
  const recordId = asString(pick(data, 'id'), docId);
  return {
    ...data,
    id: recordId,
    docId,
    recordId,
    patientId: asString(pick(data, 'patientId', 'patient_id', 'request_id')),
    predictionType: asString(pick(data, 'predictionType', 'prediction_type', 'module')),
    result: pick(data, 'result', 'output') ?? null,
    error: pick(data, 'error') || null,
    requestedAt: asString(pick(data, 'requestedAt', 'requested_at', 'created_at'), null),
  };
}

function mapSystemLog(id, data) {
  const docId = id;
  const recordId = asString(pick(data, 'id'), docId);
  const severity = asString(pick(data, 'severity', 'level'), 'info').toLowerCase();
  return {
    ...data,
    id: recordId,
    docId,
    recordId,
    level: severity === 'critical' || severity === 'error' ? 'error' : severity === 'high' ? 'warn' : 'info',
    message: asString(pick(data, 'message', 'title'), 'System alert'),
    createdAt: asString(pick(data, 'createdAt', 'created_at'), null),
  };
}

function mapDoc(collectionName, id, data) {
  switch (collectionName) {
    case 'users': return mapUser(id, data);
    case 'hospitals': return mapHospital(id, data);
    case 'ambulances': return mapAmbulance(id, data);
    case 'patients': return mapPatient(id, data);
    case 'emergencies': return mapEmergency(id, data);
    case 'notifications': return mapNotification(id, data);
    case 'ai_predictions': return mapPrediction(id, data);
    case 'system_logs': return mapSystemLog(id, data);
    default: return { id, ...data };
  }
}

function docsToList(collectionName, snapshot) {
  if (collectionName === 'blood_inventory') {
    return snapshot.docs.flatMap((d) => mapBloodBanks(d.id, d.data() || {}));
  }
  return snapshot.docs.map((d) => mapDoc(collectionName, d.id, d.data() || {}));
}

async function ensureDrivers() {
  if (driverCache.length || driversLoading) return driversLoading;
  driversLoading = (async () => {
    try {
      const snap = await getDocs(collection(db, 'ambulance_drivers'));
      driverCache = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
    } catch {
      driverCache = [];
    }
  })();
  return driversLoading;
}

function stripVirtual(patch) {
  const out = { ...patch };
  delete out.docId;
  delete out.recordId;
  delete out.userType;
  delete out.registrationNumber;
  delete out.bankId;
  return out;
}

function toFirestorePatch(collectionName, patch) {
  const src = stripVirtual(patch);
  const out = {};

  const assign = (from, to, transform) => {
    if (src[from] === undefined) return;
    out[to] = transform ? transform(src[from]) : src[from];
  };

  if (collectionName === 'users') {
    assign('name', 'name');
    assign('name', 'full_name');
    assign('email', 'email');
    assign('phone', 'phone');
    assign('role', 'role');
    assign('hospitalId', 'hospital_id');
    if (src.status !== undefined) {
      out.status = src.status;
      out.is_active = src.status === 'active' ? 'True' : 'False';
    }
    Object.entries(src).forEach(([k, v]) => {
      if (!['name', 'email', 'phone', 'role', 'hospitalId', 'status', 'id'].includes(k) && v !== undefined) out[k] = v;
    });
    return out;
  }

  if (collectionName === 'hospitals') {
    assign('name', 'name');
    assign('address', 'address');
    assign('contact', 'phone');
    assign('emergencyContact', 'emergency_contact');
    assign('edInfo', 'ed_info');
    assign('email', 'email');
    assign('lat', 'lat', (v) => String(v));
    assign('lng', 'lng', (v) => String(v));
    if (src.totalBeds !== undefined) out.beds_total = String(src.totalBeds);
    if (src.availableBeds !== undefined) out.beds_available = String(src.availableBeds);
    if (src.icuBeds !== undefined) out.icu_beds = String(src.icuBeds);
    if (src.availableIcuBeds !== undefined) out.available_icu_beds = String(src.availableIcuBeds);
    if (src.status !== undefined) {
      out.status = src.status;
      out.is_active = src.status === 'active' ? 'True' : 'False';
    }
    return out;
  }

  if (collectionName === 'ambulances') {
    assign('driverName', 'driver_name');
    assign('driverPhone', 'driver_phone');
    assign('currentLocation', 'area');
    assign('status', 'status');
    assign('lat', 'current_lat', (v) => String(v));
    assign('lng', 'current_lng', (v) => String(v));
    if (src.lastUpdated !== undefined) out.last_updated = src.lastUpdated;
    if (src.id && src.id !== src.recordId) out.registration_number = src.id;
    return { ...out, ...(src.status ? { status: src.status } : {}) };
  }

  if (collectionName === 'patients') {
    assign('name', 'full_name');
    assign('status', 'status');
    assign('assignedBed', 'assigned_bed');
    assign('assignedICU', 'assigned_icu');
    assign('timeline', 'timeline');
    assign('severity', 'severity');
    return out;
  }

  if (collectionName === 'emergencies') {
    assign('status', 'status');
    if (src.status === 'resolved') out.status = 'completed';
    if (src.status === 'in_progress') out.status = 'dispatched';
    return out;
  }

  if (collectionName === 'notifications') {
    if (src.read !== undefined) {
      out.read = src.read;
      out.is_read = src.read ? 'True' : 'False';
    }
    assign('message', 'message');
    return out;
  }

  Object.entries(src).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out;
}

async function findDoc(collectionName, id) {
  const name = firestoreName(collectionName);
  const direct = await getDoc(doc(db, name, id));
  if (direct.exists()) return direct;

  const byId = await getDocs(query(collection(db, name), where('id', '==', id), limit(1)));
  if (!byId.empty) return byId.docs[0];

  if (collectionName === 'ambulances') {
    const byReg = await getDocs(query(collection(db, name), where('registration_number', '==', id), limit(1)));
    if (!byReg.empty) return byReg.docs[0];
  }
  return null;
}

export async function dbGetAll(collectionName) {
  if (collectionName === 'ambulances') await ensureDrivers();
  const snap = await getDocs(collection(db, firestoreName(collectionName)));
  return docsToList(collectionName, snap);
}

export async function dbGetById(collectionName, id) {
  if (!id) return null;
  if (collectionName === 'blood_inventory') {
    const [bankId, group] = String(id).split('__');
    const found = await findDoc('blood_inventory', bankId);
    if (!found) return null;
    return mapBloodBanks(found.id, found.data() || {}).find((r) => r.group === group) || null;
  }
  if (collectionName === 'ambulances') await ensureDrivers();
  const found = await findDoc(collectionName, id);
  if (!found) return null;
  return mapDoc(collectionName, found.id, found.data() || {});
}

export async function dbAdd(collectionName, payload) {
  const name = firestoreName(collectionName);
  const patch = toFirestorePatch(collectionName, payload);
  const createdAt = new Date().toISOString();
  const ref = await addDoc(collection(db, name), { created_at: createdAt, createdAt, ...patch });
  if (!patch.id) {
    try { await updateDoc(ref, { id: ref.id }); } catch { /* ignore */ }
  }
  const saved = await getDoc(ref);
  if (collectionName === 'blood_inventory') {
    return mapBloodBanks(saved.id, saved.data() || {})[0];
  }
  return mapDoc(collectionName, saved.id, saved.data() || {});
}

export async function dbUpdate(collectionName, id, patch) {
  if (collectionName === 'blood_inventory') {
    const [bankId, group] = String(id).split('__');
    const found = await findDoc('blood_inventory', bankId);
    if (!found) throw new Error('Record not found');
    const field = BLOOD_STOCK_FIELDS[group];
    if (!field) throw new Error('Unknown blood group');
    await updateDoc(found.ref, {
      [field]: String(patch.units ?? 0),
      last_updated: new Date().toISOString(),
    });
    const saved = await getDoc(found.ref);
    return mapBloodBanks(saved.id, saved.data() || {}).find((r) => r.group === group);
  }

  const found = await findDoc(collectionName, id);
  if (!found) throw new Error('Record not found');
  const payload = toFirestorePatch(collectionName, patch);
  payload.updated_at = new Date().toISOString();
  payload.updatedAt = payload.updated_at;
  await updateDoc(found.ref, payload);
  const saved = await getDoc(found.ref);
  if (collectionName === 'ambulances') await ensureDrivers();
  return mapDoc(collectionName, saved.id, saved.data() || {});
}

export async function dbDelete(collectionName, id) {
  const found = await findDoc(collectionName, id);
  if (!found) throw new Error('Record not found');
  await deleteDoc(found.ref);
  return true;
}

export function dbSubscribe(collectionName, callback) {
  let lastSnap = null;
  let unsubDrivers = null;

  const emit = (snap) => {
    lastSnap = snap;
    callback(docsToList(collectionName, snap));
  };

  if (collectionName === 'ambulances') {
    unsubDrivers = onSnapshot(collection(db, 'ambulance_drivers'), (snap) => {
      driverCache = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      if (lastSnap) emit(lastSnap);
    });
  }

  const unsub = onSnapshot(
    collection(db, firestoreName(collectionName)),
    emit,
    (err) => {
      console.error(`Failed to subscribe to ${collectionName}`, err);
      callback([]);
    }
  );

  return () => {
    unsub();
    if (unsubDrivers) unsubDrivers();
  };
}

export async function findUserProfile({ uid, email }) {
  if (uid) {
    const byUid = await getDoc(doc(db, 'users', uid));
    if (byUid.exists()) return mapUser(byUid.id, byUid.data() || {});
  }
  if (email) {
    const byEmail = await getDocs(query(collection(db, 'users'), where('email', '==', email), limit(1)));
    if (!byEmail.empty) {
      const d = byEmail.docs[0];
      return mapUser(d.id, d.data() || {});
    }
  }
  return null;
}

export async function defaultHospitalId() {
  try {
    const banks = await getDocs(query(collection(db, 'blood_banks'), limit(1)));
    if (!banks.empty) {
      const hid = banks.docs[0].data()?.hospital_id;
      if (hid) return hid;
    }
  } catch { /* ignore */ }
  try {
    const hospitals = await getDocs(query(collection(db, 'hospitals'), limit(1)));
    if (!hospitals.empty) {
      const d = hospitals.docs[0];
      return d.data()?.id || d.id;
    }
  } catch { /* ignore */ }
  return null;
}
