import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Play, Download, Trash2, User, Video, Volume2, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { UserAvatar, AvatarVideoProject, VideoGenerationResponse } from '../types';
import { resolveApiUrl } from '../utils/apiBase';

interface AvatarVideoGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  lectureText?: string;
  lectureTitle?: string;
}

export default function AvatarVideoGenerator({ isOpen, onClose, lectureText = '', lectureTitle = '' }: AvatarVideoGeneratorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [avatars, setAvatars] = useState<UserAvatar[]>(() => {
    try {
      const stored = localStorage.getItem('userAvatars');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  
  const [selectedAvatar, setSelectedAvatar] = useState<UserAvatar | null>(null);
  const [script, setScript] = useState(lectureText || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState<{ videoUrl: string; audioUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Voice Support
  const [customVoice, setCustomVoice] = useState<{ name: string; audioUrl: string } | null>(() => {
    try {
      const stored = localStorage.getItem('customVoice');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [useCustomVoice, setUseCustomVoice] = useState(true);

  useEffect(() => {
    localStorage.setItem('userAvatars', JSON.stringify(avatars));
  }, [avatars]);

  useEffect(() => {
    if (lectureText) setScript(lectureText);
  }, [lectureText]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة (PNG أو JPG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const newAvatar: UserAvatar = {
        id: `avatar_${Date.now()}`,
        name: `الصورة الشخصية ${avatars.length + 1}`,
        imageUrl: base64,
        createdAt: new Date().toISOString()
      };
      setAvatars(prev => [...prev, newAvatar]);
      setSelectedAvatar(newAvatar);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAvatar = (avatarId: string) => {
    setAvatars(prev => prev.filter(a => a.id !== avatarId));
    if (selectedAvatar?.id === avatarId) setSelectedAvatar(null);
  };

  const generateVideo = async () => {
    if (!selectedAvatar) {
      setError('يرجى اختيار صورة شخصية أولاً');
      return;
    }
    if (!script.trim()) {
      setError('يرجى إدخال نص المحاضرة');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedVideo(null);
    setGenerationProgress(0);

    try {
      setGenerationStatus(useCustomVoice && customVoice ? 'جاري استخدام صوتك المخصص...' : 'جاري تحويل النص إلى صوت...');
      setGenerationProgress(20);

      // استخراج Base64 من الصوت المخصص إذا كان موجوداً
      let customVoiceBase64 = '';
      if (useCustomVoice && customVoice && customVoice.audioUrl) {
        customVoiceBase64 = customVoice.audioUrl.split(',')[1] || customVoice.audioUrl;
      }

      const response = await fetch(resolveApiUrl('/api/ai/generate-video-with-voice'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-custom-api-key': localStorage.getItem('customAiKey') || '',
          'x-custom-provider': localStorage.getItem('aiProvider') || 'gemini'
        },
        body: JSON.stringify({
          avatarImage: selectedAvatar.imageUrl,
          script: script.trim(),
          customVoiceBase64: customVoiceBase64,
          voiceId: useCustomVoice && customVoice ? 'my-voice' : 'ar-male-1',
          speed: 1.0
        })
      });

      setGenerationProgress(70);
      setGenerationStatus('جاري إنشاء الفيديو مع الصوت...');

      const data: VideoGenerationResponse = await response.json();

      if (data.success && data.videoUrl) {
        setGeneratedVideo({ videoUrl: data.videoUrl, audioUrl: data.audioUrl || '' });
        setGenerationProgress(100);
        setGenerationStatus(useCustomVoice && customVoice ? 'تم إنشاء الفيديو بصوتك المخصص! 🎤' : 'تم إنشاء الفيديو بنجاح!');
      } else {
        throw new Error(data.error || 'فشل إنشاء الفيديو');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء الفيديو');
      setGenerationStatus('');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadVideo = () => {
    if (!generatedVideo?.videoUrl) return;
    const link = document.createElement('a');
    link.href = generatedVideo.videoUrl;
    link.download = `lecture_${lectureTitle || 'video'}_${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAudio = () => {
    if (!generatedVideo?.audioUrl) return;
    const link = document.createElement('a');
    link.href = generatedVideo.audioUrl;
    link.download = `lecture_${lectureTitle || 'audio'}_${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">إنشاء فيديو محاضرة بالـ Avatar</h2>
              <p className="text-xs text-slate-400">حوّل محاضرتك النصية إلى فيديو تعليمي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Avatar Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <User className="w-4 h-4" />
                الصورة الشخصية (Avatar)
              </label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition"
              >
                <Upload className="w-3 h-3" />
                رفع صورة
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={handleImageUpload}
            />
            
            {avatars.length === 0 ? (
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center">
                <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">لم يتم رفع أي صورة شخصية</p>
                <p className="text-xs text-slate-500 mt-1">اضغط على "رفع صورة" لاختيار صورة PNG أو JPG</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {avatars.map(avatar => (
                  <div
                    key={avatar.id}
                    className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition ${
                      selectedAvatar?.id === avatar.id ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-slate-700 hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedAvatar(avatar)}
                  >
                    <img src={avatar.imageUrl} alt={avatar.name} className="w-full aspect-square object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteAvatar(avatar.id); }}
                      className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                    {selectedAvatar?.id === avatar.id && (
                      <div className="absolute bottom-1 left-1 p-1 bg-purple-500 rounded-full">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voice Selection - Voice Clone */}
          <div className="space-y-3 p-4 bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-600/30 rounded-xl">
            <label className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              اختيار الصوت (Voice Clone)
            </label>
            
            <div className="flex gap-3 flex-wrap">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition ${useCustomVoice && customVoice ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                <input
                  type="radio"
                  name="videoVoice"
                  checked={useCustomVoice && !!customVoice}
                  onChange={() => setUseCustomVoice(true)}
                  disabled={!customVoice}
                  className="hidden"
                />
                <span>🎤</span>
                <span className="text-xs font-bold">صوتي المخصص</span>
              </label>
              
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition ${!useCustomVoice ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                <input
                  type="radio"
                  name="videoVoice"
                  checked={!useCustomVoice}
                  onChange={() => setUseCustomVoice(false)}
                  className="hidden"
                />
                <span>🤖</span>
                <span className="text-xs font-bold">صوت AI</span>
              </label>
            </div>
            
            {useCustomVoice && customVoice && (
              <div className="mt-2 p-2 bg-slate-900/50 rounded-lg">
                <audio src={customVoice.audioUrl} controls className="w-full h-10" />
                <p className="text-[10px] text-slate-500 mt-1">سيتم استخدام صوتك الشخصي لتحويل النص</p>
              </div>
            )}
            
            {!customVoice && (
              <div className="mt-2">
                <label className="flex items-center justify-center gap-2 py-3 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-600/40 rounded-lg cursor-pointer transition">
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const audioUrl = ev.target?.result as string;
                        const voiceData = { name: file.name, audioUrl };
                        setCustomVoice(voiceData);
                        localStorage.setItem('customVoice', JSON.stringify(voiceData));
                        setUseCustomVoice(true);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <span className="text-lg">🎤</span>
                  <span className="text-xs font-bold text-amber-300">رفع صوتي لاستخدامه في الفيديو</span>
                </label>
                <p className="text-[9px] text-slate-500 text-center mt-1">ارفع مقطع صوتي قصير (5-30 ثانية) بصوتك</p>
              </div>
            )}
          </div>

          {/* Script Input */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              نص المحاضرة
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="اكتب نص المحاضرة هنا أو سيتم استخدام نص المحاضرة الحالية..."
              className="w-full h-40 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-purple-500"
              dir="rtl"
            />
            <p className="text-xs text-slate-500">{script.length} حرف</p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <div className="space-y-3 p-4 bg-slate-800 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">{generationStatus}</span>
                <span className="text-xs text-slate-400">{generationProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            </div>
          )}

          {/* Generated Video Preview */}
          {generatedVideo && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-bold">تم إنشاء الفيديو بنجاح!</span>
              </div>
              
              <div className="relative rounded-xl overflow-hidden bg-slate-800">
                <video
                  src={generatedVideo.videoUrl}
                  controls
                  className="w-full aspect-video"
                  poster={selectedAvatar?.imageUrl}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={downloadVideo}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition"
                >
                  <Download className="w-4 h-4" />
                  تحميل الفيديو
                </button>
                {generatedVideo.audioUrl && (
                  <button
                    onClick={downloadAudio}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-xl transition"
                  >
                    <Volume2 className="w-4 h-4" />
                    تحميل الصوت
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold transition"
          >
            إلغاء
          </button>
          <button
            onClick={generateVideo}
            disabled={isGenerating || !selectedAvatar || !script.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-600 disabled:to-slate-600 text-white text-sm font-bold rounded-xl transition"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                إنشاء فيديو المحاضرة
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
