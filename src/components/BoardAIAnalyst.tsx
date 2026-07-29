import React, { useState, useCallback, useMemo } from 'react';
import { Sparkles, X, CircuitBoard, BarChart3, Waves, Binary, Trash2, PaintBucket, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseGraphicsRequest, getGraphicsCommandsList } from './SmartBoardGraphics';

interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

interface GraphicsCommand {
  type: 'circuit' | 'graph' | 'force' | 'wave' | 'mechanical' | 'field' | 'beam';
  params: Record<string, unknown>;
}

interface DetectedCommand {
  command: GraphicsCommand;
  sourceText: string;
  label: string;
  icon: React.ReactNode;
}

interface AnalysisResult {
  drawCommands: DetectedCommand[];
  questions: string[];
  summary: string;
}

interface BoardAIAnalystProps {
  texts: TextItem[];
  onExecuteDraw: (command: GraphicsCommand) => void;
  boardRef: React.RefObject<HTMLDivElement | null>;
  isDark?: boolean;
}

// Generate a title/summary from the analyzed texts
function analyzeBoard(texts: TextItem[]): AnalysisResult {
  const allText = texts.map(t => t.text).join(' ');
  
  const drawCommands: DetectedCommand[] = [];
  const questions: string[] = [];
  
  // Check each text line individually for drawing commands
  texts.forEach(t => {
    const cmd = parseGraphicsRequest(t.text);
    if (cmd) {
      const icons: Record<string, React.ReactNode> = {
        circuit: <CircuitBoard className="w-4 h-4" />,
        graph: <BarChart3 className="w-4 h-4" />,
        wave: <Waves className="w-4 h-4" />,
        force: <Binary className="w-4 h-4" />,
        mechanical: <PaintBucket className="w-4 h-4" />,
        field: <Binary className="w-4 h-4" />,
        beam: <Waves className="w-4 h-4" />,
      };
      
      const labels: Record<string, string> = {
        circuit: 'دائرة كهربائية',
        graph: 'رسم بياني',
        wave: 'موجة / تموج',
        force: 'مخطط قوى',
        mechanical: 'رسم ميكانيكي',
        field: 'مجال / حقل',
        beam: 'شعاع / حزمة',
      };
      
      drawCommands.push({
        command: cmd,
        sourceText: t.text,
        label: labels[cmd.type] || cmd.type,
        icon: icons[cmd.type] || <CircuitBoard className="w-4 h-4" />,
      });
    }
    
    // Detect questions
    if (t.text.includes('؟') || t.text.includes('?') || t.text.startsWith('هل') || t.text.startsWith('ما') || t.text.startsWith('كيف')) {
      questions.push(t.text);
    }
  });
  
  // Generate summary
  let summary = '';
  if (drawCommands.length > 0) {
    summary += `تم اكتشاف ${drawCommands.length} أمر رسم: ${drawCommands.map(d => d.label).join('، ')}. `;
  }
  if (questions.length > 0) {
    summary += `و ${questions.length} سؤال. `;
  }
  if (drawCommands.length === 0 && questions.length === 0) {
    summary = 'لم يتم اكتشاف أوامر رسم أو أسئلة. جرّب كتابة "ارسم دائرة كهربائية" أو "ما معنى التكامل؟"';
  }
  
  return { drawCommands, questions, summary };
}

export default function BoardAIAnalyst({
  texts,
  onExecuteDraw,
  boardRef,
  isDark = true,
}: BoardAIAnalystProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [executedIds, setExecutedIds] = useState<Set<number>>(new Set());

  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    // Simulate a brief analysis delay for UX
    setTimeout(() => {
      const analysis = analyzeBoard(texts);
      setResult(analysis);
      setIsAnalyzing(false);
      setIsOpen(true);
    }, 300);
  }, [texts]);

  const handleDrawCommand = useCallback((cmd: GraphicsCommand, index: number) => {
    onExecuteDraw(cmd);
    setExecutedIds(prev => new Set(prev).add(index));
  }, [onExecuteDraw]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const hasTexts = texts.length > 0;
  const darkBg = isDark ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white/90 border-slate-200/80';
  const darkText = isDark ? 'text-slate-200' : 'text-slate-700';
  const darkMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <>
      {/* ═══ الزر الطافي — يظهر في أسفل يمين الشاشة ═══ */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
        onClick={handleAnalyze}
        disabled={!hasTexts || isAnalyzing}
        title="تحليل نصوص السبورة بالذكاء الاصطناعي"
        className={`absolute bottom-4 right-4 z-40 p-3.5 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 ${
          !hasTexts || isAnalyzing
            ? 'opacity-40 cursor-not-allowed bg-slate-600'
            : isOpen
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-500/40'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/40 animate-pulse-glow'
        }`}
      >
        {isAnalyzing ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5" />
        )}
      </motion.button>

      {/* ═══ لوحة التحليل — تظهر فوق الزر ═══ */}
      <AnimatePresence>
        {isOpen && result && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`absolute bottom-20 right-4 left-4 z-40 ${darkBg} backdrop-blur-xl rounded-2xl border shadow-2xl max-h-[60vh] overflow-y-auto`}
            style={{ maxWidth: 420 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-inherit/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className={`text-xs font-bold ${darkText}`}>المساعد الذكي</span>
                <span className={`text-[9px] ${darkMuted}`}>AI</span>
              </div>
              <button
                onClick={handleClose}
                className={`p-1 rounded-lg transition hover:bg-slate-600/50 ${darkText}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* الملخص */}
              <p className={`text-[11px] leading-relaxed ${darkMuted} text-right`}>
                {result.summary}
              </p>

              {/* أوامر الرسم */}
              {result.drawCommands.length > 0 && (
                <div className="space-y-2">
                  <h4 className={`text-[10px] font-bold ${darkText} flex items-center gap-1.5`}>
                    <PaintBucket className="w-3 h-3 text-amber-400" />
                    أوامر الرسم المكتشفة
                  </h4>
                  {result.drawCommands.map((dc, i) => (
                    <div key={i}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                        executedIds.has(i)
                          ? isDark ? 'bg-emerald-900/30 border-emerald-700/40' : 'bg-emerald-50 border-emerald-200'
                          : isDark ? 'bg-slate-700/40 border-slate-600/40' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isDark ? 'bg-slate-600/50' : 'bg-slate-200'
                        }`}>
                          <span className={`${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{dc.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <div className={`text-[11px] font-bold ${darkText} truncate`}>{dc.label}</div>
                          <div className={`text-[9px] ${darkMuted} truncate max-w-[120px]`}>{dc.sourceText}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDrawCommand(dc.command, i)}
                        disabled={executedIds.has(i)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition shrink-0 ${
                          executedIds.has(i)
                            ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:scale-105 active:scale-95'
                        }`}
                      >
                        {executedIds.has(i) ? '✓ رُسم' : '🎨 ارسم'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* الأسئلة */}
              {result.questions.length > 0 && (
                <div className="space-y-2">
                  <h4 className={`text-[10px] font-bold ${darkText} flex items-center gap-1.5`}>
                    <Lightbulb className="w-3 h-3 text-amber-400" />
                    أسئلة من الشرح
                  </h4>
                  {result.questions.map((q, i) => (
                    <div key={i}
                      className={`p-2.5 rounded-xl border ${
                        isDark ? 'bg-slate-700/40 border-slate-600/40' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      <p className={`text-[11px] ${darkText} text-right`}>{q}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* تلميحات */}
              {result.drawCommands.length === 0 && result.questions.length === 0 && (
                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-700/40 border-slate-600/40' : 'bg-slate-100 border-slate-200'
                }`}>
                  <p className={`text-[10px] ${darkMuted} text-right leading-relaxed`}>
                    💡 جرّب كتابة أوامر مثل:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['ارسم دائرة كهربائية', 'ارسم رسم بياني', 'مخطط قوى', 'موجة جيبية'].map((hint, i) => (
                      <span key={i} className={`text-[9px] px-2 py-0.5 rounded-full ${
                        isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
                      }`}>{hint}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`px-4 py-2 border-t border-inherit/50 flex items-center justify-between`}>
              <span className={`text-[8px] ${darkMuted}`}>{texts.length} نص • تحليل محلي</span>
              <button
                onClick={handleAnalyze}
                className={`text-[9px] font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'} hover:underline`}
              >
                ⟳ إعادة التحليل
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
