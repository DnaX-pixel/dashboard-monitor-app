async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    ...opts,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return body;
}

export const api = {
  get:    (p)    => apiFetch(p),
  post:   (p, b) => apiFetch(p, { method: 'POST',   body: JSON.stringify(b) }),
  put:    (p, b) => apiFetch(p, { method: 'PUT',    body: JSON.stringify(b) }),
  delete: (p)    => apiFetch(p, { method: 'DELETE' }),
};
