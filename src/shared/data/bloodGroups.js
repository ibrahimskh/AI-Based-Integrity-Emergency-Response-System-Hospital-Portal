// Standard 8 blood groups tracked by any real hospital blood bank.
export const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

// O- is the universal donor (used constantly, hardest to keep stocked) and
// AB+ is the universal recipient — both are worth calling out in the UI the
// way real blood-bank dashboards do.
export const UNIVERSAL_DONOR = 'O-';
export const UNIVERSAL_RECIPIENT = 'AB+';

// Units are standard blood-bank units (~450ml bags). Thresholds mirror what
// hospital blood banks typically flag: under 5 units is a critical shortage,
// under 15 is running low, under 30 is adequate but worth restocking, and
// 30+ against a 50-unit storage capacity is considered a healthy stock.
export const CAPACITY_PER_GROUP = 50;

export function getBloodStatus(units) {
  if (units < 5) return 'critical';
  if (units < 15) return 'low';
  if (units < 30) return 'adequate';
  return 'good';
}

export const BLOOD_STATUS_LABEL = {
  critical: 'Critical',
  low: 'Low Stock',
  adequate: 'Adequate',
  good: 'Well Stocked',
};
