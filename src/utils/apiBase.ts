const isCapacitorNative =
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor?.isNativePlatform?.() === true;

const configuredServerUrl = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function getApiBase(): string {
  if (isCapacitorNative) {
    if (configuredServerUrl) return configuredServerUrl;
    console.error(
      "[UnNoted] Running on native mobile but VITE_SERVER_URL is not set. " +
      "Set VITE_SERVER_URL to your deployed server URL (e.g. https://your-app.replit.app) before building the APK."
    );
    return "";
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
