/**
 * Clever Painter — WebSocket Client
 * عميل WebSocket للربط اللحظي بين المحرك والدفتر الذكي
 *
 * يتصل بمخدم WebSocket الخاص بـ Smart-Notebook-7
 * ويستقبل أوامر الرسم JSON لتنفيذها مباشرة على المحرك.
 */

export class WebSocketClient {
  /**
   * @param {import('../core/GraphicsEngine.js').GraphicsEngine} engine - محرك الرسومات
   * @param {Object} options - خيارات الاتصال
   * @param {string} options.url - رابط WebSocket (افتراضي: ws://localhost:5000/ws/clever-painter)
   * @param {boolean} options.autoReconnect - إعادة الاتصال تلقائياً (افتراضي: true)
   * @param {number} options.reconnectDelay - تأخير إعادة الاتصال بالمللي ثانية (افتراضي: 2000)
   */
  constructor(engine, options = {}) {
    if (!engine) {
      throw new Error('WebSocketClient requires a GraphicsEngine instance');
    }

    this.engine = engine;
    this.options = {
      url: options.url || 'ws://localhost:5000/ws/clever-painter',
      autoReconnect: options.autoReconnect !== false,
      reconnectDelay: options.reconnectDelay || 2000,
      ...options,
    };

    this.ws = null;
    this.isConnected = false;
    this.reconnectTimer = null;
    this.messageHandlers = new Map();
    this._shouldReconnect = false;

    // Register default message handler
    this.on('draw_command', (data) => {
      this.engine.execute(data);
    });

    // Handle batch commands
    this.on('batch', (data) => {
      if (Array.isArray(data.commands)) {
        this.engine.executeBatch(data.commands);
      }
    });

    // Handle clear
    this.on('clear', () => {
      this.engine.clear();
    });

    // Handle ping/pong for keepalive
    this.on('ping', () => {
      this.send({ type: 'pong', timestamp: Date.now() });
    });

    console.log('[CleverPainter-WS] Client initialized');
  }

  /**
   * فتح الاتصال بمخدم WebSocket
   */
  connect(url) {
    if (this.ws) {
      this.disconnect();
    }

    const wsUrl = url || this.options.url;
    this._shouldReconnect = this.options.autoReconnect;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error('[CleverPainter-WS] Connection failed:', err.message);
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.isConnected = true;
      console.log('[CleverPainter-WS] Connected to:', wsUrl);
      this._emit('connected', { url: wsUrl });

      // Send handshake
      this.send({
        type: 'handshake',
        client: 'clever-painter',
        version: '1.0.0',
        timestamp: Date.now(),
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._handleMessage(data);
      } catch (err) {
        console.warn('[CleverPainter-WS] Invalid message:', event.data);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[CleverPainter-WS] Error:', err);
      this._emit('error', err);
    };

    this.ws.onclose = (event) => {
      this.isConnected = false;
      console.log('[CleverPainter-WS] Disconnected (code:', event.code, ')');
      this._emit('disconnected', { code: event.code });

      if (this._shouldReconnect) {
        this._scheduleReconnect();
      }
    };
  }

  /**
   * قطع الاتصال
   */
  disconnect() {
    this._shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    console.log('[CleverPainter-WS] Disconnected');
  }

  /**
   * إرسال رسالة JSON إلى المخدم
   */
  send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[CleverPainter-WS] Cannot send — not connected');
      return false;
    }
    try {
      this.ws.send(JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('[CleverPainter-WS] Send failed:', err);
      return false;
    }
  }

  /**
   * إرسال أمر رسم إلى المخدم لبثه للعملاء الآخرين
   */
  sendDrawCommand(command) {
    return this.send({ type: 'draw_command', ...command });
  }

  /**
   * تسجيل مستمع لرسالة معينة
   * @param {string} type - نوع الرسالة
   * @param {Function} handler - (data: Object) => void
   */
  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
    return this;
  }

  /**
   * إزالة مستمع
   */
  off(type, handler) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      this.messageHandlers.set(
        type,
        handler ? handlers.filter((h) => h !== handler) : []
      );
    }
    return this;
  }

  /**
   * معالجة الرسالة الواردة
   */
  _handleMessage(data) {
    const type = data.type || data.action;

    // Direct execution on engine
    if (data.action === 'draw' && data.type && this.engine.commands.has(data.type)) {
      this.engine.execute(data);
    }

    // Trigger registered handlers
    if (type) {
      this._emit(type, data);
    }

    // Generic catch-all
    this._emit('message', data);
  }

  /**
   * إرسال حدث للمستمعين
   */
  _emit(event, data) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error('[CleverPainter-WS] Handler error:', err);
        }
      });
    }
  }

  /**
   * جدولة إعادة الاتصال
   */
  _scheduleReconnect() {
    if (this.reconnectTimer || !this._shouldReconnect) return;
    console.log(`[CleverPainter-WS] Reconnecting in ${this.options.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.options.reconnectDelay);
  }

  /**
   * حالة الاتصال
   */
  get connected() {
    return this.isConnected;
  }
}

export default WebSocketClient;
