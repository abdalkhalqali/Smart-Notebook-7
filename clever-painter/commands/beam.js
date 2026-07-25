/**
 * Clever Painter — Engineering Beam Command
 * رسم الكمرات الهندسية: مساند، أحمال، عزوم
 */

export function drawBeam(engine, params = {}) {
  const { ctx } = engine;
  const { width, height } = engine.getSize();
  const cx = width / 2;
  const cy = height / 2;

  const {
    beamLength = 300,
    supports = [],
    loads = [],
    title = 'كمرة هندسية',
    showLabels = true,
    showDimensions = true,
  } = params;

  const margin = { top: 60, left: 60, right: 60, bottom: 80 };
  const beamY = cy;
  const beamStartX = cx - beamLength / 2;
  const beamEndX = cx + beamLength / 2;
  const scale = Math.min(1, beamLength / 400);
  const fontSize = Math.max(11, Math.min(15, width / 55));

  ctx.save();

  // ─── Title ───
  if (showLabels && title) {
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${fontSize + 2}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(title, cx, 25);
  }

  // ─── Beam (the main structural element) ───
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(beamStartX, beamY - 6, beamLength, 12);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.strokeRect(beamStartX, beamY - 6, beamLength, 12);

  // Beam ends
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(beamStartX, beamY - 8);
  ctx.lineTo(beamStartX, beamY + 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(beamEndX, beamY - 8);
  ctx.lineTo(beamEndX, beamY + 8);
  ctx.stroke();

  // ─── Dimension line ───
  if (showDimensions) {
    const dimY = beamY + 35;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(beamStartX, dimY);
    ctx.lineTo(beamEndX, dimY);
    ctx.stroke();

    // End caps
    ctx.beginPath();
    ctx.moveTo(beamStartX, dimY - 5);
    ctx.lineTo(beamStartX, dimY + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(beamEndX, dimY - 5);
    ctx.lineTo(beamEndX, dimY + 5);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = `${fontSize - 3}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`L = ${beamLength / 10} m`, cx, dimY + fontSize);
  }

  // ─── Supports ───
  supports.forEach((support) => {
    const sx = beamStartX + support.position * beamLength;
    const type = support.type || 'pinned';

    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;

    if (type === 'pinned') {
      // Pinned support: triangle
      ctx.beginPath();
      ctx.moveTo(sx, beamY + 6);
      ctx.lineTo(sx - 10 * scale, beamY + 25 * scale);
      ctx.lineTo(sx + 10 * scale, beamY + 25 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pin circle
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, beamY + 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (type === 'roller') {
      // Roller support: triangle on rollers
      ctx.beginPath();
      ctx.moveTo(sx, beamY + 6);
      ctx.lineTo(sx - 10 * scale, beamY + 18 * scale);
      ctx.lineTo(sx + 10 * scale, beamY + 18 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Roller circles
      ctx.fillStyle = '#fff';
      for (let r = -1; r <= 1; r += 2) {
        ctx.beginPath();
        ctx.arc(sx + r * 6 * scale, beamY + 24 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (type === 'fixed') {
      // Fixed support: hatched
      ctx.fillRect(sx - 8 * scale, beamY + 6, 16 * scale, 20 * scale);
      // Hatching
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.5;
      for (let h = 0; h < 16 * scale; h += 4) {
        ctx.beginPath();
        ctx.moveTo(sx - 8 * scale + h, beamY + 6);
        ctx.lineTo(sx - 8 * scale + h + 4, beamY + 26 * scale);
        ctx.stroke();
      }
    }

    // Support label
    if (showLabels && support.label) {
      ctx.fillStyle = '#475569';
      ctx.font = `${fontSize - 3}px 'Tajawal', Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(support.label, sx, beamY + 40 * scale + fontSize);
    }
  });

  // ─── Loads ───
  loads.forEach((load) => {
    const loadPos = load.position * beamLength;
    const lx = beamStartX + loadPos;
    const magnitude = load.magnitude || 10;
    const arrowLen = Math.min(40, Math.max(20, magnitude * 3));

    switch (load.type) {
      case 'point': {
        const dir = load.direction || -1; // -1 = down, 1 = up
        const endY = beamY - 6 + dir * arrowLen;

        // Load line
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, beamY - 6);
        ctx.lineTo(lx, endY);
        ctx.stroke();

        // Arrowhead
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        const arrowDir = dir > 0 ? 1 : -1;
        ctx.moveTo(lx, endY);
        ctx.lineTo(lx - 6, endY - arrowDir * 10);
        ctx.lineTo(lx + 6, endY - arrowDir * 10);
        ctx.closePath();
        ctx.fill();

        // Label
        if (showLabels && load.label) {
          ctx.fillStyle = '#ef4444';
          ctx.font = `bold ${fontSize - 1}px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(load.label, lx, endY + (dir > 0 ? -12 : fontSize + 8));
        }
        break;
      }

      case 'distributed': {
        const distEnd = load.endPosition || load.position + 0.3;
        const dStart = Math.min(loadPos, beamStartX + distEnd * beamLength);
        const dEnd = Math.max(loadPos, beamStartX + distEnd * beamLength);
        const maxHeight = Math.min(50, magnitude * 2);

        // Distributed load shape (trapezoid)
        ctx.fillStyle = '#fecaca80';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dStart, beamY - 6);
        ctx.lineTo(dStart, beamY - 6 - maxHeight);
        ctx.lineTo(dEnd, beamY - 6 - maxHeight * 0.6);
        ctx.lineTo(dEnd, beamY - 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Vertical tick marks
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 0.5;
        const steps = 8;
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const tx = dStart + (dEnd - dStart) * t;
          const th = beamY - 6 - maxHeight * (1 - t * 0.4);
          ctx.beginPath();
          ctx.moveTo(tx, beamY - 6);
          ctx.lineTo(tx, th);
          ctx.stroke();
        }

        if (showLabels && load.label) {
          ctx.fillStyle = '#ef4444';
          ctx.font = `${fontSize - 2}px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          const midX = (dStart + dEnd) / 2;
          ctx.fillText(load.label, midX, beamY - 6 - maxHeight - 6);
        }
        break;
      }

      case 'moment': {
        const momentDir = load.direction || 1;
        const radius = 20 * scale;

        // Arc
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (momentDir > 0) {
          ctx.arc(lx, beamY - 6, radius, Math.PI * 1.5, Math.PI * 0.5);
        } else {
          ctx.arc(lx, beamY - 6, radius, Math.PI * 0.5, Math.PI * 1.5);
        }
        ctx.stroke();

        // Arrow at end
        const endAngle = momentDir > 0 ? Math.PI * 0.5 : Math.PI * 1.5;
        const ax = lx + radius * Math.cos(endAngle);
        const ay = beamY - 6 + radius * Math.sin(endAngle);
        const aDir = momentDir > 0 ? 1 : -1;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - aDir * 5, ay - 5);
        ctx.lineTo(ax + aDir * 5, ay - 5);
        ctx.closePath();
        ctx.fill();

        if (showLabels && load.label) {
          ctx.fillStyle = '#f59e0b';
          ctx.font = `bold ${fontSize - 1}px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(load.label, lx, beamY - 6 - radius - 6);
        }
        break;
      }
    }
  });

  // ─── Legend ───
  if (showLabels) {
    const legendY = height - 25;
    ctx.font = `${fontSize - 4}px 'Tajawal', Arial, sans-serif`;

    // Supports count
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText(`المساند: ${supports.length} | الأحمال: ${loads.length}`, 15, legendY);

    // Beam info
    ctx.textAlign = 'right';
    ctx.fillText(`L = ${(beamLength / 10).toFixed(1)} m`, width - 15, legendY);
  }

  ctx.restore();
}

export default drawBeam;
