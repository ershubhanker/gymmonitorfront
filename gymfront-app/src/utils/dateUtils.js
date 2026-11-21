/**
 * Safe UTC date parser and formatters.
 * 
 * Handles naive ISO datetime strings commonly returned by backend models
 * using `datetime.utcnow()` (e.g. "2026-11-21T13:20:00.123456").
 * In standard JavaScript, `new Date("2026-11-21T13:20:00")` parses as local time,
 * causing timestamps to appear 5.5 hours in the past in India (IST, UTC+5:30).
 * Appending 'Z' tells the parser it is UTC, properly converting to local time.
 */

export const parseUtcDate = (dt) => {
  if (!dt) return null;
  if (dt instanceof Date) return dt;
  if (typeof dt === 'number') return new Date(dt);

  let str = String(dt).trim();
  if (!str) return null;

  // Date-only string "YYYY-MM-DD" -> parse without timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // Normalize space separator to ISO 'T'
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
    str = str.replace(/\s+/, 'T');
  }

  // If no timezone specifier is present, treat as UTC
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str) && !str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
    str += 'Z';
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date(dt) : d;
};

export const formatDateTime = (dt, options = {}) => {
  const d = parseUtcDate(dt);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  });
};

export const formatDate = (dt, options = {}) => {
  const d = parseUtcDate(dt);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options
  });
};

export const toDatetimeLocal = (dt) => {
  const d = parseUtcDate(dt);
  if (!d || isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
