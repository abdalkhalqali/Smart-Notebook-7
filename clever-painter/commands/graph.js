/**
 * Clever Painter — Coordinate Graph Command
 * رسم المحاور الإحداثية والدوال الرياضية
 */

export function drawGraph(engine, params = {}) {
  const { ctx } = engine;
  const { width, height } = engine.getSize();

  const {
    expression = '0.1*x*sin(x/20)',
    title = 'رسم بياني',
    xRange = [-width / 2 + 50, width / 2 - 50],
    yRange = null,
    showGrid = true,
    showAxes = true,
    showLabels = true,
    color = '#2563eb',
    lineWidth = 2.5,
  } = params;

  const margin = { top: 50, right: 30, bottom: 50, left: 50 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const originX = margin.left;
  const originY = margin.top + plotH / 2;

  // Scale calculation
  const scaleX = plotW / (xRange[1] - xRange[0]);
  const autoYRange = yRange || [-plotH / 2 * 0.1, plotH / 2 * 0.1];
  const scaleY = plotH / (autoYRange[1] - autoYRange[0]);

  const toCanvasX = (x) => originX + (x - xRange[0]) * scaleX;
  const toCanvasY = (y) => originY - (y - autoYRange[0]) * scaleY;

  ctx.save();

  // ─── Title ───
  if (showLabels && title) {
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${14}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 25);
  }

  if (showAxes) {
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, originY);
    ctx.lineTo(width - margin.right, originY);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(originX, margin.top);
    ctx.lineTo(originX, height - margin.bottom);
    ctx.stroke();

    // Arrow heads
    ctx.fillStyle = '#475569';
    // X-axis arrow
    ctx.beginPath();
    ctx.moveTo(width - margin.right, originY);
    ctx.lineTo(width - margin.right - 10, originY - 5);
    ctx.lineTo(width - margin.right - 10, originY + 5);
    ctx.fill();

    // Y-axis arrow
    ctx.beginPath();
    ctx.moveTo(originX, margin.top);
    ctx.lineTo(originX - 5, margin.top + 10);
    ctx.lineTo(originX + 5, margin.top + 10);
    ctx.fill();

    // Labels
    if (showLabels) {
      ctx.fillStyle = '#64748b';
      ctx.font = `12px 'Tajawal', Arial, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText('x', width - margin.right - 16, originY - 10);
      ctx.textAlign = 'center';
      ctx.fillText('y', originX + 14, margin.top + 6);
    }
  }

  // ─── Grid ───
  if (showGrid) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;

    // Vertical grid lines
    const xtStep = Math.ceil(plotW / 10);
    for (let x = margin.left; x <= width - margin.right; x += xtStep) {
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
    }

    // Horizontal grid lines
    const ytStep = Math.ceil(plotH / 10);
    for (let y = margin.top; y <= height - margin.bottom; y += ytStep) {
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    }
  }

  // ─── Axis tick marks ───
  if (showLabels) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `10px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';

    const xTickStep = Math.ceil((xRange[1] - xRange[0]) / 8);
    for (let x = Math.ceil(xRange[0] / xTickStep) * xTickStep; x <= xRange[1]; x += xTickStep) {
      const cx = toCanvasX(x);
      ctx.beginPath();
      ctx.moveTo(cx, originY - 4);
      ctx.lineTo(cx, originY + 4);
      ctx.stroke();
      if (x !== 0) {
        ctx.fillText(x.toFixed(1), cx, originY + 18);
      }
    }

    ctx.textAlign = 'right';
    const yTickStep = Math.ceil((autoYRange[1] - autoYRange[0]) / 6);
    for (let y = Math.ceil(autoYRange[0] / yTickStep) * yTickStep; y <= autoYRange[1]; y += yTickStep) {
      const cy = toCanvasY(y);
      ctx.beginPath();
      ctx.moveTo(originX - 4, cy);
      ctx.lineTo(originX + 4, cy);
      ctx.stroke();
      if (y !== 0) {
        ctx.fillText(y.toFixed(1), originX - 8, cy + 3);
      }
    }

    // Origin label
    ctx.textAlign = 'right';
    ctx.fillText('O', originX - 8, originY + 16);
  }

  // ─── Plot the function ───
  try {
    const fn = new Function('x', `"use strict"; return (${expression})`);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    let started = false;
    const step = (xRange[1] - xRange[0]) / plotW;

    for (let px = 0; px <= plotW; px++) {
      const x = xRange[0] + (px / plotW) * (xRange[1] - xRange[0]);
      try {
        const y = fn(x);
        if (isFinite(y) && y >= autoYRange[0] && y <= autoYRange[1]) {
          const canvasX = margin.left + px;
          const canvasY = toCanvasY(y);
          if (!started) {
            ctx.moveTo(canvasX, canvasY);
            started = true;
          } else {
            ctx.lineTo(canvasX, canvasY);
          }
        } else {
          started = false;
        }
      } catch {
        started = false;
      }
    }
    ctx.stroke();

    // Function label
    if (showLabels) {
      ctx.fillStyle = color;
      ctx.font = `13px 'Tajawal', Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`f(x) = ${expression}`, margin.left + 10, margin.top + 20);
    }
  } catch (err) {
    ctx.fillStyle = '#ef4444';
    ctx.font = `14px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`⚠ خطأ في التعبير: ${err.message}`, width / 2, height / 2);
  }

  ctx.restore();
}

export default drawGraph;
