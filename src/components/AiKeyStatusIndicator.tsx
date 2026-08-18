import { useEffect, useState } from "react";
import { getVoiceKeyInfo, getServiceKeyInfo, KeyRouteInfo } from "../utils/aiKeys";

const SOURCE_LABEL: Record<KeyRouteInfo["source"], string> = {
  personal: "مفتاح شخصي",
  server: "مفتاح الخادم",
  none: "غير متوفر",
};

const DOT_CLASS: Record<KeyRouteInfo["source"], string> = {
  personal: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
  server: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]",
  none: "bg-slate-500",
};

function Chip({ icon, title, hint, info }: { icon: string; title: string; hint: string; info: KeyRouteInfo }) {
  const tooltip = `${title} (${hint}): ${SOURCE_LABEL[info.source]} — ${info.label}${info.tail ? ` ${info.tail}` : ""}`;
  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-950/85 border border-slate-700/60 text-[10px] text-slate-300 whitespace-nowrap select-none cursor-help"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLASS[info.source]}`} />
      <span className="shrink-0">{icon}</span>
      <span className="font-black shrink-0">{title}</span>
      <span className="text-slate-400 font-semibold">{info.label}</span>
      {info.tail && (
        <span className="font-mono text-slate-500" dir="ltr">{info.tail}</span>
      )}
    </span>
  );
}

// Live indicator: 🎤 voice key (Gemini-only) + 🎨 drawing/code-reading key
// (first non-Gemini key, with the active key as fallback). Green dot = your
// personal key, amber dot = the server's key pool, grey = none configured.
export default function AiKeyStatusIndicator({ className = "" }: { className?: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener("ai-keys-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ai-keys-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const voice = getVoiceKeyInfo();
  const service = getServiceKeyInfo();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} dir="rtl">
      <Chip icon="🎤" title="الصوت" hint="جلسة المحادثة الصوتية الحية — Gemini فقط" info={voice} />
      <Chip icon="🎨" title="الرسم" hint="الرسم وقراءة كود الرسم — أول مفتاح غير Gemini" info={service} />
    </div>
  );
}
