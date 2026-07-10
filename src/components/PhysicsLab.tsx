import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Atom, Zap, Lightbulb, Thermometer, Waves, 
  Star, Search, Play, Pause, RotateCcw, 
  Send, Loader2, Trash2, Download, Plus, X,
  BarChart3, TrendingUp, Trophy, Target, Clock,
  Brain, ChevronLeft, ChevronRight, TrophyIcon,
  Medal, Crown, Zap as ZapIcon, Sparkles,
  FileText, Copy, Share2, Eye, Edit3, Check,
  Users, Timer, Award, BookOpen, FlaskConical,
  Scale, Compass, Magnet, Cpu, Atom as AtomIcon
} from 'lucide-react';
import { resolveApiUrl } from '../utils/apiBase';

// =============================================
// 📚 قاعدة بيانات التجارب الفيزيائية الشاملة
// =============================================
interface DataRow {
  id: string;
  values: Record<string, string>;
}

interface DataColumn {
  id: string;
  name: string;
  unit: string;
}

interface Experiment {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  subcategory: string;
  icon: string;
  difficulty: 'سهل' | 'متوسط' | 'صعب';
  description: string;
  equations: { name: string; formula: string; description: string }[];
  variables: { name: string; label: string; labelEn: string; unit: string; unitOptions: { label: string; value: string; factor: number }[]; min: number; max: number; default: number }[];
  results: { name: string; formula: string; unit: string }[];
  dataColumns: { name: string; unit: string; formula?: string }[];
  aiExplanation: string;
  realWorldExample: string;
  tips: string[];
}

const experiments: Experiment[] = [
  // =========================================
  // 🔧 الميكانيكا
  // =========================================
  {
    id: 'free-fall',
    name: 'السقوط الحر',
    nameEn: 'Free Fall',
    category: 'ميكانيكا',
    subcategory: 'الحركة',
    icon: '🏃',
    difficulty: 'سهل',
    description: 'محاكاة سقوط الأجسام تحت تأثير الجاذبية الأرضية',
    equations: [
      { name: 'الارتفاع', formula: 'h = ½gt²', description: 'الارتفاع كدالة زمنية' },
      { name: 'السرعة', formula: 'v = gt', description: 'السرعة اللحظية' },
      { name: 'الطاقة الحركية', formula: 'KE = ½mv²', description: 'الطاقة الحركية' },
      { name: 'الطاقة الكامنة', formula: 'PE = mgh', description: 'الطاقة الكامنة' }
    ],
    variables: [
      { name: 'height', label: 'الارتفاع', labelEn: 'Height', unit: 'm', unitOptions: [
        { label: 'متر', value: 'm', factor: 1 },
        { label: 'سنتيمتر', value: 'cm', factor: 100 },
        { label: 'كيلومتر', value: 'km', factor: 0.001 },
        { label: 'بوصة', value: 'in', factor: 39.37 },
        { label: 'قدم', value: 'ft', factor: 3.281 }
      ], min: 1, max: 100, default: 10 },
      { name: 'mass', label: 'الكتلة', labelEn: 'Mass', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 },
        { label: 'ملليغرام', value: 'mg', factor: 1000000 },
        { label: 'رطل', value: 'lb', factor: 2.205 }
      ], min: 0.1, max: 100, default: 5 },
      { name: 'gravity', label: 'الجاذبية', labelEn: 'Gravity', unit: 'm/s²', unitOptions: [
        { label: 'م/ث²', value: 'm/s²', factor: 1 },
        { label: 'سم/ث²', value: 'cm/s²', factor: 100 }
      ], min: 1, max: 25, default: 9.8 }
    ],
    results: [
      { name: 'الوقت', formula: 't = √(2h/g)', unit: 's' },
      { name: 'السرعة النهائية', formula: 'v = gt', unit: 'm/s' },
      { name: 'الطاقة الحركية', formula: 'KE = ½mv²', unit: 'J' }
    ],
    dataColumns: [
      { name: 'الزمن', unit: 's', formula: 't' },
      { name: 'الارتفاع', unit: 'm', formula: 'h = h₀ - ½gt²' },
      { name: 'السرعة', unit: 'm/s', formula: 'v = gt' },
      { name: 'الطاقة الحركية', unit: 'J', formula: 'KE = ½mv²' },
      { name: 'الطاقة الكامنة', unit: 'J', formula: 'PE = mgh' }
    ],
    aiExplanation: 'السقوط الحر هو حركة الجسم تحت تأثير الجاذبية فقط دون أي قوة خارجية. الجسم المتساقط حراً يتسارع بمعدل ثابت g = 9.8 m/s² على سطح الأرض.',
    realWorldExample: 'قطرة ماء تسقط من السحاب، أو قذيفة تُلقى من برج',
    tips: ['الارتفاع يؤثر طردياً على وقت السقوط', 'الكتلة لا تؤثر على زمن السقوط في الفراغ', 'يمكن تطبيق نفس المبادئ على الكواكب الأخرى']
  },
  {
    id: 'projectile-motion',
    name: 'الحركة القذفية',
    nameEn: 'Projectile Motion',
    category: 'ميكانيكا',
    subcategory: 'الحركة',
    icon: '🎯',
    difficulty: 'متوسط',
    description: 'حركة المقذوفات في مجال الجاذبية',
    equations: [
      { name: 'المدى', formula: 'R = v₀²sin(2θ)/g', description: 'المدى الأفقي' },
      { name: 'أقصى ارتفاع', formula: 'H = v₀²sin²θ/2g', description: 'أقصى ارتفاع' },
      { name: 'الوقت الكلي', formula: 'T = 2v₀sinθ/g', description: 'زمن الرحلة' }
    ],
    variables: [
      { name: 'velocity', label: 'السرعة الابتدائية', labelEn: 'Initial Velocity', unit: 'm/s', unitOptions: [
        { label: 'م/ث', value: 'm/s', factor: 1 },
        { label: 'كم/س', value: 'km/h', factor: 3.6 },
        { label: 'قدم/ث', value: 'ft/s', factor: 3.281 }
      ], min: 10, max: 100, default: 30 },
      { name: 'angle', label: 'زاوية الإطلاق', labelEn: 'Launch Angle', unit: '°', unitOptions: [
        { label: 'درجة', value: '°', factor: 1 },
        { label: 'راديان', value: 'rad', factor: 57.296 }
      ], min: 0, max: 90, default: 45 },
      { name: 'height', label: 'ارتفاع الإطلاق', labelEn: 'Launch Height', unit: 'm', unitOptions: [
        { label: 'متر', value: 'm', factor: 1 },
        { label: 'سنتيمتر', value: 'cm', factor: 100 }
      ], min: 0, max: 50, default: 0 }
    ],
    results: [
      { name: 'المدى', formula: 'R = v₀²sin(2θ)/g', unit: 'm' },
      { name: 'أقصى ارتفاع', formula: 'H = v₀²sin²θ/2g', unit: 'm' },
      { name: 'زمن الرحلة', formula: 'T = 2v₀sinθ/g', unit: 's' }
    ],
    dataColumns: [
      { name: 'الزمن', unit: 's' },
      { name: 'الموقع X', unit: 'm', formula: 'x = v₀cosθ·t' },
      { name: 'الموقع Y', unit: 'm', formula: 'y = v₀sinθ·t - ½gt²' },
      { name: 'السرعة X', unit: 'm/s', formula: 'vx = v₀cosθ' },
      { name: 'السرعة Y', unit: 'm/s', formula: 'vy = v₀sinθ - gt' }
    ],
    aiExplanation: 'الحركة القذفية تجمع بين حركة أفقية بسرعة ثابتة وحركة رأسية تحت تأثير الجاذبية. المسار يكون قطعاً ناقصاً ( parabola ).',
    realWorldExample: 'كرة قاعدة تُضرب، قذيفة مدفع، رائد فضاء يقفز',
    tips: ['أقصى مدى يتحقق عند زاوية 45°', 'السرعة الأفقية ثابتة', 'السرعة الرأسية تتغير بسبب الجاذبية']
  },
  {
    id: 'newtons-laws',
    name: 'قوانين نيوتن',
    nameEn: "Newton's Laws",
    category: 'ميكانيكا',
    subcategory: 'القوى',
    icon: '⚖️',
    difficulty: 'سهل',
    description: 'قانون نيوتن الثاني للحركة',
    equations: [
      { name: 'القوة', formula: 'F = ma', description: 'قانون نيوتن الثاني' },
      { name: 'التسارع', formula: 'a = F/m', description: 'التسارع من القوة' },
      { name: 'الزخم', formula: 'p = mv', description: 'الزخم الخطي' }
    ],
    variables: [
      { name: 'force', label: 'القوة', labelEn: 'Force', unit: 'N', unitOptions: [
        { label: 'نيوتن', value: 'N', factor: 1 },
        { label: 'كيلونيوتن', value: 'kN', factor: 0.001 },
        { label: 'داين', value: 'dyn', factor: 100000 },
        { label: 'رطل-قوة', value: 'lbf', factor: 0.2248 }
      ], min: 1, max: 1000, default: 100 },
      { name: 'mass', label: 'الكتلة', labelEn: 'Mass', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 }
      ], min: 1, max: 500, default: 50 }
    ],
    results: [
      { name: 'التسارع', formula: 'a = F/m', unit: 'm/s²' },
      { name: 'الزخم', formula: 'p = mv', unit: 'kg·m/s' }
    ],
    dataColumns: [
      { name: 'الزمن', unit: 's' },
      { name: 'القوة', unit: 'N' },
      { name: 'الكتلة', unit: 'kg' },
      { name: 'التسارع', unit: 'm/s²' },
      { name: 'السرعة', unit: 'm/s' }
    ],
    aiExplanation: 'قانون نيوتن الثاني ينص على أن القوة المؤثرة على جسم تتناسب طردياً مع كتلته وتسارعه. F = ma هو أساس ميكانيكا الحركة.',
    realWorldExample: 'دفع سيارة معطلة، صدم كرة بالبليارد',
    tips: ['كلما زادت القوة زاد التسارع', 'كلما زادت الكتلة قل التسارع', 'النيوتن = kg·m/s²']
  },
  {
    id: 'simple-harmonic',
    name: 'الحركة التوافقية البسيطة',
    nameEn: 'Simple Harmonic Motion',
    category: 'ميكانيكا',
    subcategory: 'الحركة',
    icon: '🔄',
    difficulty: 'صعب',
    description: 'حركة البندول والكتلة على نابض',
    equations: [
      { name: 'الإزاحة', formula: 'x = A·sin(ωt)', description: 'الإزاحة اللحظية' },
      { name: 'السرعة الزاوية', formula: 'ω = 2πf', description: 'السرعة الزاوية' },
      { name: 'الطاقة', formula: 'E = ½kA²', description: 'الطاقة الكلية' }
    ],
    variables: [
      { name: 'amplitude', label: 'السعة', labelEn: 'Amplitude', unit: 'm', unitOptions: [
        { label: 'متر', value: 'm', factor: 1 },
        { label: 'سنتيمتر', value: 'cm', factor: 100 }
      ], min: 0.1, max: 10, default: 2 },
      { name: 'frequency', label: 'التردد', labelEn: 'Frequency', unit: 'Hz', unitOptions: [
        { label: 'هرتز', value: 'Hz', factor: 1 },
        { label: 'كيلوهرتز', value: 'kHz', factor: 0.001 }
      ], min: 0.1, max: 10, default: 1 },
      { name: 'mass', label: 'الكتلة', labelEn: 'Mass', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 }
      ], min: 0.1, max: 10, default: 1 }
    ],
    results: [
      { name: 'السرعة الزاوية', formula: 'ω = 2πf', unit: 'rad/s' },
      { name: 'الطاقة', formula: 'E = ½kA²', unit: 'J' }
    ],
    dataColumns: [
      { name: 'الزمن', unit: 's' },
      { name: 'الإزاحة', unit: 'm', formula: 'x = A·sin(ωt)' },
      { name: 'السرعة', unit: 'm/s', formula: 'v = Aω·cos(ωt)' },
      { name: 'التسارع', unit: 'm/s²', formula: 'a = -Aω²·sin(ωt)' }
    ],
    aiExplanation: 'الحركة التوافقية البسيطة هي حركة دورية تتكرر فيها الحركة في اتجاهين متعاكسين حول موضع التوازن. تتناسب القوة مع الإزاحة.',
    realWorldExample: 'بندول الساعة، كتلة على نابض، وتر موسيقي',
    tips: ['الحركة متناظرة حول موضع التوازن', 'الطاقة محفوظة في النظام', 'الزمن الدوري لا يعتمد على السعة']
  },
  {
    id: 'collision',
    name: 'التصادمات',
    nameEn: 'Collisions',
    category: 'ميكانيكا',
    subcategory: 'الطاقة',
    icon: '💥',
    difficulty: 'متوسط',
    description: 'تصادمات مرنة وغير مرنة',
    equations: [
      { name: 'حفظ الزخم', formula: 'm₁v₁ + m₂v₂ = m₁v₁\' + m₂v₂\'', description: 'الزخم قبل وبعد' },
      { name: 'الطاقة الحركية', formula: 'KE = ½mv²', description: 'الطاقة الحركية' },
      { name: 'معامل restitution', formula: 'e = (v₂\'-v₁\')/(v₁-v₂)', description: 'مرونة التصادم' }
    ],
    variables: [
      { name: 'mass1', label: 'كتلة الجسم 1', labelEn: 'Mass 1', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 }
      ], min: 1, max: 100, default: 10 },
      { name: 'velocity1', label: 'سرعة الجسم 1', labelEn: 'Velocity 1', unit: 'm/s', unitOptions: [
        { label: 'م/ث', value: 'm/s', factor: 1 },
        { label: 'سم/ث', value: 'cm/s', factor: 100 }
      ], min: -20, max: 20, default: 10 },
      { name: 'mass2', label: 'كتلة الجسم 2', labelEn: 'Mass 2', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 }
      ], min: 1, max: 100, default: 5 },
      { name: 'velocity2', label: 'سرعة الجسم 2', labelEn: 'Velocity 2', unit: 'm/s', unitOptions: [
        { label: 'م/ث', value: 'm/s', factor: 1 },
        { label: 'سم/ث', value: 'cm/s', factor: 100 }
      ], min: -20, max: 20, default: -5 }
    ],
    results: [
      { name: 'الزخم الكلي', formula: 'p = m₁v₁ + m₂v₂', unit: 'kg·m/s' },
      { name: 'الطاقة الحركية قبل', formula: 'KE = ½m₁v₁² + ½m₂v₂²', unit: 'J' }
    ],
    dataColumns: [
      { name: 'الحالة', unit: '' },
      { name: 'كتلة 1', unit: 'kg' },
      { name: 'سرعة 1', unit: 'm/s' },
      { name: 'كتلة 2', unit: 'kg' },
      { name: 'سرعة 2', unit: 'm/s' },
      { name: 'الزخم الكلي', unit: 'kg·m/s' }
    ],
    aiExplanation: 'التصادمات تحفظ الزخم الكلي للنظام. في التصادمات المرنة تحفظ الطاقة الحركية أيضاً، بينما في غير المرنة تنشأ طاقة حرارية.',
    realWorldExample: 'كرة بليارد تضرب كرة أخرى، تصادم السيارات',
    tips: ['الزخم محفوظ دائماً', 'الطاقة الحركية محفوظة في التصادمات المرنة فقط', 'معامل restitution يتراوح بين 0 و 1']
  },
  {
    id: 'momentum',
    name: 'الزخم الخطي',
    nameEn: 'Linear Momentum',
    category: 'ميكانيكا',
    subcategory: 'الطاقة',
    icon: '🚀',
    difficulty: 'سهل',
    description: 'حفظ الزخم والتصادمات',
    equations: [
      { name: 'الزخم', formula: 'p = mv', description: 'الزخم الخطي' },
      { name: 'حفظ الزخم', formula: 'p₁ + p₂ = p₁\' + p₂\'', description: 'قانون الحفظ' },
      { name: 'الدفع', formula: 'J = FΔt = Δp', description: 'نظرية الدفع-الزخم' }
    ],
    variables: [
      { name: 'mass', label: 'الكتلة', labelEn: 'Mass', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 }
      ], min: 1, max: 1000, default: 50 },
      { name: 'velocity', label: 'السرعة', labelEn: 'Velocity', unit: 'm/s', unitOptions: [
        { label: 'م/ث', value: 'm/s', factor: 1 },
        { label: 'كم/س', value: 'km/h', factor: 3.6 }
      ], min: 0, max: 100, default: 20 }
    ],
    results: [
      { name: 'الزخم', formula: 'p = mv', unit: 'kg·m/s' },
      { name: 'الطاقة الحركية', formula: 'KE = ½mv²', unit: 'J' }
    ],
    dataColumns: [
      { name: 'الكتلة', unit: 'kg' },
      { name: 'السرعة', unit: 'm/s' },
      { name: 'الزخم', unit: 'kg·m/s' },
      { name: 'الطاقة الحركية', unit: 'J' }
    ],
    aiExplanation: 'الزخم الخطي هو كمية الحركة التي يحملها الجسم. قانون حفظ الزخم ينطبق على كل الأنظمة المغلقة.',
    realWorldExample: 'صاروخ يدور في الفضاء، كرة تصطدم بجدار',
    tips: ['الزخم كمية متجهة', 'وحدته kg·m/s', 'يمكن أن ينتقل بين الأجسام']
  },
  {
    id: 'work-energy',
    name: 'الشغل والطاقة',
    nameEn: 'Work & Energy',
    category: 'ميكانيكا',
    subcategory: 'الطاقة',
    icon: '⚡',
    difficulty: 'متوسط',
    description: 'تحويل الطاقة والشغل',
    equations: [
      { name: 'الشغل', formula: 'W = F·d·cosθ', description: 'الشغل المبذول' },
      { name: 'الطاقة الحركية', formula: 'KE = ½mv²', description: 'الطاقة الحركية' },
      { name: 'الطاقة الكامنة', formula: 'PE = mgh', description: 'الطاقة الكامنة الثقالية' }
    ],
    variables: [
      { name: 'force', label: 'القوة', labelEn: 'Force', unit: 'N', unitOptions: [
        { label: 'نيوتن', value: 'N', factor: 1 },
        { label: 'كيلونيوتن', value: 'kN', factor: 0.001 }
      ], min: 1, max: 500, default: 100 },
      { name: 'distance', label: 'المسافة', labelEn: 'Distance', unit: 'm', unitOptions: [
        { label: 'متر', value: 'm', factor: 1 },
        { label: 'سنتيمتر', value: 'cm', factor: 100 }
      ], min: 1, max: 100, default: 20 },
      { name: 'angle', label: 'زاوية القوة', labelEn: 'Angle', unit: '°', unitOptions: [
        { label: 'درجة', value: '°', factor: 1 },
        { label: 'راديان', value: 'rad', factor: 57.296 }
      ], min: 0, max: 180, default: 0 }
    ],
    results: [
      { name: 'الشغل', formula: 'W = Fd·cosθ', unit: 'J' },
      { name: 'القدرة', formula: 'P = W/t', unit: 'W' }
    ],
    dataColumns: [
      { name: 'القوة', unit: 'N' },
      { name: 'المسافة', unit: 'm' },
      { name: 'الزاوية', unit: '°' },
      { name: 'الشغل', unit: 'J' },
      { name: 'القدرة', unit: 'W' }
    ],
    aiExplanation: 'الشغل هو نقل الطاقة بواسطة قوة. عندما exert قوة على جسم وتحركه، فإنك تبذل شغلاً.',
    realWorldExample: 'رفع أثقال، دفع عربة تسوق',
    tips: ['الشغل = 0 عندما تكون القوة عمودية على الحركة', 'الطاقة لا تفنى ولا تُستحدث', 'القدرة = الشغل/الزمن']
  },
  {
    id: 'circular-motion',
    name: 'الحركة الدائرية',
    nameEn: 'Circular Motion',
    category: 'ميكانيكا',
    subcategory: 'الحركة',
    icon: '🔵',
    difficulty: 'متوسط',
    description: 'حركة الجسم في مسار دائري',
    equations: [
      { name: 'القوة المركزية', formula: 'Fc = mv²/r', description: 'القوة المركزية' },
      { name: 'السرعة الزاوية', formula: 'ω = v/r', description: 'السرعة الزاوية' },
      { name: 'الزمن الدوري', formula: 'T = 2πr/v', description: 'الزمن الدوري' }
    ],
    variables: [
      { name: 'mass', label: 'الكتلة', labelEn: 'Mass', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 }
      ], min: 0.1, max: 100, default: 5 },
      { name: 'velocity', label: 'السرعة', labelEn: 'Velocity', unit: 'm/s', unitOptions: [
        { label: 'م/ث', value: 'm/s', factor: 1 },
        { label: 'سم/ث', value: 'cm/s', factor: 100 }
      ], min: 1, max: 50, default: 10 },
      { name: 'radius', label: 'نصف القطر', labelEn: 'Radius', unit: 'm', unitOptions: [
        { label: 'متر', value: 'm', factor: 1 },
        { label: 'سنتيمتر', value: 'cm', factor: 100 }
      ], min: 0.5, max: 50, default: 5 }
    ],
    results: [
      { name: 'القوة المركزية', formula: 'Fc = mv²/r', unit: 'N' },
      { name: 'التسارع المركزي', formula: 'ac = v²/r', unit: 'm/s²' },
      { name: 'السرعة الزاوية', formula: 'ω = v/r', unit: 'rad/s' }
    ],
    dataColumns: [
      { name: 'نصف القطر', unit: 'm' },
      { name: 'السرعة', unit: 'm/s' },
      { name: 'القوة المركزية', unit: 'N' },
      { name: 'التسارع المركزي', unit: 'm/s²' },
      { name: 'الزمن الدوري', unit: 's' }
    ],
    aiExplanation: 'الحركة الدائرية تتطلب قوة مركزية keep الجسم يتحرك في مسار دائري. هذه القوة تكون دائماً موجهة نحو مركز الدائرة.',
    realWorldExample: 'قمر صناعي يدور حول الأرض، سيارة تنعطف',
    tips: ['القوة المركزية ليست قوة جديدة', 'السرعة الزاوية ترتبط بالتردد', 'التسارع المركزي دائماً نحو المركز']
  },
  {
    id: 'pendulum',
    name: 'البندول البسيط',
    nameEn: 'Simple Pendulum',
    category: 'ميكانيكا',
    subcategory: 'الحركة',
    icon: '🔔',
    difficulty: 'سهل',
    description: 'حركة البندول التوافقية',
    equations: [
      { name: 'الزمن الدوري', formula: 'T = 2π√(L/g)', description: 'زمن الدورة الكاملة' },
      { name: 'الطاقة الكامنة', formula: 'PE = mgh', description: 'الطاقة الكامنة' },
      { name: 'السرعة', formula: 'v = √(2gh)', description: 'السرعة في أسفل القوس' }
    ],
    variables: [
      { name: 'length', label: 'طول الخيط', labelEn: 'Length', unit: 'm', unitOptions: [
        { label: 'متر', value: 'm', factor: 1 },
        { label: 'سنتيمتر', value: 'cm', factor: 100 }
      ], min: 0.1, max: 10, default: 1 },
      { name: 'mass', label: 'الكتلة', labelEn: 'Mass', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 }
      ], min: 0.1, max: 10, default: 1 },
      { name: 'angle', label: 'زاوية الإزاحة', labelEn: 'Angle', unit: '°', unitOptions: [
        { label: 'درجة', value: '°', factor: 1 }
      ], min: 1, max: 45, default: 15 }
    ],
    results: [
      { name: 'الزمن الدوري', formula: 'T = 2π√(L/g)', unit: 's' },
      { name: 'التردد', formula: 'f = 1/T', unit: 'Hz' },
      { name: 'أقصى ارتفاع', formula: 'h = L(1-cosθ)', unit: 'm' }
    ],
    dataColumns: [
      { name: 'الزمن', unit: 's' },
      { name: 'زاوية الإزاحة', unit: '°' },
      { name: 'الارتفاع', unit: 'm' },
      { name: 'السرعة', unit: 'm/s' },
      { name: 'الطاقة الحركية', unit: 'J' }
    ],
    aiExplanation: 'البندول البسيط يوضح الحركة التوافقية البسيطة عندما تكون زاوية الإزاحة صغيرة. زمنه الدوري يعتمد فقط على طوله وتسارع الجاذبية.',
    realWorldExample: 'ساعة البندول، تأرجح طفل على أرجوحة',
    tips: ['الزمن الدوري لا يعتمد على الكتلة', 'لا يعتمد على سعة الترجحة (لزاويا صغيرة)', 'يمكن استخدام البندول لقياس g']
  },
  // =========================================
  // ⚡ الكهرباء والمغناطيسية
  // =========================================
  {
    id: 'ohms-law',
    name: 'قانون أوم',
    nameEn: "Ohm's Law",
    category: 'كهرباء',
    subcategory: 'الدوائر',
    icon: '⚡',
    difficulty: 'سهل',
    description: 'العلاقة بين الجهد والتيار والمقاومة',
    equations: [
      { name: 'الجهد', formula: 'V = IR', description: 'قانون أوم' },
      { name: 'التيار', formula: 'I = V/R', description: 'التيار الكهربائي' },
      { name: 'المقاومة', formula: 'R = V/I', description: 'المقاومة الكهربائية' },
      { name: 'القدرة', formula: 'P = VI', description: 'القدرة الكهربائية' }
    ],
    variables: [
      { name: 'voltage', label: 'الجهد', labelEn: 'Voltage', unit: 'V', unitOptions: [
        { label: 'فولت', value: 'V', factor: 1 },
        { label: 'ميلليفولت', value: 'mV', factor: 1000 },
        { label: 'كيلوفولت', value: 'kV', factor: 0.001 }
      ], min: 1, max: 220, default: 12 },
      { name: 'current', label: 'التيار', labelEn: 'Current', unit: 'A', unitOptions: [
        { label: 'أمبير', value: 'A', factor: 1 },
        { label: 'ميليأمبير', value: 'mA', factor: 1000 },
        { label: 'ميكروأمبير', value: 'μA', factor: 1000000 }
      ], min: 0.1, max: 20, default: 2 },
      { name: 'resistance', label: 'المقاومة', labelEn: 'Resistance', unit: 'Ω', unitOptions: [
        { label: 'أوم', value: 'Ω', factor: 1 },
        { label: 'كيلوأوم', value: 'kΩ', factor: 0.001 },
        { label: 'ميغا أوم', value: 'MΩ', factor: 0.000001 }
      ], min: 1, max: 1000, default: 6 }
    ],
    results: [
      { name: 'القدرة', formula: 'P = VI', unit: 'W' },
      { name: 'الطاقة', formula: 'E = Pt', unit: 'J' }
    ],
    dataColumns: [
      { name: 'الجهد', unit: 'V' },
      { name: 'التيار', unit: 'A' },
      { name: 'المقاومة', unit: 'Ω' },
      { name: 'القدرة', unit: 'W' }
    ],
    aiExplanation: 'قانون أوم يربط بين الجهد والتيار والمقاومة في الدوائر الكهربائية. V = IR هو أساس تحليل الدوائر.',
    realWorldExample: 'مصباح كهربائي، شاحن هاتف، محرك كهربائي',
    tips: ['المقاومة لا تتغير بتغير الجهد والتيار (لمواد أومية)', 'القدرة = VI = I²R = V²/R', 'التيار يسري من الجهد العالي إلى المنخفض']
  },
  {
    id: 'rc-circuit',
    name: 'دائرة RC',
    nameEn: 'RC Circuit',
    category: 'كهرباء',
    subcategory: 'الدوائر',
    icon: '🔋',
    difficulty: 'متوسط',
    description: 'شحن وتفريغ المكثفات',
    equations: [
      { name: 'شحن المكثف', formula: 'Vc = V₀(1-e^(-t/RC))', description: 'الجهد عبر المكثف' },
      { name: 'الثابت الزمني', formula: 'τ = RC', description: 'الثابت الزمني' },
      { name: 'الطاقة', formula: 'E = ½CV²', description: 'طاقة المكثف' }
    ],
    variables: [
      { name: 'resistance', label: 'المقاومة', labelEn: 'Resistance', unit: 'Ω', unitOptions: [
        { label: 'أوم', value: 'Ω', factor: 1 },
        { label: 'كيلوأوم', value: 'kΩ', factor: 0.001 }
      ], min: 100, max: 10000, default: 1000 },
      { name: 'capacitance', label: 'السعة', labelEn: 'Capacitance', unit: 'μF', unitOptions: [
        { label: 'ميكروفاراد', value: 'μF', factor: 1 },
        { label: 'نافاراد', value: 'nF', factor: 1000 },
        { label: 'بيكوفاراد', value: 'pF', factor: 1000000 }
      ], min: 1, max: 1000, default: 100 },
      { name: 'voltage', label: 'الجهد', labelEn: 'Voltage', unit: 'V', unitOptions: [
        { label: 'فولت', value: 'V', factor: 1 },
        { label: 'ميلليفولت', value: 'mV', factor: 1000 }
      ], min: 1, max: 24, default: 10 }
    ],
    results: [
      { name: 'الثابت الزمني', formula: 'τ = RC', unit: 'ms' },
      { name: 'الطاقة', formula: 'E = ½CV²', unit: 'J' },
      { name: 'الشحنة', formula: 'Q = CV', unit: 'C' }
    ],
    dataColumns: [
      { name: 'الزمن', unit: 's' },
      { name: 'جهد المكثف', unit: 'V', formula: 'Vc = V₀(1-e^(-t/RC))' },
      { name: 'تيار الشحن', unit: 'A', formula: 'I = I₀e^(-t/RC)' },
      { name: 'الطاقة', unit: 'J' }
    ],
    aiExplanation: 'دوائر RC تستخدم في كثير من التطبيقات الإلكترونية. الثابت الزمني τ = RC يحدد سرعة الشحن والتفريغ.',
    realWorldExample: 'فلاش الكاميرا، ذاكرة RAM، مرشح الترددات',
    tips: ['بعد 5τ يكون المكثف مشحوناً تقريباً', 'الثابت الزمني يحدد سرعة الاستجابة', 'τ = RC له وحدة ثانية']
  },
  {
    id: 'rl-circuit',
    name: 'دائرة RL',
    nameEn: 'RL Circuit',
    category: 'كهرباء',
    subcategory: 'الدوائر',
    icon: '🔌',
    difficulty: 'صعب',
    description: 'دائرة تحتوي على مقاومة وملف',
    equations: [
      { name: 'التيار', formula: 'I = I₀(1-e^(-tL/R))', description: 'نمو التيار' },
      { name: 'الثابت الزمني', formula: 'τ = L/R', description: 'الثابت الزمني' },
      { name: 'طاقة الملف', formula: 'E = ½LI²', description: 'طاقة الملف المغناطيسية' }
    ],
    variables: [
      { name: 'resistance', label: 'المقاومة', labelEn: 'Resistance', unit: 'Ω', unitOptions: [
        { label: 'أوم', value: 'Ω', factor: 1 },
        { label: 'كيلوأوم', value: 'kΩ', factor: 0.001 }
      ], min: 10, max: 1000, default: 100 },
      { name: 'inductance', label: 'التحريض', labelEn: 'Inductance', unit: 'mH', unitOptions: [
        { label: 'ميلihenry', value: 'mH', factor: 1 },
        { label: 'هنري', value: 'H', factor: 0.001 }
      ], min: 1, max: 100, default: 10 },
      { name: 'current', label: 'التيار الكلي', labelEn: 'Max Current', unit: 'A', unitOptions: [
        { label: 'أمبير', value: 'A', factor: 1 },
        { label: 'ميليأمبير', value: 'mA', factor: 1000 }
      ], min: 0.1, max: 10, default: 1 }
    ],
    results: [
      { name: 'الثابت الزمني', formula: 'τ = L/R', unit: 's' },
      { name: 'طاقة الملف', formula: 'E = ½LI²', unit: 'J' }
    ],
    dataColumns: [
      { name: 'الزمن', unit: 's' },
      { name: 'التيار', unit: 'A' },
      { name: 'جهد المقاومة', unit: 'V' },
      { name: 'جهد الملف', unit: 'V' }
    ],
    aiExplanation: 'دوائر RL تحتوي على ملف يحارب تغير التيار. التيار لا يصل فوراً إلى قيمته القصوى بل يحتاج وقتاً.',
    realWorldExample: 'محركات كهربائية، relays، ملفات تخزين الطاقة',
    tips: ['الملف يحارب تغير التيار', 'بعد وقت كافٍ يسلك الملف كسلك عادي', 'τ = L/R']
  },
  {
    id: 'magnetic-force',
    name: 'القوة المغناطيسية',
    nameEn: 'Magnetic Force',
    category: 'كهرباء',
    subcategory: 'المغناطيسية',
    icon: '🧲',
    difficulty: 'متوسط',
    description: 'قوة مغناطيسية على جسيم مشحون',
    equations: [
      { name: 'قوة لورنتز', formula: 'F = qvBsinθ', description: 'القوة على جسيم مشحون' },
      { name: 'نصف القطر', formula: 'r = mv/qB', description: 'نصف قطر المسار الدائري' },
      { name: 'السرعة الزاوية', formula: 'ω = qB/m', description: 'السرعة الزاوية' }
    ],
    variables: [
      { name: 'charge', label: 'الشحنة', labelEn: 'Charge', unit: 'μC', unitOptions: [
        { label: 'ميكروكولوم', value: 'μC', factor: 1 },
        { label: 'كولوم', value: 'C', factor: 0.000001 }
      ], min: 1, max: 100, default: 10 },
      { name: 'velocity', label: 'السرعة', labelEn: 'Velocity', unit: 'm/s', unitOptions: [
        { label: 'م/ث', value: 'm/s', factor: 1 },
        { label: 'سم/ث', value: 'cm/s', factor: 100 }
      ], min: 1000, max: 100000, default: 10000 },
      { name: 'magneticField', label: 'الحقل المغناطيسي', labelEn: 'Magnetic Field', unit: 'T', unitOptions: [
        { label: 'تسلا', value: 'T', factor: 1 },
        { label: 'غاوس', value: 'G', factor: 10000 }
      ], min: 0.01, max: 2, default: 0.5 }
    ],
    results: [
      { name: 'القوة المغناطيسية', formula: 'F = qvB', unit: 'N' },
      { name: 'نصف القطر', formula: 'r = mv/qB', unit: 'm' },
      { name: 'الطاقة الحركية', formula: 'KE = ½mv²', unit: 'J' }
    ],
    dataColumns: [
      { name: 'الشحنة', unit: 'μC' },
      { name: 'السرعة', unit: 'm/s' },
      { name: 'الحقل', unit: 'T' },
      { name: 'القوة', unit: 'N' },
      { name: 'نصف القطر', unit: 'm' }
    ],
    aiExplanation: 'القوة المغناطيسية تؤثر على الجسيمات المشحونة المتحركة في مجال مغناطيسي. القوة دائماً عمودية على اتجاه الحركة.',
    realWorldExample: 'مصادم الهادرونات، مطياف الكتلة، CRT',
    tips: ['القوة أعظمية عندما تكون الحركة عمودية على المجال', 'لا تبذل القوة شغلاً لأن اتجاهها عمودي على الحركة', 'تُستخدم في分離 الجسيمات']
  },
  // =========================================
  // 💡 البصريات
  // =========================================
  {
    id: 'refraction',
    name: 'انكسار الضوء',
    nameEn: 'Light Refraction',
    category: 'بصريات',
    subcategory: 'الضوء',
    icon: '💡',
    difficulty: 'متوسط',
    description: 'قانون سنيل للانكسار',
    equations: [
      { name: 'قانون سنيل', formula: 'n₁·sinθ₁ = n₂·sinθ₂', description: 'قانون الانكسار' },
      { name: 'معامل الانكسار', formula: 'n = c/v', description: 'تعريف n' },
      { name: 'زاوية الانعكاس الداخلي', formula: 'sinθc = n₂/n₁', description: 'الزاوية الحرجة' }
    ],
    variables: [
      { name: 'n1', label: 'معامل الانكسار 1', labelEn: 'n₁', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 1, max: 2.5, default: 1 },
      { name: 'n2', label: 'معامل الانكسار 2', labelEn: 'n₂', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 1, max: 2.5, default: 1.5 },
      { name: 'angle1', label: 'زاوية السقوط', labelEn: 'θ₁', unit: '°', unitOptions: [
        { label: 'درجة', value: '°', factor: 1 }
      ], min: 0, max: 89, default: 45 }
    ],
    results: [
      { name: 'زاوية الانكسار', formula: 'θ₂ = arcsin(n₁sinθ₁/n₂)', unit: '°' },
      { name: 'الزاوية الحرجة', formula: 'θc = arcsin(n₂/n₁)', unit: '°' },
      { name: 'الانحراف', formula: 'δ = θ₁ - θ₂', unit: '°' }
    ],
    dataColumns: [
      { name: 'زاوية السقوط', unit: '°' },
      { name: 'زاوية الانكسار', unit: '°' },
      { name: 'معامل الانكسار', unit: '' },
      { name: 'الانحراف', unit: '°' }
    ],
    aiExplanation: 'انكسار الضوء هو تغير اتجاه الشعاع الضوئي عند انتقاله بين وسطين مختلفين. قانون سنيل يصف هذا behavior بدقة.',
    realWorldExample: 'القلم المائل في كوب ماء، قوس قزح، الألياف الضوئية',
    tips: ['عند الانتقال من وسط أكثف لأقل كثافة ينحرف بعيداً عن العمود', 'عند الزاوية الحرجة يحدث الانعكاس الداخلي الكلي', 'معامل الانكسار يعتمد على الطول الموجي']
  },
  {
    id: 'lenses',
    name: 'العدسات والمرايا',
    nameEn: 'Lenses & Mirrors',
    category: 'بصريات',
    subcategory: 'الأجهزة البصرية',
    icon: '🔭',
    difficulty: 'متوسط',
    description: 'تكوين الصور بالعدسات والمرايا',
    equations: [
      { name: 'الصيغة العامة', formula: '1/f = 1/do + 1/di', description: 'علاقة العدسة' },
      { name: 'التكبير', formula: 'M = -di/do', description: 'التكبير الخطي' },
      { name: 'قدرة العدسة', formula: 'P = 1/f', description: 'القوة الديوبترية' }
    ],
    variables: [
      { name: 'focalLength', label: 'البعد البؤري', labelEn: 'Focal Length', unit: 'cm', unitOptions: [
        { label: 'سنتيمتر', value: 'cm', factor: 1 },
        { label: 'متر', value: 'm', factor: 0.01 }
      ], min: 5, max: 50, default: 10 },
      { name: 'objectDistance', label: 'بعد الجسم', labelEn: 'Object Distance', unit: 'cm', unitOptions: [
        { label: 'سنتيمتر', value: 'cm', factor: 1 },
        { label: 'متر', value: 'm', factor: 0.01 }
      ], min: 5, max: 100, default: 20 }
    ],
    results: [
      { name: 'بعد الصورة', formula: 'di = 1/(1/f - 1/do)', unit: 'cm' },
      { name: 'التكبير', formula: 'M = -di/do', unit: '' },
      { name: 'نوع الصورة', formula: '', unit: '' }
    ],
    dataColumns: [
      { name: 'بعد الجسم', unit: 'cm' },
      { name: 'البعد البؤري', unit: 'cm' },
      { name: 'بعد الصورة', unit: 'cm' },
      { name: 'التكبير', unit: '' },
      { name: 'نوع الصورة', unit: '' }
    ],
    aiExplanation: 'العدسات المحدبة تجمع الضوء وتكوين صوراً حقيقية أو وهمية حسب بعد الجسم عن البؤرة.',
    realWorldExample: 'النظارات، الكاميرات، المقراب، المجهر',
    tips: ['للعدسة المحدبة: f موجب، المحدبة: f سالب', 'الصورة الحقيقية يمكن اسقاطها على شاشة', 'التكبير > 1 يعني تكبير الصورة']
  },
  {
    id: 'waves',
    name: 'الأمواج',
    nameEn: 'Waves',
    category: 'بصريات',
    subcategory: 'الضوء',
    icon: '🌊',
    difficulty: 'متوسط',
    description: 'خصائص الأمواج وتداخلها',
    equations: [
      { name: 'سرعة الموجة', formula: 'v = fλ', description: 'العلاقة الأساسية' },
      { name: 'معادلة الموجة', formula: 'y = A·sin(kx - ωt)', description: 'معادلة الموجة' },
      { name: 'طاقة الموجة', formula: 'E = ½ρAv²A²', description: 'شدة الموجة' }
    ],
    variables: [
      { name: 'frequency', label: 'التردد', labelEn: 'Frequency', unit: 'Hz', unitOptions: [
        { label: 'هرتز', value: 'Hz', factor: 1 },
        { label: 'كيلوهرتز', value: 'kHz', factor: 0.001 },
        { label: 'ميغاهرتز', value: 'MHz', factor: 0.000001 }
      ], min: 20, max: 20000, default: 440 },
      { name: 'wavelength', label: 'الطول الموجي', labelEn: 'Wavelength', unit: 'm', unitOptions: [
        { label: 'متر', value: 'm', factor: 1 },
        { label: 'سنتيمتر', value: 'cm', factor: 100 },
        { label: 'نانومتر', value: 'nm', factor: 1000000000 }
      ], min: 0.001, max: 100, default: 0.78 }
    ],
    results: [
      { name: 'سرعة الموجة', formula: 'v = fλ', unit: 'm/s' },
      { name: 'العدد الموجي', formula: 'k = 2π/λ', unit: 'rad/m' },
      { name: 'السرعة الزاوية', formula: 'ω = 2πf', unit: 'rad/s' }
    ],
    dataColumns: [
      { name: 'التردد', unit: 'Hz' },
      { name: 'الطول الموجي', unit: 'm' },
      { name: 'السرعة', unit: 'm/s' },
      { name: 'الطاقة', unit: 'J' }
    ],
    aiExplanation: 'الأمواج تنتقل الطاقة دون نقل المادة. التداخل ينتج عن التقاء موجتين في نفس النقطة.',
    realWorldExample: 'الموجات الصوتية، موجات الماء، الضوء، الراديو',
    tips: ['الضوء المرئي: 400-700 nm', 'الصوت يحتاج وسط مادي', 'الموجات الكهرومغناطيسية لا تحتاج وسطاً']
  },
  // =========================================
  // 🌡️ الديناميكا الحرارية
  // =========================================
  {
    id: 'thermodynamics',
    name: 'الديناميكا الحرارية',
    nameEn: 'Thermodynamics',
    category: 'حرارة',
    subcategory: 'الطاقة',
    icon: '🌡️',
    difficulty: 'متوسط',
    description: 'قوانين الديناميكا الحرارية',
    equations: [
      { name: 'الحرارة', formula: 'Q = mcΔT', description: 'الحرارة النوعية' },
      { name: 'الشغل', formula: 'W = PΔV', description: 'شغل الغاز' },
      { name: 'القانون الأول', formula: 'ΔU = Q - W', description: 'حفظ الطاقة' }
    ],
    variables: [
      { name: 'mass', label: 'الكتلة', labelEn: 'Mass', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 }
      ], min: 0.1, max: 10, default: 1 },
      { name: 'specificHeat', label: 'الحرارة النوعية', labelEn: 'Specific Heat', unit: 'J/kg·K', unitOptions: [
        { label: 'J/kg·K', value: 'J/kg·K', factor: 1 },
        { label: 'cal/g·°C', value: 'cal/g·°C', factor: 4184 }
      ], min: 100, max: 5000, default: 4186 },
      { name: 'tempChange', label: 'التغير في الحرارة', labelEn: 'ΔT', unit: 'K', unitOptions: [
        { label: 'كلفن', value: 'K', factor: 1 },
        { label: 'درجة مئوية', value: '°C', factor: 1 }
      ], min: 1, max: 100, default: 20 }
    ],
    results: [
      { name: 'الحرارة', formula: 'Q = mcΔT', unit: 'J' },
      { name: 'الطاقة', formula: 'E = mcΔT', unit: 'cal' }
    ],
    dataColumns: [
      { name: 'درجة الحرارة', unit: 'K' },
      { name: 'الكتلة', unit: 'kg' },
      { name: 'الحرارة النوعية', unit: 'J/kg·K' },
      { name: 'الحرارة', unit: 'J' }
    ],
    aiExplanation: 'الديناميكا الحرارية تدرس انتقال الحرارة وتحولاتها. القانون الأول يحفظ الطاقة الكلية.',
    realWorldExample: 'المحركات الحرارية، التبريد، الطهي',
    tips: ['الشغل موجب عندما يتمدد الغاز', 'لا يمكن تحويل كل الحرارة إلى شغل', 'آلة الحركة الدائمة مستحيلة']
  },
  {
    id: 'gas-laws',
    name: 'قوانين الغازات',
    nameEn: 'Gas Laws',
    category: 'حرارة',
    subcategory: 'الغازات',
    icon: '💨',
    difficulty: 'متوسط',
    description: 'سلوك الغازات المثالية',
    equations: [
      { name: 'الغاز المثالي', formula: 'PV = nRT', description: 'معادلة الحالة' },
      { name: 'العملية Isobaric', formula: 'V/T = constant', description: 'ثبات الضغط' },
      { name: 'العملية Isothermal', formula: 'PV = constant', description: 'ثبات الحرارة' }
    ],
    variables: [
      { name: 'pressure', label: 'الضغط', labelEn: 'Pressure', unit: 'Pa', unitOptions: [
        { label: 'باسكال', value: 'Pa', factor: 1 },
        { label: ' атмосфера', value: 'atm', factor: 0.0000098692 },
        { label: 'بار', value: 'bar', factor: 0.00001 },
        { label: 'mmHg', value: 'mmHg', factor: 0.00750062 }
      ], min: 10000, max: 500000, default: 101325 },
      { name: 'volume', label: 'الحجم', labelEn: 'Volume', unit: 'L', unitOptions: [
        { label: 'لتر', value: 'L', factor: 1 },
        { label: 'مل', value: 'mL', factor: 1000 },
        { label: 'م³', value: 'm³', factor: 0.001 }
      ], min: 1, max: 100, default: 22.4 },
      { name: 'temperature', label: 'درجة الحرارة', labelEn: 'Temperature', unit: 'K', unitOptions: [
        { label: 'كلفن', value: 'K', factor: 1 },
        { label: 'مئوية', value: '°C', factor: 1 },
        { label: 'فهرنهايت', value: '°F', factor: 1 }
      ], min: 100, max: 1000, default: 273 }
    ],
    results: [
      { name: 'عدد المولات', formula: 'n = PV/RT', unit: 'mol' },
      { name: 'الحجم المولي', formula: 'Vm = V/n', unit: 'L/mol' }
    ],
    dataColumns: [
      { name: 'الضغط', unit: 'Pa' },
      { name: 'الحجم', unit: 'L' },
      { name: 'الحرارة', unit: 'K' },
      { name: 'عدد المولات', unit: 'mol' }
    ],
    aiExplanation: 'معادلة الغاز المثالي تربط بين الضغط والحجم ودرجة الحرارة وعدد المولات. وهي نموذج جيد للغازات الحقيقية عند ضغط منخفض.',
    realWorldExample: 'الإطارات، البالونات، المحركات',
    tips: ['STP: 0°C, 1 atm, 22.4 L/mol', 'الغاز الحقيقي يختلف عن المثالي عند ضغط عالٍ', 'R = 8.314 J/mol·K']
  },
  // =========================================
  // ⚛️ فيزياء حديثة
  // =========================================
  {
    id: 'radioactivity',
    name: 'النشاط الإشعاعي',
    nameEn: 'Radioactivity',
    category: 'فيزياء حديثة',
    subcategory: 'النووية',
    icon: '☢️',
    difficulty: 'صعب',
    description: 'تحلل المواد المشعة',
    equations: [
      { name: 'العدد الذري', formula: 'N = N₀e^(-λt)', description: 'قانون التحلل' },
      { name: 'عمر النصف', formula: 't½ = ln2/λ', description: 'تعريف t½' },
      { name: 'النشاط', formula: 'A = λN', description: 'نشاط إشعاعي' }
    ],
    variables: [
      { name: 'initialAtoms', label: 'عدد الذرات الابتدائي', labelEn: 'Initial Atoms', unit: '', unitOptions: [
        { label: '', value: '', factor: 1 }
      ], min: 100, max: 10000, default: 1000 },
      { name: 'halfLife', label: 'عمر النصف', labelEn: 'Half-Life', unit: 's', unitOptions: [
        { label: 'ثانية', value: 's', factor: 1 },
        { label: 'دقيقة', value: 'min', factor: 1/60 },
        { label: 'ساعة', value: 'h', factor: 1/3600 },
        { label: 'يوم', value: 'd', factor: 1/86400 }
      ], min: 1, max: 100, default: 10 },
      { name: 'time', label: 'الزمن', labelEn: 'Time', unit: 's', unitOptions: [
        { label: 'ثانية', value: 's', factor: 1 },
        { label: 'دقيقة', value: 'min', factor: 1/60 },
        { label: 'ساعة', value: 'h', factor: 1/3600 }
      ], min: 0, max: 100, default: 5 }
    ],
    results: [
      { name: 'ثابت التحلل', formula: 'λ = ln2/t½', unit: 's⁻¹' },
      { name: 'الذرات المتبقية', formula: 'N = N₀e^(-λt)', unit: '' },
      { name: 'النشاط', formula: 'A = λN', unit: 'Bq' }
    ],
    dataColumns: [
      { name: 'الزمن', unit: 's' },
      { name: 'الذرات المتبقية', unit: '' },
      { name: 'النشاط', unit: 'Bq' },
      { name: 'نسبة المتبقية', unit: '%' }
    ],
    aiExplanation: 'النشاط الإشعاعي تحلل عشوائي للنوى غير المستقرة. عمر النصف هو الزمن اللازم لتحلل نصف الذرات.',
    realWorldExample: 'الكشف عن العمر، الطب النووي، الطاقة النووية',
    tips: ['عمر النصف ثابت لكل نظير', 'التحلل عملية عشوائية', 'ثلاثة أنواع: ألفا، بيتا، غاما']
  },
  {
    id: 'photoelectric',
    name: 'التأثير الكهروضوئي',
    nameEn: 'Photoelectric Effect',
    category: 'فيزياء حديثة',
    subcategory: 'الكم',
    icon: '⚛️',
    difficulty: 'صعب',
    description: 'إلكترونات تترك السطح المعدني',
    equations: [
      { name: 'آينشتاين', formula: 'KE = hf - φ', description: 'معادلة التأثير' },
      { name: 'التردد الحرج', formula: 'f₀ = φ/h', description: 'التردد الحد الأدنى' },
      { name: 'الطول الموجي', formula: 'λmax = hc/φ', description: 'الطول الموجي الأقصى' }
    ],
    variables: [
      { name: 'wavelength', label: 'الطول الموجي', labelEn: 'Wavelength', unit: 'nm', unitOptions: [
        { label: 'نانومتر', value: 'nm', factor: 1 },
        { label: 'أنغستروم', value: 'Å', factor: 0.1 },
        { label: 'متر', value: 'm', factor: 1000000000 }
      ], min: 100, max: 1000, default: 500 },
      { name: 'workFunction', label: 'دالة الشغل', labelEn: 'Work Function', unit: 'eV', unitOptions: [
        { label: 'إلكترون فولت', value: 'eV', factor: 1 },
        { label: 'جول', value: 'J', factor: 1.602e-19 }
      ], min: 1, max: 10, default: 4.5 }
    ],
    results: [
      { name: 'طاقة الفوتون', formula: 'E = hc/λ', unit: 'eV' },
      { name: 'الطاقة الحركية', formula: 'KE = hf - φ', unit: 'eV' },
      { name: 'التردد', formula: 'f = c/λ', unit: 'Hz' }
    ],
    dataColumns: [
      { name: 'الطول الموجي', unit: 'nm' },
      { name: 'التردد', unit: 'Hz' },
      { name: 'طاقة الفوتون', unit: 'eV' },
      { name: 'KE الإلكترونية', unit: 'eV' }
    ],
    aiExplanation: 'التأثير الكهروضوئي يُظهر طبيعة الضوء كمادة (فوتونات). أينشتاين فسر هذه الظاهرة وحصل على جائزة نوبل.',
    realWorldExample: 'الألواح الشمسية، أجهزة photoelectric، الليزر',
    tips: ['الطاقة الحركية لا تعتمد على شدة الضوء', 'لا يحدث تأثير إذا كان التردد أقل من التردد الحرج', 'الضوء يسلك كجسيمات (فوتونات)']
  },
  {
    id: 'wave-particle',
    name: 'ازدواجية الموجة-الجسيم',
    nameEn: 'Wave-Particle Duality',
    category: 'فيزياء حديثة',
    subcategory: 'الكم',
    icon: '🔮',
    difficulty: 'صعب',
    description: 'سلوك الموجة والجسيم للمادة',
    equations: [
      { name: 'دي بروغلي', formula: 'λ = h/p', description: 'الطول الموجي للمادة' },
      { name: 'مبدأ عدم اليقين', formula: 'Δx·Δp ≥ ℏ/2', description: 'هايزنبرغ' },
      { name: 'طاقة بلانك', formula: 'E = hf', description: 'طاقة الفوتون' }
    ],
    variables: [
      { name: 'mass', label: 'الكتلة', labelEn: 'Mass', unit: 'kg', unitOptions: [
        { label: 'كيلوغرام', value: 'kg', factor: 1 },
        { label: 'غرام', value: 'g', factor: 1000 },
        { label: 'الكتلة الإلكترونية', value: 'me', factor: 9.11e-31 }
      ], min: 9.11e-31, max: 0.001, default: 9.11e-31 },
      { name: 'velocity', label: 'السرعة', labelEn: 'Velocity', unit: 'm/s', unitOptions: [
        { label: 'م/ث', value: 'm/s', factor: 1 },
        { label: 'سرعة الضوء', value: 'c', factor: 299792458 }
      ], min: 1000, max: 100000000, default: 1000000 }
    ],
    results: [
      { name: 'الزخم', formula: 'p = mv', unit: 'kg·m/s' },
      { name: 'الطول الموجي', formula: 'λ = h/p', unit: 'm' }
    ],
    dataColumns: [
      { name: 'الكتلة', unit: 'kg' },
      { name: 'السرعة', unit: 'm/s' },
      { name: 'الزخم', unit: 'kg·m/s' },
      { name: 'الطول الموجي', unit: 'm' }
    ],
    aiExplanation: 'ازدواجية الموجة-الجسيم تعني أن المادة تسلك سلوك الموجة والجسيم معاً. هذا أساس ميكانيكا الكم.',
    realWorldExample: 'مجهر إلكتروني، انعراج الإلكترونات',
    tips: ['الأجسام الكبيرة طولها الموجي ضئيل جداً', 'مبدأ عدم اليقين يؤثر على القياسات الدقيقة', 'المراقبة تؤثر على النظام الكمي']
  },
  // =========================================
  // 🌊 ميكانيكا الموائع
  // =========================================
  {
    id: 'fluid-statics',
    name: 'ستاتيكا الموائع',
    nameEn: 'Fluid Statics',
    category: 'ميكانيكا الموائع',
    subcategory: 'الموائع',
    icon: '💧',
    difficulty: 'متوسط',
    description: 'ضغط الموائع وقوة الطفو',
    equations: [
      { name: 'الضغط', formula: 'P = F/A', description: 'تعريف الضغط' },
      { name: 'ضغط العمود', formula: 'P = ρgh', description: 'ضغط السائل' },
      { name: 'قوة الطفو', formula: 'Fb = ρgV', description: 'قوة أرخميدس' }
    ],
    variables: [
      { name: 'density', label: 'الكثافة', labelEn: 'Density', unit: 'kg/m³', unitOptions: [
        { label: 'kg/m³', value: 'kg/m³', factor: 1 },
        { label: 'g/cm³', value: 'g/cm³', factor: 1000 }
      ], min: 500, max: 20000, default: 1000 },
      { name: 'depth', label: 'العمق', labelEn: 'Depth', unit: 'm', unitOptions: [
        { label: 'متر', value: 'm', factor: 1 },
        { label: 'سنتيمتر', value: 'cm', factor: 100 }
      ], min: 1, max: 1000, default: 10 },
      { name: 'volume', label: 'الحجم المغمور', labelEn: 'Volume', unit: 'm³', unitOptions: [
        { label: 'م³', value: 'm³', factor: 1 },
        { label: 'لتر', value: 'L', factor: 1000 }
      ], min: 0.001, max: 10, default: 0.5 }
    ],
    results: [
      { name: 'الضغط', formula: 'P = ρgh', unit: 'Pa' },
      { name: 'قوة الطفو', formula: 'Fb = ρgV', unit: 'N' }
    ],
    dataColumns: [
      { name: 'العمق', unit: 'm' },
      { name: 'الكثافة', unit: 'kg/m³' },
      { name: 'الضغط', unit: 'Pa' },
      { name: 'قوة الطفو', unit: 'N' }
    ],
    aiExplanation: 'ستاتيكا الموائع تدرس السوائل في حالة السكون. الضغط في سائل يعتمد على العمق فقط.',
    realWorldExample: 'السدود، الغواصات، مكثفات المياه',
    tips: ['الضغط لا يعتمد على شكل الإناء', 'قوة الطفو لا تعتمد على عمق الغمر', 'الجسم يطفو إذا كانت كثافته أقل من كثافة السائل']
  },
  {
    id: 'fluid-dynamics',
    name: 'ديناميكا الموائع',
    nameEn: 'Fluid Dynamics',
    category: 'ميكانيكا الموائع',
    subcategory: 'الموائع',
    icon: '🌊',
    difficulty: 'صعب',
    description: 'جريان الموائع ومعادلة برنولي',
    equations: [
      { name: 'الاستمرارية', formula: 'A₁v₁ = A₂v₂', description: 'حفظ الكتلة' },
      { name: 'برنولي', formula: 'P + ½ρv² + ρgh = constant', description: 'معادلة برنولي' },
      { name: 'رقم رينولدز', formula: 'Re = ρvD/μ', description: 'نوع الجريان' }
    ],
    variables: [
      { name: 'velocity1', label: 'السرعة 1', labelEn: 'Velocity 1', unit: 'm/s', unitOptions: [
        { label: 'م/ث', value: 'm/s', factor: 1 }
      ], min: 0.1, max: 20, default: 2 },
      { name: 'area1', label: 'المساحة 1', labelEn: 'Area 1', unit: 'm²', unitOptions: [
        { label: 'م²', value: 'm²', factor: 1 },
        { label: 'سم²', value: 'cm²', factor: 10000 }
      ], min: 0.01, max: 1, default: 0.1 },
      { name: 'area2', label: 'المساحة 2', labelEn: 'Area 2', unit: 'm²', unitOptions: [
        { label: 'م²', value: 'm²', factor: 1 },
        { label: 'سم²', value: 'cm²', factor: 10000 }
      ], min: 0.001, max: 0.5, default: 0.05 }
    ],
    results: [
      { name: 'السرعة 2', formula: 'v₂ = A₁v₁/A₂', unit: 'm/s' },
      { name: 'الضغط 2', formula: 'P₂ = P₁ + ½ρ(v₁²-v₂²)', unit: 'Pa' }
    ],
    dataColumns: [
      { name: 'الموقع', unit: '' },
      { name: 'السرعة', unit: 'm/s' },
      { name: 'المساحة', unit: 'm²' },
      { name: 'الضغط', unit: 'Pa' }
    ],
    aiExplanation: 'ديناميكا الموائع تدرس حركة السوائل والغازات. معادلة برنولي تربط بين الضغط والسرعة والارتفاع.',
    realWorldExample: 'أنابيب المياه، أجنحة الطائرات، أنظمة التهوية',
    tips: ['السرعة تزداد عندما يضيق الأنبوب', 'ضغط يقل عندما تزداد السرعة', 'الجريان الصفحي vs المضطرب']
  }
];

// =============================================
// 🏆 نظام الجوائز والإنجازات
// =============================================
interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: (stats: UserStats) => boolean;
  points: number;
}

interface UserStats {
  experimentsCompleted: number;
  questionsAnswered: number;
  perfectScores: number;
  totalTime: number;
  favoritesAdded: number;
}

const achievements: Achievement[] = [
  { id: 'first-exp', name: 'أول تجربة', icon: '🎯', description: 'أتم تجربة واحدة', condition: (s) => s.experimentsCompleted >= 1, points: 10 },
  { id: 'five-exp', name: 'باحث مبتدئ', icon: '🔬', description: 'أتم 5 تجارب', condition: (s) => s.experimentsCompleted >= 5, points: 50 },
  { id: 'ten-exp', name: 'فيزيائي صغير', icon: '🧪', description: 'أتم 10 تجارب', condition: (s) => s.experimentsCompleted >= 10, points: 100 },
  { id: 'quiz-master', name: 'خبير الاختبارات', icon: '🏆', description: 'أجب على 20 سؤال', condition: (s) => s.questionsAnswered >= 20, points: 100 },
  { id: 'perfect-score', name: 'عبقري', icon: '⭐', description: 'احصل على 5 درجات كاملة', condition: (s) => s.perfectScores >= 5, points: 150 },
  { id: 'time-master', name: 'محب الوقت', icon: '⏱️', description: 'اقضِ ساعة في التطبيق', condition: (s) => s.totalTime >= 3600, points: 75 },
  { id: 'collector', name: 'جامع', icon: '📚', description: 'أضف 10 مفضلات', condition: (s) => s.favoritesAdded >= 10, points: 50 }
];

// =============================================
// 📊 فئات التجارب
// =============================================
const categories = [
  { id: 'all', name: 'الكل', icon: '🔬', count: experiments.length },
  { id: 'ميكانيكا', name: 'ميكانيكا', icon: '⚙️', count: experiments.filter(e => e.category === 'ميكانيكا').length },
  { id: 'كهرباء', name: 'كهرباء', icon: '⚡', count: experiments.filter(e => e.category === 'كهرباء').length },
  { id: 'بصريات', name: 'بصريات', icon: '💡', count: experiments.filter(e => e.category === 'بصريات').length },
  { id: 'حرارة', name: 'حرارة', icon: '🌡️', count: experiments.filter(e => e.category === 'حرارة').length },
  { id: 'فيزياء حديثة', name: 'فيزياء حديثة', icon: '⚛️', count: experiments.filter(e => e.category === 'فيزياء حديثة').length },
  { id: 'ميكانيكا الموائع', name: 'موائع', icon: '💧', count: experiments.filter(e => e.category === 'ميكانيكا الموائع').length }
];

// =============================================
// 🔄 محول الوحدات
// =============================================
const unitConversions: Record<string, { factor: number; unit: string }[]> = {
  length: [
    { factor: 1, unit: 'm' },
    { factor: 100, unit: 'cm' },
    { factor: 1000, unit: 'mm' },
    { factor: 0.001, unit: 'km' },
    { factor: 39.37, unit: 'in' },
    { factor: 3.281, unit: 'ft' },
    { factor: 0.000621, unit: 'mi' }
  ],
  mass: [
    { factor: 1, unit: 'kg' },
    { factor: 1000, unit: 'g' },
    { factor: 1000000, unit: 'mg' },
    { factor: 2.205, unit: 'lb' },
    { factor: 35.274, unit: 'oz' }
  ],
  time: [
    { factor: 1, unit: 's' },
    { factor: 0.016667, unit: 'min' },
    { factor: 0.00027778, unit: 'h' },
    { factor: 0.000011574, unit: 'day' }
  ],
  temperature: [
    { factor: 1, unit: 'K' },
    { factor: 1, unit: '°C' },
    { factor: 1.8, unit: '°F' }
  ],
  pressure: [
    { factor: 1, unit: 'Pa' },
    { factor: 0.00001, unit: 'bar' },
    { factor: 0.0000098692, unit: 'atm' },
    { factor: 0.0075006, unit: 'mmHg' }
  ]
};

// =============================================
// 🎯 المكون الرئيسي
// =============================================
export default function PhysicsLab() {
  // =========================================
  // 📌 الحالات الأساسية
  // =========================================
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'simulation' | 'data' | 'ai' | 'units'>('simulation');
  
  // =========================================
  // 📊 حالات جدول البيانات
  // =========================================
  const [dataRows, setDataRows] = useState<DataRow[]>([]);
  const [dataColumns, setDataColumns] = useState<DataColumn[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Record<string, string>>({});
  
  // =========================================
  // ⭐ المفضلات
  // =========================================
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('physicsFavorites') || '[]'); } 
    catch { return []; }
  });
  
  // =========================================
  // 🤖 الذكاء الاصطناعي
  // =========================================
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: '🤖 مرحباً! أنا معلم الفيزياء الذكي\n\nيمكنني:\n• شرح التجارب الفيزيائية بالتفصيل\n• تحليل جدول البيانات الخاص بك\n• توليد رسوم بيانية وتفسيرات\n• اقتراح تجارب مشابهة\n• الإجابة على أسئلتك الفيزيائية\n\nاختر تجربة وابدأ رحلة التعلم!' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // =========================================
  // 🎮 المحاكاة
  // =========================================
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);
  const [inputValues, setInputValues] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, number>>({});
  
  // =========================================
  // 🏆 الجوائز
  // =========================================
  const [userStats, setUserStats] = useState<UserStats>(() => {
    try { return JSON.parse(localStorage.getItem('physicsStats') || '{"experimentsCompleted":0,"questionsAnswered":0,"perfectScores":0,"totalTime":0,"favoritesAdded":0}'); } 
    catch { return { experimentsCompleted: 0, questionsAnswered: 0, perfectScores: 0, totalTime: 0, favoritesAdded: 0 }; }
  });
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('physicsAchievements') || '[]'); } 
    catch { return []; }
  });
  
  // =========================================
  // 📈 تحويل الوحدات
  // =========================================
  const [unitCategory, setUnitCategory] = useState('length');
  const [unitValue, setUnitValue] = useState('1');
  
  // =========================================
  // 🔧 Canvas
  // =========================================
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // =========================================
  // 💾 حفظ البيانات
  // =========================================
  useEffect(() => {
    localStorage.setItem('physicsFavorites', JSON.stringify(favorites));
  }, [favorites]);
  
  useEffect(() => {
    localStorage.setItem('physicsStats', JSON.stringify(userStats));
  }, [userStats]);
  
  useEffect(() => {
    localStorage.setItem('physicsAchievements', JSON.stringify(unlockedAchievements));
  }, [unlockedAchievements]);
  
  // =========================================
  // 🔄 تهيئة التجربة
  // =========================================
  useEffect(() => {
    if (selectedExperiment) {
      // تهيئة القيم الافتراضية
      const defaults: Record<string, number> = {};
      selectedExperiment.variables.forEach(v => {
        defaults[v.name] = v.default;
        setSelectedUnit(prev => ({ ...prev, [v.name]: v.unitOptions[0].value }));
      });
      setInputValues(defaults);
      
      // تهيئة جدول البيانات
      const cols: DataColumn[] = selectedExperiment.dataColumns.map((col, i) => ({
        id: `col-${i}`,
        name: col.name,
        unit: col.unit
      }));
      setDataColumns(cols);
      
      // إضافة صفوف افتراضية
      const defaultRows: DataRow[] = [];
      for (let i = 0; i < 5; i++) {
        defaultRows.push({
          id: `row-${i}`,
          values: cols.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {})
        });
      }
      setDataRows(defaultRows);
      
      // رسالة AI
      setAiMessages([
        { role: 'assistant', content: `✅ تم اختيار: ${selectedExperiment.name}\n\n${selectedExperiment.aiExplanation}\n\n💡 نصيحة: ${selectedExperiment.tips[0]}` }
      ]);
      
      // تحديث الإحصائيات
      setUserStats(prev => ({ ...prev, experimentsCompleted: prev.experimentsCompleted + 1 }));
    }
  }, [selectedExperiment]);
  
  // =========================================
  // 🎬 رسم المحاكاة
  // =========================================
  useEffect(() => {
    if (!selectedExperiment || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // مسح
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // رسم الخلفية
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
    
    // رسم العنصر المتحرك
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const t = simulationTime;
    
    if (selectedExperiment.id === 'free-fall') {
      const h = inputValues.height || 10;
      const g = inputValues.gravity || 9.8;
      const progress = Math.min(t / Math.sqrt(2 * h / g), 1);
      const y = cy - 50 + (canvas.height - 100) * progress;
      
      // الجسم
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(cx, y, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // السهم
      if (progress > 0 && progress < 1) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(cx, y + 30);
        ctx.stroke();
      }
      
      // نص
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`h = ${(h * (1 - progress)).toFixed(1)}m`, cx, y - 25);
    } 
    else if (selectedExperiment.id === 'projectile-motion') {
      const v0 = inputValues.velocity || 30;
      const angle = ((inputValues.angle || 45) * Math.PI) / 180;
      const g = 9.8;
      const x = 50 + v0 * Math.cos(angle) * t * 3;
      const y = cy + 50 - (v0 * Math.sin(angle) * t - 0.5 * g * t * t) * 3;
      
      if (y < cy + 50) {
        // المسار
        ctx.strokeStyle = '#3b82f6';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (let i = 0; i <= t; i += 0.1) {
          const px = 50 + v0 * Math.cos(angle) * i * 3;
          const py = cy + 50 - (v0 * Math.sin(angle) * i - 0.5 * g * i * i) * 3;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        
        // الجسم
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x, Math.max(y, 50), 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    else if (selectedExperiment.id === 'simple-harmonic') {
      const A = inputValues.amplitude || 2;
      const f = inputValues.frequency || 1;
      const x = cx + (A * 100) * Math.sin(2 * Math.PI * f * t);
      
      // خط التوازن
      ctx.strokeStyle = '#64748b';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(canvas.width, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // الحركة التوافقية
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      for (let i = 0; i <= t * f * 4; i += 0.02) {
        const px = cx + (A * 100) * Math.sin(2 * Math.PI * i);
        const py = cy + (A * 100) * Math.cos(2 * Math.PI * i);
        if (i === 0) ctx.beginPath();
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      
      // الجسم
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(x, cy, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    else if (selectedExperiment.id === 'ohms-law') {
      const V = inputValues.voltage || 12;
      const R = inputValues.resistance || 6;
      const I = V / R;
      
      // الدائرة
      const r = 50;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      
      // المقاومة
      ctx.fillStyle = '#78716c';
      ctx.fillRect(cx + r - 15, cy - 8, 30, 16);
      
      // التيار
      const angle = (t * 2) % (Math.PI * 2);
      const bulletX = cx + r * Math.cos(angle);
      const bulletY = cy + r * Math.sin(angle);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(bulletX, bulletY, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // القيم
      ctx.fillStyle = '#fff';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`V = ${V}V`, cx, cy + 80);
      ctx.fillText(`I = ${I.toFixed(2)}A`, cx, cy + 95);
      ctx.fillText(`R = ${R}Ω`, cx, cy + 110);
    }
    else {
      // رسم عام
      ctx.fillStyle = '#64748b';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(selectedExperiment.icon, cx, cy - 20);
      ctx.fillText(selectedExperiment.name, cx, cy + 20);
    }
  }, [simulationTime, selectedExperiment, inputValues]);
  
  // =========================================
  // 🔄 حلقة المحاكاة
  // =========================================
  useEffect(() => {
    if (isSimulating) {
      const interval = setInterval(() => {
        setSimulationTime(prev => {
          if (prev > 10) {
            setIsSimulating(false);
            return 0;
          }
          return prev + 0.05;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isSimulating]);
  
  // =========================================
  // 📊 حساب النتائج
  // =========================================
  const calculateResults = useCallback(() => {
    if (!selectedExperiment) return;
    const res: Record<string, number> = {};
    const g = 9.8;
    
    switch (selectedExperiment.id) {
      case 'free-fall':
        const h = inputValues.height || 10;
        const gf = inputValues.gravity || 9.8;
        res.time = Math.sqrt(2 * h / gf);
        res.velocity = gf * res.time;
        res.kineticEnergy = 0.5 * (inputValues.mass || 1) * res.velocity * res.velocity;
        break;
      case 'projectile-motion':
        const v0 = inputValues.velocity || 30;
        const angle = ((inputValues.angle || 45) * Math.PI) / 180;
        res.range = (v0 * v0 * Math.sin(2 * angle)) / g;
        res.maxHeight = (v0 * v0 * Math.sin(angle) * Math.sin(angle)) / (2 * g);
        res.time = (2 * v0 * Math.sin(angle)) / g;
        break;
      case 'newtons-laws':
        const F = inputValues.force || 100;
        const m = inputValues.mass || 50;
        res.acceleration = F / m;
        res.momentum = m * res.acceleration * simulationTime;
        break;
      case 'ohms-law':
        const V = inputValues.voltage || 12;
        const R = inputValues.resistance || 6;
        res.current = V / R;
        res.power = V * res.current;
        break;
      case 'simple-harmonic':
        const A = inputValues.amplitude || 2;
        const f = inputValues.frequency || 1;
        res.displacement = A * Math.sin(2 * Math.PI * f * simulationTime);
        res.velocity = 2 * Math.PI * f * A * Math.cos(2 * Math.PI * f * simulationTime);
        break;
      case 'thermodynamics':
        res.heat = (inputValues.mass || 1) * (inputValues.specificHeat || 4186) * (inputValues.tempChange || 20);
        break;
      case 'radioactivity':
        const N0 = inputValues.initialAtoms || 1000;
        const halfLife = inputValues.halfLife || 10;
        const time = inputValues.time || 5;
        const lambda = Math.log(2) / halfLife;
        res.remaining = N0 * Math.exp(-lambda * time);
        res.activity = lambda * res.remaining;
        break;
      default:
        Object.values(inputValues).forEach(v => {
          if (typeof v === 'number') res.value = (res.value || 0) + v;
        });
    }
    
    setResults(res);
  }, [selectedExperiment, inputValues, simulationTime]);
  
  // =========================================
  // 🎮 تشغيل المحاكاة
  // =========================================
  const runSimulation = () => {
    if (!selectedExperiment) return;
    calculateResults();
    setIsSimulating(true);
    setSimulationTime(0);
  };
  
  // =========================================
  // 🤖 إرسال للذكاء الاصطناعي
  // =========================================
  const sendAiMessage = async () => {
    if (!aiInput.trim() || isAiLoading) return;
    
    const userMessage = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAiLoading(true);
    
    // إضافة بيانات الجدول للسياق
    const tableContext = dataRows.length > 0 ? `\n\nبيانات الطالب:\n${JSON.stringify(dataRows, null, 2)}` : '';
    
    try {
      const response = await fetch(resolveApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-custom-api-key': localStorage.getItem('customAiKey') || '',
          'x-custom-provider': localStorage.getItem('aiProvider') || 'gemini'
        },
        body: JSON.stringify({
          message: userMessage + tableContext,
          context: `تجربة فيزيائية: ${selectedExperiment?.name || 'غير محددة'}\n
${selectedExperiment?.aiExplanation || ''}\n
المعادلات:\n${selectedExperiment?.equations.map(e => `${e.name}: ${e.formula}`).join('\n') || ''}`,
          history: aiMessages.slice(-8).map(m => ({ role: m.role, content: m.content }))
        })
      });
      
      const data = await response.json();
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.response || 'عذراً، حدث خطأ.' }]);
      setUserStats(prev => ({ ...prev, questionsAnswered: prev.questionsAnswered + 1 }));
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، لا أستطيع الاتصال حالياً.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };
  
  // =========================================
  // ⭐ تبديل المفضلة
  // =========================================
  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavs = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      setUserStats(stats => ({ ...stats, favoritesAdded: newFavs.length }));
      return newFavs;
    });
  };
  
  // =========================================
  // 📊 تصفية التجارب
  // =========================================
  const filteredExperiments = experiments.filter(exp => {
    const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
    const matchesSearch = exp.name.includes(searchQuery) || 
                         exp.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exp.description.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });
  
  // =========================================
  // 🏆 فحص الجوائز
  // =========================================
  useEffect(() => {
    achievements.forEach(ach => {
      if (ach.condition(userStats) && !unlockedAchievements.includes(ach.id)) {
        setUnlockedAchievements(prev => [...prev, ach.id]);
      }
    });
  }, [userStats]);
  
  // =========================================
  // 🎯 إضافة صف
  // =========================================
  const addRow = () => {
    setDataRows(prev => [...prev, {
      id: `row-${Date.now()}`,
      values: dataColumns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {})
    }]);
  };
  
  // =========================================
  // 🎯 إضافة عمود
  // =========================================
  const addColumn = () => {
    const newCol: DataColumn = {
      id: `col-${Date.now()}`,
      name: `عمود ${dataColumns.length + 1}`,
      unit: ''
    };
    setDataColumns(prev => [...prev, newCol]);
    setDataRows(prev => prev.map(row => ({
      ...row,
      values: { ...row.values, [newCol.id]: '' }
    })));
  };
  
  // =========================================
  // 🎯 حذف صف
  // =========================================
  const deleteRow = (id: string) => {
    setDataRows(prev => prev.filter(r => r.id !== id));
  };
  
  // =========================================
  // 🎯 حذف عمود
  // =========================================
  const deleteColumn = (id: string) => {
    setDataColumns(prev => prev.filter(c => c.id !== id));
    setDataRows(prev => prev.map(row => {
      const newValues = { ...row.values };
      delete newValues[id];
      return { ...row, values: newValues };
    }));
  };
  
  // =========================================
  // 📊 تصدير البيانات
  // =========================================
  const exportData = () => {
    const headers = dataColumns.map(c => `${c.name} (${c.unit})`).join('\t');
    const rows = dataRows.map(row => 
      dataColumns.map(c => row.values[c.id] || '').join('\t')
    ).join('\n');
    
    const csv = `${selectedExperiment?.name || 'بيانات الفيزياء'}\n${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedExperiment?.id || 'physics'}_data.txt`;
    a.click();
  };
  
  // =========================================
  // 📊 إرسال للتحليل
  // =========================================
  const analyzeData = () => {
    setAiMessages(prev => [
      ...prev,
      { role: 'user', content: '📊 قم بتحليل جدول البيانات وقدم اقتراحات' }
    ]);
    sendAiMessage();
  };
  
  // =========================================
  // 🎨 JSX
  // =========================================
  return (
    <div className="h-full flex flex-col bg-slate-900 text-white" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-gradient-to-r from-cyan-900/30 to-blue-900/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-xl">
            🔬
          </div>
          <div>
            <h2 className="text-sm font-bold text-cyan-300">مختبر الفيزياء التفاعلي</h2>
            <p className="text-[10px] text-slate-400">
              {selectedExperiment ? `📌 ${selectedExperiment.name}` : 'اختر تجربة للبدء'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-amber-900/30 px-3 py-1 rounded-full border border-amber-600/30">
            <TrophyIcon className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{unlockedAchievements.length}</span>
          </div>
          {selectedExperiment && (
            <button
              onClick={() => setSelectedExperiment(null)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition"
            >
              ← اختيار تجربة
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* القائمة الجانبية */}
        {!selectedExperiment && (
          <div className="w-80 border-l border-slate-700 flex flex-col bg-slate-800/30">
            {/* البحث */}
            <div className="p-3 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن تجربة..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
            
            {/* التصنيفات */}
            <div className="p-2 border-b border-slate-700 overflow-x-auto flex gap-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 whitespace-nowrap ${
                    selectedCategory === cat.id 
                      ? 'bg-cyan-600 text-white' 
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="bg-black/20 px-1 rounded">{cat.count}</span>
                </button>
              ))}
            </div>
            
            {/* المفضلات */}
            {favorites.length > 0 && (
              <div className="p-2 border-b border-slate-700">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-amber-400">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>المفضلة ({favorites.length})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {experiments.filter(e => favorites.includes(e.id)).slice(0, 5).map(exp => (
                    <button
                      key={exp.id}
                      onClick={() => setSelectedExperiment(exp)}
                      className="px-2 py-1 bg-amber-900/30 border border-amber-700/30 rounded-lg text-[10px] text-amber-300 hover:bg-amber-900/50 transition"
                    >
                      {exp.icon} {exp.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* قائمة التجارب */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredExperiments.map(exp => (
                <button
                  key={exp.id}
                  onClick={() => setSelectedExperiment(exp)}
                  className={`w-full p-3 rounded-xl text-right transition ${
                    favorites.includes(exp.id) 
                      ? 'bg-amber-900/20 border border-amber-700/30' 
                      : 'bg-slate-800/50 hover:bg-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{exp.icon}</span>
                    <div className="flex-1 text-right">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-200">{exp.name}</p>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded ${
                          exp.difficulty === 'سهل' ? 'bg-green-900/50 text-green-400' :
                          exp.difficulty === 'متوسط' ? 'bg-yellow-900/50 text-yellow-400' :
                          'bg-red-900/50 text-red-400'
                        }`}>{exp.difficulty}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">{exp.description}</p>
                      <p className="text-[9px] text-cyan-500 mt-0.5">{exp.category} • {exp.subcategory}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(exp.id); }}
                      className="p-1 hover:bg-slate-600 rounded transition"
                    >
                      <Star className={`w-4 h-4 ${favorites.includes(exp.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
                    </button>
                  </div>
                </button>
              ))}
              
              {filteredExperiments.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">لم يتم العثور على تجارب</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* منطقة العمل */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedExperiment ? (
            <>
              {/* التبويبات */}
              <div className="flex border-b border-slate-700 bg-slate-800/30">
                {[
                  { id: 'simulation', name: '🎬 المحاكاة', icon: Play },
                  { id: 'data', name: '📊 جدول البيانات', icon: BarChart3 },
                  { id: 'ai', name: '🤖 المعلم الذكي', icon: Brain },
                  { id: 'units', name: '🔄 الوحدات', icon: Compass }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 px-4 py-3 text-xs font-bold transition flex items-center justify-center gap-2 ${
                      activeTab === tab.id 
                        ? 'bg-slate-700 text-cyan-400 border-b-2 border-cyan-400' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </div>
              
              {/* محتوى التبويبات */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* 🎬 المحاكاة */}
                {activeTab === 'simulation' && (
                  <div className="space-y-4">
                    {/* معلومات التجربة */}
                    <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-4 border border-cyan-700/30">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{selectedExperiment.icon}</span>
                        <div>
                          <h3 className="text-sm font-bold text-cyan-300">{selectedExperiment.name}</h3>
                          <p className="text-[10px] text-slate-400">{selectedExperiment.description}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{selectedExperiment.aiExplanation}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedExperiment.equations.map((eq, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-800 rounded-lg text-[10px] font-mono text-amber-300">
                            {eq.formula}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Canvas */}
                    <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-700">
                      <canvas
                        ref={canvasRef}
                        width={700}
                        height={200}
                        className="w-full h-48"
                      />
                      <div className="flex items-center justify-center gap-3 p-3 bg-slate-900/50">
                        <button
                          onClick={isSimulating ? () => setIsSimulating(false) : runSimulation}
                          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                            isSimulating 
                              ? 'bg-red-600 hover:bg-red-500' 
                              : 'bg-cyan-600 hover:bg-cyan-500'
                          }`}
                        >
                          {isSimulating ? <><Pause className="w-4 h-4" /> إيقاف</> : <><Play className="w-4 h-4" /> تشغيل</>}
                        </button>
                        <button
                          onClick={() => { setIsSimulating(false); setSimulationTime(0); }}
                          className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" /> إعادة
                        </button>
                        <span className="text-xs text-slate-400 font-mono">
                          t = {simulationTime.toFixed(2)}s
                        </span>
                      </div>
                    </div>
                    
                    {/* متغيرات الإدخال */}
                    <div className="bg-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-cyan-300 mb-3 flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        إدخال المتغيرات
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedExperiment.variables.map(variable => (
                          <div key={variable.name}>
                            <label className="text-[10px] text-slate-400 block mb-1.5">
                              {variable.label} ({variable.labelEn})
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={inputValues[variable.name] || variable.default}
                                onChange={(e) => setInputValues(prev => ({
                                  ...prev,
                                  [variable.name]: parseFloat(e.target.value) || 0
                                }))}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                              />
                              <select
                                value={selectedUnit[variable.name] || variable.unitOptions[0].value}
                                onChange={(e) => setSelectedUnit(prev => ({ ...prev, [variable.name]: e.target.value }))}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-400 outline-none"
                              >
                                {variable.unitOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label || opt.value}</option>
                                ))}
                              </select>
                            </div>
                            <input
                              type="range"
                              value={inputValues[variable.name] || variable.default}
                              onChange={(e) => setInputValues(prev => ({
                                ...prev,
                                [variable.name]: parseFloat(e.target.value)
                              }))}
                              min={variable.min}
                              max={variable.max}
                              className="w-full mt-1 accent-cyan-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* النتائج */}
                    {Object.keys(results).length > 0 && (
                      <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-4 border border-green-700/30">
                        <h4 className="text-xs font-bold text-green-300 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          النتائج المحسوبة
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(results).map(([key, value]) => (
                            <div key={key} className="bg-slate-800 rounded-lg p-3">
                              <p className="text-[10px] text-slate-400">{getResultLabel(key)}</p>
                              <p className="text-lg font-bold text-green-400">{typeof value === 'number' ? value.toFixed(3) : value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 📊 جدول البيانات */}
                {activeTab === 'data' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        جدول البيانات - {selectedExperiment.name}
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={addColumn}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs flex items-center gap-1 transition"
                        >
                          <Plus className="w-3 h-3" /> إضافة عمود
                        </button>
                        <button
                          onClick={addRow}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs flex items-center gap-1 transition"
                        >
                          <Plus className="w-3 h-3" /> إضافة صف
                        </button>
                        <button
                          onClick={exportData}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs flex items-center gap-1 transition"
                        >
                          <Download className="w-3 h-3" /> تصدير
                        </button>
                      </div>
                    </div>
                    
                    {/* الجدول */}
                    <div className="overflow-x-auto bg-slate-800 rounded-xl border border-slate-700">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-700">
                            <th className="p-2 text-slate-400 w-10">#</th>
                            {dataColumns.map(col => (
                              <th key={col.id} className="p-2 text-cyan-300 min-w-[120px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span>{col.name}</span>
                                  <span className="text-[9px] text-slate-500">({col.unit})</span>
                                  <button
                                    onClick={() => deleteColumn(col.id)}
                                    className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </th>
                            ))}
                            <th className="p-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataRows.map((row, rowIndex) => (
                            <tr key={row.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                              <td className="p-2 text-slate-500 text-center">{rowIndex + 1}</td>
                              {dataColumns.map(col => (
                                <td key={col.id} className="p-1">
                                  <input
                                    type="text"
                                    value={row.values[col.id] || ''}
                                    onChange={(e) => setDataRows(prev => prev.map(r => 
                                      r.id === row.id 
                                        ? { ...r, values: { ...r.values, [col.id]: e.target.value } }
                                        : r
                                    ))}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-white text-center focus:border-cyan-500 outline-none"
                                  />
                                </td>
                              ))}
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => deleteRow(row.id)}
                                  className="text-red-400 hover:text-red-300 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* أزرار إضافية */}
                    <div className="flex gap-3">
                      <button
                        onClick={calculateResults}
                        className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        حساب النتائج
                      </button>
                      <button
                        onClick={analyzeData}
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        <Brain className="w-4 h-4" />
                        تحليل البيانات بالذكاء الاصطناعي
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 🤖 المعلم الذكي */}
                {activeTab === 'ai' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                      {aiMessages.map((msg, i) => (
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
                      {isAiLoading && (
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
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendAiMessage()}
                        placeholder="اسأل عن هذه التجربة..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                      />
                      <button
                        onClick={sendAiMessage}
                        disabled={!aiInput.trim() || isAiLoading}
                        className="w-12 h-12 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 rounded-xl flex items-center justify-center transition"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 🔄 تحويل الوحدات */}
                {activeTab === 'units' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                      <Compass className="w-4 h-4" />
                      محول الوحدات الذكي
                    </h4>
                    
                    {/* اختيار الفئة */}
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(unitConversions).map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setUnitCategory(cat); setUnitValue('1'); }}
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                            unitCategory === cat 
                              ? 'bg-cyan-600 text-white' 
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {cat === 'length' && '📏 طول'}
                          {cat === 'mass' && '⚖️ كتلة'}
                          {cat === 'time' && '⏱️ زمن'}
                          {cat === 'temperature' && '🌡️ حرارة'}
                          {cat === 'pressure' && '📊 ضغط'}
                        </button>
                      ))}
                    </div>
                    
                    {/* القيم */}
                    <div className="bg-slate-800 rounded-xl p-4">
                      <input
                        type="number"
                        value={unitValue}
                        onChange={(e) => setUnitValue(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-lg text-white text-center focus:border-cyan-500 outline-none mb-4"
                      />
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {unitConversions[unitCategory]?.map(conv => (
                          <div key={conv.unit} className="bg-slate-900 rounded-lg p-3 text-center">
                            <p className="text-[10px] text-slate-500 mb-1">{conv.unit}</p>
                            <p className="text-lg font-bold text-cyan-400">
                              {(parseFloat(unitValue) * conv.factor).toFixed(6)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* نصائح */}
                    <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4">
                      <h5 className="text-xs font-bold text-amber-400 mb-2">💡 نصيحة</h5>
                      <p className="text-xs text-slate-300">
                        {unitCategory === 'length' && '1 متر = 100 سنتيمتر = 1000 مليمتر = 3.281 قدم'}
                        {unitCategory === 'mass' && '1 كيلوغرام = 1000 غرام = 2.205 رطل'}
                        {unitCategory === 'time' && '1 ساعة = 60 دقيقة = 3600 ثانية'}
                        {unitCategory === 'temperature' && 'لتحويل الحرارة: K = °C + 273.15'}
                        {unitCategory === 'pressure' && '1 atm = 101325 Pa = 760 mmHg'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* رسالة الترحيب */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-lg">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center text-4xl">
                  🔬
                </div>
                <h2 className="text-xl font-bold text-cyan-300 mb-2">مرحباً بك في مختبر الفيزياء!</h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  اختر تجربة فيزيائية من القائمة الجانبية للبدء في المحاكاة التفاعلية، جدول البيانات، والذكاء الاصطناعي.
                </p>
                
                {/* الإحصائيات */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-slate-800 p-3 rounded-xl">
                    <TrophyIcon className="w-6 h-6 mx-auto mb-1 text-amber-400" />
                    <p className="text-lg font-bold text-white">{userStats.experimentsCompleted}</p>
                    <p className="text-[10px] text-slate-400">تجربة</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-xl">
                    <Brain className="w-6 h-6 mx-auto mb-1 text-purple-400" />
                    <p className="text-lg font-bold text-white">{userStats.questionsAnswered}</p>
                    <p className="text-[10px] text-slate-400">سؤال</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-xl">
                    <Award className="w-6 h-6 mx-auto mb-1 text-green-400" />
                    <p className="text-lg font-bold text-white">{unlockedAchievements.length}</p>
                    <p className="text-[10px] text-slate-400">إنجاز</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-xl">
                    <Star className="w-6 h-6 mx-auto mb-1 text-cyan-400" />
                    <p className="text-lg font-bold text-white">{favorites.length}</p>
                    <p className="text-[10px] text-slate-400">مفضلة</p>
                  </div>
                </div>
                
                {/* الجوائز */}
                <div className="bg-slate-800 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-amber-400 mb-3 flex items-center gap-2 justify-center">
                    <TrophyIcon className="w-4 h-4" />
                    الإنجازات ({unlockedAchievements.length}/{achievements.length})
                  </h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {achievements.map(ach => (
                      <div
                        key={ach.id}
                        className={`px-3 py-2 rounded-lg text-center transition ${
                          unlockedAchievements.includes(ach.id) 
                            ? 'bg-amber-900/50 border border-amber-600/30' 
                            : 'bg-slate-700/50 border border-slate-600/30 opacity-50'
                        }`}
                        title={ach.description}
                      >
                        <span className="text-xl">{ach.icon}</span>
                        <p className="text-[9px] text-slate-300 mt-1">{ach.name}</p>
                        <p className="text-[8px] text-amber-400">+{ach.points}</p>
                      </div>
                    ))}
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

// =============================================
// 📝 دوال مساعدة
// =============================================
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
    momentum: 'الزخم',
    remaining: 'المتبقي',
    activity: 'النشاط',
    value: 'القيمة'
  };
  return labels[key] || key;
}
