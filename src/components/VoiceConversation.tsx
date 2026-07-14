import React, { useEffect, useRef, useState, useCallback } from 'react';

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────
type Status = 'idle' | 'connecting' | 'ready' | 'listening' | 'ai_speaking' | 'error';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  ts: number;
}

// ────────────────────────────────────────────────────────────────
// AUDIO HELPERS
// ────────────────────────────────────────────────────────────────
/** Convert Float32 PCM → Int16 PCM */
function float32ToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Convert Int16 PCM base64 → Float32 array */
function pcm16Base64ToFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const int16 = new Int16Array(buf.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
  return float32;
}

/** ArrayBuffer → base64 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ────────────────────────────────────────────────────────────────
// ANIMATED ORB COMPONENT
// ────────────────────────────────────────────────────────────────
function VoiceOrb({ status, volume }: { status: Status; volume: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;

    function draw() {
      tRef.current += 0.025;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      const colors: Record<Status, string[]> = {
        idle:        ['#1e293b', '#334155', '#475569'],
        connecting:  ['#1e3a5f', '#1d4ed8', '#3b82f6'],
        ready:       ['#0f2a0f', '#166534', '#22c55e'],
        listening:   ['#0c1a3a', '#1d4ed8', '#60a5fa'],
        ai_speaking: ['#1a0a2e', '#6d28d9', '#a78bfa'],
        error:       ['#2a0a0a', '#7f1d1d', '#ef4444'],
      };
      const [c0, c1, c2] = colors[status];

      // Outer glow rings
      const nRings = status === 'ai_speaking' ? 5 : status === 'listening' ? 4 : 3;
      for (let i = nRings; i > 0; i--) {
        const pulse = status === 'ai_speaking'
          ? Math.sin(t * 4 + i * 0.8) * 0.18 + (volume * 0.25)
          : status === 'listening'
          ? Math.sin(t * 3 + i * 0.6) * 0.12 + (volume * 0.3)
          : Math.sin(t * 1.2 + i * 0.5) * 0.06;
        const r = (95 + i * 18) * (1 + pulse);
        const alpha = (0.08 - i * 0.012) + (status === 'ai_speaking' ? volume * 0.08 : 0);
        const grad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
        grad.addColorStop(0, c2 + Math.round(alpha * 255).toString(16).padStart(2, '0'));
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      }

      // Main orb
      const orbScale = status === 'ai_speaking'
        ? 1 + Math.sin(t * 6) * 0.04 + volume * 0.12
        : status === 'listening'
        ? 1 + Math.sin(t * 4) * 0.03 + volume * 0.15
        : 1 + Math.sin(t * 1.5) * 0.02;
      const orbR = 88 * orbScale;

      const orbGrad = ctx.createRadialGradient(cx - 20, cy - 20, 0, cx, cy, orbR);
      orbGrad.addColorStop(0, '#ffffff22');
      orbGrad.addColorStop(0.3, c2 + 'cc');
      orbGrad.addColorStop(0.7, c1 + 'ee');
      orbGrad.addColorStop(1, c0);
      ctx.fillStyle = orbGrad;
      ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2); ctx.fill();

      // Swirling lines (AI speaking)
      if (status === 'ai_speaking' || status === 'listening') {
        const nLines = 6;
        for (let i = 0; i < nLines; i++) {
          const ang = t * 1.5 + (i / nLines) * Math.PI * 2;
          const len = 28 + Math.sin(t * 5 + i * 1.1) * 12 * (1 + volume);
          const x1 = cx + Math.cos(ang) * (orbR * 0.55);
          const y1 = cy + Math.sin(ang) * (orbR * 0.55);
          const x2 = cx + Math.cos(ang) * (orbR * 0.55 + len);
          const y2 = cy + Math.sin(ang) * (orbR * 0.55 + len);
          ctx.save();
          ctx.strokeStyle = c2 + '99'; ctx.lineWidth = 2.5;
          ctx.shadowColor = c2; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.restore();
        }
      }

      // Inner shimmer
      const shimGrad = ctx.createRadialGradient(cx - 28, cy - 28, 0, cx, cy, orbR * 0.65);
      shimGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
      shimGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shimGrad;
      ctx.beginPath(); ctx.arc(cx, cy, orbR * 0.65, 0, Math.PI * 2); ctx.fill();

      // Waveform bars (listening / speaking)
      if (status === 'listening' || status === 'ai_speaking') {
        const nBars = 24;
        for (let i = 0; i < nBars; i++) {
          const ang = (i / nBars) * Math.PI * 2 - Math.PI / 2;
          const wave = Math.sin(t * 8 + i * 0.6) * 0.5 + 0.5;
          const barLen = (6 + wave * 22 * (0.4 + volume * 0.8));
          const x1 = cx + Math.cos(ang) * (orbR + 6);
          const y1 = cy + Math.sin(ang) * (orbR + 6);
          const x2 = cx + Math.cos(ang) * (orbR + 6 + barLen);
          const y2 = cy + Math.sin(ang) * (orbR + 6 + barLen);
          ctx.save();
          ctx.strokeStyle = c2; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
          ctx.shadowColor = c2; ctx.shadowBlur = 8;
          ctx.globalAlpha = 0.65 + wave * 0.35;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.restore();
        }
      }

      // Status text in center
      const labels: Record<Status, string> = {
        idle: '✦',
        connecting: '◌',
        ready: '✓',
        listening: '◉',
        ai_speaking: '♪',
        error: '✕',
      };
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `bold ${status === 'idle' ? 28 : 32}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = c2; ctx.shadowBlur = 20;
      ctx.fillText(labels[status], cx, cy);
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, volume]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      style={{ width: 260, height: 260 }}
    />
  );
}

// ────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────
interface VoiceConversationProps {
  onClose: () => void;
}

export default function VoiceConversation({ onClose }: VoiceConversationProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [volume, setVolume] = useState(0);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [subject, setSubject] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const playTimeRef = useRef<number>(0);
  const volTimerRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMutedRef = useRef(false);

  isMutedRef.current = isMuted;

  // Auto-scroll transcript
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Volume meter
  useEffect(() => {
    function measureVolume() {
      if (analyserRef.current && (status === 'listening')) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        setVolume(avg / 128);
      } else if (status !== 'ai_speaking') {
        setVolume(0);
      }
      volTimerRef.current = requestAnimationFrame(measureVolume);
    }
    volTimerRef.current = requestAnimationFrame(measureVolume);
    return () => cancelAnimationFrame(volTimerRef.current);
  }, [status]);

  // ── Playback queue for AI audio ──────────────────────────────
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

    // Volume animation while AI speaks
    const peak = Math.max(...float32.map(Math.abs));
    setVolume(Math.min(peak * 2, 1));
  }, []);

  // ── Stop all audio playback (interrupt) ──────────────────────
  const stopPlayback = useCallback(() => {
    if (!audioCtxRef.current) return;
    // Reset the AudioContext to kill all scheduled sources
    playTimeRef.current = audioCtxRef.current.currentTime;
    setVolume(0);
  }, []);

  // ── Connect to backend WebSocket ─────────────────────────────
  const connect = useCallback(async () => {
    setStatus('connecting');
    setErrorMsg('');
    setMessages([]);

    // Get API key from localStorage (same key the sidebar "مفتاح الذكاء الاصطناعي" field saves to).
    // Voice chat runs on Gemini Live specifically, so only use the stored key when the
    // selected provider is Gemini — a key from another provider (OpenRouter/HF/custom) won't work here.
    const storedProvider = localStorage.getItem('aiProvider') || 'gemini';
    const customKey = storedProvider === 'gemini' ? (localStorage.getItem('customAiKey') || '') : '';
    const params = new URLSearchParams({
      key: customKey,
      lang: language,
      subject,
    });

    // Create AudioContext
    audioCtxRef.current = new AudioContext({ sampleRate: 16000 });
    playTimeRef.current = audioCtxRef.current.currentTime;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/voice-chat?${params}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {/* wait for "ready" message */};

    ws.onmessage = async (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);

        if (msg.type === 'ready') {
          setStatus('ready');
          startMicrophone();

        } else if (msg.type === 'audio') {
          setStatus(s => s === 'ai_speaking' || s === 'ready' ? 'ai_speaking' : s);
          playAudioChunk(msg.data);

        } else if (msg.type === 'transcript') {
          setMessages(prev => {
            // Append to last message of same role or create new
            const last = prev[prev.length - 1];
            if (last && last.role === msg.role) {
              return [...prev.slice(0, -1), { ...last, text: last.text + msg.text }];
            }
            return [...prev, { id: Date.now().toString(), role: msg.role, text: msg.text, ts: Date.now() }];
          });

        } else if (msg.type === 'turn_complete') {
          setStatus('listening');
          setVolume(0);

        } else if (msg.type === 'interrupted') {
          stopPlayback();
          setStatus('listening');

        } else if (msg.type === 'error') {
          if (msg.message === 'no_api_key') {
            setErrorMsg('لم يتم إدخال مفتاح Gemini API. يرجى إضافته في الإعدادات.');
          } else {
            setErrorMsg(msg.message || 'حدث خطأ في الاتصال');
          }
          setStatus('error');
        }
      } catch (_) {}
    };

    ws.onerror = () => {
      setErrorMsg('تعذّر الاتصال بالخادم. تأكد من تشغيل التطبيق.');
      setStatus('error');
    };

    ws.onclose = () => {
      if (status !== 'idle') setStatus('idle');
      stopMicrophone();
    };
  }, [language, subject, playAudioChunk, stopPlayback]);

  // ── Microphone capture → PCM16 @ 16kHz ──────────────────────
  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const ctx = audioCtxRef.current!;
      const src = ctx.createMediaStreamSource(stream);

      // Analyser for volume
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      src.connect(analyser);

      // ScriptProcessor for PCM data (512 samples ≈ 32ms chunks)
      const proc = ctx.createScriptProcessor(512, 1, 1);
      scriptProcRef.current = proc;
      analyser.connect(proc);
      proc.connect(ctx.destination);

      proc.onaudioprocess = (e) => {
        if (isMutedRef.current) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = float32ToInt16(float32);
        const b64 = arrayBufferToBase64(int16.buffer);
        wsRef.current.send(JSON.stringify({ type: 'audio', data: b64 }));
      };

      setStatus('listening');
    } catch (e: any) {
      setErrorMsg('لا يمكن الوصول للميكروفون. تحقق من الأذونات.');
      setStatus('error');
    }
  };

  const stopMicrophone = () => {
    scriptProcRef.current?.disconnect();
    scriptProcRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  // ── Disconnect ───────────────────────────────────────────────
  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    stopMicrophone();
    stopPlayback();
    setStatus('idle');
    setVolume(0);
  }, [stopPlayback]);

  // Cleanup on unmount
  useEffect(() => () => { disconnect(); }, []);

  // ── Send text message ────────────────────────────────────────
  const sendText = (text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'text', text }));
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text, ts: Date.now() }]);
  };

  // ────────────────────────────────────────────────────────────
  // UI
  // ────────────────────────────────────────────────────────────
  const isActive = status === 'listening' || status === 'ai_speaking' || status === 'ready';

  const statusLabel: Record<Status, string> = {
    idle:        language === 'ar' ? 'جاهز للبدء' : 'Ready to start',
    connecting:  language === 'ar' ? 'جاري الاتصال…' : 'Connecting…',
    ready:       language === 'ar' ? 'متصل — تحدّث الآن' : 'Connected — speak now',
    listening:   language === 'ar' ? 'أستمع إليك…' : 'Listening…',
    ai_speaking: language === 'ar' ? 'UnNoted يتكلم…' : 'UnNoted is speaking…',
    error:       language === 'ar' ? 'خطأ في الاتصال' : 'Connection error',
  };

  return (
    <div className="flex flex-col h-full min-h-[520px] bg-gradient-to-b from-[#05080f] via-[#080d1a] to-[#030608] text-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>

      {/* ── Top Bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${
            status === 'listening' ? 'bg-blue-400 animate-pulse' :
            status === 'ai_speaking' ? 'bg-purple-400 animate-pulse' :
            status === 'ready' ? 'bg-emerald-400' :
            status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            status === 'error' ? 'bg-red-400' : 'bg-slate-600'
          }`} />
          <span className="text-[11px] font-semibold text-slate-300">{statusLabel[status]}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings toggle */}
          {!isActive && (
            <button
              onClick={() => setShowSettings(s => !s)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition text-xs"
              title="الإعدادات"
            >⚙</button>
          )}
          {/* Close */}
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition text-sm">✕</button>
        </div>
      </div>

      {/* ── Settings Panel ─────────────────────────────────────── */}
      {showSettings && !isActive && (
        <div className="px-5 py-3 bg-white/3 border-b border-white/5 space-y-2" dir="rtl">
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('ar')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${language === 'ar' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >🇸🇦 العربية</button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >🇺🇸 English</button>
          </div>
          <input
            type="text"
            placeholder="المادة الدراسية (اختياري — مثال: الفيزياء)"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* ── Main Area ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Orb section */}
        <div className="flex flex-col items-center justify-center pt-4 pb-2 shrink-0">
          <VoiceOrb status={status} volume={volume} />

          {/* Status subtitle */}
          {status === 'error' && errorMsg && (
            <p className="text-xs text-red-400 text-center mt-2 px-6 max-w-xs">{errorMsg}</p>
          )}
          {status === 'idle' && (
            <p className="text-[11px] text-slate-500 mt-1">
              {language === 'ar' ? 'اضغط للبدء في المحادثة الصوتية' : 'Press to start voice conversation'}
            </p>
          )}
        </div>

        {/* ── Transcript ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
          {messages.length === 0 && isActive && (
            <div className="text-center py-4">
              <p className="text-[11px] text-slate-600">
                {language === 'ar' ? '…سيظهر النص هنا' : '…transcript will appear here'}
              </p>
            </div>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600/30 border border-blue-500/30 text-blue-100 rounded-tr-sm'
                  : 'bg-purple-600/20 border border-purple-500/20 text-purple-100 rounded-tl-sm'
              }`}>
                <div className="flex items-center gap-1.5 mb-1 opacity-60">
                  <span className="text-[9px] font-bold tracking-wide uppercase">
                    {msg.role === 'user' ? (language === 'ar' ? 'أنت' : 'You') : 'UnNoted'}
                  </span>
                  <span className="text-[9px]">
                    {new Date(msg.ts).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p dir="auto">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Controls ───────────────────────────────────────── */}
        <div className="shrink-0 px-5 py-4 border-t border-white/5 flex items-center justify-center gap-4">
          {!isActive ? (
            /* START button */
            <button
              onClick={connect}
              disabled={status === 'connecting'}
              className={`relative px-10 py-3.5 rounded-2xl font-black text-sm transition-all duration-300 ${
                status === 'connecting'
                  ? 'bg-blue-800/50 text-blue-300 cursor-wait'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-100'
              }`}
            >
              {status === 'connecting' ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                  {language === 'ar' ? 'جاري الاتصال…' : 'Connecting…'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>🎙</span>
                  {language === 'ar' ? 'ابدأ المحادثة' : 'Start Conversation'}
                </span>
              )}
            </button>
          ) : (
            /* ACTIVE controls */
            <div className="flex items-center gap-3">
              {/* Mute toggle */}
              <button
                onClick={() => setIsMuted(m => !m)}
                className={`w-11 h-11 rounded-full flex items-center justify-center text-base transition-all ${
                  isMuted
                    ? 'bg-red-600/30 border border-red-500/50 text-red-400'
                    : 'bg-white/8 border border-white/10 text-slate-300 hover:bg-white/12'
                }`}
                title={isMuted ? (language === 'ar' ? 'إلغاء كتم' : 'Unmute') : (language === 'ar' ? 'كتم الصوت' : 'Mute')}
              >
                {isMuted ? '🔇' : '🎙'}
              </button>

              {/* Big mic / pulsing indicator in center */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-300 border-2 ${
                status === 'listening'
                  ? 'border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/30'
                  : status === 'ai_speaking'
                  ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/30'
                  : 'border-white/20 bg-white/5'
              }`}>
                {status === 'ai_speaking' ? '🔊' : '🎙'}
              </div>

              {/* Interrupt button */}
              <button
                onClick={() => {
                  wsRef.current?.send(JSON.stringify({ type: 'interrupt' }));
                  stopPlayback();
                  setStatus('listening');
                }}
                disabled={status !== 'ai_speaking'}
                className={`w-11 h-11 rounded-full flex items-center justify-center text-base transition-all ${
                  status === 'ai_speaking'
                    ? 'bg-orange-600/30 border border-orange-500/50 text-orange-400 hover:bg-orange-600/50'
                    : 'bg-white/4 border border-white/8 text-slate-700 cursor-not-allowed'
                }`}
                title={language === 'ar' ? 'مقاطعة' : 'Interrupt'}
              >⏹</button>

              {/* End call */}
              <button
                onClick={disconnect}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-red-600/30 border border-red-500/50 text-red-400 hover:bg-red-600/60 transition-all text-base"
                title={language === 'ar' ? 'إنهاء المحادثة' : 'End call'}
              >📵</button>
            </div>
          )}
        </div>

        {/* ── Quick prompts ──────────────────────────────────── */}
        {isActive && status === 'listening' && (
          <div className="shrink-0 px-4 pb-3 flex flex-wrap gap-1.5 justify-center">
            {(language === 'ar'
              ? ['اشرح لي هذا المفهوم', 'لخّص الدرس', 'أعطني مثالاً', 'كيف أحل هذه المسألة؟']
              : ['Explain this concept', 'Summarize the lesson', 'Give me an example', 'How do I solve this?']
            ).map(prompt => (
              <button
                key={prompt}
                onClick={() => sendText(prompt)}
                className="px-3 py-1 rounded-full bg-white/6 border border-white/10 text-[10px] text-slate-400 hover:bg-white/12 hover:text-slate-200 transition"
              >{prompt}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer tip ─────────────────────────────────────────── */}
      <div className="shrink-0 px-5 py-2 border-t border-white/5 text-center">
        <p className="text-[9px] text-slate-700">
          {language === 'ar'
            ? 'المحادثة مدعومة بـ Gemini 2.0 Flash Live — الصوت يتدفق مباشرة دون انقطاع'
            : 'Powered by Gemini 2.0 Flash Live — continuous streaming, no cutoffs'}
        </p>
      </div>
    </div>
  );
}
