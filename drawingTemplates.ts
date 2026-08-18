// ══════════════════════════════════════════════════════════════════════
// drawingTemplates.ts — مكتبة القوالب الجاهزة للرسم العلمي (20 قالباً)
// كل قالب يرسم SVG دقيق وجميل بتنسيق موحد، ويُطابَق عليه النص محلياً
// بدون أي استهلاك للحصة (مجاني وفوري)، والنموذج يستخرج القيم فقط عند
// الحاجة (خيار اختياري يرتد تلقائياً للقيم الافتراضية عند أي فشل).
//
// يُستورد من server.ts فقط → esbuild يضمّنه تلقائياً في dist/server.cjs
// ══════════════════════════════════════════════════════════════════════

export interface TemplateParams {
  [key: string]: any;
}

export interface DrawingTemplate {
  id: string;
  nameAr: string;
  keywords: string[];
  render: (p: TemplateParams) => string;
  defaults: TemplateParams;
  /** تلميح للنموذج: ما المعاملات التي يمكن استخراجها من نص المستخدم */
  extractHint: string;
}

// ── لوحة الألوان الموحدة ────────────────────────────────────────────────
const C = {
  ink: "#1e293b",
  soft: "#475569",
  faint: "#94a3b8",
  grid: "#e2e8f0",
  blue: "#2563eb",
  blueSoft: "#dbeafe",
  red: "#dc2626",
  redSoft: "#fee2e2",
  amber: "#d97706",
  amberSoft: "#fef3c7",
  green: "#16a34a",
  greenSoft: "#dcfce7",
  teal: "#0d9488",
  tealSoft: "#ccfbf1",
  violet: "#7c3aed",
  violetSoft: "#ede9fe",
  gray: "#64748b",
  graySoft: "#eef2f7",
  white: "#ffffff",
};

const FONT = "'Tahoma','Segoe UI',Arial,sans-serif";
const FONT_MATH = "Georgia,'Times New Roman',serif";

// ── أدوات بناء SVG ───────────────────────────────────────────────────────
function esc(v: any): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function frame(title: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 400">
<rect width="560" height="400" rx="14" fill="#fbfcfe"/>
<rect x="1.5" y="1.5" width="557" height="397" rx="12.5" fill="none" stroke="#e2e8f0" stroke-width="2"/>
<rect x="20" y="16" width="6" height="24" rx="3" fill="#2563eb"/>
<text x="36" y="34" font-size="17" font-weight="700" fill="#0f172a" font-family="${FONT}">${esc(title)}</text>
${body}
</svg>`;
}

function t(
  x: number,
  y: number,
  s: string,
  o: {
    size?: number;
    fill?: string;
    weight?: number;
    italic?: boolean;
    anchor?: "start" | "middle" | "end";
    opacity?: number;
  } = {}
): string {
  const a = o.anchor ?? "middle";
  return `<text x="${x}" y="${y}" font-size="${o.size ?? 13}" fill="${o.fill ?? C.ink}"${o.weight ? ` font-weight="${o.weight}"` : ""}${o.opacity != null ? ` opacity="${o.opacity}"` : ""} text-anchor="${a}" font-family="${o.italic ? FONT_MATH : FONT}"${o.italic ? " font-style=\"italic\"" : ""}>${esc(s)}</text>`;
}

function line(x1: number, y1: number, x2: number, y2: number, o: { stroke?: string; w?: number; dash?: string; opacity?: number } = {}): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke ?? C.ink}" stroke-width="${o.w ?? 2.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}${o.opacity != null ? ` opacity="${o.opacity}"` : ""} stroke-linecap="round"/>`;
}

function circle(cx: number, cy: number, r: number, o: { fill?: string; stroke?: string; w?: number; dash?: string; opacity?: number } = {}): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${o.fill ?? "none"}"${o.stroke ? ` stroke="${o.stroke}"` : ""}${o.w ? ` stroke-width="${o.w}"` : ""}${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}${o.opacity != null ? ` opacity="${o.opacity}"` : ""}/>`;
}

function dot(cx: number, cy: number, r = 3.5, color = C.ink): string {
  return circle(cx, cy, r, { fill: color });
}

function arrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  o: { w?: number; head?: number; dash?: string; opacity?: number } = {}
): string {
  const w = o.w ?? 2.5;
  const h = o.head ?? 10;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const hx = h * Math.cos(ang);
  const hy = h * Math.sin(ang);
  const px = -Math.sin(ang) * h * 0.42;
  const py = Math.cos(ang) * h * 0.42;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}${o.opacity != null ? ` opacity="${o.opacity}"` : ""}/><polygon points="${x2},${y2} ${x2 - hx + px},${y2 - hy + py} ${x2 - hx - px},${y2 - hy - py}" fill="${color}"/>`;
}

function arrowBoth(x1: number, y1: number, x2: number, y2: number, color: string, o: { w?: number; head?: number } = {}): string {
  const w = o.w ?? 1.8;
  const h = o.head ?? 9;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const hx = h * Math.cos(ang);
  const hy = h * Math.sin(ang);
  const px = -Math.sin(ang) * h * 0.42;
  const py = Math.cos(ang) * h * 0.42;
  const head = (xx: number, yy: number, s: 1 | -1) =>
    `<polygon points="${xx},${yy} ${xx + s * (-hx + px)},${yy + s * (-hy + py)} ${xx + s * (-hx - px)},${yy + s * (-hy - py)}" fill="${color}"/>`;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>${head(x1, y1, 1)}${head(x2, y2, -1)}`;
}

function eraser(x: number, y: number, w: number, h: number, fill = "#fbfcfe"): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
}

function polylinePath(pts: [number, number][], close = false): string {
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + (close ? " Z" : "");
}

// ══════════════════════════════════════════════════════════════════════
// 1) دائرة كهربائية تسلسلية — مع أسلاك توصيل مضمونة
// ══════════════════════════════════════════════════════════════════════
function circuitSeries(p: TemplateParams): string {
  const voltage = p.voltage ?? "12V";
  const rValue = p.resistance ?? "100Ω";
  const bulbLabel = p.bulbLabel ?? "مصباح";
  const title = p.title ?? "دائرة كهربائية تسلسلية";  const b = `
${line(110, 120, 450, 120)}
${line(110, 280, 450, 280)}
${line(110, 120, 110, 280)}
${line(450, 120, 450, 280)}
`;
  // بطارية (يسار)
  const battery = `
${eraser(96, 152, 28, 96)}
${line(110, 158, 110, 242, { w: 4 })}
${line(110, 178, 110, 222, { w: 8 })}
${t(128, 170, "+", { size: 15, fill: C.red, weight: 700 })}
${t(128, 234, "−", { size: 15, fill: C.blue, weight: 700 })}
${t(92, 158, esc(voltage), { size: 12, fill: C.blue, anchor: "end", weight: 700 })}`;
  // مقاومة (أعلى)
  const resistor = `
${eraser(216, 104, 128, 32)}
<path d="M220,120 l13,-11 l26,11 l26,-11 l26,11 l13,-11" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
${t(280, 98, "R", { size: 13, italic: true, fill: C.blue })}
${t(280, 140, esc(rValue), { size: 12, fill: C.soft })}`;
  // مصباح (أسفل)
  const bulb = `
${eraser(256, 258, 48, 44)}
${circle(280, 280, 17, { stroke: C.ink, w: 2.5, fill: C.amberSoft })}
${line(263, 263, 297, 297, { w: 2 })}
${line(297, 263, 263, 297, { w: 2 })}
${t(280, 316, esc(bulbLabel), { size: 12, fill: C.amber })}
${line(262, 280, 263.5, 280, { w: 2.5 })}
${line(296.5, 280, 298, 280, { w: 2.5 })}`;
  // مفتاح (يمين)
  const sw = `
${eraser(430, 166, 42, 68)}
${dot(450, 186, 3.5)}
${line(450, 172, 450, 184, { w: 2.5 })}
${line(450, 186, 434, 224, { w: 3, stroke: C.red })}
${t(462, 204, "مفتاح", { size: 12, fill: C.red, anchor: "start" })}`;
  // سهم التيار
  const cur = `${arrow(196, 108, 220, 108, C.blue, { w: 2, head: 8 })}${t(230, 112, "I", { size: 13, italic: true, fill: C.blue, anchor: "start" })}`;
  return frame(title, `${b}${battery}${resistor}${bulb}${sw}${cur}`);
}

// ══════════════════════════════════════════════════════════════════════
// 2) دائرة كهربائية على التوازي
// ══════════════════════════════════════════════════════════════════════
function circuitParallel(p: TemplateParams): string {
  const voltage = p.voltage ?? "12V";
  const bulbLabel = p.bulbLabel ?? "مصباح";
  const title = p.title ?? "دائرة كهربائية على التوازي";  const b = `
${line(120, 150, 440, 150)}
${line(120, 270, 440, 270)}
${line(120, 150, 120, 270)}
${line(440, 150, 440, 270)}
${line(210, 150, 210, 270)}
${line(330, 150, 330, 270)}
`;
  const battery = `
${eraser(106, 168, 28, 64)}
${line(120, 176, 120, 244, { w: 4 })}
${line(120, 190, 120, 230, { w: 8 })}
${t(138, 186, "+", { size: 14, fill: C.red, weight: 700 })}
${t(138, 238, "−", { size: 14, fill: C.blue, weight: 700 })}
${t(92, 168, esc(voltage), { size: 12, fill: C.blue, anchor: "end", weight: 700 })}`;
  const resistor = `
${eraser(194, 168, 32, 84)}
<path d="M210,174 l-11,12 l22,24 l-22,24 l22,24 l-11,12" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
${t(210, 152, "R", { size: 13, italic: true, fill: C.blue })}
${t(210, 292, "R", { size: 12, italic: true, fill: C.blue })}`;
  const bulb = `
${eraser(314, 190, 32, 40)}
${circle(330, 210, 16, { stroke: C.ink, w: 2.5, fill: C.amberSoft })}
${line(314, 194, 346, 226, { w: 2 })}
${line(346, 194, 314, 226, { w: 2 })}
${t(330, 246, esc(bulbLabel), { size: 12, fill: C.amber })}`;
  const jdots = `${dot(210, 150)}${dot(210, 270)}${dot(330, 150)}${dot(330, 270)}`;
  const cur = `${arrow(196, 138, 220, 138, C.blue, { w: 2, head: 8 })}${t(230, 142, "I", { size: 13, italic: true, fill: C.blue, anchor: "start" })}`;
  return frame(title, `${b}${battery}${resistor}${bulb}${jdots}${cur}`);
}

// ══════════════════════════════════════════════════════════════════════
// 3) البندول البسيط
// ══════════════════════════════════════════════════════════════════════
function pendulum(p: TemplateParams): string {
  const ang = Math.min(60, Math.max(5, Number(p.angle ?? 25)));
  const L = Math.min(230, Math.max(90, Number(p.length ?? 170)));
  const rad = (ang * Math.PI) / 180;
  const px = 280 + L * Math.sin(rad);
  const py = 58 + L * Math.cos(rad);
  const title = p.title ?? "البندول البسيط";
  const b = `
${line(180, 58, 380, 58, { w: 7 })}
${line(190, 50, 178, 58, { w: 2.5, stroke: C.gray })}
${line(220, 50, 208, 58, { w: 2.5, stroke: C.gray })}
${line(250, 50, 238, 58, { w: 2.5, stroke: C.gray })}
${line(280, 50, 268, 58, { w: 2.5, stroke: C.gray })}
${line(310, 50, 298, 58, { w: 2.5, stroke: C.gray })}
${line(340, 50, 328, 58, { w: 2.5, stroke: C.gray })}
${line(370, 50, 358, 58, { w: 2.5, stroke: C.gray })}
${line(280, 58, 280, 330, { dash: "6,5", stroke: C.faint, w: 1.6 })}
${line(280, 58, px, py, { w: 2.6 })}
<path d="M280,104 A46,46 0 0 1 ${(280 + 46 * Math.sin(rad)).toFixed(1)},${(58 + 46 * Math.cos(rad)).toFixed(1)}" fill="none" stroke="${C.blue}" stroke-width="1.8"/>
${t(306, 96, "θ", { size: 14, italic: true, fill: C.blue })}
${circle(px, py, 18, { fill: C.amberSoft, stroke: C.ink, w: 2.5 })}
${t(px, py + 5, "m", { size: 15, italic: true })}
<text x="${(280 + px) / 2 - 14}" y="${(58 + py) / 2 + 6}" font-size="14" font-style="italic" fill="${C.green}" font-family="${FONT_MATH}" transform="rotate(${ang} ${(280 + px) / 2 - 14} ${(58 + py) / 2 + 6})">L</text>
${arrow(px - 14, py + 22, px - 24, py + 14, C.red, { w: 1.8, head: 7 })}
${t(px + 26, py + 26, "m g", { size: 11, italic: true, fill: C.red })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 4) العدسة المحدبة — تكوين صورة حقيقية
// ══════════════════════════════════════════════════════════════════════
function lensConvex(p: TemplateParams): string {
  const title = p.title ?? "العدسة المحدبة — تكوين الصورة";
  const b = `
${line(60, 220, 520, 220, { dash: "7,5", stroke: C.faint, w: 1.6 })}
<path d="M280,140 C305,180 305,260 280,300 C255,260 255,180 280,140" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>
${dot(280, 220, 3.5, C.blue)}
${t(280, 240, "O", { size: 13, italic: true, fill: C.blue })}
${dot(350, 220, 3.5, C.amber)}
${dot(210, 220, 3.5, C.amber)}
${dot(420, 220, 3, C.gray)}
${dot(140, 220, 3, C.gray)}
${t(350, 238, "F", { size: 13, italic: true, fill: C.amber })}
${t(210, 204, "F′", { size: 13, italic: true, fill: C.amber })}
${t(420, 238, "2F", { size: 12, italic: true, fill: C.gray })}
${t(140, 204, "2F′", { size: 12, italic: true, fill: C.gray })}
${arrow(170, 220, 170, 175, C.blue, { w: 3, head: 10 })}
${t(170, 162, "جسم", { size: 12, fill: C.blue })}
${line(170, 175, 280, 175, { stroke: C.red, w: 2 })}
${arrow(280, 175, 412, 274, C.red, { w: 2, head: 9 })}
${line(170, 175, 280, 220, { stroke: C.green, w: 2 })}
${arrow(280, 220, 412, 274, C.green, { w: 2, head: 9 })}
${line(170, 175, 220, 220, { stroke: C.violet, w: 2 })}
${line(280, 274, 400, 274, { stroke: C.violet, w: 2 })}
${arrow(400, 274, 412, 274, C.violet, { w: 2, head: 9 })}
${arrow(412, 220, 412, 274, C.red, { w: 3, head: 10 })}
${t(412, 294, "صورة (معكوسة)", { size: 12, fill: C.red })}
${t(190, 196, "1", { size: 11, fill: C.red })}
${t(252, 202, "2", { size: 11, fill: C.green })}
${t(196, 236, "3", { size: 11, fill: C.violet })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 5) العدسة المقعرة — صورة افتراضية
// ══════════════════════════════════════════════════════════════════════
function lensConcave(p: TemplateParams): string {
  const title = p.title ?? "العدسة المقعرة — تكوين الصورة";
  // قيم متسقة: الجسم عند x=100 (u=180)، f=-70 → صورة عند x=165.5، معكوسة مصغّرة
  const imgX = 165.5, imgY = 200.9;
  const b = `
${line(60, 220, 520, 220, { dash: "7,5", stroke: C.faint, w: 1.6 })}
<path d="M280,140 C258,180 258,260 280,300 C302,260 302,180 280,140" fill="${C.violetSoft}" stroke="${C.violet}" stroke-width="2.5"/>
${dot(280, 220, 3.5, C.violet)}
${t(280, 240, "O", { size: 13, italic: true, fill: C.violet })}
${dot(210, 220, 3.5, C.amber)}
${dot(350, 220, 3.5, C.amber)}
${t(210, 204, "F", { size: 13, italic: true, fill: C.amber })}
${t(350, 238, "F′", { size: 13, italic: true, fill: C.amber })}
${arrow(100, 220, 100, 190, C.blue, { w: 3, head: 10 })}
${t(100, 178, "جسم", { size: 12, fill: C.blue })}
${line(100, 190, 280, 190, { stroke: C.red, w: 2 })}
${arrow(280, 190, 440, 174.8, C.red, { w: 2, head: 9 })}
${line(280, 190, 100, 230, { stroke: C.red, w: 1.6, dash: "5,5" })}
${line(100, 190, 280, 220, { stroke: C.green, w: 2 })}
${arrow(280, 220, 440, 246.7, C.green, { w: 2, head: 9 })}
${line(280, 220, 100, 186.5, { stroke: C.green, w: 1.6, dash: "5,5" })}
${line(100, 190, 210, 220, { stroke: C.violet, w: 2 })}
${arrow(280, 239.1, 440, 239.1, C.violet, { w: 2, head: 9 })}
${line(280, 239.1, 100, 188.6, { stroke: C.violet, w: 1.6, dash: "5,5" })}
${arrow(165.5, 220, 165.5, 200.9, C.red, { w: 3, head: 9 })}
${t(165.5, 192, "صورة (افتراضية)", { size: 11, fill: C.red })}
${t(200, 210, "1", { size: 11, fill: C.red })}
${t(250, 228, "2", { size: 11, fill: C.green })}
${t(200, 252, "3", { size: 11, fill: C.violet })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 6) المرايا الكروية (مقعرة / محدبة)
// ══════════════════════════════════════════════════════════════════════
function mirrorDiagram(p: TemplateParams): string {
  const kind = p.mirrorType === "convex" ? "convex" : "concave";
  const title = p.title ?? (kind === "convex" ? "المرآة المحدبة — صورة افتراضية" : "المرآة المقعرة — صورة حقيقية");
  let b = "";
  if (kind === "concave") {
    // f=50, u=120 → صورة عند x=194, مقلوبة
    b = `
${line(60, 220, 520, 220, { dash: "7,5", stroke: C.faint, w: 1.6 })}
<path d="M150,110 Q282,138 280,200 Q278,262 150,290" fill="${C.graySoft}" stroke="${C.ink}" stroke-width="3"/>
${line(150, 110, 150, 290, { w: 3 })}
${dot(230, 220, 3.5, C.amber)}
${dot(180, 220, 3.5, C.gray)}
${t(230, 238, "F", { size: 13, italic: true, fill: C.amber })}
${t(180, 238, "C", { size: 13, italic: true, fill: C.gray })}
${arrow(160, 220, 160, 190, C.blue, { w: 3, head: 10 })}
${t(160, 178, "جسم", { size: 12, fill: C.blue })}
${line(160, 190, 280, 190, { stroke: C.red, w: 2 })}
${arrow(280, 190, 194, 241.6, C.red, { w: 2, head: 9 })}
${line(160, 190, 280, 220, { stroke: C.green, w: 2 })}
${arrow(280, 220, 194, 241.6, C.green, { w: 2, head: 9 })}
${arrow(194, 220, 194, 241.6, C.red, { w: 3, head: 10 })}
${t(194, 262, "صورة (مقلوبة)", { size: 12, fill: C.red })}`;
  } else {
    // f=-90, u=130 → صورة افتراضية عند x=333.2
    const ix = 333.2, iy = 207.7;
    b = `
${line(60, 220, 520, 220, { dash: "7,5", stroke: C.faint, w: 1.6 })}
<path d="M150,110 Q120,200 150,290" fill="${C.graySoft}" stroke="${C.ink}" stroke-width="3"/>
${line(150, 110, 150, 290, { w: 3 })}
${dot(370, 220, 3.5, C.amber)}
${dot(460, 220, 3.5, C.gray)}
${t(370, 238, "F", { size: 13, italic: true, fill: C.amber })}
${t(460, 238, "C", { size: 13, italic: true, fill: C.gray })}
${arrow(100, 220, 100, 190, C.blue, { w: 3, head: 10 })}
${t(100, 178, "جسم", { size: 12, fill: C.blue })}
${line(100, 190, 280, 190, { stroke: C.red, w: 2 })}
${arrow(280, 190, 430, 178, C.red, { w: 2, head: 9 })}
${line(280, 190, 333.2, 207.7, { stroke: C.red, w: 1.6, dash: "5,5" })}
${line(100, 190, 280, 220, { stroke: C.green, w: 2 })}
${arrow(280, 220, 410, 210, C.green, { w: 2, head: 9 })}
${line(280, 220, 333.2, 207.7, { stroke: C.green, w: 1.6, dash: "5,5" })}
${arrow(ix, 220, ix, iy, C.red, { w: 3, head: 9 })}
${t(ix, 190, "صورة (افتراضية)", { size: 11, fill: C.red })}`;
  }
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 7) مخطط القوى (Free Body Diagram)
// ══════════════════════════════════════════════════════════════════════
function freeBody(p: TemplateParams): string {
  const mass = p.mass ?? "m = 5 kg";
  const title = p.title ?? "مخطط الجسم الحر";
  const b = `
${line(120, 300, 440, 300, { w: 3.5 })}
${line(130, 300, 122, 308, { w: 2 })}
${line(150, 300, 142, 308, { w: 2 })}
${line(170, 300, 162, 308, { w: 2 })}
${line(390, 300, 382, 308, { w: 2 })}
${line(410, 300, 402, 308, { w: 2 })}
${line(430, 300, 422, 308, { w: 2 })}
<rect x="240" y="240" width="80" height="60" rx="6" fill="${C.graySoft}" stroke="${C.ink}" stroke-width="2.5"/>
${t(280, 273, "m", { size: 15, italic: true })}
${arrow(280, 270, 280, 330, C.red, { w: 3.5, head: 12 })}
${t(292, 312, "W = mg", { size: 13, italic: true, fill: C.red, anchor: "start" })}
${arrow(280, 270, 280, 210, C.green, { w: 3.5, head: 12 })}
${t(292, 206, "N", { size: 14, italic: true, fill: C.green, anchor: "start" })}
${arrow(280, 270, 358, 270, C.blue, { w: 3.5, head: 12 })}
${t(368, 274, "F", { size: 14, italic: true, fill: C.blue, anchor: "start" })}
${arrow(280, 270, 202, 270, C.amber, { w: 3.5, head: 12 })}
${t(200, 252, "f", { size: 14, italic: true, fill: C.amber, anchor: "end" })}
${t(150, 120, esc(mass), { size: 13, fill: C.soft })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 8) المستوى المائل — تحليل القوى
// ══════════════════════════════════════════════════════════════════════
function inclinedPlane(p: TemplateParams): string {
  const angle = Math.min(45, Math.max(10, Number(p.angle ?? 30)));
  const rad = (angle * Math.PI) / 180;
  const title = p.title ?? "المستوى المائل — تحليل القوى";
  // مستوى: من (100,330) إلى (440, 330 - 340*sin)
  const hy = 340 * Math.sin(rad);
  const topX = 440;
  const topY = 330 - hy;
  // الكتلة في منتصف المستوى تقريباً
  const bx0 = 100 + 340 * Math.cos(rad) * 0.62;
  const by0 = 330 - hy * 0.62;
  const nx = bx0 - 60 * Math.sin(rad);
  const ny = by0 - 60 * Math.cos(rad);
  const b = `
${line(100, 330, 500, 330, { w: 3.5 })}
${line(100, 330, topX, topY, { w: 4 })}
<path d="M${100 + 60 * Math.cos(rad)},${330 - 60 * Math.sin(rad)} L${100 + 46 * Math.cos(rad)},${330 - 46 * Math.sin(rad)}" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>
<path d="M100,330 A55,55 0 0 0 ${100 + 55 * Math.cos(rad)},${330 - 55 * Math.sin(rad)}" fill="none" stroke="${C.blue}" stroke-width="1.8"/>
${t(100 + 66, 330 - 34, "α", { size: 14, italic: true, fill: C.blue })}
<g transform="translate(${bx0},${by0}) rotate(${angle})">
  <rect x="-38" y="-34" width="76" height="54" rx="5" fill="${C.graySoft}" stroke="${C.ink}" stroke-width="2.5"/>
  ${t(0, 0, "m", { size: 14, italic: true })}
</g>
${arrow(bx0, by0, bx0, by0 + 88, C.red, { w: 3.5, head: 12 })}
${t(bx0 + 16, by0 + 66, "W", { size: 14, italic: true, fill: C.red, anchor: "start" })}
${arrow(bx0, by0, nx, ny, C.green, { w: 3.5, head: 12 })}
${t(nx - 10, ny - 8, "N", { size: 14, italic: true, fill: C.green, anchor: "end" })}
${arrow(bx0, by0, bx0 + 80 * Math.cos(rad), by0 - 80 * Math.sin(rad), C.amber, { w: 3.5, head: 12 })}
${t(bx0 + 66 * Math.cos(rad) + 10, by0 - 66 * Math.sin(rad), "f", { size: 14, italic: true, fill: C.amber })}
${arrow(bx0, by0, bx0 - 80 * Math.cos(rad), by0 + 80 * Math.sin(rad), C.blue, { w: 3.5, head: 12 })}
${t(bx0 - 40, by0 + 90, "F", { size: 14, italic: true, fill: C.blue })}
${t(300, 372, "المستوى المائل — زاوية الميل α", { size: 12, fill: C.soft })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 9) المجال الكهربائي بين شحنتين
// ══════════════════════════════════════════════════════════════════════
function fieldElectric(p: TemplateParams): string {
  const title = p.title ?? "خطوط المجال الكهربائي";
  const b = `
${circle(150, 200, 26, { fill: C.redSoft, stroke: C.red, w: 3 })}
${t(150, 207, "+", { size: 26, fill: C.red, weight: 700 })}
${t(150, 245, "q₁", { size: 13, italic: true, fill: C.red })}
${circle(410, 200, 26, { fill: C.blueSoft, stroke: C.blue, w: 3 })}
${t(410, 207, "−", { size: 26, fill: C.blue, weight: 700 })}
${t(410, 245, "q₂", { size: 13, italic: true, fill: C.blue })}
<path d="M150,170 C220,126 340,126 410,170" fill="none" stroke="${C.red}" stroke-width="2"/>
${arrow(340, 140, 365, 148, C.red, { w: 2, head: 9 })}
<path d="M150,230 C220,274 340,274 410,230" fill="none" stroke="${C.blue}" stroke-width="2"/>
${arrow(340, 260, 365, 252, C.blue, { w: 2, head: 9 })}
<path d="M150,186 C250,184 310,184 410,186" fill="none" stroke="${C.green}" stroke-width="2"/>
${arrow(320, 184.6, 348, 184.7, C.green, { w: 2, head: 9 })}
<path d="M150,214 C250,216 310,216 410,214" fill="none" stroke="${C.green}" stroke-width="2"/>
${arrow(320, 215.4, 348, 215.3, C.green, { w: 2, head: 9 })}
<path d="M170,150 C230,95 330,95 390,150" fill="none" stroke="${C.faint}" stroke-width="1.8"/>
${arrow(330, 112, 352, 122, C.faint, { w: 1.8, head: 8 })}
<path d="M170,250 C230,305 330,305 390,250" fill="none" stroke="${C.faint}" stroke-width="1.8"/>
${arrow(330, 288, 352, 278, C.faint, { w: 1.8, head: 8 })}
${t(280, 64, "خطوط المجال E", { size: 12, fill: C.soft })}
${t(280, 352, "من الشحنة الموجبة إلى السالبة", { size: 12, fill: C.soft })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 10) المغناطيس القضيبي وخطوط مجاله
// ══════════════════════════════════════════════════════════════════════
function barMagnet(p: TemplateParams): string {
  const title = p.title ?? "المغناطيس القضيبي — خطوط المجال";
  const b = `
<path d="M210,168 C250,96 350,90 372,166" fill="none" stroke="${C.blue}" stroke-width="2"/>
${arrow(348, 122, 362, 134, C.blue, { w: 2, head: 9 })}
<path d="M214,186 C260,150 330,150 368,184" fill="none" stroke="${C.red}" stroke-width="2"/>
${arrow(340, 158, 356, 162, C.red, { w: 2, head: 9 })}
<path d="M216,206 C270,196 320,196 366,204" fill="none" stroke="${C.green}" stroke-width="2"/>
${arrow(338, 198, 354, 200, C.green, { w: 2, head: 9 })}
<path d="M216,228 C258,272 340,272 366,232" fill="none" stroke="${C.amber}" stroke-width="2"/>
${arrow(330, 258, 346, 250, C.amber, { w: 2, head: 9 })}
<path d="M200,190 C230,150 330,120 368,150" fill="none" stroke="${C.faint}" stroke-width="1.8"/>
${arrow(340, 132, 352, 140, C.faint, { w: 1.8, head: 8 })}
<path d="M196,214 C226,258 336,286 370,252" fill="none" stroke="${C.faint}" stroke-width="1.8"/>
${arrow(338, 268, 352, 258, C.faint, { w: 1.8, head: 8 })}
<rect x="180" y="176" width="100" height="62" rx="8" fill="${C.red}" opacity="0.9"/>
${t(230, 215, "N", { size: 26, fill: "#fff", weight: 700 })}
<rect x="280" y="176" width="100" height="62" rx="8" fill="${C.blue}" opacity="0.9"/>
${t(330, 215, "S", { size: 26, fill: "#fff", weight: 700 })}
${arrow(306, 207, 282, 207, C.white, { w: 3, head: 8 })}
${t(280, 322, "الاتجاه من N إلى S خارج المغناطيس", { size: 12, fill: C.soft })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 11) الموجة الجيبية — سعة وطول موجي
// ══════════════════════════════════════════════════════════════════════
function waveSine(p: TemplateParams): string {
  const A = Math.min(110, Math.max(40, Number(p.amplitude ?? 80)));
  const title = p.title ?? "الموجة الجيبية";
  let d = "";
  for (let x = 140; x <= 480; x += 4) {
    const y = 220 - A * Math.sin(((x - 140) / 170) * Math.PI * 2);
    d += `${x === 140 ? "M" : "L"}${x},${y.toFixed(1)}`;
  }
  const b = `
${arrow(140, 300, 500, 300, C.ink, { w: 2, head: 9 })}
${t(500, 316, "x", { size: 14, italic: true })}
${arrow(150, 340, 150, 70, C.ink, { w: 2, head: 9 })}
${t(138, 62, "y", { size: 14, italic: true })}
<path d="${d}" fill="none" stroke="${C.blue}" stroke-width="3" stroke-linecap="round"/>
${arrowBoth(230, 220, 230, 220 - A, C.red, { w: 1.8, head: 9 })}
${t(240, 220 - A / 2, "A", { size: 14, italic: true, fill: C.red, anchor: "start" })}
${arrowBoth(140, 220 - A - 22, 310, 220 - A - 22, C.green, { w: 1.8, head: 9 })}
${t(225, 220 - A - 32, "λ", { size: 14, italic: true, fill: C.green })}
${arrowBoth(140, 330, 310, 330, C.amber, { w: 1.8, head: 9 })}
${t(225, 348, "T", { size: 14, italic: true, fill: C.amber })}
${dot(230, 220 - A, 4, C.red)}
${dot(140, 220, 4, C.soft)}
${dot(310, 220, 4, C.soft)}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 12) النابض والكتلة — الحركة التوافقية البسيطة
// ══════════════════════════════════════════════════════════════════════
function shmSpring(p: TemplateParams): string {
  const title = p.title ?? "النابض والكتلة — الحركة التوافقية";
  let spring = "";
  let y = 92;
  for (let i = 0; i < 7; i++) {
    spring += ` l12,${i % 2 === 0 ? 16 : -6}`;
  }
  const b = `
${line(70, 80, 250, 80, { w: 6 })}
${line(80, 72, 70, 80, { w: 2.5, stroke: C.gray })}
${line(110, 72, 100, 80, { w: 2.5, stroke: C.gray })}
${line(140, 72, 130, 80, { w: 2.5, stroke: C.gray })}
${line(170, 72, 160, 80, { w: 2.5, stroke: C.gray })}
${line(200, 72, 190, 80, { w: 2.5, stroke: C.gray })}
${line(230, 72, 220, 80, { w: 2.5, stroke: C.gray })}
<path d="M160,80${spring}" fill="none" stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
${circle(160, 92, 3, { fill: C.ink })}
<rect x="118" y="196" width="84" height="62" rx="6" fill="${C.amberSoft}" stroke="${C.ink}" stroke-width="2.5"/>
${t(160, 232, "m", { size: 16, italic: true })}
${line(160, 258, 160, 350, { dash: "6,5", stroke: C.faint, w: 1.6 })}
${line(70, 350, 250, 350, { stroke: C.faint, w: 1.6 })}
${arrowBoth(160, 258, 160, 292, C.blue, { w: 2, head: 9 })}
${t(172, 262, "k", { size: 14, italic: true, fill: C.green, anchor: "start" })}
${t(176, 280, "x", { size: 14, italic: true, fill: C.blue, anchor: "start" })}
${arrow(160, 232, 160, 178, C.red, { w: 2.5, head: 10 })}
${t(172, 182, "a", { size: 14, italic: true, fill: C.red, anchor: "start" })}
${t(160, 372, "الموضع = A·cos(ωt)", { size: 12, fill: C.soft })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 13) نموذج بور للذرة
// ══════════════════════════════════════════════════════════════════════
function atomBohr(p: TemplateParams): string {
  const title = p.title ?? "نموذج بور للذرة";
  const proton = p.protons ?? 2;
  const b = `
${circle(280, 200, 90, { stroke: C.faint, w: 1.6, dash: "5,4" })}
${circle(280, 200, 150, { stroke: C.faint, w: 1.6, dash: "5,4" })}
${circle(280, 200, 212, { stroke: C.faint, w: 1.6, dash: "5,4" })}
${t(280, 92, "n = 1", { size: 12, fill: C.soft })}
${t(280, 38, "n = 2", { size: 12, fill: C.soft })}
${t(120, 340, "n = 3", { size: 12, fill: C.soft })}
${circle(280, 200, 20, { fill: C.red, stroke: "#991b1b", w: 2 })}
${t(280, 207, "+", { size: 22, fill: "#fff", weight: 700 })}
${t(280, 232, "النواة", { size: 12, fill: C.red })}
${circle(280 + 90, 200, 9, { fill: C.blue, stroke: "#1d4ed8", w: 2 })}
${t(280 + 90, 205, "−", { size: 13, fill: "#fff", weight: 700 })}
${circle(280 - 150 * 0.75, 200 - 150 * 0.6, 9, { fill: C.blue, stroke: "#1d4ed8", w: 2 })}
${t(280 - 112, 200 - 90 - 5, "−", { size: 13, fill: "#fff", weight: 700 })}
${circle(280 + 212 * 0.8, 200 + 212 * 0.5, 9, { fill: C.blue, stroke: "#1d4ed8", w: 2 })}
${t(280 + 170, 200 + 106 - 5, "−", { size: 13, fill: "#fff", weight: 700 })}
<path d="M${280 + 90 + 14},200 A20,20 0 1 1 ${280 + 90 - 14},200" fill="none" stroke="${C.blue}" stroke-width="1.8"/>
${arrow(280 + 90 + 16, 200 - 10, 280 + 90 + 8, 200 - 16, C.blue, { w: 1.8, head: 7 })}
${t(280, 372, `عدد البروتونات في النواة: ${proton}`, { size: 12, fill: C.soft })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 14) حركة المقذوف
// ══════════════════════════════════════════════════════════════════════
function projectile(p: TemplateParams): string {
  const title = p.title ?? "حركة المقذوف";
  const b = `
${line(70, 320, 500, 320, { w: 3 })}
<path d="M90,320 C190,120 380,120 480,320" fill="none" stroke="${C.blue}" stroke-width="3" stroke-linecap="round"/>
${arrow(90, 320, 150, 268, C.red, { w: 3, head: 12 })}
${t(112, 258, "v₀", { size: 14, italic: true, fill: C.red })}
${arrow(285, 196, 285, 160, C.green, { w: 2.5, head: 10 })}
${t(297, 164, "v", { size: 14, italic: true, fill: C.green, anchor: "start" })}
${arrow(440, 282, 475, 300, C.violet, { w: 2.5, head: 10 })}
${t(452, 278, "v", { size: 14, italic: true, fill: C.violet })}
${line(285, 196, 285, 320, { dash: "5,5", stroke: C.faint, w: 1.6 })}
${arrowBoth(285, 206, 285, 296, C.amber, { w: 1.8, head: 9 })}
${t(297, 252, "h", { size: 14, italic: true, fill: C.amber, anchor: "start" })}
${arrowBoth(90, 334, 480, 334, C.green, { w: 1.8, head: 9 })}
${t(285, 352, "R — المدى الأفقي", { size: 13, italic: true, fill: C.green })}
${t(96, 300, "θ", { size: 14, italic: true, fill: C.red, anchor: "start" })}
<path d="M90,320 A34,34 0 0 0 ${90 + 30 * Math.cos(Math.PI / 9)},${320 - 30 * Math.sin(Math.PI / 9)}" fill="none" stroke="${C.red}" stroke-width="1.6"/>
${circle(285, 196, 4, { fill: C.green })}
${dot(90, 320, 4, C.red)}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 15) نظام البكرات (آلة أتوود)
// ══════════════════════════════════════════════════════════════════════
function pulleySystem(p: TemplateParams): string {
  const m1 = p.m1 ?? "m₁";
  const m2 = p.m2 ?? "m₂";
  const title = p.title ?? "نظام البكرات — آلة أتوود";
  const b = `
${line(100, 76, 440, 76, { w: 7 })}
${line(110, 68, 100, 76, { w: 2.5, stroke: C.gray })}
${line(140, 68, 130, 76, { w: 2.5, stroke: C.gray })}
${line(170, 68, 160, 76, { w: 2.5, stroke: C.gray })}
${line(370, 68, 360, 76, { w: 2.5, stroke: C.gray })}
${line(400, 68, 390, 76, { w: 2.5, stroke: C.gray })}
${line(430, 68, 420, 76, { w: 2.5, stroke: C.gray })}
${circle(270, 132, 34, { stroke: C.gray, w: 2.5, fill: C.graySoft })}
${circle(270, 132, 7, { fill: C.ink })}
${line(270, 98, 270, 132, { w: 4 })}
${line(248, 132, 246, 166, { w: 3 })}
${line(292, 132, 294, 166, { w: 3 })}
<rect x="212" y="164" width="70" height="56" rx="6" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="2.5"/>
${t(247, 198, esc(m1), { size: 15, italic: true, fill: C.blue })}
<rect x="262" y="164" width="70" height="56" rx="6" fill="${C.redSoft}" stroke="${C.red}" stroke-width="2.5"/>
${t(297, 198, esc(m2), { size: 15, italic: true, fill: C.red })}
${arrow(247, 254, 247, 282, C.blue, { w: 2.5, head: 10 })}
${t(247, 300, "a", { size: 13, italic: true, fill: C.blue })}
${arrow(297, 282, 297, 254, C.red, { w: 2.5, head: 10 })}
${t(297, 300, "a", { size: 13, italic: true, fill: C.red })}
${t(270, 60, "بكرة ثابتة", { size: 12, fill: C.soft })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 16) الدورة الديناميكية الحرارية (مخطط P–V)
// ══════════════════════════════════════════════════════════════════════
function thermoCycle(p: TemplateParams): string {
  const title = p.title ?? "الدورة الديناميكية الحرارية (P–V)";
  const b = `
${arrow(80, 80, 80, 340, C.ink, { w: 2, head: 9 })}
${t(68, 70, "P", { size: 15, italic: true })}
${arrow(80, 340, 500, 340, C.ink, { w: 2, head: 9 })}
${t(506, 356, "V", { size: 15, italic: true })}
<path d="M140,120 L400,120 L400,300 L140,300 Z" fill="${C.tealSoft}" opacity="0.55" stroke="${C.teal}" stroke-width="2.5"/>
${arrow(140, 120, 300, 120, C.teal, { w: 2.5, head: 10 })}
${arrow(400, 120, 400, 210, C.teal, { w: 2.5, head: 10 })}
${arrow(400, 300, 240, 300, C.teal, { w: 2.5, head: 10 })}
${arrow(140, 300, 140, 210, C.teal, { w: 2.5, head: 10 })}
${dot(140, 120, 4, C.ink)}
${dot(400, 120, 4, C.ink)}
${dot(400, 300, 4, C.ink)}
${dot(140, 300, 4, C.ink)}
${t(126, 108, "A", { size: 14, italic: true, weight: 700 })}
${t(414, 108, "B", { size: 14, italic: true, weight: 700 })}
${t(414, 314, "C", { size: 14, italic: true, weight: 700 })}
${t(126, 314, "D", { size: 14, italic: true, weight: 700 })}
${t(270, 108, "تسخين (ثابت الضغط)", { size: 11, fill: C.teal })}
${t(416, 170, "تسخين", { size: 11, fill: C.teal, anchor: "start" })}
${t(270, 314, "تبريد (ثابت الضغط)", { size: 11, fill: C.teal })}
${t(140, 380, "الشغل = المساحة داخل الدورة", { size: 12, fill: C.soft })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 17) رسم منحنى دالة على محاور
// ══════════════════════════════════════════════════════════════════════
function graphPlot(p: TemplateParams): string {
  const kind = ["sine", "cos", "parabola", "line", "exponential"].includes(p.curveKind) ? p.curveKind : "parabola";
  const title = p.title ?? "التمثيل البياني لدالة";
  let grid = "";
  for (let gx = 140; gx <= 440; gx += 40) grid += line(gx, 80, gx, 320, { stroke: C.grid, w: 1 });
  for (let gy = 80; gy <= 320; gy += 40) grid += line(140, gy, 440, gy, { stroke: C.grid, w: 1 });
  let d = "";
  const pts: [number, number][] = [];
  for (let x = 140; x <= 440; x += 3) {
    const u = (x - 290) / 60;
    let y = 0;
    if (kind === "sine") y = 120 * Math.sin(u * 2.2);
    else if (kind === "cos") y = 120 * Math.cos(u * 2.2);
    else if (kind === "parabola") y = 60 * u * u - 80;
    else if (kind === "line") y = 60 * u + 10;
    else y = 100 * (Math.exp(u / 2.4) - 1);
    const yy = Math.max(-160, Math.min(160, y));
    pts.push([x, 200 - yy]);
  }
  d = polylinePath(pts);
  const labels: Record<string, string> = {
    sine: "y = sin(x)",
    cos: "y = cos(x)",
    parabola: "y = x²",
    line: "y = ax + b",
    exponential: "y = eˣ",
  };
  const b = `
${grid}
${arrow(140, 200, 440, 200, C.ink, { w: 2, head: 9 })}
${arrow(290, 320, 290, 80, C.ink, { w: 2, head: 9 })}
${t(446, 206, "x", { size: 14, italic: true, anchor: "start" })}
${t(284, 72, "y", { size: 14, italic: true })}
${t(140, 214, "0", { size: 12, fill: C.soft, anchor: "start" })}
${line(434, 204, 434, 196, { w: 1.6, stroke: C.soft })}
${line(326, 204, 326, 196, { w: 1.6, stroke: C.soft })}
${line(254, 204, 254, 196, { w: 1.6, stroke: C.soft })}
${line(286, 96, 294, 96, { w: 1.6, stroke: C.soft })}
${line(286, 136, 294, 136, { w: 1.6, stroke: C.soft })}
${line(286, 264, 294, 264, { w: 1.6, stroke: C.soft })}
${line(286, 304, 294, 304, { w: 1.6, stroke: C.soft })}
<path d="${d}" fill="none" stroke="${C.blue}" stroke-width="3" stroke-linecap="round"/>
${t(290, 44, labels[kind], { size: 14, italic: true, fill: C.blue })}
${t(290, 358, `النوع: ${kind}`, { size: 12, fill: C.soft })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 18) الخلية الحيوانية
// ══════════════════════════════════════════════════════════════════════
function animalCell(p: TemplateParams): string {
  const title = p.title ?? "الخلية الحيوانية";
  const b = `
<ellipse cx="280" cy="215" rx="215" ry="150" fill="#fdfbf3" stroke="${C.teal}" stroke-width="3"/>
${circle(280, 195, 46, { fill: C.violetSoft, stroke: C.violet, w: 2.5 })}
${circle(280, 195, 13, { fill: C.violet, opacity: 0.7 })}
${t(280, 268, "النواة", { size: 12, fill: C.violet })}
${t(280, 286, "النوية", { size: 10, fill: C.violet })}
<ellipse cx="185" cy="268" rx="34" ry="17" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2" transform="rotate(-18 185 268)"/>
<path d="M185,268 l0,-6 l8,10 l8,-12 l8,12 l8,-10 l0,6" fill="none" stroke="${C.green}" stroke-width="1.6" transform="rotate(-18 185 268)"/>
${t(126, 288, "الميتوكوندريا", { size: 11, fill: C.green, anchor: "start" })}
${line(140, 282, 172, 274, { stroke: C.green, w: 1.2 })}
<ellipse cx="368" cy="150" rx="30" ry="15" fill="${C.greenSoft}" stroke="${C.green}" stroke-width="2" transform="rotate(22 368 150)"/>
${t(404, 152, "ميتوكوندريا", { size: 11, fill: C.green, anchor: "start" })}
${line(398, 148, 372, 148, { stroke: C.green, w: 1.2 })}
<path d="M330,222 q6,-8 12,0 q6,8 12,0 q6,-8 12,0 q6,8 12,0 q6,-8 12,0" fill="none" stroke="${C.amber}" stroke-width="2"/>
${t(396, 252, "الشبكة الإندوبلازمية", { size: 11, fill: C.amber, anchor: "start" })}
${line(392, 246, 374, 232, { stroke: C.amber, w: 1.2 })}
<path d="M352,300 C336,312 336,326 356,332 C340,326 340,314 358,302" fill="${C.blue}" opacity="0.75" stroke="${C.blue}" stroke-width="1.5"/>
${line(356, 316, 374, 300, { stroke: C.blue, w: 1.2 })}
${t(380, 318, "جهاز غولجي", { size: 11, fill: C.blue, anchor: "start" })}
${circle(240, 150, 4, { fill: C.red })}
${circle(255, 162, 4, { fill: C.red })}
${circle(228, 172, 4, { fill: C.red })}
${t(196, 140, "الريبوسومات", { size: 11, fill: C.red })}
${line(204, 144, 224, 150, { stroke: C.red, w: 1.2 })}
${t(280, 388, "غشاء خلوي — السيتوبلازم — العضيات", { size: 12, fill: C.soft })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 19) المحول الكهربائي
// ══════════════════════════════════════════════════════════════════════
function transformer(p: TemplateParams): string {
  const title = p.title ?? "المحول الكهربائي";
  const n1 = p.turns1 ?? "N₁";
  const n2 = p.turns2 ?? "N₂";
  const v1 = p.voltage1 ?? "V₁";
  const v2 = p.voltage2 ?? "V₂";
  const coil1 = `
<path d="M208,196 l12,0 l0,-14 l-24,0 l0,28 l24,0 l0,-14 l-12,0" fill="none" stroke="${C.red}" stroke-width="2.6"/>
<path d="M208,204 l12,0 l0,-14 l-24,0 l0,28 l24,0 l0,-14 l-12,0" fill="none" stroke="${C.red}" stroke-width="2.6"/>
<path d="M208,212 l12,0 l0,-14 l-24,0 l0,28 l24,0 l0,-14 l-12,0" fill="none" stroke="${C.red}" stroke-width="2.6"/>`;
  const coil2 = `
<path d="M352,196 l12,0 l0,-14 l-24,0 l0,28 l24,0 l0,-14 l-12,0" fill="none" stroke="${C.blue}" stroke-width="2.6"/>
<path d="M352,204 l12,0 l0,-14 l-24,0 l0,28 l24,0 l0,-14 l-12,0" fill="none" stroke="${C.blue}" stroke-width="2.6"/>
<path d="M352,212 l12,0 l0,-14 l-24,0 l0,28 l24,0 l0,-14 l-12,0" fill="none" stroke="${C.blue}" stroke-width="2.6"/>`;
  const b = `
<rect x="170" y="160" width="220" height="120" rx="10" fill="${C.graySoft}" stroke="${C.gray}" stroke-width="2.5"/>
<rect x="196" y="140" width="14" height="160" fill="${C.gray}" opacity="0.5"/>
<rect x="350" y="140" width="14" height="160" fill="${C.gray}" opacity="0.5"/>
${coil1}
${coil2}
${line(190, 172, 140, 172, { w: 3, stroke: C.red })}
${line(190, 268, 140, 268, { w: 3, stroke: C.red })}
${line(370, 172, 420, 172, { w: 3, stroke: C.blue })}
${line(370, 268, 420, 268, { w: 3, stroke: C.blue })}
${t(130, 196, esc(v1), { size: 13, italic: true, fill: C.red, anchor: "end" })}
${t(125, 166, "دخول", { size: 11, fill: C.red, anchor: "end" })}
${t(432, 196, esc(v2), { size: 13, italic: true, fill: C.blue, anchor: "start" })}
${t(435, 166, "خروج", { size: 11, fill: C.blue, anchor: "start" })}
${t(203, 148, esc(n1), { size: 12, italic: true, fill: C.red })}
${t(357, 148, esc(n2), { size: 12, italic: true, fill: C.blue })}
${arrow(260, 220, 300, 220, C.soft, { w: 2, head: 8 })}
${t(280, 240, "قلب حديدي", { size: 11, fill: C.soft })}
${t(280, 320, "التسخين: عدد اللفات يحدد الجهد", { size: 12, fill: C.soft })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 20) النظام الشمسي
// ══════════════════════════════════════════════════════════════════════
function solarSystem(p: TemplateParams): string {
  const title = p.title ?? "النظام الشمسي";
  const orbits = [72, 110, 152, 196, 242, 290, 338, 386].map((rx) => {
    return `<ellipse cx="280" cy="215" rx="${rx}" ry="${Math.round(rx * 0.42)}" fill="none" stroke="${C.grid}" stroke-width="1.6"/>`;
  }).join("");
  const b = `
${orbits}
<circle cx="100" cy="215" r="34" fill="url(#sunGrad)"/>
<defs><radialGradient id="sunGrad"><stop offset="0%" stop-color="#fde68a"/><stop offset="60%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#ea580c"/></radialGradient></defs>
${t(100, 270, "الشمس", { size: 12, fill: C.amber })}
${circle(352, 133, 7, { fill: C.gray })}
${t(352, 118, "عطارد", { size: 9, fill: C.gray })}
${circle(182, 262, 10, { fill: "#e8b04b" })}
${t(182, 282, "الزهرة", { size: 9, fill: "#b45309" })}
${circle(376, 277, 11, { fill: "#3b82f6" })}
${t(376, 300, "الأرض", { size: 9, fill: "#1d4ed8" })}
${circle(238, 108, 9, { fill: "#dc2626" })}
${t(238, 92, "المريخ", { size: 9, fill: "#b91c1c" })}
${circle(546, 200, 17, { fill: "#f59e0b" })}
${t(546, 236, "المشتري", { size: 9, fill: "#b45309" })}
${circle(458, 330, 14, { fill: "#d6b47a" })}
<ellipse cx="458" cy="330" rx="21" ry="6" fill="none" stroke="#b08d57" stroke-width="2" transform="rotate(-20 458 330)"/>
${t(458, 358, "زحل", { size: 9, fill: "#92400e" })}
${t(280, 386, "الكواكب تدور حول الشمس في مدارات إهليلجية", { size: 12, fill: C.soft })}`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// 21) المصعد — الوزن الظاهري (حالات المصعد الست)
// ══════════════════════════════════════════════════════════════════════
function elevator(p: TemplateParams): string {
  const state = p.state ?? "المصعد ساكن (a = 0)";
  const title = p.title ?? "المصعد — الوزن الظاهري";
  const b = `
${line(115, 100, 115, 332, { w: 6 })}
${line(445, 100, 445, 332, { w: 6 })}
${line(95, 332, 465, 332, { w: 6 })}
<rect x="140" y="110" width="280" height="222" rx="4" fill="#ffffff" stroke="${C.ink}" stroke-width="2.5"/>
${t(280, 134, "المصعد", { size: 12, fill: C.soft })}
${circle(280, 205, 16, { fill: C.blueSoft, stroke: C.ink, w: 2.5 })}
${line(280, 221, 280, 265, { w: 3.5 })}
${line(280, 235, 256, 259, { w: 3.5 })}
${line(280, 235, 304, 259, { w: 3.5 })}
${line(280, 265, 258, 306, { w: 3.5 })}
${line(280, 265, 302, 306, { w: 3.5 })}
${t(280, 186, "m", { size: 12, italic: true })}
${arrow(280, 221, 280, 138, C.green, { w: 3.5, head: 12 })}
${t(296, 156, "N", { size: 14, italic: true, fill: C.green, anchor: "start" })}
${arrow(280, 265, 280, 318, C.red, { w: 3.5, head: 12 })}
${t(296, 308, "W = mg", { size: 13, italic: true, fill: C.red, anchor: "start" })}
${arrow(120, 344, 120, 382, C.blue, { w: 3, head: 10 })}
${t(140, 376, "a", { size: 13, italic: true, fill: C.blue, anchor: "start" })}
${t(280, 396, esc(state), { size: 13, fill: C.blue, weight: 700 })}
`;
  return frame(title, b);
}

// ══════════════════════════════════════════════════════════════════════
// قائمة القوالب
// ══════════════════════════════════════════════════════════════════════
export const templates: DrawingTemplate[] = [
  {
    id: "circuit_series",
    nameAr: "دائرة كهربائية تسلسلية",
    keywords: ["دائرة", "دارة", "كهرب", "تسلسل", "سلسلة", "بطار", "مقاوم", "مكثف", "محث", "مصباح", "لمبة", "مفتاح", "circuit", "series", "battery", "resistor", "voltage", "فولت", "RC", "RL", "LC"],
    render: circuitSeries,
    defaults: { voltage: "12V", resistance: "100Ω", bulbLabel: "مصباح" },
    extractHint: "يمكن استخراج: voltage (جهد البطارية رقماً أو نصاً مثل 12V), resistance (قيمة المقاومة مثل 100Ω), title (عنوان عربي).",
  },
  {
    id: "circuit_parallel",
    nameAr: "دائرة كهربائية على التوازي",
    keywords: ["تواز", "مواز", "متوازي", "دائرة", "دارة", "كهرب", "فرع", "parallel", "circuit"],
    render: circuitParallel,
    defaults: { voltage: "12V", bulbLabel: "مصباح" },
    extractHint: "يمكن استخراج: voltage (جهد البطارية), title (عنوان عربي).",
  },
  {
    id: "pendulum",
    nameAr: "البندول البسيط",
    keywords: ["بندول", "نواس", "pendulum", "رَقاص", "رقاص"],
    render: pendulum,
    defaults: { angle: 25, length: 170 },
    extractHint: "يمكن استخراج: angle (زاوية الميل بالدرجات), length (طول الخيط بوحدات الرسم, القيمة الافتراضية 170), title.",
  },
  {
    id: "lens_convex",
    nameAr: "العدسة المحدبة",
    keywords: ["عدسة", "محدبة", "convex", "lens", "تكوين صورة", "بؤرة", "بؤري"],
    render: lensConvex,
    defaults: {},
    extractHint: "يمكن استخراج: title (عنوان عربي).",
  },
  {
    id: "lens_concave",
    nameAr: "العدسة المقعرة",
    keywords: ["عدسة", "مقعرة", "concave", "lens", "تكوين صورة", "بؤرة"],
    render: lensConcave,
    defaults: {},
    extractHint: "يمكن استخراج: title (عنوان عربي).",
  },
  {
    id: "mirror",
    nameAr: "المرايا الكروية",
    keywords: ["مرآة", "مرايا", "mirror", "مرآة مقعرة", "مرآة محدبة", "تكوين صورة", "بؤرة", "خيال"],
    render: mirrorDiagram,
    defaults: { mirrorType: "concave" },
    extractHint: "يمكن استخراج: mirrorType (concave للمقعرة أو convex للمحدبة), title.",
  },
  {
    id: "free_body",
    nameAr: "مخطط الجسم الحر",
    keywords: ["مخطط القوى", "القوى", "قوى", "جسم حر", "free body", "fbd", "وزن", "قوة الاحتكاك", "قوة عمودية", "مخطط جسم", "قوة أفقية", "سطح أفقي"],
    render: freeBody,
    defaults: { mass: "m = 5 kg" },
    extractHint: "يمكن استخراج: mass (كتلة الجسم), title.",
  },
  {
    id: "inclined_plane",
    nameAr: "المستوى المائل",
    keywords: ["مستوى مائل", "سطح مائل", "منحدر", "inclined", "slope", "زاوية الميل", "تحليل القوى"],
    render: inclinedPlane,
    defaults: { angle: 30 },
    extractHint: "يمكن استخراج: angle (زاوية الميل بالدرجات).",
  },
  {
    id: "field_electric",
    nameAr: "المجال الكهربائي",
    keywords: ["مجال كهربائي", "خطوط المجال", "شحنة", "شحنات", "شحنتين", "شحنتان", "electric field", "الشحنة"],
    render: fieldElectric,
    defaults: {},
    extractHint: "يمكن استخراج: title.",
  },
  {
    id: "bar_magnet",
    nameAr: "المغناطيس القضيبي",
    keywords: ["مغناطيس", "مجال مغناطيسي", "خطوط المجال", "قطب", "قطبا", "magnet", "magnetic", "شمالي", "جنوبي"],
    render: barMagnet,
    defaults: {},
    extractHint: "يمكن استخراج: title.",
  },
  {
    id: "wave_sine",
    nameAr: "الموجة الجيبية",
    keywords: ["موجة", "جيبية", "سعة", "طول موجي", "ذبذبة", "تردد", "sine", "wave", "اهتزاز", "صوتية", "كهرومغناطيسية"],
    render: waveSine,
    defaults: { amplitude: 80 },
    extractHint: "يمكن استخراج: amplitude (سعة الموجة), title.",
  },
  {
    id: "shm_spring",
    nameAr: "النابض والكتلة",
    keywords: ["نابض", "زنبورك", "كتلة", "حركة توافقية", "اهتزاز", "spring", "oscillat", "shm", "مرونة"],
    render: shmSpring,
    defaults: {},
    extractHint: "يمكن استخراج: title.",
  },
  {
    id: "atom_bohr",
    nameAr: "نموذج بور للذرة",
    keywords: ["ذرة", "نموذج بور", "الذرة", "إلكترون", "نواة", "بروتون", "atom", "bohr", "إلكترونات"],
    render: atomBohr,
    defaults: { protons: 2 },
    extractHint: "يمكن استخراج: protons (عدد البروتونات/الإلكترونات).",
  },
  {
    id: "projectile",
    nameAr: "حركة المقذوف",
    keywords: ["مقذوف", "قذيفة", "قذف", "projectile", "رمية", "مسار منحن", "المدى", "ارتفاع أقصى"],
    render: projectile,
    defaults: {},
    extractHint: "يمكن استخراج: title.",
  },
  {
    id: "pulley_system",
    nameAr: "نظام البكرات",
    keywords: ["بكرة", "بكرات", "pulley", "أتود", "atwood", "كتلة", "حبل", "شد"],
    render: pulleySystem,
    defaults: { m1: "m₁", m2: "m₂" },
    extractHint: "يمكن استخراج: m1 (كتلة الكتلة الأولى), m2 (كتلة الكتلة الثانية), title.",
  },
  {
    id: "elevator",
    nameAr: "المصعد — الوزن الظاهري",
    keywords: ["مصعد", "المصعد", "elevator", "lift", "وزن ظاهري", "الوزن الظاهري", "انعدام الوزن", "سقوط حر"],
    render: elevator,
    defaults: { state: "المصعد ساكن (a = 0)" },
    extractHint: "يمكن استخراج: state (حالة المصعد مثل: ساكن، يتسارع لأعلى، يتسارع لأسفل، سقوط حر، يتباطأ أثناء الصعود، يتباطأ أثناء الهبوط), title.",
  },
  {
    id: "thermo_cycle",
    nameAr: "الدورة الديناميكية الحرارية",
    keywords: ["دورة", "ديناميكا حرارية", "thermo", "ضغط", "حجم", "P-V", "pv", "كلفن", "كارنو", "عمل", "حرارة"],
    render: thermoCycle,
    defaults: {},
    extractHint: "يمكن استخراج: title.",
  },
  {
    id: "graph_plot",
    nameAr: "التمثيل البياني لدالة",
    keywords: ["رسم بياني", "تمثيل بياني", "منحنى", "دالة", "مخطط", "بياني", "graph", "plot", "function", "دوال", "معادلة"],
    render: graphPlot,
    defaults: { curveKind: "parabola" },
    extractHint: "يمكن استخراج: curveKind (sine|cos|parabola|line|exponential), title.",
  },
  {
    id: "animal_cell",
    nameAr: "الخلية الحيوانية",
    keywords: ["خلية", "حيوانية", "cell", "ميتوكوندريا", "نواة", "سيتوبلازم", "غولجي", "أحياء", "عضويات"],
    render: animalCell,
    defaults: {},
    extractHint: "يمكن استخراج: title.",
  },
  {
    id: "transformer",
    nameAr: "المحول الكهربائي",
    keywords: ["محول", "transformer", "لفات", "جهد", "قلب حديدي", "تحويل الجهد", "الملف"],
    render: transformer,
    defaults: { turns1: "N₁", turns2: "N₂", voltage1: "V₁", voltage2: "V₂" },
    extractHint: "يمكن استخراج: turns1/turns2 (عدد اللفات), voltage1/voltage2 (جهود الدخل والخرج), title.",
  },
  {
    id: "solar_system",
    nameAr: "النظام الشمسي",
    keywords: ["شمس", "نظام شمسي", "كواكب", "solar", "planet", "مجموعة شمسية", "المريخ", "الأرض", "المشتري", "زحل"],
    render: solarSystem,
    defaults: {},
    extractHint: "يمكن استخراج: title.",
  },
];

// ── المطابقة الذكية (محلية، بدون استهلاك حصة) ────────────────────────────
const ar = (s: string) => s.toLowerCase();

const findById = (id: string) => templates.find((t) => t.id === id) ?? null;

const mirrorWithType = (qn: string): DrawingTemplate => {
  const m = findById("mirror");
  if (!m) throw new Error("mirror template missing");
  const kind = /محدبة|convex|انتفاخ/i.test(qn) ? "convex" : "concave";
  return { ...m, defaults: { ...m.defaults, mirrorType: kind } };
};

export function matchTemplate(text: string): DrawingTemplate | null {
  const q = ar(text.trim());
  if (!q) return null;
  const qn = q.replace(/[\u064B-\u0652\u0640]/g, "");

  // ── تجاوزات قوية: كلمات مفتاحية حاسمة تغلب على المطابقة العامة ──
  if (/مرآة|مرايا|mirror/i.test(qn)) return mirrorWithType(qn);
  if (/شحنة|شحنات|شحنتين|شحنتان|شحنتي/i.test(qn) || (/مجال/i.test(qn) && /كهرب/i.test(qn))) {
    return findById("field_electric");
  }
  if (/مجال/i.test(qn) && /مغناطيس|magnet/i.test(qn)) return findById("bar_magnet");
  if (/محول|transformer|اللفات|لفات/i.test(qn)) return findById("transformer");
  if (/شمس|كواكب|solar|المريخ|المشتري|زحل|عطارد|الارض|الأرض/i.test(qn)) return findById("solar_system");
  if (/بكرة|بكرات|pulley|أتود|atwood/i.test(qn)) return findById("pulley_system");
  if (/مصعد|المصعد|elevator|وزن ظاهري|انعدام الوزن/i.test(qn)) return findById("elevator");

  let best: DrawingTemplate | null = null;
  let bestScore = 0;
  for (const tpl of templates) {
    let score = 0;
    for (const kw of tpl.keywords) {
      const k = ar(kw).replace(/[\u064B-\u0652\u0640]/g, "");
      if (qn.includes(k)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = tpl;
    }
  }
  if (!best || bestScore === 0) return null;
  // قواعد دقة خاصة:
  // دائرة + توازٍ → parallel
  if (best.id === "circuit_series" && /تواز|مواز|parallel/i.test(qn)) {
    return templates.find((t) => t.id === "circuit_parallel") ?? best;
  }
  // عدسة + مقعرة → concave
  if (best.id === "lens_convex" && /مقعرة|concave/i.test(qn)) {
    return templates.find((t) => t.id === "lens_concave") ?? best;
  }
  // عدسة + محدبة → convex
  if (best.id === "lens_concave" && /محدبة|convex/i.test(qn)) {
    return templates.find((t) => t.id === "lens_convex") ?? best;
  }
  // مرآة مقعرة/محدبة
  if (best.id === "mirror") {
    if (/محدبة|convex|انتفاخ/i.test(qn)) {
      return { ...best, defaults: { ...best.defaults, mirrorType: "convex" } };
    }
    if (/مقعرة|concave|تقعر/i.test(qn)) {
      return { ...best, defaults: { ...best.defaults, mirrorType: "concave" } };
    }
  }
  // مستوى مائل قبل مخطط القوى
  if (best.id === "free_body" && /مستوى مائل|سطح مائل|منحدر|inclined/i.test(qn)) {
    return templates.find((t) => t.id === "inclined_plane") ?? best;
  }
  return best;
}

export function renderTemplate(tpl: DrawingTemplate, params?: TemplateParams): string {
  return tpl.render({ ...tpl.defaults, ...(params || {}) });
}

// ── دليل المستخدم للنموذج (لاستخراج المعاملات) ──────────────────────────
export function templateParamPrompt(tpl: DrawingTemplate, text: string): string {
  return `أنت مستخرج معاملات لقالب رسم علمي.
القالب: ${tpl.nameAr} (id=${tpl.id}).
${tpl.extractHint}
نص المستخدم: "${text.slice(0, 300)}"
أخرج JSON صحيحاً فقط (بدون markdown) فيه أي معاملات منطقية يمكن استخراجها من النص لهذا القالب (الأرقام، العناوين، التسميات). إن لم يوجد شيء ذو صلة → أخرج {} فقط.`;
}
