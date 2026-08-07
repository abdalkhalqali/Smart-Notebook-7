// ══════════════════════════════════════════════════════════════════
// userDrawings.ts — أدوات مكتبة "رسوماتي" (رسمات كود يحفظها المستخدم)
// مطابقة محلية بالكلمات (بدون استهلاك حصة) + أدوات دمج وحفظ
// تُستخدم من قارئ المحاضرات والسبورة الذكية معاً
// ══════════════════════════════════════════════════════════════════
import type { UserDrawing } from "../types";

const ar = (s: string) => s.toLowerCase().replace(/[\u064B-\u0652\u0640]/g, "");

/**
 * مطابقة طلب المستخدم مع رسمات المكتبة بالكلمات المفتاحية.
 * تعيد أفضل تطابق أو null. الأولوية تُقرر خارجياً (خاصة ثم عامة).
 */
export function matchUserDrawing(text: string, drawings: UserDrawing[]): UserDrawing | null {
  const q = ar(text.trim());
  if (!q || !drawings || !drawings.length) return null;
  let best: UserDrawing | null = null;
  let bestScore = 0;
  for (const d of drawings) {
    let score = 0;
    const haystack = [d.name, ...(d.keywords || [])];
    for (const kw of haystack) {
      const k = ar(kw);
      if (k && q.includes(k)) score += k.replace(/\s/g, "").length >= 4 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return bestScore > 0 ? best : null;
}

/** دمج قائمتين مع تجاهل التكرار بالمعرّف */
export function mergeUserDrawings(a: UserDrawing[], b: UserDrawing[]): UserDrawing[] {
  const seen = new Set(a.map((d) => d.id));
  const out = [...a];
  for (const d of b) {
    if (!seen.has(d.id)) {
      out.push(d);
      seen.add(d.id);
    }
  }
  return out;
}

/** تعمية خفيفة: إزالة أي <script> وخصائص on* من كود المستخدم */
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
}

/** مولّد معرّف فريد */
export function uid(prefix = "d"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** تحقق سريع من صلاحية بنية SVG (محلل DOM) */
export function validateSvg(svg: string): boolean {
  if (!svg.trim()) return false;
  try {
    const doc = new DOMParser().parseFromString(sanitizeSvg(svg), "image/svg+xml");
    return !doc.querySelector("parsererror");
  } catch {
    return false;
  }
}
