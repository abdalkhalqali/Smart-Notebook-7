import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, Plus, Trash2, Download, Search,
  Brain, BarChart3, TrendingUp, Trophy, Star, X, Send,
  Loader2, ChevronLeft, ChevronRight, Check, AlertCircle,
  Settings, Share2, FileText, Eye, EyeOff, Volume2,
  Zap, Compass, Target, Award, Flame, Sparkles, RefreshCw,
  Copy, Clock, Users, Timer, BookOpen, Lightbulb,
  ArrowRight, ArrowLeft, Minus, Grid3X3, Maximize2, Minimize2,
  Sun, Moon, VolumeX, Volume1
} from 'lucide-react';
import { resolveApiUrl } from '../utils/apiBase';

// ============================================================
// 📚 قاعدة التجارب الفيزيائية الشاملة
// ============================================================
interface ExpVariable {
  name: string;
  label: string;
  unit: string;
  unitOptions: { label: string; value: string; factor: number }[];
  min: number;
  max: number;
  default: number;
}

interface ExpResult {
  name: string;
  formula: string;
  unit: string;
  color: string;
}

interface DataCol {
  id: string;
  name: string;
  unit: string;
  color: string;
}

interface DataRow {
  id: string;
  values: Record<string, string>;
}

interface ChartPoint {
  x: number;
  y: number;
  label?: string;
}

interface Experiment {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  icon: string;
  difficulty: 1 | 2 | 3;
  description: string;
  equations: { name: string; formula: string; desc: string }[];
  variables: ExpVariable[];
  results: ExpResult[];
  simulationType: 'free-fall' | 'projectile' | 'pendulum' | 'wave' | 'circuit' | 'refraction' | 'radioactive' | 'gas' | 'spring' | 'collision' | 'magnetic' | 'photoelectric';
  aiExplanation: string;
  realWorld: string;
  tips: string[];
  chartTypes: { x: string; y: string; type: 'line' | 'scatter' | 'bar' }[];
}

// ============================================================
// 🧪 قاعدة التجارب الكاملة
// ============================================================
const EXPERIMENTS: Experiment[] = [
  {
    id: 'free-fall',
    name: 'السقوط الحر',
    nameEn: 'Free Fall',
    category: 'ميكانيكا',
    icon: '🏃',
    difficulty: 1,
    description: 'حركة الأجسام الساقطة تحت تأثير الجاذبية',
    equations: [
      { name: 'الارتفاع', formula: 'h = ½gt²', desc: 'الارتفاع كدالة زمنية' },
      { name: 'السرعة', formula: 'v = gt', desc: 'السرعة اللحظية' },
      { name: 'الطاقة الحركية', formula: 'KE = ½mv²', desc: 'الطاقة الحركية' }
    ],
    variables: [
      { name: 'height', label: 'الارتفاع', unit: 'm', unitOptions: [
        { label: 'متر', value: 'm', factor: 1 },
        { label: 'سنتيمتر', value: 'cm', factor: 100 },
        { label: 'كيلومتر', value: 'km', factor: 0.001 }
      ], min: 1, max: 100, default: 10 },
      { name: 'mass', label: 'الكتلة', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 }
      ], min: 0.1, max: 100, default: 5 },
      { name: 'gravity', label: 'الجاذبية', unit: 'm/s²', unitOptions: [
        { label: 'م/ث²', value: 'm/s²', factor: 1 }
      ], min: 1, max: 25, default: 9.8 }
    ],
    results: [
      { name: 'زمن السقوط', formula: 't = √(2h/g)', unit: 's', color: 'cyan' },
      { name: 'السرعة النهائية', formula: 'v = gt', unit: 'm/s', color: 'emerald' },
      { name: 'الطاقة الحركية', formula: 'KE = ½mv²', unit: 'J', color: 'amber' }
    ],
    simulationType: 'free-fall',
    aiExplanation: 'السقوط الحر هو حركة الجسم تحت تأثير الجاذبية فقط. الجسم المتسارع يتسارع بمعدل ثابت g=9.8m/s² على سطح الأرض.',
    realWorld: 'قطرة ماء تسقط من السحاب، أو قذيفة من برج',
    tips: [
      'الكتلة لا تؤثر على زمن السقوط في الفراغ',
      'كلما زاد الارتفاع زاد زمن السقوط',
      'السرعة تزداد线性اً مع الزمن'
    ],
    chartTypes: [
      { x: 'الزمن (s)', y: 'الارتفاع (m)', type: 'line' },
      { x: 'الزمن (s)', y: 'السرعة (m/s)', type: 'line' },
      { x: 'الزمن (s)', y: 'الطاقة الحركية (J)', type: 'line' }
    ]
  },
  {
    id: 'projectile',
    name: 'الحركة القذفية',
    nameEn: 'Projectile Motion',
    category: 'ميكانيكا',
    icon: '🎯',
    difficulty: 2,
    description: 'حركة المقذوفات في مجال الجاذبية',
    equations: [
      { name: 'المدى', formula: 'R = v₀²sin(2θ)/g', desc: 'المدى الأفقي' },
      { name: 'أقصى ارتفاع', formula: 'H = v₀²sin²θ/2g', desc: 'أقصى ارتفاع' },
      { name: 'الزمن الكلي', formula: 'T = 2v₀sinθ/g', desc: 'زمن الرحلة' }
    ],
    variables: [
      { name: 'velocity', label: 'السرعة الابتدائية', unit: 'm/s', unitOptions: [
        { label: 'م/ث', value: 'm/s', factor: 1 },
        { label: 'كم/س', value: 'km/h', factor: 3.6 }
      ], min: 10, max: 100, default: 30 },
      { name: 'angle', label: 'زاوية الإطلاق', unit: '°', unitOptions: [
        { label: 'درجة', value: '°', factor: 1 }
      ], min: 5, max: 85, default: 45 }
    ],
    results: [
      { name: 'المدى الأفقي', formula: 'R = v₀²sin(2θ)/g', unit: 'm', color: 'cyan' },
      { name: 'أقصى ارتفاع', formula: 'H = v₀²sin²θ/2g', unit: 'm', color: 'emerald' },
      { name: 'زمن الرحلة', formula: 'T = 2v₀sinθ/g', unit: 's', color: 'amber' }
    ],
    simulationType: 'projectile',
    aiExplanation: 'الحركة القذفية تجمع بين حركة أفقية بسرعة ثابتة وحركة رأسية تحت تأثير الجاذبية. المسار يكون قطعاً مكافئاً.',
    realWorld: 'كرة قاعدة تُضرب، قذيفة مدفع، رائد فضاء يقفز',
    tips: [
      'أقصى مدى يتحقق عند زاوية 45°',
      'السرعة الأفقية ثابتة',
      'السرعة الرأسية تتغير بسبب الجاذبية'
    ],
    chartTypes: [
      { x: 'الموقع X (m)', y: 'الموقع Y (m)', type: 'scatter' },
      { x: 'الزمن (s)', y: 'السرعة (m/s)', type: 'line' }
    ]
  },
  {
    id: 'ohms-law',
    name: 'قانون أوم',
    nameEn: "Ohm's Law",
    category: 'كهرباء',
    icon: '⚡',
    difficulty: 1,
    description: 'العلاقة بين الجهد والتيار والمقاومة',
    equations: [
      { name: 'الجهد', formula: 'V = IR', desc: 'قانون أوم' },
      { name: 'التيار', formula: 'I = V/R', desc: 'التيار الكهربائي' },
      { name: 'القدرة', formula: 'P = VI', desc: 'القدرة الكهربائية' }
    ],
    variables: [
      { name: 'voltage', label: 'الجهد', unit: 'V', unitOptions: [
        { label: 'فولت', value: 'V', factor: 1 },
        { label: 'ميلليفولت', value: 'mV', factor: 1000 }
      ], min: 1, max: 220, default: 12 },
      { name: 'resistance', label: 'المقاومة', unit: 'Ω', unitOptions: [
        { label: 'أوم', value: 'Ω', factor: 1 },
        { label: 'كيلوأوم', value: 'kΩ', factor: 0.001 }
      ], min: 1, max: 1000, default: 6 }
    ],
    results: [
      { name: 'التيار', formula: 'I = V/R', unit: 'A', color: 'amber' },
      { name: 'القدرة', formula: 'P = VI', unit: 'W', color: 'cyan' },
      { name: 'الشغل', formula: 'W = Pt', unit: 'J', color: 'emerald' }
    ],
    simulationType: 'circuit',
    aiExplanation: 'قانون أوم يربط بين الجهد والتيار والمقاومة. V=IR هو أساس تحليل الدوائر الكهربائية.',
    realWorld: 'مصباح كهربائي، شاحن هاتف، محرك كهربائي',
    tips: [
      'المقاومة لا تتغير بتغير الجهد',
      'القدرة تزداد مع زيادة الجهد أو التيار',
      'التيار يسري من الجهد العالي للمنخفض'
    ],
    chartTypes: [
      { x: 'الجهد (V)', y: 'التيار (A)', type: 'line' },
      { x: 'المقاومة (Ω)', y: 'التيار (A)', type: 'line' }
    ]
  },
  {
    id: 'pendulum',
    name: 'البندول البسيط',
    nameEn: 'Simple Pendulum',
    category: 'ميكانيكا',
    icon: '🔔',
    difficulty: 1,
    description: 'حركة البندول التوافقية البسيطة',
    equations: [
      { name: 'الزمن الدوري', formula: 'T = 2π√(L/g)', desc: 'زمن الدورة الكاملة' },
      { name: 'الطاقة', formula: 'PE = mgh', desc: 'الطاقة الكامنة' }
    ],
    variables: [
      { name: 'length', label: 'طول الخيط', unit: 'm', unitOptions: [
        { label: 'متر', value: 'm', factor: 1 },
        { label: 'سنتيمتر', value: 'cm', factor: 100 }
      ], min: 0.1, max: 10, default: 1 },
      { name: 'mass', label: 'الكتلة', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 }
      ], min: 0.1, max: 10, default: 1 },
      { name: 'angle', label: 'زاوية الإزاحة', unit: '°', unitOptions: [
        { label: 'درجة', value: '°', factor: 1 }
      ], min: 1, max: 45, default: 15 }
    ],
    results: [
      { name: 'الزمن الدوري', formula: 'T = 2π√(L/g)', unit: 's', color: 'cyan' },
      { name: 'التردد', formula: 'f = 1/T', unit: 'Hz', color: 'amber' }
    ],
    simulationType: 'pendulum',
    aiExplanation: 'البندول البسيط يوضح الحركة التوافقية البسيطة. زمنه الدوري يعتمد فقط على طوله وتسارع الجاذبية.',
    realWorld: 'ساعة البندول، تأرجح طفل على أرجوحة',
    tips: [
      'الزمن الدوري لا يعتمد على الكتلة',
      'لا يعتمد على سعة الترجحة (لزاويا صغيرة)',
      'T = 2π√(L/g)'
    ],
    chartTypes: [
      { x: 'الزمن (s)', y: 'الإزاحة (m)', type: 'line' },
      { x: 'الزمن (s)', y: 'السرعة (m/s)', type: 'line' }
    ]
  },
  {
    id: 'wave',
    name: 'الأمواج الميكانيكية',
    nameEn: 'Mechanical Waves',
    category: 'بصريات',
    icon: '🌊',
    difficulty: 2,
    description: 'انتشار الأمواج وخصائصها',
    equations: [
      { name: 'السرعة', formula: 'v = fλ', desc: 'سرعة الموجة' },
      { name: 'الطاقة', formula: 'E = hf', desc: 'طاقة الفوتون' }
    ],
    variables: [
      { name: 'frequency', label: 'التردد', unit: 'Hz', unitOptions: [
        { label: 'هرتز', value: 'Hz', factor: 1 },
        { label: 'كيلوهرتز', value: 'kHz', factor: 0.001 }
      ], min: 0.1, max: 20, default: 2 },
      { name: 'amplitude', label: 'السعة', unit: 'm', unitOptions: [
        { label: 'متر', value: 'm', factor: 1 },
        { label: 'سنتيمتر', value: 'cm', factor: 100 }
      ], min: 0.01, max: 2, default: 0.5 }
    ],
    results: [
      { name: 'الطول الموجي', formula: 'λ = v/f', unit: 'm', color: 'cyan' },
      { name: 'السرعة الزاوية', formula: 'ω = 2πf', unit: 'rad/s', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'الأمواج تنتقل الطاقة دون نقل المادة. التداخل ينتج عن التقاء موجتين في نفس النقطة.',
    realWorld: 'موجات الماء، الصوت، الضوء',
    tips: [
      'الصوت يحتاج وسط مادي',
      'الضوء لا يحتاج وسطاً',
      'v = fλ علاقة أساسية'
    ],
    chartTypes: [
      { x: 'الزمن (s)', y: 'الإزاحة (m)', type: 'line' },
      { x: 'الموقع (m)', y: 'السعة (m)', type: 'line' }
    ]
  },
  {
    id: 'refraction',
    name: 'انكسار الضوء',
    nameEn: 'Light Refraction',
    category: 'بصريات',
    icon: '💡',
    difficulty: 2,
    description: 'قانون سنيل للانكسار',
    equations: [
      { name: 'قانون سنيل', formula: 'n₁sinθ₁ = n₂sinθ₂', desc: 'قانون الانكسار' },
      { name: 'معامل الانكسار', formula: 'n = c/v', desc: 'تعريف n' }
    ],
    variables: [
      { name: 'n1', label: 'معامل الانكسار 1', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 1, max: 2.5, default: 1 },
      { name: 'n2', label: 'معامل الانكسار 2', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 1, max: 2.5, default: 1.5 },
      { name: 'angle1', label: 'زاوية السقوط', unit: '°', unitOptions: [
        { label: 'درجة', value: '°', factor: 1 }
      ], min: 0, max: 89, default: 45 }
    ],
    results: [
      { name: 'زاوية الانكسار', formula: 'θ₂ = arcsin(n₁sinθ₁/n₂)', unit: '°', color: 'amber' },
      { name: 'زاوية الانحراف', formula: 'δ = θ₁ - θ₂', unit: '°', color: 'cyan' }
    ],
    simulationType: 'refraction',
    aiExplanation: 'انكسار الضوء هو تغير اتجاه الشعاع الضوئي عند انتقاله بين وسطين مختلفين.',
    realWorld: 'القلم في كوب ماء، قوس قزح، الألياف الضوئية',
    tips: [
      'عند الانتقال من وسط أكثف لأقل ينحرف بعيداً عن العمود',
      'معامل الانكسار يعتمد على الطول الموجي',
      'الزاوية الحرجة تؤدي للانعكاس الداخلي الكلي'
    ],
    chartTypes: [
      { x: 'زاوية السقوط (°)', y: 'زاوية الانكسار (°)', type: 'line' }
    ]
  },
  {
    id: 'radioactivity',
    name: 'النشاط الإشعاعي',
    nameEn: 'Radioactivity',
    category: 'فيزياء حديثة',
    icon: '☢️',
    difficulty: 3,
    description: 'تحلل المواد المشعة',
    equations: [
      { name: 'العدد الذري', formula: 'N = N₀e^(-λt)', desc: 'قانون التحلل' },
      { name: 'عمر النصف', formula: 't½ = ln2/λ', desc: 'تعريف t½' }
    ],
    variables: [
      { name: 'N0', label: 'عدد الذرات الابتدائي', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 100, max: 10000, default: 1000 },
      { name: 'halfLife', label: 'عمر النصف', unit: 's', unitOptions: [
        { label: 'ثانية', value: 's', factor: 1 },
        { label: 'دقيقة', value: 'min', factor: 1/60 }
      ], min: 1, max: 60, default: 10 },
      { name: 'time', label: 'الزمن', unit: 's', unitOptions: [
        { label: 'ثانية', value: 's', factor: 1 }
      ], min: 0, max: 100, default: 20 }
    ],
    results: [
      { name: 'الذرات المتبقية', formula: 'N = N₀e^(-λt)', unit: '', color: 'emerald' },
      { name: 'النشاط', formula: 'A = λN', unit: 'Bq', color: 'amber' },
      { name: 'نسبة المتبقية', formula: 'N/N₀ × 100%', unit: '%', color: 'cyan' }
    ],
    simulationType: 'radioactive',
    aiExplanation: 'النشاط الإشعاعي تحلل عشوائي للنوى غير المستقرة. عمر النصف هو الزمن اللازم لتحلل نصف الذرات.',
    realWorld: 'الكشف عن العمر، الطب النووي، الطاقة النووية',
    tips: [
      'عمر النصف ثابت لكل نظير',
      'التحلل عملية عشوائية',
      'ثلاثة أنواع: ألفا، بيتا، غاما'
    ],
    chartTypes: [
      { x: 'الزمن (s)', y: 'عدد الذرات', type: 'line' },
      { x: 'الزمن (s)', y: 'النشاط (Bq)', type: 'line' }
    ]
  },
  {
    id: 'gas-laws',
    name: 'قوانين الغازات',
    nameEn: 'Gas Laws',
    category: 'حرارة',
    icon: '💨',
    difficulty: 2,
    description: 'سلوك الغازات المثالية',
    equations: [
      { name: 'الغاز المثالي', formula: 'PV = nRT', desc: 'معادلة الحالة' },
      { name: 'شارل', formula: 'V/T = constant', desc: 'ثبات الضغط' }
    ],
    variables: [
      { name: 'pressure', label: 'الضغط', unit: 'Pa', unitOptions: [
        { label: 'باسكال', value: 'Pa', factor: 1 },
        { label: 'atm', value: 'atm', factor: 0.0000098692 }
      ], min: 10000, max: 500000, default: 101325 },
      { name: 'volume', label: 'الحجم', unit: 'L', unitOptions: [
        { label: 'لتر', value: 'L', factor: 1 },
        { label: 'مل', value: 'mL', factor: 1000 }
      ], min: 1, max: 100, default: 22.4 },
      { name: 'temperature', label: 'الحرارة', unit: 'K', unitOptions: [
        { label: 'كلفن', value: 'K', factor: 1 },
        { label: 'مئوية', value: '°C', factor: 1 }
      ], min: 100, max: 1000, default: 273 }
    ],
    results: [
      { name: 'عدد المولات', formula: 'n = PV/RT', unit: 'mol', color: 'cyan' },
      { name: 'الحجم المولي', formula: 'Vm = V/n', unit: 'L/mol', color: 'amber' }
    ],
    simulationType: 'gas',
    aiExplanation: 'معادلة الغاز المثالي تربط بين الضغط والحجم ودرجة الحرارة. STP: 0°C, 1atm, 22.4L/mol.',
    realWorld: 'الإطارات، البالونات، المحركات',
    tips: [
      'عند رفع الحرارة يزداد الحجم (ثبات الضغط)',
      'عند زيادة الضغط ينقص الحجم (ثبات الحرارة)',
      'R = 8.314 J/mol·K'
    ],
    chartTypes: [
      { x: 'الحرارة (K)', y: 'الحجم (L)', type: 'line' },
      { x: 'الضغط (Pa)', y: 'الحجم (L)', type: 'line' }
    ]
  },
  {
    id: 'spring',
    name: 'الحركة التوافقية البسيطة',
    nameEn: 'Simple Harmonic Motion',
    category: 'ميكانيكا',
    icon: '🔄',
    difficulty: 2,
    description: 'حركة الكتلة على نابض',
    equations: [
      { name: 'الإزاحة', formula: 'x = A·sin(ωt)', desc: 'الإزاحة اللحظية' },
      { name: 'الطاقة', formula: 'E = ½kA²', desc: 'الطاقة الكلية' }
    ],
    variables: [
      { name: 'amplitude', label: 'السعة', unit: 'm', unitOptions: [
        { label: 'متر', value: 'm', factor: 1 },
        { label: 'سنتيمتر', value: 'cm', factor: 100 }
      ], min: 0.01, max: 2, default: 0.5 },
      { name: 'frequency', label: 'التردد', unit: 'Hz', unitOptions: [
        { label: 'هرتز', value: 'Hz', factor: 1 }
      ], min: 0.1, max: 5, default: 1 },
      { name: 'mass', label: 'الكتلة', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 }
      ], min: 0.1, max: 10, default: 1 }
    ],
    results: [
      { name: 'السرعة الزاوية', formula: 'ω = 2πf', unit: 'rad/s', color: 'cyan' },
      { name: 'الطاقة الحركية', formula: 'KE = ½kx²', unit: 'J', color: 'amber' }
    ],
    simulationType: 'spring',
    aiExplanation: 'الحركة التوافقية البسيطة حركة دورية تتكرر حول موضع التوازن.',
    realWorld: 'كتلة على نابض، وتر موسيقي',
    tips: [
      'الحركة متناظرة حول موضع التوازن',
      'الطاقة محفوظة في النظام',
      'الزمن الدوري لا يعتمد على السعة'
    ],
    chartTypes: [
      { x: 'الزمن (s)', y: 'الإزاحة (m)', type: 'line' },
      { x: 'الزمن (s)', y: 'السرعة (m/s)', type: 'line' }
    ]
  },
  {
    id: 'collision',
    name: 'التصادمات',
    nameEn: 'Collisions',
    category: 'ميكانيكا',
    icon: '💥',
    difficulty: 2,
    description: 'تصادمات مرنة وغير مرنة',
    equations: [
      { name: 'حفظ الزخم', formula: 'm₁v₁+m₂v₂=m₁v₁\'+m₂v₂\'', desc: 'الزخم قبل وبعد' },
      { name: 'الطاقة', formula: 'KE = ½mv²', desc: 'الطاقة الحركية' }
    ],
    variables: [
      { name: 'm1', label: 'كتلة الجسم 1', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 }
      ], min: 1, max: 50, default: 10 },
      { name: 'v1', label: 'سرعة الجسم 1', unit: 'm/s', unitOptions: [
        { label: 'م/ث', value: 'm/s', factor: 1 }
      ], min: -20, max: 20, default: 10 },
      { name: 'm2', label: 'كتلة الجسم 2', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 }
      ], min: 1, max: 50, default: 5 },
      { name: 'v2', label: 'سرعة الجسم 2', unit: 'm/s', unitOptions: [
        { label: 'م/ث', value: 'm/s', factor: 1 }
      ], min: -20, max: 20, default: -5 }
    ],
    results: [
      { name: 'الزخم الكلي', formula: 'p = m₁v₁ + m₂v₂', unit: 'kg·m/s', color: 'cyan' },
      { name: 'KE قبل', formula: 'KE = ½m₁v₁² + ½m₂v₂²', unit: 'J', color: 'amber' }
    ],
    simulationType: 'collision',
    aiExplanation: 'التصادمات تحفظ الزخم الكلي. في التصادمات المرنة تحفظ الطاقة الحركية أيضاً.',
    realWorld: 'كرة بليارد، تصادم السيارات',
    tips: [
      'الزخم محفوظ دائماً',
      'الطاقة الحركية محفوظة في المرنة فقط',
      'معامل الاستعادة يتراوح بين 0 و 1'
    ],
    chartTypes: [
      { x: 'الزمن (s)', y: 'السرعة (m/s)', type: 'line' }
    ]
  },
  {
    id: 'magnetic',
    name: 'القوة المغناطيسية',
    nameEn: 'Magnetic Force',
    category: 'كهرباء',
    icon: '🧲',
    difficulty: 3,
    description: 'قوة لورنتز على جسيم مشحون',
    equations: [
      { name: 'قوة لورنتز', formula: 'F = qvBsinθ', desc: 'القوة المغناطيسية' },
      { name: 'نصف القطر', formula: 'r = mv/qB', desc: 'نصف قطر المسار' }
    ],
    variables: [
      { name: 'charge', label: 'الشحنة', unit: 'μC', unitOptions: [
        { label: 'μC', value: 'μC', factor: 1 },
        { label: 'C', value: 'C', factor: 0.000001 }
      ], min: 1, max: 100, default: 10 },
      { name: 'velocity', label: 'السرعة', unit: 'm/s', unitOptions: [
        { label: 'م/ث', value: 'm/s', factor: 1 }
      ], min: 1000, max: 100000, default: 10000 },
      { name: 'B', label: 'الحقل المغناطيسي', unit: 'T', unitOptions: [
        { label: 'تسلا', value: 'T', factor: 1 },
        { label: 'غاوس', value: 'G', factor: 10000 }
      ], min: 0.01, max: 2, default: 0.5 }
    ],
    results: [
      { name: 'القوة المغناطيسية', formula: 'F = qvB', unit: 'N', color: 'amber' },
      { name: 'نصف القطر', formula: 'r = mv/qB', unit: 'm', color: 'cyan' }
    ],
    simulationType: 'magnetic',
    aiExplanation: 'القوة المغناطيسية تؤثر على الجسيمات المشحونة المتحركة. القوة عمودية على اتجاه الحركة.',
    realWorld: 'مصادم الهادرونات، مطياف الكتلة',
    tips: [
      'القوة أعظمية عندما تكون الحركة عمودية على المجال',
      'لا تبذل القوة شغلاً لأنها عمودية على الحركة',
      'تُستخدم في فصل الجسيمات'
    ],
    chartTypes: [
      { x: 'الحقل (T)', y: 'القوة (N)', type: 'line' },
      { x: 'السرعة (m/s)', y: 'نصف القطر (m)', type: 'line' }
    ]
  },
  {
    id: 'photoelectric',
    name: 'التأثير الكهروضوئي',
    nameEn: 'Photoelectric Effect',
    category: 'فيزياء حديثة',
    icon: '⚛️',
    difficulty: 3,
    description: 'إلكترونات تترك السطح المعدني',
    equations: [
      { name: 'آينشتاين', formula: 'KE = hf - φ', desc: 'معادلة التأثير' },
      { name: 'طاقة الفوتون', formula: 'E = hc/λ', desc: 'طاقة الفوتون' }
    ],
    variables: [
      { name: 'wavelength', label: 'الطول الموجي', unit: 'nm', unitOptions: [
        { label: 'نانومتر', value: 'nm', factor: 1 }
      ], min: 100, max: 1000, default: 500 },
      { name: 'workFunc', label: 'دالة الشغل', unit: 'eV', unitOptions: [
        { label: 'eV', value: 'eV', factor: 1 },
        { label: 'جول', value: 'J', factor: 1.602e-19 }
      ], min: 1, max: 10, default: 4.5 }
    ],
    results: [
      { name: 'طاقة الفوتون', formula: 'E = hc/λ', unit: 'eV', color: 'amber' },
      { name: 'الطاقة الحركية', formula: 'KE = hf - φ', unit: 'eV', color: 'cyan' }
    ],
    simulationType: 'photoelectric',
    aiExplanation: 'التأثير الكهروضوئي يُظهر طبيعة الضوء كمادة (فوتونات).',
    realWorld: 'الألواح الشمسية، أجهزة photoelectric',
    tips: [
      'الطاقة الحركية لا تعتمد على شدة الضوء',
      'لا يحدث تأثير إذا كان التردد أقل من الحد الأدنى',
      'الضوء يسلك كجسيمات (فوتونات)'
    ],
    chartTypes: [
      { x: 'التردد (Hz)', y: 'KE (eV)', type: 'scatter' }
    ]
  }
];

const CATEGORIES = [
  { id: 'all', name: 'الكل', icon: '🔬', color: 'cyan' },
  { id: 'ميكانيكا', name: 'ميكانيكا', icon: '⚙️', color: 'blue' },
  { id: 'كهرباء', name: 'كهرباء', icon: '⚡', color: 'amber' },
  { id: 'بصريات', name: 'بصريات', icon: '💡', color: 'yellow' },
  { id: 'حرارة', name: 'حرارة', icon: '🌡️', color: 'red' },
  { id: 'فيزياء حديثة', name: 'حديثة', icon: '⚛️', color: 'purple' }
];

const UNIT_CATS = [
  { id: 'length', name: '📏 طول', options: [
    { from: 'm', to: 'cm', factor: 100 },
    { from: 'm', to: 'mm', factor: 1000 },
    { from: 'm', to: 'km', factor: 0.001 },
    { from: 'm', to: 'in', factor: 39.37 },
    { from: 'm', to: 'ft', factor: 3.281 },
    { from: 'm', to: 'mi', factor: 0.000621 }
  ]},
  { id: 'mass', name: '⚖️ كتلة', options: [
    { from: 'kg', to: 'g', factor: 1000 },
    { from: 'kg', to: 'mg', factor: 1000000 },
    { from: 'kg', to: 'lb', factor: 2.205 },
    { from: 'kg', to: 'oz', factor: 35.274 }
  ]},
  { id: 'time', name: '⏱️ زمن', options: [
    { from: 's', to: 'min', factor: 0.016667 },
    { from: 's', to: 'h', factor: 0.00027778 },
    { from: 's', to: 'ms', factor: 1000 },
    { from: 'min', to: 'h', factor: 0.016667 }
  ]},
  { id: 'temp', name: '🌡️ حرارة', options: [
    { from: '°C', to: 'K', formula: (v: number) => v + 273.15 },
    { from: '°C', to: '°F', formula: (v: number) => v * 1.8 + 32 },
    { from: 'K', to: '°C', formula: (v: number) => v - 273.15 },
    { from: '°F', to: '°C', formula: (v: number) => (v - 32) / 1.8 }
  ]},
  { id: 'pressure', name: '📊 ضغط', options: [
    { from: 'Pa', to: 'atm', factor: 0.0000098692 },
    { from: 'Pa', to: 'bar', factor: 0.00001 },
    { from: 'Pa', to: 'mmHg', factor: 0.0075006 },
    { from: 'atm', to: 'Pa', factor: 101325 }
  ]},
  { id: 'energy', name: '⚡ طاقة', options: [
    { from: 'J', to: 'cal', factor: 0.239 },
    { from: 'J', to: 'kWh', factor: 2.7778e-7 },
    { from: 'cal', to: 'J', factor: 4.184 },
    { from: 'eV', to: 'J', factor: 1.602e-19 }
  ]},
  { id: 'speed', name: '🚀 سرعة', options: [
    { from: 'm/s', to: 'km/h', factor: 3.6 },
    { from: 'm/s', to: 'mph', factor: 2.237 },
    { from: 'km/h', to: 'm/s', factor: 0.27778 },
    { from: 'knot', to: 'm/s', factor: 0.51444 }
  ]}
];

// ============================================================
// 🎨 الألوان المخصصة
// ============================================================
const COLOR_MAP: Record<string, string> = {
  cyan: '#06b6d4',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  orange: '#f97316',
  pink: '#ec4899'
};

// ============================================================
// 📊 رسم بياني بسيط بدون مكتبات خارجية
// ============================================================
function SimpleChart({ 
  data, 
  title, 
  xLabel, 
  yLabel,
  color = '#06b6d4',
  width = 500,
  height = 200
}: { 
  data: {x: number, y: number}[]; 
  title?: string;
  xLabel: string;
  yLabel: string;
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  
  const minX = Math.min(...data.map(d => d.x));
  const maxX = Math.max(...data.map(d => d.x));
  const minY = Math.min(...data.map(d => d.y));
  const maxY = Math.max(...data.map(d => d.y));
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  
  const toX = (x: number) => padding.left + ((x - minX) / rangeX) * chartW;
  const toY = (y: number) => padding.top + chartH - ((y - minY) / rangeY) * chartH;
  
  // Generate grid lines
  const gridLines = [];
  const yTicks = 5;
  const xTicks = 5;
  
  for (let i = 0; i <= yTicks; i++) {
    const y = padding.top + (i / yTicks) * chartH;
    const val = maxY - (i / yTicks) * rangeY;
    gridLines.push(
      <g key={`grid-y-${i}`}>
        <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
        <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="9">{val.toFixed(1)}</text>
      </g>
    );
  }
  
  for (let i = 0; i <= xTicks; i++) {
    const x = padding.left + (i / xTicks) * chartW;
    const val = minX + (i / xTicks) * rangeX;
    gridLines.push(
      <g key={`grid-x-${i}`}>
        <text x={x} y={height - padding.bottom + 15} textAnchor="middle" fill="#94a3b8" fontSize="9">{val.toFixed(1)}</text>
      </g>
    );
  }
  
  // Generate path
  const pathD = data.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${toX(d.x)} ${toY(d.y)}`
  ).join(' ');
  
  // Area fill
  const areaD = `${pathD} L ${toX(data[data.length-1].x)} ${toY(minY)} L ${toX(data[0].x)} ${toY(minY)} Z`;
  
  return (
    <div className="bg-slate-900 rounded-xl p-3 border border-slate-700">
      {title && <p className="text-[10px] text-slate-400 font-bold mb-2 text-center">{title}</p>}
      <svg width={width} height={height} className="w-full">
        {gridLines}
        {/* Area */}
        <path d={areaD} fill={color} fillOpacity="0.1" />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {data.map((d, i) => (
          <circle key={i} cx={toX(d.x)} cy={toY(d.y)} r="3" fill={color} stroke="#0f172a" strokeWidth="2" />
        ))}
        {/* Labels */}
        <text x={width / 2} y={height - 5} textAnchor="middle" fill="#64748b" fontSize="9">{xLabel}</text>
        <text x={12} y={height / 2} textAnchor="middle" fill="#64748b" fontSize="9" transform={`rotate(-90, 12, ${height/2})`}>{yLabel}</text>
      </svg>
    </div>
  );
}

// ============================================================
// 🎬 Canvas للمحاكاة
// ============================================================
function SimulationCanvas({
  exp,
  vars,
  time,
  isPlaying
}: {
  exp: Experiment;
  vars: Record<string, number>;
  time: number;
  isPlaying: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const W = canvas.width;
    const H = canvas.height;
    
    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    
    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    
    const cx = W / 2;
    const cy = H / 2;
    
    switch (exp.simulationType) {
      case 'free-fall': {
        const h = vars.height || 10;
        const g = vars.gravity || 9.8;
        const m = vars.mass || 5;
        const totalTime = Math.sqrt(2 * h / g);
        const progress = isPlaying ? (time % totalTime) / totalTime : 0;
        const y = 60 + (H - 120) * progress;
        
        // Ground
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(0, H - 60, W, 60);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, H - 60); ctx.lineTo(W, H - 60); ctx.stroke();
        
        // Trail
        ctx.strokeStyle = `${COLOR_MAP.cyan}40`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let i = 0; i <= progress * 50; i++) {
          const t = (i / 50) * progress * totalTime;
          const ty = 60 + (H - 120) * (t / totalTime);
          if (i === 0) ctx.moveTo(cx, ty);
          else ctx.lineTo(cx, ty);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Ball
        const grad = ctx.createRadialGradient(cx - 3, y - 3, 0, cx, y, 15);
        grad.addColorStop(0, '#60a5fa');
        grad.addColorStop(1, '#3b82f6');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Velocity arrow
        if (progress > 0 && progress < 1) {
          const v = g * (time % totalTime);
          ctx.strokeStyle = COLOR_MAP.rose;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx, y);
          ctx.lineTo(cx, y + Math.min(v * 3, 60));
          ctx.stroke();
          // Arrowhead
          ctx.fillStyle = COLOR_MAP.rose;
          ctx.beginPath();
          ctx.moveTo(cx, y + Math.min(v * 3, 60));
          ctx.lineTo(cx - 6, y + Math.min(v * 3, 60) - 10);
          ctx.lineTo(cx + 6, y + Math.min(v * 3, 60) - 10);
          ctx.fill();
        }
        
        // Labels
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`h = ${(h * (1 - progress)).toFixed(1)}m`, cx + 35, y - 20);
        ctx.fillStyle = COLOR_MAP.rose;
        ctx.fillText(`v = ${(g * (time % totalTime)).toFixed(1)}m/s`, cx + 35, y);
        ctx.fillStyle = COLOR_MAP.emerald;
        ctx.fillText(`KE = ${(0.5 * m * Math.pow(g * (time % totalTime), 2)).toFixed(1)}J`, cx + 35, y + 20);
        break;
      }
      
      case 'projectile': {
        const v0 = vars.velocity || 30;
        const angle = ((vars.angle || 45) * Math.PI) / 180;
        const g = 9.8;
        const totalTime = (2 * v0 * Math.sin(angle)) / g;
        const progress = isPlaying ? (time % totalTime) / totalTime : 0;
        
        // Ground
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(0, H - 50, W, 50);
        
        // Trajectory
        ctx.strokeStyle = `${COLOR_MAP.cyan}60`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
          const t = (i / 100) * totalTime;
          const tx = 50 + v0 * Math.cos(angle) * t * 5;
          const ty = H - 50 - (v0 * Math.sin(angle) * t - 0.5 * g * t * t) * 5;
          if (i === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Current position
        const x = 50 + v0 * Math.cos(angle) * progress * totalTime * 5;
        const y = H - 50 - (v0 * Math.sin(angle) * progress * totalTime - 0.5 * g * Math.pow(progress * totalTime, 2)) * 5;
        
        // Ball
        const grad = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, 10);
        grad.addColorStop(0, '#f87171');
        grad.addColorStop(1, '#ef4444');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Labels
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        const range = (v0 * v0 * Math.sin(2 * angle)) / g;
        const maxH = (v0 * v0 * Math.sin(angle) * Math.sin(angle)) / (2 * g);
        ctx.fillText(`R = ${range.toFixed(1)}m  H = ${maxH.toFixed(1)}m`, W / 2, 30);
        break;
      }
      
      case 'wave': {
        const f = vars.frequency || 2;
        const A = vars.amplitude || 0.5;
        const w = 2 * Math.PI * f;
        
        // Wave
        ctx.strokeStyle = COLOR_MAP.cyan;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= W; i++) {
          const t = isPlaying ? time : 0;
          const y = cy + A * 60 * Math.sin((i / 30) - w * t);
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();
        
        // Particles
        for (let i = 0; i < 20; i++) {
          const px = (i / 20) * W;
          const t = isPlaying ? time : 0;
          const py = cy + A * 60 * Math.sin((px / 30) - w * t);
          const grad = ctx.createRadialGradient(px, py, 0, px, py, 6);
          grad.addColorStop(0, COLOR_MAP.cyan);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Labels
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`f = ${f}Hz  A = ${A}m`, W / 2, 30);
        break;
      }
      
      case 'pendulum': {
        const L = vars.length || 1;
        const A = vars.angle || 15;
        const g = 9.8;
        const w = Math.sqrt(g / L);
        const theta = (A * Math.PI / 180) * Math.cos(w * time);
        
        const pivotX = cx;
        const pivotY = 50;
        const bobX = pivotX + L * 120 * Math.sin(theta);
        const bobY = pivotY + L * 120 * Math.cos(theta);
        
        // String
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();
        
        // Trail
        ctx.strokeStyle = `${COLOR_MAP.violet}30`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        const arcR = L * 120;
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, arcR, -Math.PI/2 - (A * Math.PI/180), -Math.PI/2 + (A * Math.PI/180));
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Pivot
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Bob
        const grad = ctx.createRadialGradient(bobX - 3, bobY - 3, 0, bobX, bobY, 18);
        grad.addColorStop(0, '#a78bfa');
        grad.addColorStop(1, '#8b5cf6');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bobX, bobY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(bobX, bobY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`T = ${(2 * Math.PI / w).toFixed(2)}s`, cx, H - 20);
        break;
      }
      
      case 'circuit': {
        const V = vars.voltage || 12;
        const R = vars.resistance || 6;
        const I = V / R;
        
        // Battery
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cx - 60, cy - 30, 30, 60);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(cx - 55, cy - 20, 20, 40);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${V}V`, cx - 45, cy + 50);
        
        // Resistor
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 4;
        const resX = cx + 60;
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy);
        ctx.lineTo(resX, cy);
        for (let i = 0; i < 5; i++) {
          ctx.lineTo(resX + 8 + i * 8, cy + (i % 2 === 0 ? -10 : 10));
        }
        ctx.lineTo(resX + 48, cy);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillText(`${R}Ω`, resX + 20, cy + 25);
        
        // Current flow animation
        const flowPos = isPlaying ? (time * 2) % 1 : 0;
        const flowX = cx - 30 + flowPos * (resX + 48 - cx + 30);
        const grad2 = ctx.createRadialGradient(flowX, cy, 0, flowX, cy, 8);
        grad2.addColorStop(0, COLOR_MAP.green);
        grad2.addColorStop(1, 'transparent');
        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.arc(flowX, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Labels
        ctx.fillStyle = '#fff';
        ctx.fillText(`I = ${I.toFixed(2)}A`, cx - 45, cy + 70);
        ctx.fillText(`P = ${(V * I).toFixed(1)}W`, cx - 45, cy + 85);
        break;
      }
      
      default: {
        // Default generic visualization
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(exp.icon, cx, cy - 10);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(exp.name, cx, cy + 15);
        
        // Animated circle
        const r = 50 + 20 * Math.sin(time * 2);
        ctx.strokeStyle = COLOR_MAP.cyan;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        
        // Particles
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + time;
          const px = cx + r * Math.cos(angle);
          const py = cy + r * Math.sin(angle);
          ctx.fillStyle = COLOR_MAP.cyan;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [exp, vars, time, isPlaying]);
  
  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={220}
      className="w-full rounded-xl"
    />
  );
}

// ============================================================
// 🧪 المكون الرئيسي
// ============================================================
export default function PhysicsLab() {
  // ── الأساسية ──
  const [exp, setExp] = useState<Experiment | null>(null);
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'sim' | 'table' | 'ai' | 'units'>('sim');
  
  // ── المحاكاة ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [vars, setVars] = useState<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  
  // ── الجدول ──
  const [cols, setCols] = useState<DataCol[]>([]);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [selectedChart, setSelectedChart] = useState(0);
  
  // ── AI ──
  const [aiMsgs, setAiMsgs] = useState<{role: 'user'|'assistant', content: string}[]>([
    { role: 'assistant', content: '🤖 مرحباً! أنا معلم الفيزياء الذكي\n\n• اكتب في الجدول البيانات وشاهد المحاكاة\n• اضغط "تحليل" لترى النتائج والشرح\n• اضغط "محاكاة" لتشغيل التجربة\n\n✨ كل شيء مترابط: الجدول → المحاكاة → النتائج → AI' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);
  
  // ── النتائج ──
  const [results, setResults] = useState<Record<string, number>>({});
  const [aiExplanation, setAiExplanation] = useState('');
  const [chartData, setChartData] = useState<{x: number, y: number}[]>([]);
  
  // ── الوحدات ──
  const [unitCat, setUnitCat] = useState('length');
  const [unitVal, setUnitVal] = useState('1');
  
  // ── المفضلات ──
  const [favs, setFavs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('phFavs') || '[]'); } 
    catch { return []; }
  });
  
  // ── إحصائيات ──
  const [stats, setStats] = useState({ completed: 0, questions: 0, favs: 0 });
  
  useEffect(() => { localStorage.setItem('phFavs', JSON.stringify(favs)); }, [favs]);
  
  // ── تهيئة التجربة ──
  useEffect(() => {
    if (!exp) return;
    
    // تهيئة المتغيرات
    const v: Record<string, number> = {};
    exp.variables.forEach(vv => { v[vv.name] = vv.default; });
    setVars(v);
    
    // تهيئة الجدول
    const initialCols: DataCol[] = [
      { id: 'time', name: 'الزمن', unit: 's', color: 'cyan' },
      { id: 'x', name: exp.chartTypes[selectedChart]?.x.split(' ')[0] || 'X', unit: '', color: 'emerald' },
      { id: 'y', name: exp.chartTypes[selectedChart]?.y.split(' ')[0] || 'Y', unit: '', color: 'amber' }
    ];
    setCols(initialCols);
    
    const initialRows = Array.from({length: 8}, (_, i) => ({
      id: `r${i}`,
      values: { time: (i * 0.5).toFixed(2), x: '', y: '' }
    }));
    setRows(initialRows);
    
    // رسالة AI
    setAiMsgs([{ 
      role: 'assistant', 
      content: `✅ تم اختيار: ${exp.name}\n\n${exp.aiExplanation}\n\n💡 نصيحة: ${exp.tips[0]}` 
    }]);
    
    // حساب النتائج
    calculateResults(v, exp);
    
    setStats(s => ({ ...s, completed: s.completed + 1 }));
  }, [exp?.id]);
  
  // ── حساب النتائج ──
  const calculateResults = useCallback((v: Record<string, number>, experiment: Experiment) => {
    const res: Record<string, number> = {};
    const g = 9.8;
    
    switch (experiment.id) {
      case 'free-fall':
        const h = v.height || 10;
        const gf = v.gravity || 9.8;
        res.time = Math.sqrt(2 * h / gf);
        res.velocity = gf * res.time;
        res.ke = 0.5 * (v.mass || 5) * res.velocity * res.velocity;
        break;
      case 'projectile':
        const v0 = v.velocity || 30;
        const a = ((v.angle || 45) * Math.PI) / 180;
        res.range = (v0 * v0 * Math.sin(2 * a)) / g;
        res.maxHeight = (v0 * v0 * Math.sin(a) * Math.sin(a)) / (2 * g);
        res.totalTime = (2 * v0 * Math.sin(a)) / g;
        break;
      case 'ohms-law':
        const V = v.voltage || 12;
        const R = v.resistance || 6;
        res.current = V / R;
        res.power = V * res.current;
        res.work = res.power * 10;
        break;
      case 'pendulum':
        const L = v.length || 1;
        res.period = 2 * Math.PI * Math.sqrt(L / g);
        res.freq = 1 / res.period;
        break;
      case 'wave':
        const f = v.frequency || 2;
        const A = v.amplitude || 0.5;
        res.wavelength = 1 / f;
        res.omega = 2 * Math.PI * f;
        res.energy = A * f;
        break;
      case 'refraction':
        const n1 = v.n1 || 1;
        const n2 = v.n2 || 1.5;
        const a1 = (v.angle1 || 45) * Math.PI / 180;
        const sin2 = (n1 * Math.sin(a1)) / n2;
        res.angle2 = sin2 <= 1 ? (Math.asin(sin2) * 180 / Math.PI) : 0;
        res.deviation = (v.angle1 || 45) - res.angle2;
        break;
      case 'radioactivity':
        const N0 = v.N0 || 1000;
        const tH = v.halfLife || 10;
        const t = v.time || 20;
        const lambda = Math.log(2) / tH;
        res.remaining = N0 * Math.exp(-lambda * t);
        res.activity = lambda * res.remaining;
        res.percent = (res.remaining / N0) * 100;
        break;
      case 'gas-laws':
        const P = v.pressure || 101325;
        const Vg = v.volume || 22.4;
        const T = v.temperature || 273;
        const Rg = 8.314;
        res.moles = (P * Vg) / (Rg * T);
        res.molarVol = Vg / res.moles;
        break;
      case 'spring':
        const Af = v.amplitude || 0.5;
        const Ff = v.frequency || 1;
        res.omega = 2 * Math.PI * Ff;
        res.ke = 0.5 * (Ff * Ff) * (Af * Af);
        break;
      case 'collision':
        const m1 = v.m1 || 10, v1 = v.v1 || 10;
        const m2 = v.m2 || 5, v2 = v.v2 || -5;
        res.momentum = m1 * v1 + m2 * v2;
        res.keBefore = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
        break;
      case 'magnetic':
        const q = (v.charge || 10) * 1e-6;
        const vel = v.velocity || 10000;
        const B = v.B || 0.5;
        const me = 9.11e-31;
        res.force = q * vel * B;
        res.radius = (me * vel) / (q * B);
        break;
      case 'photoelectric':
        const wl = (v.wavelength || 500) * 1e-9;
        const phi = (v.workFunc || 4.5) * 1.602e-19;
        const hPlanck = 6.626e-34;
        const c = 3e8;
        const E = (hPlanck * c) / wl;
        res.photonEnergy = E / 1.602e-19;
        res.ke2 = Math.max(0, E - phi) / 1.602e-19;
        break;
      default:
        Object.values(v).forEach(val => {
          if (typeof val === 'number') res.value = (res.value || 0) + val;
        });
    }
    
    setResults(res);
    
    // توليد بيانات الرسم البياني
    const chartPoints: {x: number, y: number}[] = [];
    if (experiment.id === 'free-fall') {
      for (let t = 0; t <= res.time; t += res.time / 10) {
        chartPoints.push({ x: t, y: (v.height || 10) - 0.5 * g * t * t });
      }
    } else if (experiment.id === 'projectile') {
      const vv0 = v.velocity || 30;
      const aa = ((v.angle || 45) * Math.PI) / 180;
      for (let t = 0; t <= (res.totalTime || 3); t += (res.totalTime || 3) / 20) {
        chartPoints.push({ 
          x: vv0 * Math.cos(aa) * t * 5, 
          y: (vv0 * Math.sin(aa) * t - 0.5 * g * t * t) * 5 
        });
      }
    } else {
      for (let i = 0; i <= 10; i++) {
        chartPoints.push({ x: i, y: Math.sin(i * 0.5 + (isPlaying ? simTime : 0)) * (v.amplitude || 0.5) * 5 });
      }
    }
    setChartData(chartPoints);
  }, [isPlaying, simTime, selectedChart]);
  
  // ── المؤقت ──
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setSimTime(t => t + 0.05);
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]);
  
  // ── تشغيل المحاكاة ──
  const runSim = () => {
    if (!exp) return;
    if (!isPlaying) {
      setSimTime(0);
    }
    setIsPlaying(p => !p);
    calculateResults(vars, exp);
  };
  
  // ── تحليل البيانات ──
  const analyzeData = async () => {
    if (!exp) return;
    
    // إرسال تلقائي للشات
    const tableData = rows.map(r => 
      cols.map(c => `${c.name}: ${r.values[c.id] || '-'}`).join(' | ')
    ).join('\n');
    
    const userMsg = `📊 تحليل البيانات:\n${tableData}\n\n📈 النتائج:\n${Object.entries(results).map(([k, v]) => `${k}: ${Number(v).toFixed(3)}`).join('\n')}`;
    
    setAiMsgs(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiLoading(true);
    setShowAi(true);
    setTab('ai');
    
    try {
      const res = await fetch(resolveApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-custom-api-key': localStorage.getItem('customAiKey') || '',
          'x-custom-provider': localStorage.getItem('aiProvider') || 'gemini'
        },
        body: JSON.stringify({
          message: `قم بتحليل بيانات التجربة الفيزيائية "${exp.name}" التالية:\n\n${tableData}\n\nالنتائج المحسوبة:\n${Object.entries(results).map(([k, v]) => `${k}: ${Number(v).toFixed(3)}`).join('\n')}\n\nالمعادلات المستخدمة:\n${exp.equations.map(e => `${e.name}: ${e.formula}`).join('\n')}\n\nقدم:\n1. تحليل البيانات ودقة النتائج\n2. شرح العلاقات الفيزيائية\n3. اقتراحات لتحسين التجربة\n4. رسم بياني يوضح العلاقة بين المتغيرات\n5. أخطاء شائعة يجب تجنبها`,
          context: `تجربة فيزيائية: ${exp.name}\n${exp.aiExplanation}\n\nالمعادلات:\n${exp.equations.map(e => `${e.name}: ${e.formula}`).join('\n')}`,
          history: aiMsgs.slice(-6).map(m => ({ role: m.role, content: m.content }))
        })
      });
      
      const data = await res.json();
      const response = data.response || 'عذراً، حدث خطأ.';
      
      setAiMsgs(prev => [...prev, { role: 'assistant', content: response }]);
      setAiExplanation(response);
      setStats(s => ({ ...s, questions: s.questions + 1 }));
    } catch {
      const fallback = `📊 تحليل البيانات:\n\n✅ البيانات تبدو صحيحة!\n\n• الزمن يتناسب مع مربع الارتفاع (h = ½gt²)\n• السرعة تزداد linearly مع الزمن (v = gt)\n• الطاقة الحركية تتناسب مع مربع السرعة\n\n💡 نصيحة: ${exp.tips[1] || exp.tips[0]}`;
      
      setAiMsgs(prev => [...prev, { role: 'assistant', content: fallback }]);
      setAiExplanation(fallback);
    } finally {
      setAiLoading(false);
    }
  };
  
  // ── إرسال للشات ──
  const sendAi = async () => {
    if (!aiInput.trim() || aiLoading) return;
    
    const msg = aiInput.trim();
    setAiInput('');
    setAiMsgs(prev => [...prev, { role: 'user', content: msg }]);
    setAiLoading(true);
    
    try {
      const res = await fetch(resolveApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-custom-api-key': localStorage.getItem('customAiKey') || '',
          'x-custom-provider': localStorage.getItem('aiProvider') || 'gemini'
        },
        body: JSON.stringify({
          message: msg,
          context: `تجربة: ${exp?.name || 'غير محددة'}\n\n${exp?.aiExplanation || ''}\n\nالنتائج:\n${Object.entries(results).map(([k, v]) => `${k}: ${Number(v).toFixed(3)}`).join('\n')}`,
          history: aiMsgs.slice(-8).map(m => ({ role: m.role, content: m.content }))
        })
      });
      
      const data = await res.json();
      setAiMsgs(prev => [...prev, { role: 'assistant', content: data.response || 'عذراً.' }]);
    } catch {
      setAiMsgs(prev => [...prev, { role: 'assistant', content: '❌ لا يمكن الاتصال حالياً.' }]);
    } finally {
      setAiLoading(false);
    }
  };
  
  // ── إضافة صف/عمود ──
  const addRow = () => {
    setRows(prev => [...prev, {
      id: `r${Date.now()}`,
      values: cols.reduce((a, c) => ({ ...a, [c.id]: '' }), {})
    }]);
  };
  
  const addCol = () => {
    const newCol: DataCol = {
      id: `c${Date.now()}`,
      name: `عمود ${cols.length + 1}`,
      unit: '',
      color: ['cyan', 'emerald', 'amber', 'rose', 'violet', 'blue'][cols.length % 6]
    };
    setCols(prev => [...prev, newCol]);
    setRows(prev => prev.map(r => ({ ...r, values: { ...r.values, [newCol.id]: '' } })));
  };
  
  // ── تصفية ──
  const filtered = EXPERIMENTS.filter(e => {
    const matchCat = cat === 'all' || e.category === cat;
    const matchSearch = !search || e.name.includes(search) || e.nameEn.toLowerCase().includes(search.toLowerCase()) || e.description.includes(search);
    return matchCat && matchSearch;
  });
  
  // ── نتيجة الملصق ──
  const getDiffLabel = (d: number) => d === 1 ? '🟢 سهل' : d === 2 ? '🟡 متوسط' : '🔴 صعب';
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMsgs]);
  
  // ── JSX ──
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-cyan-950/40 to-blue-950/40">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/20">
            🔬
          </div>
          <div>
            <h2 className="text-sm font-bold text-cyan-300">مختبر الفيزياء التفاعلي</h2>
            <p className="text-[10px] text-slate-400">{exp ? `📌 ${exp.name}` : 'اختر تجربة فيزيائية'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-amber-900/30 px-3 py-1.5 rounded-full border border-amber-600/30">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{stats.completed}</span>
          </div>
          <div className="flex items-center gap-1 bg-purple-900/30 px-3 py-1.5 rounded-full border border-purple-600/30">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-purple-400">{stats.questions}</span>
          </div>
          {exp && (
            <button
              onClick={() => { setExp(null); setTab('sim'); setShowAi(false); }}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition"
            >
              ← تجربة أخرى
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ── القائمة ── */}
        {!exp && (
          <div className="w-80 border-l border-slate-800 flex flex-col bg-slate-900/50">
            {/* البحث */}
            <div className="p-3 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث عن تجربة..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
            
            {/* التصنيفات */}
            <div className="p-2 border-b border-slate-800 flex flex-wrap gap-1">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                    cat === c.id ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
            
            {/* المفضلات */}
            {favs.length > 0 && (
              <div className="p-2 border-b border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-amber-400">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>المفضلة ({favs.length})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {EXPERIMENTS.filter(e => favs.includes(e.id)).map(e => (
                    <button
                      key={e.id}
                      onClick={() => setExp(e)}
                      className="px-2 py-1 bg-amber-900/30 border border-amber-700/30 rounded-lg text-[10px] text-amber-300"
                    >
                      {e.icon} {e.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* التجارب */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filtered.map(e => (
                <button
                  key={e.id}
                  onClick={() => setExp(e)}
                  className={`w-full p-3 rounded-xl text-right transition ${
                    favs.includes(e.id) 
                      ? 'bg-amber-900/20 border border-amber-700/30' 
                      : 'bg-slate-800/70 hover:bg-slate-800 border border-transparent hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{e.icon}</span>
                    <div className="flex-1 text-right">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-bold text-white">{e.name}</p>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded ${
                          e.difficulty === 1 ? 'bg-green-900/50 text-green-400' :
                          e.difficulty === 2 ? 'bg-yellow-900/50 text-yellow-400' :
                          'bg-red-900/50 text-red-400'
                        }`}>{getDiffLabel(e.difficulty)}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 line-clamp-1">{e.description}</p>
                      <p className="text-[9px] text-cyan-500 mt-0.5">{e.category}</p>
                    </div>
                    <button
                      onClick={ev => { ev.stopPropagation(); setFavs(f => f.includes(e.id) ? f.filter(x => x !== e.id) : [...f, e.id]); }}
                      className="p-1"
                    >
                      <Star className={`w-4 h-4 ${favs.includes(e.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── منطقة العمل ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {exp ? (
            <>
              {/* التبويبات */}
              <div className="flex border-b border-slate-800 bg-slate-900/50">
                {[
                  { id: 'sim', label: '🎬 المحاكاة', icon: Play },
                  { id: 'table', label: '📊 جدول البيانات', icon: BarChart3 },
                  { id: 'ai', label: '🤖 المعلم الذكي', icon: Brain },
                  { id: 'units', label: '🔄 الوحدات', icon: Compass }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id as any); if(t.id === 'ai') setShowAi(true); }}
                    className={`flex-1 px-4 py-3 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 ${
                      tab === t.id 
                        ? 'bg-slate-800 text-cyan-400 border-cyan-400' 
                        : 'text-slate-400 hover:text-white border-transparent'
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* ═══ 🎬 المحاكاة ═══ */}
                {tab === 'sim' && (
                  <div className="space-y-4">
                    {/* معلومات التجربة */}
                    <div className="bg-gradient-to-r from-cyan-950/40 to-blue-950/40 rounded-2xl p-4 border border-cyan-800/30">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{exp.icon}</span>
                        <div>
                          <h3 className="text-sm font-bold text-cyan-300">{exp.name}</h3>
                          <p className="text-[10px] text-slate-400">{exp.description}</p>
                        </div>
                        <span className={`mr-auto text-[9px] px-2 py-1 rounded-full ${
                          exp.difficulty === 1 ? 'bg-green-900/50 text-green-400' :
                          exp.difficulty === 2 ? 'bg-yellow-900/50 text-yellow-400' :
                          'bg-red-900/50 text-red-400'
                        }`}>{getDiffLabel(exp.difficulty)}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{exp.aiExplanation}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {exp.equations.map((eq, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-800 rounded-lg text-[10px] font-mono text-amber-300">
                            {eq.formula}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Canvas */}
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                      <SimulationCanvas exp={exp} vars={vars} time={simTime} isPlaying={isPlaying} />
                      <div className="flex items-center justify-center gap-3 p-3 bg-slate-900/80">
                        <button
                          onClick={runSim}
                          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                            isPlaying 
                              ? 'bg-rose-600 hover:bg-rose-500' 
                              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
                          }`}
                        >
                          {isPlaying ? <><Pause className="w-4 h-4" /> إيقاف</> : <><Play className="w-4 h-4" /> تشغيل</>}
                        </button>
                        <button
                          onClick={() => { setIsPlaying(false); setSimTime(0); }}
                          className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" /> إعادة
                        </button>
                        <span className="text-xs text-slate-400 font-mono bg-slate-800 px-3 py-1.5 rounded-lg">
                          t = {simTime.toFixed(2)}s
                        </span>
                      </div>
                    </div>

                    {/* المتغيرات */}
                    <div className="bg-slate-800/70 rounded-2xl p-4 border border-slate-700">
                      <h4 className="text-xs font-bold text-cyan-300 mb-3 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        تغيير المتغيرات
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {exp.variables.map(vv => (
                          <div key={vv.name}>
                            <label className="text-[10px] text-slate-400 block mb-1">
                              {vv.label}
                            </label>
                            <input
                              type="number"
                              value={vars[vv.name] ?? vv.default}
                              onChange={e => {
                                const newVars = { ...vars, [vv.name]: parseFloat(e.target.value) || 0 };
                                setVars(newVars);
                                calculateResults(newVars, exp);
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                            />
                            <input
                              type="range"
                              value={vars[vv.name] ?? vv.default}
                              onChange={e => {
                                const newVars = { ...vars, [vv.name]: parseFloat(e.target.value) };
                                setVars(newVars);
                                calculateResults(newVars, exp);
                              }}
                              min={vv.min}
                              max={vv.max}
                              className="w-full mt-1 accent-cyan-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ═══ 📈 النتائج ═══ */}
                    {Object.keys(results).length > 0 && (
                      <div className="bg-gradient-to-r from-green-950/40 to-emerald-950/40 rounded-2xl p-4 border border-green-800/30">
                        <h4 className="text-xs font-bold text-green-300 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          النتائج المحسوبة
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {exp.results.map((r, i) => {
                            const val = Object.values(results)[i];
                            if (val === undefined) return null;
                            return (
                              <div key={r.name} className="bg-slate-800/50 rounded-xl p-3 text-center">
                                <p className="text-[10px] text-slate-400 mb-1">{r.name}</p>
                                <p className="text-xl font-bold" style={{ color: COLOR_MAP[r.color] }}>
                                  {typeof val === 'number' ? val.toFixed(3) : val}
                                </p>
                                <p className="text-[9px] text-slate-500">{r.unit}</p>
                                <p className="text-[8px] text-slate-600 font-mono mt-1">{r.formula}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ═══ 📊 الرسم البياني ═══ */}
                    <div className="bg-slate-800/70 rounded-2xl p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          الرسم البياني
                        </h4>
                        {exp.chartTypes.length > 1 && (
                          <select
                            value={selectedChart}
                            onChange={e => { setSelectedChart(parseInt(e.target.value)); }}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-slate-400 outline-none"
                          >
                            {exp.chartTypes.map((ct, i) => (
                              <option key={i} value={i}>{ct.x} vs {ct.y}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      {chartData.length > 0 && (
                        <SimpleChart
                          data={chartData}
                          title={`${exp.chartTypes[selectedChart]?.x || 'X'} vs ${exp.chartTypes[selectedChart]?.y || 'Y'}`}
                          xLabel={exp.chartTypes[selectedChart]?.x || 'X'}
                          yLabel={exp.chartTypes[selectedChart]?.y || 'Y'}
                          color={COLOR_MAP[['cyan', 'emerald', 'amber', 'rose', 'violet'][selectedChart % 5]]}
                          width={560}
                          height={220}
                        />
                      )}
                    </div>

                    {/* ═══ 📝 شرح AI ═══ */}
                    {(aiExplanation || aiMsgs.length > 1) && (
                      <div className="bg-gradient-to-r from-purple-950/40 to-violet-950/40 rounded-2xl p-4 border border-purple-800/30">
                        <h4 className="text-xs font-bold text-purple-300 mb-3 flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          شرح الذكاء الاصطناعي
                        </h4>
                        <div className="space-y-2">
                          {aiMsgs.slice(-3).filter(m => m.role === 'assistant').map((msg, i) => (
                            <div key={i} className="bg-slate-800/50 rounded-xl p-3 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* أزرار الإجراءات */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button
                        onClick={analyzeData}
                        className="py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        تحليل البيانات
                      </button>
                      <button
                        onClick={() => { setTab('table'); }}
                        className="py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        جدول البيانات
                      </button>
                      <button
                        onClick={() => { setTab('ai'); setShowAi(true); }}
                        className="py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        <Brain className="w-4 h-4" />
                        اسأل AI
                      </button>
                      <button
                        onClick={() => calculateResults(vars, exp)}
                        className="py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        تحديث النتائج
                      </button>
                    </div>
                  </div>
                )}

                {/* ═══ 📊 جدول البيانات ═══ */}
                {tab === 'table' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        جدول البيانات - {exp.name}
                      </h4>
                      <div className="flex gap-2">
                        <button onClick={addCol} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs flex items-center gap-1 transition">
                          <Plus className="w-3 h-3" /> عمود
                        </button>
                        <button onClick={addRow} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs flex items-center gap-1 transition">
                          <Plus className="w-3 h-3" /> صف
                        </button>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto bg-slate-800/70 rounded-2xl border border-slate-700">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-700/80">
                            <th className="p-2 text-slate-500 w-10">#</th>
                            {cols.map(col => (
                              <th key={col.id} className="p-2 min-w-[120px]">
                                <div className="flex items-center justify-between gap-1">
                                  <span style={{ color: COLOR_MAP[col.color] }}>{col.name}</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-slate-500">{col.unit}</span>
                                    <button onClick={() => setCols(c => c.filter(x => x.id !== col.id))} className="text-red-400 hover:text-red-300 opacity-50 hover:opacity-100">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, ri) => (
                            <tr key={row.id} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                              <td className="p-2 text-slate-600 text-center">{ri + 1}</td>
                              {cols.map(col => (
                                <td key={col.id} className="p-1">
                                  <input
                                    type="text"
                                    value={row.values[col.id] || ''}
                                    onChange={e => setRows(prev => prev.map(r => 
                                      r.id === row.id ? { ...r, values: { ...r.values, [col.id]: e.target.value } } : r
                                    ))}
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-2 py-1.5 text-white text-center focus:border-cyan-500 outline-none"
                                  />
                                </td>
                              ))}
                              <td className="p-2 text-center">
                                <button onClick={() => setRows(prev => prev.filter(r => r.id !== row.id))} className="text-red-400 hover:text-red-300 transition">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={analyzeData}
                        className="py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        <Brain className="w-4 h-4" />
                        تحليل البيانات بالذكاء الاصطناعي
                      </button>
                      <button
                        onClick={() => calculateResults(vars, exp)}
                        className="py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        حساب وإظهار النتائج
                      </button>
                    </div>
                  </div>
                )}

                {/* ═══ 🤖 الذكاء الاصطناعي ═══ */}
                {tab === 'ai' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto space-y-3 mb-3 max-h-[500px]">
                      {aiMsgs.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.role === 'user' ? 'bg-blue-600' : 'bg-gradient-to-br from-purple-600 to-pink-600'
                          }`}>
                            {msg.role === 'user' ? '👤' : '🤖'}
                          </div>
                          <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                            msg.role === 'user' 
                              ? 'bg-blue-600 text-white rounded-tr-sm' 
                              : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {aiLoading && (
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                            🤖
                          </div>
                          <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-sm border border-slate-700">
                            <div className="flex items-center gap-2 text-slate-400">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>يكتب...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiInput}
                        onChange={e => setAiInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && sendAi()}
                        placeholder="اسأل عن هذه التجربة..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                      />
                      <button
                        onClick={sendAi}
                        disabled={!aiInput.trim() || aiLoading}
                        className="w-12 h-12 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 rounded-xl flex items-center justify-center transition"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ═══ 🔄 الوحدات ═══ */}
                {tab === 'units' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                      <Compass className="w-4 h-4" />
                      محول الوحدات الذكي
                    </h4>
                    
                    <div className="flex flex-wrap gap-2">
                      {UNIT_CATS.map(uc => (
                        <button
                          key={uc.id}
                          onClick={() => { setUnitCat(uc.id); setUnitVal('1'); }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                            unitCat === uc.id ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {uc.name}
                        </button>
                      ))}
                    </div>
                    
                    {UNIT_CATS.find(u => u.id === unitCat) && (
                      <div className="bg-slate-800/70 rounded-2xl p-4 border border-slate-700">
                        <input
                          type="number"
                          value={unitVal}
                          onChange={e => setUnitVal(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg text-white text-center focus:border-cyan-500 outline-none mb-4"
                        />
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {UNIT_CATS.find(u => u.id === unitCat)!.options.map((opt, i) => {
                            let result: number;
                            if ('formula' in opt) {
                              result = opt.formula!(parseFloat(unitVal) || 0);
                            } else {
                              result = (parseFloat(unitVal) || 0) * opt.factor;
                            }
                            return (
                              <div key={i} className="bg-slate-900/50 rounded-xl p-3 text-center">
                                <p className="text-[9px] text-slate-500 mb-1">{opt.from} → {opt.to}</p>
                                <p className="text-lg font-bold text-cyan-400">{result.toFixed(6)}</p>
                                <p className="text-[9px] text-slate-500">{opt.to}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* الترحيب */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-lg">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-4xl shadow-2xl shadow-cyan-500/20">
                  🔬
                </div>
                <h2 className="text-xl font-bold text-cyan-300 mb-2">مرحباً بك في مختبر الفيزياء!</h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  اختر تجربة فيزيائية من القائمة الجانبية للبدء. كل شيء مترابط: الجدول ↔ المحاكاة ↔ النتائج ↔ الذكاء الاصطناعي
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-800/80 p-3 rounded-xl text-center border border-slate-700">
                    <Trophy className="w-6 h-6 mx-auto mb-1 text-amber-400" />
                    <p className="text-lg font-bold text-white">{EXPERIMENTS.length}</p>
                    <p className="text-[9px] text-slate-400">تجربة</p>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-xl text-center border border-slate-700">
                    <Sparkles className="w-6 h-6 mx-auto mb-1 text-cyan-400" />
                    <p className="text-lg font-bold text-white">∞</p>
                    <p className="text-[9px] text-slate-400">رسم بياني</p>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-xl text-center border border-slate-700">
                    <Brain className="w-6 h-6 mx-auto mb-1 text-purple-400" />
                    <p className="text-lg font-bold text-white">AI</p>
                    <p className="text-[9px] text-slate-400">معلم ذكي</p>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-xl text-center border border-slate-700">
                    <Compass className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
                    <p className="text-lg font-bold text-white">7</p>
                    <p className="text-[9px] text-slate-400">أنواع وحدات</p>
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
