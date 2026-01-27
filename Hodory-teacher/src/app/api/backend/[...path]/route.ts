export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ??
  'http://127.0.0.1:8000/api';

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host'
]);

function filterRequestHeaders(headers: Headers) {
  const next = new Headers();
  headers.forEach((value, key) => {
    if (HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) return;
    next.set(key, value);
  });
  return next;
}

function buildTargetUrl(request: Request, path: string[]) {
  const incoming = new URL(request.url);
  const normalizedBase = BACKEND_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.map((p) => encodeURIComponent(p)).join('/');
  return `${normalizedBase}/${normalizedPath}${incoming.search}`;
}

async function proxy(request: Request, path: string[]) {
  const targetUrl = buildTargetUrl(request, path);
  const headers = filterRequestHeaders(request.headers);

  const method = request.method.toUpperCase();
  const body =
    method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
      ? undefined
      : await request.arrayBuffer();

  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
    cache: 'no-store'
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function OPTIONS(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxy(request, path);
}

