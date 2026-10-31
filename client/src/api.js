export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error ?? `Error ${res.status}`, res.status, data);
  return data;
}

export const getPlugins = () => request('GET', '/api/plugins');
export const patchPlugin = (id, patch) => request('PATCH', `/api/plugins/${encodeURIComponent(id)}`, patch);
export const scan = () => request('POST', '/api/scan');
export const getSettings = () => request('GET', '/api/settings');
export const putFolders = (folders) => request('PUT', '/api/settings/folders', { folders });
export const getMeta = () => request('GET', '/api/meta');
export const listChains = () => request('GET', '/api/chains');
export const getChain = (id, freeOnly) => request('GET', `/api/chains/${encodeURIComponent(id)}?freeOnly=${freeOnly ? 'true' : 'false'}`);
