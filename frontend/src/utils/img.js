// frontend/src/utils/img.ts (or .js)
export function normalizeImageUrl(url) {
  if (!url) return url;
  // Kill obvious localhost leftovers
  if (/^http:\/\/localhost(:\d+)?\//i.test(url)) {
    // hide broken local links in prod: return null or a placeholder
    return null;
  }
  // Force https if it was http but same host (rare)
  try {
    const u = new URL(url);
    if (u.protocol === 'http:') {
      u.protocol = 'https:';
      return u.toString();
    }
  } catch {}
  return url;
}
