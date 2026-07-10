import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, Trash2, Download, Settings, X, User, Bot, Loader2, MessageSquare } from 'lucide-react';
import { resolveApiUrl } from '../utils/apiBase';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: string;
}

interface AIChatProps {
  lectureText?: string;
  lectureTitle?: string;
}

export default function AIChat({ lectureText = '', lectureTitle = '' }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'مرحباً! 👋 أنا معلمك الذكي. يمكنني مساعدتك في فهم أي موضوع أو شرحه لك بالصوت. ما الذي تريد أن أساعدك فيه اليوم؟',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('ar-SA-HamedNeural');
  const [isRecording, setIsRecording] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem('aiChatHistory');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Voice options
  const voiceOptions = [
    { id: 'ar-SA-HamedNeural', name: 'معلم ذكر', icon: '👨‍🏫' },
    { id: 'ar-SA-ZariydaNeural', name: 'معلمة أنثى', icon: '👩‍🏫' },
    { id: 'ar-SA-ShakurRTLNeural', name: 'أستاذ جامعي', icon: '👨‍🎓' },
    { id: 'en-US-GuyNeural', name: 'English Male', icon: '👨‍💻' },
    { id: 'en-US-JennyNeural', name: 'English Female', icon: '👩‍💻' },
  ];
  
  useEffect(() => {
    localStorage.setItem('aiChatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Text-to-Speech using Edge TTS
  const speakText = async (text: string, voiceId?: string) => {
    if (!text) return;
    
    try {
      setIsSpeaking(true);
      
      const response = await fetch(resolveApiUrl('/api/ai/tts-edge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: voiceId || selectedVoice
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
    }
  };
  
  // Speech-to-Text
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Convert to base64 and send to AI
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          // For now, just use the audio as-is
          // In production, use a speech-to-text API
          alert('تم تسجيل الصوت! (ميزة تحويل الصوت لنص تحتاج API إضافي)');
        };
        reader.readAsDataURL(blob);
      };
      
      recorder.start(100);
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
      alert('لا يمكن الوصول إلى الميكروفون');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Send message to AI
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setChatHistory(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      const response = await fetch(resolveApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-custom-api-key': localStorage.getItem('customAiKey') || '',
          'x-custom-provider': localStorage.getItem('aiProvider') || 'gemini'
        },
        body: JSON.stringify({
          message: inputText.trim(),
          context: lectureText || '',
          history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });
      
      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'عذراً، لم أستطع فهم سؤالك. حاول مرة أخرى.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setChatHistory(prev => [...prev, assistantMessage]);
      
      // Auto-play response audio
      if (data.response) {
        await speakText(data.response);
      }
    } catch (err) {
      console.error('Chat error:', err);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'عذراً، حدث خطأ في الاتصال. تأكد من اتصالك بالإنترنت.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Play single message audio
  const playMessage = async (message: ChatMessage) => {
    if (message.role === 'assistant') {
      await speakText(message.content);
    }
  };
  
  // Clear chat
  const clearChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'تم مسح المحادثة! 👋 كيف يمكنني مساعدتك الآن؟',
      timestamp: new Date().toISOString()
    }]);
  };
  
  // Export chat
  const exportChat = () => {
    const chatText = messages.map(m => 
      `${m.role === 'user' ? '👤 أنت' : '🤖 المعلم'}:\n${m.content}\n`
    ).join('\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat_${Date.now()}.txt`;
    link.click();
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-3 border-b ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : 'bg-gradient-to-br from-teal-400 to-cyan-400'}`}>
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>الحوار والمناقشة</h3>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>تحدث مع معلمك الذكي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg transition ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}`}
            title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={exportChat}
            className={`p-2 rounded-lg transition ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-green-400' : 'bg-slate-200 hover:bg-slate-300 text-green-600'}`}
            title="تصدير المحادثة"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={clearChat}
            className={`p-2 rounded-lg transition ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-red-400' : 'bg-slate-200 hover:bg-slate-300 text-red-600'}`}
            title="مسح المحادثة"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Voice Selection */}
      <div className={`flex items-center gap-2 p-2 border-b ${isDarkMode ? 'bg-slate-850 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <Volume2 className={`w-4 h-4 ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`} />
        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>صوت المعلم:</span>
        <div className="flex gap-1 flex-wrap">
          {voiceOptions.map(voice => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                selectedVoice === voice.id 
                  ? 'bg-teal-600 text-white' 
                  : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              <span>{voice.icon}</span>
              <span>{voice.name}</span>
            </button>
          ))}
        </div>
        {isSpeaking && (
          <div className="flex items-center gap-1 animate-pulse">
            <span className="text-teal-400 text-xs">🔊 يتحدث...</span>
          </div>
        )}
      </div>
      
      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              message.role === 'user' 
                ? 'bg-blue-600' 
                : isDarkMode ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : 'bg-gradient-to-br from-teal-400 to-cyan-400'
            }`}>
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div className={`max-w-[80%] ${message.role === 'user' ? 'text-left' : 'text-right'}`}>
              <div className={`inline-block p-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : isDarkMode 
                    ? 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700' 
                    : 'bg-white text-slate-800 rounded-tl-sm shadow-sm border border-slate-200'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
              <div className={`flex items-center gap-2 mt-1 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className={`text-[9px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {new Date(message.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {message.role === 'assistant' && (
                  <button
                    onClick={() => playMessage(message)}
                    className={`p-1 rounded-full transition ${
                      isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : 'bg-gradient-to-br from-teal-400 to-cyan-400'}`}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className={`inline-block p-3 rounded-2xl rounded-tl-sm ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white shadow-sm border border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>جارٍ الكتابة...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className={`p-3 border-t ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex gap-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="اكتب رسالتك هنا..."
            className={`flex-1 px-4 py-2 rounded-xl text-sm ${
              isDarkMode 
                ? 'bg-slate-700 text-white placeholder-slate-400 border border-slate-600 focus:border-teal-500 outline-none' 
                : 'bg-slate-100 text-slate-800 placeholder-slate-400 border border-slate-200 focus:border-teal-500 outline-none'
            }`}
            dir="rtl"
          />
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center transition"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
