import React, { useRef, useState, useEffect } from "react";
import { PageData, DrawingStroke, GeometricShape, StickerSticker, DragTextbox, Point, bgType } from "../types";
import { Edit3, Eraser, Square, Type, StickyNote, RefreshCw, Layers, Sparkles, Volume2, Lock, Unlock, ChevronUp, ChevronDown } from "lucide-react";

interface NotebookCanvasProps {
  page: PageData;
  onUpdatePage: (updates: Partial<PageData>) => void;
  isRecordPlaying?: boolean;
  currentPlaybackSeconds?: number;
  onSeekAudio?: (seconds: number) => void;
  isReadOnly?: boolean;
  isDarkMode?: boolean;
  lectureDate?: string;
}

export default function NotebookCanvas({
  page,
  onUpdatePage,
  isRecordPlaying = false,
  currentPlaybackSeconds = 0,
  onSeekAudio,
  isReadOnly = false,
  isDarkMode = false,
  lectureDate
}: NotebookCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Interaction State
  const [activeTool, setActiveTool] = useState<'draw' | 'erase' | 'shape' | 'textbox' | 'sticker'>('draw');
  const [brushColor, setBrushColor] = useState<string>("#4f46e5"); // Indigo
  const [brushType, setBrushType] = useState<'pen' | 'pencil' | 'highlighter'>('pen');
  const [brushWidth, setBrushWidth] = useState<number>(3);
  const [savedColors, setSavedColors] = useState<string[]>(["#4f46e5", "#ef4444", "#10b981", "#f59e0b", "#3b82f6", "#111827"]);

  // Sync color palette with Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      setSavedColors(["#818cf8", "#f87171", "#34d399", "#fbbf24", "#60a5fa", "#f8fafc"]);
      setBrushColor("#818cf8");
    } else {
      setSavedColors(["#4f46e5", "#ef4444", "#10b981", "#f59e0b", "#3b82f6", "#111827"]);
      setBrushColor("#4f46e5");
    }
  }, [isDarkMode]);

  // Reading Mode premium states
  const [eyeCareMode, setEyeCareMode] = useState<'none' | 'sepia' | 'mint'>('none');
  const [readingTextZoom, setReadingTextZoom] = useState<number>(1.0);

  // Shapes & Sticker selections
  const [selectedShape, setSelectedShape] = useState<GeometricShape['type']>("rectangle");
  const [selectedSticker, setSelectedSticker] = useState<StickerSticker['type']>("important");
  const [stickerText, setStickerText] = useState<string>("مهم جداً");

  // Style of shapes
  const [shapeFill, setShapeFill] = useState<string>("#6366f120");
  const [shapeBorderColor, setShapeBorderColor] = useState<string>("#6366f1");
  const [shapeBorderSize, setShapeBorderSize] = useState<number>(2);
  const [shapeText, setShapeText] = useState<string>("");

  // Editor states
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'drawings' | 'shapes' | 'textboxes' | 'stickers'>('all');

  // Active state for resizer drag tracking
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Free-drag state for textboxes
  const [draggingBoxId, setDraggingBoxId] = useState<string | null>(null);
  const draggingBoxStartClient = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggingBoxStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Custom modal for textboxes to handle wrapping long lecture transcripts comfortably
  const [editingTextboxId, setEditingTextboxId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  // Handwriting audio sync helper: recording start time relative
  const [strokeStartTime, setStrokeStartTime] = useState<number | null>(null);

  // Sound effect when writing
  const [playPaperSound, setPlayPaperSound] = useState<boolean>(false);
  const [audioCtxState, setAudioCtxState] = useState<AudioContext | null>(null);

  // Screen/Canvas stability mode to prevent accidental scrolling or dragging on mobile/tablet devices
  const [isCanvasLocked, setIsCanvasLocked] = useState<boolean>(true); // Default to true so user gets premium stability out of the box!
  const [isCanvasFolded, setIsCanvasFolded] = useState<boolean>(false);

  // Pinch-to-zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartZoomRef = useRef<number>(1.0);
  const isPinchingRef = useRef<boolean>(false);

  const getPinchDistance = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  // Effect to prevent scrolling/dragging gestures on the canvas when locked
  // But always allow 2-finger pinch-to-zoom
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // 2-finger gesture → start pinch tracking (always allowed)
        isPinchingRef.current = true;
        pinchStartDistRef.current = getPinchDistance(e.touches);
        pinchStartZoomRef.current = zoomLevel;
        e.preventDefault();
        return;
      }
      isPinchingRef.current = false;

      if (!isCanvasLocked) return;
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('textarea') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('.pointer-events-auto') ||
        target.closest('[contenteditable="true"]')
      ) {
        return;
      }
      e.preventDefault();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinchingRef.current) {
        // Pinch-to-zoom: scale between 0.4× and 4×
        const currentDist = getPinchDistance(e.touches);
        const ratio = currentDist / pinchStartDistRef.current;
        const newZoom = Math.min(4.0, Math.max(0.4, pinchStartZoomRef.current * ratio));
        setZoomLevel(newZoom);
        e.preventDefault();
        return;
      }

      if (!isCanvasLocked) return;
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('textarea') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('.pointer-events-auto') ||
        target.closest('[contenteditable="true"]')
      ) {
        return;
      }
      e.preventDefault();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isCanvasLocked, zoomLevel]);

  // Initialize pencil noise audio synthesis
  const triggerPencilSound = () => {
    if (!playPaperSound) return;
    try {
      const ctx = audioCtxState || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtxState) setAudioCtxState(ctx);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(150 + Math.random() * 80, ctx.currentTime);
      gain.gain.setValueAtTime(0.01 + Math.random() * 0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // ignore silently
    }
  };

  // Redraw drawings layer on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset dimensions
    const rect = canvas.parentElement?.getBoundingClientRect();
    canvas.width = rect?.width || 800;
    canvas.height = rect?.height || 600;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    page.strokes.forEach((stroke) => {
      if (activeLayer !== 'all' && activeLayer !== 'drawings') return;
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Semi-transparent for highlighter
      if (stroke.brushType === 'highlighter') {
        ctx.globalAlpha = 0.4;
      } else if (stroke.brushType === 'pencil') {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = "#4b5563"; // grayish
      } else {
        ctx.globalAlpha = 1.0;
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0; // reset
    });

    // Also draw current active stroke
    if (currentPoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (brushType === 'highlighter') ctx.globalAlpha = 0.4;
      
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }, [page.strokes, currentPoints, activeLayer, brushColor, brushWidth, brushType]);

  // Handle manual drawings
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      time: isRecordPlaying ? currentPlaybackSeconds : Math.floor(Date.now() / 1000)
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isReadOnly) return; // Prevent drawing or editing in read-only focus mode
    const pt = getCoordinates(e);
    
    if (activeTool === 'draw') {
      setIsDrawing(true);
      setCurrentPoints([pt]);
      setStrokeStartTime(isRecordPlaying ? currentPlaybackSeconds : Date.now());
      triggerPencilSound();
    } else if (activeTool === 'erase') {
      // Find and remove clicked strokes
      const keptStrokes = page.strokes.filter(s => {
        // Simple distance check of bounding box
        const hit = s.points.some(p => Math.abs(p.x - pt.x) < 15 && Math.abs(p.y - pt.y) < 15);
        return !hit;
      });
      onUpdatePage({ strokes: keptStrokes });
    } else if (activeTool === 'shape') {
      // Add shape at click location
      const newShape: GeometricShape = {
        id: "shp-" + Date.now(),
        type: selectedShape,
        x: pt.x - 60,
        y: pt.y - 40,
        width: 120,
        height: 80,
        borderSize: shapeBorderSize,
        borderColor: shapeBorderColor,
        fillColor: shapeFill,
        text: shapeText,
        layer: "shapes"
      };
      onUpdatePage({ shapes: [...page.shapes, newShape] });
      // Reset active tool to draw or keep
    } else if (activeTool === 'textbox') {
      const newBox: DragTextbox = {
        id: "txt-" + Date.now(),
        x: pt.x - 100,
        y: pt.y - 20,
        width: 200,
        height: 60,
        text: "انقر مرتين لكتابة ملاحظة جديدة...",
        fontSize: 14,
        color: "#1f2937",
        layer: "textboxes"
      };
      onUpdatePage({ textboxes: [...page.textboxes, newBox] });
      setActiveTool('draw');
    } else if (activeTool === 'sticker') {
      const newSticker: StickerSticker = {
        id: "stk-" + Date.now(),
        type: selectedSticker,
        x: pt.x - 60,
        y: pt.y - 20,
        text: stickerText || "ملصق دراسي",
        layer: "stickers"
      };
      onUpdatePage({ stickers: [...page.stickers, newSticker] });
      setActiveTool('draw');
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pt = getCoordinates(e);
    setCurrentPoints((prev) => [...prev, pt]);
    triggerPencilSound();
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length > 1) {
      const newStroke: DrawingStroke = {
        id: "str-" + Date.now(),
        points: currentPoints,
        color: brushType === 'pencil' ? "#4b5563" : brushColor,
        brushType,
        width: brushWidth,
        layer: 'drawings'
      };
      onUpdatePage({ strokes: [...page.strokes, newStroke] });
    }
    setCurrentPoints([]);
  };

  // Convert hand stroke to AI perfect shape (Simulated edge detection)
  const autoPerfectLastShape = () => {
    if (page.strokes.length === 0) return;
    const lastStroke = page.strokes[page.strokes.length - 1];
    
    // Calculate bounding box
    const xs = lastStroke.points.map(p => p.x);
    const ys = lastStroke.points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;

    // Detect likely shape based on vertices or bounding box aspect ratios
    let detected: GeometricShape['type'] = "rectangle";
    if (Math.abs(width - height) < 20) {
      detected = "circle";
    }

    const perfectShape: GeometricShape = {
      id: "shp-auto-" + Date.now(),
      type: detected,
      x: minX,
      y: minY,
      width: width || 100,
      height: height || 100,
      borderSize: 2,
      borderColor: brushColor,
      fillColor: "#e0e7ff50",
      text: "شكل محسن تلقائياً",
      layer: "shapes"
    };

    // Remove the hand stroke and add the perfect shape
    const newStrokes = page.strokes.slice(0, -1);
    onUpdatePage({
      strokes: newStrokes,
      shapes: [...page.shapes, perfectShape]
    });
  };

  // Elements Draggable Helpers
  const updateElementPosition = (elementId: string, layer: 'shapes' | 'textboxes' | 'stickers', dx: number, dy: number) => {
    if (layer === 'shapes') {
      onUpdatePage({
        shapes: page.shapes.map(s => s.id === elementId ? { ...s, x: s.x + dx, y: s.y + dy } : s)
      });
    } else if (layer === 'textboxes') {
      onUpdatePage({
        textboxes: page.textboxes.map(t => t.id === elementId ? { ...t, x: t.x + dx, y: t.y + dy } : t)
      });
    } else if (layer === 'stickers') {
      onUpdatePage({
        stickers: page.stickers.map(st => st.id === elementId ? { ...st, x: st.x + dx, y: st.y + dy } : st)
      });
    }
  };

  // Sizing modification triggers (specifically for resizable text boxes)
  const updateElementSize = (elementId: string, layer: 'textboxes' | 'shapes', dw: number, dh: number) => {
    if (layer === 'textboxes') {
      onUpdatePage({
        textboxes: page.textboxes.map(t => t.id === elementId ? { 
          ...t, 
          width: Math.max(90, t.width + dw), 
          height: Math.max(45, t.height + dh) 
        } : t)
      });
    } else if (layer === 'shapes') {
      onUpdatePage({
        shapes: page.shapes.map(s => s.id === elementId ? {
          ...s,
          width: Math.max(60, s.width + dw),
          height: Math.max(40, s.height + dh)
        } : s)
      });
    }
  };

  // Free-drag useEffect for textboxes (mouse + touch)
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingBoxId) return;
      let clientX = 0, clientY = 0;
      if ('touches' in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }
      const dx = clientX - draggingBoxStartClient.current.x;
      const dy = clientY - draggingBoxStartClient.current.y;
      const newX = Math.max(0, draggingBoxStartPos.current.x + dx);
      const newY = Math.max(0, draggingBoxStartPos.current.y + dy);
      onUpdatePage({
        textboxes: page.textboxes.map(t =>
          t.id === draggingBoxId ? { ...t, x: newX, y: newY } : t
        )
      });
    };
    const handleUp = () => setDraggingBoxId(null);

    if (draggingBoxId) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [draggingBoxId, page.textboxes]);

  // Window listeners hook to track active touch/mouse slider drag resizing
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!resizingId || !resizeStart) return;
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const dx = clientX - resizeStart.x;
      const dy = clientY - resizeStart.y;

      onUpdatePage({
        textboxes: page.textboxes.map(t => t.id === resizingId ? { 
          ...t, 
          width: Math.max(90, resizeStart.w + dx), 
          height: Math.max(45, resizeStart.h + dy) 
        } : t)
      });
    };

    const handleUp = () => {
      if (resizingId) {
        setResizingId(null);
        setResizeStart(null);
      }
    };

    if (resizingId) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [resizingId, resizeStart, page.textboxes]);

  // Handle custom in-app text box editor triggering (Double click or selection click)
  const handleEditTextbox = (id: string, currentText: string) => {
    setEditingTextboxId(id);
    setEditingText(currentText);
  };

  // Delete an item
  const handleDeleteElement = (id: string, layer: 'shapes' | 'textboxes' | 'stickers') => {
    if (layer === 'shapes') {
      onUpdatePage({ shapes: page.shapes.filter(s => s.id !== id) });
    } else if (layer === 'textboxes') {
      onUpdatePage({ textboxes: page.textboxes.filter(t => t.id !== id) });
    } else if (layer === 'stickers') {
      onUpdatePage({ stickers: page.stickers.filter(st => st.id !== id) });
    }
    setSelectedElementId(null);
  };

  // Rendering backgrounds logic (Tailwind pattern overlays)
  const getBackgroundClass = (bg: bgType) => {
    if (isDarkMode) {
      switch (bg) {
        case "ruled":
          return "bg-[linear-gradient(#1e293b_1px,transparent_1px)] bg-[size:100%_28px]";
        case "grid":
          return "bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px]";
        case "dotted":
          return "bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] bg-[size:18px_18px]";
        case "oldPaper":
          return "bg-[#1d160c] border border-[#715d23]/40 font-serif shadow-inner";
        case "isoNetwork":
          return "bg-[linear-gradient(30deg,#1e293b_1px,transparent_1px),linear-gradient(150deg,#1e293b_1px,transparent_1px)] bg-[size:30px_30px]";
        default:
          return "bg-[#0b0f19]";
      }
    }
    switch (bg) {
      case "ruled":
        return "bg-[linear-gradient(#f3f4f6_1px,transparent_1px)] bg-[size:100%_28px]";
      case "grid":
        return "bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px]";
      case "dotted":
        return "bg-[radial-gradient(#d1d5db_1.2px,transparent_1.2px)] bg-[size:18px_18px]";
      case "oldPaper":
        return "bg-[#fbf5e6] border border-[#dcd194] font-serif shadow-inner";
      case "isoNetwork":
        return "bg-[linear-gradient(30deg,#f3f4f6_1px,transparent_1px),linear-gradient(150deg,#f3f4f6_1px,transparent_1px)] bg-[size:30px_30px]";
      default:
        return "bg-white";
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden shadow-sm border border-slate-200">
      {/* Floating Canvas Toolbar */}
      {isReadOnly ? (
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-[#f0f9f4] border-b border-emerald-200 gap-3 text-right" dir="rtl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm animate-pulse">
              👁️
            </div>
            <div>
              <p className="text-xs font-black text-emerald-950 font-sansArabic">نمط القراءة والتركيز الأكاديمي نشط</p>
              <p className="text-[10px] text-emerald-700 font-medium font-sansArabic">تم تجميد وحماية الملاحظات لتفادي التعديلات العشوائية وحفظ تركيز الاستذكار المريح.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Eye Care filter toggle button */}
            <div className="flex items-center gap-1 bg-white border border-emerald-200/60 p-1 rounded-lg shadow-sm">
              <span className="text-[10px] font-bold text-emerald-800 px-1.5 font-sansArabic">راحة العين:</span>
              <button 
                onClick={() => setEyeCareMode('none')}
                className={`text-[10px] font-extrabold px-2 py-1 rounded transition-all cursor-pointer ${eyeCareMode === 'none' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                افتراضي
              </button>
              <button 
                onClick={() => setEyeCareMode('sepia')}
                className={`text-[10px] font-extrabold px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-0.5 ${eyeCareMode === 'sepia' ? 'bg-amber-700 text-white shadow-sm font-black' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <span>ورق دافئ</span>
                <span>🌾</span>
              </button>
              <button 
                onClick={() => setEyeCareMode('mint')}
                className={`text-[10px] font-extrabold px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-0.5 ${eyeCareMode === 'mint' ? 'bg-teal-700 text-white shadow-sm font-black' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <span>أخضر هادئ</span>
                <span>🍃</span>
              </button>
            </div>

            {/* Font scaling control */}
            <div className="flex items-center gap-1 bg-white border border-emerald-200/60 p-1 rounded-lg shadow-sm">
              <span className="text-[10px] font-bold text-emerald-800 px-1.5 font-sansArabic">تكبير الخط:</span>
              <button 
                onClick={() => setReadingTextZoom(1.0)}
                className={`text-[10px] font-extrabold px-2.5 py-1 rounded transition-all cursor-pointer ${readingTextZoom === 1.0 ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                100%
              </button>
              <button 
                onClick={() => setReadingTextZoom(1.25)}
                className={`text-[10px] font-extrabold px-2.5 py-1 rounded transition-all cursor-pointer ${readingTextZoom === 1.25 ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                125% 🔍
              </button>
              <button 
                onClick={() => setReadingTextZoom(1.45)}
                className={`text-[10px] font-extrabold px-2.5 py-1 rounded transition-all cursor-pointer ${readingTextZoom === 1.45 ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                150% 🔎
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-white border-b border-slate-200 gap-2">
          <div className="flex items-center gap-2">
            {/* Active Tool Selector */}
            <button
              onClick={() => setActiveTool('draw')}
              className={`p-2 rounded-lg transition ${activeTool === 'draw' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              title="الكتابة بالقلم"
            >
              <Edit3 className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setActiveTool('erase')}
              className={`p-2 rounded-lg transition ${activeTool === 'erase' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              title="ممحاة"
            >
              <Eraser className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTool('shape')}
              className={`p-2 rounded-lg transition ${activeTool === 'shape' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              title="إدراج أشكال هندسية"
            >
              <Square className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                const newBoxId = "txt-" + Date.now();
                const newBox: DragTextbox = {
                  id: newBoxId,
                  x: 100 + Math.random() * 60,
                  y: 100 + Math.random() * 60,
                  width: 240,
                  height: 85,
                  text: "اضغط مرتين هنا لكتابة وتنسيق ملاحظتك الكتابية...",
                  fontSize: 13,
                  color: "#1f2937",
                  layer: "textboxes"
                };
                onUpdatePage({ textboxes: [...page.textboxes, newBox] });
                setSelectedElementId(newBoxId);
                // Open modal immediately so they can type without double-clicking!
                handleEditTextbox(newBoxId, "اضغط مرتين هنا لكتابة وتنسيق ملاحظتك الكتابية...");
                setActiveTool('draw'); // return to brush tools
              }}
              className="p-2 rounded-lg transition text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800"
              title="إضافة مربع نص مطبوع جديد فوراً 📝"
            >
              <Type className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTool('sticker')}
              className={`p-2 rounded-lg transition ${activeTool === 'sticker' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              title="ملصقات تعليمية جاهزة"
            >
              <StickyNote className="w-5 h-5" />
            </button>

            <button
              onClick={autoPerfectLastShape}
              className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition"
              title="التعرف الذكي لتعديل شكل آخر ضربة قلم وتجميل الرسم يدويًا ✨"
            >
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </button>

            {/* Zoom level indicator + reset */}
            {zoomLevel !== 1.0 && (
              <button
                onClick={() => setZoomLevel(1.0)}
                className="px-2 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold transition hover:bg-indigo-100 select-none"
                title="إعادة تعيين مستوى التكبير/التصغير إلى 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
            )}

            <button
              onClick={() => setIsCanvasLocked(!isCanvasLocked)}
              className={`p-2 rounded-lg border transition duration-200 cursor-pointer ${
                isCanvasLocked 
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm' 
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title={isCanvasLocked ? "إلغاء قفل الشاشة للسماح بالسحب والتمرير العادي" : "تثبيت شاشة الكتابة لمنع السحب العشوائي على الهواتف والأجهزة اللوحية 🔒"}
            >
              {isCanvasLocked ? <Lock className="w-5 h-5 text-rose-600" /> : <Unlock className="w-5 h-5 text-slate-500" />}
            </button>

            {/* Mini-square collapse/expand arrowhead button */}
            <button
              onClick={() => setIsCanvasFolded(!isCanvasFolded)}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all duration-200 ${
                isCanvasFolded 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm hover:bg-indigo-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title={isCanvasFolded ? "عرض وبسط صفحة مذكرات الكتابة 📖" : "طي وإخفاء صفحة مذكرات الكتابة 📘"}
            >
              <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-300 ${isCanvasFolded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Brush styling when tool is 'draw' */}
          {activeTool === 'draw' && (
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              {/* Ink type */}
              <select
                value={brushType}
                onChange={(e) => setBrushType(e.target.value as any)}
                className="text-xs bg-transparent font-medium text-slate-700 outline-none"
              >
                <option value="pen">قلم سائل ومحبر</option>
                <option value="pencil">رصاص رقيق</option>
                <option value="highlighter">قلم تحديد الفسفور</option>
              </select>
              
              {/* Colors picker */}
              <div className="flex items-center gap-1">
                {savedColors.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => setBrushColor(color)}
                    className={`w-4 h-4 rounded-full transition-transform ${brushColor === color ? 'scale-125 border-2 border-slate-800' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => {
                    setBrushColor(e.target.value);
                    if (!savedColors.includes(e.target.value)) {
                      setSavedColors([e.target.value, ...savedColors.slice(0, 5)]);
                    }
                  }}
                  className="w-5 h-5 border-0 rounded cursor-pointer"
                />
              </div>

              {/* Brush radius */}
              <input
                type="range"
                min="1"
                max="15"
                value={brushWidth}
                onChange={(e) => setBrushWidth(Number(e.target.value))}
                className="w-16 accent-indigo-600 cursor-pointer"
              />
            </div>
          )}

          {/* Shapes Drawer tools */}
          {activeTool === 'shape' && (
            <div className="flex flex-wrap items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100">
              <select
                value={selectedShape}
                onChange={(e) => setSelectedShape(e.target.value as any)}
                className="text-xs bg-white text-slate-800 px-1 py-1 rounded border outline-none font-medium"
              >
                <optgroup label="أشكال ثنائية الأبعاد">
                  <option value="square">مربع هندسي</option>
                  <option value="rectangle">مستطيل</option>
                  <option value="circle">دائرة مثالية</option>
                  <option value="triangle">مثلث</option>
                  <option value="arrow">سهم اتجاه</option>
                  <option value="line">خط مستقيم</option>
                  <option value="star">نجمة إنجاز</option>
                  <option value="heart">قلب دلالي</option>
                </optgroup>
                <optgroup label="أشكال مجسمة (3D)">
                  <option value="cube">مكعب ثلاثي الأبعاد</option>
                  <option value="pyramid">هرم ثلاثي ذكي</option>
                  <option value="sphere">كرة تظليلية</option>
                  <option value="cylinder">أسطوانة</option>
                  <option value="cone">مخروط تعليمي</option>
                </optgroup>
              </select>

              <input
                type="text"
                placeholder="نص داخل الشكل..."
                value={shapeText}
                onChange={(e) => setShapeText(e.target.value)}
                className="text-xs bg-white px-2 py-1 rounded border w-24 outline-none"
              />

              <input
                type="color"
                value={shapeBorderColor}
                onChange={(e) => setShapeBorderColor(e.target.value)}
                title="لون الحدود"
                className="w-5 h-5 border-0 cursor-pointer mt-0.5"
              />

              <input
                type="color"
                value={shapeFill.substring(0, 7)}
                onChange={(e) => setShapeFill(e.target.value + "20")}
                title="لون التعبئة"
                className="w-5 h-5 border-0 cursor-pointer mt-0.5"
              />
            </div>
          )}

          {/* Stickers selector tools */}
          {activeTool === 'sticker' && (
            <div className="flex flex-wrap items-center gap-2 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100">
              <select
                value={selectedSticker}
                onChange={(e) => setSelectedSticker(e.target.value as any)}
                className="text-xs bg-white text-slate-800 px-1 py-1 rounded border outline-none"
              >
                <option value="important">استكر: هام جداً</option>
                <option value="question">استكر: سؤال امتحان</option>
                <option value="note">استكر: ملحوظة هامشية</option>
                <option value="definition">استكر: مفهوم جديد</option>
                <option value="law">استكر: قانون فيزيائي/رياضي</option>
                <option value="example">استكر: مثال توضيحي</option>
              </select>
              <input
                type="text"
                value={stickerText}
                onChange={(e) => setStickerText(e.target.value)}
                placeholder="اكتب التنويه..."
                className="text-xs bg-white px-2 py-1 rounded border w-28 outline-none"
              />
            </div>
          )}

          {/* Audio interaction play / sound sync configurations */}
          <div className="flex flex-col items-center gap-1.5 self-center select-none">
            {lectureDate && (
              <span className={`text-[10px] font-extrabold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                📅 {new Date(lectureDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
            <button
              onClick={() => setPlayPaperSound(!playPaperSound)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                playPaperSound ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>صوت الكتابة</span>
            </button>
          </div>
        </div>
      )}

      {isCanvasFolded && (
        <div className="py-20 text-center bg-slate-100/30 text-slate-500 flex flex-col items-center justify-center space-y-3 border-t border-slate-200" dir="rtl">
          <div className="p-3 bg-indigo-50 rounded-full text-indigo-500">
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </div>
          <p className="text-xs font-bold font-sansArabic">تم طي منصة معالجة وكتابة الصفحة حالياً 📘</p>
          <span className="text-[10px] text-slate-400 font-sansArabic">اضغط على زر السهم المربع بالأعلى بجانب قفل الشاشة لإعادة بسط صفحة الدفتر للكتابة.</span>
        </div>
      )}

      {/* Pages Container Stage */}
      <div 
        ref={containerRef}
        id={`aistudio-canvas-stage-${page.id}`}
        className={`relative flex-1 p-6 transition-all duration-500 ${isCanvasFolded ? 'hidden' : ''}`}
        style={{
          overflowY: isCanvasLocked && zoomLevel === 1.0 ? 'hidden' : 'auto',
          overflowX: isCanvasLocked && zoomLevel === 1.0 ? 'hidden' : 'auto',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'none',
        }}
      >
        {/* Main Cornell Layout divided overlay structure */}
        {page.templateType === 'cornell' && (
          <div className={`absolute inset-0 grid grid-cols-12 pointer-events-none border-b ${isDarkMode ? 'border-red-900/50' : 'border-red-200'} z-10`}>
            {/* Cue Left Col (Arabic divides on right/left logically) */}
            <div className={`col-span-3 border-l-2 border-dashed ${isDarkMode ? 'border-red-900/40 bg-red-950/10' : 'border-red-300 bg-red-50/10'} h-full flex flex-col justify-between p-3`}>
              <span className={`text-[11px] font-bold ${isDarkMode ? 'text-red-400' : 'text-red-500'} font-sans tracking-wide`}>الكلمات المفتاحية والأسئلة (Cues)</span>
              <textarea
                placeholder="اكتب أسئلة المراجعة الفرعية هنا..."
                value={page.cornellCues || ""}
                onChange={(e) => onUpdatePage({ cornellCues: e.target.value })}
                className={`pointer-events-auto bg-transparent border-0 resize-none font-sans text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-600'} focus:outline-none focus:ring-0 leading-relaxed w-full h-full pt-2`}
              />
            </div>
            {/* Notes Section */}
            <div className="col-span-9 p-3 relative h-full">
              <span className={`text-[11px] font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} font-sans tracking-wide`}>ملاحظات المحاضرة التفصيلية (Notes)</span>
              
              {/* Bottom Fixed Area of Cornell Summary */}
              <div className={`absolute bottom-4 left-4 right-4 ${isDarkMode ? 'bg-[#181206]/85 border-amber-950 text-amber-200' : 'bg-amber-50/80 border-amber-200 text-amber-900'} pointer-events-auto border rounded-lg p-3 shadow-sm flex flex-col z-20`}>
                <span className={`text-[10px] font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'} mb-1`}>الخلاصة والملخص أسفل الصفحة (Summary)</span>
                <input
                  type="text"
                  value={page.cornellSummary || ""}
                  onChange={(e) => onUpdatePage({ cornellSummary: e.target.value })}
                  placeholder="لخص الصفحة في سطرين مدمجين لمراجعتها يوم الامتحان السريع..."
                  className={`w-full bg-transparent border-0 text-xs font-sans ${isDarkMode ? 'text-amber-200 placeholder-amber-600/60' : 'text-amber-900 placeholder-amber-700/50'} outline-none`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Page Inner Canvas Surface — with pinch-to-zoom transform applied */}
        <div 
          className={`relative w-full min-h-[650px] shadow-sm rounded-lg ${getBackgroundClass(page.bgPattern)}`}
          style={{ 
            cursor: isReadOnly ? 'default' : (activeTool === 'draw' ? 'crosshair' : 'default'),
            backgroundColor: eyeCareMode === 'sepia' 
              ? (isDarkMode ? '#21190c' : '#faf3df') 
              : eyeCareMode === 'mint' 
                ? (isDarkMode ? '#0d1e15' : '#edf6f1') 
                : (isDarkMode ? '#0b0f19' : undefined),
            transform: zoomLevel !== 1.0 ? `scale(${zoomLevel})` : undefined,
            transformOrigin: 'top center',
            transition: 'background-color 0.3s, transform 0.15s ease-out',
            willChange: zoomLevel !== 1.0 ? 'transform' : undefined,
          }}
        >
          {/* Background image of document page */}
          {page.bgImage && (
            <img 
              src={page.bgImage} 
              alt={`Page background ${page.pageNumber}`}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-0 opacity-100"
            />
          )}

          {/* HTML5 drawing layer canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="absolute inset-0 w-full h-full z-10 bg-transparent"
          />



          {/* Interactive Absolute Elements Layers (Textboxes, Shapes, Stickers) */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            
            {/* Geometric Shapes */}
            {(activeLayer === 'all' || activeLayer === 'shapes') && page.shapes.map((shp) => (
              <div
                key={shp.id}
                onClick={(e) => {
                  if (isReadOnly) return;
                  e.stopPropagation();
                  setSelectedElementId(selectedElementId === shp.id ? null : shp.id);
                }}
                className={`absolute pointer-events-auto select-none p-1 transition ${isReadOnly ? 'cursor-default' : 'cursor-pointer'} ${selectedElementId === shp.id && !isReadOnly ? 'ring-2 ring-indigo-500 bg-indigo-50/20' : ''}`}
                style={{
                  left: shp.x,
                  top: shp.y,
                  width: shp.width,
                  height: shp.height,
                }}
              >
                {/* 2D shapes rendering with border/fill SVG — viewBox 0 0 100 100 so % coords are not needed */}
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {shp.type === 'rectangle' && (
                    <rect x="1" y="1" width="98" height="98" stroke={shp.borderColor} strokeWidth={shp.borderSize} fill={shp.fillColor || 'transparent'} />
                  )}
                  {shp.type === 'square' && (
                    <rect x="1" y="1" width="98" height="98" stroke={shp.borderColor} strokeWidth={shp.borderSize} fill={shp.fillColor || 'transparent'} />
                  )}
                  {shp.type === 'circle' && (
                    <ellipse cx="50" cy="50" rx="48" ry="48" stroke={shp.borderColor} strokeWidth={shp.borderSize} fill={shp.fillColor || 'transparent'} />
                  )}
                  {shp.type === 'triangle' && (
                    <polygon points="50,5 95,95 5,95" stroke={shp.borderColor} strokeWidth={shp.borderSize} fill={shp.fillColor || 'transparent'} />
                  )}
                  {shp.type === 'arrow' && (
                    <g stroke={shp.borderColor} strokeWidth={shp.borderSize} fill={shp.borderColor}>
                      <line x1="5" y1="50" x2="75" y2="50" />
                      <polygon points="75,30 95,50 75,70" />
                    </g>
                  )}
                  {shp.type === 'line' && (
                    <line x1="10" y1="90" x2="90" y2="10" stroke={shp.borderColor} strokeWidth={shp.borderSize} />
                  )}
                  {shp.type === 'star' && (
                    <polygon points="50,5 61,38 95,38 68,59 78,92 50,72 22,92 32,59 5,38 39,38" stroke={shp.borderColor} strokeWidth={shp.borderSize} fill={shp.fillColor || 'transparent'} />
                  )}
                  {shp.type === 'cube' && (
                    <g stroke={shp.borderColor} strokeWidth={shp.borderSize} fill={shp.fillColor || 'transparent'}>
                      <rect x="10" y="30" width="60" height="40" />
                      <rect x="30" y="10" width="60" height="40" opacity="0.6" />
                      <line x1="10" y1="30" x2="30" y2="10" />
                      <line x1="70" y1="30" x2="90" y2="10" />
                      <line x1="10" y1="70" x2="30" y2="50" />
                      <line x1="70" y1="70" x2="90" y2="50" />
                    </g>
                  )}
                  {shp.type === 'cylinder' && (
                    <g stroke={shp.borderColor} strokeWidth={shp.borderSize} fill={shp.fillColor || 'transparent'}>
                      <ellipse cx="50" cy="15" rx="30" ry="10" />
                      <ellipse cx="50" cy="75" rx="30" ry="10" />
                      <line x1="20" y1="15" x2="20" y2="75" />
                      <line x1="80" y1="15" x2="80" y2="75" />
                    </g>
                  )}
                </svg>

                {shp.text && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-sans font-bold text-center px-1 text-slate-800 pointer-events-none">
                    {shp.text}
                  </span>
                )}

                {/* Move helpers/Delete */}
                {selectedElementId === shp.id && !isReadOnly && (
                  <div className="absolute -top-7 right-0 flex gap-1 z-30 bg-slate-900 text-white rounded-md px-1 py-0.5 shadow-md">
                    <button onClick={(e) => { e.stopPropagation(); updateElementPosition(shp.id, 'shapes', -10, 0); }} className="text-[10px] hover:text-emerald-400 px-1">←</button>
                    <button onClick={(e) => { e.stopPropagation(); updateElementPosition(shp.id, 'shapes', 10, 0); }} className="text-[10px] hover:text-emerald-400 px-1">→</button>
                    <button onClick={(e) => { e.stopPropagation(); updateElementPosition(shp.id, 'shapes', 0, -10); }} className="text-[10px] hover:text-emerald-400 px-1">↑</button>
                    <button onClick={(e) => { e.stopPropagation(); updateElementPosition(shp.id, 'shapes', 0, 10); }} className="text-[10px] hover:text-emerald-400 px-1">↓</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteElement(shp.id, 'shapes'); }} className="text-[9px] text-rose-400 ml-1 hover:underline">حذف</button>
                  </div>
                )}
              </div>
            ))}

             {/* Draggable print notes textboxes */}
             {(activeLayer === 'all' || activeLayer === 'textboxes') && page.textboxes.map((box) => (
               <div
                 key={box.id}
                 onClick={(e) => {
                   if (isReadOnly) return;
                   if (draggingBoxId) return;
                   e.stopPropagation();
                   setSelectedElementId(selectedElementId === box.id ? null : box.id);
                 }}
                 onDoubleClick={() => {
                   if (isReadOnly) return;
                   handleEditTextbox(box.id, box.text);
                 }}
                 className={`absolute pointer-events-auto bg-amber-50 border border-amber-200 shadow-sm rounded-xl transition duration-150 ${
                   isReadOnly ? 'cursor-default' : ''
                 } ${
                   selectedElementId === box.id && !isReadOnly ? 'ring-2 ring-indigo-500 z-30 shadow-indigo-100' : 'opacity-90 hover:opacity-100'
                 } ${draggingBoxId === box.id ? 'shadow-xl ring-2 ring-indigo-400 z-50 opacity-95' : ''}`}
                 style={{
                   left: box.x,
                   top: box.y,
                   width: box.width,
                   height: box.height,
                   color: box.color,
                   fontSize: box.fontSize * (isReadOnly ? readingTextZoom : 1.0),
                 }}
               >
                 {/* Drag handle bar — grab here to move the box freely */}
                 {!isReadOnly && (
                   <div
                     className="flex items-center justify-between px-2 py-0.5 bg-amber-100 border-b border-amber-200 rounded-t-xl cursor-grab active:cursor-grabbing select-none"
                     onMouseDown={(e) => {
                       e.stopPropagation();
                       e.preventDefault();
                       draggingBoxStartClient.current = { x: e.clientX, y: e.clientY };
                       draggingBoxStartPos.current = { x: box.x, y: box.y };
                       setDraggingBoxId(box.id);
                       setSelectedElementId(box.id);
                     }}
                     onTouchStart={(e) => {
                       if (e.touches.length === 0) return;
                       e.stopPropagation();
                       draggingBoxStartClient.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                       draggingBoxStartPos.current = { x: box.x, y: box.y };
                       setDraggingBoxId(box.id);
                       setSelectedElementId(box.id);
                     }}
                   >
                     <span className="text-[9px] text-amber-500 font-bold select-none">✦ اسحب للتحريك</span>
                     <div className="flex gap-0.5">
                       <span className="w-1 h-1 rounded-full bg-amber-300" />
                       <span className="w-1 h-1 rounded-full bg-amber-300" />
                       <span className="w-1 h-1 rounded-full bg-amber-300" />
                     </div>
                   </div>
                 )}

                 {/* Scrollable multi-line Arabic text content wrapper */}
                 <div className="w-full overflow-y-auto pr-1 text-slate-800 font-sansArabic scrollbar-none p-3" style={{ scrollbarWidth: 'none', height: isReadOnly ? '100%' : 'calc(100% - 22px)' }}>
                   <p 
                     className={`whitespace-pre-wrap text-right leading-relaxed select-text ${!box.text.trim() ? 'text-slate-400 italic font-medium' : ''}`} 
                     style={{ cursor: isReadOnly ? 'default' : 'text', fontSize: box.fontSize * (isReadOnly ? readingTextZoom : 1.0) }}
                   >
                     {box.text.trim() || "(مربع نص فارغ - اضغط مرتين للتعديل) 📝"}
                   </p>
                 </div>

                {/* Tactile drag-resize corner handle */}
                {selectedElementId === box.id && !isReadOnly && (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setResizingId(box.id);
                      setResizeStart({ x: e.clientX, y: e.clientY, w: box.width, h: box.height });
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      if (e.touches.length > 0) {
                        setResizingId(box.id);
                        setResizeStart({ x: e.touches[0].clientX, y: e.touches[0].clientY, w: box.width, h: box.height });
                      }
                    }}
                    className="absolute bottom-0.5 right-0.5 w-4.5 h-4.5 bg-indigo-600 rounded-tl-lg hover:bg-indigo-700 cursor-se-resize flex items-center justify-center z-40 pointer-events-auto shadow-md border-r border-b border-indigo-700"
                    title="اسحب الطرف لتصغير أو تكبير الحجم"
                  >
                    <span className="w-1.5 h-1.5 border-r border-b border-white rotate-45 block" />
                  </div>
                 )}

                {/* Draggable position + explicit button sizes adjustments */}
                {selectedElementId === box.id && !isReadOnly && (
                  <div className="absolute -top-9.5 right-0 flex items-center gap-1.5 z-30 bg-slate-900 border border-slate-700 text-white text-[10px] font-bold rounded-xl px-3 py-1.5 shadow-xl flex-row-reverse select-none">
                    
                    {/* Position arrows */}
                    <div className="flex items-center gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); updateElementPosition(box.id, 'textboxes', -15, 0); }} className="w-5 h-5 flex items-center justify-center hover:bg-slate-800 rounded text-amber-400 font-black">←</button>
                      <button onClick={(e) => { e.stopPropagation(); updateElementPosition(box.id, 'textboxes', 15, 0); }} className="w-5 h-5 flex items-center justify-center hover:bg-slate-800 rounded text-amber-400 font-black">→</button>
                      <button onClick={(e) => { e.stopPropagation(); updateElementPosition(box.id, 'textboxes', 0, -15); }} className="w-5 h-5 flex items-center justify-center hover:bg-slate-800 rounded text-amber-400 font-black">↑</button>
                      <button onClick={(e) => { e.stopPropagation(); updateElementPosition(box.id, 'textboxes', 0, 15); }} className="w-5 h-5 flex items-center justify-center hover:bg-slate-800 rounded text-amber-400 font-black">↓</button>
                    </div>

                    <div className="w-px h-3.5 bg-slate-700 mx-1" />

                    {/* Sizing buttons */}
                    <div className="flex items-center gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); updateElementSize(box.id, 'textboxes', -30, 0); }} title="تقليص العرض" className="px-1 py-0.5 hover:bg-slate-800 rounded text-sky-400 text-[9px]">عرض-</button>
                      <button onClick={(e) => { e.stopPropagation(); updateElementSize(box.id, 'textboxes', 30, 0); }} title="زيادة العرض" className="px-1 py-0.5 hover:bg-slate-800 rounded text-sky-400 text-[9px]">عرض+</button>
                      <button onClick={(e) => { e.stopPropagation(); updateElementSize(box.id, 'textboxes', 0, -20); }} title="تقليص الارتفاع" className="px-1 py-0.5 hover:bg-slate-800 rounded text-emerald-400 text-[9px]">طول-</button>
                      <button onClick={(e) => { e.stopPropagation(); updateElementSize(box.id, 'textboxes', 0, 20); }} title="زيادة الارتفاع" className="px-1 py-0.5 hover:bg-slate-800 rounded text-emerald-400 text-[9px]">طول+</button>
                    </div>

                    <div className="w-px h-3.5 bg-slate-700 mx-1" />

                    {/* General controls */}
                    <button onClick={(e) => { e.stopPropagation(); handleEditTextbox(box.id, box.text); }} className="text-indigo-300 hover:text-white hover:underline px-1">تعديل 📝</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteElement(box.id, 'textboxes'); }} className="text-red-400 hover:text-red-300 hover:underline px-1">حذف</button>
                  </div>
                )}
              </div>
            ))}

            {/* Stickers Layer */}
            {(activeLayer === 'all' || activeLayer === 'stickers') && page.stickers.map((st) => (
              <div
                key={st.id}
                onClick={(e) => {
                  if (isReadOnly) return;
                  e.stopPropagation();
                  setSelectedElementId(selectedElementId === st.id ? null : st.id);
                }}
                className={`absolute pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm text-xs font-bold leading-none transition select-none ${
                  isReadOnly ? 'cursor-default' : 'cursor-grab'
                } ${
                  st.type === 'important' ? 'bg-red-500 text-white' :
                  st.type === 'question' ? 'bg-amber-500 text-white' :
                  st.type === 'definition' ? 'bg-indigo-600 text-white' :
                  st.type === 'law' ? 'bg-sky-600 text-white' :
                  'bg-emerald-500 text-white'
                } ${selectedElementId === st.id && !isReadOnly ? 'ring-2 ring-offset-1 ring-slate-800 scale-110 z-30' : ''}`}
                style={{
                  left: st.x,
                  top: st.y,
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{st.text}</span>

                {selectedElementId === st.id && !isReadOnly && (
                  <div className="absolute -top-7 right-0 flex gap-0.5 bg-slate-900 text-white rounded px-1 py-0.5 text-[8px] border border-slate-700">
                    <button onClick={(e) => { e.stopPropagation(); updateElementPosition(st.id, 'stickers', -10, 0); }} className="px-1 hover:text-emerald-400">←</button>
                    <button onClick={(e) => { e.stopPropagation(); updateElementPosition(st.id, 'stickers', 10, 0); }} className="px-1 hover:text-emerald-400">→</button>
                    <button onClick={(e) => { e.stopPropagation(); updateElementPosition(st.id, 'stickers', 0, -10); }} className="px-1 hover:text-emerald-400">↑</button>
                    <button onClick={(e) => { e.stopPropagation(); updateElementPosition(st.id, 'stickers', 0, 10); }} className="px-1 hover:text-emerald-400">↓</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteElement(st.id, 'stickers'); }} className="text-rose-400 px-1 ml-1">حذف</button>
                  </div>
                )}
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* Layer selector bar bottom */}
      <div className={`flex items-center justify-between px-4 py-2 bg-slate-100 border-t border-slate-200 text-xs ${isCanvasFolded ? 'hidden' : ''}`}>
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium text-slate-600">طبقات التعديل الناشطة:</span>
          {['all', 'drawings', 'shapes', 'textboxes', 'stickers'].map((layer) => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer as any)}
              className={`px-2 py-0.5 rounded-md transition ${activeLayer === layer ? 'bg-slate-800 text-white font-semibold' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              {layer === 'all' ? 'جميع الطبقات' :
               layer === 'drawings' ? 'الكتابة اليدوية' :
               layer === 'shapes' ? 'الأشكال' :
               layer === 'textboxes' ? 'مربعات النصوص' : 'الملصقات'}
            </button>
          ))}
        </div>
        <div className="text-slate-400 text-[10px]">
          إجمالي ضربات الفرشاة: {page.strokes.length} | الأشكال: {page.shapes.length} | المصلقات: {page.stickers.length}
        </div>
      </div>

      {/* 4. Elegant Custom Modal Overlay for Textbox Content (Always-visible Save/OK actions) */}
      {editingTextboxId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col text-right animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-indigo-600 px-6 py-4.5 text-white flex items-center justify-between flex-row-reverse">
              <button 
                onClick={() => setEditingTextboxId(null)} 
                className="w-8 h-8 rounded-full bg-indigo-700/50 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center transition-all"
              >
                ✕
              </button>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm font-sansArabic">تعديل ومراجعة محتوى المربع النصي 📝</span>
              </div>
            </div>

            {/* Scrollable body with custom text editing field */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[50vh] space-y-4">
              <label className="block text-xs font-black text-slate-500 mb-1 flex items-center gap-1.5 justify-end">
                <span>اكتب أو الصق نص المحاضرة في المربع أدناه (يدعم النصوص الطويلة جداً):</span>
              </label>
              
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                className="w-full h-44 p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none leading-relaxed text-slate-800 font-sansArabic text-right resize-none"
                placeholder="أدخل النص هنا..."
              />
              
              <div className="text-[10px] text-slate-400 text-right font-medium">
                عدد الحروف الحالية: <span className="font-bold text-indigo-600">{editingText.length}</span> حرف | سيتم حفظ النص وتنسيقه تلقائياً داخل الدفتر.
              </div>
            </div>

            {/* Sticky Action Footer (Immutable, screen-fit " موافق ") */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-start gap-2 flex-row-reverse">
              <button
                onClick={() => {
                  onUpdatePage({
                    textboxes: page.textboxes.map(t => t.id === editingTextboxId ? { ...t, text: editingText } : t)
                  });
                  setEditingTextboxId(null);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all duration-150 active:scale-95 cursor-pointer"
              >
                حفظ التعديلات (موافق)
              </button>
              <button
                onClick={() => setEditingTextboxId(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
