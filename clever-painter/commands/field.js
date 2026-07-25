/**
 * Clever Painter — Electric/Magnetic Field Command
 * رسم المجالات الكهربائية والمغناطيسية
 */

export function drawField(engine, params = {}) {
  const { ctx } = engine;
  const { width, height } = engine.getSize();
  const cx = width / 2;
  const cy = height / 2;

  const {
    charges = [],
    fieldType = 'electric',
    title = 'المجال الكهربائي',
    showLabels = true,
    lineCount = 12,
    showEquipotential = false,
    magnetPoles = null,
    resolution = 30,
  } = params;

  const fontSize = Math.max(12, Math.min(16, width / 50));
  const chargeRadius = Math.min(18, width / 40);
  const colors = {
    positive: '#ef4444',
    negative: '#3b82f6',
    fieldLine: '#8b5cf650',
    equipotential: '#10b98140',
    magnetic: '#8b5cf6',
  };

  ctx.save();

  // ─── Title ───
  if (showLabels && title) {
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${fontSize + 2}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(title, cx, 25);
  }

  // ─── Magnetic Field (Bar Magnet) ───
  if (fieldType === 'magnetic' && magnetPoles) {
    const poleW = 60;
    const poleH = 100;
    const gap = 30;
    const northX = cx - gap / 2 - poleW / 2;
    const southX = cx + gap / 2 + poleW / 2;

    // North pole
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(northX - poleW / 2, cy - poleH / 2, poleW, poleH, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${fontSize}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('N', northX, cy + 4);

    // South pole
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(southX - poleW / 2, cy - poleH / 2, poleW, poleH, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('S', southX, cy + 4);

    // Field lines
    ctx.strokeStyle = colors.magnetic;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.fillStyle = '#8b5cf660';

    const lineCountMag = 7;
    for (let i = 0; i < lineCountMag; i++) {
      const t = (i / (lineCountMag - 1)) * 2 - 1; // -1 to 1
      const startY = cy + t * poleH * 0.35;
      const endY = cy + t * poleH * 0.35;

      ctx.beginPath();
      ctx.moveTo(northX + poleW / 2, startY);
      const cpX = (northX + poleW / 2 + southX - poleW / 2) / 2;
      const cpY = startY + (i % 2 === 0 ? -1 : 1) * (60 + Math.abs(t) * 30);
      ctx.quadraticCurveTo(cpX, cpY, southX - poleW / 2, endY);
      ctx.stroke();

      // Arrow on line
      if (i % 2 === 0) {
        const midT = 0.5;
        const midX = (1 - midT) * (1 - midT) * (northX + poleW / 2) + 2 * (1 - midT) * midT * cpX + midT * midT * (southX - poleW / 2);
        const midY = (1 - midT) * (1 - midT) * startY + 2 * (1 - midT) * midT * cpY + midT * midT * endY;
        ctx.beginPath();
        ctx.arc(midX, midY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
    return;
  }

  // ─── Electric Field ───
  if (charges.length === 0) {
    // Single point charge simulation
    const q = 1;
    drawSingleCharge(ctx, cx, cy, q, chargeRadius, resolution, width, height, colors);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy, chargeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${fontSize}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('+', cx, cy + 5);
  } else {
    // Multiple charges
    charges.forEach((charge, idx) => {
      const qx = charge.x || (cx + (idx - (charges.length - 1) / 2) * 120);
      const qy = charge.y || cy;
      const qSign = charge.sign || 1; // +1 or -1
      const qMag = charge.magnitude || 1;

      // Draw field lines between charges
      if (charges.length >= 2) {
        ctx.strokeStyle = colors.fieldLine;
        ctx.lineWidth = 1.5;

        const otherCharges = charges.filter((_, i) => i !== idx);
        otherCharges.forEach((other) => {
          const ox = other.x || (charges.indexOf(other) - (charges.length - 1) / 2) * 120 + cx;
          const oy = other.y || cy;

          for (let k = 0; k < lineCount; k++) {
            const t = k / (lineCount - 1);
            const startAngle = t * Math.PI * 2;
            const r = chargeRadius + 10;
            const sx = qx + r * Math.cos(startAngle);
            const sy = qy + r * Math.sin(startAngle);

            ctx.beginPath();
            ctx.moveTo(sx, sy);

            const dx = ox - qx;
            const dy = oy - qy;
            const midX = (qx + ox) / 2 + (Math.random() - 0.5) * 30;
            const midY = (qy + oy) / 2 + (Math.random() - 0.5) * 30;
            ctx.quadraticCurveTo(midX, midY, ox, oy);
            ctx.stroke();
          }
        });
      }

      // Draw charge
      ctx.fillStyle = qSign > 0 ? colors.positive : colors.negative;
      ctx.beginPath();
      ctx.arc(qx, qy, chargeRadius * Math.min(2, Math.max(0.5, qMag)), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${fontSize}px 'Tajawal', Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(qSign > 0 ? '+' : '−', qx, qy + 5);

      // Label
      if (showLabels && charge.label) {
        ctx.fillStyle = '#1e293b';
        ctx.font = `${fontSize - 3}px 'Tajawal', Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(charge.label, qx, qy + chargeRadius * Math.min(2, Math.max(0.5, qMag)) + fontSize + 2);
      }
    });
  }

  // ─── Equipotential lines ───
  if (showEquipotential && charges.length <= 2) {
    ctx.strokeStyle = colors.equipotential;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    for (let r = 40; r < Math.min(width, height) / 2; r += 30) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // ─── Legend ───
  if (showLabels && charges.length > 0) {
    const legX = 15;
    const legY = height - 55;
    ctx.fillStyle = colors.positive;
    ctx.beginPath();
    ctx.arc(legX + 10, legY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = `${fontSize - 4}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('شحنة موجبة', legX + 22, legY + 4);

    ctx.fillStyle = colors.negative;
    ctx.beginPath();
    ctx.arc(legX + 10, legY + 22, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.fillText('شحنة سالبة', legX + 22, legY + 26);
  }

  ctx.restore();
}

function drawSingleCharge(ctx, cx, cy, q, chargeRadius, resolution, width, height, colors) {
  ctx.strokeStyle = colors.fieldLine;
  ctx.lineWidth = 1;

  const steps = 30;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const startX = cx + chargeRadius * Math.cos(angle);
    const startY = cy + chargeRadius * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(startX, startY);

    let x = startX;
    let y = startY;
    const maxDist = Math.min(width, height) * 0.4;
    const stepSize = 8;

    for (let s = 0; s < 60; s++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < chargeRadius + 5 || dist > maxDist) break;

      const fx = q * dx / (dist * dist);
      const fy = q * dy / (dist * dist);
      const fMag = Math.hypot(fx, fy);

      x += (fx / fMag) * stepSize;
      y += (fy / fMag) * stepSize;

      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export default drawField;
