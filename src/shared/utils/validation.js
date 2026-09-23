export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
export const isPhone = (v) => /^[+]?[\d\s-]{7,15}$/.test(v || '');
export const isPositiveInt = (v) => Number.isInteger(Number(v)) && Number(v) >= 0;

export function validateHospitalForm(f) {
  const e = {};
  if (!f.name?.trim()) e.name = 'Hospital name is required.';
  if (!f.address?.trim()) e.address = 'Address is required.';
  if (!isPhone(f.contact)) e.contact = 'Enter a valid contact number.';
  if (!isPositiveInt(f.totalBeds)) e.totalBeds = 'Total beds must be a non-negative number.';
  if (!isPositiveInt(f.icuBeds)) e.icuBeds = 'ICU beds must be a non-negative number.';
  if (Number(f.icuBeds) > Number(f.totalBeds)) e.icuBeds = 'ICU beds cannot exceed total beds.';
  return e;
}

export function validateBedForm(f) {
  const e = {};
  if (!isPositiveInt(f.totalBeds)) e.totalBeds = 'Enter a valid number.';
  if (!isPositiveInt(f.availableBeds)) e.availableBeds = 'Enter a valid number.';
  if (Number(f.availableBeds) > Number(f.totalBeds)) e.availableBeds = 'Available beds cannot exceed total beds.';
  if (!isPositiveInt(f.icuBeds)) e.icuBeds = 'Enter a valid number.';
  if (!isPositiveInt(f.availableIcuBeds)) e.availableIcuBeds = 'Enter a valid number.';
  if (Number(f.availableIcuBeds) > Number(f.icuBeds)) e.availableIcuBeds = 'Available ICU beds cannot exceed ICU beds.';
  return e;
}

export function validateUserForm(f) {
  const e = {};
  if (!f.name?.trim()) e.name = 'Name is required.';
  if (!isEmail(f.email)) e.email = 'Enter a valid email address.';
  if (!f.userType) e.userType = 'Select a user type.';
  if (f.phone && !isPhone(f.phone)) e.phone = 'Enter a valid phone number.';
  return e;
}

export function validateAmbulanceForm(f) {
  const e = {};
  if (!f.id?.trim()) e.id = 'Ambulance ID is required.';
  if (!f.driverName?.trim()) e.driverName = 'Driver name is required.';
  if (!isPhone(f.driverPhone)) e.driverPhone = 'Enter a valid phone number.';
  return e;
}
