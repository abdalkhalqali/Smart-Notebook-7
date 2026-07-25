/**
 * Clever Painter — Built-in Command Registration
 * تسجيل جميع أوامر الرسم المدمجة في المحرك
 */

import drawCircuit from './circuit.js';
import drawGraph from './graph.js';
import drawForce from './force.js';
import drawWave from './wave.js';
import drawMechanical from './mechanical.js';
import drawField from './field.js';
import drawBeam from './beam.js';

/**
 * تسجيل جميع الأوامر المدمجة في المحرك
 * @param {import('../core/GraphicsEngine.js').GraphicsEngine} engine - محرك الرسومات
 */
export function registerBuiltinCommands(engine) {
  engine
    .registerCommand('circuit', drawCircuit)
    .registerCommand('graph', drawGraph)
    .registerCommand('force', drawForce)
    .registerCommand('wave', drawWave)
    .registerCommand('mechanical', drawMechanical)
    .registerCommand('field', drawField)
    .registerCommand('beam', drawBeam);

  console.log('[CleverPainter] Built-in commands registered:', [
    'circuit', 'graph', 'force', 'wave', 'mechanical', 'field', 'beam',
  ]);
}

/**
 * قائمة الأوامر المدعومة مع وصف لكل أمر
 */
export const COMMAND_CATALOG = {
  circuit: {
    description: 'رسم دوائر كهربائية (بطارية، مقاومات، لمبات، مفاتيح)',
    params: {
      components: { type: 'array', description: 'مصفوفة المكونات (battery, resistor, bulb, switch, capacitor, inductor)' },
      wires: { type: 'array', description: 'مصفوفة الأسلاك للتوصيلات المخصصة' },
      title: { type: 'string', description: 'عنوان الرسم', default: 'دائرة كهربائية' },
    },
    examples: [
      { action: 'draw', type: 'circuit', components: [{ type: 'battery', voltage: 12 }, { type: 'resistor', value: '10Ω' }] },
    ],
  },
  graph: {
    description: 'رسم بياني للمحاور والدوال الرياضية',
    params: {
      expression: { type: 'string', description: 'التعبير الرياضي (مثال: 0.1*x*sin(x/20))' },
      xRange: { type: 'array', description: 'مدى المحور الأفقي [min, max]' },
      color: { type: 'string', description: 'لون المنحنى' },
    },
    examples: [
      { action: 'draw', type: 'graph', expression: '0.1*x*sin(x/20)', color: '#2563eb' },
    ],
  },
  force: {
    description: 'رسم مخططات القوى (Free Body Diagram)',
    params: {
      forces: { type: 'array', description: 'مصفوفة القوى (normal, weight, applied, friction, tension)' },
      mass: { type: 'string', description: 'كتلة الجسم' },
      title: { type: 'string', default: 'مخطط القوى' },
    },
    examples: [
      { action: 'draw', type: 'force', forces: [{ type: 'weight', y: -1 }, { type: 'normal', y: 1 }] },
    ],
  },
  wave: {
    description: 'رسم الموجات (جيبية، مربعة، مثلثة، نابض)',
    params: {
      type: { type: 'string', description: 'نوع الموجة (sine, cosine, square, triangle, sawtooth, pulse)' },
      amplitude: { type: 'number', default: 60 },
      wavelength: { type: 'number', default: 120 },
      color: { type: 'string', default: '#2563eb' },
    },
    examples: [
      { action: 'draw', type: 'wave', amplitude: 60, wavelength: 120 },
    ],
  },
  mechanical: {
    description: 'رسم العناصر الميكانيكية (تروس، أذرعة، بكرات، نوابض)',
    params: {
      parts: { type: 'array', description: 'مصفوفة الأجزاء (gear, lever, pulley, spring)' },
      title: { type: 'string', default: 'عناصر ميكانيكية' },
    },
    examples: [
      { action: 'draw', type: 'mechanical', parts: [{ type: 'gear', radius: 40, teeth: 12 }] },
    ],
  },
  field: {
    description: 'رسم المجالات الكهربائية والمغناطيسية',
    params: {
      charges: { type: 'array', description: 'مصفوفة الشحنات (sign: +1/-1)' },
      fieldType: { type: 'string', default: 'electric' },
      showEquipotential: { type: 'boolean', default: false },
    },
    examples: [
      { action: 'draw', type: 'field', charges: [{ sign: 1, x: 200 }, { sign: -1, x: 400 }] },
    ],
  },
  beam: {
    description: 'رسم الكمرات الهندسية مع المساند والأحمال',
    params: {
      beamLength: { type: 'number', default: 300 },
      supports: { type: 'array', description: 'مصفوفة المساند (pinned, roller, fixed)' },
      loads: { type: 'array', description: 'مصفوفة الأحمال (point, distributed, moment)' },
    },
    examples: [
      { action: 'draw', type: 'beam', beamLength: 300, supports: [{ position: 0, type: 'pinned' }, { position: 1, type: 'roller' }], loads: [{ position: 0.5, type: 'point', magnitude: 10 }] },
    ],
  },
};

export default registerBuiltinCommands;
