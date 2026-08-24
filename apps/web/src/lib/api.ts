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
    let errorData = null;
    try {
      const text = await res.text();
      errorData = text ? JSON.parse(text) : null;
    } catch (e) {
      // Ignore JSON parse errors on error responses
    }
    const err: any = new Error(errorData?.error || 'API Request failed');
    if (errorData) {
      Object.assign(err, errorData);
    }
    throw err;
  }

  if (res.status === 204) {
    return null;
  }

  const text = await res.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return text; // Return plain text if not JSON
  }
}
