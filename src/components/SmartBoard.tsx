import React, { useState, useRef, useEffect } from 'react';
import { 
  Pencil, Eraser, Trash2, Download, Undo, Redo, 
  Type, Square, Circle, Triangle, Minus, ArrowRight,
  Palette, Sun, Moon, Save, Image, Play, Pause
} from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'eraser';
}

interface TextItem {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

interface SmartBoardProps {
  isDarkMode?: boolean;
  onSave?: (dataUrl: string) => void;
  lectureTitle?: string;
}

export default function SmartBoard({ isDarkMode = true, onSave, lectureTitle = 'السبورة الذكية' }: SmartBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [color, setColor] = useState(isDarkMode ? '#ffffff' : '#1e293b');
  const [lineWidth, setLineWidth] = useState(3);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [history, setHistory] = useState<DrawingPath[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  const colors = [
    '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#1e293b'
  ];
  
  const lineWidths = [2, 4, 6, 8, 12];
  
  useEffect(() => {
    redrawCanvas();
  }, [paths, texts, isDarkMode]);
  
  useEffect(() => {
    if (paths.length > 0) {
      const newHistory = [...history.slice(0, historyIndex + 1), paths];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [paths]);
  
  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };
  
  const getEventPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };
  
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (selectedText) {
      setSelectedText(null);
      return;
    }
    setIsDrawing(true);
    const point = getEventPos(e);
    setCurrentPath([point]);
  };
  
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const point = getEventPos(e);
    setCurrentPath(prev => [...prev, point]);
    
    const ctx = getCanvasContext();
    if (!ctx) return;
    
    redrawCanvas();
    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? (isDarkMode ? '#1e293b' : '#f1f5f9') : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = tool === 'highlighter' ? 0.5 : 1;
    
    if (currentPath.length > 0) {
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }
  };
  
  const stopDrawing = () => {
    if (isDrawing && currentPath.length > 0) {
      setPaths(prev => [...prev, {
        id: Date.now().toString(),
        points: currentPath,
        color: tool === 'eraser' ? (isDarkMode ? '#1e293b' : '#f1f5f9') : color,
        width: tool === 'eraser' ? lineWidth * 3 : lineWidth,
        tool
      }]);
    }
    setIsDrawing(false);
    setCurrentPath([]);
  };
  
  const redrawCanvas = () => {
    const ctx = getCanvasContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    
    // Clear canvas
    ctx.fillStyle = isDarkMode ? '#1e293b' : '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid if light mode
    if (!isDarkMode) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
    }
    
    // Draw paths
    paths.forEach(path => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = path.tool === 'highlighter' ? 0.5 : 1;
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    });
    
    // Draw texts
    ctx.globalAlpha = 1;
    texts.forEach(text => {
      ctx.fillStyle = text.color;
      ctx.font = `${text.fontSize}px Arial`;
      ctx.fillText(text.text, text.x, text.y);
    });
  };
  
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPaths(history[newIndex]);
    }
  };
  
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPaths(history[newIndex]);
    }
  };
  
  const clearBoard = () => {
    setPaths([]);
    setTexts([]);
    setHistory([[]]);
    setHistoryIndex(0);
  };
  
  const addText = () => {
    const text = prompt('اكتب النص:');
    if (text) {
      setTexts(prev => [...prev, {
        id: Date.now().toString(),
        x: 100,
        y: 100,
        text,
        color,
        fontSize: lineWidth * 4
      }]);
    }
  };
  
  const saveBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    if (onSave) onSave(dataUrl);
    
    // Download image
    const link = document.createElement('a');
    link.download = `board_${lectureTitle}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };
  
  const startRecording = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      // For demo, we'll just save the image
      saveBoard();
      setIsRecording(true);
      setTimeout(() => setIsRecording(false), 2000);
    } catch (err) {
      console.error('Recording error:', err);
    }
  };
  
  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-3 border-b ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-amber-400 to-orange-400'}`}>
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{lectureTitle}</h3>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>السبورة الذكية التفاعلية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startRecording}
            className={`p-2 rounded-lg transition ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'} text-white`}
            title="تسجيل السبورة"
          >
            {isRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={saveBoard}
            className={`p-2 rounded-lg transition ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-green-400' : 'bg-slate-200 hover:bg-slate-300 text-green-600'}`}
            title="حفظ الصورة"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className={`p-2 rounded-lg transition ${historyIndex <= 0 ? 'opacity-50 cursor-not-allowed' : isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-blue-400' : 'bg-slate-200 hover:bg-slate-300 text-blue-600'}`}
            title="تراجع"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className={`p-2 rounded-lg transition ${historyIndex >= history.length - 1 ? 'opacity-50 cursor-not-allowed' : isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-blue-400' : 'bg-slate-200 hover:bg-slate-300 text-blue-600'}`}
            title="إعادة"
          >
            <Redo className="w-4 h-4" />
          </button>
          <button
            onClick={clearBoard}
            className={`p-2 rounded-lg transition ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-red-400' : 'bg-slate-200 hover:bg-slate-300 text-red-600'}`}
            title="مسح الكل"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Tools Bar */}
      <div className={`flex items-center gap-4 p-2 border-b overflow-x-auto ${isDarkMode ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'}`}>
        {/* Drawing Tools */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition ${tool === 'pen' ? 'bg-teal-600 text-white' : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
            title="قلم"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('highlighter')}
            className={`p-2 rounded-lg transition ${tool === 'highlighter' ? 'bg-yellow-500 text-white' : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
            title="قلم مضيء"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition ${tool === 'eraser' ? 'bg-rose-600 text-white' : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
            title="ممحاة"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>
        
        <div className={`w-px h-8 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
        
        {/* Colors */}
        <div className="flex items-center gap-1">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        
        <div className={`w-px h-8 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
        
        {/* Line Width */}
        <div className="flex items-center gap-1">
          {lineWidths.map(w => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${lineWidth === w ? 'bg-teal-600' : isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}
            >
              <div 
                className="rounded-full bg-white" 
                style={{ width: w * 2, height: w * 2 }}
              />
            </button>
          ))}
        </div>
        
        <div className={`w-px h-8 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
        
        {/* Add Text */}
        <button
          onClick={addText}
          className={`p-2 rounded-lg transition ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}`}
          title="إضافة نص"
        >
          <Type className="w-4 h-4" />
        </button>
      </div>
      
      {/* Canvas */}
      <div className="flex-1 p-4 overflow-auto">
        <div className={`relative rounded-xl overflow-hidden shadow-xl border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            className="w-full touch-none"
            style={{ maxHeight: 'calc(100vh - 250px)' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>
      
      {/* Info Bar */}
      <div className={`text-center py-2 text-xs ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-400'}`}>
        💡 اسحب للتخطيط، استخدم الأدوات للأعلى، يمكنك إضافة نص وتسجيل السبورة
      </div>
    </div>
  );
}
