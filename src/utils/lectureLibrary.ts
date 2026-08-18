// ══════════════════════════════════════════════════════════════════
// lectureLibrary.ts — مكتبة حفظ المحاضرات في قارئ المحاضرات الذكي
// • محاضرات محفوظة (اسم + تاريخ + رسومات + نص + مناقشة اختيارية)
// • المكتبة العامة للرسومات (مشتركة بين كل المحاضرات والسبورة)
// • تحليل SVG محلي (فوري بدون استهلاك حصة) لشرح الرسمة من كودها
// ══════════════════════════════════════════════════════════════════
import type { UserDrawing, QaMessage } from "../types";

export interface SavedNarration {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  scope: "public" | "private"; // عامة → الرسومات تُحفظ في المكتبة العامة
  hasDiscussion: boolean; // هل تتضمن سجل المناقشة؟
  lectureText: string;
  drawings: UserDrawing[]; // رسومات خاصة بالمحاضرة
  qaHistory: QaMessage[]; // سجل المناقشة (إن وُجد)
  createdAt: string;
  updatedAt: string;
  /** محاضرة جاهزة مدمجة تظهر دائماً (من initialLectures) ولو لم تُحفظ */
  ready?: boolean;
  /** وصف مختصر يوضّح محتوى المحاضرة (للمحاضرات الجاهزة) */
  desc?: string;
}

const NARRATIONS_KEY = "smartNotebook_saved_narrations";
const PUBLIC_DRAWINGS_KEY = "unnoted_public_drawings"; // نفس المفتاح المستخدم في initialData.ts

/** مولّد معرّف فريد */
export function uid(prefix = "sn"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** قراءة المحاضرات المحفوظة بأمان */
export function loadSavedNarrations(): SavedNarration[] {
  try {
    const raw = localStorage.getItem(NARRATIONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error("Failed to load saved narrations", e);
    return [];
  }
}

/** حفظ قائمة المحاضرات المحفوظة */
export function persistSavedNarrations(list: SavedNarration[]) {
  try {
    localStorage.setItem(NARRATIONS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to persist saved narrations", e);
  }
}

/** قراءة المكتبة العامة للرسومات بأمان */
export function loadPublicDrawings(): UserDrawing[] {
  try {
    const raw = localStorage.getItem(PUBLIC_DRAWINGS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error("Failed to load public drawings", e);
    return [];
  }
}

/** حفظ المكتبة العامة للرسومات */
export function persistPublicDrawings(list: UserDrawing[]) {
  try {
    localStorage.setItem(PUBLIC_DRAWINGS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to persist public drawings", e);
  }
}

/** دمج قائمتين مع تجاهل التكرار بالمعرّف (الجديدة لها الأولوية في التحديث) */
export function mergeUnique<T extends { id: string }>(a: T[], b: T[]): T[] {
  const seen = new Set(a.map((x) => x.id));
  const out = [...a];
  for (const item of b) {
    const idx = out.findIndex((x) => x.id === item.id);
    if (idx >= 0) out[idx] = item;
    else out.push(item);
  }
  return out;
}

/** البحث عن محاضرة بالاسم (تجاهل المسافات والحالة) */
export function findByName(list: SavedNarration[], name: string): SavedNarration | null {
  const q = name.trim().replace(/\s+/g, " ").toLowerCase();
  return list.find((n) => n.name.trim().replace(/\s+/g, " ").toLowerCase() === q) || null;
}

/** تنسيق تاريخ عربي مقروء من ISO/YYYY-MM-DD */
export function formatNiceDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr.length <= 10 ? dateStr + "T00:00:00" : dateStr);
  if (isNaN(d.getTime())) return dateStr;
  try {
    return d.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/** تاريخ اليوم بصيغة YYYY-MM-DD (لحقل التاريخ) */
export function todayInputDate(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// ══════════════════════════════════════════════════════════════════
// تحليل SVG محلي — يقرأ كود الرسمة ويستخرج وصفاً تعليمياً فورياً
// (بدون أي استهلاك للحصة) — يُستخدم كشرح فوري أو كسقوط عند غياب API
// ══════════════════════════════════════════════════════════════════
export function extractDrawingSummary(svg: string): string {
  const s = svg || "";
  const parts: string[] = [];

  // العناصر الأساسية
  const nCircle = (s.match(/<circle/g) || []).length;
  const nRect = (s.match(/<rect/g) || []).length;
  const nLine = (s.match(/<line/g) || []).length;
  const nPath = (s.match(/<path/g) || []).length;
  const nText = (s.match(/<text/g) || []).length;
  const nPoly = (s.match(/<polygon|<polyline/g) || []).length;

  // النصوص الظاهرة (التسميات والقيم)
  const labels: string[] = [];
  const textRe = /<text[^>]*>([^<]+)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = textRe.exec(s)) !== null) {
    const t = m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    if (t && t.length <= 24 && !labels.includes(t)) labels.push(t);
  }

  // قيم كهربائية شائعة
  const volts = s.match(/\b\d+(?:\.\d+)?\s*[Vv]\b/g);
  const ohms = s.match(/\b\d+(?:\.\d+)?\s*(?:Ω|ohm)\b/gi);
  const caps = s.match(/\b\d+(?:\.\d+)?\s*(?:µ?F|nF|pF)\b/gi);

  const shapeCount = nCircle + nRect + nLine + nPath + nPoly;
  if (shapeCount > 0) {
    const kinds: string[] = [];
    if (nCircle) kinds.push(`${nCircle} دائرة`);
    if (nRect) kinds.push(`${nRect} مستطيل`);
    if (nLine) kinds.push(`${nLine} خط`);
    if (nPath) kinds.push(`${nPath} مسار`);
    if (nPoly) kinds.push(`${nPoly} مضلع`);
    parts.push(`تحتوي على ${kinds.join("، ")}`);
  }
  if (nText) parts.push(`${nText} تسمية نصية`);
  if (labels.length) parts.push(`التسميات الظاهرة: ${labels.slice(0, 12).join("، ")}${labels.length > 12 ? "…" : ""}`);
  if (volts?.length) parts.push(`قيم جهد: ${volts.slice(0, 4).join("، ")}`);
  if (ohms?.length) parts.push(`قيم مقاومة: ${ohms.slice(0, 4).join("، ")}`);
  if (caps?.length) parts.push(`قيم سعات: ${caps.slice(0, 4).join("، ")}`);

  if (parts.length === 0) return "رسمة بسيطة دون عناصر بارزة (قد تكون خلفية أو شكلاً حراً).";
  return parts.join(". ") + ".";
}
