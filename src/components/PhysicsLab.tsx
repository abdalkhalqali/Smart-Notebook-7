import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, Plus, Trash2, Download, Search,
  Brain, BarChart3, TrendingUp, Trophy, Star, X, Send,
  Loader2, ChevronLeft, ChevronRight, Check, AlertCircle,
  Settings, Share2, FileText, Eye, EyeOff, Volume2,
  Zap, Compass, Target, Award, Flame, Sparkles, RefreshCw,
  Copy, Clock, Users, Timer, BookOpen, Lightbulb,
  ArrowRight, ArrowLeft, Minus, Grid3X3, Maximize2, Minimize2,
  Sun, Moon, VolumeX, Volume1, Activity
} from 'lucide-react';
import { resolveApiUrl } from '../utils/apiBase';
import PhysicsChart from './PhysicsChart';
import PhysicsSimulatorV2 from './PhysicsSimulatorV2';

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
  },
  // ═══════════════════════════════════════════════════════════
  // 🆕 تجارب جديدة مضافة حديثاً
  // ═══════════════════════════════════════════════════════════
  {
    id: 'thermodynamics',
    name: 'الديناميكا الحرارية',
    nameEn: 'Thermodynamics',
    category: 'حرارة',
    icon: '🌡️',
    difficulty: 3,
    description: 'قوانين الديناميكا الحرارية',
    equations: [
      { name: 'الحرارة', formula: 'Q = mcΔT', desc: 'الحرارة النوعية' },
      { name: 'الشغل', formula: 'W = PΔV', desc: 'شغل الغاز' },
      { name: 'الكفاءة', formula: 'η = 1 - Tc/Th', desc: 'كفاءة كارنو' }
    ],
    variables: [
      { name: 'mass', label: 'الكتلة', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 },
        { label: 'g', value: 'g', factor: 1000 }
      ], min: 0.1, max: 10, default: 1 },
      { name: 'c', label: 'الحرارة النوعية', unit: 'J/kg·K', unitOptions: [
        { label: 'J/kg·K', value: 'J/kg·K', factor: 1 }
      ], min: 100, max: 5000, default: 4186 },
      { name: 'deltaT', label: 'التغير في الحرارة', unit: 'K', unitOptions: [
        { label: 'K', value: 'K', factor: 1 },
        { label: '°C', value: '°C', factor: 1 }
      ], min: 1, max: 100, default: 20 }
    ],
    results: [
      { name: 'الحرارة', formula: 'Q = mcΔT', unit: 'J', color: 'amber' },
      { name: 'القدرة الحرارية', formula: 'P = Q/t', unit: 'W', color: 'cyan' }
    ],
    simulationType: 'gas',
    aiExplanation: 'الديناميكا الحرارية تدرس انتقال الحرارة والشغل. القانون الأول: الطاقة محفوظة.',
    realWorld: 'المحركات، المكثفات، الطهي',
    tips: [
      'الحرارة النوعية للماء 4186 J/kg·K',
      'لا يمكن تحويل كل الحرارة لشغل',
      'الإنتروبيا تزداد دائماً في نظام مغلق'
    ],
    chartTypes: [
      { x: 'الزمن (s)', y: 'الحرارة (J)', type: 'line' },
      { x: 'درجة الحرارة (K)', y: 'الإنتروبيا (J/K)', type: 'line' }
    ]
  },
  {
    id: 'bohr-model',
    name: 'نموذج بور للذرة',
    nameEn: 'Bohr Model',
    category: 'فيزياء حديثة',
    icon: '⚛️',
    difficulty: 3,
    description: 'نموذج بور للذرة ومستويات الطاقة',
    equations: [
      { name: 'طاقة المستوى', formula: 'En = -13.6/n²', desc: 'طاقة الإلكترون' },
      { name: 'تردد الفوتون', formula: 'f = (En-Em)/h', desc: 'تردد الإشعاع' },
      { name: 'نصف قطر بور', formula: 'r = n²a₀', desc: 'نصف قطر المدار' }
    ],
    variables: [
      { name: 'n1', label: 'المستوى الأول', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 1, max: 5, default: 2 },
      { name: 'n2', label: 'المستوى الثاني', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 1, max: 6, default: 1 }
    ],
    results: [
      { name: 'طاقة المستوى 1', formula: 'En = -13.6/n²', unit: 'eV', color: 'violet' },
      { name: 'طاقة المستوى 2', formula: 'En = -13.6/n²', unit: 'eV', color: 'cyan' },
      { name: 'فرق الطاقة', formula: 'ΔE = E₂ - E₁', unit: 'eV', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'نموذج بور يصف الذرة كنواة مركزية وإلكترونات تدور في مدارات محددة.',
    realWorld: 'الأطياف الذرية، الليزر، أشعة X',
    tips: [
      'n=1 هو المستوى الأرضي (أقل طاقة)',
      'كلما زاد n، زاد نصف القطر',
      'الانتقال بين المستويات يُصدر أو يمتص فوتون'
    ],
    chartTypes: [
      { x: 'المستوى (n)', y: 'الطاقة (eV)', type: 'scatter' }
    ]
  },
  {
    id: 'special-relativity',
    name: 'النسبية الخاصة',
    nameEn: 'Special Relativity',
    category: 'فيزياء حديثة',
    icon: '🚀',
    difficulty: 3,
    description: 'تأثيرات النسبية الخاصة',
    equations: [
      { name: 'تمدد الزمن', formula: 'Δt = γΔt₀', desc: 'تأثير النسبية' },
      { name: 'انكماش الطول', formula: 'L = L₀/γ', desc: 'تأثير النسبية' },
      { name: 'كتلة نسبية', formula: 'm = γm₀', desc: 'كتلة متحركة' }
    ],
    variables: [
      { name: 'v', label: 'السرعة', unit: 'm/s', unitOptions: [
        { label: 'm/s', value: 'm/s', factor: 1 },
        { label: 'km/s', value: 'km/s', factor: 1000 }
      ], min: 1000000, max: 299000000, default: 200000000 },
      { name: 't0', label: 'الزمن الساكن', unit: 's', unitOptions: [
        { label: 's', value: 's', factor: 1 }
      ], min: 1, max: 100, default: 10 }
    ],
    results: [
      { name: 'عامل غاما', formula: 'γ = 1/√(1-v²/c²)', unit: '', color: 'emerald' },
      { name: 'زمن متحرك', formula: 'Δt = γΔt₀', unit: 's', color: 'cyan' }
    ],
    simulationType: 'wave',
    aiExplanation: 'النسبية الخاصة تغير مفهومنا عن الزمن والكتلة والطول عند السرعات العالية.',
    realWorld: 'أنظمة GPS، فيزياء الجسيمات',
    tips: [
      'c = 3×10⁸ m/s هي سرعة الضوء',
      'عند v << c، γ ≈ 1 (تأثيرات ضئيلة)',
      'لا يمكن لأي جسم الوصول لسرعة الضوء'
    ],
    chartTypes: [
      { x: 'السرعة (m/s)', y: 'عامل γ', type: 'line' }
    ]
  },
  {
    id: 'simple-machine',
    name: 'الآلات البسيطة',
    nameEn: 'Simple Machines',
    category: 'ميكانيكا',
    icon: '🏗️',
    difficulty: 1,
    description: 'الروافع والعجلات والبكرات',
    equations: [
      { name: 'الميزة الميكانيكية', formula: 'MA = F_out/F_in', desc: 'الميزة الآلية' },
      { name: 'الشغل', formula: 'W = Fd', desc: 'الشغل المبذول' },
      { name: 'البكرة', formula: 'MA = n', desc: 'عدد الحبال' }
    ],
    variables: [
      { name: 'load', label: 'الحمل', unit: 'N', unitOptions: [
        { label: 'N', value: 'N', factor: 1 }
      ], min: 10, max: 1000, default: 100 },
      { name: 'effort', label: 'الجهد', unit: 'N', unitOptions: [
        { label: 'N', value: 'N', factor: 1 }
      ], min: 1, max: 500, default: 50 }
    ],
    results: [
      { name: 'الميزة الميكانيكية', formula: 'MA = F_out/F_in', unit: '', color: 'cyan' },
      { name: 'الكفاءة', formula: 'η = MA/IMA × 100%', unit: '%', color: 'emerald' }
    ],
    simulationType: 'spring',
    aiExplanation: 'الآلات البسيطة ت放大 القوة أو تغير اتجاهها لتسهّل العمل.',
    realWorld: 'الرافعات، البكرات، العجلات، الأسفين',
    tips: [
      'المachines لا تخلق طاقة',
      'الشغل الداخل = الشغل الخارج (بالكفاءة)',
      'الميزة الميكانيكية الأيديية = MA > 1'
    ],
    chartTypes: [
      { x: 'الجهد (N)', y: 'الحمل (N)', type: 'bar' }
    ]
  },
  {
    id: 'density',
    name: 'الكثافة والطفو',
    nameEn: 'Density & Buoyancy',
    category: 'ميكانيكا',
    icon: '🧊',
    difficulty: 1,
    description: 'الكثافة ومبدأ أرخميدس',
    equations: [
      { name: 'الكثافة', formula: 'ρ = m/V', desc: 'تعريف الكثافة' },
      { name: 'قوة الطفو', formula: 'Fb = ρgV', desc: 'مبدأ أرخميدس' },
      { name: 'الطفو', formula: 'Fb = W', desc: 'شرط الطفو' }
    ],
    variables: [
      { name: 'mass', label: 'الكتلة', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 },
        { label: 'g', value: 'g', factor: 1000 }
      ], min: 0.1, max: 10, default: 2 },
      { name: 'volume', label: 'الحجم', unit: 'm³', unitOptions: [
        { label: 'm³', value: 'm³', factor: 1 },
        { label: 'cm³', value: 'cm³', factor: 1000000 }
      ], min: 0.001, max: 0.1, default: 0.002 },
      { name: 'fluidDensity', label: 'كثافة السائل', unit: 'kg/m³', unitOptions: [
        { label: 'kg/m³', value: 'kg/m³', factor: 1 }
      ], min: 500, max: 2000, default: 1000 }
    ],
    results: [
      { name: 'الكثافة', formula: 'ρ = m/V', unit: 'kg/m³', color: 'cyan' },
      { name: 'قوة الطفو', formula: 'Fb = ρgV', unit: 'N', color: 'amber' },
      { name: 'الوزن', formula: 'W = mg', unit: 'N', color: 'emerald' }
    ],
    simulationType: 'gas',
    aiExplanation: 'مبدأ أرخميدس: الجسم المغمور في سائل يفقد من وزنه بقدر وزن السائل المزاح.',
    realWorld: 'السفن، المناطيد، الغواصات',
    tips: [
      'كثافة الماء 1000 kg/m³',
      'الجسم يطفو إذا كانت كثافته أقل من السائل',
      'قوة الطفو لا تعتمد على عمق الجسم'
    ],
    chartTypes: [
      { x: 'الحجم (m³)', y: 'قوة الطفو (N)', type: 'line' }
    ]
  },
  {
    id: 'moment',
    name: 'عزم القوة',
    nameEn: 'Torque',
    category: 'ميكانيكا',
    icon: '🔧',
    difficulty: 2,
    description: 'عزم القوة وتأثيره على الدوران',
    equations: [
      { name: 'العزم', formula: 'τ = rFsinθ', desc: 'تعريف العزم' },
      { name: 'الاتزان', formula: 'Στ = 0', desc: 'شرط الاتزان' }
    ],
    variables: [
      { name: 'force', label: 'القوة', unit: 'N', unitOptions: [
        { label: 'N', value: 'N', factor: 1 }
      ], min: 1, max: 100, default: 20 },
      { name: 'distance', label: 'المسافة', unit: 'm', unitOptions: [
        { label: 'm', value: 'm', factor: 1 },
        { label: 'cm', value: 'cm', factor: 100 }
      ], min: 0.1, max: 5, default: 1 },
      { name: 'angle', label: 'الزاوية', unit: '°', unitOptions: [
        { label: '°', value: '°', factor: 1 }
      ], min: 0, max: 180, default: 90 }
    ],
    results: [
      { name: 'العزم', formula: 'τ = rFsinθ', unit: 'N·m', color: 'amber' },
      { name: 'الشغل', formula: 'W = τθ', unit: 'J', color: 'cyan' }
    ],
    simulationType: 'pendulum',
    aiExplanation: 'العزم هو مقياس لقدرة القوة على إحداث الدوران حول محور.',
    realWorld: 'المفاتيح، العجلات، العضلات',
    tips: [
      'العزم أعظم عندما القوة عمودية على ذراع العزم',
      'F⊥ = Fsinθ',
      'وحدة العزم: N·m (ليست Joule)'
    ],
    chartTypes: [
      { x: 'الزاوية (°)', y: 'العزم (N·m)', type: 'line' }
    ]
  },
  {
    id: 'diffraction',
    name: 'الحيود والتداخل',
    nameEn: 'Diffraction & Interference',
    category: 'بصريات',
    icon: '🌈',
    difficulty: 3,
    description: 'ظواهر الحيود والتداخل الضوئي',
    equations: [
      { name: 'شروط التداخل', formula: 'd sinθ = mλ', desc: 'بناء ومدمیر' },
      { name: 'الحيود', formula: 'a sinθ = mλ', desc: 'محزوز الحيود' },
      { name: 'زاوية الحيود', formula: 'θ ≈ λ/d', desc: 'للزوايا الصغيرة' }
    ],
    variables: [
      { name: 'wavelength', label: 'الطول الموجي', unit: 'nm', unitOptions: [
        { label: 'nm', value: 'nm', factor: 1 },
        { label: 'm', value: 'm', factor: 1000000000 }
      ], min: 100, max: 1000, default: 550 },
      { name: 'slitWidth', label: 'عرض الشق', unit: 'μm', unitOptions: [
        { label: 'μm', value: 'μm', factor: 1 }
      ], min: 1, max: 100, default: 10 },
      { name: 'order', label: 'رتبة التداخل', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 1, max: 5, default: 1 }
    ],
    results: [
      { name: 'زاوية التداخل', formula: 'θ = arcsin(mλ/d)', unit: '°', color: 'violet' },
      { name: 'فاصل المواقع', formula: 'Δy = λL/d', unit: 'm', color: 'cyan' }
    ],
    simulationType: 'wave',
    aiExplanation: 'الحيود والتداخل ظواهر موجية تظهر عند مرور الضوء من فتحات ضيقة.',
    realWorld: 'الأقراص المدمجة، نظارات 3D، مطياف',
    tips: [
      'λ المرئي: 400-700 nm',
      'الحيود أوضح مع الفتحات الصغيرة',
      'التداخل يحدث للموجات المت coherent'
    ],
    chartTypes: [
      { x: 'عرض الشق (μm)', y: 'زاوية الحيود (°)', type: 'line' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 🆕 تجارب إضافية شاملة لجميع فروع الفيزياء
  // ═══════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────
  // 📦 الميكانيكا - الحركة والديناميكا
  // ─────────────────────────────────────────────────────────
  {
    id: 'uniform-motion',
    name: 'الحركة المنتظمة',
    nameEn: 'Uniform Motion',
    category: 'ميكانيكا',
    icon: '🏃',
    difficulty: 1,
    description: 'حركة بسرعة ثابتة في خط مستقيم',
    equations: [
      { name: 'السرعة', formula: 'v = d/t', desc: 'السرعة المنتظمة' },
      { name: 'المسافة', formula: 'd = vt', desc: 'المسافة المقطوعة' },
      { name: 'الزمن', formula: 't = d/v', desc: 'الزمن اللازم' }
    ],
    variables: [
      { name: 'velocity', label: 'السرعة', unit: 'm/s', unitOptions: [
        { label: 'm/s', value: 'm/s', factor: 1 },
        { label: 'km/h', value: 'km/h', factor: 3.6 }
      ], min: 1, max: 50, default: 10 },
      { name: 'time', label: 'الزمن', unit: 's', unitOptions: [
        { label: 'ثانية', value: 's', factor: 1 },
        { label: 'دقيقة', value: 'min', factor: 1/60 }
      ], min: 1, max: 100, default: 20 }
    ],
    results: [
      { name: 'المسافة', formula: 'd = vt', unit: 'm', color: 'cyan' },
      { name: 'السرعة المتوسطة', formula: 'v_avg = d/t', unit: 'm/s', color: 'amber' }
    ],
    simulationType: 'projectile',
    aiExplanation: 'الحركة المنتظمة هي أبسط أنواع الحركة. الجسم يقطع مسافات متساوية في أزمنة متساوية.',
    realWorld: 'سيارة تسير بسرعة ثابتة على طريق مستقيم',
    tips: [
      'السرعة ثابتة في الحركة المنتظمة',
      'المسافة تتناسب طرداً مع الزمن',
      'منحنى المسافة-زمن خط مستقيم'
    ],
    chartTypes: [
      { x: 'الزمن (s)', y: 'المسافة (m)', type: 'line' },
      { x: 'الزمن (s)', y: 'السرعة (m/s)', type: 'line' }
    ]
  },
  {
    id: 'uniform-acceleration',
    name: 'الحركة المتسارعة المنتظمة',
    nameEn: 'Uniformly Accelerated Motion',
    category: 'ميكانيكا',
    icon: '🚀',
    difficulty: 2,
    description: 'حركة بتسارع ثابت',
    equations: [
      { name: 'السرعة', formula: 'v = v₀ + at', desc: 'السرعة اللحظية' },
      { name: 'المسافة', formula: 'd = v₀t + ½at²', desc: 'معادلة الحركة' },
      { name: 'التسارع', formula: 'a = (v - v₀)/t', desc: 'تعريف التسارع' }
    ],
    variables: [
      { name: 'v0', label: 'السرعة الابتدائية', unit: 'm/s', unitOptions: [
        { label: 'm/s', value: 'm/s', factor: 1 }
      ], min: 0, max: 50, default: 5 },
      { name: 'a', label: 'التسارع', unit: 'm/s²', unitOptions: [
        { label: 'm/s²', value: 'm/s²', factor: 1 }
      ], min: -5, max: 10, default: 2 },
      { name: 't', label: 'الزمن', unit: 's', unitOptions: [
        { label: 'ثانية', value: 's', factor: 1 }
      ], min: 1, max: 50, default: 10 }
    ],
    results: [
      { name: 'السرعة النهائية', formula: 'v = v₀ + at', unit: 'm/s', color: 'cyan' },
      { name: 'المسافة', formula: 'd = v₀t + ½at²', unit: 'm', color: 'amber' }
    ],
    simulationType: 'projectile',
    aiExplanation: 'الحركة المتسارعة المنتظمة لها تسارع ثابت. السرعة تتغير بمعدل منتظم.',
    realWorld: 'سيارة تتسارع من السكون، سقوط حر',
    tips: [
      'التسارع الموجب يزيد السرعة',
      'التسارع السالب (التباطؤ) يقلل السرعة',
      'التسارع المنتظم يعطي منحنى سرعة خطي'
    ],
    chartTypes: [
      { x: 'الزمن (s)', y: 'السرعة (m/s)', type: 'line' },
      { x: 'الزمن (s)', y: 'المسافة (m)', type: 'line' }
    ]
  },
  {
    id: 'newtons-laws',
    name: 'قوانين نيوتن للحركة',
    nameEn: "Newton's Laws of Motion",
    category: 'ميكانيكا',
    icon: '⚖️',
    difficulty: 2,
    description: 'قوانين الحركة الأساسية',
    equations: [
      { name: 'القانون الأول', formula: 'ΣF = 0 → v = const', desc: ' القصور الذاتي' },
      { name: 'القانون الثاني', formula: 'F = ma', desc: 'القوة والتسارع' },
      { name: 'القانون الثالث', formula: 'F₁₂ = -F₂₁', desc: 'الفعل ورد الفعل' }
    ],
    variables: [
      { name: 'mass', label: 'الكتلة', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 }
      ], min: 1, max: 100, default: 10 },
      { name: 'force', label: 'القوة', unit: 'N', unitOptions: [
        { label: 'N', value: 'N', factor: 1 }
      ], min: 1, max: 500, default: 50 }
    ],
    results: [
      { name: 'التسارع', formula: 'a = F/m', unit: 'm/s²', color: 'cyan' },
      { name: 'الوزن', formula: 'W = mg', unit: 'N', color: 'amber' }
    ],
    simulationType: 'projectile',
    aiExplanation: 'قوانين نيوتن الثلاثة تصف حركة الأجسام تحت تأثير القوى.',
    realWorld: 'جميع أنواع الحركة في حياتنا اليومية',
    tips: [
      'القانون الأول: الجسم الساكن يبقى ساكناً ما لم تؤثر عليه قوة',
      'القانون الثاني: F = ma هو أساس الميكانيكا',
      'القانون الثالث: لكل فعل رد فعل مساوٍ ومعاكس'
    ],
    chartTypes: [
      { x: 'القوة (N)', y: 'التسارع (m/s²)', type: 'line' }
    ]
  },
  {
    id: 'circular-motion',
    name: 'الحركة الدائرية المنتظمة',
    nameEn: 'Uniform Circular Motion',
    category: 'ميكانيكا',
    icon: '🔄',
    difficulty: 2,
    description: 'حركة دائرية بسرعة زاوية ثابتة',
    equations: [
      { name: 'السرعة الزاوية', formula: 'ω = 2π/T = 2πf', desc: 'السرعة الزاوية' },
      { name: 'القوة المركزية', formula: 'Fc = mv²/r = mω²r', desc: 'القوة المركزية' },
      { name: 'التسارع المركزي', formula: 'ac = v²/r', desc: 'التسارع المركزي' }
    ],
    variables: [
      { name: 'v', label: 'السرعة', unit: 'm/s', unitOptions: [
        { label: 'm/s', value: 'm/s', factor: 1 }
      ], min: 1, max: 50, default: 10 },
      { name: 'r', label: 'نصف القطر', unit: 'm', unitOptions: [
        { label: 'm', value: 'm', factor: 1 }
      ], min: 0.5, max: 20, default: 5 }
    ],
    results: [
      { name: 'التسارع المركزي', formula: 'ac = v²/r', unit: 'm/s²', color: 'cyan' },
      { name: 'القوة المركزية', formula: 'Fc = mv²/r', unit: 'N', color: 'amber' }
    ],
    simulationType: 'pendulum',
    aiExplanation: 'الحركة الدائرية المنتظمة تتطلب قوة مركزية للحفاظ على المسار الدائري.',
    realWorld: 'الأقمار الصناعية، العجلات، الألعاب الدائرية',
    tips: [
      'القوة المركزية ليست قوة جديدة، بل مجموع القوى نحو المركز',
      'السرعة الزاوية ثابتة لكن اتجاهها يتغير',
      'التسارع المركزي دائماً نحو مركز الدائرة'
    ],
    chartTypes: [
      { x: 'نصف القطر (m)', y: 'التسارع المركزي (m/s²)', type: 'line' }
    ]
  },
  {
    id: 'momentum',
    name: 'الزخم الخطي',
    nameEn: 'Linear Momentum',
    category: 'ميكانيكا',
    icon: '💫',
    difficulty: 2,
    description: 'الزخم وحفظه',
    equations: [
      { name: 'الزخم', formula: 'p = mv', desc: 'تعريف الزخم' },
      { name: 'حفظ الزخم', formula: 'm₁v₁ + m₂v₂ = const', desc: 'قبل = بعد' },
      { name: 'الدفع', formula: 'J = FΔt = Δp', desc: 'نظرية الدفع-زخم' }
    ],
    variables: [
      { name: 'm1', label: 'كتلة الجسم 1', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 }
      ], min: 1, max: 20, default: 5 },
      { name: 'v1', label: 'سرعة الجسم 1', unit: 'm/s', unitOptions: [
        { label: 'm/s', value: 'm/s', factor: 1 }
      ], min: -10, max: 10, default: 8 },
      { name: 'm2', label: 'كتلة الجسم 2', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 }
      ], min: 1, max: 20, default: 3 },
      { name: 'v2', label: 'سرعة الجسم 2', unit: 'm/s', unitOptions: [
        { label: 'm/s', value: 'm/s', factor: 1 }
      ], min: -10, max: 10, default: -4 }
    ],
    results: [
      { name: 'زخم الجسم 1', formula: 'p₁ = m₁v₁', unit: 'kg·m/s', color: 'cyan' },
      { name: 'زخم الجسم 2', formula: 'p₂ = m₂v₂', unit: 'kg·m/s', color: 'amber' },
      { name: 'الزخم الكلي', formula: 'p_total = p₁ + p₂', unit: 'kg·m/s', color: 'emerald' }
    ],
    simulationType: 'collision',
    aiExplanation: 'الزخم كمية متجهية. الزخم الكلي لنظام مغلق محفوظ.',
    realWorld: 'التصادمات، الصواريخ، كرات البليارد',
    tips: [
      'الزخم محفوظ في جميع التصادمات',
      'الطاقة الحركية محفوظة فقط في التصادمات المرنة',
      'وحدة الزخم: kg·m/s'
    ],
    chartTypes: [
      { x: 'السرعة (m/s)', y: 'الزخم (kg·m/s)', type: 'line' }
    ]
  },
  {
    id: 'work-energy',
    name: 'الشغل والطاقة',
    nameEn: 'Work and Energy',
    category: 'ميكانيكا',
    icon: '⚡',
    difficulty: 1,
    description: 'الشغل والطاقة الحركية وال كامنة',
    equations: [
      { name: 'الشغل', formula: 'W = Fd cosθ', desc: 'تعريف الشغل' },
      { name: 'الطاقة الحركية', formula: 'KE = ½mv²', desc: 'طاقة الحركة' },
      { name: 'الطاقة الكامنة', formula: 'PE = mgh', desc: 'طاقة الوضع' }
    ],
    variables: [
      { name: 'm', label: 'الكتلة', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 }
      ], min: 1, max: 50, default: 5 },
      { name: 'v', label: 'السرعة', unit: 'm/s', unitOptions: [
        { label: 'm/s', value: 'm/s', factor: 1 }
      ], min: 0, max: 30, default: 10 },
      { name: 'h', label: 'الارتفاع', unit: 'm', unitOptions: [
        { label: 'm', value: 'm', factor: 1 }
      ], min: 0, max: 50, default: 10 }
    ],
    results: [
      { name: 'الطاقة الحركية', formula: 'KE = ½mv²', unit: 'J', color: 'cyan' },
      { name: 'الطاقة الكامنة', formula: 'PE = mgh', unit: 'J', color: 'amber' },
      { name: 'الشغل', formula: 'W = ΔKE', unit: 'J', color: 'emerald' }
    ],
    simulationType: 'free-fall',
    aiExplanation: 'الشغل والطاقة مترابطان. الطاقة لا تفنى ولا تُستحدث، بل تتحول.',
    realWorld: 'الألعاب البهلوانية، السدود، المحركات',
    tips: [
      'الشغل = التغير في الطاقة الحركية',
      'الطاقة الحركية دائماً موجبة',
      'عند h=0، PE=0 (اختيار مرجعي)'
    ],
    chartTypes: [
      { x: 'الارتفاع (m)', y: 'الطاقة الكامنة (J)', type: 'line' },
      { x: 'السرعة (m/s)', y: 'الطاقة الحركية (J)', type: 'line' }
    ]
  },
  {
    id: 'simple-harmonic',
    name: 'الحركة التوافقية البسيطة',
    nameEn: 'Simple Harmonic Motion',
    category: 'ميكانيكا',
    icon: '〰️',
    difficulty: 2,
    description: 'حركة دورية حول موضع توازن',
    equations: [
      { name: 'الإزاحة', formula: 'x = A cos(ωt)', desc: 'معادلة الحركة' },
      { name: 'السرعة الزاوية', formula: 'ω = 2πf = √(k/m)', desc: 'للكتلة على نابض' },
      { name: 'الطاقة', formula: 'E = ½kA²', desc: 'الطاقة الكلية' }
    ],
    variables: [
      { name: 'A', label: 'السعة', unit: 'm', unitOptions: [
        { label: 'm', value: 'm', factor: 1 }
      ], min: 0.1, max: 5, default: 1 },
      { name: 'f', label: 'التردد', unit: 'Hz', unitOptions: [
        { label: 'Hz', value: 'Hz', factor: 1 }
      ], min: 0.1, max: 5, default: 1 },
      { name: 'm', label: 'الكتلة', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 }
      ], min: 0.1, max: 10, default: 1 }
    ],
    results: [
      { name: 'الزمن الدوري', formula: 'T = 1/f', unit: 's', color: 'cyan' },
      { name: 'ω', formula: 'ω = 2πf', unit: 'rad/s', color: 'amber' }
    ],
    simulationType: 'spring',
    aiExplanation: 'الحركة التوافقية البسيطة تتكرر بشكل دوري. الطاقة تتنقل بين حركية وكامنة.',
    realWorld: 'النوابض، البندول (لزاويا صغيرة)، الوتر المهتز',
    tips: [
      'الحركة التوافقية البسيطة مثالية - لا يوجد احتكاك',
      'T لا تعتمد على السعة (ل SHM المثالية)',
      'القوة المركزية تتناسب مع الإزاحة'
    ],
    chartTypes: [
      { x: 'الزمن (s)', y: 'الإزاحة (m)', type: 'line' },
      { x: 'الزمن (s)', y: 'السرعة (m/s)', type: 'line' }
    ]
  },
  {
    id: 'doppler-effect',
    name: 'تأثير دوبلر',
    nameEn: 'Doppler Effect',
    category: 'ميكانيكا',
    icon: '📡',
    difficulty: 2,
    description: 'تغير التردد بسبب الحركة النسبية',
    equations: [
      { name: 'تردد المراقب', formula: "f' = f(v ± vo)/(v ∓ vs)", desc: 'تأثير دوبلر' },
      { name: 'سرعة الصوت', formula: 'v = 343 m/s', desc: 'في الهواء' }
    ],
    variables: [
      { name: 'f', label: 'التردد الأصلي', unit: 'Hz', unitOptions: [
        { label: 'Hz', value: 'Hz', factor: 1 },
        { label: 'kHz', value: 'kHz', factor: 1000 }
      ], min: 20, max: 20000, default: 440 },
      { name: 'vs', label: 'سرعة المصدر', unit: 'm/s', unitOptions: [
        { label: 'm/s', value: 'm/s', factor: 1 }
      ], min: 0, max: 100, default: 20 },
      { name: 'vo', label: 'سرعة المراقب', unit: 'm/s', unitOptions: [
        { label: 'm/s', value: 'm/s', factor: 1 }
      ], min: 0, max: 50, default: 0 }
    ],
    results: [
      { name: 'التردد الجديد', formula: "f' = f(v ± vo)/(v ∓ vs)", unit: 'Hz', color: 'cyan' },
      { name: 'تغير التردد', formula: 'Δf = f - f', unit: 'Hz', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'تأثير دوبلر يُفسر لماذا يتغير تردد الصوت عند حركة المصدر أو المراقب.',
    realWorld: 'صفارات الإنذار، الرادار، قياس سرعة النجوم',
    tips: [
      'مصدر يقترب → التردد يرتفع',
      'مصدر يبتعد → التردد ينخفض',
      'الصيغة تعتمد على اتجاه الحركة'
    ],
    chartTypes: [
      { x: 'السرعة (m/s)', y: 'التردد (Hz)', type: 'line' }
    ]
  },
  {
    id: 'rotational-motion',
    name: 'الحركة الدورانية',
    nameEn: 'Rotational Motion',
    category: 'ميكانيكا',
    icon: '🔃',
    difficulty: 3,
    description: 'حركة دورانية للأجسام',
    equations: [
      { name: 'عزم القصور الذاتي', formula: 'I = Σmr²', desc: 'لجسم نقطة' },
      { name: 'الطاقة الحركية الدورانية', formula: 'KE = ½Iω²', desc: 'طاقة الدوران' },
      { name: 'قانون نيوتن الدوراني', formula: 'τ = Iα', desc: 'العزم والتسارع الزاوي' }
    ],
    variables: [
      { name: 'm', label: 'الكتلة', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 }
      ], min: 1, max: 20, default: 5 },
      { name: 'r', label: 'نصف القطر', unit: 'm', unitOptions: [
        { label: 'm', value: 'm', factor: 1 }
      ], min: 0.1, max: 5, default: 1 },
      { name: 'omega', label: 'السرعة الزاوية', unit: 'rad/s', unitOptions: [
        { label: 'rad/s', value: 'rad/s', factor: 1 }
      ], min: 1, max: 50, default: 10 }
    ],
    results: [
      { name: 'عزم القصور', formula: 'I = mr²', unit: 'kg·m²', color: 'cyan' },
      { name: 'الطاقة الحركية', formula: 'KE = ½Iω²', unit: 'J', color: 'amber' }
    ],
    simulationType: 'pendulum',
    aiExplanation: 'الحركة الدورانية تناظر الحركة الانتقالية مع استبدال الكتلة بعزم القصور.',
    realWorld: 'العجلات، المراوح، الأرض تدور حول محورها',
    tips: [
      'عزم القصور يعتمد على توزيع الكتلة',
      'كلما كانت الكتلة بعيدة عن المحور، زاد I',
      'الطاقة الحركية الدورانية = ½Iω²'
    ],
    chartTypes: [
      { x: 'نصف القطر (m)', y: 'عزم القصور (kg·m²)', type: 'line' }
    ]
  },
  {
    id: 'angular-momentum',
    name: 'زخم الزاوية',
    nameEn: 'Angular Momentum',
    category: 'ميكانيكا',
    icon: '🌀',
    difficulty: 3,
    description: 'زخم الحركة الدورانية',
    equations: [
      { name: 'زخم الزاوية', formula: 'L = Iω', desc: 'لجسم دوار' },
      { name: 'حفظ زخم الزاوية', formula: 'I₁ω₁ = I₂ω₂', desc: 'بدون عزم خارجي' },
      { name: 'لجسيم', formula: 'L = mvr', desc: 'لجسيم حول نقطة' }
    ],
    variables: [
      { name: 'I', label: 'عزم القصور', unit: 'kg·m²', unitOptions: [
        { label: 'kg·m²', value: 'kg·m²', factor: 1 }
      ], min: 0.1, max: 10, default: 2 },
      { name: 'omega', label: 'السرعة الزاوية', unit: 'rad/s', unitOptions: [
        { label: 'rad/s', value: 'rad/s', factor: 1 }
      ], min: 1, max: 30, default: 10 }
    ],
    results: [
      { name: 'زخم الزاوية', formula: 'L = Iω', unit: 'kg·m²/s', color: 'cyan' }
    ],
    simulationType: 'pendulum',
    aiExplanation: 'زخم الزاوية كمية محفوظة. راقصة الباليه تدور أسرع عند سحب ذراعيها.',
    realWorld: 'الفلك، الجيروسكوب، راقصون',
    tips: [
      'L محفوظ في غياب العزوم الخارجية',
      'عند تقليل I، تزداد ω (حفظ L)',
      'تطبيق: نجم ينهار → يدور أسرع'
    ],
    chartTypes: [
      { x: 'السرعة الزاوية (rad/s)', y: 'زخم الزاوية (kg·m²/s)', type: 'line' }
    ]
  },
  {
    id: 'gravity-orbits',
    name: 'الجاذبية والمدار',
    nameEn: 'Gravity and Orbits',
    category: 'ميكانيكا',
    icon: '🌍',
    difficulty: 3,
    description: 'قانون الجذب العام وحركة الكواكب',
    equations: [
      { name: 'قانون الجذب', formula: 'F = Gm₁m₂/r²', desc: 'قانون نيوتن' },
      { name: 'سرعة الهروب', formula: 'v_esc = √(2GM/r)', desc: 'للهروب من الجاذبية' },
      { name: 'سرعة المدار', formula: 'v_orbit = √(GM/r)', desc: 'لمدار دائري' }
    ],
    variables: [
      { name: 'M', label: 'كتلة الكوكب', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 }
      ], min: 1e24, max: 1e30, default: 5.97e24 },
      { name: 'r', label: 'نصف قطر المدار', unit: 'km', unitOptions: [
        { label: 'km', value: 'km', factor: 1 },
        { label: 'm', value: 'm', factor: 1000 }
      ], min: 1000, max: 50000, default: 7000 }
    ],
    results: [
      { name: 'سرعة المدار', formula: 'v = √(GM/r)', unit: 'km/s', color: 'cyan' },
      { name: 'السرعة الزاوية', formula: 'ω = v/r', unit: 'rad/s', color: 'amber' }
    ],
    simulationType: 'projectile',
    aiExplanation: 'الجاذبية قوة مركزية تحافظ على حركة الكواكب في مداراتها.',
    realWorld: 'الكواكب، الأقمار الصناعية، المد والجزر',
    tips: [
      'G = 6.67×10⁻¹¹ N·m²/kg²',
      'سرعة المدار أقل من سرعة الهروب',
      'المدار الإهليلجي: سرعة متغيرة'
    ],
    chartTypes: [
      { x: 'نصف القطر (km)', y: 'السرعة (km/s)', type: 'line' }
    ]
  },

  // ─────────────────────────────────────────────────────────
  // ⚡ الكهرباء والمغناطيسية
  // ─────────────────────────────────────────────────────────
  {
    id: 'electric-field',
    name: 'المجال الكهربائي',
    nameEn: 'Electric Field',
    category: 'كهرباء',
    icon: '💥',
    difficulty: 2,
    description: 'المجال الكهربائي الناتج عن الشحنات',
    equations: [
      { name: 'المجال', formula: 'E = F/q = kQ/r²', desc: 'تعريف المجال' },
      { name: 'القوة', formula: 'F = kq₁q₂/r²', desc: 'قانون كولوم' },
      { name: 'الجهد', formula: 'V = kQ/r', desc: 'الجهد الكهربائي' }
    ],
    variables: [
      { name: 'Q', label: 'الشحنة', unit: 'μC', unitOptions: [
        { label: 'μC', value: 'μC', factor: 1 },
        { label: 'C', value: 'C', factor: 1000000 }
      ], min: 1, max: 100, default: 10 },
      { name: 'r', label: 'المسافة', unit: 'm', unitOptions: [
        { label: 'm', value: 'm', factor: 1 },
        { label: 'cm', value: 'cm', factor: 100 }
      ], min: 0.1, max: 10, default: 1 }
    ],
    results: [
      { name: 'المجال الكهربائي', formula: 'E = kQ/r²', unit: 'N/C', color: 'cyan' },
      { name: 'الجهد', formula: 'V = kQ/r', unit: 'V', color: 'amber' }
    ],
    simulationType: 'magnetic',
    aiExplanation: 'المجال الكهربائي يصف قوة التأثير على شحنة اختبار. المجال كمياء متجهية.',
    realWorld: 'البرق، الشاشات، المكثفات',
    tips: [
      'المجال الكهربائي خارج الشحنة الموجبة يبعد',
      'المجال الكهربائي داخل الشحنة السالبة يتجه نحوها',
      'خطوط المجال لا تتقاطع'
    ],
    chartTypes: [
      { x: 'المسافة (m)', y: 'المجال (N/C)', type: 'line' }
    ]
  },
  {
    id: 'electric-potential',
    name: 'الجهد الكهربائي',
    nameEn: 'Electric Potential',
    category: 'كهرباء',
    icon: '🔋',
    difficulty: 2,
    description: 'الطاقة الكامنة الكهربائية',
    equations: [
      { name: 'الجهد', formula: 'V = W/q = kQ/r', desc: 'تعريف الجهد' },
      { name: 'الطاقة الكامنة', formula: 'U = kq₁q₂/r', desc: 'طاقة نظام شحنات' },
      { name: 'الشغل', formula: 'W = qΔV', desc: 'شغل نقل شحنة' }
    ],
    variables: [
      { name: 'Q', label: 'الشحنة المصدر', unit: 'μC', unitOptions: [
        { label: 'μC', value: 'μC', factor: 1 }
      ], min: 1, max: 100, default: 10 },
      { name: 'q', label: 'شحنة الاختبار', unit: 'μC', unitOptions: [
        { label: 'μC', value: 'μC', factor: 1 }
      ], min: 1, max: 50, default: 5 },
      { name: 'r', label: 'المسافة', unit: 'm', unitOptions: [
        { label: 'm', value: 'm', factor: 1 }
      ], min: 0.1, max: 5, default: 1 }
    ],
    results: [
      { name: 'الجهد', formula: 'V = kQ/r', unit: 'V', color: 'cyan' },
      { name: 'الطاقة الكامنة', formula: 'U = kQq/r', unit: 'J', color: 'amber' }
    ],
    simulationType: 'magnetic',
    aiExplanation: 'الجهد الكهربائي طاقة كل وحدة شحنة. فرق الجهد يسبب تيار كهربائي.',
    realWorld: 'البطاريات، المقابس، الدوائر الإلكترونية',
    tips: [
      'الجهد كمية قياسية (ليس متجهاً)',
      'النقطة المرجعية للجهد عند ∞ عادةً = 0',
      'الشغل = q(V₂ - V₁)'
    ],
    chartTypes: [
      { x: 'المسافة (m)', y: 'الجهد (V)', type: 'line' }
    ]
  },
  {
    id: 'capacitors',
    name: 'المكثفات',
    nameEn: 'Capacitors',
    category: 'كهرباء',
    icon: '🔲',
    difficulty: 2,
    description: 'تخزين الشحنة الكهربائية',
    equations: [
      { name: 'السعة', formula: 'C = Q/V', desc: 'تعريف السعة' },
      { name: 'طاقة المكثف', formula: 'U = ½CV² = ½QV', desc: 'الطاقة المخزنة' },
      { name: 'لوح متوازي', formula: 'C = ε₀A/d', desc: 'سعة لوحين' }
    ],
    variables: [
      { name: 'C', label: 'السعة', unit: 'μF', unitOptions: [
        { label: 'μF', value: 'μF', factor: 1 },
        { label: 'pF', value: 'pF', factor: 1000000 }
      ], min: 1, max: 1000, default: 100 },
      { name: 'V', label: 'الجهد', unit: 'V', unitOptions: [
        { label: 'V', value: 'V', factor: 1 }
      ], min: 1, max: 100, default: 12 }
    ],
    results: [
      { name: 'الشحنة', formula: 'Q = CV', unit: 'μC', color: 'cyan' },
      { name: 'الطاقة', formula: 'U = ½CV²', unit: 'J', color: 'amber' }
    ],
    simulationType: 'circuit',
    aiExplanation: 'المكثف يخزن الطاقة في مجال كهربائي. يشحن تدريجياً عبر الزمن.',
    realWorld: 'الفلاش، الدوائر الإلكترونية، تخزين الطاقة',
    tips: [
      'المكثف يحظر التيار المستمر بعد الشحن',
      'الطاقة المخزنة = ½CV²',
      'ثابت الزمن τ = RC'
    ],
    chartTypes: [
      { x: 'الجهد (V)', y: 'الطاقة (J)', type: 'line' }
    ]
  },
  {
    id: 'magnetic-field',
    name: 'المجال المغناطيسي',
    nameEn: 'Magnetic Field',
    category: 'كهرباء',
    icon: '🧲',
    difficulty: 2,
    description: 'المجالات المغناطيسية وتأثيرها',
    equations: [
      { name: 'قوة لورنتز', formula: 'F = qvB sinθ', desc: 'قوة على شحنة متحركة' },
      { name: 'لسلك', formula: 'F = BIL sinθ', desc: 'قوة على سلك في مجال' },
      { name: 'ملف دائري', formula: 'B = μ₀nI', desc: 'مجال ملف حلزوني' }
    ],
    variables: [
      { name: 'q', label: 'الشحنة', unit: 'μC', unitOptions: [
        { label: 'μC', value: 'μC', factor: 1 }
      ], min: 1, max: 100, default: 10 },
      { name: 'v', label: 'السرعة', unit: 'm/s', unitOptions: [
        { label: 'm/s', value: 'm/s', factor: 1 }
      ], min: 1000, max: 100000, default: 10000 },
      { name: 'B', label: 'المجال المغناطيسي', unit: 'T', unitOptions: [
        { label: 'T', value: 'T', factor: 1 },
        { label: 'G', value: 'G', factor: 10000 }
      ], min: 0.01, max: 2, default: 0.5 }
    ],
    results: [
      { name: 'قوة لورنتز', formula: 'F = qvB', unit: 'N', color: 'cyan' }
    ],
    simulationType: 'magnetic',
    aiExplanation: 'المجال المغناطيسي يؤثر على الشحنات المتحركة. القوة دائماً عمودية على الحركة.',
    realWorld: 'المحركات، المولدات، MRI',
    tips: [
      'المجال المغناطيسي لا يؤثر على شحنة ساكنة',
      'القوة أعظم عندما v ⟂ B',
      'اتجاه القوة بقاعدة اليد اليمنى'
    ],
    chartTypes: [
      { x: 'المجال (T)', y: 'القوة (N)', type: 'line' }
    ]
  },
  {
    id: 'electromagnetic-induction',
    name: 'التحريض الكهرومغناطيسي',
    nameEn: 'Electromagnetic Induction',
    category: 'كهرباء',
    icon: '⚡',
    difficulty: 3,
    description: 'توليد القوة الدافعة الكهربائية',
    equations: [
      { name: 'قانون فاراداي', formula: 'ε = -dΦ/dt', desc: 'القوة الدافعة المستحثة' },
      { name: 'تدفق مغناطيسي', formula: 'Φ = BA cosθ', desc: 'تعريف التدفق' },
      { name: 'قاعدة لنز', formula: 'الاتجاه يعارض التغير', desc: 'قاعدة لنز' }
    ],
    variables: [
      { name: 'B', label: 'المجال المغناطيسي', unit: 'T', unitOptions: [
        { label: 'T', value: 'T', factor: 1 }
      ], min: 0.1, max: 2, default: 1 },
      { name: 'A', label: 'المساحة', unit: 'm²', unitOptions: [
        { label: 'm²', value: 'm²', factor: 1 },
        { label: 'cm²', value: 'cm²', factor: 10000 }
      ], min: 0.001, max: 1, default: 0.1 },
      { name: 'N', label: 'عدد اللفات', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 10, max: 1000, default: 100 }
    ],
    results: [
      { name: 'التدفق المغناطيسي', formula: 'Φ = BA', unit: 'Wb', color: 'cyan' },
      { name: 'القوة الدافعة', formula: 'ε = NBAω', unit: 'V', color: 'amber' }
    ],
    simulationType: 'magnetic',
    aiExplanation: 'التغير في التدفق المغناطيسي يولد قوة دافعة كهربائية (emf).',
    realWorld: 'المولدات، المحولات، الدارات RL',
    tips: [
      'لازم تغير التدفق لتوليد emf',
      'الحث الذاتي: ملف يولد emf في نفسه',
      'L = NΦ/I'
    ],
    chartTypes: [
      { x: 'عدد اللفات', y: 'emf (V)', type: 'line' }
    ]
  },
  {
    id: 'ac-circuits',
    name: 'الدوائر المترددة',
    nameEn: 'AC Circuits',
    category: 'كهرباء',
    icon: '〰️',
    difficulty: 3,
    description: 'التيار والجهد المترددان',
    equations: [
      { name: 'الجهد المتردد', formula: 'V = V₀sin(ωt)', desc: 'جهد متغير' },
      { name: 'المعاوقة', formula: 'Z = √(R² + (XL - XC)²)', desc: 'المعاوقة الكلية' },
      { name: 'القدرة', formula: 'P = VIcosφ', desc: 'القدرة الفعلية' }
    ],
    variables: [
      { name: 'V0', label: 'الجهد الأقصى', unit: 'V', unitOptions: [
        { label: 'V', value: 'V', factor: 1 }
      ], min: 1, max: 100, default: 12 },
      { name: 'f', label: 'التردد', unit: 'Hz', unitOptions: [
        { label: 'Hz', value: 'Hz', factor: 1 },
        { label: 'kHz', value: 'kHz', factor: 1000 }
      ], min: 50, max: 1000, default: 60 }
    ],
    results: [
      { name: 'الجهد الفعال', formula: 'V_rms = V₀/√2', unit: 'V', color: 'cyan' },
      { name: 'ω', formula: 'ω = 2πf', unit: 'rad/s', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'التيار المتردد يتغير اتجاهه دورياً. معظم الطاقة الكهربائية تستخدم AC.',
    realWorld: 'شبكات الكهرباء، الراديو، الإلكترونيات',
    tips: [
      'Vrms = V₀/√2 للقيمة الفعالة',
      'في الرنين: XL = XC',
      'الطاقة تنتقل فقط بالقدرة الفعلية'
    ],
    chartTypes: [
      { x: 'التردد (Hz)', y: 'المعاوقة (Ω)', type: 'line' }
    ]
  },

  // ─────────────────────────────────────────────────────────
  // 💡 البصريات
  // ─────────────────────────────────────────────────────────
  {
    id: 'lenses',
    name: 'العدسات والمرايا',
    nameEn: 'Lenses and Mirrors',
    category: 'بصريات',
    icon: '🔍',
    difficulty: 2,
    description: 'تكوين الصور بالعدسات والمرايا',
    equations: [
      { name: 'معادلة العدسة', formula: '1/f = 1/do + 1/di', desc: 'معادلة العدسة' },
      { name: 'تكبير', formula: 'M = -di/do = hi/ho', desc: 'التكبير' },
      { name: 'قوة العدسة', formula: 'P = 1/f', desc: 'بالديوبتر' }
    ],
    variables: [
      { name: 'f', label: 'البعد البؤري', unit: 'cm', unitOptions: [
        { label: 'cm', value: 'cm', factor: 1 },
        { label: 'm', value: 'm', factor: 100 }
      ], min: 5, max: 100, default: 20 },
      { name: 'do', label: 'مسافة الجسم', unit: 'cm', unitOptions: [
        { label: 'cm', value: 'cm', factor: 1 }
      ], min: 10, max: 200, default: 50 }
    ],
    results: [
      { name: 'مسافة الصورة', formula: 'di = 1/(1/f - 1/do)', unit: 'cm', color: 'cyan' },
      { name: 'التكبير', formula: 'M = -di/do', unit: '', color: 'amber' }
    ],
    simulationType: 'refraction',
    aiExplanation: 'العدسات والمرايا تغير مسار الضوء لتكوين صور. المعادلة الأساسية تربط do, di, f.',
    realWorld: 'النظارات، الكاميرات، التلسكوبات',
    tips: [
      'عدسة convergent: f موجبة، تحول平行光线 لـ convergent',
      'عدسة divergent: f سالبة',
      'الصورة الحقيقية معكوسة، الصورة الافتراضية معتدلة'
    ],
    chartTypes: [
      { x: 'مسافة الجسم (cm)', y: 'مسافة الصورة (cm)', type: 'line' }
    ]
  },
  {
    id: 'interference',
    name: 'تداخل الضوء',
    nameEn: 'Light Interference',
    category: 'بصريات',
    icon: '🌊',
    difficulty: 3,
    description: 'ظواهر التداخل الضوئي',
    equations: [
      { name: 'بفتين', formula: 'd sinθ = mλ', desc: 'شروط التداخل' },
      { name: 'فتحة واحدة', formula: 'a sinθ = mλ', desc: 'حيود فتحة' },
      { name: 'المسافة للشاشة', formula: 'y = mλL/d', desc: 'لبعيد' }
    ],
    variables: [
      { name: 'd', label: 'المسافة بين الشقوق', unit: 'μm', unitOptions: [
        { label: 'μm', value: 'μm', factor: 1 }
      ], min: 0.1, max: 10, default: 0.5 },
      { name: 'lambda', label: 'الطول الموجي', unit: 'nm', unitOptions: [
        { label: 'nm', value: 'nm', factor: 1 }
      ], min: 400, max: 700, default: 550 }
    ],
    results: [
      { name: 'زاوية التداخل', formula: 'θ = arcsin(mλ/d)', unit: '°', color: 'cyan' },
      { name: 'فاصل المواقع', formula: 'Δy = λL/d', unit: 'm', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'التداخل يحدث عند union موجات ضوئية. النمط الناتج يعتمد على اختلاف المسار.',
    realWorld: 'الأقراص المدمجة، الطلاء anti-reflective، التداخل في فقاعات الصابون',
    tips: [
      'تداخل بناء: المسار = mλ',
      'تداخل هدمي: المسار = (m+½)λ',
      'λ المرئي: 400-700 nm'
    ],
    chartTypes: [
      { x: 'المسافة (μm)', y: 'θ (°)', type: 'line' }
    ]
  },
  {
    id: 'polarization',
    name: 'استقطاب الضوء',
    nameEn: 'Light Polarization',
    category: 'بصريات',
    icon: '↗️',
    difficulty: 2,
    description: 'الاستقطاب وأمثلة عليه',
    equations: [
      { name: 'قانون مالوس', formula: 'I = I₀cos²θ', desc: 'شدة الضوء المستقطب' },
      { name: 'زاوية بروستر', formula: 'tanθ_B = n₂/n₁', desc: 'استقطاب بالانعكاس' }
    ],
    variables: [
      { name: 'I0', label: 'الشدة الابتدائية', unit: 'W/m²', unitOptions: [
        { label: 'W/m²', value: 'W/m²', factor: 1 }
      ], min: 1, max: 100, default: 10 },
      { name: 'theta', label: 'الزاوية', unit: '°', unitOptions: [
        { label: '°', value: '°', factor: 1 }
      ], min: 0, max: 90, default: 45 }
    ],
    results: [
      { name: 'الشدة المستقطبة', formula: 'I = I₀cos²θ', unit: 'W/m²', color: 'cyan' }
    ],
    simulationType: 'wave',
    aiExplanation: 'الاستقطاب يصف اتجاه المجال الكهربائي في الموجة الضوئية.',
    realWorld: 'النظارات الشمسية، شاشات LCD، التصوير',
    tips: [
      'الضوء العادي غير مستقطب',
      'النظارات المستقطبة تحجب الانعكاسات',
      'زاوية بروستر: الضوء المنعكس مستقطب تماماً'
    ],
    chartTypes: [
      { x: 'الزاوية (°)', y: 'الشدة (W/m²)', type: 'line' }
    ]
  },
  {
    id: 'color',
    name: 'ألوان الضوء',
    nameEn: 'Colors of Light',
    category: 'بصريات',
    icon: '🌈',
    difficulty: 1,
    description: 'الطيف المرئي وخلط الألوان',
    equations: [
      { name: 'طاقة الفوتون', formula: 'E = hf = hc/λ', desc: 'طاقة الفوتون' },
      { name: 'اللون الأساسي', formula: 'RGB', desc: 'الألوان الأساسية' }
    ],
    variables: [
      { name: 'lambda', label: 'الطول الموجي', unit: 'nm', unitOptions: [
        { label: 'nm', value: 'nm', factor: 1 }
      ], min: 380, max: 750, default: 550 }
    ],
    results: [
      { name: 'التردد', formula: 'f = c/λ', unit: 'Hz', color: 'cyan' },
      { name: 'طاقة الفوتون', formula: 'E = hc/λ', unit: 'eV', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'اللون يعتمد على التردد (أو الطول الموجي). الضوء الأبيض خليط من كل الألوان.',
    realWorld: 'قوس قزح، الشاشات، الفن',
    tips: [
      'أحمر: λ كبير، تردد قليل، طاقة قليلة',
      'بنفسجي: λ صغير، تردد عالي، طاقة عالية',
      'الألوان الأساسية للإضاءة: RGB'
    ],
    chartTypes: [
      { x: 'الطول الموجي (nm)', y: 'طاقة الفوتون (eV)', type: 'line' }
    ]
  },

  // ─────────────────────────────────────────────────────────
  // 🌡️ الديناميكا الحرارية
  // ─────────────────────────────────────────────────────────
  {
    id: 'heat-capacity',
    name: 'الحرارة النوعية',
    nameEn: 'Specific Heat Capacity',
    category: 'حرارة',
    icon: '🔥',
    difficulty: 1,
    description: 'الحرارة النوعية والتغير في الحرارة',
    equations: [
      { name: 'الحرارة', formula: 'Q = mcΔT', desc: 'الحرارة المكتسبة/المفقودة' },
      { name: 'الطاقة الحرارية', formula: 'Q = mc(T₂-T₁)', desc: 'تغير الحرارة' }
    ],
    variables: [
      { name: 'm', label: 'الكتلة', unit: 'g', unitOptions: [
        { label: 'g', value: 'g', factor: 1 },
        { label: 'kg', value: 'kg', factor: 1000 }
      ], min: 10, max: 1000, default: 100 },
      { name: 'c', label: 'الحرارة النوعية', unit: 'J/kg·K', unitOptions: [
        { label: 'J/kg·K', value: 'J/kg·K', factor: 1 }
      ], min: 100, max: 5000, default: 4186 },
      { name: 'dT', label: 'التغير في الحرارة', unit: '°C', unitOptions: [
        { label: '°C', value: '°C', factor: 1 }
      ], min: 1, max: 100, default: 20 }
    ],
    results: [
      { name: 'الحرارة', formula: 'Q = mcΔT', unit: 'J', color: 'amber' },
      { name: 'الطاقة الحرارية', formula: 'P = Q/t', unit: 'W', color: 'cyan' }
    ],
    simulationType: 'gas',
    aiExplanation: 'الحرارة النوعية كمية الحرارة اللازمة لرفع 1kg بمقدار 1K.',
    realWorld: 'التدفئة، التبريد، الطهي',
    tips: [
      'c الماء = 4186 J/kg·K (عالية جداً)',
      'المعادن لها حرارة نوعية منخفضة',
      'ΔT بالسيلزيوس = ΔT بالكلفن'
    ],
    chartTypes: [
      { x: 'الكتلة (g)', y: 'الحرارة (J)', type: 'line' },
      { x: 'ΔT (°C)', y: 'الحرارة (J)', type: 'line' }
    ]
  },
  {
    id: 'phase-change',
    name: 'التحولات الطورية',
    nameEn: 'Phase Changes',
    category: 'حرارة',
    icon: '🧊',
    difficulty: 2,
    description: 'الانصهار والتبخر والحرارة الكامنة',
    equations: [
      { name: 'الحرارة الكامنة', formula: 'Q = mL', desc: 'لتحويل طوري' },
      { name: 'لانصهار', formula: 'L_f', desc: 'الحرارة الكامنة للانصهار' },
      { name: 'لتبخر', formula: 'L_v', desc: 'الحرارة الكامنة للتبخر' }
    ],
    variables: [
      { name: 'm', label: 'الكتلة', unit: 'g', unitOptions: [
        { label: 'g', value: 'g', factor: 1 }
      ], min: 1, max: 500, default: 100 },
      { name: 'Lf', label: 'الحرارة الكامنة للانصهار', unit: 'J/kg', unitOptions: [
        { label: 'J/kg', value: 'J/kg', factor: 1 },
        { label: 'cal/g', value: 'cal/g', factor: 4184 }
      ], min: 10000, max: 400000, default: 334000 }
    ],
    results: [
      { name: 'الحرارة للانصهار', formula: 'Q = mL_f', unit: 'J', color: 'cyan' },
      { name: 'الحرارة للتبخر', formula: 'Q = mL_v', unit: 'J', color: 'amber' }
    ],
    simulationType: 'gas',
    aiExplanation: 'خلال التحول الطوري، الحرارة لا تغير درجة الحرارة بل تكسر الروابط.',
    realWorld: 'الثلج يذوب، الماء يغلي، الأنهار الجليدية',
    tips: [
      'L_f للجليد = 334 kJ/kg',
      'L_v للماء = 2260 kJ/kg',
      'خلال التحول، T ثابتة'
    ],
    chartTypes: [
      { x: 'الكتلة (g)', y: 'الحرارة (J)', type: 'line' }
    ]
  },
  {
    id: 'ideal-gas-law',
    name: 'قانون الغاز المثالي',
    nameEn: 'Ideal Gas Law',
    category: 'حرارة',
    icon: '💨',
    difficulty: 2,
    description: 'معادلة حالة الغاز المثالي',
    equations: [
      { name: 'الغاز المثالي', formula: 'PV = nRT', desc: 'المعادلة الرئيسية' },
      { name: 'قانون شارل', formula: 'V/T = const (P ثابت)', desc: 'عند ضغط ثابت' },
      { name: 'قانون بويل', formula: 'PV = const (T ثابت)', desc: 'عند حرارة ثابتة' }
    ],
    variables: [
      { name: 'n', label: 'عدد المولات', unit: 'mol', unitOptions: [
        { label: 'mol', value: 'mol', factor: 1 }
      ], min: 0.1, max: 10, default: 1 },
      { name: 'T', label: 'الحرارة', unit: 'K', unitOptions: [
        { label: 'K', value: 'K', factor: 1 },
        { label: '°C', value: '°C', factor: 1, convert: (v) => v + 273 }
      ], min: 200, max: 500, default: 300 },
      { name: 'P', label: 'الضغط', unit: 'atm', unitOptions: [
        { label: 'atm', value: 'atm', factor: 1 },
        { label: 'Pa', value: 'Pa', factor: 101325 }
      ], min: 0.5, max: 10, default: 1 }
    ],
    results: [
      { name: 'الحجم', formula: 'V = nRT/P', unit: 'L', color: 'cyan' },
      { name: 'PV/nT', formula: 'R', unit: 'L·atm/mol·K', color: 'amber' }
    ],
    simulationType: 'gas',
    aiExplanation: 'الغاز المثالي نموذج مثالي. R = 0.0821 L·atm/mol·K أو 8.314 J/mol·K',
    realWorld: 'محركات الاحتراق الداخلي، البالونات، الغلاف الجوي',
    tips: [
      'R = 0.0821 L·atm/mol·K',
      'R = 8.314 J/mol·K',
      'الغاز الحقيقي يقترب من المثالي في ضغط منخفض وحرارة عالية'
    ],
    chartTypes: [
      { x: 'الحرارة (K)', y: 'الحجم (L)', type: 'line' },
      { x: 'الضغط (atm)', y: 'الحجم (L)', type: 'line' }
    ]
  },
  {
    id: 'heat-engines',
    name: 'محركات الحرارة',
    nameEn: 'Heat Engines',
    category: 'حرارة',
    icon: '⚙️',
    difficulty: 3,
    description: 'كفاءة محركات الحرارة ودورة كارنو',
    equations: [
      { name: 'الكفاءة', formula: 'η = 1 - Tc/Th', desc: 'لكارنو' },
      { name: 'الشغل', formula: 'W = Qh - Qc', desc: 'الشغل المنتج' },
      { name: 'الكفاءة الفعلية', formula: 'η = W/Qh', desc: 'عملياً' }
    ],
    variables: [
      { name: 'Th', label: 'حرارة المصدر', unit: 'K', unitOptions: [
        { label: 'K', value: 'K', factor: 1 }
      ], min: 300, max: 1000, default: 500 },
      { name: 'Tc', label: 'حرارة المصرف', unit: 'K', unitOptions: [
        { label: 'K', value: 'K', factor: 1 }
      ], min: 100, max: 400, default: 300 }
    ],
    results: [
      { name: 'كفاءة كارنو', formula: 'η = 1 - Tc/Th', unit: '', color: 'cyan' },
      { name: 'النسبة', formula: 'Tc/Th', unit: '', color: 'amber' }
    ],
    simulationType: 'gas',
    aiExplanation: 'محركات الحرارة تحول الحرارة إلى شغل. كفاءة كارنو هي أقصى كفاءة ممكنة.',
    realWorld: 'محركات السيارات، المحطات الحرارية',
    tips: [
      'كفاءة 100% مستحيلة (ت违反了 القانون الثاني)',
      'كلما زاد الفرق بين Th و Tc، زادت الكفاءة',
      'Carnot هو نموذج مثالي لا يمكن تحقيقه'
    ],
    chartTypes: [
      { x: 'Tc/Th', y: 'الكفاءة', type: 'line' }
    ]
  },
  {
    id: 'entropy',
    name: 'الإنتروبيا',
    nameEn: 'Entropy',
    category: 'حرارة',
    icon: '📊',
    difficulty: 3,
    description: 'مقياس disorder وال قانون الثاني',
    equations: [
      { name: 'تعريف', formula: 'ΔS = Q/T (عند T ثابت)', desc: 'للعمليات القابلة للعكس' },
      { name: 'لغاز مثالي', formula: 'ΔS = nC_v ln(T₂/T₁) + nR ln(V₂/V₁)', desc: 'معادلة عامة' }
    ],
    variables: [
      { name: 'Q', label: 'الحرارة', unit: 'J', unitOptions: [
        { label: 'J', value: 'J', factor: 1 },
        { label: 'kJ', value: 'kJ', factor: 1000 }
      ], min: 100, max: 10000, default: 1000 },
      { name: 'T', label: 'الحرارة', unit: 'K', unitOptions: [
        { label: 'K', value: 'K', factor: 1 }
      ], min: 100, max: 500, default: 300 }
    ],
    results: [
      { name: 'الإنتروبيا', formula: 'ΔS = Q/T', unit: 'J/K', color: 'cyan' }
    ],
    simulationType: 'wave',
    aiExplanation: 'الإنتروبيا مقياس لعدم الانتظام. القانون الثاني: ΔS ≥ 0.',
    realWorld: 'تحلل الطاقة، انتشار الغازات، الشيخوخة',
    tips: [
      'الكون يميل لزيادة الإنتروبيا',
      'S لا تنخفض في نظام مغلق',
      'S كمية extensive (تdepend على size)'
    ],
    chartTypes: [
      { x: 'الحرارة (K)', y: 'الإنتروبيا (J/K)', type: 'line' }
    ]
  },

  // ─────────────────────────────────────────────────────────
  // ⚛️ فيزياء الكم والحديثة
  // ─────────────────────────────────────────────────────────
  {
    id: 'quantum-energy',
    name: 'تكميم الطاقة',
    nameEn: 'Energy Quantization',
    category: 'فيزياء حديثة',
    icon: '⚛️',
    difficulty: 3,
    description: 'طبيعة الكم وطاقة الفوتون',
    equations: [
      { name: 'طاقة الفوتون', formula: 'E = hf = hc/λ', desc: 'بلانك' },
      { name: 'تكميم الطاقة', formula: 'E_n = n²E₁', desc: 'لجسيم في صندوق' },
      { name: 'ثابت بلانك', formula: 'h = 6.63×10⁻³⁴ J·s', desc: 'قيمة h' }
    ],
    variables: [
      { name: 'f', label: 'التردد', unit: 'Hz', unitOptions: [
        { label: 'Hz', value: 'Hz', factor: 1 },
        { label: 'THz', value: 'THz', factor: 1e12 }
      ], min: 1e14, max: 1e16, default: 5e14 }
    ],
    results: [
      { name: 'طاقة الفوتون', formula: 'E = hf', unit: 'eV', color: 'cyan' },
      { name: 'طاقة في جول', formula: 'E = hc/λ', unit: 'J', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'الطاقة مكماة. لا يمكن للجسيم امتلاك أي طاقة، بل قيم محددة فقط.',
    realWorld: 'الليزر، أشعة X، الصمامات الثنائية',
    tips: [
      'h = 6.626×10⁻³⁴ J·s',
      'E بالـ eV أسهل: E(eV) = 1240/λ(nm)',
      'الطاقة مكماة في الأنظمة المرتبطة'
    ],
    chartTypes: [
      { x: 'التردد (Hz)', y: 'الطاقة (eV)', type: 'line' }
    ]
  },
  {
    id: 'wave-particle',
    name: 'ازدواجية الموجة-جسيم',
    nameEn: 'Wave-Particle Duality',
    category: 'فيزياء حديثة',
    icon: '🌊',
    difficulty: 3,
    description: 'الطبيعة المزدوجة للمادة والضوء',
    equations: [
      { name: 'طاقة فوتون', formula: 'E = hf', desc: 'ك موجة' },
      { name: 'زخم جسيم', formula: 'p = h/λ', desc: 'ك جسيم' },
      { name: 'د بروي', formula: 'λ = h/p', desc: 'الطول الموجي' }
    ],
    variables: [
      { name: 'm', label: 'الكتلة', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 },
        { label: 'eV/c²', value: 'eV/c²', factor: 1 }
      ], min: 1e-31, max: 1e-10, default: 9.11e-31 }
    ],
    results: [
      { name: 'زخم', formula: 'p = mv', unit: 'kg·m/s', color: 'cyan' },
      { name: 'الطول الموجي', formula: 'λ = h/p', unit: 'm', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'الضوء والمادة كلاهما يمتلك خصائص موجية وجسيمية.',
    realWorld: 'الحيود الإلكتروني، المجهر الإلكتروني',
    tips: [
      'الأجسام الكبيرة: λ صغير جداً (لا يمكن قياسه)',
      'الأجسام الصغيرة: λ قابل للقياس',
      'التجربة تحدد: موجة أو جسيم'
    ],
    chartTypes: [
      { x: 'الكتلة (kg)', y: 'الطول الموجي (m)', type: 'line' }
    ]
  },
  {
    id: 'heisenberg',
    name: 'مبدأ عدم اليقين',
    nameEn: 'Heisenberg Uncertainty',
    category: 'فيزياء حديثة',
    icon: '❓',
    difficulty: 3,
    description: 'حدود دقة القياس في الكم',
    equations: [
      { name: 'مبدأ عدم اليقين', formula: 'ΔxΔp ≥ ℏ/2', desc: 'موقع-زخم' },
      { name: 'طاقة-زمن', formula: 'ΔEΔt ≥ ℏ/2', desc: 'طاقة-زمن' },
      { name: 'اختصار', formula: 'ΔxΔp ≥ h/4π', desc: 'بديل' }
    ],
    variables: [
      { name: 'dx', label: 'عدم اليقين في الموقع', unit: 'm', unitOptions: [
        { label: 'm', value: 'm', factor: 1 },
        { label: 'nm', value: 'nm', factor: 1e9 }
      ], min: 1e-12, max: 1e-6, default: 1e-9 }
    ],
    results: [
      { name: 'Δp الأدنى', formula: 'Δp ≥ ℏ/(2Δx)', unit: 'kg·m/s', color: 'cyan' },
      { name: 'Δv الأدنى', formula: 'Δv ≥ ℏ/(2mΔx)', unit: 'm/s', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'مبدأ هايزنبرغ: لا يمكن تحديد موقع وسرعة الجسيم بدقة عالية في نفس الوقت.',
    realWorld: 'الفيزياء الذرية، الميكروسكوب الإلكتروني',
    tips: [
      'ℏ = h/2π = 1.055×10⁻³⁴ J·s',
      'كلما زادت دقة الموقع، قلت دقة الزخم',
      'مبدأ fundamental ولا يمكن التغلب عليه'
    ],
    chartTypes: [
      { x: 'Δx (m)', y: 'Δp (kg·m/s)', type: 'line' }
    ]
  },
  {
    id: 'nuclear-physics',
    name: 'الفيزياء النووية',
    nameEn: 'Nuclear Physics',
    category: 'فيزياء حديثة',
    icon: '☢️',
    difficulty: 3,
    description: 'تركيب النواة والتفاعلات النووية',
    equations: [
      { name: 'طاقة الربط', formula: 'E = Δmc²', desc: 'نقص الكتلة' },
      { name: 'نقص الكتلة', formula: 'Δm = Zmp + Nmn - M', desc: 'حساب Δm' },
      { name: 'النصف', formula: 'N = N₀e^(-λt)', desc: 'تحلل إشعاعي' }
    ],
    variables: [
      { name: 'N0', label: 'الذرات الابتدائية', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 100, max: 10000, default: 1000 },
      { name: 'lambda', label: 'ثابت التحلل', formula: (v) => Math.log(2)/v, unit: '1/s', unitOptions: [
        { label: '1/s', value: '1/s', factor: 1 }
      ], min: 0.01, max: 1, default: 0.1 }
    ],
    results: [
      { name: 'الذرات بعد t', formula: 'N = N₀e^(-λt)', unit: '', color: 'cyan' },
      { name: 'النشاط', formula: 'A = λN', unit: 'Bq', color: 'amber' }
    ],
    simulationType: 'radioactive',
    aiExplanation: 'الفيزياء النووية تدرس النواة وتفاعلاتها. طاقة الربط تحفظ النواة.',
    realWorld: 'المفاعلات النووية، الطب النووي، التأريخ بالكربون',
    tips: [
      'طاقة الربط لكل nucleon ~ 8 MeV',
      'U-235 للانشطار، H-1 للاندماج',
      'عمر النصف يختلف من ms لـ billions of years'
    ],
    chartTypes: [
      { x: 'الزمن (s)', y: 'عدد الذرات', type: 'line' }
    ]
  },
  {
    id: 'fusion-fission',
    name: 'الانشطار والاندماج',
    nameEn: 'Nuclear Fusion & Fission',
    category: 'فيزياء حديثة',
    icon: '💣',
    difficulty: 3,
    description: 'الطاقة من التفاعلات النووية',
    equations: [
      { name: 'انشطار', formula: 'U-235 + n → Ba + Kr + 3n', desc: 'مثال انشطار' },
      { name: 'اندماج', formula: 'D + T → He + n', desc: 'D-T اندماج' },
      { name: 'طاقة', formula: 'E = Δmc²', desc: 'طاقة التفاعل' }
    ],
    variables: [
      { name: 'm', label: 'نقص الكتلة', unit: 'kg', unitOptions: [
        { label: 'kg', value: 'kg', factor: 1 },
        { label: 'u', value: 'u', factor: 1.66e-27 }
      ], min: 1e-28, max: 1e-26, default: 3.2e-28 }
    ],
    results: [
      { name: 'الطاقة الناتجة', formula: 'E = mc²', unit: 'J', color: 'cyan' },
      { name: 'بالميجا إلكترون فولت', formula: 'E = Δm × 931.5', unit: 'MeV', color: 'amber' }
    ],
    simulationType: 'radioactive',
    aiExplanation: 'الانشطار يقسم نواة ثقيلة، الاندماج يدمج نواتين خفيفتين. كلاهما يطلق طاقة.',
    realWorld: 'القنابل الذرية (انشطار)، الشمس (اندماج)، المفاعلات',
    tips: [
      'الطاقة لكل nucleon أكبر في الاندماج',
      'شمسنا تعمل بالاندماج',
      'الطاقة الناتجة من E=mc² هائلة'
    ],
    chartTypes: [
      { x: 'نقص الكتلة (kg)', y: 'الطاقة (J)', type: 'line' }
    ]
  },

  // ─────────────────────────────────────────────────────────
  // 🔊 الموجات والصوت
  // ─────────────────────────────────────────────────────────
  {
    id: 'sound-waves',
    name: 'الموجات الصوتية',
    nameEn: 'Sound Waves',
    category: 'ميكانيكا',
    icon: '🔊',
    difficulty: 1,
    description: 'خصائص الصوت وانتقاله',
    equations: [
      { name: 'سرعة الصوت', formula: 'v = 343 m/s (في الهواء)', desc: 'سرعة الصوت' },
      { name: 'التردد', formula: 'f = 1/T', desc: 'تعريف التردد' },
      { name: 'الطول الموجي', formula: 'λ = v/f', desc: 'العلاقة الأساسية' }
    ],
    variables: [
      { name: 'f', label: 'التردد', unit: 'Hz', unitOptions: [
        { label: 'Hz', value: 'Hz', factor: 1 },
        { label: 'kHz', value: 'kHz', factor: 1000 }
      ], min: 20, max: 20000, default: 440 },
      { name: 'T', label: 'الحرارة', unit: '°C', unitOptions: [
        { label: '°C', value: '°C', factor: 1 }
      ], min: -20, max: 40, default: 20 }
    ],
    results: [
      { name: 'سرعة الصوت', formula: 'v = 331 + 0.6T', unit: 'm/s', color: 'cyan' },
      { name: 'الطول الموجي', formula: 'λ = v/f', unit: 'm', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'الصوت موجة ميكانيكية طولية. يحتاج وسط مادي للانتشار.',
    realWorld: 'الموسيقى، التحدث، السونار، الموجات فوق الصوتية',
    tips: [
      'الصوت لا ينتقل في الفراغ',
      'التردد المسموع: 20Hz - 20kHz',
      'فوق 20kHz: فوق صوتية (Ultrasound)'
    ],
    chartTypes: [
      { x: 'التردد (Hz)', y: 'الطول الموجي (m)', type: 'line' }
    ]
  },
  {
    id: 'standing-waves',
    name: 'الموجات الموقوفة',
    nameEn: 'Standing Waves',
    category: 'ميكانيكا',
    icon: '🎸',
    difficulty: 2,
    description: 'الرنين في الأوتار والأنابيب',
    equations: [
      { name: 'وتر', formula: 'f_n = nv/2L', desc: 'وتر مفتوح الطرفين' },
      { name: 'أنبوب مفتوح', formula: 'f_n = nv/2L', desc: 'الطرفين مفتوحين' },
      { name: 'أنبوب مغلق', formula: 'f_n = nv/4L', desc: 'طرف مغلق' }
    ],
    variables: [
      { name: 'L', label: 'الطول', unit: 'm', unitOptions: [
        { label: 'm', value: 'm', factor: 1 }
      ], min: 0.1, max: 5, default: 1 },
      { name: 'n', label: 'رقم الرتبة', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 1, max: 5, default: 1 }
    ],
    results: [
      { name: 'الطول الموجي', formula: 'λ = 2L/n', unit: 'm', color: 'cyan' },
      { name: 'التردد', formula: 'f = nv/2L', unit: 'Hz', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'الموجات الموقوفة تتكون من superposition موجتين متعاكستين.',
    realWorld: 'الآلات الموسيقية، الليزر، أجهزة الميكروويف',
    tips: [
      'المعقدات (nodes): سكون',
      'البطون (antinodes): سعة عظمى',
      'التردد الأساسي n=1'
    ],
    chartTypes: [
      { x: 'رقم الرتبة (n)', y: 'التردد (Hz)', type: 'line' }
    ]
  },

  // ─────────────────────────────────────────────────────────
  // 🌍 فيزياء الأرض والفضاء
  // ─────────────────────────────────────────────────────────
  {
    id: 'fluid-statics',
    name: 'ستاتيكا الموائع',
    nameEn: 'Fluid Statics',
    category: 'ميكانيكا',
    icon: '🌊',
    difficulty: 2,
    description: 'الضغط في الموائع والاتزان',
    equations: [
      { name: 'الضغط', formula: 'P = F/A', desc: 'تعريف الضغط' },
      { name: 'الضغط في سائل', formula: 'P = ρgh', desc: 'لعمق h' },
      { name: 'مبدأ أرخميدس', formula: 'Fb = ρ_fluid g V_submerged', desc: 'قوة الطفو' }
    ],
    variables: [
      { name: 'rho', label: 'الكثافة', unit: 'kg/m³', unitOptions: [
        { label: 'kg/m³', value: 'kg/m³', factor: 1 }
      ], min: 500, max: 2000, default: 1000 },
      { name: 'h', label: 'العمق', unit: 'm', unitOptions: [
        { label: 'm', value: 'm', factor: 1 }
      ], min: 1, max: 100, default: 10 }
    ],
    results: [
      { name: 'الضغط', formula: 'P = ρgh', unit: 'Pa', color: 'cyan' },
      { name: 'الضغط الكلي', formula: 'P = P₀ + ρgh', unit: 'Pa', color: 'amber' }
    ],
    simulationType: 'gas',
    aiExplanation: 'الضغط في سائل يتناسب مع العمق. الضغط الجوي P₀ = 101325 Pa.',
    realWorld: 'السدود، الغواصات، قياس الضغط',
    tips: [
      'الضغط لا يعتمد على شكل الحاوية',
      'الضغط عند نفس العمق متساوٍ في كل الاتجاهات',
      'P₀ = 1 atm = 101.325 kPa = 760 mmHg'
    ],
    chartTypes: [
      { x: 'العمق (m)', y: 'الضغط (Pa)', type: 'line' }
    ]
  },
  {
    id: 'fluid-dynamics',
    name: 'ديناميكا الموائع',
    nameEn: 'Fluid Dynamics',
    category: 'ميكانيكا',
    icon: '💧',
    difficulty: 3,
    description: 'جريان الموائع ومعادلة برنولي',
    equations: [
      { name: 'الاستمرارية', formula: 'A₁v₁ = A₂v₂', desc: 'حفظ الكتلة' },
      { name: 'برنولي', formula: 'P + ½ρv² + ρgh = const', desc: 'لأنبوب أفقي: h ثابت' },
      { name: 'اللزوجة', formula: 'F = ηA(dv/dy)', desc: 'قانون نيوتن' }
    ],
    variables: [
      { name: 'v1', label: 'السرعة 1', unit: 'm/s', unitOptions: [
        { label: 'm/s', value: 'm/s', factor: 1 }
      ], min: 1, max: 20, default: 5 },
      { name: 'A1', label: 'المساحة 1', unit: 'cm²', unitOptions: [
        { label: 'cm²', value: 'cm²', factor: 1 },
        { label: 'm²', value: 'm²', factor: 10000 }
      ], min: 1, max: 100, default: 10 },
      { name: 'A2', label: 'المساحة 2', unit: 'cm²', unitOptions: [
        { label: 'cm²', value: 'cm²', factor: 1 }
      ], min: 0.1, max: 50, default: 2 }
    ],
    results: [
      { name: 'السرعة 2', formula: 'v₂ = A₁v₁/A₂', unit: 'm/s', color: 'cyan' },
      { name: 'الضغط الكلي', formula: 'P + ½ρv²', unit: 'Pa', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'معادلة الاستمرارية: A×v ثابت. برنولي: P + ½ρv² ثابت.',
    realWorld: 'أنابيب المياه، أجنحة الطائرات، measuring flow rate',
    tips: [
      'تضيق القطر → تزيد السرعة → ينخفض الضغط',
      'هذا explains how airplane wings generate lift',
      'Bernoulli explains why curve balls curve'
    ],
    chartTypes: [
      { x: 'المساحة (cm²)', y: 'السرعة (m/s)', type: 'line' }
    ]
  },
  {
    id: 'surface-tension',
    name: 'التوتر السطحي',
    nameEn: 'Surface Tension',
    category: 'ميكانيكا',
    icon: '🫧',
    difficulty: 2,
    description: 'خاصية سطح السائل',
    equations: [
      { name: 'التوتر السطحي', formula: 'γ = F/L', desc: 'تعريف γ' },
      { name: 'الشغل', formula: 'W = γΔA', desc: 'لتغيير المساحة' },
      { name: 'الشعيرات', formula: 'h = 2γcosθ/ρgr', desc: 'ارتفاع في شعيرة' }
    ],
    variables: [
      { name: 'gamma', label: 'التوتر السطحي', unit: 'N/m', unitOptions: [
        { label: 'N/m', value: 'N/m', factor: 1 }
      ], min: 0.01, max: 0.1, default: 0.073 },
      { name: 'r', label: 'نصف قطر الشعيرة', unit: 'mm', unitOptions: [
        { label: 'mm', value: 'mm', factor: 1 }
      ], min: 0.1, max: 5, default: 1 }
    ],
    results: [
      { name: 'الشعيرات', formula: 'h = 2γ/ρgr', unit: 'm', color: 'cyan' }
    ],
    simulationType: 'wave',
    aiExplanation: 'التوتر السطحي يجعل سطح السائل يتصرف كغشاء مشدود.',
    realWorld: 'الفقاعات، قطرات الماء، الحشرات على الماء',
    tips: [
      'γ للماء = 0.073 N/m (عند 20°C)',
      'الحرارة تقلل γ',
      'الشوائب تقلل γ (surface active agents)'
    ],
    chartTypes: [
      { x: 'نصف القطر (mm)', y: 'الارتفاع (m)', type: 'line' }
    ]
  },
  {
    id: 'viscosity',
    name: 'اللزوجة',
    nameEn: 'Viscosity',
    category: 'ميكانيكا',
    icon: '🍯',
    difficulty: 2,
    description: 'مقاومة السائل للجريان',
    equations: [
      { name: 'قانون ستوكس', formula: 'F = 6πηrv', desc: 'لكرة في سائل' },
      { name: 'سرعة الترسيب', formula: 'v = mg/6πηr', desc: 'السرعة النهائية' }
    ],
    variables: [
      { name: 'eta', label: 'اللزوجة', unit: 'Pa·s', unitOptions: [
        { label: 'Pa·s', value: 'Pa·s', factor: 1 }
      ], min: 0.001, max: 1, default: 0.001 },
      { name: 'r', label: 'نصف قطر الكرة', unit: 'mm', unitOptions: [
        { label: 'mm', value: 'mm', factor: 1 }
      ], min: 0.1, max: 5, default: 1 }
    ],
    results: [
      { name: 'قوة ستوكس', formula: 'F = 6πηrv', unit: 'N', color: 'cyan' }
    ],
    simulationType: 'wave',
    aiExplanation: 'اللزوجة مقياس لمقاومة السائل للجريان. العسل عالي اللزوجة.',
    realWorld: 'التزييت، الدم، الطبخ',
    tips: [
      'η الماء = 0.001 Pa·s (منخفضة)',
      'η العسل = 1-10 Pa·s (عالية)',
      'اللزوجة تنخفض مع الحرارة'
    ],
    chartTypes: [
      { x: 'نصف القطر (mm)', y: 'القوة (N)', type: 'line' }
    ]
  },

  // ─────────────────────────────────────────────────────────
  // 📐 الكهرومغناطيسية المتقدمة
  // ─────────────────────────────────────────────────────────
  {
    id: 'maxwell-equations',
    name: 'معادلات ماكسويل',
    nameEn: "Maxwell's Equations",
    category: 'كهرباء',
    icon: '📡',
    difficulty: 3,
    description: 'أساس الكهرومغناطيسية',
    equations: [
      { name: 'قانون غاوس', formula: '∮E·dA = Q/ε₀', desc: 'للكهرباء' },
      { name: 'قانون غاوس', formula: '∮B·dA = 0', desc: 'للمغناطيسية' },
      { name: 'قانون فاراداي', formula: '∮E·dl = -dΦ/dt', desc: 'الحث' }
    ],
    variables: [
      { name: 'Q', label: 'الشحنة', unit: 'C', unitOptions: [
        { label: 'C', value: 'C', factor: 1 }
      ], min: 1e-9, max: 1e-6, default: 1e-8 }
    ],
    results: [
      { name: 'المجال', formula: 'E = Q/4πε₀r²', unit: 'N/C', color: 'cyan' }
    ],
    simulationType: 'wave',
    aiExplanation: 'معادلات ماكسويل الأربع تصف جميع الظواهر الكهرومغناطيسية.',
    realWorld: 'الأمواج الراديوية، الضوء، الرادار',
    tips: [
      'توحيد الكهرباء والمغناطيسية',
      'توقع الموجات الكهرومغناطيسية',
      'c = 1/√(μ₀ε₀)'
    ],
    chartTypes: [
      { x: 'الشحنة (C)', y: 'المجال (N/C)', type: 'line' }
    ]
  },
  {
    id: 'electromagnetic-waves',
    name: 'الأمواج الكهرومغناطيسية',
    nameEn: 'Electromagnetic Waves',
    category: 'كهرباء',
    icon: '📶',
    difficulty: 2,
    description: 'خصائص وانواع الموجات الكهرومغناطيسية',
    equations: [
      { name: 'سرعة', formula: 'c = fλ', desc: 'السرعة في الفراغ' },
      { name: 'المجالات', formula: 'E ⟂ B ⟂ direction', desc: 'التعامد' },
      { name: 'شدة', formula: 'I = P/A', desc: 'شدة الموجة' }
    ],
    variables: [
      { name: 'f', label: 'التردد', unit: 'Hz', unitOptions: [
        { label: 'Hz', value: 'Hz', factor: 1 }
      ], min: 1e6, max: 1e20, default: 1e14 }
    ],
    results: [
      { name: 'الطول الموجي', formula: 'λ = c/f', unit: 'm', color: 'cyan' },
      { name: 'c', formula: 'c = 3×10⁸ m/s', unit: 'm/s', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'الضوء موجة كهرومغناطيسية. لا تحتاج وسطاً للانتشار.',
    realWorld: 'الراديو، الضوء، الأشعة السينية',
    tips: [
      'c = 299,792,458 m/s (في الفراغ)',
      'E و B في طور',
      'الطيف الكهرومغناطيسي واسع جداً'
    ],
    chartTypes: [
      { x: 'التردد (Hz)', y: 'الطول الموجي (m)', type: 'line' }
    ]
  },

  // ─────────────────────────────────────────────────────────
  // 🎯 فيزياء متقدمة
  // ─────────────────────────────────────────────────────────
  {
    id: 'cosmology',
    name: 'علم الكون',
    nameEn: 'Cosmology',
    category: 'فيزياء حديثة',
    icon: '🌌',
    difficulty: 3,
    description: 'الكون وتوسعه',
    equations: [
      { name: 'هابل', formula: 'v = H₀d', desc: 'قانون هابل' },
      { name: 'ثابت هابل', formula: 'H₀ ≈ 70 km/s/Mpc', desc: 'قيمة تقريبية' },
      { name: 'عمر الكون', formula: 't ≈ 1/H₀', desc: 'تقدير' }
    ],
    variables: [
      { name: 'd', label: 'المسافة', unit: 'Mpc', unitOptions: [
        { label: 'Mpc', value: 'Mpc', factor: 1 },
        { label: 'Mly', value: 'Mly', factor: 0.306 }
      ], min: 1, max: 10000, default: 100 },
      { name: 'H0', label: 'ثابت هابل', unit: 'km/s/Mpc', unitOptions: [
        { label: 'km/s/Mpc', value: 'km/s/Mpc', factor: 1 }
      ], min: 50, max: 100, default: 70 }
    ],
    results: [
      { name: 'سرعة الابتعاد', formula: 'v = H₀d', unit: 'km/s', color: 'cyan' },
      { name: 'عمر الكون', formula: 't ≈ 1/H₀', unit: 'Gyr', color: 'amber' }
    ],
    simulationType: 'projectile',
    aiExplanation: 'الكون يتمدد! المجرات تبتعد عنا بسرعة تتناسب مع المسافة.',
    realWorld: 'تلسكوب هابل، إشعاع الخلفية الكونية',
    tips: [
      'المجرات البعيدة أبعد وأسرع',
      'عمر الكون ~ 13.8 مليار سنة',
      'الطاقة المظلمة تسرع التوسع'
    ],
    chartTypes: [
      { x: 'المسافة (Mpc)', y: 'السرعة (km/s)', type: 'line' }
    ]
  },
  {
    id: 'special-relativity2',
    name: 'النسبية الخاصة - تطبيقات',
    nameEn: 'Special Relativity Applications',
    category: 'فيزياء حديثة',
    icon: '🚀',
    difficulty: 3,
    description: 'تطبيقات عملية للنسبية الخاصة',
    equations: [
      { name: 'عامل غاما', formula: 'γ = 1/√(1 - v²/c²)', desc: 'عامل لورنتز' },
      { name: 'تمدد الزمن', formula: 'Δt = γΔt₀', desc: 'للمراقب' },
      { name: 'انكماش الطول', formula: 'L = L₀/γ', desc: 'في اتجاه الحركة' }
    ],
    variables: [
      { name: 'v', label: 'السرعة', unit: 'km/s', unitOptions: [
        { label: 'km/s', value: 'km/s', factor: 1000 },
        { label: 'm/s', value: 'm/s', factor: 1 }
      ], min: 1000000, max: 290000000, default: 200000000 }
    ],
    results: [
      { name: 'γ', formula: 'γ = 1/√(1 - v²/c²)', unit: '', color: 'cyan' },
      { name: 'النسبة v/c', formula: 'v/c', unit: '', color: 'amber' }
    ],
    simulationType: 'wave',
    aiExplanation: 'النسبية الخاصة تغير مفهومنا عن الزمن والطول والكتلة.',
    realWorld: 'نظام GPS، الساعة الذرية في الطائرات',
    tips: [
      'عند v << c: γ ≈ 1 (الكلاسيكية صحيحة)',
      'عند v → c: γ → ∞',
      'لا يمكن الوصول لسرعة الضوء'
    ],
    chartTypes: [
      { x: 'v/c', y: 'γ', type: 'line' }
    ]
  },
  {
    id: ' semiconductors',
    name: 'أشباه الموصلات',
    nameEn: 'Semiconductors',
    category: 'كهرباء',
    icon: '🔲',
    difficulty: 3,
    description: 'فيزياء الأجهزة الإلكترونية',
    equations: [
      { name: 'طاقة الفجوة', formula: 'E_g ≈ 1.1 eV (Si)', desc: 'فجوة الطاقة' },
      { name: 'تيار', formula: 'I = I₀(e^V/nV_T - 1)', desc: 'معادلة الديود' }
    ],
    variables: [
      { name: 'V', label: 'الجهد', unit: 'V', unitOptions: [
        { label: 'V', value: 'V', factor: 1 }
      ], min: -1, max: 1, default: 0.5 },
      { name: 'n', label: 'معامل الجودة', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 1, max: 3, default: 1 }
    ],
    results: [
      { name: 'التيار', formula: 'I = I₀e^(V/V_T)', unit: 'A', color: 'cyan' }
    ],
    simulationType: 'circuit',
    aiExplanation: 'أشباه الموصلات أساس الإلكترونيات الحديثة. السيليكون الأكثر استخداماً.',
    realWorld: 'الترانزستورات، الديودات، الدوائر المتكاملة',
    tips: [
      'Si: Eg = 1.1 eV, Ge: Eg = 0.67 eV',
      'الأشباه الموصلة N: electron majority',
      'الأشباه الموصلة P: hole majority'
    ],
    chartTypes: [
      { x: 'الجهد (V)', y: 'التيار (A)', type: 'line' }
    ]
  },
  {
    id: 'solid-state',
    name: 'فيزياء الحالة الصلبة',
    nameEn: 'Solid State Physics',
    category: 'فيزياء حديثة',
    icon: '💎',
    difficulty: 3,
    description: 'بنية المواد الصلبة',
    equations: [
      { name: 'طاقة فيرمي', formula: 'E_F = (h²/2m)(3π²n)^(2/3)', desc: 'لإلكترونات حرة' },
      { name: 'الفجوة', formula: 'E_gap', desc: 'طاقة الفجوة بين النطاقين' }
    ],
    variables: [
      { name: 'n', label: 'تركيز الإلكترونات', unit: 'm⁻³', unitOptions: [
        { label: 'm⁻³', value: 'm⁻³', factor: 1 }
      ], min: 1e27, max: 1e29, default: 1e28 }
    ],
    results: [
      { name: 'طاقة فيرمي', formula: 'E_F ∝ n^(2/3)', unit: 'eV', color: 'cyan' }
    ],
    simulationType: 'wave',
    aiExplanation: 'فيزياء الحالة الصلبة تدرس الخصائص الإلكترونية للمواد.',
    realWorld: 'المعادن، العوازل، أشباه الموصلات',
    tips: [
      'المعادن: نطاق تكاد conduction فارغ',
      'العوازل: فجوة كبيرة (> 3 eV)',
      'أشباه الموصلات: فجوة صغيرة (1-2 eV)'
    ],
    chartTypes: [
      { x: 'n (m⁻³)', y: 'E_F (eV)', type: 'line' }
    ]
  },
  {
    id: 'particle-physics',
    name: 'فيزياء الجسيمات',
    nameEn: 'Particle Physics',
    category: 'فيزياء حديثة',
    icon: '🔬',
    difficulty: 3,
    description: 'الجسيمات الأولية والقوى',
    equations: [
      { name: 'الكواركات', formula: 'u, d, c, s, t, b', desc: '6 أنواع' },
      { name: 'اللبتونات', formula: 'e, μ, τ, ν_e, ν_μ, ν_τ', desc: '6 أنواع' },
      { name: 'القوى', formula: 'EM, Weak, Strong, Gravity', desc: '4 قوى أساسية' }
    ],
    variables: [
      { name: 'E', label: 'الطاقة', unit: 'GeV', unitOptions: [
        { label: 'GeV', value: 'GeV', factor: 1 },
        { label: 'TeV', value: 'TeV', factor: 1000 }
      ], min: 0.1, max: 100, default: 1 }
    ],
    results: [
      { name: 'الطاقة بـ جول', formula: 'E = E_GeV × 1.6×10⁻¹⁰', unit: 'J', color: 'cyan' }
    ],
    simulationType: 'magnetic',
    aiExplanation: 'فيزياء الجسيمات تبحث عن المكونات الأساسية للمادة.',
    realWorld: 'مصادم الهادرونات، المادة المضادة',
    tips: [
      'الكوارك + الكوارك = هادرون',
      'البروتون: uud، النيوترون: udd',
      'هناك 4 قوى: كهرومغناطيسية، ضعيفة، قوية، جاذبية'
    ],
    chartTypes: [
      { x: 'الطاقة (GeV)', y: 'الطاقة (J)', type: 'line' }
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
  isPlaying,
  tableData = [],
  tableCols = []
}: {
  exp: Experiment;
  vars: Record<string, number>;
  time: number;
  isPlaying: boolean;
  tableData?: {x: number, y: number}[];
  tableCols?: DataCol[];
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
    
    // ── رسم بيانات الجدول إذا كانت متوفرة ──
    if (tableData.length > 0 && tableCols.length >= 2) {
      // حساب الحدود
      const minX = Math.min(...tableData.map(d => d.x));
      const maxX = Math.max(...tableData.map(d => d.x));
      const minY = Math.min(...tableData.map(d => d.y));
      const maxY = Math.max(...tableData.map(d => d.y));
      const rangeX = maxX - minX || 1;
      const rangeY = maxY - minY || 1;
      
      const padding = 50;
      const chartW = W - padding * 2;
      const chartH = H - padding * 2;
      
      const toX = (x: number) => padding + ((x - minX) / rangeX) * chartW;
      const toY = (y: number) => H - padding - ((y - minY) / rangeY) * chartH;
      
      // رسم المحاور
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, H - padding);
      ctx.lineTo(W - padding, H - padding);
      ctx.moveTo(padding, H - padding);
      ctx.lineTo(padding, padding);
      ctx.stroke();
      
      // رسم نقاط البيانات
      tableData.forEach((d, i) => {
        const x = toX(d.x);
        const y = toY(d.y);
        
        // نقطة البيانات
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#f97316';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // رقم النقطة
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, x, y - 12);
      });
      
      // رسم خط أفضل مطابقة إذا كانت هناك نقطتان على الأقل
      if (tableData.length >= 2) {
        const n = tableData.length;
        let sumX = 0, sumY = 0;
        tableData.forEach(d => { sumX += d.x; sumY += d.y; });
        const meanX = sumX / n;
        const meanY = sumY / n;
        
        let num = 0, den = 0;
        tableData.forEach(d => {
          num += (d.x - meanX) * (d.y - meanY);
          den += (d.x - meanX) * (d.x - meanX);
        });
        const slope = den !== 0 ? num / den : 0;
        const intercept = meanY - slope * meanX;
        
        // رسم الخط
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        const x1 = minX - rangeX * 0.1;
        const x2 = maxX + rangeX * 0.1;
        ctx.moveTo(toX(x1), toY(slope * x1 + intercept));
        ctx.lineTo(toX(x2), toY(slope * x2 + intercept));
        ctx.stroke();
        ctx.setLineDash([]);
        
        // عنوان المحاكاة
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`📊 محاكاة من البيانات: ${tableData.length} نقطة`, W / 2, 25);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Arial';
        ctx.fillText(`y = ${slope.toFixed(3)}x + ${intercept.toFixed(3)}`, W / 2, 40);
      }
      
      return; // لا نرسم المحاكاة التقليدية عند استخدام البيانات
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
  const [saveMessage, setSaveMessage] = useState('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  
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
  
  // ── تحليل الرسم البياني ──
  const [slopeData, setSlopeData] = useState<{slope: number; rSquared: number; xCol: string; yCol: string} | null>(null);
  
  // ── الوحدات ──
  const [unitCat, setUnitCat] = useState('length');
  const [unitVal, setUnitVal] = useState('1');
  
  // ── استخدام بيانات الجدول في المحاكاة ──
  const [useTableDataInSim, setUseTableDataInSim] = useState(false);
  
  // ── إعادة رسم المحاكاة عند تغير البيانات ──
  useEffect(() => {
    if (useTableDataInSim && chartData.length > 0) {
      setIsPlaying(false);
    }
  }, [useTableDataInSim, chartData]);
  
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
  
  // ── حساب الميل ومعامل الارتباط ──
  const calculateSlopeAndRSquared = useCallback((tableRows: DataRow[], tableCols: DataCol[]) => {
    // البحث عن أول عمودين رقميين
    const numericCols = tableCols.filter(col => {
      const values = tableRows.map(r => parseFloat(r.values[col.id]));
      return values.some(v => !isNaN(v));
    });
    
    if (numericCols.length < 2) {
      setSlopeData(null);
      return;
    }
    
    const xCol = numericCols[0];
    const yCol = numericCols[1];
    
    const points = tableRows
      .map(r => ({ x: parseFloat(r.values[xCol.id]), y: parseFloat(r.values[yCol.id]) }))
      .filter(p => !isNaN(p.x) && !isNaN(p.y));
    
    if (points.length < 2) {
      setSlopeData(null);
      return;
    }
    
    // حساب المتوسط
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;
    
    // حساب الميل (slope)
    let numerator = 0;
    let denominator = 0;
    for (const p of points) {
      numerator += (p.x - meanX) * (p.y - meanY);
      denominator += (p.x - meanX) * (p.x - meanX);
    }
    const slope = denominator !== 0 ? numerator / denominator : 0;
    
    // حساب R² (معامل الارتباط)
    let ssRes = 0;
    let ssTot = 0;
    for (const p of points) {
      const yPred = meanY + slope * (p.x - meanX);
      ssRes += Math.pow(p.y - yPred, 2);
      ssTot += Math.pow(p.y - meanY, 2);
    }
    const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
    
    setSlopeData({
      slope,
      rSquared: Math.max(0, Math.min(1, rSquared)), // التأكد من أن R² بين 0 و 1
      xCol: xCol.name,
      yCol: yCol.name
    });
  }, []);
  
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
  
  // ── حفظ البيانات ──
  const saveData = () => {
    if (!exp) return;
    const saveKey = `phData_${exp.id}`;
    const saveObj = {
      expId: exp.id,
      cols,
      rows,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(saveKey, JSON.stringify(saveObj));
    setLastSaved(new Date().toISOString());
    setSaveMessage('✅ تم حفظ البيانات بنجاح!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  // ── تحميل البيانات المحفوظة ──
  const loadSavedData = () => {
    if (!exp) return;
    const saveKey = `phData_${exp.id}`;
    const saved = localStorage.getItem(saveKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setCols(data.cols || []);
        setRows(data.rows || []);
        setLastSaved(data.savedAt);
        setSaveMessage('📂 تم تحميل البيانات المحفوظة!');
        setTimeout(() => setSaveMessage(''), 2000);
      } catch {
        setSaveMessage('❌ خطأ في تحميل البيانات');
        setTimeout(() => setSaveMessage(''), 2000);
      }
    } else {
      setSaveMessage('📭 لا توجد بيانات محفوظة لهذه التجربة');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };

  // ── تصدير البيانات ──
  const exportData = () => {
    if (!exp) return;
    const csvContent = [
      cols.map(c => `${c.name} (${c.unit})`).join(','),
      ...rows.map(r => cols.map(c => r.values[c.id] || '').join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exp.name}_data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveMessage('📥 تم تصدير البيانات!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  // ── حذف البيانات المحفوظة ──
  const deleteSavedData = () => {
    if (!exp) return;
    const saveKey = `phData_${exp.id}`;
    localStorage.removeItem(saveKey);
    setLastSaved(null);
    setSaveMessage('🗑️ تم حذف البيانات المحفوظة');
    setTimeout(() => setSaveMessage(''), 2000);
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
                      {exp.simulationType === 'photoelectric' || exp.simulationType === 'bohr-model' || exp.simulationType === 'radioactivity' ? (
                        <PhysicsSimulatorV2
                          experimentType={exp.simulationType}
                          variables={vars}
                          width={560}
                          height={280}
                        />
                      ) : (
                        <SimulationCanvas 
                          exp={exp} 
                          vars={vars} 
                          time={simTime} 
                          isPlaying={isPlaying}
                          tableData={useTableDataInSim ? chartData : []}
                          tableCols={useTableDataInSim ? cols : []}
                        />
                      )}
                      <div className="flex items-center justify-center gap-3 p-3 bg-slate-900/80 flex-wrap">
                        {/* زر تبديل وضع البيانات */}
                        <button
                          onClick={() => setUseTableDataInSim(!useTableDataInSim)}
                          disabled={chartData.length === 0}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                            useTableDataInSim 
                              ? 'bg-amber-600 hover:bg-amber-500' 
                              : 'bg-slate-700 hover:bg-slate-600'
                          } ${chartData.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={chartData.length === 0 ? 'يجب رسم البيانات أولاً' : 'تبديل بين المحاكاة الكلاسيكية وبيانات الجدول'}
                        >
                          <BarChart3 className="w-4 h-4" />
                          {useTableDataInSim ? '📊 وضع البيانات' : '🎬 المحاكاة'}
                        </button>
                        
                        <div className="w-px h-6 bg-slate-600" />
                        
                        <button
                          onClick={runSim}
                          disabled={useTableDataInSim}
                          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                            isPlaying 
                              ? 'bg-rose-600 hover:bg-rose-500' 
                              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
                          } ${useTableDataInSim ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                    {/* ═══ 🔬 لوحة المتغيرات الحية (Live Variables) ═══ */}
                    <div className="bg-gradient-to-r from-purple-950/40 to-violet-950/40 rounded-2xl p-4 border border-purple-800/30">
                      <h4 className="text-xs font-bold text-purple-300 mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        📊 المتغيرات الفيزيائية الحية
                        <span className="text-[9px] bg-purple-600/30 px-2 py-0.5 rounded-full mr-auto">تحديث تلقائي</span>
                      </h4>
                      
                      {/* المتغيرات الأساسية */}
                      <div className="mb-4">
                        <p className="text-[10px] text-purple-400 mb-2 font-bold">📥 المتغيرات المُدخلة:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {exp.variables.map((vv, idx) => {
                            const val = vars[vv.name] ?? vv.default;
                            const range = vv.max - vv.min;
                            const percentage = ((val - vv.min) / range) * 100;
                            return (
                              <div key={vv.name} className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] text-slate-400">{vv.label}</span>
                                  <span className="text-xs font-bold text-purple-300">{val.toFixed(2)} {vv.unit}</span>
                                </div>
                                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-300"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* القيم المحسوبة */}
                      {Object.keys(results).length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] text-green-400 mb-2 font-bold">📐 القيم المحسوبة:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {exp.results.map((r, idx) => {
                              const val = Object.values(results)[idx];
                              if (val === undefined) return null;
                              return (
                                <div key={r.name} className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] text-slate-400">{r.name}</span>
                                    <span className="text-xs font-bold" style={{ color: COLOR_MAP[r.color] }}>
                                      {typeof val === 'number' ? val.toFixed(4) : val}
                                    </span>
                                  </div>
                                  <p className="text-[8px] text-slate-500">{r.unit}</p>
                                  <p className="text-[8px] text-amber-400/70 font-mono mt-0.5">{r.formula}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* تجربة التأثير الكهروضوئي - معلومات إضافية */}
                      {exp.id === 'photoelectric' && (
                        <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                          <p className="text-[10px] text-cyan-400 mb-2 font-bold">⚡ معادلات التأثير الكهروضوئي:</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px]">
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">E = hf = hc/λ</p>
                              <p className="text-slate-400">طاقة الفوتون</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">KE = hf - φ</p>
                              <p className="text-slate-400">الطاقة الحركية</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">f₀ = φ/h</p>
                              <p className="text-slate-400">التردد الحرج</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">λ₀ = hc/φ</p>
                              <p className="text-slate-400">الطول الموجي الحرج</p>
                            </div>
                          </div>
                          {vars.wavelength && vars.workFunc && (
                            <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
                              {(() => {
                                const h = 6.626e-34, c = 3e8, e = 1.602e-19;
                                const wavelength = vars.wavelength * 1e-9;
                                const freq = c / wavelength;
                                const photonE = (h * freq) / e;
                                const workF = vars.workFunc;
                                const kineticE = Math.max(0, photonE - workF);
                                const thresholdFreq = (workF * e) / h;
                                const thresholdLambda = (h * c) / (workF * e);
                                return (
                                  <>
                                    <span className="bg-blue-900/30 px-2 py-1 rounded">التردد: {(freq/1e14).toFixed(3)}×10¹⁴ Hz</span>
                                    <span className="bg-green-900/30 px-2 py-1 rounded">KE: {kineticE.toFixed(3)} eV</span>
                                    <span className="bg-red-900/30 px-2 py-1 rounded">λ₀: {thresholdLambda.toFixed(0)} nm</span>
                                    <span className="bg-purple-900/30 px-2 py-1 rounded">f₀: {(thresholdFreq/1e14).toFixed(3)}×10¹⁴ Hz</span>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* تجربة السقوط الحر */}
                      {exp.id === 'free-fall' && vars.height && vars.gravity && (
                        <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                          <p className="text-[10px] text-cyan-400 mb-2 font-bold">🏃 معادلات السقوط الحر:</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px]">
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">h = ½gt²</p>
                              <p className="text-slate-400">الارتفاع</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">v = gt</p>
                              <p className="text-slate-400">السرعة</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">KE = ½mv²</p>
                              <p className="text-slate-400">الطاقة الحركية</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">PE = mgh</p>
                              <p className="text-slate-400">الطاقة الكامنة</p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                            <span className="bg-blue-900/30 px-2 py-1 rounded">
                              زمن السقوط: {Math.sqrt(2 * vars.height / vars.gravity).toFixed(3)} s
                            </span>
                            <span className="bg-green-900/30 px-2 py-1 rounded">
                              السرعة النهائية: {(vars.gravity * Math.sqrt(2 * vars.height / vars.gravity)).toFixed(3)} m/s
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* تجربة المقذوفات */}
                      {exp.id === 'projectile' && vars.velocity && vars.angle && (
                        <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                          <p className="text-[10px] text-cyan-400 mb-2 font-bold">🎯 معادلات الحركة القذفية:</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                            <span className="bg-blue-900/30 px-2 py-1 rounded">
                              المدى: {((vars.velocity ** 2 * Math.sin(2 * vars.angle * Math.PI / 180)) / 9.8).toFixed(3)} m
                            </span>
                            <span className="bg-green-900/30 px-2 py-1 rounded">
                              أقصى ارتفاع: {((vars.velocity ** 2 * Math.sin(vars.angle * Math.PI / 180) ** 2) / (2 * 9.8)).toFixed(3)} m
                            </span>
                            <span className="bg-purple-900/30 px-2 py-1 rounded">
                              زمن الرحلة: {(2 * vars.velocity * Math.sin(vars.angle * Math.PI / 180) / 9.8).toFixed(3)} s
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* تجربة قانون أوم */}
                      {exp.id === 'ohms-law' && vars.voltage && vars.resistance && (
                        <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                          <p className="text-[10px] text-cyan-400 mb-2 font-bold">⚡ معادلات قانون أوم:</p>
                          <div className="grid grid-cols-3 gap-2 text-[9px]">
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">V = IR</p>
                              <p className="text-slate-400">الجهد</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">P = VI</p>
                              <p className="text-slate-400">القدرة</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">W = Pt</p>
                              <p className="text-slate-400">الشغل</p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                            <span className="bg-blue-900/30 px-2 py-1 rounded">
                              التيار: {(vars.voltage / vars.resistance).toFixed(3)} A
                            </span>
                            <span className="bg-green-900/30 px-2 py-1 rounded">
                              القدرة: {(vars.voltage * (vars.voltage / vars.resistance)).toFixed(3)} W
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* تجربة البندول */}
                      {exp.id === 'pendulum' && vars.length && (
                        <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                          <p className="text-[10px] text-cyan-400 mb-2 font-bold">🔔 معادلات البندول البسيط:</p>
                          <div className="grid grid-cols-2 gap-2 text-[9px] mb-2">
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">T = 2π√(L/g)</p>
                              <p className="text-slate-400">الزمن الدوري</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">f = 1/T</p>
                              <p className="text-slate-400">التردد</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            <span className="bg-blue-900/30 px-2 py-1 rounded">
                              T = {(2 * Math.PI * Math.sqrt(vars.length / 9.8)).toFixed(3)} s
                            </span>
                            <span className="bg-green-900/30 px-2 py-1 rounded">
                              f = {(1 / (2 * Math.PI * Math.sqrt(vars.length / 9.8))).toFixed(3)} Hz
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* تجربة الموجات */}
                      {exp.id === 'wave' && vars.frequency && vars.amplitude && (
                        <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                          <p className="text-[10px] text-cyan-400 mb-2 font-bold">🌊 معادلات الموجات:</p>
                          <div className="grid grid-cols-3 gap-2 text-[9px] mb-2">
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">v = fλ</p>
                              <p className="text-slate-400">السرعة</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">ω = 2πf</p>
                              <p className="text-slate-400">السرعة الزاوية</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                              <p className="text-amber-400 font-mono mb-1">T = 1/f</p>
                              <p className="text-slate-400">الدور</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            <span className="bg-blue-900/30 px-2 py-1 rounded">
                              λ = {(1 / vars.frequency).toFixed(3)} m
                            </span>
                            <span className="bg-green-900/30 px-2 py-1 rounded">
                              ω = {(2 * Math.PI * vars.frequency).toFixed(3)} rad/s
                            </span>
                            <span className="bg-purple-900/30 px-2 py-1 rounded">
                              T = {(1 / vars.frequency).toFixed(3)} s
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* تجربة الانكسار */}
                      {exp.id === 'refraction' && vars.n1 && vars.n2 && vars.angle1 && (
                        <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                          <p className="text-[10px] text-cyan-400 mb-2 font-bold">🔮 معادلات الانكسار:</p>
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            {(() => {
                              const n1 = vars.n1, n2 = vars.n2;
                              const a1 = vars.angle1 * Math.PI / 180;
                              const sin2 = (n1 * Math.sin(a1)) / n2;
                              const a2 = sin2 <= 1 ? Math.asin(sin2) * 180 / Math.PI : 0;
                              return (
                                <>
                                  <span className="bg-blue-900/30 px-2 py-1 rounded">
                                    زاوية الانكسار: {a2.toFixed(2)}°
                                  </span>
                                  <span className="bg-green-900/30 px-2 py-1 rounded">
                                    الانحراف: {(vars.angle1 - a2).toFixed(2)}°
                                  </span>
                                  <span className="bg-purple-900/30 px-2 py-1 rounded">
                                    sin(θ₂) = {sin2.toFixed(4)}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                      
                      {/* تجربة النشاط الإشعاعي */}
                      {exp.id === 'radioactivity' && vars.N0 && vars.halfLife && vars.time && (
                        <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                          <p className="text-[10px] text-cyan-400 mb-2 font-bold">☢️ معادلات النشاط الإشعاعي:</p>
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            {(() => {
                              const N0 = vars.N0, tH = vars.halfLife, t = vars.time;
                              const lambda = Math.log(2) / tH;
                              const remaining = N0 * Math.exp(-lambda * t);
                              return (
                                <>
                                  <span className="bg-blue-900/30 px-2 py-1 rounded">
                                    λ = {lambda.toFixed(4)} s⁻¹
                                  </span>
                                  <span className="bg-green-900/30 px-2 py-1 rounded">
                                    N = {remaining.toFixed(0)} ذرة
                                  </span>
                                  <span className="bg-red-900/30 px-2 py-1 rounded">
                                    النسبة: {((remaining/N0)*100).toFixed(1)}%
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                      
                      {/* تجربة الديناميكا الحرارية */}
                      {exp.id === 'thermodynamics' && vars.mass && vars.c && vars.deltaT && (
                        <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                          <p className="text-[10px] text-cyan-400 mb-2 font-bold">🌡️ معادلات الديناميكا:</p>
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            <span className="bg-blue-900/30 px-2 py-1 rounded">
                              Q = {(vars.mass * vars.c * vars.deltaT).toFixed(2)} J
                            </span>
                            <span className="bg-green-900/30 px-2 py-1 rounded">
                              الحرارة النوعية: {vars.c} J/kg·K
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* تجربة التصادم */}
                      {exp.id === 'collision' && vars.m1 && vars.v1 && vars.m2 && vars.v2 !== undefined && (
                        <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                          <p className="text-[10px] text-cyan-400 mb-2 font-bold">💥 معادلات التصادم:</p>
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            <span className="bg-blue-900/30 px-2 py-1 rounded">
                              p = {(vars.m1 * vars.v1 + vars.m2 * vars.v2).toFixed(2)} kg·m/s
                            </span>
                            <span className="bg-green-900/30 px-2 py-1 rounded">
                              KE قبل: {(0.5 * vars.m1 * vars.v1 ** 2 + 0.5 * vars.m2 * vars.v2 ** 2).toFixed(2)} J
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* تجربة المجال المغناطيسي */}
                      {exp.id === 'magnetic' && vars.charge && vars.velocity && vars.B && (
                        <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                          <p className="text-[10px] text-cyan-400 mb-2 font-bold">🧲 معادلات المجال المغناطيسي:</p>
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            {(() => {
                              const q = vars.charge * 1e-6, v = vars.velocity, B = vars.B;
                              const F = q * v * B;
                              const r = (9.11e-31 * v) / (q * B);
                              return (
                                <>
                                  <span className="bg-blue-900/30 px-2 py-1 rounded">
                                    F = {F.toExponential(3)} N
                                  </span>
                                  <span className="bg-green-900/30 px-2 py-1 rounded">
                                    r = {r.toExponential(3)} m
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
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
                      {chartData.length > 0 && exp.chartTypes[selectedChart] && (
                        <PhysicsChart
                          data={chartData}
                          title={`${exp.chartTypes[selectedChart]?.x || 'X'} vs ${exp.chartTypes[selectedChart]?.y || 'Y'}`}
                          xLabel={exp.chartTypes[selectedChart]?.x || 'X'}
                          yLabel={exp.chartTypes[selectedChart]?.y || 'Y'}
                          chartType={exp.chartTypes[selectedChart]?.type || 'line'}
                          color={['cyan', 'emerald', 'amber', 'rose', 'violet'][selectedChart % 5]}
                          height={300}
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
                    
                    {/* رسالة الحفظ/التحميل */}
                    {saveMessage && (
                      <div className={`px-4 py-2 rounded-xl text-sm font-bold text-center transition ${
                        saveMessage.includes('✅') || saveMessage.includes('📂') ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-600/30' :
                        saveMessage.includes('❌') ? 'bg-red-900/50 text-red-400 border border-red-600/30' :
                        saveMessage.includes('🗑️') ? 'bg-amber-900/50 text-amber-400 border border-amber-600/30' :
                        'bg-cyan-900/50 text-cyan-400 border border-cyan-600/30'
                      }`}>
                        {saveMessage}
                      </div>
                    )}
                    
                    {/* شريط الأزرار */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={saveData}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl text-xs font-bold transition flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        💾 حفظ البيانات
                      </button>
                      <button
                        onClick={loadSavedData}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-xs font-bold transition flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        📂 تحميل البيانات
                      </button>
                      <button
                        onClick={exportData}
                        className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl text-xs font-bold transition flex items-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        📥 تصدير CSV
                      </button>
                      {lastSaved && (
                        <button
                          onClick={deleteSavedData}
                          className="px-4 py-2 bg-slate-700 hover:bg-red-600 rounded-xl text-xs font-bold transition flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          🗑️ حذف المحفوظ
                        </button>
                      )}
                    </div>
                    
                    {/* آخر حفظ */}
                    {lastSaved && (
                      <p className="text-[10px] text-slate-500 text-center">
                        آخر حفظ: {new Date(lastSaved).toLocaleString('ar-SA')}
                      </p>
                    )}
                    
                    {/* ═══ 📈 نتائج الرسم البياني ═══ */}
                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border border-slate-700 p-4 space-y-4">
                      <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        📈 نتائج تحليل البيانات
                      </h4>
                      
                      {/* أزرار التحكم */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            // تحويل بيانات الجدول إلى chartData
                            const validRows = rows.filter(r => {
                              const xVal = cols[0] ? parseFloat(r.values[cols[0].id]) : NaN;
                              const yVal = cols[1] ? parseFloat(r.values[cols[1].id]) : NaN;
                              return !isNaN(xVal) && !isNaN(yVal);
                            });
                            const newChartData = validRows.map(r => ({
                              x: parseFloat(r.values[cols[0].id]),
                              y: parseFloat(r.values[cols[1].id])
                            }));
                            setChartData(newChartData);
                            calculateSlopeAndRSquared(rows, cols);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-xs font-bold transition flex items-center gap-2"
                        >
                          <TrendingUp className="w-4 h-4" />
                          📊 رسم وتحليل البيانات
                        </button>
                      </div>
                      
                      {/* الرسم البياني */}
                      {chartData.length > 1 && (
                        <div className="bg-slate-900 rounded-xl p-3 border border-slate-700">
                          <p className="text-[10px] text-slate-400 font-bold mb-2 text-center">
                            {cols[0]?.name || 'X'} vs {cols[1]?.name || 'Y'}
                          </p>
                          <PhysicsChart
                            data={chartData}
                            title=""
                            xLabel={cols[0]?.name || 'X'}
                            yLabel={cols[1]?.name || 'Y'}
                            chartType="scatter"
                            color="cyan"
                            height={220}
                          />
                        </div>
                      )}
                      
                      {/* بطاقة النتائج */}
                      {slopeData && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-xl p-3 border border-cyan-600/30">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="w-4 h-4 text-cyan-400" />
                              <span className="text-[10px] text-slate-400">الميل (Slope)</span>
                            </div>
                            <p className="text-xl font-bold text-cyan-300">
                              {slopeData.slope.toFixed(4)}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-1">
                              {slopeData.yCol} / {slopeData.xCol}
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 rounded-xl p-3 border border-emerald-600/30">
                            <div className="flex items-center gap-2 mb-1">
                              <BarChart3 className="w-4 h-4 text-emerald-400" />
                              <span className="text-[10px] text-slate-400">معامل الارتباط (R²)</span>
                            </div>
                            <p className="text-xl font-bold text-emerald-300">
                              {slopeData.rSquared.toFixed(4)}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-1">
                              {slopeData.rSquared >= 0.9 ? '✓ ممتاز' : 
                               slopeData.rSquared >= 0.7 ? '~ جيد' : '✗ يحتاج تحسين'}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* الشرح */}
                      {slopeData && (
                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700">
                          <h5 className="text-[10px] font-bold text-amber-400 mb-2 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            الشرح:
                          </h5>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {slopeData.rSquared >= 0.9 ? (
                              <>✅ العلاقة بين <span className="text-cyan-400 font-bold">{slopeData.xCol}</span> و 
                              <span className="text-emerald-400 font-bold"> {slopeData.yCol}</span> قوية جداً!
                              معامل التحديد R² = {slopeData.rSquared.toFixed(4)} يعني أن {Math.round(slopeData.rSquared * 100)}% من التغير في {slopeData.yCol} يُفسر بـ {slopeData.xCol}.</>
                            ) : slopeData.rSquared >= 0.7 ? (
                              <>⚠️ العلاقة بين <span className="text-cyan-400 font-bold">{slopeData.xCol}</span> و 
                              <span className="text-emerald-400 font-bold"> {slopeData.yCol}</span> جيدة.
                              معامل التحديد R² = {slopeData.rSquared.toFixed(4)} يعني أن {Math.round(slopeData.rSquared * 100)}% من التغير يُفسر بالمتغير الآخر.
                              هناك {Math.round((1-slopeData.rSquared) * 100)}% من التغير ناتج عن عوامل أخرى أو أخطاء في القياس.</>
                            ) : (
                              <>❌ العلاقة ضعيفة. R² = {slopeData.rSquared.toFixed(4)} يعني أن {Math.round(slopeData.rSquared * 100)}% فقط من التغير يُفسر بالمتغير الآخر.
                              راجع البيانات أو تحقق من صحة التجربة.</>
                            )}
                            <br/>
                            <span className="text-amber-300 mt-1 block">
                              📐 الميل = {slopeData.slope.toFixed(4)} ({slopeData.yCol}/{slopeData.xCol})
                            </span>
                          </p>
                        </div>
                      )}
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
