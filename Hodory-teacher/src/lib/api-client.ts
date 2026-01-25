const DIRECT_BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ??
  'http://127.0.0.1:8000/api';

// In the browser we call our own Next.js proxy route to avoid CORS issues.
// On the server (route handlers) we can call the backend directly.
export const API_BASE_URL =
  typeof window === 'undefined' ? DIRECT_BACKEND_BASE_URL : '/api/backend';

export type ApiError = Error & {
  status?: number;
  detail?: unknown;
};

function makeApiError(message: string, status?: number, detail?: unknown) {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.detail = detail;
  return error;
}

export async function apiJson<TResponse>(
  path: string,
  options?: {
    method?: string;
    token?: string | null;
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }
): Promise<TResponse> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const method = options?.method ?? (options?.body ? 'POST' : 'GET');
  const headers: Record<string, string> = {
    ...(options?.headers ?? {})
  };

  if (options?.body !== undefined) {
    headers['content-type'] = headers['content-type'] ?? 'application/json';
  }
  if (options?.token) {
    headers.authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options?.signal
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data && data.message
        ? String(data.message)
        : null) ??
      (data && typeof data === 'object' && 'detail' in data && data.detail
        ? String(data.detail)
        : null) ??
      response.statusText ??
      'Request failed';
    throw makeApiError(message, response.status, data);
  }

  return data as TResponse;
}
