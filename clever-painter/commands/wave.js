/**
 * Clever Painter — Wave Command
 * رسم الموجات: جيبية، مربعة، مثلثة، نابض
 */

export function drawWave(engine, params = {}) {
  const { ctx } = engine;
  const { width, height } = engine.getSize();
  const cx = width / 2;
  const cy = height / 2;

  const {
    waveType,
    waveKind,
    type,
    amplitude = 60,
    wavelength = 120,
    frequency = 1,
    phase = 0,
    title = 'تمثيل الموجة',
    color = '#2563eb',
    showAxes = true,
    showLabels = true,
    fill = false,
    fillColor = 'rgba(37, 99, 235, 0.1)',
    waveCount = 3,
    speed = 0,
    time = 0,
  } = params;

  // ⚠️ مهم: GraphicsEngine.execute() تقتطع حقل "type" من الأمر قبل تمرير params،
  // لذا لا يمكن الاعتماد على "type" هنا — نقرأ waveType/waveKind أولاً (كما يرسلها الخادم).
  const waveShape = waveType || waveKind || type || 'sine';

  const margin = { top: 40, left: 50, right: 30, bottom: 50 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  ctx.save();

  // ─── Title ───
  if (showLabels && title) {
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold 14px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(title, cx, 22);
  }

  // ─── Axes ───
  if (showAxes) {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    // Horizontal axis (equilibrium)
    const axisY = cy;
    ctx.beginPath();
    ctx.moveTo(margin.left, axisY);
    ctx.lineTo(width - margin.right, axisY);
    ctx.stroke();

    // Vertical axis at center
    ctx.beginPath();
    ctx.moveTo(cx, margin.top);
    ctx.lineTo(cx, height - margin.bottom);
    ctx.stroke();

    if (showLabels) {
      ctx.fillStyle = '#64748b';
      ctx.font = `11px 'Tajawal', Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('t (s)', width - margin.right - 5, axisY - 10);
      ctx.textAlign = 'center';
      ctx.fillText('A', cx + 16, margin.top + 6);
    }
  }

  // ─── Wave type ───
  const totalPeriods = waveCount;
  const totalWidth = totalPeriods * wavelength;
  const startX = cx - totalWidth / 2;
  const endX = cx + totalWidth / 2;

  const waveFunctions = {
    sine: (x, t) => amplitude * Math.sin(2 * Math.PI * x / wavelength + phase + (speed / 100) * t),
    cosine: (x, t) => amplitude * Math.cos(2 * Math.PI * x / wavelength + phase + (speed / 100) * t),
    square: (x, t) => {
      const val = Math.sin(2 * Math.PI * x / wavelength + phase + (speed / 100) * t);
      return amplitude * (val >= 0 ? 1 : -1);
    },
    triangle: (x, t) => {
      const p = (x / wavelength + phase / (2 * Math.PI) + (speed / 100) * t / (2 * Math.PI)) % 1;
      return amplitude * (2 * Math.abs(2 * (p < 0 ? p + 1 : p) - 1) - 1);
    },
    sawtooth: (x, t) => {
      const p = (x / wavelength + phase / (2 * Math.PI) + (speed / 100) * t / (2 * Math.PI)) % 1;
      return amplitude * (2 * (p < 0 ? p + 1 : p) - 1);
    },
    pulse: (x, t) => {
      const dist = Math.abs(x - cx + (speed / 100) * t * wavelength);
      const pulseWidth = wavelength / 4;
      return dist < pulseWidth ? amplitude * Math.cos(Math.PI * dist / (2 * pulseWidth)) : 0;
    },
  };

  const waveFn = waveFunctions[waveShape] || waveFunctions.sine;

  // ─── Draw the wave ───
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (fill) {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(startX, cy);
  }

  ctx.beginPath();
  let started = false;

  for (let px = 0; px <= totalWidth; px++) {
    const x = startX + px;
    const y = cy - waveFn(x - cx, performance.now ? performance.now() : time);

    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();

  // ─── Fill under the wave ───
  if (fill) {
    ctx.lineTo(endX, cy);
    ctx.closePath();
    ctx.fill();
  }

  // ─── Annotations ───
  if (showLabels) {
    const labelSize = Math.max(10, Math.min(14, width / 55));

    // Amplitude label
    ctx.strokeStyle = color + '66';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const ampX = startX + wavelength * 0.3;
    const ampY = cy - amplitude;
    ctx.beginPath();
    ctx.moveTo(ampX, cy);
    ctx.lineTo(ampX, ampY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.font = `italic ${labelSize}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('A', ampX + 8, ampY + 4);

    // Wavelength label
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    const wlY = cy + 30;
    ctx.beginPath();
    ctx.moveTo(startX, wlY);
    ctx.lineTo(startX + wavelength, wlY);
    ctx.stroke();

    // End caps
    ctx.beginPath();
    ctx.moveTo(startX, wlY - 5);
    ctx.lineTo(startX, wlY + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(startX + wavelength, wlY - 5);
    ctx.lineTo(startX + wavelength, wlY + 5);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = `italic ${labelSize}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('λ', startX + wavelength / 2, wlY + labelSize + 4);
  }

  // ─── Wave type badge ───
  if (showLabels) {
    ctx.fillStyle = color + '15';
    ctx.strokeStyle = color + '40';
    ctx.lineWidth = 1;
    const badgeW = 80;
    const badgeH = 24;
    const badgeX = width - margin.right - badgeW - 8;
    const badgeY = margin.top + 4;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `bold 11px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(waveShape.charAt(0).toUpperCase() + waveShape.slice(1), badgeX + badgeW / 2, badgeY + 16);
  }

  ctx.restore();
}

export default drawWave;
