import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, Trophy, Target, Clock, CheckCircle, XCircle, 
  ChevronRight, ChevronLeft, Sparkles, Zap, RefreshCw,
  BookOpen, Award, TrendingUp, Star, Lightbulb, Calculator,
  Play, RotateCcw, Eye, EyeOff
} from 'lucide-react';

interface Question {
  id: string;
  type: 'multiple-choice' | 'numerical' | 'true-false' | 'problem';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  difficulty: 1 | 2 | 3;
  category: string;
  relatedExperiment?: string;
  formula?: string;
  points: number;
  timeLimit?: number;
}

interface QuizResult {
  questionId: string;
  userAnswer: string | number;
  correct: boolean;
  timeSpent: number;
}

interface QuizSession {
  experimentId: string;
  questions: Question[];
  results: QuizResult[];
  currentIndex: number;
  score: number;
  startTime: number;
  streak: number;
}

// Quiz database by experiment
const QUIZ_DATABASE: Record<string, Question[]> = {
  'free-fall': [
    {
      id: 'ff-1',
      type: 'numerical',
      question: 'جسم يسقط من ارتفاع 20 متر. احسب زمن السقوط (g = 10 m/s²)',
      correctAnswer: 2,
      explanation: 'h = ½gt² → t = √(2h/g) = √(40/10) = √4 = 2s',
      difficulty: 1,
      category: 'ميكانيكا',
      relatedExperiment: 'free-fall',
      formula: 't = √(2h/g)',
      points: 10,
      timeLimit: 30
    },
    {
      id: 'ff-2',
      type: 'multiple-choice',
      question: 'أي من التالي يؤثر على زمن السقوط الحر في الفراغ؟',
      options: ['الكتلة', 'الارتفاع', 'لون الجسم', 'شكل الجسم'],
      correctAnswer: 'الارتفاع',
      explanation: 'في الفراغ، جميع الأجسام تسقط بنفس التسارع بغض النظر عن كتلتها أو شكلها أو لونها. الزمن يعتمد فقط على الارتفاع.',
      difficulty: 1,
      category: 'ميكانيكا',
      relatedExperiment: 'free-fall',
      points: 5
    },
    {
      id: 'ff-3',
      type: 'true-false',
      question: 'السرعة النهائية لجسم يسقط حراً تتناسب طردياً مع زمن السقوط.',
      correctAnswer: 'صح',
      explanation: 'v = gt، إذاً السرعة تتناسب طردياً مع الزمن (ثابت التناسب هو g).',
      difficulty: 1,
      category: 'ميكانيكا',
      relatedExperiment: 'free-fall',
      formula: 'v = gt',
      points: 5
    },
    {
      id: 'ff-4',
      type: 'problem',
      question: 'قذيفة تسقط من ارتفاع 180 متر. احسب: (أ) زمن السقوط، (ب) السرعة النهائية (g = 10 m/s²)',
      correctAnswer: '6, 60',
      explanation: '(أ) t = √(2h/g) = √(360/10) = √36 = 6s\n(ب) v = gt = 10 × 6 = 60 m/s',
      difficulty: 2,
      category: 'ميكانيكا',
      relatedExperiment: 'free-fall',
      formula: 't = √(2h/g), v = gt',
      points: 20,
      timeLimit: 60
    }
  ],
  'projectile': [
    {
      id: 'pr-1',
      type: 'multiple-choice',
      question: 'ما زاوية الإطلاق التي تحقق أقصى مدى أفقي؟',
      options: ['30°', '45°', '60°', '90°'],
      correctAnswer: '45°',
      explanation: 'المدى = v₀²sin(2θ)/g، Maximum when sin(2θ) = 1, i.e., 2θ = 90°, θ = 45°',
      difficulty: 2,
      category: 'ميكانيكا',
      relatedExperiment: 'projectile',
      formula: 'R = v₀²sin(2θ)/g',
      points: 10
    },
    {
      id: 'pr-2',
      type: 'numerical',
      question: 'جسم قُذف بسرعة 40 m/s بزاوية 30°. ما أقصى ارتفاع يصل إليه؟ (g = 10 m/s²)',
      correctAnswer: 20,
      explanation: 'H = v₀²sin²θ/(2g) = 1600 × 0.25 / 20 = 400/20 = 20m',
      difficulty: 2,
      category: 'ميكانيكا',
      relatedExperiment: 'projectile',
      formula: 'H = v₀²sin²θ/2g',
      points: 15,
      timeLimit: 45
    },
    {
      id: 'pr-3',
      type: 'true-false',
      question: 'المكون الأفقي للسرعة في الحركة القذفية يبقى ثابتاً.',
      correctAnswer: 'صح',
      explanation: 'لا توجد قوة أفقية (بدون احتكاك)، إذاً التسارع الأفقي = 0، والسرعة الأفقية ثابتة.',
      difficulty: 1,
      category: 'ميكانيكا',
      relatedExperiment: 'projectile',
      points: 5
    }
  ],
  'ohms-law': [
    {
      id: 'ol-1',
      type: 'numerical',
      question: 'مقاومة 10Ω موصلة بمصدر جهد 5V. احسب شدة التيار (بالأمبير).',
      correctAnswer: 0.5,
      explanation: 'I = V/R = 5/10 = 0.5A',
      difficulty: 1,
      category: 'كهرباء',
      relatedExperiment: 'ohms-law',
      formula: 'I = V/R',
      points: 10
    },
    {
      id: 'ol-2',
      type: 'multiple-choice',
      question: 'القدرة الكهربائية تُقاس بوحدة:',
      options: ['الفولت (V)', 'الأوم (Ω)', 'الوات (W)', 'الأمبير (A)'],
      correctAnswer: 'الوات (W)',
      explanation: 'القدرة = الفولت × الأمبير = Watt (W). الفولت قياس الجهد، الأمبير قياس التيار، الأوم قياس المقاومة.',
      difficulty: 1,
      category: 'كهرباء',
      relatedExperiment: 'ohms-law',
      points: 5
    },
    {
      id: 'ol-3',
      type: 'problem',
      question: 'مصباح مقاومته 20Ω يمر فيه تيار 0.3A. احسب: (أ) الجهد، (ب) القدرة المستهلكة',
      correctAnswer: '6, 1.8',
      explanation: '(أ) V = IR = 0.3 × 20 = 6V\n(ب) P = VI = 6 × 0.3 = 1.8W',
      difficulty: 2,
      category: 'كهرباء',
      relatedExperiment: 'ohms-law',
      formula: 'V = IR, P = VI',
      points: 15,
      timeLimit: 60
    }
  ],
  'pendulum': [
    {
      id: 'pe-1',
      type: 'numerical',
      question: 'بندول بسيط طول خيطه 1 متر. احسب زمنه الدوري (g = 10 m/s², π = 3.14)',
      correctAnswer: 1.99,
      explanation: 'T = 2π√(L/g) = 2 × 3.14 × √(1/10) = 6.28 × 0.316 = 1.99s',
      difficulty: 2,
      category: 'ميكانيكا',
      relatedExperiment: 'pendulum',
      formula: 'T = 2π√(L/g)',
      points: 15,
      timeLimit: 45
    },
    {
      id: 'pe-2',
      type: 'multiple-choice',
      question: 'زمن الدورة للبندول البسيط يعتمد على:',
      options: ['الكتلة فقط', 'سعة الترجحة فقط', 'طول الخيط فقط', 'الكتلة والسعة'],
      correctAnswer: 'طول الخيط فقط',
      explanation: 'T = 2π√(L/g) - الزمن الدوري يعتمد فقط على طول الخيط وتسارع الجاذبية، لا يعتمد على الكتلة أو سعة الترجحة (لزاويا صغيرة).',
      difficulty: 2,
      category: 'ميكانيكا',
      relatedExperiment: 'pendulum',
      points: 10
    }
  ],
  'wave': [
    {
      id: 'wv-1',
      type: 'numerical',
      question: 'موجة ترددها 50Hz وطولها الموجي 2m. ما سرعتها؟',
      correctAnswer: 100,
      explanation: 'v = fλ = 50 × 2 = 100 m/s',
      difficulty: 1,
      category: 'بصريات',
      relatedExperiment: 'wave',
      formula: 'v = fλ',
      points: 10
    },
    {
      id: 'wv-2',
      type: 'multiple-choice',
      question: 'الصوت يحتاج إلى وسط مادي للانتشار:',
      options: ['صح دائماً', 'خطأ دائماً', 'يعتمد على التردد', 'يعتمد على الطول الموجي'],
      correctAnswer: 'صح دائماً',
      explanation: 'الصوت موجة ميكانيكية تحتاج إلى وسط مادي للانتشار. الضوء موجة كهرومغناطيسية لا تحتاج وسطاً.',
      difficulty: 1,
      category: 'بصريات',
      relatedExperiment: 'wave',
      points: 5
    }
  ],
  'refraction': [
    {
      id: 'rf-1',
      type: 'multiple-choice',
      question: 'عند انتقال الضوء من وسط أكبر كثافة إلى أقل كثافة:',
      options: ['ينكسر نحو العمود', 'ينكسر بعيداً عن العمود', 'ينعكس كلياً', 'لا يتغير'],
      correctAnswer: 'ينكسر بعيداً عن العمود',
      explanation: 'وفقاً لقانون سنيل: n₁sinθ₁ = n₂sinθ₂، عندما n₁ > n₂، تكون sinθ₂ > sinθ₁، أي θ₂ > θ₁ (يبتعد عن العمود).',
      difficulty: 2,
      category: 'بصريات',
      relatedExperiment: 'refraction',
      formula: 'n₁sinθ₁ = n₂sinθ₂',
      points: 10
    }
  ],
  'gas-laws': [
    {
      id: 'gl-1',
      type: 'numerical',
      question: 'غاز حجمه 2L عند درجة حرارة 300K. ما حجمه عند 600K (الضغط ثابت)؟',
      correctAnswer: 4,
      explanation: 'V₁/T₁ = V₂/T₂ → 2/300 = V₂/600 → V₂ = 4L',
      difficulty: 2,
      category: 'حرارة',
      relatedExperiment: 'gas-laws',
      formula: 'V/T = constant',
      points: 15,
      timeLimit: 45
    }
  ],
  'radioactivity': [
    {
      id: 'ra-1',
      type: 'multiple-choice',
      question: 'عمر النصف لنظير مشع هو:',
      options: ['زمن تحلل كل الذرات', 'زمن تحلل نصف الذرات', 'زمن تحلل ربع الذرات', 'الزمن الكلي للتحلل'],
      correctAnswer: 'زمن تحلل نصف الذرات',
      explanation: 'عمر النصف هو الزمن اللازم لتحلل نصف كمية العنصر المشع.',
      difficulty: 1,
      category: 'فيزياء حديثة',
      relatedExperiment: 'radioactivity',
      points: 5
    }
  ],
  'collision': [
    {
      id: 'co-1',
      type: 'true-false',
      question: 'في التصادم غير المرن، تُحفظ الطاقة الحركية.',
      correctAnswer: 'خطأ',
      explanation: 'في التصادم غير المرن، لا تُحفظ الطاقة الحركية (بعضها يتحول إلى طاقة حرارية أو صوت). الزخم محفوظ دائماً.',
      difficulty: 2,
      category: 'ميكانيكا',
      relatedExperiment: 'collision',
      points: 5
    },
    {
      id: 'co-2',
      type: 'multiple-choice',
      question: 'في التصادم المرن، يُحفظ:',
      options: ['الطاقة الحركية فقط', 'الزخم فقط', 'الطاقة الحركية والزخم', 'لا شيء'],
      correctAnswer: 'الطاقة الحركية والزخم',
      explanation: 'في التصادم المرن، كل من الطاقة الحركية والزخم يُحفظان.',
      difficulty: 2,
      category: 'ميكانيكا',
      relatedExperiment: 'collision',
      points: 10
    }
  ],
  'magnetic': [
    {
      id: 'mg-1',
      type: 'multiple-choice',
      question: 'قوة لورنتز المؤثرة على جسيم مشحون تكون أعظم عندما:',
      options: ['الجسيم ساكن', 'الحركة موازية للمجال', 'الحركة عمودية على المجال', 'الجسيم له كتلة كبيرة'],
      correctAnswer: 'الحركة عمودية على المجال',
      explanation: 'F = qvBsinθ، أعظم عندما sinθ = 1، أي θ = 90° (عمودي).',
      difficulty: 2,
      category: 'كهرباء',
      relatedExperiment: 'magnetic',
      formula: 'F = qvBsinθ',
      points: 10
    }
  ],
  'photoelectric': [
    {
      id: 'ph-1',
      type: 'multiple-choice',
      question: 'في التأثير الكهروضوئي، الطاقة الحركية للإلكترونات تعتمد على:',
      options: ['شدة الضوء', 'تردد الضوء', 'لون الضوء', 'زمن الإضاءة'],
      correctAnswer: 'تردد الضوء',
      explanation: 'KE = hf - φ، الطاقة الحركية تعتمد على تردد الضوء (f)، وليس على شدته.',
      difficulty: 2,
      category: 'فيزياء حديثة',
      relatedExperiment: 'photoelectric',
      formula: 'KE = hf - φ',
      points: 10
    }
  ],
  'spring': [
    {
      id: 'sp-1',
      type: 'numerical',
      question: 'جسم كتلته 2kg مربوط بنابض يرتد بحركة توافقية بسيطة. إذا كان التردد 2Hz، ما الزمن الدوري؟',
      correctAnswer: 0.5,
      explanation: 'T = 1/f = 1/2 = 0.5s',
      difficulty: 1,
      category: 'ميكانيكا',
      relatedExperiment: 'spring',
      formula: 'T = 1/f',
      points: 10
    }
  ]
};

export default function PhysicsQuiz({ 
  experimentId, 
  onComplete,
  darkMode = true 
}: { 
  experimentId: string; 
  onComplete?: (results: QuizResult[], score: number) => void;
  darkMode?: boolean;
}) {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | number>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showHint, setShowHint] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Initialize quiz
  const startQuiz = useCallback(() => {
    const questions = QUIZ_DATABASE[experimentId] || [];
    if (questions.length === 0) {
      // Generate generic questions
      const genericQuestions: Question[] = [
        {
          id: 'gen-1',
          type: 'multiple-choice',
          question: 'ما هي وحدة قياس القوة في النظام الدولي؟',
          options: ['الجول', 'النيوتن', 'الواط', 'الباسكال'],
          correctAnswer: 'النيوتن',
          explanation: 'النيوتن (N) هو وحدة قياس القوة = kg·m/s²',
          difficulty: 1,
          category: 'أساسي',
          points: 5
        },
        {
          id: 'gen-2',
          type: 'numerical',
          question: 'ما تسارع الجاذبية الأرضية تقريباً؟',
          correctAnswer: 9.8,
          explanation: 'g ≈ 9.8 m/s² على سطح الأرض',
          difficulty: 1,
          category: 'أساسي',
          points: 5
        }
      ];
      questions.push(...genericQuestions);
    }
    
    setSession({
      experimentId,
      questions: questions.sort(() => Math.random() - 0.5),
      results: [],
      currentIndex: 0,
      score: 0,
      startTime: Date.now(),
      streak: 0
    });
    setCurrentAnswer('');
    setShowExplanation(false);
    setIsCorrect(null);
    setQuestionStartTime(Date.now());
    setQuizComplete(false);
  }, [experimentId]);
  
  // Timer effect
  useEffect(() => {
    if (!session || !session.questions[session.currentIndex]?.timeLimit || showExplanation || quizComplete) return;
    
    const question = session.questions[session.currentIndex];
    setTimeLeft(question.timeLimit || null);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          submitAnswer();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [session?.currentIndex, showExplanation, quizComplete]);
  
  // Submit answer
  const submitAnswer = useCallback(() => {
    if (!session || isCorrect !== null) return;
    
    const question = session.questions[session.currentIndex];
    const timeSpent = (Date.now() - questionStartTime) / 1000;
    
    let correct = false;
    if (question.type === 'numerical' || question.type === 'problem') {
      const userNum = parseFloat(currentAnswer as string);
      const correctNum = parseFloat(question.correctAnswer as string);
      correct = Math.abs(userNum - correctNum) < 0.1;
    } else {
      correct = currentAnswer === question.correctAnswer;
    }
    
    const result: QuizResult = {
      questionId: question.id,
      userAnswer: currentAnswer,
      correct,
      timeSpent
    };
    
    setIsCorrect(correct);
    setShowExplanation(true);
    
    setSession(prev => prev ? {
      ...prev,
      results: [...prev.results, result],
      score: correct ? prev.score + question.points * (prev.streak + 1) : prev.score,
      streak: correct ? prev.streak + 1 : 0
    } : null);
  }, [session, currentAnswer, isCorrect, questionStartTime]);
  
  // Next question
  const nextQuestion = useCallback(() => {
    if (!session) return;
    
    const nextIndex = session.currentIndex + 1;
    
    if (nextIndex >= session.questions.length) {
      setQuizComplete(true);
      if (onComplete) {
        onComplete(session.results, session.score);
      }
    } else {
      setSession(prev => prev ? { ...prev, currentIndex: nextIndex } : null);
      setCurrentAnswer('');
      setShowExplanation(false);
      setIsCorrect(null);
      setQuestionStartTime(Date.now());
    }
  }, [session, onComplete]);
  
  // Calculate final stats
  const getFinalStats = useCallback(() => {
    if (!session) return { total: 0, correct: 0, accuracy: 0, avgTime: 0 };
    
    const correct = session.results.filter(r => r.correct).length;
    const total = session.results.length;
    const avgTime = session.results.reduce((a, r) => a + r.timeSpent, 0) / total;
    
    return {
      total,
      correct,
      accuracy: Math.round((correct / total) * 100),
      avgTime
    };
  }, [session]);
  
  const bgMain = darkMode ? 'bg-slate-900' : 'bg-slate-100';
  const bgCard = darkMode ? 'bg-slate-800' : 'bg-white';
  const textMain = darkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-600';
  
  if (!session) {
    return (
      <div className={`${bgCard} rounded-2xl p-6 border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="text-center mb-6">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
            darkMode ? 'bg-gradient-to-br from-cyan-500 to-blue-600' : 'bg-gradient-to-br from-cyan-400 to-blue-500'
          }`}>
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h3 className={`text-lg font-bold ${textMain} mb-2`}>اختبار فيزياء</h3>
          <p className={`text-sm ${textSecondary}`}>
            اختبر معلوماتك من خلال أسئلة متنوعة
          </p>
        </div>
        
        <button
          onClick={startQuiz}
          className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          ابدأ الاختبار
        </button>
        
        <div className={`mt-4 grid grid-cols-2 gap-3 text-center`}>
          <div className={`${bgMain} rounded-xl p-3`}>
            <p className={`text-2xl font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
              {Object.values(QUIZ_DATABASE).flat().length}
            </p>
            <p className={`text-[10px] ${textSecondary}`}>سؤال متاح</p>
          </div>
          <div className={`${bgMain} rounded-xl p-3`}>
            <p className={`text-2xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {Object.keys(QUIZ_DATABASE).length}
            </p>
            <p className={`text-[10px] ${textSecondary}`}>تجربة مشمولة</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (quizComplete) {
    const stats = getFinalStats();
    const percentage = stats.accuracy;
    
    return (
      <div className={`${bgCard} rounded-2xl p-6 border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="text-center mb-6">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
            percentage >= 80 ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
            percentage >= 60 ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
            'bg-gradient-to-br from-red-500 to-rose-600'
          }`}>
            {percentage >= 80 ? (
              <Trophy className="w-10 h-10 text-white" />
            ) : percentage >= 60 ? (
              <Award className="w-10 h-10 text-white" />
            ) : (
              <RefreshCw className="w-10 h-10 text-white" />
            )}
          </div>
          
          <h3 className={`text-xl font-bold ${textMain} mb-1`}>
            {percentage >= 80 ? 'ممتاز! 🎉' : percentage >= 60 ? 'جيد جداً 👍' : 'حاول مرة أخرى 💪'}
          </h3>
          <p className={`text-sm ${textSecondary}`}>
            {percentage >= 80 ? 'أتقنت هذا الموضوع!' : percentage >= 60 ? 'أداء جيد، لكن هناك مجال للتحسن' : 'لا بأس، الممارسة تؤدي للإتقان'}
          </p>
        </div>
        
        <div className={`grid grid-cols-3 gap-3 mb-6`}>
          <div className={`${bgMain} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {stats.accuracy}%
            </p>
            <p className={`text-[10px] ${textSecondary}`}>الدقة</p>
          </div>
          <div className={`${bgMain} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
              {stats.correct}/{stats.total}
            </p>
            <p className={`text-[10px] ${textSecondary}`}>إجابات صحيحة</p>
          </div>
          <div className={`${bgMain} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {session.score}
            </p>
            <p className={`text-[10px] ${textSecondary}`}>النقاط</p>
          </div>
        </div>
        
        <button
          onClick={startQuiz}
          className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          إعادة الاختبار
        </button>
      </div>
    );
  }
  
  const question = session.questions[session.currentIndex];
  const progress = ((session.currentIndex + 1) / session.questions.length) * 100;
  
  return (
    <div className={`${bgCard} rounded-2xl border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className={`w-5 h-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span className={`text-sm font-bold ${textMain}`}>
              السؤال {session.currentIndex + 1} من {session.questions.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {timeLeft !== null && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                timeLeft <= 10 ? 'bg-red-500/20 text-red-400' : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
              }`}>
                <Clock className="w-3 h-3" />
                <span className="text-xs font-mono">{timeLeft}s</span>
              </div>
            )}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
              darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
            }`}>
              <Star className="w-3 h-3" />
              <span className="text-xs font-bold">{session.score}</span>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div 
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Question meta */}
        <div className="flex items-center gap-2 mt-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            question.difficulty === 1 ? 'bg-emerald-500/20 text-emerald-400' :
            question.difficulty === 2 ? 'bg-amber-500/20 text-amber-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {question.difficulty === 1 ? 'سهل' : question.difficulty === 2 ? 'متوسط' : 'صعب'}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] ${
            darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
          }`}>
            {question.category}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            darkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
          }`}>
            +{question.points} نقطة
          </span>
        </div>
      </div>
      
      {/* Question content */}
      <div className="p-4">
        <p className={`text-base font-bold ${textMain} mb-4 leading-relaxed`}>
          {question.question}
        </p>
        
        {/* Formula hint */}
        {question.formula && (
          <div className={`mb-4 p-2 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
            <div className="flex items-center gap-2">
              <Calculator className={`w-4 h-4 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
              <span className={`text-xs font-mono ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                📐 {question.formula}
              </span>
            </div>
          </div>
        )}
        
        {/* Options */}
        {question.type === 'multiple-choice' && question.options && (
          <div className="space-y-2 mb-4">
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => !showExplanation && setCurrentAnswer(option)}
                disabled={showExplanation}
                className={`w-full p-3 rounded-xl text-right transition ${
                  currentAnswer === option && !showExplanation
                    ? `bg-cyan-600 text-white border-2 border-cyan-400`
                    : showExplanation && option === question.correctAnswer
                    ? 'bg-emerald-600 text-white border-2 border-emerald-400'
                    : showExplanation && option !== question.correctAnswer
                    ? 'bg-slate-700/30 text-slate-500'
                    : darkMode 
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-2 border-transparent'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-transparent'
                }`}
              >
                <span className="font-bold ml-2">{String.fromCharCode(65 + i)}.</span>
                {option}
                {showExplanation && option === question.correctAnswer && (
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                )}
                {showExplanation && option === currentAnswer && option !== question.correctAnswer && (
                  <XCircle className="w-4 h-4 inline mr-2" />
                )}
              </button>
            ))}
          </div>
        )}
        
        {/* True/False */}
        {question.type === 'true-false' && (
          <div className="flex gap-3 mb-4">
            {['صح', 'خطأ'].map(option => (
              <button
                key={option}
                onClick={() => !showExplanation && setCurrentAnswer(option)}
                disabled={showExplanation}
                className={`flex-1 py-4 rounded-xl font-bold transition ${
                  currentAnswer === option && !showExplanation
                    ? 'bg-cyan-600 text-white'
                    : showExplanation && option === question.correctAnswer
                    ? 'bg-emerald-600 text-white'
                    : showExplanation
                    ? 'bg-slate-700/30 text-slate-500'
                    : darkMode 
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {option}
                {showExplanation && option === question.correctAnswer && (
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                )}
              </button>
            ))}
          </div>
        )}
        
        {/* Numerical input */}
        {(question.type === 'numerical' || question.type === 'problem') && (
          <div className="mb-4">
            <input
              type="number"
              value={currentAnswer}
              onChange={e => !showExplanation && setCurrentAnswer(e.target.value)}
              disabled={showExplanation}
              placeholder="أدخل الإجابة..."
              className={`w-full p-4 rounded-xl text-center text-lg font-mono ${
                showExplanation && isCorrect
                  ? 'bg-emerald-600/20 text-emerald-400 border-2 border-emerald-500'
                  : showExplanation && !isCorrect
                  ? 'bg-red-600/20 text-red-400 border-2 border-red-500'
                  : darkMode
                  ? 'bg-slate-700 text-white border-2 border-slate-600 focus:border-cyan-500 outline-none'
                  : 'bg-slate-100 text-slate-900 border-2 border-slate-300 focus:border-cyan-500 outline-none'
              }`}
              dir="ltr"
            />
            {showExplanation && !isCorrect && (
              <p className={`mt-2 text-center font-mono text-lg ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                الإجابة الصحيحة: {question.correctAnswer}
              </p>
            )}
          </div>
        )}
        
        {/* Explanation */}
        {showExplanation && (
          <div className={`p-4 rounded-xl ${
            isCorrect 
              ? darkMode ? 'bg-emerald-950/50 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200'
              : darkMode ? 'bg-red-950/50 border border-red-800' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              ) : (
                <XCircle className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
              )}
              <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                {isCorrect ? 'إجابة صحيحة! 🎉' : 'إجابة خاطئة'}
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              💡 {question.explanation}
            </p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        {!showExplanation ? (
          <button
            onClick={submitAnswer}
            disabled={!currentAnswer}
            className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
              currentAnswer
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                : darkMode
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            تحقق من الإجابة
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
          >
            {session.currentIndex < session.questions.length - 1 ? (
              <>
                السؤال التالي
                <ChevronLeft className="w-5 h-5" />
              </>
            ) : (
              <>
                عرض النتائج
                <Trophy className="w-5 h-5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
