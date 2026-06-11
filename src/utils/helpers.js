import { RIDE_TIMES } from '../config/constants';

// ─── Token ────────────────────────────────────────────────────────────────────
export const generateToken = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Parse a YYYY-MM-DD string safely, using noon to avoid timezone DST shifts.
 */
const parseDate = (dateStr) => new Date(dateStr + 'T12:00:00');

/**
 * Returns the array of available ride times for a given YYYY-MM-DD string.
 * Returns [] for Saturday or missing input.
 */
export const getAvailableTimesForDate = (dateStr) => {
  if (!dateStr) return [];
  const day = parseDate(dateStr).getDay();
  if (day === 6) return RIDE_TIMES.saturday;
  if (day === 5) return RIDE_TIMES.friday;
  return RIDE_TIMES.weekday;
};

/**
 * Returns true if the date is today or in the future AND is not Saturday.
 */
export const isDateValid = (dateStr) => {
  if (!dateStr) return false;
  const d = parseDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today && d.getDay() !== 6;
};

/**
 * Full Hebrew date: "יום שישי, 12 ביוני 2026"
 */
export const formatDateHebrew = (dateStr) => {
  if (!dateStr) return '';
  return parseDate(dateStr).toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Short date: "12/06/2026"
 */
export const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Returns today as YYYY-MM-DD (for the date input min attribute).
 */
export const getTodayString = () => new Date().toISOString().split('T')[0];
