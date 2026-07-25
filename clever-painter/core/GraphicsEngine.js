/**
 * Clever Painter — Graphics Engine Core
 * النواة الأساسية لمحرك الرسومات الذكي
 *
 * يدير لوحة الرسم Canvas، نظام الأوامر، والطبقات.
 * يستقبل أوامر JSON ويرسم على الفور.
 */

export class GraphicsEngine {
  /**
   * @param {HTMLCanvasElement} canvas - عنصر اللوحة
   * @param {Object} options        - خيارات التهيئة
   * @param {number}  options.width        - عرض اللوحة (px)
   * @param {number}  options.height       - ارتفاع اللوحة (px)
   * @param {string}  options.bgColor      - لون الخلفية (افتراضي: #ffffff)
   * @param {number}  options.devicePixelRatio - DPI للشاشات عالية الدقة
   */
  constructor(canvas, options = {}) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('GraphicsEngine requires a valid HTMLCanvasElement');
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Canvas 2D context not available');
    }

    this.options = {
      width: options.width || 800,
      height: options.height || 600,
      bgColor: options.bgColor || '#ffffff',
      devicePixelRatio: options.devicePixelRatio || (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1),
      ...options,
    };

    // Command registry: name → handler function
    this.commands = new Map();

    // Drawing layers array for z-ordering
    this.layers = [];

    // Internal state
    this._dirty = true;
    this._animationFrame = null;

    // Setup canvas dimensions
    this._setupCanvas();

    // Draw background
    this.clear();

    console.log('[CleverPainter] Engine initialized', {
      width: this.options.width,
      height: this.options.height,
      dpr: this.options.devicePixelRatio,
    });
  }

  /**
   * ضبط أبعاد اللوحة مع مراعاة DPI
   */
  _setupCanvas() {
    const { width, height, devicePixelRatio: dpr } = this.options;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);
  }

  /**
   * مسح اللوحة وتعبئتها بلون الخلفية
   */
  clear() {
    const { ctx } = this;
    const { width, height, bgColor } = this.options;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    this._dirty = true;
    return this;
  }

  /**
   * تسجيل أمر رسم جديد
   * @param {string} name - اسم الأمر (مثال: 'circuit', 'graph')
   * @param {Function} handler - (engine: GraphicsEngine, params: Object) => void
   */
  registerCommand(name, handler) {
    if (typeof name !== 'string' || typeof handler !== 'function') {
      throw new Error(`Invalid command registration: ${name}`);
    }
    this.commands.set(name, handler);
    return this;
  }

  /**
   * تنفيذ أمر رسم (استقبال JSON)
   * @param {Object} command - أمر الرسم { action, type, ...params }
   * @param {string} command.action - 'draw' | 'clear' | 'export'
   * @param {string} command.type - نوع الرسم (circuit, graph, force, wave, ...)
   */
  execute(command) {
    if (!command || typeof command !== 'object') {
      console.warn('[CleverPainter] Invalid command:', command);
      return this;
    }

    const { action, type, ...params } = command;

    if (action === 'clear') {
      this.clear();
      return this;
    }

    if (action === 'export') {
      return this.export();
    }

    if (action === 'draw' && type) {
      const handler = this.commands.get(type);
      if (handler) {
        this.ctx.save();
        try {
          handler(this, params);
        } catch (err) {
          console.error(`[CleverPainter] Error executing command '${type}':`, err);
        } finally {
          this.ctx.restore();
        }
      } else {
        console.warn(`[CleverPainter] Unknown command type: '${type}'. Available: ${[...this.commands.keys()].join(', ')}`);
      }
    }

    return this;
  }

  /**
   * تنفيذ مجموعة أوامر دفعة واحدة
   * @param {Object[]} commands - مصفوفة أوامر
   */
  executeBatch(commands) {
    if (Array.isArray(commands)) {
      commands.forEach((cmd) => this.execute(cmd));
    }
    return this;
  }

  /**
   * تصدير اللوحة كصورة Data URL
   * @param {string} format - 'image/png' | 'image/jpeg'
   * @param {number} quality - جودة الصورة (0-1)
   * @returns {string} Data URL
   */
  export(format = 'image/png', quality = 0.95) {
    return this.canvas.toDataURL(format, quality);
  }

  /**
   * الحصول على حجم اللوحة
   */
  getSize() {
    return { width: this.options.width, height: this.options.height };
  }

  /**
   * ضبط حجم اللوحة
   */
  setSize(width, height) {
    this.options.width = width;
    this.options.height = height;
    this._setupCanvas();
    this.clear();
    return this;
  }

  /**
   * بدء رسم متحرك (requestAnimationFrame loop)
   * @param {Function} renderFn - (engine: GraphicsEngine, deltaTime: number) => void
   */
  startAnimation(renderFn) {
    if (this._animationFrame) return;
    let lastTime = performance.now();

    const loop = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      this.clear();
      renderFn(this, delta);

      this._animationFrame = requestAnimationFrame(loop);
    };

    this._animationFrame = requestAnimationFrame(loop);
    return this;
  }

  /**
   * إيقاف الرسم المتحرك
   */
  stopAnimation() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
    return this;
  }

  /**
   * تحرير الموارد
   */
  dispose() {
    this.stopAnimation();
    this.commands.clear();
    this.layers = [];
    console.log('[CleverPainter] Engine disposed');
  }
}

export default GraphicsEngine;
