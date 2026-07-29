import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { arabicMathToLatex } from '../utils/mathUtils';

interface MathTextItem {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

interface MathCanvasOverlayProps {
  texts: MathTextItem[];
  scale: number;
  offset: { x: number; y: number };
  canvasWidth: number;
  canvasHeight: number;
  isDark?: boolean;
}

function renderLatexToHtml(latex: string): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      output: 'html',
      trust: false,
    });
  } catch {
    return `<span style="color:#f59e0b">${latex}</span>`;
  }
}

export default function MathCanvasOverlay({
  texts,
  scale,
  offset,
  canvasWidth,
  canvasHeight,
  isDark = false,
}: MathCanvasOverlayProps) {
  const renderedTexts = useMemo(() => {
    return texts.map(t => {
      const converted = arabicMathToLatex(t.text);
      const hasLatex = converted.includes('\\') || converted.includes('$');
      const html = hasLatex ? renderLatexToHtml(converted) : null;
      return { ...t, converted, hasLatex, html };
    });
  }, [texts]);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 10 }}
    >
      {renderedTexts.map(t => {
        // Convert canvas coords to screen coords
        const screenX = t.x * scale + offset.x;
        const screenY = (t.y - t.fontSize) * scale + offset.y;
        
        // Only render if visible
        if (screenX < -200 || screenX > canvasWidth + 200 || screenY < -100 || screenY > canvasHeight + 100) {
          return null;
        }

        if (t.hasLatex && t.html) {
          return (
            <div
              key={t.id}
              className="absolute"
              style={{
                left: screenX,
                top: screenY,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                color: t.color,
                fontSize: t.fontSize,
                whiteSpace: 'nowrap',
                direction: 'ltr',
                fontFamily: 'KaTeX_Main, Times New Roman, serif',
              }}
              dangerouslySetInnerHTML={{ __html: t.html }}
            />
          );
        }
        
        return null; // Plain text is handled by canvas
      })}
    </div>
  );
}
