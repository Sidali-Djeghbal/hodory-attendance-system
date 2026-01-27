import Constants from "expo-constants";

function parseHostFromUri(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;

	try {
		if (trimmed.includes("://")) return new URL(trimmed).hostname;
	} catch {
		// ignore
	}

	// Typical Expo hostUri/debuggerHost formats:
	// - "192.168.1.10:8081"
	// - "192.168.1.10:19000"
	// - "192.168.1.10:19000/some/path"
	const withoutPath = trimmed.split("/")[0] ?? trimmed;
	const host = withoutPath.split(":")[0] ?? withoutPath;
	return host || null;
}

function inferDevApiUrl(): string | null {
	const anyConstants = Constants as unknown as {
		expoConfig?: { hostUri?: string | null } | null;
		manifest?: { debuggerHost?: string | null } | null;
		manifest2?: { extra?: { expoClient?: { hostUri?: string | null } } } | null;
	};

	const host =
		parseHostFromUri(anyConstants.expoConfig?.hostUri) ??
		parseHostFromUri(anyConstants.manifest2?.extra?.expoClient?.hostUri) ??
		parseHostFromUri(anyConstants.manifest?.debuggerHost);

	if (!host) return null;
	if (host === "localhost" || host === "127.0.0.1") return null;

	// When developing with Expo Go / dev builds, the backend usually runs on the same
	// machine as the Metro packager. Use the detected host with port 8000.
	return `http://${host}:8000/api`;
}

function normalizeApiBaseUrl(value: string): string {
	let url = value.trim();
	if (!url) return "";
	if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
	url = url.replace(/\/+$/, "");
	if (!/\/api$/i.test(url)) url = `${url}/api`;
	return url.replace(/\/+$/, "");
}

const FALLBACK_API_URL = inferDevApiUrl() ?? "http://127.0.0.1:8000/api";

// Configure per-build/per-env via `EXPO_PUBLIC_API_URL`.
// Example: http://192.168.1.10:8000/api
export const API_URL = normalizeApiBaseUrl(
	process.env.EXPO_PUBLIC_API_URL ?? FALLBACK_API_URL,
);

type FetcherData<TData> = {
	status: number;
	statusText?: string;
} & (
		| {
			ok: true;
			data: TData;
		}
		| {
			ok: false;
			data: null;
		}
	);

type FetcherOptions = {
	route: string;
	token?: string;
	baseUrl?: string;
} & (
		| {
			method: "POST" | "PUT";
			data: unknown;
		}
		| {
			method: "GET" | "DELETE";
		}
	);

export default async function fetcher<TData>(
	options: FetcherOptions,
): Promise<FetcherData<TData>> {
	const { route, method, token, baseUrl } = options;
	if (!token) return { status: 401, ok: false, data: null };

	try {
		const base = baseUrl ? normalizeApiBaseUrl(baseUrl) : API_URL;
		const url = route.startsWith("http") ? route : `${base}${route}`;
		const res = await fetch(url, {
			method,
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body:
				method === "POST" || method === "PUT"
					? JSON.stringify(options.data)
					: undefined,
		});

		if (!res.ok)
			return {
				status: res.status,
				statusText: res.statusText,
				ok: false,
				data: await res.json(),
			};

		if (method === "GET")
			return {
				status: res.status,
				ok: true,
				data: await res.json(),
			};

		// Other methods don't need data, so we return an empty object
		// if we return res.json() it may error.
		return {
			status: res.status,
			ok: true,
			data: {} as TData,
		};
	} catch (e) {
		return {
			status: 500,
			statusText: `JS: ${e}`,
			ok: false,
			data: null,
		};
	}
}
