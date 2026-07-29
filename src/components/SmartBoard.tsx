import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  Pencil, Eraser, Trash2, Download, Undo, Redo,
  Type, Minus, ArrowRight, Square, Circle,
  Triangle, Palette, Play, Pause, Highlighter, Spline,
  Mic, MicOff, ZoomIn, ZoomOut, Lock, Unlock, Eye, EyeOff,
  Move, Crosshair, Hand
} from 'lucide-react';
import SmartDictationPanel from './SmartDictationPanel';
import MathCanvasOverlay from './MathCanvasOverlay';
import { arabicToUnicode } from '../utils/mathUtils';
import { motion } from 'motion/react';

interface Point { x: number; y: number; }

interface DrawingPath {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'eraser';
}

interface DrawnShape {
  id: string;
  type: 'line' | 'rect' | 'circle' | 'triangle' | 'arrow';
  x1: number; y1: number; x2: number; y2: number;
  color: string; width: number;
}

interface TextItem {
  id: string; x: number; y: number;
  text: string; color: string; fontSize: number;
}

type DrawTool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'triangle' | 'arrow';

interface HistorySnapshot { paths: DrawingPath[]; shapes: DrawnShape[]; }

interface SmartBoardProps {
  isDarkMode?: boolean;
  onSave?: (dataUrl: string) => void;
  lectureTitle?: string;
}

export default function SmartBoard({ isDarkMode = true, onSave, lectureTitle = 'السبورة الذكية' }: SmartBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null); // live preview for shapes
  const containerRef = useRef<HTMLDivElement>(null);

  // Ref ثابت لـ DPR — يُحسب مرة واحدة ولا يتغير
  const dprRef = useRef(1);
  
  // ضبط حجم Canvas مرة واحدة عند التحميل (نظام إحداثيات ثابت)
  useLayoutEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.width = canvas.width;
      overlay.height = canvas.height;
    }
    
    redrawCanvas();
  }, []);

  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [shapes, setShapes] = useState<DrawnShape[]>([]);
  const [shapePreview, setShapePreview] = useState<DrawnShape | null>(null);
  const shapeStart = useRef<Point | null>(null);

  const [tool, setTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState(isDarkMode ? '#ffffff' : '#1e293b');
  const [lineWidth, setLineWidth] = useState(3);
  const [fontSize, setFontSize] = useState(18); // حجم خط النص
  const [texts, setTexts] = useState<TextItem[]>([]);

  // Undo / Redo — snapshots of {paths, shapes}
  const [history, setHistory] = useState<HistorySnapshot[]>([{ paths: [], shapes: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [isDictationMode, setIsDictationMode] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  // عداد لتحريك موضع النص الجديد على السبورة
  const dictationTextCount = useRef(0);
  // Ref لتتبع موقع آخر نص إملاء (لتجنب مشكلة stale closure)
  const dictationTextYRef = useRef(30);
  const fontSizeRef = useRef(fontSize);
  
  // ── مزامنة fontSizeRef مع state ─────────────────────────────────
  useEffect(() => {
    fontSizeRef.current = fontSize;
  }, [fontSize]);
  
  // ── Zoom / Pan / Lock ─────────────────────────────────────────────
  // zoom حول أي نقطة + pan (offset)
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const [isZoomLocked, setIsZoomLocked] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false); // وضع اليد للتحريك
  const isPanning = useRef(false); // هل يجري تحريك الآن
  const panStart = useRef({ x: 0, y: 0 }); // نقطة بداية التحريك
  const panStartOffset = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const pinchStartOffset = useRef({ x: 0, y: 0 });

  const updateScale = (newScale: number) => {
    setScale(newScale);
    scaleRef.current = newScale;
  };

  const updateOffset = (newOffset: { x: number; y: number }) => {
    setOffset(newOffset);
    offsetRef.current = newOffset;
  };
  
  // ── حالة تحرير النص ──────────────────────────────────────────────
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const [editingTextPos, setEditingTextPos] = useState({ x: 0, y: 0, w: 200, h: 40 });
  
  // عند تفعيل الإملاء → نختار القلم تلقائياً
  useEffect(() => {
    if (isDictationMode) {
      setTool('pen');
      setLineWidth(3);
    }
  }, [isDictationMode]);
  
  // في وضع الإملاء: الخلفية بيضاء والألوان داكنة (كالوضع الفاتح)
  const effectiveDark = isDictationMode ? false : isDarkMode;

  const colors = effectiveDark
    ? ['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
    : ['#1e293b', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777'];

  const lineWidths = [2, 4, 6, 8, 12];
  const fontSizes = [14, 18, 22, 28, 36, 48];

  const isShapeTool = (t: DrawTool) => ['line', 'rect', 'circle', 'triangle', 'arrow'].includes(t);
  const isFreehandTool = (t: DrawTool) => ['pen', 'highlighter', 'eraser'].includes(t);

  // ─── Canvas helpers ─────────────────────────────────────────────────
  const getEventPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // canvas.width = rect.width * dpr (ثابت لا يتغير)
    // canvas.width / rect.width = dprRef.current
    const dpr = dprRef.current;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const px = (clientX - rect.left) * dpr;
    const py = (clientY - rect.top) * dpr;
    const off = offsetRef.current;
    const s = scaleRef.current;
    return {
      x: (px - off.x) / s,
      y: (py - off.y) / s,
    };
  };

  // ── دالة مساعدة للـ Pinch ────────────────────────────────────────
  const getTouchDist = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  // حساب منتصف نقطتي لمس
  const getTouchMid = (touches: React.TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  // دالة مساعدة لحصر القيم
  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  // ─── Smooth Bezier path renderer ────────────────────────────────────
  const renderSmoothPath = (ctx: CanvasRenderingContext2D, pts: Point[]) => {
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
  };

  // ─── Shape drawing on ctx ───────────────────────────────────────────
  const renderShape = (ctx: CanvasRenderingContext2D, s: DrawnShape) => {
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
  };

  // ── دالة مساعدة لتطبيق zoom + pan transform ────────────────────
  const applyZoomTransform = (ctx: CanvasRenderingContext2D) => {
    const s = scaleRef.current;
    const off = offsetRef.current;
    ctx.setTransform(s, 0, 0, s, off.x, off.y);
  };

  // ── دالة لمسح overlay بالكامل ─────────────────────────────────
  const clearOverlay = () => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.restore();
  };

  // ─── Main canvas redraw ──────────────────────────────────────────────
  const redrawCanvas = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    // الخطوة 1: الخلفية — بدون transform عشان تغطي الشاشة كاملة
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    ctx.fillStyle = effectiveDark ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // الخطوة 2: zoom متمركز على منتصف الشاشة
    ctx.save();
    applyZoomTransform(ctx);

    // Grid dots for light mode / dictation mode (في المساحة المنطقية)
    if (!effectiveDark) {
      const logW = canvas.width / devicePixelRatio;
      const logH = canvas.height / devicePixelRatio;
      ctx.fillStyle = '#e8ecf0';
      for (let x = 0; x < logW; x += 30) {
        for (let y = 0; y < logH; y += 30) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw all committed paths (smooth bezier)
    paths.forEach(path => {
      if (path.points.length < 2) return;
      ctx.strokeStyle = path.tool === 'eraser'
        ? (effectiveDark ? '#1e293b' : '#ffffff')
        : path.color;
      ctx.lineWidth = path.tool === 'eraser' ? path.width * 3 : path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = path.tool === 'highlighter' ? 0.4 : 1;
      renderSmoothPath(ctx, path.points);
      ctx.globalAlpha = 1;
    });

    // Draw committed shapes
    shapes.forEach(s => {
      ctx.globalAlpha = 1;
      renderShape(ctx, s);
    });

    // Draw texts
    ctx.globalAlpha = 1;
    texts.forEach(t => {
      ctx.fillStyle = t.color;
      ctx.font = `${t.fontSize}px 'Tajawal', Arial`;
      ctx.fillText(t.text, t.x, t.y);
    });

    // إعادة السياق
    ctx.restore();
    }, [paths, shapes, texts, effectiveDark]); // scale — نستخدم refs

  // Redraw on state change — scale ك trigger إضافي
  useEffect(() => { redrawCanvas(); }, [redrawCanvas, scale]);

  // Live preview overlay للشكل المؤقت مع zoom transform
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const octx = overlay.getContext('2d');
    if (!octx) return;
    // نمسح overlay أولاً
    octx.save();
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, overlay.width, overlay.height);
    octx.restore();
    if (shapePreview) {
      // نطبق نفس zoom transform مثل redrawCanvas
      octx.save();
      applyZoomTransform(octx);
      octx.strokeStyle = shapePreview.color;
      octx.lineWidth = shapePreview.width;
      octx.lineCap = 'round';
      octx.lineJoin = 'round';
      octx.globalAlpha = 0.75;
      octx.setLineDash([6, 4]);
      renderShape(octx, shapePreview);
      octx.setLineDash([]);
      octx.globalAlpha = 1;
      octx.restore();
    }
  }, [shapePreview]);

  // ─── Push history snapshot ───────────────────────────────────────────
  const pushHistory = useCallback((p: DrawingPath[], s: DrawnShape[]) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, { paths: p, shapes: s }];
      return next.slice(-50); // max 50 snapshots
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // ─── Pan بالفأرة ────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    // الزر الأوسط (button=1) → pan
    if (e.button === 1) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panStartOffset.current = { ...offsetRef.current };
      return;
    }
    // وضع اليد (pan mode) → تحريك
    if (isPanMode && e.button === 0) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panStartOffset.current = { ...offsetRef.current };
      return;
    }
    // الرسم العادي
    startDrawing(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      e.preventDefault();
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      // نعكس الاتجاه: سحب الفأرة لليسار ← canvas يتحرك لليسار (طبيعي)
      updateOffset({
        x: panStartOffset.current.x - dx,
        y: panStartOffset.current.y - dy,
      });
      return;
    }
    draw(e);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning.current) {
      isPanning.current = false;
      e.preventDefault();
      return;
    }
    stopDrawing(e);
  };

  // ─── Pointer events (Mouse) ──────────────────────────────────────────
  const startDrawing = (e: React.MouseEvent) => {
    e.preventDefault();
    const pt = getEventPos(e);
    setIsDrawing(true);
    if (isFreehandTool(tool)) {
      setCurrentPath([pt]);
    } else {
      shapeStart.current = pt;
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pt = getEventPos(e);

    if (isFreehandTool(tool)) {
      setCurrentPath(prev => {
        const next = [...prev, pt];
        // رسم تزايدي على OVERLAY canvas — بدون لمس main canvas أبداً
        const overlay = overlayRef.current;
        const octx = overlay?.getContext('2d');
        if (octx && next.length >= 2) {
          octx.save();
          const canvas = canvasRef.current;
          if (canvas) {
            applyZoomTransform(octx);
          }
          octx.strokeStyle = tool === 'eraser'
            ? (effectiveDark ? '#1e293b' : '#ffffff')
            : color;
          octx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
          octx.lineCap = 'round';
          octx.lineJoin = 'round';
          octx.globalAlpha = tool === 'highlighter' ? 0.4 : 1;
          // Draw just the last segment incrementally
          const last = next[next.length - 2];
          octx.beginPath();
          octx.moveTo(last.x, last.y);
          octx.lineTo(pt.x, pt.y);
          octx.stroke();
          octx.globalAlpha = 1;
          octx.restore();
        }
        return next;
      });
    } else if (shapeStart.current) {
      setShapePreview({
        id: 'preview',
        type: tool as DrawnShape['type'],
        x1: shapeStart.current.x,
        y1: shapeStart.current.y,
        x2: pt.x,
        y2: pt.y,
        color,
        width: lineWidth,
      });
    }
  };

  const stopDrawing = (e?: React.MouseEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // نمسح overlay من الرسم التزايدي
    clearOverlay();

    if (isFreehandTool(tool)) {
      if (currentPath.length > 1) {
        const newPath: DrawingPath = {
          id: Date.now().toString(),
          points: currentPath,
          color: tool === 'eraser' ? (effectiveDark ? '#1e293b' : '#ffffff') : color,
          width: tool === 'eraser' ? lineWidth * 3 : lineWidth,
          tool,
        };
        const newPaths = [...paths, newPath];
        setPaths(newPaths);
        pushHistory(newPaths, shapes);
      }
      setCurrentPath([]);
      // لا نحتاج setTimeout(redrawCanvas) — React يعيد الرسم تلقائياً
    } else if (shapeStart.current && shapePreview) {
      const newShape: DrawnShape = { ...shapePreview, id: Date.now().toString() };
      const newShapes = [...shapes, newShape];
      setShapes(newShapes);
      pushHistory(paths, newShapes);
      setShapePreview(null);
      shapeStart.current = null;
    }
  };

  // ─── Touch events (Pinch Zoom + Pan) ───────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && !isZoomLocked) {
      e.preventDefault();
      setIsDrawing(false);
      setCurrentPath([]);
      isPinching.current = true;
      pinchStartDist.current = getTouchDist(e.touches);
      pinchStartScale.current = scaleRef.current;
      pinchStartOffset.current = { ...offsetRef.current };
      return;
    }
    if (e.touches.length === 1 && !isPinching.current) {
      if (isPanMode) {
        isPanning.current = true;
        panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panStartOffset.current = { ...offsetRef.current };
      } else {
        startDrawing(e as unknown as React.MouseEvent);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      if (!isPinching.current && !isZoomLocked) {
        e.preventDefault();
        setIsDrawing(false);
        setCurrentPath([]);
        isPinching.current = true;
        pinchStartDist.current = getTouchDist(e.touches);
        pinchStartScale.current = scaleRef.current;
        pinchStartOffset.current = { ...offsetRef.current };
        return;
      }
      if (isPinching.current) {
        e.preventDefault();
        const newDist = getTouchDist(e.touches);
        const distRatio = pinchStartDist.current > 0 ? newDist / pinchStartDist.current : 1;
        const newScale = clamp(pinchStartScale.current * distRatio, 0.25, 5);
        const mid = getTouchMid(e.touches);
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const ratioX = canvas.width / rect.width;
          const ratioY = canvas.height / rect.height;
          const mx = (mid.x - rect.left) * ratioX;
          const my = (mid.y - rect.top) * ratioY;
          const oldOff = pinchStartOffset.current;
          const ratio = newScale / pinchStartScale.current;
          updateOffset({
            x: mx - (mx - oldOff.x) * ratio,
            y: my - (my - oldOff.y) * ratio,
          });
        }
        updateScale(newScale);
        return;
      }
    }
    if (!isPinching.current && e.touches.length === 1) {
      if (isPanning.current) {
        const dx = e.touches[0].clientX - panStart.current.x;
        const dy = e.touches[0].clientY - panStart.current.y;
        // نعكس الاتجاه: سحب الإصبع لليسار ← canvas يتحرك لليسار (طبيعي)
        updateOffset({
          x: panStartOffset.current.x - dx,
          y: panStartOffset.current.y - dy,
        });
      } else if (isDrawing) {
        draw(e as unknown as React.MouseEvent);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isPinching.current) {
      if (e.touches.length < 2) {
        isPinching.current = false;
      }
      if (e.touches.length === 0 && isDrawing) {
        stopDrawing();
      }
      return;
    }
    if (isPanning.current && e.touches.length === 0) {
      isPanning.current = false;
      return;
    }
    if (isDrawing && e.touches.length === 0) {
      stopDrawing();
    }
  };

  // ── Zoom بعجلة الفأرة (Ctrl + Scroll) ─── Zoom حول مؤشر الفأرة! ──
  const handleWheel = (e: React.WheelEvent) => {
    if (isZoomLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratioX = canvas.width / rect.width;
    const ratioY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * ratioX;
    const my = (e.clientY - rect.top) * ratioY;
    
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const curScale = scaleRef.current;
      const oldOffset = offsetRef.current;
      const delta = -e.deltaY * 0.003;
      const newScale = clamp(curScale * (1 + delta), 0.25, 5);
      
      // Zoom حول cursor: نحافظ على نفس النقطة في المكان
      const ratio = newScale / curScale;
      const newOffsetX = mx - (mx - oldOffset.x) * ratio;
      const newOffsetY = my - (my - oldOffset.y) * ratio;
      
      updateOffset({ x: newOffsetX, y: newOffsetY });
      updateScale(newScale);
    } else {
      // بدون Ctrl: تمرير عادي (pan) بعجلة الفأرة لمنطقة التكبير
      const oldOffset = offsetRef.current;
      updateOffset({
        x: oldOffset.x - e.deltaX,
        y: oldOffset.y - e.deltaY,
      });
    }
  };

  // ─── Undo / Redo ─────────────────────────────────────────────────────
  const undo = () => {
    if (historyIndex <= 0) return;
    const newIdx = historyIndex - 1;
    setHistoryIndex(newIdx);
    const snap = history[newIdx];
    setPaths(snap.paths);
    setShapes(snap.shapes);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIdx = historyIndex + 1;
    setHistoryIndex(newIdx);
    const snap = history[newIdx];
    setPaths(snap.paths);
    setShapes(snap.shapes);
  };

  const clearBoard = () => {
    setPaths([]);
    setShapes([]);
    setTexts([]);
    dictationTextYRef.current = 30; // إعادة تعيين موقع الإملاء
    const snap: HistorySnapshot = { paths: [], shapes: [] };
    setHistory([snap]);
    setHistoryIndex(0);
  };

  const addText = () => {
    const text = prompt('اكتب النص:');
    if (!text) return;
    setTexts(prev => [...prev, {
      id: Date.now().toString(),
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      text,
      color,
      fontSize,
    }]);
  };

  // ── العثور على النص الذي تم الضغط عليه ───────────────────────────
  const findTextAtPosition = useCallback((px: number, py: number): TextItem | null => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return null;
    // نبحث من آخر نص (الأحدث) إلى أقدم نص
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      ctx.font = `${t.fontSize}px 'Tajawal', Arial`;
      const metrics = ctx.measureText(t.text);
      const tw = metrics.width;
      const th = t.fontSize * 1.4; // ارتفاع تقريبي مع فراغ
      const tx = t.x;
      const ty = t.y - t.fontSize; // y هي baseline، النص يبدأ من فوق
      // هامش خطأ 10px لتسهيل الضغط
      if (px >= tx - 8 && px <= tx + tw + 8 && py >= ty - 8 && py <= ty + th + 8) {
        return t;
      }
    }
    return null;
  }, [texts]);

  // ── الضغط المزدوج لتحرير النص ──────────────────────────────────
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    const pt = getEventPos(e);
    const found = findTextAtPosition(pt.x, pt.y);
    if (found) {
      const ctx = canvasRef.current?.getContext('2d');
      const tw = ctx ? ctx.measureText(found.text).width : 200;
      const th = found.fontSize * 1.4;
      setEditingTextId(found.id);
      setEditingTextValue(found.text);
      setEditingTextPos({
        x: found.x,
        y: found.y - found.fontSize, // أعلى النص
        w: Math.max(tw + 24, 160),
        h: Math.max(th + 16, 40),
      });
    }
  }, [findTextAtPosition]);

  // ── حفظ تعديل النص ──────────────────────────────────────────────
  const saveTextEdit = () => {
    if (editingTextId && editingTextValue.trim()) {
      setTexts(prev => prev.map(t =>
        t.id === editingTextId ? { ...t, text: editingTextValue.trim() } : t
      ));
    }
    setEditingTextId(null);
    setEditingTextValue('');
  };

  // ── إلغاء تعديل النص ──────────────────────────────────────────────
  const cancelTextEdit = () => {
    setEditingTextId(null);
    setEditingTextValue('');
  };

  // ── إضافة نص الإملاء ─── في المنطقة المرئية + RTL/LTR + auto-scroll!
  const addDictatedText = useCallback((enhancedText: string, rawText: string, textColor?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const off = offsetRef.current;
    const s = scaleRef.current;
    const currentFontSize = fontSizeRef.current || fontSize;
    
    // المنطقة المرئية حالياً في إحداثيات canvas
    const visibleLeft = -off.x / s;
    const visibleTop = -off.y / s;
    const visibleRight = (canvas.width - off.x) / s;
    
    // كشف اتجاه النص: عربي ← يمين، إنجليزي ← يسار
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(rawText);
    const margin = 24;
    const lineHeight = 36;
    
    // X: حسب اتجاه النص — عربي من اليمين، إنجليزي من اليسار
    const baseX = hasArabic
      ? visibleRight - margin
      : visibleLeft + margin;
    
    // Y: نبدأ من حيث توقفنا، أو من أعلى المنطقة المرئية
    const yStart = Math.max(visibleTop + 10, dictationTextYRef.current);
    
    const y = yStart;
    
    const displayText = arabicToUnicode(enhancedText || rawText);
    
    setTexts(prev => [...prev, {
      id: `dict-${Date.now()}`,
      x: baseX,
      y,
      text: displayText,
      color: textColor || '#1e293b',
      fontSize: currentFontSize,
    }]);
    
    // تحديث ref — دائماً تحت آخر نص
    dictationTextYRef.current = y + lineHeight;
    
    // Auto-scroll: إذا النص خارج الشاشة، حرك viewport لرؤيته
    const visibleBottom = (canvas.height - off.y) / s;
    const newBottom = y + lineHeight;
    
    if (newBottom > visibleBottom || y < visibleTop) {
      const targetY = y - ((visibleBottom - visibleTop) * 0.35);
      updateOffset({ x: off.x, y: -targetY * s });
    }
  }, [fontSize]);

  const saveBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // تصدير الصورة بالـ zoom الحالي
    redrawCanvas();
    const dataUrl = canvas.toDataURL('image/png');
    if (onSave) onSave(dataUrl);
    const link = document.createElement('a');
    link.download = `board_${lectureTitle}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const startRecording = () => {
    saveBoard();
    setIsRecording(true);
    setTimeout(() => setIsRecording(false), 2000);
  };

  // Tool metadata
  const shapeTools: { key: DrawTool; label: string; icon: React.ReactNode }[] = [
    { key: 'line',     label: 'خط مستقيم',  icon: <Minus className="w-4 h-4" /> },
    { key: 'rect',     label: 'مستطيل',      icon: <Square className="w-4 h-4" /> },
    { key: 'circle',   label: 'دائرة / بيضاوي', icon: <Circle className="w-4 h-4" /> },
    { key: 'triangle', label: 'مثلث',         icon: <Triangle className="w-4 h-4" /> },
    { key: 'arrow',    label: 'سهم',          icon: <ArrowRight className="w-4 h-4" /> },
  ];

  const btn = (active: boolean, dark = effectiveDark) =>
    `p-2 rounded-lg transition ${
      active
        ? 'bg-teal-600 text-white shadow-md scale-105'
        : dark
          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
    }`;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${effectiveDark ? 'bg-slate-900' : 'bg-slate-100'}`}
      dir="rtl"
    >
      {/* ═══ Canvas الرئيسي — يملأ الشاشة بالكامل ═══ */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ cursor: isPanning.current || isPanMode ? 'grab' : isShapeTool(tool) ? 'crosshair' : tool === 'eraser' ? 'cell' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {/* Overlay canvas للـ shape preview (بدون pointer events) */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* ═══ شريط الأدوات الزجاجي العائم ═══ */}
      <div 
        className={`absolute top-3 left-3 right-3 z-20 rounded-2xl backdrop-blur-xl border transition-all duration-500 ${
          !isToolbarVisible 
            ? 'opacity-0 pointer-events-none translate-y-[-120%]' 
            : 'opacity-100 translate-y-0'
        } ${effectiveDark ? 'bg-slate-900/85 border-slate-700/60 shadow-2xl shadow-black/40' : 'bg-white/90 border-slate-200/80 shadow-xl'}`}
      >
        {/* السطر الأول: العنوان والأزرار الرئيسية */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 shadow">
              <Palette className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={`text-xs font-bold ${effectiveDark ? 'text-white' : 'text-slate-800'}`}>{lectureTitle}</span>
            {isDictationMode && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold animate-pulse">
                🎤 إملاء
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsDictationMode(!isDictationMode)}
              title="الإملاء الذكي"
              className={`p-1.5 rounded-lg transition-all hover:scale-105 ${
                isDictationMode 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg' 
                  : effectiveDark ? 'bg-slate-700/70 text-slate-300 hover:bg-slate-600' : 'bg-slate-200/70 text-slate-600 hover:bg-slate-300'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
            <button onClick={undo} disabled={historyIndex <= 0} title="تراجع"
              className={`p-1.5 rounded-lg transition ${historyIndex <= 0 ? 'opacity-30 cursor-not-allowed' : effectiveDark ? 'bg-slate-700/70 hover:bg-slate-600 text-blue-400' : 'bg-slate-200/70 hover:bg-slate-300 text-blue-600'}`}>
              <Undo className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} title="إعادة"
              className={`p-1.5 rounded-lg transition ${historyIndex >= history.length - 1 ? 'opacity-30 cursor-not-allowed' : effectiveDark ? 'bg-slate-700/70 hover:bg-slate-600 text-blue-400' : 'bg-slate-200/70 hover:bg-slate-300 text-blue-600'}`}>
              <Redo className="w-4 h-4" />
            </button>
            <button onClick={clearBoard} title="مسح الكل"
              className={`p-1.5 rounded-lg transition ${effectiveDark ? 'bg-slate-700/70 hover:bg-slate-600 text-red-400' : 'bg-slate-200/70 hover:bg-slate-300 text-red-600'}`}>
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={saveBoard} title="حفظ الصورة"
              className={`p-1.5 rounded-lg transition ${effectiveDark ? 'bg-slate-700/70 hover:bg-slate-600 text-green-400' : 'bg-slate-200/70 hover:bg-slate-300 text-green-600'}`}>
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* السطر الثاني: أدوات الرسم */}
        <div className={`flex flex-wrap items-center gap-1.5 px-3 py-1.5 border-t ${effectiveDark ? 'border-slate-700/50' : 'border-slate-200/70'}`}>
          {/* أدوات الرسم الحر */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => setTool('pen')} title="قلم" className={`p-1.5 rounded-lg transition ${tool === 'pen' ? 'bg-teal-600 text-white shadow' : effectiveDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-300/50'}`}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setTool('highlighter')} title="تحديد" className={`p-1.5 rounded-lg transition ${tool === 'highlighter' ? 'bg-teal-600 text-white shadow' : effectiveDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-300/50'}`}>
              <Highlighter className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setTool('eraser')} title="ممحاة" className={`p-1.5 rounded-lg transition ${tool === 'eraser' ? 'bg-teal-600 text-white shadow' : effectiveDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-300/50'}`}>
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className={`w-px h-5 ${effectiveDark ? 'bg-slate-600/50' : 'bg-slate-300/50'}`} />

          {/* الأشكال الهندسية */}
          <div className="flex items-center gap-0.5">
            {shapeTools.map(st => (
              <button key={st.key} onClick={() => setTool(st.key)} title={st.label}
                className={`p-1.5 rounded-lg transition ${tool === st.key ? 'bg-teal-600 text-white shadow' : effectiveDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-300/50'}`}>
                {st.icon}
              </button>
            ))}
          </div>

          <div className={`w-px h-5 ${effectiveDark ? 'bg-slate-600/50' : 'bg-slate-300/50'}`} />

          {/* الألوان */}
          <div className="flex items-center gap-0.5 flex-wrap">
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-full border transition-all ${color === c ? 'border-white scale-125 shadow' : 'border-transparent hover:scale-110'}`}
                style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              title="لون مخصص" className="w-5 h-5 border-0 rounded cursor-pointer bg-transparent" />
          </div>

          <div className={`w-px h-5 ${effectiveDark ? 'bg-slate-600/50' : 'bg-slate-300/50'}`} />

          {/* سُمك الخط */}
          <div className="flex items-center gap-0.5">
            {lineWidths.map(w => (
              <button key={w} onClick={() => setLineWidth(w)} title={`سُمك ${w}`}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${lineWidth === w ? 'bg-teal-600' : effectiveDark ? 'bg-slate-700/50 hover:bg-slate-600/50' : 'bg-slate-200/50 hover:bg-slate-300/50'}`}>
                <div className="rounded-full" style={{ width: w * 1.5, height: w * 1.5, backgroundColor: lineWidth === w ? '#fff' : effectiveDark ? '#94a3b8' : '#475569' }} />
              </button>
            ))}
          </div>

          <div className={`w-px h-5 ${effectiveDark ? 'bg-slate-600/50' : 'bg-slate-300/50'}`} />

          {/* حجم النص */}
          <div className="flex items-center gap-0.5">
            <span className={`text-[9px] font-bold ${effectiveDark ? 'text-slate-400' : 'text-slate-500'}`}>نص</span>
            {fontSizes.slice(0, 4).map(fs => (
              <button key={fs} onClick={() => setFontSize(fs)} title={`حجم ${fs}`}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${fontSize === fs ? 'bg-teal-600 text-white shadow' : effectiveDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-300/50'}`}>
                <span style={{ fontSize: Math.min(fs / 3.5, 13), fontWeight: 700 }}>{fs}</span>
              </button>
            ))}
            <button onClick={addText} title="إضافة نص"
              className={`p-1.5 rounded-lg transition ${effectiveDark ? 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300' : 'bg-slate-200/50 hover:bg-slate-300/50 text-slate-600'}`}>
              <Type className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* تلميح الأداة */}
          {isShapeTool(tool) && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg ${effectiveDark ? 'bg-teal-900/60 text-teal-300' : 'bg-teal-50 text-teal-700'}`}>
              {shapeTools.find(s => s.key === tool)?.label}
            </span>
          )}

          <div className={`w-px h-5 ${effectiveDark ? 'bg-slate-600/50' : 'bg-slate-300/50'}`} />

          {/* وضع اليد (Pan Mode) */}
          <button
            onClick={() => setIsPanMode(!isPanMode)}
            title={isPanMode ? 'وضع الرسم (إلغاء اليد)' : 'وضع اليد للتحريك'}
            className={`p-1.5 rounded-lg transition-all ${
              isPanMode
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg scale-110'
                : effectiveDark
                  ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  : 'bg-slate-200/50 text-slate-600 hover:bg-slate-300/50'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
          </button>

          <div className={`w-px h-5 ${effectiveDark ? 'bg-slate-600/50' : 'bg-slate-300/50'}`} />

          {/* أزرار التحكم في التكبير/التصغير والقفل */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => { if (!isZoomLocked) updateScale(clamp(scaleRef.current - 0.25, 0.25, 5)); }} title="تصغير"
              className={`p-1.5 rounded-lg transition ${effectiveDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-300/50'}`}>
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateScale(1)}
              title="إعادة تعيين التكبير"
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${scaleRef.current === 1 ? (effectiveDark ? 'text-teal-400' : 'text-teal-600') : effectiveDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-300/50'}`}
            >
              {Math.round(scaleRef.current * 100)}%
            </button>
            <button onClick={() => { if (!isZoomLocked) updateScale(clamp(scaleRef.current + 0.25, 0.25, 5)); }} title="تكبير"
              className={`p-1.5 rounded-lg transition ${effectiveDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-300/50'}`}>
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className={`w-px h-5 ${effectiveDark ? 'bg-slate-600/50' : 'bg-slate-300/50'}`} />

          {/* زر التركيز على آخر نص/رسم */}
          <button
            onClick={() => {
              const lastText = texts.length > 0 ? texts[texts.length - 1] : null;
              if (lastText) {
                const canvas = canvasRef.current;
                if (canvas) {
                  const s = scaleRef.current;
                  const targetY = lastText.y;
                  updateOffset({ x: offsetRef.current.x, y: -(targetY - canvas.height / s / 2) });
                }
              }
            }}
            title="التركيز على آخر نص"
            className={`p-1.5 rounded-lg transition-all hover:scale-105 ${effectiveDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-300/50'}`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* زر القفل */}
          <button
            onClick={() => setIsZoomLocked(!isZoomLocked)}
            title={isZoomLocked ? 'فتح التكبير' : 'قفل التكبير'}
            className={`p-1.5 rounded-lg transition-all ${
              isZoomLocked
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg scale-110'
                : effectiveDark
                  ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  : 'bg-slate-200/50 text-slate-600 hover:bg-slate-300/50'
            }`}
          >
            {isZoomLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          <div className={`w-px h-5 ${effectiveDark ? 'bg-slate-600/50' : 'bg-slate-300/50'}`} />

          {/* Hide toolbar button */}
          <button
            onClick={() => setIsToolbarVisible(false)}
            title="إخفاء شريط الأدوات"
            className={`p-1.5 rounded-lg transition-all hover:scale-105 ${effectiveDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-300/50'}`}
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ═══ زر إظهار شريط الأدوات (عند الإخفاء) ═══ */}
      {!isToolbarVisible && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => setIsToolbarVisible(true)}
          title="إظهار شريط الأدوات"
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-20 p-2 rounded-full backdrop-blur-xl border shadow-2xl transition-all hover:scale-110 ${
            effectiveDark 
              ? 'bg-slate-900/85 border-slate-700/60 shadow-black/40' 
              : 'bg-white/90 border-slate-200/80 shadow-xl'
          }`}
        >
          <Eye className={`w-5 h-5 ${effectiveDark ? 'text-slate-300' : 'text-slate-600'}`} />
        </motion.button>
      )}

      {/* ═══ نافذة تعديل النص ═══ */}
      {editingTextId && (
        <div className="absolute z-30"
          style={{
            left: editingTextPos.x,
            top: editingTextPos.y,
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 p-2"
            style={{ width: Math.min(editingTextPos.w, 360), maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              autoFocus
              value={editingTextValue}
              onChange={(e) => setEditingTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveTextEdit(); }
                if (e.key === 'Escape') cancelTextEdit();
              }}
              className="w-full resize-none rounded-lg border border-slate-200 p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              style={{ minHeight: 36, direction: 'rtl', fontFamily: 'Tajawal, Arial' }}
              rows={1}
              placeholder="عدل النص..."
            />
            <div className="flex items-center justify-between gap-1.5 mt-1.5">
              <span className="text-[8px] text-slate-400">Enter ↵ | ESC ⎋</span>
              <div className="flex items-center gap-1.5">
                <button onClick={saveTextEdit}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[10px] font-bold hover:shadow transition">حفظ</button>
                <button onClick={cancelTextEdit}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-300 transition">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ طبقة عرض الرياضيات (HTML + KaTeX) فوق Canvas ═══ */}
      <MathCanvasOverlay
        texts={texts}
        scale={scale}
        offset={offset}
        canvasWidth={canvasRef.current?.width || 1200}
        canvasHeight={canvasRef.current?.height || 800}
        isDark={effectiveDark}
      />

      {/* ═══ لوحة الإملاء الذكي — تظهر في الأسفل عند التفعيل ═══ */}
      <SmartDictationPanel
        isActive={isDictationMode}
        onClose={() => setIsDictationMode(false)}
        onEntryEnhanced={addDictatedText}
      />
    </div>
  );
}
