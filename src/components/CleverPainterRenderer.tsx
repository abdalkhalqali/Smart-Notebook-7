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
        // Dynamic import keeps the library out of the initial bundle
        const cpMod = await import('../../clever-painter/index.js' as any);
        if (cancelled) return;
        const Engine = cpMod.GraphicsEngine ?? cpMod.default?.GraphicsEngine;
        const register = cpMod.registerBuiltinCommands ?? cpMod.default?.registerBuiltinCommands;
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
