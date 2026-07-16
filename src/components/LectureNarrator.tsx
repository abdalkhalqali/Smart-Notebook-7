import React, { useEffect, useRef, useState, useCallback } from 'react';
import MathText from './MathText';
import { resolveApiUrl } from '../utils/apiBase';

// ────────────────────────────────────────────────────────────────
// شارح المحاضرات التفاعلي — يقرأ نصاً كاملاً بصوت طبيعي، "يكتب" الجزء
// الذي يقرأه الآن على السبورة (برموز رياضية حقيقية عبر KaTeX)، ويستمع
// لأسئلة الطالب في أي لحظة ليردّ عليها ثم يستكمل القراءة من حيث توقف.
// يدعم أيضاً رفع ملف (PDF/Word/PPT/صورة...) ثم اختيار موضوع للشرح المفصّل.
// ────────────────────────────────────────────────────────────────

type Status = 'idle' | 'preparing' | 'connecting' | 'narrating' | 'listening' | 'answering' | 'paused' | 'done' | 'error';
type InputMode = 'paste' | 'upload';
type UploadStep = 'select' | 'extracting' | 'ask_topic' | 'generating' | 'ready';

interface QAItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  ts: number;
}

const VOICES: { id: string; label: string }[] = [
  { id: 'Charon', label: '🎓 صوت رجالي هادئ (Charon)' },
  { id: 'Kore', label: '👩‍🏫 صوت نسائي واضح (Kore)' },
  { id: 'Puck', label: '⚡ صوت حيوي نشيط (Puck)' },
  { id: 'Aoede', label: '🌙 صوت نسائي دافئ (Aoede)' },
  { id: 'Fenrir', label: '💪 صوت رجالي قوي (Fenrir)' },
  { id: 'Zephyr', label: '🍃 صوت خفيف لطيف (Zephyr)' },
];

const ACCEPTED_FILE_TYPES =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,' +
  '.txt,.md,.csv,.html,.htm,' +
  'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/tiff';

function float32ToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function pcm16Base64ToFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const int16 = new Int16Array(buf.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
  return float32;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data-URL prefix ("data:...;base64,")
      const b64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface LectureNarratorProps {
  onClose: () => void;
  initialText?: string;
}

export default function LectureNarrator({ onClose, initialText = '' }: LectureNarratorProps) {
  // ── Session state ──────────────────────────────────────────────
  const [status, setStatus] = useState<Status>('idle');
  const [lectureText, setLectureText] = useState(initialText);
  const [voice, setVoice] = useState('Charon');
  const [errorMsg, setErrorMsg] = useState('');
  const [qa, setQa] = useState<QAItem[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [currentChunkText, setCurrentChunkText] = useState('');
  const [askMode, setAskMode] = useState(false);

  // ── Input-mode state ───────────────────────────────────────────
  const [inputMode, setInputMode] = useState<InputMode>('paste');
  const [uploadStep, setUploadStep] = useState<UploadStep>('select');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedDocText, setExtractedDocText] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');

  // ── Audio/WS refs ──────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const boardEndRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<Status>('idle');
  statusRef.current = status;

  useEffect(() => {
    boardEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChunkText, qa]);

  // ── Audio helpers ──────────────────────────────────────────────
  const hardStopAudio = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try { src.onended = null; src.stop(); } catch (_) {}
    }
    activeSourcesRef.current = [];
    if (audioCtxRef.current) playTimeRef.current = audioCtxRef.current.currentTime;
  }, []);

  const playAudioChunk = useCallback((base64: string) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const float32 = pcm16Base64ToFloat32(base64);
    const sampleRate = 24000;
    const buf = ctx.createBuffer(1, float32.length, sampleRate);
    buf.copyToChannel(float32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, playTimeRef.current);
    src.start(startAt);
    playTimeRef.current = startAt + buf.duration;
    activeSourcesRef.current.push(src);
    src.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== src);
    };
  }, []);

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const ctx = audioCtxRef.current!;
      const src = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(256, 1, 1);
      scriptProcRef.current = proc;
      src.connect(proc);
      proc.connect(ctx.destination);
      proc.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (statusRef.current === 'paused') return;
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = float32ToInt16(float32);
        const b64 = arrayBufferToBase64(int16.buffer);
        wsRef.current.send(JSON.stringify({ type: 'audio', data: b64 }));
      };
    } catch {
      setErrorMsg('لا يمكن الوصول للميكروفون — تحقق من الأذونات. يمكنك المتابعة بدون طرح أسئلة صوتية.');
    }
  };

  const stopMicrophone = () => {
    scriptProcRef.current?.disconnect();
    scriptProcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  // ── Get AI headers (same key the sidebar saves) ──────────────
  const getAiHeaders = (): Record<string, string> => {
    const key = (localStorage.getItem('customAiKey') || '').trim();
    const provider = localStorage.getItem('aiProvider') || 'gemini';
    if (!key) return {};
    const h: Record<string, string> = { 'x-custom-api-key': key, 'x-custom-provider': provider };
    if (provider === 'custom') {
      const url = (localStorage.getItem('customEndpointUrl') || '').trim();
      if (url) h['x-custom-endpoint-url'] = url;
    }
    return h;
  };

  // ── File upload flow ───────────────────────────────────────────
  const handleFileSelected = async (file: File) => {
    setUploadedFile(file);
    setErrorMsg('');
    setUploadStatusMsg(`جاري استخراج النص من "${file.name}"…`);
    setUploadStep('extracting');
    try {
      const fileData = await fileToBase64(file);
      const res = await fetch(resolveApiUrl('/api/ai/lecture-extract-file'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAiHeaders() },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileData }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل الاستخراج');
      setExtractedDocText(data.text);
      setUploadStatusMsg('');
      setUploadStep('ask_topic');
    } catch (err: any) {
      setErrorMsg(`فشل استخراج النص: ${err.message || err}`);
      setUploadStep('select');
    }
  };

  const handleGenerateExplanation = async () => {
    if (!topicInput.trim()) {
      setErrorMsg('يرجى إدخال الموضوع أولاً.');
      return;
    }
    setErrorMsg('');
    setUploadStatusMsg('جاري توليد شرح مفصّل بالذكاء الاصطناعي… قد يستغرق دقيقة.');
    setUploadStep('generating');
    try {
      const res = await fetch(resolveApiUrl('/api/ai/lecture-explain-topic'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAiHeaders() },
        body: JSON.stringify({ documentText: extractedDocText, topic: topicInput.trim(), lang: 'ar' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل توليد الشرح');
      setLectureText(data.explanation);
      setUploadStatusMsg('');
      setUploadStep('ready');
    } catch (err: any) {
      setErrorMsg(`فشل توليد الشرح: ${err.message || err}`);
      setUploadStep('ask_topic');
    }
  };

  // ── Start narration session ───────────────────────────────────
  const start = useCallback(async () => {
    if (!lectureText.trim()) {
      setErrorMsg('يرجى تحضير نص المحاضرة أولاً.');
      return;
    }
    setErrorMsg('');
    setQa([]);
    setChunkIndex(0);
    setTotalChunks(0);
    setCurrentChunkText('');
    setAskMode(false);
    setStatus('preparing');

    let preparedText = lectureText;
    try {
      const resp = await fetch(resolveApiUrl('/api/ai/lecture-prep'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: lectureText }),
      });
      const data = await resp.json();
      if (data?.success && data?.processedText) preparedText = data.processedText;
    } catch (_) {}

    setStatus('connecting');
    const storedProvider = localStorage.getItem('aiProvider') || 'gemini';
    const customKey = storedProvider === 'gemini' ? (localStorage.getItem('customAiKey') || '') : '';
    const params = new URLSearchParams({ key: customKey, lang: 'ar', mode: 'lecture', voice });
    audioCtxRef.current = new AudioContext({ sampleRate: 16000 });
    playTimeRef.current = audioCtxRef.current.currentTime;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/voice-chat?${params}`);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === 'ready') {
          startMicrophone();
          ws.send(JSON.stringify({ type: 'start_lecture', text: preparedText }));
        } else if (msg.type === 'lecture_started') {
          setTotalChunks(msg.total || 0);
          setStatus('narrating');
        } else if (msg.type === 'lecture_progress') {
          setChunkIndex(msg.index);
          setCurrentChunkText(msg.text);
          setAskMode(false);
          setStatus('narrating');
        } else if (msg.type === 'audio') {
          setStatus((s) => (s === 'paused' ? s : (s === 'listening' || s === 'answering' ? 'answering' : 'narrating')));
          playAudioChunk(msg.data);
        } else if (msg.type === 'transcript') {
          setQa((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === msg.role) {
              return [...prev.slice(0, -1), { ...last, text: last.text + msg.text }];
            }
            return [...prev, { id: Date.now().toString() + Math.random(), role: msg.role, text: msg.text, ts: Date.now() }];
          });
        } else if (msg.type === 'interrupted') {
          hardStopAudio();
          setStatus('listening');
        } else if (msg.type === 'turn_complete') {
          // server will either send the next lecture_progress or stay paused
        } else if (msg.type === 'lecture_complete') {
          setStatus('done');
        } else if (msg.type === 'error') {
          setErrorMsg(msg.message === 'no_api_key' ? 'لم يتم إدخال مفتاح Gemini API.' : (msg.message || 'حدث خطأ.'));
          setStatus('error');
        }
      } catch (_) {}
    };

    ws.onerror = () => { setErrorMsg('تعذّر الاتصال بالخادم.'); setStatus('error'); };
    ws.onclose = () => { stopMicrophone(); };
  }, [lectureText, voice, playAudioChunk, hardStopAudio]);

  const stop = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'stop_lecture' }));
    wsRef.current?.close();
    wsRef.current = null;
    stopMicrophone();
    hardStopAudio();
    setAskMode(false);
    setStatus('idle');
  }, [hardStopAudio]);

  const askNow = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    hardStopAudio();
    setAskMode(true);
    setStatus('listening');
    wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
  }, [hardStopAudio]);

  const togglePause = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (status === 'paused') {
      wsRef.current.send(JSON.stringify({ type: 'resume_lecture' }));
      setStatus('narrating');
    } else {
      hardStopAudio();
      wsRef.current.send(JSON.stringify({ type: 'pause_lecture' }));
      setStatus('paused');
    }
  }, [status, hardStopAudio]);

  useEffect(() => () => { wsRef.current?.close(); stopMicrophone(); }, []);

  const statusLabel: Record<Status, string> = {
    idle: 'جاهز للبدء',
    preparing: 'جاري تحضير النص والرموز الرياضية…',
    connecting: 'جاري الاتصال…',
    narrating: '📖 يشرح المحاضرة الآن…',
    listening: '🎙 يستمع لسؤالك الآن…',
    answering: '💬 يرد على سؤالك…',
    paused: '⏸ متوقف مؤقتاً',
    done: '✅ انتهى شرح المحاضرة',
    error: 'خطأ',
  };

  const inSession = !['idle', 'error'].includes(status);

  // ── Upload-mode panel ─────────────────────────────────────────
  const renderUploadPanel = () => (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-300">{errorMsg}</div>
      )}

      {uploadStep === 'select' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            ارفع ملف من أي نوع (PDF، Word، PowerPoint، Excel، صورة، نص…)، سيستخرج الذكاء الاصطناعي محتواه، ثم تختار الموضوع الذي تريد شرحه بالتفصيل.
          </p>
          <label className="flex flex-col items-center justify-center gap-3 w-full h-36 border-2 border-dashed border-white/15 rounded-2xl cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition">
            <span className="text-3xl">📂</span>
            <span className="text-xs text-slate-400">اضغط لاختيار ملف أو اسحبه هنا</span>
            <span className="text-[10px] text-slate-600">PDF • Word • PPT • Excel • صور • نصوص</span>
            <input
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }}
            />
          </label>
        </div>
      )}

      {uploadStep === 'extracting' && (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 text-center">{uploadStatusMsg}</p>
        </div>
      )}

      {uploadStep === 'ask_topic' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
            <span className="text-lg">✅</span>
            <div>
              <p className="text-xs font-bold text-emerald-300">تم استخراج محتوى الملف بنجاح</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{uploadedFile?.name} — {extractedDocText.length.toLocaleString()} حرف</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300 font-bold block">ما الموضوع الذي تريد شرحه؟</label>
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateExplanation(); }}
              placeholder="مثال: قانون نيوتن الثاني، الدوال التفاضلية، التمثيل الغذائي…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-amber-500"
            />
            <p className="text-[10px] text-slate-600">سيولّد الذكاء الاصطناعي شرحاً أكاديمياً مفصّلاً لهذا الموضوع استناداً لمحتوى الملف.</p>
          </div>
          <button
            onClick={handleGenerateExplanation}
            disabled={!topicInput.trim()}
            className="w-full py-2.5 rounded-2xl font-black text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white shadow-lg transition"
          >
            🧠 ولّد الشرح المفصّل
          </button>
          <button
            onClick={() => { setUploadStep('select'); setUploadedFile(null); setExtractedDocText(''); setTopicInput(''); }}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition"
          >
            ← اختر ملفاً مختلفاً
          </button>
        </div>
      )}

      {uploadStep === 'generating' && (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 text-center">{uploadStatusMsg}</p>
        </div>
      )}

      {uploadStep === 'ready' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-violet-500/10 border border-violet-500/25 rounded-xl">
            <span className="text-lg">🎓</span>
            <div>
              <p className="text-xs font-bold text-violet-300">تم توليد الشرح المفصّل — جاهز للشرح الصوتي</p>
              <p className="text-[10px] text-slate-400 mt-0.5">موضوع: {topicInput} · {lectureText.length.toLocaleString()} حرف</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-36 overflow-y-auto">
            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-6">{lectureText.slice(0, 600)}{lectureText.length > 600 ? '…' : ''}</p>
          </div>
          <button
            onClick={start}
            className="w-full py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg transition"
          >
            🎓 ابدأ الشرح الصوتي للمحاضرة
          </button>
          <button
            onClick={() => { setUploadStep('ask_topic'); }}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition"
          >
            ← اختر موضوعاً مختلفاً
          </button>
        </div>
      )}

      {/* Voice selection — always shown in upload mode while not ready/generating */}
      {(uploadStep === 'select' || uploadStep === 'ask_topic' || uploadStep === 'ready') && (
        <div className="space-y-1.5 border-t border-white/5 pt-3">
          <label className="text-[11px] text-slate-400 font-bold block">نبرة صوت المعلم</label>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id} className="bg-slate-900">{v.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  // ── Paste-mode panel ──────────────────────────────────────────
  const renderPastePanel = () => (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-300">{errorMsg}</div>
      )}
      <div>
        <label className="text-[11px] text-slate-400 font-bold block mb-1.5">نص المحاضرة الكامل</label>
        <textarea
          value={lectureText}
          onChange={(e) => setLectureText(e.target.value)}
          placeholder="ألصق هنا نص المحاضرة الكامل الذي تريد أن يشرحه المعلم الافتراضي بصوته… (يمكن أن يحتوي على معادلات رياضية، سيتم رسمها بشكل صحيح على السبورة)"
          className="w-full h-52 p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 resize-none outline-none focus:ring-1 focus:ring-amber-500"
        />
        <div className="text-[10px] text-slate-500 mt-1">{lectureText.length} حرف</div>
      </div>
      <div>
        <label className="text-[11px] text-slate-400 font-bold block mb-1.5">اختر نبرة صوت المعلم</label>
        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
        >
          {VOICES.map((v) => (
            <option key={v.id} value={v.id} className="bg-slate-900">{v.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-slate-600 mt-1.5">
          ⚠️ هذه أصوات AI جاهزة — استنساخ الصوت الشخصي يتطلب خدمة منفصلة غير مفعّلة بعد.
        </p>
      </div>
      <button
        onClick={start}
        className="w-full py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg transition"
      >
        🎓 ابدأ شرح المحاضرة
      </button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-[560px] bg-gradient-to-b from-[#05080f] via-[#080d1a] to-[#030608] text-white" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <span className="text-xs font-black text-amber-200">شارح المحاضرات التفاعلي</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition text-sm">✕</button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {!inSession ? (
          <>
            {/* Input-mode toggle */}
            <div className="shrink-0 flex mx-5 mt-4 gap-1 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => { setInputMode('paste'); setErrorMsg(''); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${inputMode === 'paste' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                📋 لصق النص
              </button>
              <button
                onClick={() => { setInputMode('upload'); setErrorMsg(''); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${inputMode === 'upload' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                📁 رفع ملف
              </button>
            </div>

            {inputMode === 'paste' ? renderPastePanel() : renderUploadPanel()}
          </>
        ) : (
          <>
            {/* Status bar */}
            <div className="shrink-0 px-5 py-2 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'narrating' ? 'bg-amber-400 animate-pulse' :
                  status === 'listening' ? 'bg-blue-400 animate-pulse' :
                  status === 'answering' ? 'bg-purple-400 animate-pulse' :
                  status === 'paused' ? 'bg-slate-400' : 'bg-emerald-400'}`} />
                <span className="text-[11px] font-bold text-slate-300">{statusLabel[status]}</span>
              </div>
              {totalChunks > 0 && (
                <span className="text-[10px] text-slate-500">جزء {chunkIndex + 1} / {totalChunks}</span>
              )}
            </div>

            {/* السبورة + الأسئلة */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="bg-white/5 border border-amber-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2 text-amber-300">
                  <span>🖊️</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide">السبورة — الجزء الذي يُشرح الآن</span>
                </div>
                {currentChunkText ? (
                  <MathText text={currentChunkText} className="text-sm leading-relaxed text-slate-200" dir="rtl" />
                ) : (
                  <p className="text-sm text-slate-500">...</p>
                )}
              </div>

              {qa.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">أسئلتك وردود المعلم</span>
                  {qa.map((item) => (
                    <div key={item.id} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                        item.role === 'user'
                          ? 'bg-blue-600/30 border border-blue-500/30 text-blue-100 rounded-tr-sm'
                          : 'bg-purple-600/20 border border-purple-500/20 text-purple-100 rounded-tl-sm'
                      }`}>
                        <MathText text={item.text} dir="rtl" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={boardEndRef} />
            </div>

            {/* Controls */}
            <div className="shrink-0 px-5 py-3 border-t border-white/5 space-y-2">
              <p className="text-[10px] text-slate-500 text-center">
                {askMode
                  ? '🎙 تحدّث الآن، هو يستمع لك حصرياً ولن يقرأ حتى تنتهي.'
                  : status === 'done'
                    ? 'انتهى الشرح — يمكنك طرح أسئلة إضافية أو الإنهاء.'
                    : 'يمكنك مقاطعته بصوتك مباشرة، أو استخدام زر "اسأل الآن" لقطع فوري بلا أي تداخل.'}
              </p>
              <div className="flex items-center justify-center gap-2.5">
                <button
                  onClick={askNow}
                  disabled={status === 'listening' || status === 'paused'}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                    status === 'listening'
                      ? 'bg-blue-600/60 text-white cursor-default'
                      : 'bg-blue-600/25 border border-blue-500/40 text-blue-200 hover:bg-blue-600/40'
                  } disabled:opacity-60`}
                >
                  🎙 اسأل الآن
                </button>
                <button
                  onClick={togglePause}
                  disabled={status === 'listening' || status === 'answering' || status === 'done'}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-200 hover:bg-white/10 transition text-xs font-bold disabled:opacity-40"
                >
                  {status === 'paused' ? '▶ استكمال' : '⏸ إيقاف مؤقت'}
                </button>
                <button
                  onClick={stop}
                  className="px-4 py-2.5 rounded-xl bg-red-600/30 border border-red-500/50 text-red-300 hover:bg-red-600/50 transition text-xs font-bold"
                >
                  إنهاء
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
