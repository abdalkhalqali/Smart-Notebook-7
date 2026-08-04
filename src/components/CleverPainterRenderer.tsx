import React, { useEffect, useRef } from 'react';

// ══════════════════════════════════════════════════════════════════
// CLEVER PAINTER RENDERER — محرك الرسومات العلمية/الهندسية
// يرسم مخططات (دائرة كهربائية، موجة، قوى، مجال، دالة، عناصر ميكانيكية، كمرة)
// على canvas مخفي خارج الشاشة ثم يصدّر PNG ويستدعي onResult.
//
// ⚠️ مهم: clever-painter يُحمَّل ديناميكياً (await import) فقط عند الحاجة —
// أي استيراد ثابت لهذه المكتبة (.js خارج src/) يكسر التطبيق بالكامل.
// ══════════════════════════════════════════════════════════════════

export interface CpCmd {
  action: string;
  type: string;
  [key: string]: any;
}

export default function CleverPainterRenderer({
  cmd,
  onResult,
  onError,
}: {
  cmd: CpCmd | null;
  onResult: (pngDataUrl: string) => void;
  onError?: (msg: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    if (!cmd || !canvasRef.current) return;
    let cancelled = false;
    const canvas = canvasRef.current;

    (async () => {
      try {
        // Dynamic import keeps the library out of the initial bundle.
        // Import ONLY the two modules we need (engine core + built-in commands)
        // instead of the barrel (index.js) — the barrel also pulls in
        // io/WebSocketClient.js & utils/math.js, so one failing module there
        // used to break the whole import chain and no diagram would render.
        const [cpCore, cpCmds] = await Promise.all([
          import('../../clever-painter/core/GraphicsEngine.js' as any),
          import('../../clever-painter/commands/builtin.js' as any),
        ]);
        if (cancelled) return;
        const Engine = cpCore.GraphicsEngine ?? cpCore.default?.GraphicsEngine;
        const register = cpCmds.registerBuiltinCommands ?? cpCmds.default?.registerBuiltinCommands;
        if (!Engine || !register) throw new Error('clever-painter: missing exports');

        const engine = new Engine(canvas, { width: 720, height: 460, bgColor: '#ffffff' });
        register(engine);

        // wave command uses "waveType" internally but the JSON may say "waveKind"
        const execCmd: any = { ...cmd };
        if (execCmd.type === 'wave' && execCmd.waveType === undefined) {
          execCmd.waveType = execCmd.waveKind || 'sine';
        }

        engine.execute(execCmd);
        if (!cancelled) {
          const png = engine.export('image/png', 0.95);
          onResultRef.current(png);
        }
      } catch (e: any) {
        // Diagnostic log — shows the full error in the browser console when a
        // diagram fails to render (helps distinguish import failures from draw errors)
        console.error('clever-painter: render failed', e);
        if (!cancelled) onErrorRef.current?.(e?.message || 'خطأ في رسم clever-painter');
      }
    })();

    return () => { cancelled = true; };
  }, [cmd]);

  // Off-screen canvas — never visible, only used for rendering + export
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: -9999,
        left: -9999,
        opacity: 0,
        pointerEvents: 'none',
        width: 720,
        height: 460,
      }}
    />
  );
}
