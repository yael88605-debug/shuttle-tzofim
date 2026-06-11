// ─── Ride configuration ────────────────────────────────────────────────────────
export const RIDE_CAPACITY = 7;

// Time slots by day type
// 0=Sun  1=Mon  2=Tue  3=Wed  4=Thu  5=Fri  6=Sat
export const RIDE_TIMES = {
  weekday: ['06:15'],       // ראשון–חמישי
  friday:  ['08:30', '09:30'], // שישי
  saturday: [],              // שבת — אין נסיעות
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Hgkh123@!';
