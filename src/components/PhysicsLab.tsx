import React, { useState, useEffect, useRef } from 'react';
import { 
  Atom, Zap, Lightbulb, Thermometer, Waves, Settings, 
  ChevronDown, ChevronRight, Star, Search, Play, Pause, 
  RotateCcw, Volume2, Send, Loader2, Trash2, Download,
  Heart, BarChart3, TrendingUp, Clock, Brain, ChevronLeft
} from 'lucide-react';
import { resolveApiUrl } from '../utils/apiBase';

// أنواع التجارب
interface Experiment {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  equations: string[];
  variables: Variable[];
  aiExplanation: string;
}

interface Variable {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  default: number;
  isResult?: boolean;
}

interface SimulationState {
  isPlaying: boolean;
  currentTime: number;
  maxTime: number;
  data: Record<string, number>;
}

// قائمة التجارب الفيزيائية
const experiments: Experiment[] = [
  {
    id: 'free-fall',
    name: 'السقوط الحر',
    category: 'ميكانيكا',
    icon: '🏃',
    description: 'محاكاة سقوط الأجسام تحت تأثير الجاذبية',
    equations: [
      'h = ½gt²',
      'v = gt',
      'KE = ½mv²',
      'PE = mgh'
    ],
    variables: [
      { name: 'height', label: 'الارتفاع', unit: 'm', min: 1, max: 100, default: 10 },
      { name: 'mass', label: 'الكتلة', unit: 'kg', min: 0.1, max: 100, default: 5 },
      { name: 'gravity', label: 'الجاذبية', unit: 'm/s²', min: 1, max: 25, default: 9.8 }
    ],
    aiExplanation: 'السقوط الحر هو حركة الجسم تحت تأثير الجاذبية فقط دون أي قوة خارجية. تتسارع الأجسام بمعدل ثابت g = 9.8 m/s² على سطح الأرض.'
  },
  {
    id: 'newtons-laws',
    name: 'قوانين نيوتن',
    category: 'ميكانيكا',
    icon: '⚖️',
    description: 'قانون نيوتن الثاني للحركة F = ma',
    equations: [
      'F = ma',
      'a = F/m',
      'v = at + v₀'
    ],
    variables: [
      { name: 'force', label: 'القوة', unit: 'N', min: 1, max: 1000, default: 100 },
      { name: 'mass', label: 'الكتلة', unit: 'kg', min: 1, max: 500, default: 50 }
    ],
    aiExplanation: 'قانون نيوتن الثاني ينص على أن القوة المؤثرة على جسم تتناسب طردياً مع كتلته وتسارعه. F = ma هو أحد أهم قوانين الفيزياء.'
  },
  {
    id: 'simple-harmonic',
    name: 'الحركة التوافقية البسيطة',
    category: 'ميكانيكا',
    icon: '🔄',
    description: 'حركة البندول والكتلة على نابض',
    equations: [
      'T = 2π√(m/k)',
      'x = A·sin(ωt)',
      'ω = √(k/m)'
    ],
    variables: [
      { name: 'amplitude', label: 'السعة', unit: 'm', min: 0.1, max: 10, default: 2 },
      { name: 'frequency', label: 'التردد', unit: 'Hz', min: 0.1, max: 10, default: 1 },
      { name: 'mass', label: 'الكتلة', unit: 'kg', min: 0.1, max: 10, default: 1 }
    ],
    aiExplanation: 'الحركة التوافقية البسيطة هي حركة دورية تتكرر فيها الحركة في اتجاهين متعاكسين حول موضع التوازن.'
  },
  {
    id: 'collision',
    name: 'التصادمات',
    category: 'ميكانيكا',
    icon: '💥',
    description: 'حفظ الطاقة والزخم في التصادمات',
    equations: [
      'm₁v₁ + m₂v₂ = m₁v₁\' + m₂v₂\'',
      'KE = ½mv²',
      'e = (v₂\' - v₁\')/(v₁ - v₂)'
    ],
    variables: [
      { name: 'mass1', label: 'كتلة الجسم 1', unit: 'kg', min: 1, max: 100, default: 10 },
      { name: 'mass2', label: 'كتلة الجسم 2', unit: 'kg', min: 1, max: 100, default: 5 },
      { name: 'velocity1', label: 'سرعة الجسم 1', unit: 'm/s', min: -20, max: 20, default: 10 },
      { name: 'velocity2', label: 'سرعة الجسم 2', unit: 'm/s', min: -20, max: 20, default: -5 }
    ],
    aiExplanation: 'التصادمات تحفظ الزخم الكلي للنظام. في التصادمات المرنة تحفظ الطاقة الحركية أيضاً.'
  },
  {
    id: 'ohms-law',
    name: 'قانون أوم',
    category: 'كهرباء',
    icon: '⚡',
    description: 'العلاقة بين الجهد والتيار والمقاومة',
    equations: [
      'V = IR',
      'P = VI',
      'R = ρL/A'
    ],
    variables: [
      { name: 'voltage', label: 'الجهد', unit: 'V', min: 1, max: 220, default: 12 },
      { name: 'current', label: 'التيار', unit: 'A', min: 0.1, max: 20, default: 2 },
      { name: 'resistance', label: 'المقاومة', unit: 'Ω', min: 1, max: 1000, default: 6 }
    ],
    aiExplanation: 'قانون أوم يربط بين الجهد والتيار والمقاومة في الدوائر الكهربائية. V = IR هو أساس تحليل الدوائر.'
  },
  {
    id: 'rc-circuit',
    name: 'دائرة RC',
    category: 'كهرباء',
    icon: '🔋',
    description: 'شحن وتفريغ المكثفات',
    equations: [
      'Vc = V₀(1 - e^(-t/RC))',
      'τ = RC',
      'Q = CV'
    ],
    variables: [
      { name: 'resistance', label: 'المقاومة', unit: 'Ω', min: 100, max: 10000, default: 1000 },
      { name: 'capacitance', label: 'السعة', unit: 'μF', min: 1, max: 1000, default: 100 },
      { name: 'voltage', label: 'الجهد', unit: 'V', min: 1, max: 24, default: 10 }
    ],
    aiExplanation: 'دوائر RC تستخدم في كثير من التطبيقات الإلكترونية. الثابت الزمني τ = RC يحدد سرعة الشحن والتفريغ.'
  },
  {
    id: 'refraction',
    name: 'انكسار الضوء',
    category: 'بصريات',
    icon: '💡',
    description: 'قانون سنيل للانكسار',
    equations: [
      'n₁·sin(θ₁) = n₂·sin(θ₂)',
      'n = c/v',
      'sin(θc) = n₂/n₁'
    ],
    variables: [
      { name: 'n1', label: 'معامل الانكسار 1', unit: '', min: 1, max: 2.5, default: 1 },
      { name: 'n2', label: 'معامل الانكسار 2', unit: '', min: 1, max: 2.5, default: 1.5 },
      { name: 'angle1', label: 'زاوية السقوط', unit: '°', min: 0, max: 89, default: 45 }
    ],
    aiExplanation: 'انكسار الضوء هو تغير اتجاه الشعاع الضوئي عند انتقاله بين وسطين مختلفين. قانون سنيل يصف هذا behavior.'
  },
  {
    id: 'lenses',
    name: 'العدسات والمرايا',
    category: 'بصريات',
    icon: '🔭',
    description: 'تكوين الصور بالعدسات',
    equations: [
      '1/f = 1/do + 1/di',
      'M = -di/do',
      'P = 1/f'
    ],
    variables: [
      { name: 'focalLength', label: 'البعد البؤري', unit: 'cm', min: 5, max: 50, default: 10 },
      { name: 'objectDistance', label: 'بعد الجسم', unit: 'cm', min: 5, max: 100, default: 20 }
    ],
    aiExplanation: 'العدسات المحدبة تجمع الضوء وتكوين صوراً حقيقية أو وهمية حسب بعد الجسم عن البؤرة.'
  },
  {
    id: 'waves',
    name: 'الأمواج والتداخل',
    category: 'بصريات',
    icon: '🌊',
    description: 'تداخل الأمواج والحيود',
    equations: [
      'v = fλ',
      'd·sin(θ) = mλ',
      'y = A·sin(kx - ωt)'
    ],
    variables: [
      { name: 'frequency', label: 'التردد', unit: 'Hz', min: 100, max: 10000, default: 1000 },
      { name: 'wavelength', label: 'الطول الموجي', unit: 'm', min: 0.01, max: 1, default: 0.34 }
    ],
    aiExplanation: 'الأمواج تنتقل الطاقة دون نقل المادة. التداخل ينتج عن التقاء موجتين في نفس النقطة.'
  },
  {
    id: 'thermodynamics',
    name: 'الديناميكا الحرارية',
    category: 'حرارة',
    icon: '🌡️',
    description: 'قوانين الديناميكا الحرارية',
    equations: [
      'Q = mcΔT',
      'PV = nRT',
      'ΔU = Q - W'
    ],
    variables: [
      { name: 'mass', label: 'الكتلة', unit: 'kg', min: 0.1, max: 10, default: 1 },
      { name: 'specificHeat', label: 'الحرارة النوعية', unit: 'J/kg·K', min: 100, max: 5000, default: 4186 },
      { name: 'tempChange', label: 'التغير في درجة الحرارة', unit: 'K', min: 1, max: 100, default: 20 }
    ],
    aiExplanation: 'الديناميكا الحرارية تدرس انتقال الحرارة وتحولاتها. القانون الأول يحفظ الطاقة الكلية.'
  },
  {
    id: 'gas-laws',
    name: 'قوانين الغازات',
    category: 'حرارة',
    icon: '💨',
    description: 'سلوك الغازات المثالية',
    equations: [
      'PV = nRT',
      'P₁V₁/T₁ = P₂V₂/T₂',
      'V/T = constant'
    ],
    variables: [
      { name: 'pressure', label: 'الضغط', unit: 'Pa', min: 10000, max: 500000, default: 101325 },
      { name: 'volume', label: 'الحجم', unit: 'L', min: 1, max: 100, default: 22.4 },
      { name: 'temperature', label: 'درجة الحرارة', unit: 'K', min: 100, max: 1000, default: 273 }
    ],
    aiExplanation: 'معادلة الغاز المثالي تربط بين الضغط والحجم ودرجة الحرارة وعدد المولات. وهي نموذج جيد للغازات الحقيقية عند ضغط منخفض.'
  },
  {
    id: 'radioactivity',
    name: 'النشاط الإشعاعي',
    category: 'فيزياء حديثة',
    icon: '☢️',
    description: 'تحلل المواد المشعة',
    equations: [
      'N = N₀e^(-λt)',
      't½ = ln(2)/λ',
      'A = λN'
    ],
    variables: [
      { name: 'initialAtoms', label: 'عدد الذرات الابتدائي', unit: '', min: 100, max: 10000, default: 1000 },
      { name: 'halfLife', label: 'عمر النصف', unit: 's', min: 1, max: 100, default: 10 },
      { name: 'time', label: 'الزمن', unit: 's', min: 0, max: 100, default: 5 }
    ],
    aiExplanation: 'النشاط الإشعاعي تحلل عشوائي للنوى غير المستقرة. عمر النصف هو الزمن اللازم لتحلل نصف الذرات.'
  },
  {
    id: 'photoelectric',
    name: 'التأثير الكهروضوئي',
    category: 'فيزياء حديثة',
    icon: '⚛️',
    description: 'إلكترونات تترك السطح المعدني',
    equations: [
      'KE = hf - φ',
      'f = c/λ',
      'λmax = hc/φ'
    ],
    variables: [
      { name: 'wavelength', label: 'الطول الموجي', unit: 'nm', min: 100, max: 1000, default: 500 },
      { name: 'workFunction', label: 'دالة الشغل', unit: 'eV', min: 1, max: 10, default: 4.5 }
    ],
    aiExplanation: 'التأثير الكهروضوئي يُظهر طبيعة الضوء كمادة (فوتونات). أينشتاين فسر هذه الظاهرة وحصل على جائزة نوبل.'
  },
  {
    id: 'momentum',
    name: 'الزخم الخطي',
    category: 'ميكانيكا',
    icon: '🚀',
    description: 'حفظ الزخم والتصادمات',
    equations: [
      'p = mv',
      'Δp = FΔt',
      'p₁ + p₂ = p₁\' + p₂\''
    ],
    variables: [
      { name: 'mass1', label: 'كتلة الجسم 1', unit: 'kg', min: 1, max: 100, default: 20 },
      { name: 'velocity1', label: 'سرعة الجسم 1', unit: 'm/s', min: 1, max: 50, default: 15 },
      { name: 'mass2', label: 'كتلة الجسم 2', unit: 'kg', min: 1, max: 100, default: 10 },
      { name: 'velocity2', label: 'سرعة الجسم 2', unit: 'm/s', min: 1, max: 50, default: 5 }
    ],
    aiExplanation: 'الزخم الخطي هو كمية الحركة التي يحملها الجسم. قانون حفظ الزخم ينطبق على كل الأنظمة المغلقة.'
  },
  {
    id: 'projectile',
    name: 'الحركة القذفية',
    category: 'ميكانيكا',
    icon: '🎯',
    description: 'حركة المقذوفات في مجال الجاذبية',
    equations: [
      'x = v₀cosθ·t',
      'y = v₀sinθ·t - ½gt²',
      'R = v₀²sin(2θ)/g'
    ],
    variables: [
      { name: 'velocity', label: 'السرعة الابتدائية', unit: 'm/s', min: 10, max: 100, default: 30 },
      { name: 'angle', label: 'زاوية الإطلاق', unit: '°', min: 0, max: 90, default: 45 }
    ],
    aiExplanation: 'الحركة القذفية تجمع بين حركة أفقية بسرعة ثابتة وحركة رأسية تحت تأثير الجاذبية.'
  }
];

// تصنيفات التجارب
const categories = [
  { id: 'all', name: 'الكل', icon: '🔬' },
  { id: 'ميكانيكا', name: 'ميكانيكا', icon: '⚙️' },
  { id: 'كهرباء', name: 'كهرباء', icon: '⚡' },
  { id: 'بصريات', name: 'بصريات', icon: '💡' },
  { id: 'حرارة', name: 'حرارة', icon: '🌡️' },
  { id: 'فيزياء حديثة', name: 'فيزياء حديثة', icon: '⚛️' }
];

export default function PhysicsLab() {
  // الحالات
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('physicsFavorites') || '[]');
    } catch { return []; }
  });
  
  // حالات المحاكاة
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);
  const [inputValues, setInputValues] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, number>>({});
  
  // حالات الذكاء الاصطناعي
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'مرحباً! أنا معلم الفيزياء الذكي 🤖\n\nاختر تجربة من القائمة وسأساعدك في فهمها وتطبيق المعادلات. يمكنك أيضاً سؤالي أي سؤال فيزيائي!' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // حالات الرسم البياني
  const [chartData, setChartData] = useState<{time: number, value: number}[]>([]);
  
  // Canvas ref for animation
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  // حفظ المفضلات
  useEffect(() => {
    localStorage.setItem('physicsFavorites', JSON.stringify(favorites));
  }, [favorites]);
  
  // تهيئة القيم عند اختيار تجربة
  useEffect(() => {
    if (selectedExperiment) {
      const defaults: Record<string, number> = {};
      selectedExperiment.variables.forEach(v => {
        defaults[v.name] = v.default;
      });
      setInputValues(defaults);
      setResults({});
      setChartData([]);
      setSimulationTime(0);
      setIsSimulating(false);
      
      // رسالة AI
      setAiMessages(prev => [
        ...prev,
        { role: 'assistant', content: `تم اختيار: ${selectedExperiment.name}\n\n${selectedExperiment.aiExplanation}\n\nأدخل البيانات وسأحسب لك النتائج!` }
      ]);
    }
  }, [selectedExperiment]);
  
  // رسم المحاكاة
  useEffect(() => {
    if (!selectedExperiment || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // مسح
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // رسم الحدود
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // رسم الأرضية
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(10, canvas.height - 60, canvas.width - 20, 50);
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(10, canvas.height - 60);
    ctx.lineTo(canvas.width - 10, canvas.height - 60);
    ctx.stroke();
    
    // رسم عنصر متحرك حسب نوع التجربة
    if (selectedExperiment.id === 'free-fall') {
      const progress = simulationTime / (results.time || 1);
      const y = 60 + (canvas.height - 120) * Math.min(progress, 1);
      const x = canvas.width / 2;
      
      // الجسم
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      
      // سهم السرعة
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 40 * progress);
      ctx.stroke();
      
      // نص السرعة
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(`v = ${(results.velocity || 0).toFixed(1)} m/s`, x + 30, y);
    } 
    else if (selectedExperiment.id === 'newtons-laws') {
      const progress = Math.min(simulationTime / 5, 1);
      const x = 100 + (canvas.width - 200) * progress;
      const y = canvas.height / 2;
      
      // الجسم
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(x - 30, y - 20, 60, 40);
      
      // القوة
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 30, y);
      ctx.lineTo(x - 30 - 60 * progress, y);
      ctx.stroke();
      
      // سهم القوة
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(x - 30 - 60 * progress, y);
      ctx.lineTo(x - 30 - 60 * progress + 10, y - 8);
      ctx.lineTo(x - 30 - 60 * progress + 10, y + 8);
      ctx.fill();
    }
    else if (selectedExperiment.id === 'simple-harmonic') {
      const t = simulationTime * Math.PI * 2;
      const amplitude = 80;
      const centerY = canvas.height / 2;
      
      // رسم الحركة التوافقية
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= simulationTime * 50; i++) {
        const x = 50 + i * 2;
        const y = centerY + amplitude * Math.sin(i * 0.2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      // الجسم
      const currentX = 50 + (simulationTime * 50 % (canvas.width - 100));
      const currentY = centerY + amplitude * Math.sin(simulationTime * Math.PI * 4);
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(currentX, currentY, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // خط التوازن
      ctx.strokeStyle = '#64748b';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width, centerY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    else if (selectedExperiment.id === 'ohms-law') {
      // رسم دائرة كهربائية بسيطة
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = 60;
      
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      
      // المقاومة
      ctx.fillStyle = '#78716c';
      ctx.fillRect(cx + r - 10, cy - 5, 20, 10);
      
      // التيار
      const currentAngle = (simulationTime * 2) % (Math.PI * 2);
      const bulletX = cx + r * Math.cos(currentAngle);
      const bulletY = cy + r * Math.sin(currentAngle);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(bulletX, bulletY, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // معلومات
      ctx.fillStyle = '#fff';
      ctx.font = '11px Arial';
      ctx.fillText(`V = ${inputValues.voltage?.toFixed(1) || 0}V`, cx - 30, cy + 80);
      ctx.fillText(`I = ${results.current?.toFixed(2) || 0}A`, cx - 30, cy + 95);
      ctx.fillText(`R = ${inputValues.resistance?.toFixed(0) || 0}Ω`, cx - 30, cy + 110);
    }
    else if (selectedExperiment.id === 'projectile') {
      const angle = (inputValues.angle || 45) * Math.PI / 180;
      const v0 = inputValues.velocity || 30;
      const g = 9.8;
      const t = simulationTime;
      
      // حساب الموضع
      const x = 50 + v0 * Math.cos(angle) * t * 3;
      const y = canvas.height - 60 - (v0 * Math.sin(angle) * t - 0.5 * g * t * t) * 3;
      
      // رسم المسار
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      for (let i = 0; i <= t; i += 0.1) {
        const px = 50 + v0 * Math.cos(angle) * i * 3;
        const py = canvas.height - 60 - (v0 * Math.sin(angle) * i - 0.5 * g * i * i) * 3;
        if (i === 0) ctx.beginPath();
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      
      // الجسم
      if (y > 60 && y < canvas.height - 60) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // معلومات
      ctx.fillStyle = '#fff';
      ctx.font = '11px Arial';
      ctx.fillText(`المدى: ${results.range?.toFixed(1) || 0}m`, 50, 30);
      ctx.fillText(`الارتفاع: ${results.maxHeight?.toFixed(1) || 0}m`, 50, 45);
    }
    else {
      // رسم عام لأي تجربة
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(selectedExperiment.icon, canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillText(selectedExperiment.name, canvas.width / 2, canvas.height / 2 + 20);
    }
  }, [simulationTime, selectedExperiment, inputValues, results]);
  
  // حلقة المحاكاة
  useEffect(() => {
    if (isSimulating) {
      const interval = setInterval(() => {
        setSimulationTime(prev => {
          const newTime = prev + 0.05;
          if (newTime > 10) {
            setIsSimulating(false);
            return 0;
          }
          return newTime;
        });
        
        // إضافة بيانات للرسوم البيانية
        if (selectedExperiment) {
          const newData = calculateResults(selectedExperiment, { ...inputValues, time: simulationTime });
          setChartData(prev => [...prev.slice(-50), { time: simulationTime, value: newData.velocity || newData.acceleration || simulationTime }]);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isSimulating, simulationTime, selectedExperiment, inputValues]);
  
  // حساب النتائج
  const calculateResults = (experiment: Experiment, values: Record<string, number>) => {
    const res: Record<string, number> = {};
    const gravity = 9.8;
    
    switch (experiment.id) {
      case 'free-fall':
        const h = values.height || 10;
        res.time = Math.sqrt(2 * h / gravity);
        res.velocity = gravity * res.time;
        res.kineticEnergy = 0.5 * (values.mass || 1) * res.velocity * res.velocity;
        res.potentialEnergy = (values.mass || 1) * gravity * h;
        break;
      case 'newtons-laws':
        const force = values.force || 100;
        const mass = values.mass || 50;
        res.acceleration = force / mass;
        res.velocity = res.acceleration * simulationTime;
        break;
      case 'ohms-law':
        const voltage = values.voltage || 12;
        const resistance = values.resistance || 6;
        res.current = voltage / resistance;
        res.power = voltage * res.current;
        break;
      case 'simple-harmonic':
        const amplitude = values.amplitude || 2;
        const freq = values.frequency || 1;
        res.displacement = amplitude * Math.sin(2 * Math.PI * freq * simulationTime);
        res.velocity = 2 * Math.PI * freq * amplitude * Math.cos(2 * Math.PI * freq * simulationTime);
        break;
      case 'projectile':
        const angle = (values.angle || 45) * Math.PI / 180;
        const v0 = values.velocity || 30;
        res.range = (v0 * v0 * Math.sin(2 * angle)) / gravity;
        res.maxHeight = (v0 * v0 * Math.sin(angle) * Math.sin(angle)) / (2 * gravity);
        res.time = (2 * v0 * Math.sin(angle)) / gravity;
        break;
      case 'thermodynamics':
        const massThermo = values.mass || 1;
        const specificHeat = values.specificHeat || 4186;
        const dT = values.tempChange || 20;
        res.heat = massThermo * specificHeat * dT;
        break;
      case 'gas-laws':
        const pressure = values.pressure || 101325;
        const volume = values.volume || 22.4;
        const temp = values.temperature || 273;
        const R = 8.314;
        res.moles = (pressure * volume) / (R * temp);
        break;
      case 'radioactivity':
        const N0 = values.initialAtoms || 1000;
        const halfLife = values.halfLife || 10;
        const time = values.time || 5;
        const lambda = Math.log(2) / halfLife;
        res.remaining = N0 * Math.exp(-lambda * time);
        res.decayed = N0 - res.remaining;
        break;
      default:
        res.value = Object.values(values).reduce((a, b) => a + b, 0) / Math.max(Object.values(values).length, 1);
    }
    
    return res;
  };
  
  // تشغيل المحاكاة
  const runSimulation = () => {
    if (!selectedExperiment) return;
    const newResults = calculateResults(selectedExperiment, inputValues);
    setResults(newResults);
    setIsSimulating(true);
    setChartData([]);
  };
  
  // إيقاف المحاكاة
  const stopSimulation = () => {
    setIsSimulating(false);
  };
  
  // إعادة تعيين
  const resetSimulation = () => {
    setIsSimulating(false);
    setSimulationTime(0);
    setChartData([]);
  };
  
  // إرسال رسالة للذكاء الاصطناعي
  const sendAiMessage = async () => {
    if (!aiInput.trim() || isAiLoading) return;
    
    const userMessage = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAiLoading(true);
    
    try {
      const response = await fetch(resolveApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-custom-api-key': localStorage.getItem('customAiKey') || '',
          'x-custom-provider': localStorage.getItem('aiProvider') || 'gemini'
        },
        body: JSON.stringify({
          message: `سؤال فيزيائي: ${userMessage}\n\n${selectedExperiment ? `التجربة الحالية: ${selectedExperiment.name}\nالمعادلات: ${selectedExperiment.equations.join(', ')}` : ''}`,
          context: 'أنت معلم فيزياء ذكي تساعد الطلاب في فهم التجارب الفيزيائية. أجب بالعربية بشكل واضح ومبسط مع استخدام المعادلات عند الحاجة.',
          history: aiMessages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        })
      });
      
      const data = await response.json();
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.response || 'عذراً، حدث خطأ. حاول مرة أخرى.' }]);
    } catch (error) {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، لا أستطيع الاتصال حالياً. تأكد من اتصالك بالإنترنت.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };
  
  // تبديل المفضلة
  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };
  
  // تصفية التجارب
  const filteredExperiments = experiments.filter(exp => {
    const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
    const matchesSearch = exp.name.includes(searchQuery) || exp.description.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });
  
  return (
    <div className="h-full flex flex-col bg-slate-900 text-white" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔬</span>
          <div>
            <h2 className="text-sm font-bold text-cyan-300">مختبر الفيزياء التفاعلي</h2>
            <p className="text-[10px] text-slate-400">
              {selectedExperiment ? `التجربة: ${selectedExperiment.name}` : 'اختر تجربة للبدء'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setSelectedExperiment(null)}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition"
        >
          {selectedExperiment ? '← اختيار تجربة أخرى' : ''}
        </button>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* القائمة الجانبية */}
        {!selectedExperiment && (
          <div className="w-72 border-l border-slate-700 flex flex-col bg-slate-800/30">
            {/* البحث */}
            <div className="p-3 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن تجربة..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-10 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
            
            {/* التصنيفات */}
            <div className="p-2 border-b border-slate-700 flex flex-wrap gap-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                    selectedCategory === cat.id 
                      ? 'bg-cyan-600 text-white' 
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
            
            {/* قائمة التجارب */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {/* المفضلة */}
              {favorites.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>المفضلة</span>
                  </div>
                  <div className="space-y-1">
                    {experiments.filter(e => favorites.includes(e.id)).map(exp => (
                      <button
                        key={exp.id}
                        onClick={() => setSelectedExperiment(exp)}
                        className="w-full p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-right transition flex items-center gap-2"
                      >
                        <span className="text-lg">{exp.icon}</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-200">{exp.name}</p>
                          <p className="text-[9px] text-slate-400">{exp.category}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* كل التجارب */}
              <div className="space-y-1">
                {filteredExperiments.map(exp => (
                  <button
                    key={exp.id}
                    onClick={() => setSelectedExperiment(exp)}
                    className={`w-full p-2.5 rounded-lg text-right transition flex items-center gap-3 ${
                      favorites.includes(exp.id) 
                        ? 'bg-amber-900/20 border border-amber-700/30' 
                        : 'bg-slate-800/50 hover:bg-slate-700 border border-transparent'
                    }`}
                  >
                    <span className="text-2xl">{exp.icon}</span>
                    <div className="flex-1 text-right">
                      <p className="text-xs font-bold text-slate-200">{exp.name}</p>
                      <p className="text-[9px] text-slate-400 line-clamp-1">{exp.description}</p>
                      <p className="text-[9px] text-cyan-500 mt-0.5">{exp.category}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(exp.id);
                      }}
                      className="p-1 hover:bg-slate-600 rounded transition"
                    >
                      <Star className={`w-4 h-4 ${favorites.includes(exp.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* منطقة العمل الرئيسية */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedExperiment ? (
            <>
              {/* منطقة المحاكاة */}
              <div className="p-3 border-b border-slate-700">
                <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-700">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full h-48"
                  />
                  <div className="flex items-center justify-center gap-3 p-2 bg-slate-900/50">
                    <button
                      onClick={isSimulating ? stopSimulation : runSimulation}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        isSimulating 
                          ? 'bg-red-600 hover:bg-red-500' 
                          : 'bg-cyan-600 hover:bg-cyan-500'
                      }`}
                    >
                      {isSimulating ? <><Pause className="w-3 h-3" /> إيقاف</> : <><Play className="w-3 h-3" /> تشغيل</>}
                    </button>
                    <button
                      onClick={resetSimulation}
                      className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" /> إعادة
                    </button>
                    <span className="text-xs text-slate-400 font-mono">
                      t = {simulationTime.toFixed(2)}s
                    </span>
                  </div>
                </div>
              </div>
              
              {/* جدول البيانات والذكاء الاصطناعي */}
              <div className="flex-1 flex overflow-hidden">
                {/* جدول البيانات */}
                <div className="w-72 border-l border-slate-700 p-3 overflow-y-auto">
                  <h3 className="text-xs font-bold text-cyan-300 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    إدخال البيانات
                  </h3>
                  
                  <div className="space-y-3">
                    {selectedExperiment.variables.map(variable => (
                      <div key={variable.name}>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          {variable.label} {variable.unit && `(${variable.unit})`}
                        </label>
                        <input
                          type="number"
                          value={inputValues[variable.name] || variable.default}
                          onChange={(e) => setInputValues(prev => ({
                            ...prev,
                            [variable.name]: parseFloat(e.target.value) || 0
                          }))}
                          min={variable.min}
                          max={variable.max}
                          step={(variable.max - variable.min) / 100}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                        />
                        <input
                          type="range"
                          value={inputValues[variable.name] || variable.default}
                          onChange={(e) => setInputValues(prev => ({
                            ...prev,
                            [variable.name]: parseFloat(e.target.value)
                          }))}
                          min={variable.min}
                          max={variable.max}
                          step={(variable.max - variable.min) / 100}
                          className="w-full mt-1 accent-cyan-500"
                        />
                      </div>
                    ))}
                    
                    <button
                      onClick={runSimulation}
                      className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      حساب النتائج
                    </button>
                  </div>
                  
                  {/* النتائج */}
                  {Object.keys(results).length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-xs font-bold text-green-300 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        النتائج
                      </h3>
                      <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                        {Object.entries(results).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">{getResultLabel(key)}</span>
                            <span className="text-green-400 font-mono font-bold">
                              {typeof value === 'number' ? value.toFixed(3) : value} {getResultUnit(key)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* المعادلات */}
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-2">
                      <Atom className="w-4 h-4" />
                      المعادلات
                    </h3>
                    <div className="bg-slate-800 rounded-lg p-3 space-y-1">
                      {selectedExperiment.equations.map((eq, i) => (
                        <p key={i} className="text-xs text-amber-200 font-mono">{eq}</p>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* الذكاء الاصطناعي */}
                <div className="flex-1 flex flex-col">
                  <div className="p-3 border-b border-slate-700 bg-slate-800/30">
                    <h3 className="text-xs font-bold text-purple-300 flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      المعلم الذكي
                    </h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {aiMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                        }`}>
                          {msg.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-sm' 
                            : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isAiLoading && (
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                          🤖
                        </div>
                        <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-sm border border-slate-700">
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            يكتب...
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 border-t border-slate-700">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendAiMessage()}
                        placeholder="اسأل عن هذه التجربة..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                      />
                      <button
                        onClick={sendAiMessage}
                        disabled={!aiInput.trim() || isAiLoading}
                        className="w-10 h-10 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 rounded-xl flex items-center justify-center transition"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* رسالة الترحيب */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">🔬</div>
                <h2 className="text-xl font-bold text-cyan-300 mb-2">مرحباً بك في مختبر الفيزياء!</h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  اختر تجربة فيزيائية من القائمة الجانبية للبدء في المحاكاة التفاعلية. 
                  يمكنك أيضاً التحدث مع المعلم الذكي لطرح أي سؤال.
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="text-2xl mb-1">⚙️</div>
                    <p className="text-slate-300 font-bold">15+ تجربة</p>
                    <p className="text-slate-500">متنوعة في كل الفروع</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="text-2xl mb-1">🤖</div>
                    <p className="text-slate-300 font-bold">معلم ذكي</p>
                    <p className="text-slate-500">يشرح كل شيء</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="text-2xl mb-1">📊</div>
                    <p className="text-slate-300 font-bold">محاكاة حية</p>
                    <p className="text-slate-500">برسوم متحركة</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="text-2xl mb-1">💾</div>
                    <p className="text-slate-300 font-bold">حفظ النتائج</p>
                    <p className="text-slate-500">تصدير وشارك</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// دوال مساعدة
function getResultLabel(key: string): string {
  const labels: Record<string, string> = {
    time: 'الوقت',
    velocity: 'السرعة',
    acceleration: 'التسارع',
    kineticEnergy: 'الطاقة الحركية',
    potentialEnergy: 'الطاقة الكامنة',
    current: 'التيار',
    power: 'القدرة',
    displacement: 'الإزاحة',
    range: 'المدى',
    maxHeight: 'أقصى ارتفاع',
    heat: 'الحرارة',
    moles: 'عدد المولات',
    remaining: 'الذرات المتبقية',
    decayed: 'الذرات المتحللة',
    value: 'القيمة'
  };
  return labels[key] || key;
}

function getResultUnit(key: string): string {
  const units: Record<string, string> = {
    time: 's',
    velocity: 'm/s',
    acceleration: 'm/s²',
    kineticEnergy: 'J',
    potentialEnergy: 'J',
    current: 'A',
    power: 'W',
    displacement: 'm',
    range: 'm',
    maxHeight: 'm',
    heat: 'J',
    moles: 'mol',
    remaining: '',
    decayed: ''
  };
  return units[key] || '';
}
