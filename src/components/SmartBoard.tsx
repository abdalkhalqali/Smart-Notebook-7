import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pencil, Eraser, Trash2, Download, Undo, Redo,
  Type, Minus, ArrowRight, Square, Circle,
  Triangle, Palette, Play, Pause, Highlighter, Spline
} from 'lucide-react';

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

  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [shapes, setShapes] = useState<DrawnShape[]>([]);
  const [shapePreview, setShapePreview] = useState<DrawnShape | null>(null);
  const shapeStart = useRef<Point | null>(null);

  const [tool, setTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState(isDarkMode ? '#ffffff' : '#1e293b');
  const [lineWidth, setLineWidth] = useState(3);
  const [texts, setTexts] = useState<TextItem[]>([]);

  // Undo / Redo — snapshots of {paths, shapes}
  const [history, setHistory] = useState<HistorySnapshot[]>([{ paths: [], shapes: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [isRecording, setIsRecording] = useState(false);

  const colors = isDarkMode
    ? ['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
    : ['#1e293b', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777'];

  const lineWidths = [2, 4, 6, 8, 12];

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

    ctx.fillStyle = isDarkMode ? '#1e293b' : '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid dots for light mode
    if (!isDarkMode) {
      ctx.fillStyle = '#e2e8f0';
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
        ? (isDarkMode ? '#1e293b' : '#f8fafc')
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
  }, [paths, shapes, texts, isDarkMode]);

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
            ? (isDarkMode ? '#1e293b' : '#f8fafc')
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
          color: tool === 'eraser' ? (isDarkMode ? '#1e293b' : '#f8fafc') : color,
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
      fontSize: lineWidth * 5,
    }]);
  };

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

  const btn = (active: boolean, dark = isDarkMode) =>
    `p-2 rounded-lg transition ${
      active
        ? 'bg-teal-600 text-white shadow-md scale-105'
        : dark
          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
    }`;

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
      {/* ── Header ── */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 shadow">
            <Palette className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{lectureTitle}</h3>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>السبورة الذكية التفاعلية</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={startRecording} title="تسجيل"
            className={`p-2 rounded-lg transition ${isRecording ? 'bg-red-500 animate-pulse' : isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'} text-white`}>
            {isRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={saveBoard} title="حفظ الصورة"
            className={`p-2 rounded-lg transition ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-green-400' : 'bg-slate-200 hover:bg-slate-300 text-green-600'}`}>
            <Download className="w-4 h-4" />
          </button>
          <button onClick={undo} disabled={historyIndex <= 0} title="تراجع"
            className={`p-2 rounded-lg transition ${historyIndex <= 0 ? 'opacity-40 cursor-not-allowed' : isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-blue-400' : 'bg-slate-200 hover:bg-slate-300 text-blue-600'}`}>
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} title="إعادة"
            className={`p-2 rounded-lg transition ${historyIndex >= history.length - 1 ? 'opacity-40 cursor-not-allowed' : isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-blue-400' : 'bg-slate-200 hover:bg-slate-300 text-blue-600'}`}>
            <Redo className="w-4 h-4" />
          </button>
          <button onClick={clearBoard} title="مسح الكل"
            className={`p-2 rounded-lg transition ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-red-400' : 'bg-slate-200 hover:bg-slate-300 text-red-600'}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Tools Bar ── */}
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2 border-b ${isDarkMode ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'}`}>
        {/* Freehand tools */}
        <div className="flex items-center gap-1">
          <button onClick={() => setTool('pen')} title="قلم حر" className={btn(tool === 'pen')}>
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setTool('highlighter')} title="تحديد فسفوري" className={btn(tool === 'highlighter', isDarkMode)}>
            <Highlighter className="w-4 h-4" />
          </button>
          <button onClick={() => setTool('eraser')} title="ممحاة" className={btn(tool === 'eraser', isDarkMode)}>
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Separator */}
        <div className={`w-px h-7 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />

        {/* Shape tools */}
        <div className="flex items-center gap-1">
          {shapeTools.map(st => (
            <button key={st.key} onClick={() => setTool(st.key)} title={st.label}
              className={btn(tool === st.key, isDarkMode)}>
              {st.icon}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className={`w-px h-7 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />

        {/* Colors */}
        <div className="flex items-center gap-1 flex-wrap">
          {colors.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-125 shadow-lg' : 'border-transparent hover:scale-110'}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            title="لون مخصص" className="w-6 h-6 border-0 rounded cursor-pointer bg-transparent" />
        </div>

        {/* Separator */}
        <div className={`w-px h-7 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />

        {/* Line widths */}
        <div className="flex items-center gap-1">
          {lineWidths.map(w => (
            <button key={w} onClick={() => setLineWidth(w)} title={`سُمك ${w}`}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${lineWidth === w ? 'bg-teal-600' : isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}>
              <div className="rounded-full bg-current" style={{ width: w * 2, height: w * 2, backgroundColor: lineWidth === w ? '#fff' : color }} />
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className={`w-px h-7 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />

        {/* Text */}
        <button onClick={addText} title="إضافة نص"
          className={`p-2 rounded-lg transition ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}`}>
          <Type className="w-4 h-4" />
        </button>

        {/* Tool hint */}
        {isShapeTool(tool) && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${isDarkMode ? 'bg-teal-900/60 text-teal-300' : 'bg-teal-50 text-teal-700'}`}>
            اسحب على اللوحة لرسم {shapeTools.find(s => s.key === tool)?.label}
          </span>
        )}
      </div>

      {/* ── Canvas Area ── */}
      <div className="flex-1 overflow-auto p-3">
        <div className={`relative rounded-xl overflow-hidden shadow-xl border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}
          style={{ width: '100%', aspectRatio: '2 / 1', minHeight: 300 }}>
          {/* Main drawing canvas */}
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            className="absolute inset-0 w-full h-full touch-none"
            style={{ cursor: isShapeTool(tool) ? 'crosshair' : tool === 'eraser' ? 'cell' : 'default' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {/* Overlay canvas for shape preview (pointer-events-none) */}
          <canvas
            ref={overlayRef}
            width={1200}
            height={600}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        </div>
      </div>

      {/* ── Info bar ── */}
      <div className={`text-center py-1.5 text-[11px] ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-400'}`}>
        ✏️ قلم حر مع Bezier ناعم &nbsp;|&nbsp; اسحب لرسم أشكال هندسية &nbsp;|&nbsp; Ctrl+Z = تراجع
      </div>
    </div>
  );
}
