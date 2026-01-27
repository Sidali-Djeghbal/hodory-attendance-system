export type HotspotSecurity = 'WPA' | 'WEP' | 'nopass';

export type HotspotStatus = HodoryHotspotStatus;

function getHotspotApi() {
  if (typeof window === 'undefined') return null;
  return window.hodory?.hotspot ?? null;
}

export function isHotspotAvailable() {
  return Boolean(getHotspotApi());
}

export async function hotspotStatus(options?: { ifname?: string }) {
  const api = getHotspotApi();
  if (!api) {
    return { supported: false, error: 'Hotspot API is not available.' } as const;
  }
  return api.status(options);
}

export async function hotspotStart(options: {
  ssid: string;
  password?: string;
  security?: HotspotSecurity;
  ifname?: string;
}) {
  const api = getHotspotApi();
  if (!api) {
    return { supported: false, error: 'Hotspot API is not available.' } as const;
  }
  return api.start(options);
}

export async function hotspotStop() {
  const api = getHotspotApi();
  if (!api) {
    return { stopped: true } as const;
  }
  return api.stop();
}

export function buildWifiQrString(options: {
  ssid: string;
  password?: string;
  security?: HotspotSecurity;
}) {
  const ssid = options.ssid ?? '';
  const security = options.security ?? 'WPA';

  const escape = (value: string) =>
    value.replace(/([\\\\;,:"])/g, '\\\\$1');

  if (security === 'nopass') {
    return `WIFI:T:nopass;S:${escape(ssid)};;`;
  }

  // Most scanners understand WPA for WPA/WPA2/WPA3 PSK.
  return `WIFI:T:WPA;S:${escape(ssid)};P:${escape(String(options.password ?? ''))};;`;
}

export function resolveAdvertisedApiBaseUrl(options: {
  configured?: string | null;
  hotspotIpv4?: string | null;
}) {
  const configured =
    options.configured?.replace(/\/+$/, '') ?? 'http://127.0.0.1:8000/api';

  const hotspotIpv4 = options.hotspotIpv4 ?? null;
  if (!hotspotIpv4) return configured;

  try {
    const url = new URL(configured);
    const isLocalhost =
      url.hostname === '127.0.0.1' || url.hostname === 'localhost';
    if (!isLocalhost) return configured;

    url.hostname = hotspotIpv4;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return configured;
  }
}

