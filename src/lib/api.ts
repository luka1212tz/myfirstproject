export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  let data: any = {};
  try { data = await response.json(); } catch { /* response had no JSON body */ }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data as T;
}

export function localToday() {
  const now = new Date();
  const local = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}
