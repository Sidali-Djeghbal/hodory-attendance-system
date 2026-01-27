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

function readPositiveIntEnv(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

const DEFAULT_TIMEOUT_MS =
  readPositiveIntEnv('NEXT_PUBLIC_API_TIMEOUT_MS') ??
  (process.env.NODE_ENV === 'production' ? 10_000 : 120_000);

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
    timeoutMs?: number;
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

  const combineSignals = (signals: AbortSignal[]) => {
    // Prefer AbortSignal.any where available (Node 18+/modern browsers), fallback otherwise.
    const anyFn = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal })
      .any;
    if (anyFn) return anyFn(signals);

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }
    return controller.signal;
  };

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const combinedSignal = options?.signal
    ? combineSignals([options.signal, controller.signal])
    : controller.signal;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options?.body === undefined ? undefined : JSON.stringify(options.body),
      signal: combinedSignal
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw makeApiError('Request timed out', 408);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

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
