/**
 * Clever Painter — Smart Graphics Engine
 * محرك الرسومات الذكي للرسم العلمي والهندسي
 *
 * @version 1.0.0
 *
 * الاستخدام:
 * ```js
 * import { GraphicsEngine, registerBuiltinCommands, WebSocketClient } from './clever-painter/index.js';
 *
 * const engine = new GraphicsEngine(canvas, { width: 800, height: 600 });
 * registerBuiltinCommands(engine);
 *
 * // رسم دائرة كهربائية
 * engine.execute({
 *   action: 'draw',
 *   type: 'circuit',
 *   components: [
 *     { type: 'battery', voltage: 12 },
 *     { type: 'resistor', value: '10Ω' },
 *   ],
 * });
 * ```
 */

// ─── Core ───
export { GraphicsEngine } from './core/GraphicsEngine.js';

// ─── Commands ───
export { registerBuiltinCommands, COMMAND_CATALOG } from './commands/builtin.js';
export { default as drawCircuit } from './commands/circuit.js';
export { default as drawGraph } from './commands/graph.js';
export { default as drawForce } from './commands/force.js';
export { default as drawWave } from './commands/wave.js';
export { default as drawMechanical } from './commands/mechanical.js';
export { default as drawField } from './commands/field.js';
export { default as drawBeam } from './commands/beam.js';

// ─── IO ───
export { WebSocketClient } from './io/WebSocketClient.js';

// ─── Utils ───
export { default as mathUtils } from './utils/math.js';

// ─── Version ───
export const VERSION = '1.0.0';
export const ENGINE_NAME = 'Clever Painter';

/**
 * إنشاء محرك رسومات مُهيَّأ بالكامل مع جميع الأوامر المسجلة
 *
 * @param {HTMLCanvasElement} canvas - عنصر اللوحة
 * @param {Object} [options] - خيارات المحرك
 * @param {number} [options.width=800] - عرض اللوحة
 * @param {number} [options.height=600] - ارتفاع اللوحة
 * @param {string} [options.bgColor='#ffffff'] - لون الخلفية
 * @returns {GraphicsEngine} المحرك المُهيَّأ
 *
 * @example
 * const engine = createEngine(myCanvas, { width: 1024, height: 768 });
 * engine.execute({ action: 'draw', type: 'wave', amplitude: 80, wavelength: 150 });
 */
export function createEngine(canvas, options = {}) {
  const { GraphicsEngine: Engine } = require ? { GraphicsEngine } : { GraphicsEngine };
  const engine = new Engine(canvas, options);
  registerBuiltinCommands(engine);
  return engine;
}

export default {
  GraphicsEngine,
  registerBuiltinCommands,
  COMMAND_CATALOG,
  WebSocketClient,
  drawCircuit,
  drawGraph,
  drawForce,
  drawWave,
  drawMechanical,
  drawField,
  drawBeam,
  mathUtils,
  VERSION,
  ENGINE_NAME,
  createEngine,
};
