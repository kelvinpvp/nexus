const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const headers = { ...options.headers } as Record<string, string>;
  
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const err: any = new Error(errorData?.error || 'API Request failed');
    // Attach all fields from the error body so callers can inspect them
    if (errorData) {
      Object.assign(err, errorData);
    }
    throw err;
  }

  return res.json();
}
