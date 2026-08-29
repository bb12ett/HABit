export function getApiUrl() {
  let p = window.location.pathname;
  if (p.endsWith('index.html')) p = p.slice(0, -10);
  if (!p.endsWith('/')) p += '/';
  return p + 'api/budget';
}

export async function fetchBudget() {
  try {
    const r = await fetch(getApiUrl(), { 
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) {
      const content = await r.json();
      if (content && typeof content === 'object' && Object.keys(content).length > 0) {
        return content;
      }
    }
  } catch (e) {
    console.error("fetchBudget error:", e);
  }
  return null;
}

export async function saveBudget(state) {
  if (!state) return false;
  try {
    const r = await fetch(getApiUrl(), {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(state)
    });
    return r.ok;
  } catch (e) {
    console.error("saveBudget error:", e);
    return false;
  }
}

export async function resetDatabase() {
  try {
    const r = await fetch(getApiUrl(), {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({})
    });
    return r.ok;
  } catch (e) {
    console.error("resetDatabase error:", e);
    return false;
  }
}
