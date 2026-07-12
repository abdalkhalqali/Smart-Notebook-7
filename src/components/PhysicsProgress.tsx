import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, TrendingUp, Target, Award, Star, Zap, 
  Clock, CheckCircle, Brain, BookOpen, Flame, 
  ChevronRight, ChevronLeft, RefreshCw, Calendar,
  BarChart3, LineChart, PieChart as PieChartIcon,
  Lightbulb, Rocket, Medal, Crown, Shield, Sparkles
} from 'lucide-react';

interface ExperimentProgress {
  experimentId: string;
  experimentName: string;
  category: string;
  attempts: number;
  bestScore: number;
  averageScore: number;
  lastAttempt: string;
  completed: boolean;
  masteryLevel: 'none' | 'beginner' | 'intermediate' | 'expert' | 'master';
  strongTopics: string[];
  weakTopics: string[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'experiment' | 'practice';
  points: number;
  completed: boolean;
  experimentId?: string;
}

interface ProgressStats {
  totalExperiments: number;
  completedExperiments: number;
  totalQuizzes: number;
  averageScore: number;
  streakDays: number;
  totalPoints: number;
  rank: number;
  categoryProgress: Record<string, { total: number; completed: number }>;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-experiment', name: 'أول تجربة', description: 'أنجز تجربتك الأولى', icon: '🔬', unlocked: false, target: 1 },
  { id: 'quiz-master', name: 'خبير الاختبارات', description: 'أجتز 10 اختبارات', icon: '🏆', unlocked: false, target: 10 },
  { id: 'perfect-score', name: 'درجة مثالية', description: 'احصل على 100% في اختبار', icon: '💯', unlocked: false },
  { id: 'streak-3', name: 'ثلاثة أيام متتالية', description: 'تدرب 3 أيام متتالية', icon: '🔥', unlocked: false, target: 3 },
  { id: 'streak-7', name: 'أسبوع كامل', description: 'تدرب 7 أيام متتالية', icon: '🌟', unlocked: false, target: 7 },
  { id: 'all-mechanics', name: 'سيد الميكانيكا', description: 'أتقن جميع تجارب الميكانيكا', icon: '⚙️', unlocked: false },
  { id: 'all-electricity', name: 'خبير الكهرباء', description: 'أتقن جميع تجارب الكهرباء', icon: '⚡', unlocked: false },
  { id: 'all-optics', name: 'عالم البصريات', description: 'أتقن جميع تجارب البصريات', icon: '💡', unlocked: false },
  { id: 'speed-demon', name: 'سرعة البرق', description: 'أجب على 5 أسئلة في أقل من 10 ثواني', icon: '⚡', unlocked: false },
  { id: 'night-owl', name: 'بومة الليل', description: 'تدرب بعد الساعة 10 مساءً', icon: '🦉', unlocked: false },
  { id: 'early-bird', name: 'صباحي', description: 'تدرب قبل الساعة 7 صباحاً', icon: '🐦', unlocked: false },
  { id: 'century-club', name: 'نادي الـ 100', description: 'اجمع 100 نقطة', icon: '💯', unlocked: false, target: 100 },
  { id: 'thousand-points', name: 'خبير متألق', description: 'اجمع 1000 نقطة', icon: '💎', unlocked: false, target: 1000 },
  { id: 'no-mistakes', name: 'بدون أخطاء', description: 'أجب على 10 أسئلة صحيحة متتالية', icon: '🎯', unlocked: false, target: 10 },
  { id: 'explorer', name: 'مستكشف', description: 'جرب 5 تجارب مختلفة', icon: '🧭', unlocked: false, target: 5 },
];

const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: 'dc-1', title: 'اختبار السرعة', description: 'أجب على 3 أسئلة في أقل من دقيقة', type: 'quiz', points: 30, completed: false },
  { id: 'dc-2', title: 'تجربة جديدة', description: 'أتقن تجربة لم تجربها من قبل', type: 'experiment', points: 25, completed: false },
  { id: 'dc-3', title: 'تمرين الميكانيكا', description: 'أجب على 5 أسئلة ميكانيكا', type: 'quiz', points: 20, completed: false, experimentId: 'free-fall' },
];

const RANKS = [
  { name: 'مبتدئ', icon: '🌱', minPoints: 0, color: 'text-slate-400' },
  { name: 'طالب', icon: '📚', minPoints: 50, color: 'text-emerald-400' },
  { name: 'خبير', icon: '🎓', minPoints: 200, color: 'text-cyan-400' },
  { name: 'أستاذ', icon: '🏅', minPoints: 500, color: 'text-amber-400' },
  { name: 'عالم', icon: '🔬', minPoints: 1000, color: 'text-purple-400' },
  { name: 'أسطورة', icon: '👑', minPoints: 2500, color: 'text-pink-400' },
];

export default function PhysicsProgress({ darkMode = true }: { darkMode?: boolean }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'challenges' | 'history'>('overview');
  const [experiments, setExperiments] = useState<ExperimentProgress[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>(DAILY_CHALLENGES);
  const [stats, setStats] = useState<ProgressStats>({
    totalExperiments: 12,
    completedExperiments: 0,
    totalQuizzes: 0,
    averageScore: 0,
    streakDays: 0,
    totalPoints: 0,
    rank: 0,
    categoryProgress: {}
  });
  
  // Load data from localStorage
  useEffect(() => {
    loadProgress();
  }, []);
  
  const loadProgress = () => {
    try {
      const savedProgress = localStorage.getItem('physicsProgress');
      if (savedProgress) {
        const data = JSON.parse(savedProgress);
        setExperiments(data.experiments || []);
        setStats(data.stats || stats);
        
        // Update achievements based on progress
        const newAchievements = [...ACHIEVEMENTS];
        const expCount = data.experiments?.filter((e: ExperimentProgress) => e.completed).length || 0;
        const totalPoints = data.stats?.totalPoints || 0;
        
        if (expCount >= 1) newAchievements[0].unlocked = true;
        if (totalPoints >= 100) newAchievements[11].unlocked = true;
        if (totalPoints >= 1000) newAchievements[12].unlocked = true;
        if (expCount >= 5) newAchievements[14].unlocked = true;
        
        setAchievements(newAchievements);
      }
    } catch (e) {
      console.error('Error loading progress:', e);
    }
  };
  
  const saveProgress = useCallback((newExperiments: ExperimentProgress[], newStats: ProgressStats) => {
    localStorage.setItem('physicsProgress', JSON.stringify({
      experiments: newExperiments,
      stats: newStats
    }));
  }, []);
  
  // Calculate stats
  useEffect(() => {
    const completedCount = experiments.filter(e => e.completed).length;
    const avgScore = experiments.length > 0 
      ? Math.round(experiments.reduce((a, e) => a + e.averageScore, 0) / experiments.length)
      : 0;
    
    const categoryProgress: Record<string, { total: number; completed: number }> = {};
    experiments.forEach(e => {
      if (!categoryProgress[e.category]) {
        categoryProgress[e.category] = { total: 0, completed: 0 };
      }
      categoryProgress[e.category].total++;
      if (e.completed) categoryProgress[e.category].completed++;
    });
    
    // Calculate rank
    let rank = 0;
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (stats.totalPoints >= RANKS[i].minPoints) {
        rank = i;
        break;
      }
    }
    
    setStats(prev => ({
      ...prev,
      completedExperiments: completedCount,
      averageScore: avgScore,
      categoryProgress,
      rank
    }));
  }, [experiments, stats.totalPoints]);
  
  const currentRank = RANKS[stats.rank] || RANKS[0];
  const nextRank = RANKS[stats.rank + 1] || null;
  const progressToNextRank = nextRank 
    ? ((stats.totalPoints - currentRank.minPoints) / (nextRank.minPoints - currentRank.minPoints)) * 100
    : 100;
  
  const bgMain = darkMode ? 'bg-slate-900' : 'bg-slate-100';
  const bgCard = darkMode ? 'bg-slate-800' : 'bg-white';
  const textMain = darkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-600';
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';
  
  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`${bgCard} rounded-xl p-4 border ${borderColor}`}>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className={`text-xs ${textSecondary}`}>النقاط</span>
          </div>
          <p className={`text-2xl font-bold ${textMain}`}>{stats.totalPoints}</p>
        </div>
        
        <div className={`${bgCard} rounded-xl p-4 border ${borderColor}`}>
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className={`text-xs ${textSecondary}`}>الأيام المتتالية</span>
          </div>
          <p className={`text-2xl font-bold ${textMain}`}>{stats.streakDays}</p>
        </div>
        
        <div className={`${bgCard} rounded-xl p-4 border ${borderColor}`}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span className={`text-xs ${textSecondary}`}>التجارب</span>
          </div>
          <p className={`text-2xl font-bold ${textMain}`}>{stats.completedExperiments}/{stats.totalExperiments}</p>
        </div>
        
        <div className={`${bgCard} rounded-xl p-4 border ${borderColor}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <span className={`text-xs ${textSecondary}`}>متوسط الدرجات</span>
          </div>
          <p className={`text-2xl font-bold ${textMain}`}>{stats.averageScore}%</p>
        </div>
      </div>
      
      {/* Rank Card */}
      <div className={`${bgCard} rounded-2xl p-5 border ${borderColor}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
              darkMode ? 'bg-gradient-to-br from-amber-600 to-orange-600' : 'bg-gradient-to-br from-amber-500 to-orange-500'
            }`}>
              {currentRank.icon}
            </div>
            <div>
              <p className={`text-sm font-bold ${textMain}`}>{currentRank.name}</p>
              <p className={`text-xs ${textSecondary}`}>المستوى الحالي</p>
            </div>
          </div>
          
          {nextRank && (
            <div className="text-left">
              <p className={`text-xs ${textSecondary}`}>{nextRank.name}</p>
              <p className={`text-xs ${nextRank.color}`}>{nextRank.icon}</p>
            </div>
          )}
        </div>
        
        {nextRank && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className={textSecondary}>التقدم للرتبة التالية</span>
              <span className={textSecondary}>{progressToNextRank.toFixed(0)}%</span>
            </div>
            <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <div 
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                style={{ width: `${Math.min(100, progressToNextRank)}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Tabs */}
      <div className={`${bgCard} rounded-2xl border ${borderColor} overflow-hidden`}>
        <div className={`flex border-b ${borderColor}`}>
          {[
            { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
            { id: 'achievements', label: 'الإنجازات', icon: Award },
            { id: 'challenges', label: 'التحديات', icon: Target },
            { id: 'history', label: 'السجل', icon: Clock },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition ${
                activeTab === tab.id
                  ? `border-b-2 border-cyan-500 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`
                  : textSecondary
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="p-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Category Progress */}
              <div>
                <h4 className={`text-sm font-bold ${textMain} mb-3 flex items-center gap-2`}>
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  التقدم حسب الفئة
                </h4>
                <div className="space-y-3">
                  {Object.entries(stats.categoryProgress).map(([category, progress]) => {
                    const p = progress as { completed: number; total: number };
                    return (
                    <div key={category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={textSecondary}>{category}</span>
                        <span className={textSecondary}>{p.completed}/{p.total}</span>
                      </div>
                      <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div 
                          className={`h-full rounded-full ${
                            category.includes('ميكانيكا') ? 'bg-blue-500' :
                            category.includes('كهرباء') ? 'bg-amber-500' :
                            category.includes('بصريات') ? 'bg-emerald-500' :
                            'bg-purple-500'
                          }`}
                          style={{ width: `${(p.completed / p.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Recent Activity */}
              <div>
                <h4 className={`text-sm font-bold ${textMain} mb-3 flex items-center gap-2`}>
                  <Clock className="w-4 h-4 text-amber-400" />
                  النشاط الأخير
                </h4>
                {experiments.length === 0 ? (
                  <div className={`text-center py-8 ${textSecondary}`}>
                    <Rocket className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>ابدأ رحلتك الآن!</p>
                    <p className="text-xs">أكمل التجارب والاختبارات لكسب النقاط</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {experiments.slice(0, 5).map(exp => (
                      <div 
                        key={exp.experimentId}
                        className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            exp.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/50 text-slate-400'
                          }`}>
                            {exp.completed ? <CheckCircle className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${textMain}`}>{exp.experimentName}</p>
                            <p className={`text-[10px] ${textSecondary}`}>{exp.lastAttempt || 'لم يتم بعد'}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-bold ${
                            exp.bestScore >= 80 ? 'text-emerald-400' :
                            exp.bestScore >= 60 ? 'text-amber-400' :
                            textSecondary
                          }`}>{exp.bestScore}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {achievements.map(achievement => (
                <div 
                  key={achievement.id}
                  className={`p-4 rounded-xl border transition ${
                    achievement.unlocked
                      ? `${darkMode ? 'bg-gradient-to-br from-amber-900/30 to-orange-900/30 border-amber-600/50' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'}`
                      : `${bgMain} border ${borderColor} opacity-60`
                  }`}
                >
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <p className={`text-xs font-bold ${textMain}`}>{achievement.name}</p>
                  <p className={`text-[10px] ${textSecondary} mt-1`}>{achievement.description}</p>
                  {achievement.unlocked ? (
                    <div className="flex items-center gap-1 mt-2">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] text-amber-400">مفتوح!</span>
                    </div>
                  ) : achievement.progress !== undefined && achievement.target ? (
                    <div className="mt-2">
                      <div className={`h-1 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div 
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{achievement.progress}/{achievement.target}</p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <Lock className="w-3 h-3 text-slate-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Challenges Tab */}
          {activeTab === 'challenges' && (
            <div className="space-y-3">
              <div className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-gradient-to-r from-cyan-900/30 to-blue-900/30' : 'bg-gradient-to-r from-cyan-50 to-blue-50'}`}>
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-cyan-400" />
                  <div>
                    <p className={`text-sm font-bold ${textMain}`}>تحديات اليوم</p>
                    <p className={`text-xs ${textSecondary}`}>أكملها للحصول على نقاط إضافية</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold text-cyan-400`}>
                    {dailyChallenges.filter(c => c.completed).length}/{dailyChallenges.length}
                  </p>
                  <p className={`text-[10px] ${textSecondary}`}>مكتمل</p>
                </div>
              </div>
              
              {dailyChallenges.map(challenge => (
                <div 
                  key={challenge.id}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    challenge.completed
                      ? darkMode ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-emerald-50 border border-emerald-200'
                      : darkMode ? 'bg-slate-700/50 border border-slate-600' : 'bg-slate-100 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      challenge.type === 'quiz' ? 'bg-cyan-500/20 text-cyan-400' :
                      challenge.type === 'experiment' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {challenge.type === 'quiz' ? <Brain className="w-5 h-5" /> :
                       challenge.type === 'experiment' ? <Target className="w-5 h-5" /> :
                       <Zap className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${textMain}`}>{challenge.title}</p>
                      <p className={`text-xs ${textSecondary}`}>{challenge.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold text-amber-400`}>+{challenge.points}</span>
                    {challenge.completed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <button className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold">
                        ابدأ
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="text-center py-12">
              <Clock className={`w-12 h-12 mx-auto mb-3 ${textSecondary} opacity-50`} />
              <p className={`text-lg font-bold ${textMain}`}>قريباً...</p>
              <p className={`text-sm ${textSecondary}`}>سجل نشاطك سيظهر هنا</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Lock icon component
function Lock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
