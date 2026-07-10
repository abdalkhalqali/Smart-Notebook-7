import React, { useState, useCallback } from 'react';
import { 
  Calculator, Zap, ArrowRight, Copy, Check, RotateCcw,
  Lightbulb, BookOpen, Play, ChevronDown, ChevronUp, Math,
  FunctionSquare, Sigma, SquareRoot, Pi, Variable
} from 'lucide-react';

interface Equation {
  id: string;
  name: string;
  nameEn: string;
  formula: string;
  description: string;
  variables: {
    symbol: string;
    name: string;
    unit: string;
  }[];
  solveFor: string;
  steps: {
    description: string;
    formula: string;
  }[];
  category: string;
}

interface VariableValue {
  symbol: string;
  value: string;
}

const EQUATIONS: Equation[] = [
  {
    id: 'newton-second',
    name: 'قانون نيوتن الثاني',
    nameEn: "Newton's Second Law",
    formula: 'F = ma',
    description: 'القوة = الكتلة × التسارع',
    variables: [
      { symbol: 'F', name: 'القوة', unit: 'N' },
      { symbol: 'm', name: 'الكتلة', unit: 'kg' },
      { symbol: 'a', name: 'التسارع', unit: 'm/s²' },
    ],
    solveFor: 'F',
    steps: [
      { description: 'قانون نيوتن الثاني يربط القوة بالكتلة والتسارع', formula: 'F = ma' },
      { description: 'وحدة القوة هي النيوتن (N) = kg·m/s²', formula: '1N = 1kg·m/s²' },
    ],
    category: 'ميكانيكا'
  },
  {
    id: 'kinetic-energy',
    name: 'الطاقة الحركية',
    nameEn: 'Kinetic Energy',
    formula: 'KE = ½mv²',
    description: 'طاقة الحركة لجسم متحرك',
    variables: [
      { symbol: 'KE', name: 'الطاقة الحركية', unit: 'J' },
      { symbol: 'm', name: 'الكتلة', unit: 'kg' },
      { symbol: 'v', name: 'السرعة', unit: 'm/s' },
    ],
    solveFor: 'KE',
    steps: [
      { description: 'الطاقة الحركية تعتمد على مربع السرعة', formula: 'KE = ½mv²' },
      { description: 'لذلك إذا تضاعفت السرعة، تتضاعف الطاقة 4 مرات!', formula: 'إذا v→2v, KE→4KE' },
    ],
    category: 'ميكانيكا'
  },
  {
    id: 'free-fall-time',
    name: 'زمن السقوط الحر',
    nameEn: 'Free Fall Time',
    formula: 't = √(2h/g)',
    description: 'زمن سقوط جسم من ارتفاع h',
    variables: [
      { symbol: 't', name: 'الزمن', unit: 's' },
      { symbol: 'h', name: 'الارتفاع', unit: 'm' },
      { symbol: 'g', name: 'تسارع الجاذبية', unit: 'm/s²' },
    ],
    solveFor: 't',
    steps: [
      { description: 'من معادلة الحركة: h = ½gt²', formula: 'h = ½gt²' },
      { description: 'نضرب الطرفين في 2: 2h = gt²', formula: '2h = gt²' },
      { description: 'نقسم على g: t² = 2h/g', formula: 't² = 2h/g' },
      { description: 'نأخذ الجذر التربيعي: t = √(2h/g)', formula: 't = √(2h/g)' },
    ],
    category: 'ميكانيكا'
  },
  {
    id: 'projectile-range',
    name: 'مدى القذيفة',
    nameEn: 'Projectile Range',
    formula: 'R = v₀²sin(2θ)/g',
    description: 'المدى الأفقي للقذيفة',
    variables: [
      { symbol: 'R', name: 'المدى', unit: 'm' },
      { symbol: 'v₀', name: 'السرعة الابتدائية', unit: 'm/s' },
      { symbol: 'θ', name: 'زاوية الإطلاق', unit: '°' },
      { symbol: 'g', name: 'تسارع الجاذبية', unit: 'm/s²' },
    ],
    solveFor: 'R',
    steps: [
      { description: 'المدى الأعظمي عند θ = 45°', formula: 'R_max = v₀²/g' },
      { description: 'sin(2×45°) = sin(90°) = 1', formula: 'sin(90°) = 1' },
      { description: 'لأي زاوية أخرى: R = v₀²sin(2θ)/g', formula: 'R = v₀²sin(2θ)/g' },
    ],
    category: 'ميكانيكا'
  },
  {
    id: 'pendulum-period',
    name: 'الزمن الدوري للبندول',
    nameEn: 'Pendulum Period',
    formula: 'T = 2π√(L/g)',
    description: 'زمن الدورة الكاملة للبندول البسيط',
    variables: [
      { symbol: 'T', name: 'الزمن الدوري', unit: 's' },
      { symbol: 'L', name: 'طول الخيط', unit: 'm' },
      { symbol: 'g', name: 'تسارع الجاذبية', unit: 'm/s²' },
    ],
    solveFor: 'T',
    steps: [
      { description: 'الزمن الدوري لا يعتمد على الكتلة!', formula: 'T ∝ √L' },
      { description: 'أو على سعة الترجحة (لزاويا صغيرة)', formula: 'T = 2π√(L/g)' },
    ],
    category: 'ميكانيكا'
  },
  {
    id: 'ohms-law',
    name: 'قانون أوم',
    nameEn: "Ohm's Law",
    formula: 'V = IR',
    description: 'العلاقة بين الجهد والتيار والمقاومة',
    variables: [
      { symbol: 'V', name: 'الجهد', unit: 'V' },
      { symbol: 'I', name: 'التيار', unit: 'A' },
      { symbol: 'R', name: 'المقاومة', unit: 'Ω' },
    ],
    solveFor: 'V',
    steps: [
      { description: 'قانون أوم: الجهد = التيار × المقاومة', formula: 'V = IR' },
      { description: 'لحساب التيار: I = V/R', formula: 'I = V/R' },
      { description: 'لحساب المقاومة: R = V/I', formula: 'R = V/I' },
    ],
    category: 'كهرباء'
  },
  {
    id: 'electric-power',
    name: 'القدرة الكهربائية',
    nameEn: 'Electric Power',
    formula: 'P = VI',
    description: 'القدرة = الجهد × التيار',
    variables: [
      { symbol: 'P', name: 'القدرة', unit: 'W' },
      { symbol: 'V', name: 'الجهد', unit: 'V' },
      { symbol: 'I', name: 'التيار', unit: 'A' },
    ],
    solveFor: 'P',
    steps: [
      { description: 'القدرة تقاس بالوات (W)', formula: 'P = VI' },
      { description: 'يمكن أيضاً حسابها: P = I²R', formula: 'P = I²R' },
      { description: 'أو: P = V²/R', formula: 'P = V²/R' },
    ],
    category: 'كهرباء'
  },
  {
    id: 'wave-equation',
    name: 'معادلة الموجة',
    nameEn: 'Wave Equation',
    formula: 'v = fλ',
    description: 'السرعة = التردد × الطول الموجي',
    variables: [
      { symbol: 'v', name: 'سرعة الموجة', unit: 'm/s' },
      { symbol: 'f', name: 'التردد', unit: 'Hz' },
      { symbol: 'λ', name: 'الطول الموجي', unit: 'm' },
    ],
    solveFor: 'v',
    steps: [
      { description: 'هذه المعادلة الأساسية للموجات', formula: 'v = fλ' },
      { description: 'التردد: عدد الذبذبات في الثانية', formula: 'f = 1/T' },
      { description: 'الطول الموجي: المسافة بين قمتين متتاليتين', formula: 'λ = v/f' },
    ],
    category: 'بصريات'
  },
  {
    id: 'snells-law',
    name: 'قانون سنيل',
    nameEn: "Snell's Law",
    formula: 'n₁sinθ₁ = n₂sinθ₂',
    description: 'قانون انكسار الضوء',
    variables: [
      { symbol: 'n₁', name: 'معامل الانكسار 1', unit: '' },
      { symbol: 'θ₁', name: 'زاوية السقوط', unit: '°' },
      { symbol: 'n₂', name: 'معامل الانكسار 2', unit: '' },
      { symbol: 'θ₂', name: 'زاوية الانكسار', unit: '°' },
    ],
    solveFor: 'θ₂',
    steps: [
      { description: 'قانون سنيل يصف انكسار الضوء', formula: 'n₁sinθ₁ = n₂sinθ₂' },
      { description: 'لحساب زاوية الانكسار', formula: 'sinθ₂ = (n₁/n₂)sinθ₁' },
      { description: 'عند الانتقال من وسط أكثف لأقل: ينحرف بعيداً عن العمود', formula: 'n₁ > n₂ → θ₂ > θ₁' },
    ],
    category: 'بصريات'
  },
  {
    id: 'ideal-gas',
    name: 'معادلة الغاز المثالي',
    nameEn: 'Ideal Gas Law',
    formula: 'PV = nRT',
    description: 'معادلة حالة الغاز المثالي',
    variables: [
      { symbol: 'P', name: 'الضغط', unit: 'Pa' },
      { symbol: 'V', name: 'الحجم', unit: 'm³' },
      { symbol: 'n', name: 'عدد المولات', unit: 'mol' },
      { symbol: 'R', name: 'ثابت الغاز', unit: 'J/mol·K' },
      { symbol: 'T', name: 'الحرارة', unit: 'K' },
    ],
    solveFor: 'P',
    steps: [
      { description: 'معادلة الغاز المثالي', formula: 'PV = nRT' },
      { description: 'لحساب الضغط: P = nRT/V', formula: 'P = nRT/V' },
      { description: 'R = 8.314 J/mol·K', formula: 'R = 8.314 J/mol·K' },
    ],
    category: 'حرارة'
  },
  {
    id: 'radioactive-decay',
    name: 'تحلل مشع',
    nameEn: 'Radioactive Decay',
    formula: 'N = N₀e^(-λt)',
    description: 'عدد الذرات المتبقية بعد زمن t',
    variables: [
      { symbol: 'N', name: 'الذرات المتبقية', unit: '' },
      { symbol: 'N₀', name: 'الذرات الابتدائية', unit: '' },
      { symbol: 'λ', name: 'ثابت التحلل', unit: '1/s' },
      { symbol: 't', name: 'الزمن', unit: 's' },
    ],
    solveFor: 'N',
    steps: [
      { description: 'التحلل الإشعاعي عملية عشوائية', formula: 'N = N₀e^(-λt)' },
      { description: 'عمر النصف: t½ = ln2/λ', formula: 't½ = ln2/λ ≈ 0.693/λ' },
      { description: 'بعد عمر نصف واحد، تبقى نصف الكمية', formula: 'N = N₀/2' },
    ],
    category: 'فيزياء حديثة'
  },
  {
    id: 'photoelectric',
    name: 'التأثير الكهروضوئي',
    nameEn: 'Photoelectric Effect',
    formula: 'KE = hf - φ',
    description: 'معادلة آينشتاين للتأثير الكهروضوئي',
    variables: [
      { symbol: 'KE', name: 'الطاقة الحركية', unit: 'eV' },
      { symbol: 'h', name: 'ثابت بلانك', unit: 'J·s' },
      { symbol: 'f', name: 'تردد الضوء', unit: 'Hz' },
      { symbol: 'φ', name: 'دالة الشغل', unit: 'eV' },
    ],
    solveFor: 'KE',
    steps: [
      { description: 'طاقة الفوتون: E = hf', formula: 'E = hf = hc/λ' },
      { description: 'الطاقة الحركية للإلكترون', formula: 'KE = hf - φ' },
      { description: 'التردد الحرج: fc = φ/h', formula: 'fc = φ/h' },
    ],
    category: 'فيزياء حديثة'
  }
];

export default function PhysicsEquationSolver({ darkMode = true }: { darkMode?: boolean }) {
  const [selectedEquation, setSelectedEquation] = useState<Equation | null>(null);
  const [variables, setVariables] = useState<VariableValue[]>([]);
  const [result, setResult] = useState<{ variable: string; value: number; unit: string } | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const bgMain = darkMode ? 'bg-slate-900' : 'bg-slate-100';
  const bgCard = darkMode ? 'bg-slate-800' : 'bg-white';
  const textMain = darkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-600';
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';
  
  const selectEquation = (equation: Equation) => {
    setSelectedEquation(equation);
    setVariables(equation.variables.map(v => ({ symbol: v.symbol, value: '' })));
    setResult(null);
    setShowSteps(false);
  };
  
  const updateVariable = (symbol: string, value: string) => {
    setVariables(prev => prev.map(v => v.symbol === symbol ? { ...v, value } : v));
    setResult(null);
  };
  
  const solve = useCallback(() => {
    if (!selectedEquation) return;
    
    const values: Record<string, number> = {};
    variables.forEach(v => {
      if (v.value) {
        values[v.symbol] = parseFloat(v.value);
      }
    });
    
    let resultValue = 0;
    let resultSymbol = '';
    let resultUnit = '';
    
    switch (selectedEquation.id) {
      case 'newton-second':
        if (values.m && values.a) {
          resultValue = values.m * values.a;
          resultSymbol = 'F';
          resultUnit = 'N';
        }
        break;
        
      case 'kinetic-energy':
        if (values.m && values.v) {
          resultValue = 0.5 * values.m * values.v * values.v;
          resultSymbol = 'KE';
          resultUnit = 'J';
        }
        break;
        
      case 'free-fall-time':
        if (values.h && values.g) {
          resultValue = Math.sqrt((2 * values.h) / values.g);
          resultSymbol = 't';
          resultUnit = 's';
        }
        break;
        
      case 'projectile-range':
        if (values.v0 && values.theta && values.g) {
          const angleRad = (values.theta * Math.PI) / 180;
          resultValue = (values.v0 * values.v0 * Math.sin(2 * angleRad)) / values.g;
          resultSymbol = 'R';
          resultUnit = 'm';
        }
        break;
        
      case 'pendulum-period':
        if (values.L && values.g) {
          resultValue = 2 * Math.PI * Math.sqrt(values.L / values.g);
          resultSymbol = 'T';
          resultUnit = 's';
        }
        break;
        
      case 'ohms-law':
        if (values.I && values.R) {
          resultValue = values.I * values.R;
          resultSymbol = 'V';
          resultUnit = 'V';
        } else if (values.V && values.R) {
          resultValue = values.V / values.R;
          resultSymbol = 'I';
          resultUnit = 'A';
        } else if (values.V && values.I) {
          resultValue = values.V / values.I;
          resultSymbol = 'R';
          resultUnit = 'Ω';
        }
        break;
        
      case 'electric-power':
        if (values.V && values.I) {
          resultValue = values.V * values.I;
          resultSymbol = 'P';
          resultUnit = 'W';
        }
        break;
        
      case 'wave-equation':
        if (values.f && values.lambda) {
          resultValue = values.f * values.lambda;
          resultSymbol = 'v';
          resultUnit = 'm/s';
        }
        break;
        
      case 'snells-law':
        if (values.n1 && values.theta1 && values.n2) {
          const sinTheta2 = (values.n1 / values.n2) * Math.sin((values.theta1 * Math.PI) / 180);
          resultValue = (Math.asin(sinTheta2) * 180) / Math.PI;
          resultSymbol = 'θ₂';
          resultUnit = '°';
        }
        break;
        
      case 'ideal-gas':
        if (values.n && values.R && values.T && values.V) {
          resultValue = (values.n * values.R * values.T) / values.V;
          resultSymbol = 'P';
          resultUnit = 'Pa';
        }
        break;
        
      case 'radioactive-decay':
        if (values.N0 && values.lambda && values.t) {
          resultValue = values.N0 * Math.exp(-values.lambda * values.t);
          resultSymbol = 'N';
          resultUnit = '';
        }
        break;
        
      case 'photoelectric':
        if (values.h && values.f && values.phi) {
          // h = 6.626e-34 J·s
          resultValue = (values.h * values.f - values.phi) / 1.602e19; // Convert to eV
          resultSymbol = 'KE';
          resultUnit = 'eV';
        }
        break;
        
      default:
        return;
    }
    
    setResult({ variable: resultSymbol, value: resultValue, unit: resultUnit });
  }, [selectedEquation, variables]);
  
  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(`${result.value.toFixed(4)} ${result.unit}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const reset = () => {
    setVariables(prev => prev.map(v => ({ ...v, value: '' })));
    setResult(null);
  };
  
  const categories = [...new Set(EQUATIONS.map(e => e.category))];
  
  return (
    <div className="space-y-4">
      {/* Equation Selection */}
      <div className={`${bgCard} rounded-2xl border ${borderColor} p-4`}>
        <h3 className={`text-sm font-bold ${textMain} mb-3 flex items-center gap-2`}>
          <FunctionSquare className="w-5 h-5 text-cyan-400" />
          اختر المعادلة
        </h3>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(cat => (
            <span 
              key={cat}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold ${
                darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {cat}
            </span>
          ))}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {EQUATIONS.map(eq => (
            <button
              key={eq.id}
              onClick={() => selectEquation(eq)}
              className={`p-3 rounded-xl text-right transition ${
                selectedEquation?.id === eq.id
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                  : darkMode 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <p className="text-sm font-bold">{eq.name}</p>
              <p className={`text-xs ${selectedEquation?.id === eq.id ? 'text-cyan-200' : textSecondary} font-mono`}>
                {eq.formula}
              </p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Variable Input */}
      {selectedEquation && (
        <div className={`${bgCard} rounded-2xl border ${borderColor} p-4`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold ${textMain} flex items-center gap-2`}>
              <Variable className="w-5 h-5 text-amber-400" />
              أدخل القيم
            </h3>
            <button
              onClick={reset}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition`}
            >
              <RotateCcw className={`w-4 h-4 ${textSecondary}`} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {variables.map(v => {
              const varInfo = selectedEquation.variables.find(vi => vi.symbol === v.symbol);
              return (
                <div key={v.symbol}>
                  <label className={`block text-xs ${textSecondary} mb-1`}>
                    {varInfo?.name || v.symbol} ({v.symbol})
                    {varInfo?.unit && <span className="mr-1">[{varInfo.unit}]</span>}
                  </label>
                  <input
                    type="number"
                    value={v.value}
                    onChange={e => updateVariable(v.symbol, e.target.value)}
                    placeholder="0"
                    className={`w-full p-3 rounded-xl text-center font-mono ${
                      darkMode
                        ? 'bg-slate-700 text-white border border-slate-600 focus:border-cyan-500 outline-none'
                        : 'bg-slate-100 text-slate-900 border border-slate-300 focus:border-cyan-500 outline-none'
                    }`}
                  />
                </div>
              );
            })}
          </div>
          
          <button
            onClick={solve}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" />
            احسب
          </button>
        </div>
      )}
      
      {/* Result */}
      {result && (
        <div className={`${bgCard} rounded-2xl border ${borderColor} p-4`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold ${textMain} flex items-center gap-2`}>
              <Zap className="w-5 h-5 text-emerald-400" />
              النتيجة
            </h3>
            <button
              onClick={copyToClipboard}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition`}
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className={`w-4 h-4 ${textSecondary}`} />
              )}
            </button>
          </div>
          
          <div className={`p-6 rounded-2xl text-center ${
            darkMode ? 'bg-gradient-to-br from-emerald-900/50 to-cyan-900/50' : 'bg-gradient-to-br from-emerald-50 to-cyan-50'
          }`}>
            <p className={`text-xs ${textSecondary} mb-1`}>
              {result.variable} =
            </p>
            <p className={`text-4xl font-bold font-mono ${
              darkMode ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              {result.value.toFixed(4)}
            </p>
            {result.unit && (
              <p className={`text-lg ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                {result.unit}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Steps */}
      {selectedEquation && (
        <div className={`${bgCard} rounded-2xl border ${borderColor} p-4`}>
          <button
            onClick={() => setShowSteps(!showSteps)}
            className={`w-full flex items-center justify-between ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
          >
            <span className="text-sm font-bold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              شرح المعادلة
            </span>
            {showSteps ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {showSteps && (
            <div className="mt-4 space-y-3">
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                <p className={`text-xs font-mono ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  📐 {selectedEquation.formula}
                </p>
                <p className={`text-xs ${textSecondary} mt-1`}>
                  {selectedEquation.description}
                </p>
              </div>
              
              {selectedEquation.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    darkMode ? 'bg-cyan-600' : 'bg-cyan-500'
                  } text-white text-xs font-bold`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className={`text-xs ${textSecondary}`}>{step.description}</p>
                    <p className={`text-xs font-mono ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                      {step.formula}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
