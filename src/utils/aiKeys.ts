// AI key manager — supports multiple keys per provider (Gemini, OpenAI, OpenRouter, HF, GROQ, DeepSeek, Custom)

export type AiProvider =
  | "gemini"
  | "openrouter"
  | "huggingface"
  | "openai"
  | "groq"
  | "deepseek"
  | "custom";

export interface AiKeyEntry {
  id: string;
  provider: AiProvider;
  key: string;
  label?: string;
  endpointUrl?: string;
  model?: string;
  createdAt: number;
}

export const PROVIDER_OPTIONS: { value: AiProvider; label: string; placeholder?: string }[] = [
  { value: "gemini", label: "Google Gemini AI", placeholder: "AIza… / AQ…" },
  { value: "openrouter", label: "OpenRouter API", placeholder: "sk-or-..." },
  { value: "huggingface", label: "HuggingFace Inference", placeholder: "hf_..." },
  { value: "openai", label: "OpenAI API", placeholder: "sk-..." },
  { value: "groq", label: "GROQ API", placeholder: "gsk_..." },
  { value: "deepseek", label: "DeepSeek API", placeholder: "sk-..." },
  { value: "custom", label: "مخدم ذكاء اصطناعي خاص (Custom Endpoint)", placeholder: "https://.../v1/chat/completions" },
];

const STORAGE_KEY = "aiKeys_v2";
const LEGACY_KEY = "customAiKey";
const LEGACY_PROVIDER = "aiProvider";

export function loadKeys(): AiKeyEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(isValidEntry);
    }
  } catch (e) {
    console.warn("Failed to load AI keys", e);
  }
  // One-time migration from old single-key storage
  try {
    const legacyKey = localStorage.getItem(LEGACY_KEY)?.trim();
    const legacyProvider = (localStorage.getItem(LEGACY_PROVIDER) as AiProvider) || "gemini";
    if (legacyKey) {
      const migrated: AiKeyEntry = {
        id: `legacy-${Date.now()}`,
        provider: legacyProvider,
        key: legacyKey,
        label: "مفتاح محفوظ قديماً",
        createdAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([migrated]));
      return [migrated];
    }
  } catch (e) {
    console.warn("Failed to migrate legacy AI key", e);
  }
  return [];
}

export function saveKeys(keys: AiKeyEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys.filter(isValidEntry)));
}

function isValidEntry(entry: any): entry is AiKeyEntry {
  return (
    entry &&
    typeof entry.id === "string" &&
    typeof entry.provider === "string" &&
    typeof entry.key === "string" &&
    typeof entry.createdAt === "number"
  );
}

export function getProviderKeys(keys: AiKeyEntry[], provider: AiProvider): AiKeyEntry[] {
  return keys.filter((k) => k.provider === provider && k.key.trim() !== "");
}

export function getActiveKey(keys: AiKeyEntry[], provider: AiProvider): AiKeyEntry | undefined {
  return getProviderKeys(keys, provider)[0];
}

export function getAnyAvailableKey(keys: AiKeyEntry[]): AiKeyEntry | undefined {
  return keys.find((k) => k.key.trim() !== "");
}

// ── Key routing: Gemini keys → voice ONLY; the other providers → services ──
// Gemini Live accepts Google keys only, so the live voice session must never
// receive an OpenAI/Groq/… key (Google rejects it and the session dies).
// Drawing, SVG code-reading and chart/diagram analysis run on any provider,
// so those requests prefer the first NON-Gemini key and leave Gemini keys
// exclusively for voice.
const SERVICE_PROVIDERS: AiProvider[] = ["openai", "openrouter", "huggingface", "groq", "deepseek", "custom"];

export function getServiceKey(keys: AiKeyEntry[]): AiKeyEntry | undefined {
  return keys.find((k) => SERVICE_PROVIDERS.includes(k.provider) && k.key.trim() !== "");
}

// Headers for drawing / code-reading requests — first non-Gemini key wins.
// Falls back to the active-provider headers when no non-Gemini key exists so
// nothing regresses for users who only have Gemini keys.
export function getServiceRequestHeaders(): Record<string, string> {
  const serviceKey = getServiceKey(loadKeys());
  if (serviceKey?.key.trim()) {
    const headers: Record<string, string> = {
      "x-custom-api-key": serviceKey.key.trim(),
      "x-custom-provider": serviceKey.provider,
    };
    if (serviceKey.provider === "custom" && serviceKey.endpointUrl?.trim()) {
      headers["x-custom-endpoint-url"] = serviceKey.endpointUrl.trim();
    }
    if (serviceKey.model?.trim()) {
      headers["x-custom-model"] = serviceKey.model.trim();
    }
    return headers;
  }
  return getActiveRequestHeaders();
}

export function addKey(
  keys: AiKeyEntry[],
  entry: Omit<AiKeyEntry, "id" | "createdAt">
): AiKeyEntry[] {
  const newEntry: AiKeyEntry = {
    ...entry,
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    createdAt: Date.now(),
  };
  return [...keys, newEntry];
}

export function removeKey(keys: AiKeyEntry[], id: string): AiKeyEntry[] {
  return keys.filter((k) => k.id !== id);
}

export function updateKey(keys: AiKeyEntry[], id: string, patch: Partial<AiKeyEntry>): AiKeyEntry[] {
  return keys.map((k) => (k.id === id ? { ...k, ...patch } : k));
}

export function providerLabel(provider: AiProvider): string {
  return PROVIDER_OPTIONS.find((p) => p.value === provider)?.label || provider;
}

export function providerPlaceholder(provider: AiProvider): string {
  return PROVIDER_OPTIONS.find((p) => p.value === provider)?.placeholder || "أدخل مفتاح الـ API";
}

export function getActiveRequestHeaders(): Record<string, string> {
  const provider = (localStorage.getItem("aiProvider") as AiProvider) || "gemini";
  const keys = loadKeys();
  const activeKey = getActiveKey(keys, provider);
  if (!activeKey?.key.trim()) return {};
  const headers: Record<string, string> = {
    "x-custom-api-key": activeKey.key.trim(),
    "x-custom-provider": provider,
  };
  if (provider === "custom" && activeKey.endpointUrl?.trim()) {
    headers["x-custom-endpoint-url"] = activeKey.endpointUrl.trim();
  }
  if (activeKey.model?.trim()) {
    headers["x-custom-model"] = activeKey.model.trim();
  }
  return headers;
}
