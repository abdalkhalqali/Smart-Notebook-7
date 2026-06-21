/// <reference types="vite/client" />

const DEFAULT_SERVER_URL = "https://smart-notebook-7--aymanbdh551.replit.app";

const isCapacitorNative =
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor?.isNativePlatform?.() === true;

const buildTimeServerUrl = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function getApiBase(): string {
  const runtimeUrl = (typeof localStorage !== "undefined"
    ? localStorage.getItem("serverUrl")
    : null) ?? "";

  if (isCapacitorNative) {
    const resolved = (runtimeUrl || buildTimeServerUrl || DEFAULT_SERVER_URL).replace(/\/$/, "");
    return resolved;
  }

  if (runtimeUrl && runtimeUrl !== DEFAULT_SERVER_URL) {
    return runtimeUrl.replace(/\/$/, "");
  }

  return "";
}

export function resolveApiUrl(path: string): string {
  const base = getApiBase();
  if (base && path.startsWith("/")) {
    return base + path;
  }
  return path;
}
