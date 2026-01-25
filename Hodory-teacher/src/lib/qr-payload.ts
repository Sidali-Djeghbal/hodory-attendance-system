export type HodoryQrPayloadV1 = {
  v: 1;
  type: 'hodory.attendance.session';
  session: {
    id: number;
    code: string;
    moduleCode?: string;
    room?: string | null;
    startedAt?: string | null;
    durationMinutes?: number;
  };
  network?: {
    ssid: string;
    password?: string;
    security?: 'WPA' | 'WEP' | 'nopass';
  };
  // Optional hint for clients; student app may ignore and use its own config.
  apiBaseUrl?: string;
};

export function encodeQrPayload(payload: HodoryQrPayloadV1) {
  // Keep payload compact for QR density.
  return JSON.stringify(payload);
}

