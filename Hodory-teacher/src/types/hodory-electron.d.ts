export {};

declare global {
  type HodoryHotspotStatus =
    | {
        supported: true;
        ifname: string;
        state: string;
        connection: string;
        isHotspotActive: boolean;
        ipv4Address: string | null;
      }
    | {
        supported: boolean;
        error: string;
      };

  interface Window {
    hodory?: {
      version?: string;
      hotspot?: {
        start: (options: {
          ssid: string;
          password?: string;
          security?: 'WPA' | 'WEP' | 'nopass';
          ifname?: string;
        }) => Promise<HodoryHotspotStatus>;
        stop: () => Promise<{ stopped: true }>;
        status: (options?: { ifname?: string }) => Promise<HodoryHotspotStatus>;
      };
    };
  }
}

