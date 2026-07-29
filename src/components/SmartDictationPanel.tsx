import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Trash2, Sparkles, Loader2, ChevronDown, ChevronUp,
  ClipboardList, Download, FileText, Check, Save, Copy,
  Clock, BookOpen, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { arabicMathToLatex } from '../utils/mathUtils';

// ── Web Speech API type declarations ─────────────────────────────
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

// ══════════════════════════════════════════════════════════════════
// الأنواع والواجهات
// ══════════════════════════════════════════════════════════════════

interface DictationEntry {
  id: string;
  raw: string;
  enhanced: string;
  timestamp: number;
}

interface SmartDictationPanelProps {
  isActive: boolean;
  onClose: () => void;
  /** دالة تُستدعى عند إضافة إدخال جديد — تمرر النص المحسَّن + اللون للسبورة */
  onEntryEnhanced?: (text: string, raw: string, color: string) => void;
}

const STORAGE_KEY = 'smart-board-dictation-entries';
const MAX_ENTRIES = 100;

// ── أيقونة الميكروفون المتحركة ──────────────────────────────────
function MicButton({ isListening, onClick }: { isListening: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${
        isListening
          ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/40 scale-110'
          : 'bg-gradient-to-br from-teal-500 to-emerald-500 shadow-md hover:shadow-lg hover:scale-105'
      }`}
      title={isListening ? 'إيقاف الاستماع' : 'بدء الاستماع'}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
      )}
      {isListening
        ? <Mic className="w-5 h-5 text-white relative z-10" />
        : <MicOff className="w-5 h-5 text-white relative z-10" />
      }
    </motion.button>
  );
}

// ── موجة صوت متحركة (عند التسجيل) ────────────────────────────────
function Waveform({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;
  return (
    <div className="flex items-center gap-[2px] h-4" dir="ltr">
      {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-red-400"
          animate={{
            height: isActive ? [h * 2, h * 5, h * 2] : [h * 2],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.08,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ── قائمة التصدير المنبثقة ──────────────────────────────────────
interface ExportMenuProps {
  entries: DictationEntry[];
  onClose: () => void;
}

function ExportMenu({ entries, onClose }: ExportMenuProps) {
  const [copied, setCopied] = useState(false);

  const fullText = entries
    .map((e, i) => `[${i + 1}] ${e.enhanced.replace(/\$/g, '')}${e.raw !== e.enhanced.replace(/\$/g, '') ? `\n    → ${e.raw}` : ''}`)
    .join('\n\n');

  const markdownText = `# 📝 ملاحظات السبورة الذكية\n${new Date().toLocaleDateString('ar-SA')}\n\n---\n\n${entries
    .map((e, i) => `### 📌 ملاحظة ${i + 1}\n${e.enhanced.replace(/\$/g, '')}\n${e.raw !== e.enhanced.replace(/\$/g, '') ? `\n> ${e.raw}` : ''}\n${new Date(e.timestamp).toLocaleTimeString('ar-SA')}\n`)
    .join('\n---\n')}\n\n---\n*تم التصدير من Smart Notebook*`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 1200);
    } catch {
      alert('تعذر النسخ للحافظة');
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ملاحظات_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const downloadMarkdown = () => {
    const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ملاحظات_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      className="absolute bottom-full left-2 mb-2 z-30 rounded-xl overflow-hidden shadow-2xl border border-white/20 min-w-[180px]"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.97)' }}
    >
      <div className="p-1.5">
        <p className="text-[10px] font-bold text-slate-400 px-3 py-1.5">تصدير الملاحظات</p>

        <button onClick={copyToClipboard}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition">
          {copied
            ? <Check className="w-4 h-4 text-green-500" />
            : <Copy className="w-4 h-4 text-slate-400" />
          }
          <span>{copied ? 'تم النسخ ✓' : 'نسخ للحافظة'}</span>
        </button>

        <button onClick={downloadTxt}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition">
          <FileText className="w-4 h-4 text-blue-400" />
          <span>تحميل كـ TXT</span>
        </button>

        <button onClick={downloadMarkdown}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition">
          <FileText className="w-4 h-4 text-purple-400" />
          <span>تحميل كـ Markdown</span>
        </button>

        {entries.length > 0 && (
          <p className="text-[10px] text-center text-slate-400 mt-2 pb-1">
            {entries.length} ملاحظة • {fullText.length} حرف
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════
// دالة كشف نوع النص — تُحدد اللون حسب المحتوى
// ══════════════════════════════════════════════════════════════════

const TEXT_COLORS = {
  law: '#dc2626',     // أحمر — قوانين، قواعد، نظريات
  definition: '#2563eb', // أزرق — تعاريف
  example: '#16a34a',  // أخضر — أمثلة
  question: '#7c3aed', // بنفسجي — أسئلة
  formula: '#ea580c',  // برتقالي — صيغ رياضية
  normal: '#1e293b',   // داكن — نص عادي
};

interface TextTypeResult {
  color: string;
  label: string;
  icon: string;
}

function detectTextType(text: string): string {
  const t = text.trim();

  // قوانين / قواعد / نظريات
  if (/^(قانون|قاعدة|نظرية|مبدأ|مسلمة|خاصية|الخاصية)/.test(t) ||
      /قانون|نظرية /.test(t)) {
    return TEXT_COLORS.law;
  }

  // تعاريف
  if (/^(تعريف|عرف|هو\s+|هي\s+|يعني|تعني|يقصد|عبارة عن)/.test(t) ||
      /يعرف|تعرف|هو\s+ذلك|يقصد به/.test(t)) {
    return TEXT_COLORS.definition;
  }

  // أمثلة
  if (/^(مثال|مثلاً|على سبيل المثال|من الأمثلة|من أمثلة)/.test(t) ||
      /^(مثل|منها|من بينها|نذكر)/.test(t)) {
    return TEXT_COLORS.example;
  }

  // أسئلة
  if (/^(سؤال|لماذا|كيف|ما هو|ما هي|اذكر|عرف|أوجد|احسب|أثبت|برهن|أكمل|اختر|قارن|علل|ماذا|هل|متى|أين)/.test(t)) {
    return TEXT_COLORS.question;
  }

  // صيغ رياضية (تحتوي على رموز LaTeX أو عمليات)
  if (/\\int|\\sum|\\frac|\\sqrt|=/.test(t)) {
    return TEXT_COLORS.formula;
  }

  return TEXT_COLORS.normal;
}

function getTextTypeLabel(color: string): string {
  const map: Record<string, string> = {
    [TEXT_COLORS.law]: 'قانون',
    [TEXT_COLORS.definition]: 'تعريف',
    [TEXT_COLORS.example]: 'مثال',
    [TEXT_COLORS.question]: 'سؤال',
    [TEXT_COLORS.formula]: 'صيغة',
    [TEXT_COLORS.normal]: 'نص',
  };
  return map[color] || 'نص';
}

// ══════════════════════════════════════════════════════════════════
// المكون الرئيسي — لوحة عائمة في الأسفل
// ══════════════════════════════════════════════════════════════════
export default function SmartDictationPanel({
  isActive,
  onClose,
  onEntryEnhanced,
}: SmartDictationPanelProps) {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [entries, setEntries] = useState<DictationEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);
  const entriesEndRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // ── استرجاع المحفوظ من localStorage ──────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DictationEntry[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEntries(parsed);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // ── حفظ إلى localStorage ──────────────────────────────────────
  useEffect(() => {
    if (entries.length > 0) {
      try {
        const toSave = entries.slice(-MAX_ENTRIES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch { /* quota exceeded */ }
    }
  }, [entries]);

  // ── التمرير التلقائي ──────────────────────────────────────────
  useEffect(() => {
    if (isExpanded && entriesEndRef.current) {
      entriesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries, isExpanded]);

  // ── إغلاق قائمة التصدير عند الضغط خارجها ──────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    };
    if (showExport) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showExport]);

  // ── Web Speech API ────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert('المتصفح لا يدعم التعرف الصوتي. استخدم Chrome أو Edge.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let lastProcessedIndex = 0;
    let pendingFinalText = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let newFinal = '';

      for (let i = lastProcessedIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          newFinal += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (event.results.length > lastProcessedIndex) {
        lastProcessedIndex = event.results.length;
      }

      const displayText = newFinal || interim;
      if (displayText.trim()) {
        setLiveTranscript(displayText);
      }

      if (newFinal.trim()) {
        pendingFinalText = newFinal.trim();

        if (transcriptTimeoutRef.current) {
          clearTimeout(transcriptTimeoutRef.current);
        }

        transcriptTimeoutRef.current = setTimeout(() => {
          if (pendingFinalText) {
            addEntry(pendingFinalText);
            pendingFinalText = '';
            setLiveTranscript('');
          }
        }, 800);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('يرجى السماح بالوصول إلى الميكروفون.');
      }
      setIsListening(false);
      isListeningRef.current = false;
    };

    // نستخدم ref بدلاً من state لتجنب stale closure
    // isListening في الـ closure يكون false دائماً
    recognition.onend = () => {
      if (isListeningRef.current) {
        try { recognition.start(); } catch (e) { /* */ }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setIsListening(true);
      setLiveTranscript('جاري الاستماع...');
    } catch (e) {
      console.warn('Failed to start recognition:', e);
    }
  }, []); // ← dependency array أصبح [] لأننا نستخدم ref

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setLiveTranscript('');

    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
      transcriptTimeoutRef.current = null;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (liveTranscript.trim() && liveTranscript !== 'جاري الاستماع...') {
        addEntry(liveTranscript.trim());
      }
      stopListening();
    } else {
      startListening();
    }
  };

  // ── إضافة إدخال ──────────────────────────────────────────────
  const addEntry = (text: string) => {
    const mathText = renderMathText(text);
    const cleanText = mathText.replace(/\$/g, '');
    const textColor = detectTextType(text);
    setEntries(prev => [...prev, {
      id: `dict-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      raw: text,
      enhanced: mathText,
      timestamp: Date.now(),
    }]);
    setLiveTranscript('');
    // إعلام السبورة بإضافة النص الجديد مع اللون المحدد
    onEntryEnhanced?.(cleanText, text, textColor);
  };

  const clearAll = () => {
    setEntries([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  // ── AI تحسين النص ────────────────────────────────────────────
  const enhanceWithAI = async () => {
    if (entries.length === 0) return;
    setIsProcessing(true);
    const fullText = entries.map(e => e.raw).join('\n');
    try {
      const response = await fetch('/api/ai/dictate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText, context: 'تحسين كتابة محاضرة علمية' }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.enhanced) {
          const lines = data.enhanced.split('\n').filter((l: string) => l.trim());
          setEntries(prev => prev.map((entry, idx) => ({
            ...entry,
            enhanced: renderMathText(lines[idx] || entry.raw),
          })));
        }
      }
    } catch (e) {
      console.log('AI not available');
    }
    setIsProcessing(false);
  };

  if (!isActive) return null;

  // ═══════════════════════════════════════════════════════════════
  // واجهة المستخدم — لوحة عائمة في الأسفل
  // ═══════════════════════════════════════════════════════════════
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto"
      dir="rtl"
    >
      {/* ── السجل المنبثق (يظهر عند التوسيع) ── */}
      <AnimatePresence>
        {isExpanded && entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="mx-2 mb-1 max-h-56 overflow-y-auto rounded-2xl p-3 space-y-2 border border-white/20 shadow-xl"
            style={{
              backdropFilter: 'blur(16px)',
              backgroundColor: 'rgba(255,255,255,0.92)',
            }}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                جميع الملاحظات ({entries.length})
              </span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            <AnimatePresence>
              {[...entries].reverse().map((entry, idx) => {
                const actualIdx = entries.length - 1 - idx;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group relative rounded-xl p-3 transition-all hover:shadow-md cursor-default"
                    style={{
                      backgroundColor: actualIdx % 2 === 0
                        ? 'rgba(20,184,166,0.06)'
                        : 'rgba(99,102,241,0.06)',
                      borderRight: `3px solid ${actualIdx % 2 === 0 ? '#14b8a6' : '#6366f1'}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* شارة اللون حسب نوع النص */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: detectTextType(entry.raw) }} />
                          <span className="text-[9px] font-bold"
                            style={{ color: detectTextType(entry.raw) }}>
                            {getTextTypeLabel(detectTextType(entry.raw))}
                          </span>
                        </div>
                        <div className="text-sm leading-relaxed font-medium text-slate-800" dir="rtl">
                          {entry.enhanced.includes('$')
                            ? entry.enhanced.replace(/\$/g, '')
                            : entry.enhanced
                          }
                        </div>
                        {entry.raw !== entry.enhanced.replace(/\$/g, '') && (
                          <p className="text-[10px] mt-1 text-slate-400 line-clamp-1" dir="rtl">
                            {entry.raw}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(entry.timestamp).toLocaleTimeString('ar-SA', {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          <span className="text-[9px] text-slate-300">•</span>
                          <span className="text-[9px] text-slate-400">
                            #{actualIdx + 1}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={entriesEndRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── شريط التحكم الرئيسي ── */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-2 px-3 py-2.5 border-t border-white/20 shadow-2xl"
        style={{
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255,255,255,0.95)',
        }}
      >
        {/* زر الميكروفون الرئيسي */}
        <MicButton isListening={isListening} onClick={toggleListening} />

        {/* حالة الاستماع + النص الحي */}
        <div className="flex-1 min-w-0">
          {isListening && (
            <div className="flex items-center gap-2 mb-0.5">
              <Waveform isActive={isListening} />
              <span className="text-[10px] font-bold text-red-500">تحدث الآن...</span>
            </div>
          )}
          {liveTranscript && liveTranscript !== 'جاري الاستماع...' && (
            <motion.p
              key={liveTranscript}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-slate-700 truncate font-medium" dir="rtl"
            >
              {liveTranscript}
            </motion.p>
          )}
          {!isListening && !liveTranscript && (
            <p className="text-xs text-slate-400">اضغط الميكروفون وابدأ بالتحدث</p>
          )}
        </div>

        {/* أزرار الأدوات */}
        <div className="flex items-center gap-1">
          {/* عدد الإدخالات + توسيع */}
          {entries.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition"
            >
              <span className="bg-gradient-to-br from-teal-400 to-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] shadow-sm">
                {entries.length}
              </span>
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </motion.button>
          )}

          {/* تصدير */}
          {entries.length > 0 && (
            <div ref={exportRef} className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExport(!showExport)}
                className="p-1.5 rounded-lg hover:bg-blue-50 transition"
                title="تصدير الملاحظات"
              >
                <Download className="w-4 h-4 text-blue-500" />
              </motion.button>
              <AnimatePresence>
                {showExport && (
                  <ExportMenu entries={entries} onClose={() => setShowExport(false)} />
                )}
              </AnimatePresence>
            </div>
          )}

          {/* تحسين AI */}
          {entries.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={enhanceWithAI}
              disabled={isProcessing}
              className="p-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-40 transition"
              title="تحسين بالذكاء الاصطناعي"
            >
              {isProcessing
                ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                : <Sparkles className="w-4 h-4 text-indigo-500" />
              }
            </motion.button>
          )}

          {/* حفظ */}
          {entries.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
                const btn = document.activeElement;
                if (btn) (btn as HTMLElement).blur();
              }}
              className="p-1.5 rounded-lg hover:bg-amber-50 transition"
              title="حفظ الملاحظات"
            >
              <Save className="w-4 h-4 text-amber-500" />
            </motion.button>
          )}

          {/* مسح الكل */}
          {entries.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearAll}
              className="p-1.5 rounded-lg hover:bg-red-50 transition"
              title="مسح الكل"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </motion.button>
          )}

          {/* فاصل */}
          <div className="w-px h-6 bg-slate-200 mx-1" />

          {/* إغلاق */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { stopListening(); onClose(); }}
            className="p-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-xs transition"
            title="إغلاق الإملاء"
          >
            ✕
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ── تحويل النص لعرض LaTeX ──────────────────────────────────────
function renderMathText(text: string): string {
  if (!text) return '';
  const withLatex = arabicMathToLatex(text);
  let result = withLatex;

  const mathPatterns = [
    /\\int/g, /\\sum/g, /\\frac/g, /\\sqrt/g,
    /\\sin/g, /\\cos/g, /\\tan/g, /\\lim/g,
    /\\log/g, /\\ln/g, /\\infty/g, /\\alpha/g,
    /\\beta/g, /\\gamma/g, /\\Delta/g, /\\theta/g,
    /\\pi/g, /\\lambda/g, /\\sigma/g, /\\vec/g,
  ];

  const hasMath = mathPatterns.some(p => p.test(result));

  if (hasMath && !result.includes('$')) {
    result = `$${result}$`;
  }

  return result;
}
