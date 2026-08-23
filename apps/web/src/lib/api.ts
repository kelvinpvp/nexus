const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || 'API Request failed');
  }

  return res.json();
}
