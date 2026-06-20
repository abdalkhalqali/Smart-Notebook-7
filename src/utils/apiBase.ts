const isCapacitorNative =
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor?.isNativePlatform?.() === true;

const buildTimeServerUrl = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function getApiBase(): string {
  if (isCapacitorNative) {
    // Runtime override from settings screen takes priority over build-time value
    const runtimeUrl = (typeof localStorage !== "undefined"
      ? localStorage.getItem("serverUrl")
      : null) ?? "";
    const resolved = (runtimeUrl || buildTimeServerUrl).replace(/\/$/, "");
    if (!resolved) {
      console.error(
        "[UnNoted] Running on native mobile but no server URL is configured. " +
        "Go to Settings → عنوان الخادم and enter your server URL (e.g. https://your-app.replit.app)."
      );
    }
    return resolved;
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
