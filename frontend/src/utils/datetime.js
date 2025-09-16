// frontend/src/utils/datetime.js
export const TZ = 'Asia/Kolkata';

export function toDate(value) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export function formatDateTime(value, opts = {}) {
  const d = toDate(value);
  if (!d) return 'TBA';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: TZ,
    ...opts,
  });
}

export function formatTimeRange(start, end) {
  const s = toDate(start), e = toDate(end);
  if (!s && !e) return 'TBA';
  if (s && e) {
    return `${formatDateTime(s)} – ${e.toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ
    })}`;
  }
  return formatDateTime(s || e);
}
