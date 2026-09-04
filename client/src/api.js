const BASE = 'http://localhost:4000/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const createReplay = () => request('/replays', { method: 'POST' });

export const getReplay = (id) => request(`/replays/${id}`);

export const postEvent = (id, event_type, payload = {}) =>
  request(`/replays/${id}/events`, {
    method: 'POST',
    body: JSON.stringify({ event_type, payload }),
  });
