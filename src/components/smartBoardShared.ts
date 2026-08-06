// ── مشترك بين السبورة الذكية والمكوّنات المساندة ───────────────────────
// (نُقل من SmartBoard.tsx لتقليل حجم الملف — الأنواع + أدوات مساعدة)

// ── كشف أوامر الرسم العلمي/الهندسي في النص (دائرة كهربائية، موجة، قوى، مجال، ترس، كمرة…) ──
export const CLEVER_PAINTER_CMD = /دائرة\s*كهرب|دارة\s*كهرب|دائرة\s*RC|دائرة\s*RL|دائرة\s*LC|ارسم.*مقاوم.*بطار|ارسم.*بطار.*مقاوم|توصيل.*بطارية|بطارية.*مقاوم|مكثف.*كهرب|محث.*كهرب|موجة\s*(جيبية|مربعة|مثلثة|نبضية|سينية|منشارية|كهرومغناطيسية|صوتية|ضوئية)|تمثيل\s*موجة|رسم\s*موجة|مخطط\s*القوى|free\s*body|diagram.*القوى|قوى.*على.*جسم|رسم.*القوى|مجال\s*(كهربائي|مغناطيسي)|خطوط\s*المجال|شحنتا?\s*(موجبة|سالبة|نقطية|كهربائية)|قطبا?\s*(مغناطيس|شمالي|جنوبي)|مغناطيس.*قطب|تروس\s*ميكانيكية|ارسم.*تروس|نابض\s*ميكانيكي|بكرة\s*ميكانيكية|بندول|نواس|pendulum|كمرة\s*(هندسية|خرسانية)|عارضة\s*(هندسية|مثبتة)|circuit|sine\s*wave|square\s*wave|electric\s*field|magnetic\s*field|free\s*body\s*diagram/i;

// ── تحويل SVG إلى صورة PNG لتُعرض على السبورة كبطاقة قابلة للتحريك ──
export function svgToPng(svg: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = 700;
        const h = Math.round((w * 400) / 560); // نسبة القوالب 560×400
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no ctx'));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

export interface Point { x: number; y: number; }

export interface DrawingPath {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'eraser';
}

export interface DrawnShape {
  id: string;
  type: 'line' | 'rect' | 'circle' | 'triangle' | 'arrow';
  x1: number; y1: number; x2: number; y2: number;
  color: string; width: number;
}

export interface TextItem {
  id: string; x: number; y: number;
  text: string; color: string; fontSize: number;
}

// رسمة مولّدة عبر clever-painter تُعرض كصورة على السبورة
export interface BoardImage {
  id: string; x: number; y: number; w: number; h: number;
  dataUrl: string;
}

export type DrawTool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'triangle' | 'arrow';

export interface HistorySnapshot {
  paths: DrawingPath[];
  shapes: DrawnShape[];
  texts: TextItem[];
  images: BoardImage[];
}

export interface SmartBoardProps {
  isDarkMode?: boolean;
  onSave?: (dataUrl: string) => void;
  lectureTitle?: string;
}

// ── أدوات Canvas مساعدة (خالصة — بدون حالة المكوّن) ────────────────────

export function getTouchDist(touches: globalThis.TouchList) {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

// حساب منتصف نقطتي لمس
export function getTouchMid(touches: globalThis.TouchList) {
  if (touches.length < 2) return { x: 0, y: 0 };
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

// دالة مساعدة لحصر القيم
export const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

// ─── Smooth Bezier path renderer ────────────────────────────────────
export function renderSmoothPath(ctx: CanvasRenderingContext2D, pts: Point[]) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  }
  ctx.stroke();
}

// ─── Shape drawing on ctx ───────────────────────────────────────────
export function renderShape(ctx: CanvasRenderingContext2D, s: DrawnShape) {
  ctx.beginPath();
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const { x1, y1, x2, y2 } = s;
  const w = x2 - x1;
  const h = y2 - y1;

  switch (s.type) {
    case 'line':
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      break;
    case 'rect':
      ctx.strokeRect(x1, y1, w, h);
      break;
    case 'circle': {
      const rx = Math.abs(w) / 2;
      const ry = Math.abs(h) / 2;
      const cx = x1 + w / 2;
      const cy = y1 + h / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    case 'triangle':
      ctx.moveTo(x1 + w / 2, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x1, y2);
      ctx.closePath();
      break;
    case 'arrow': {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = Math.min(20, Math.hypot(w, h) * 0.3);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLen * Math.cos(angle - Math.PI / 6),
        y2 - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLen * Math.cos(angle + Math.PI / 6),
        y2 - headLen * Math.sin(angle + Math.PI / 6)
      );
      break;
    }
  }
  ctx.stroke();
}
