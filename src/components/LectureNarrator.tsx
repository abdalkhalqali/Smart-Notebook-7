import React, { useEffect, useRef, useState, useCallback } from 'react';

// ────────────────────────────────────────────────────────────────
// قارئ المحاضرات التفاعلي — يقرأ نصاً كاملاً بصوت طبيعي، "يكتب" الجزء
// الذي يقرأه الآن على السبورة، ويستمع لأسئلة الطالب في أي لحظة ليردّ
// عليها ثم يستكمل القراءة من حيث توقف. مجاني بالكامل (Gemini API فقط).
// ────────────────────────────────────────────────────────────────

type Status = 'idle' | 'connecting' | 'narrating' | 'listening' | 'answering' | 'done' | 'error';

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

interface LectureNarratorProps {
  onClose: () => void;
  initialText?: string;
}

export default function LectureNarrator({ onClose, initialText = '' }: LectureNarratorProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [lectureText, setLectureText] = useState(initialText);
  const [voice, setVoice] = useState('Charon');
  const [errorMsg, setErrorMsg] = useState('');
  const [qa, setQa] = useState<QAItem[]>([]);
  const [chunks, setChunks] = useState<string[]>([]);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [currentChunkText, setCurrentChunkText] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playTimeRef = useRef<number>(0);
  const boardEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boardEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChunkText, qa]);

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
  }, []);

  const stopPlayback = useCallback(() => {
    if (!audioCtxRef.current) return;
    playTimeRef.current = audioCtxRef.current.currentTime;
  }, []);

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const ctx = audioCtxRef.current!;
      const src = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(512, 1, 1);
      scriptProcRef.current = proc;
      src.connect(proc);
      proc.connect(ctx.destination);
      proc.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
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

  const start = useCallback(async () => {
    if (!lectureText.trim()) {
      setErrorMsg('يرجى لصق نص المحاضرة أولاً.');
      return;
    }
    setStatus('connecting');
    setErrorMsg('');
    setQa([]);
    setChunkIndex(0);
    setCurrentChunkText('');

    const customKey = localStorage.getItem('geminiApiKey') || localStorage.getItem('ai_api_key') || '';
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
          ws.send(JSON.stringify({ type: 'start_lecture', text: lectureText }));
        } else if (msg.type === 'lecture_started') {
          setChunks((prev) => prev); // no-op, total comes via progress
          setStatus('narrating');
        } else if (msg.type === 'lecture_progress') {
          setChunkIndex(msg.index);
          setCurrentChunkText(msg.text);
          setStatus('narrating');
        } else if (msg.type === 'audio') {
          setStatus((s) => (s === 'listening' || s === 'narrating' || s === 'answering' ? (s === 'listening' ? 'answering' : 'narrating') : s));
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
          stopPlayback();
          setStatus('listening');
        } else if (msg.type === 'turn_complete') {
          // will either continue lecture_progress or stay idle briefly between chunks
        } else if (msg.type === 'lecture_complete') {
          setStatus('done');
        } else if (msg.type === 'error') {
          setErrorMsg(msg.message === 'no_api_key' ? 'لم يتم إدخال مفتاح Gemini API.' : (msg.message || 'حدث خطأ.'));
          setStatus('error');
        }
      } catch (_) {}
    };

    ws.onerror = () => {
      setErrorMsg('تعذّر الاتصال بالخادم.');
      setStatus('error');
    };
    ws.onclose = () => {
      stopMicrophone();
    };
  }, [lectureText, voice, playAudioChunk, stopPlayback]);

  const stop = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'stop_lecture' }));
    wsRef.current?.close();
    wsRef.current = null;
    stopMicrophone();
    stopPlayback();
    setStatus('idle');
  }, [stopPlayback]);

  useEffect(() => () => { wsRef.current?.close(); stopMicrophone(); }, []);

  const isActive = status === 'narrating' || status === 'listening' || status === 'answering' || status === 'connecting';

  const statusLabel: Record<Status, string> = {
    idle: 'جاهز للبدء',
    connecting: 'جاري الاتصال…',
    narrating: '📖 يشرح المحاضرة الآن…',
    listening: '🎙 يستمع لسؤالك…',
    answering: '💬 يرد على سؤالك…',
    done: '✅ انتهى شرح المحاضرة',
    error: 'خطأ',
  };

  return (
    <div className="flex flex-col h-full min-h-[560px] bg-gradient-to-b from-[#05080f] via-[#080d1a] to-[#030608] text-white" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <span className="text-xs font-black text-amber-200">قارئ المحاضرات التفاعلي</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition text-sm">✕</button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {status === 'idle' || status === 'error' ? (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-300">{errorMsg}</div>
            )}
            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1.5">نص المحاضرة الكامل</label>
              <textarea
                value={lectureText}
                onChange={(e) => setLectureText(e.target.value)}
                placeholder="ألصق هنا نص المحاضرة الكامل الذي تريد أن يشرحه لك المعلم الافتراضي بصوته..."
                className="w-full h-56 p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 resize-none outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="text-[10px] text-slate-500 mt-1">{lectureText.length} حرف</div>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1.5">اختر نبرة صوت المعلم (أصوات جاهزة مجانية)</label>
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
                ⚠️ هذه أصوات AI جاهزة وليست استنساخاً لصوتك الشخصي — استنساخ الصوت الحقيقي يتطلب خدمة مدفوعة منفصلة غير مفعّلة بعد.
              </p>
            </div>
            <button
              onClick={start}
              className="w-full py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg transition"
            >
              🎓 ابدأ شرح المحاضرة
            </button>
          </div>
        ) : (
          <>
            {/* Status bar */}
            <div className="shrink-0 px-5 py-2 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status === 'narrating' ? 'bg-amber-400 animate-pulse' : status === 'listening' ? 'bg-blue-400 animate-pulse' : status === 'answering' ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="text-[11px] font-bold text-slate-300">{statusLabel[status]}</span>
              </div>
              {chunks.length > 0 && (
                <span className="text-[10px] text-slate-500">جزء {chunkIndex + 1}</span>
              )}
            </div>

            {/* الواجهة: السبورة + الأسئلة */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* السبورة — النص الذي يُقرأ الآن */}
              <div className="bg-white/5 border border-amber-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2 text-amber-300">
                  <span>🖊️</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide">السبورة — الجزء الذي يُشرح الآن</span>
                </div>
                <p dir="auto" className="text-sm leading-relaxed text-slate-200">
                  {currentChunkText || '...'}
                </p>
              </div>

              {/* أسئلة وأجوبة */}
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
                        <p dir="auto">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={boardEndRef} />
            </div>

            {/* Controls */}
            <div className="shrink-0 px-5 py-3 border-t border-white/5 flex items-center justify-center gap-3">
              <p className="text-[10px] text-slate-500 flex-1">
                {status === 'done' ? 'انتهى الشرح — يمكنك طرح أسئلة إضافية أو الإنهاء.' : '💡 يمكنك مقاطعته بسؤال في أي وقت أثناء الشرح، وسيتوقف ليجيبك ثم يستكمل تلقائياً.'}
              </p>
              <button
                onClick={stop}
                className="px-4 py-2 rounded-xl bg-red-600/30 border border-red-500/50 text-red-300 hover:bg-red-600/50 transition text-xs font-bold"
              >
                إنهاء
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
