/**
 * Base HTTP fetch wrapper with JWT header support and error parsing
 */

const BASE_URL = '/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('sentinel_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 204) {
    return null;
  }

  // Handle binary responses (e.g. PDF / CSV export)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf') || contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new Error(`Export failed with status ${response.status}`);
    }
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data.details || null;
    throw err;
  }

  return data;
}

export const api = {
  get: (url, params, options) => {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value);
        }
      });
      const qStr = searchParams.toString();
      if (qStr) query = `?${qStr}`;
    }
    return request(`${url}${query}`, { method: 'GET', ...options });
  },
  post: (url, body, options) => request(url, { method: 'POST', body, ...options }),
  put: (url, body, options) => request(url, { method: 'PUT', body, ...options }),
  patch: (url, body, options) => request(url, { method: 'PATCH', body, ...options }),
  delete: (url, options) => request(url, { method: 'DELETE', ...options }),
};
