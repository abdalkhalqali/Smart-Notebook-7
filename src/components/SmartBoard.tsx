import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pencil, Eraser, Trash2, Download, Undo, Redo,
  Type, Minus, ArrowRight, Square, Circle,
  Triangle, Palette, Play, Pause, Highlighter, Spline,
  Mic, MicOff
} from 'lucide-react';
import SmartDictationPanel from './SmartDictationPanel';
import { arabicToUnicode } from '../utils/mathUtils';

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

  // ResizeObserver لضبط حجم canvas ديناميكياً مع تغير حجم النافذة
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeCanvas = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      
      canvas.width = Math.round(w * devicePixelRatio);
      canvas.height = Math.round(h * devicePixelRatio);
      
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.width = canvas.width;
        overlay.height = canvas.height;
      }
      
      // إعادة الرسم بعد تغيير الحجم
      redrawCanvas();
    };

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);
    resizeCanvas();

    return () => observer.disconnect();
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
  // عداد لتحريك موضع النص الجديد على السبورة
  const dictationTextCount = useRef(0);
  
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

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

  // ─── Main canvas redraw ──────────────────────────────────────────────
  const redrawCanvas = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    ctx.fillStyle = effectiveDark ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid dots for light mode / dictation mode
    if (!effectiveDark) {
      ctx.fillStyle = '#e8ecf0';
      for (let x = 0; x < canvas.width; x += 30) {
        for (let y = 0; y < canvas.height; y += 30) {
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
    });    }, [paths, shapes, texts, effectiveDark]);

  // Redraw on state change
  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  // Live preview overlay for shape tools
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (shapePreview) {
      ctx.strokeStyle = shapePreview.color;
      ctx.lineWidth = shapePreview.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.75;
      ctx.setLineDash([6, 4]);
      renderShape(ctx, shapePreview);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
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

  // ─── Pointer events ──────────────────────────────────────────────────
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pt = getEventPos(e);
    setIsDrawing(true);
    if (isFreehandTool(tool)) {
      setCurrentPath([pt]);
    } else {
      shapeStart.current = pt;
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pt = getEventPos(e);

    if (isFreehandTool(tool)) {
      setCurrentPath(prev => {
        const next = [...prev, pt];
        // Live freehand preview directly on main canvas
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && next.length >= 2) {
          ctx.strokeStyle = tool === 'eraser'
            ? (effectiveDark ? '#1e293b' : '#ffffff')
            : color;
          ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = tool === 'highlighter' ? 0.4 : 1;
          // Draw just the last segment incrementally
          const last = next[next.length - 2];
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
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

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);

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
      // Trigger full redraw to apply smooth bezier over incremental lines
      setTimeout(redrawCanvas, 0);
    } else if (shapeStart.current && shapePreview) {
      const newShape: DrawnShape = { ...shapePreview, id: Date.now().toString() };
      const newShapes = [...shapes, newShape];
      setShapes(newShapes);
      pushHistory(paths, newShapes);
      setShapePreview(null);
      shapeStart.current = null;
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

  // ── إضافة نص من الإملاء إلى السبورة ──────────────────────────
  const addDictatedText = useCallback((enhancedText: string, rawText: string, textColor?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    dictationTextCount.current += 1;
    const count = dictationTextCount.current;
    
    // موضع النص: يتراكم عمودياً كلما أضيف نص جديد
    const margin = 30;
    const lineHeight = 35;
    const x = margin + 20;
    const y = margin + (count - 1) * lineHeight;
    
    // استخدم النص المحسَّن مع تحويل الكلمات الرياضية لرموز Unicode
    const displayText = arabicToUnicode(enhancedText || rawText);
    
    setTexts(prev => [...prev, {
      id: `dict-${Date.now()}`,
      x,
      y,
      text: displayText,
      color: textColor || '#1e293b',
      fontSize,
    }]);
  }, []);

  const saveBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
        width={1200}
        height={800}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ cursor: isShapeTool(tool) ? 'crosshair' : tool === 'eraser' ? 'cell' : 'default' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onDoubleClick={handleCanvasDoubleClick}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      {/* Overlay canvas للـ shape preview (بدون pointer events) */}
      <canvas
        ref={overlayRef}
        width={1200}
        height={800}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* ═══ شريط الأدوات الزجاجي العائم ═══ */}
      <div 
        className={`absolute top-3 left-3 right-3 z-20 rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
          effectiveDark 
            ? 'bg-slate-900/85 border-slate-700/60 shadow-2xl shadow-black/40' 
            : 'bg-white/90 border-slate-200/80 shadow-xl'
        }`}
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
        </div>
      </div>

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

      {/* ═══ لوحة الإملاء الذكي — تظهر في الأسفل عند التفعيل ═══ */}
      <SmartDictationPanel
        isActive={isDictationMode}
        onClose={() => setIsDictationMode(false)}
        onEntryEnhanced={addDictatedText}
      />
    </div>
  );
}
