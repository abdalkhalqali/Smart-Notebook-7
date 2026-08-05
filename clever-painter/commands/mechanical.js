/**
 * Clever Painter — Mechanical Engineering Command
 * رسم العناصر الميكانيكية: تروس، أذرعة، بكرات
 */

export function drawMechanical(engine, params = {}) {
  const { ctx } = engine;
  const { width, height } = engine.getSize();
  const cx = width / 2;
  const cy = height / 2;

  const {
    parts = [],
    title = 'عناصر ميكانيكية',
    showLabels = true,
  } = params;

  const fontSize = Math.max(12, Math.min(16, width / 50));

  ctx.save();

  // ─── Title ───
  if (showLabels && title) {
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${fontSize + 2}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(title, cx, 25);
  }

  // ─── Auto-layout ───
  const getPosition = (part, index) => {
    if (part.x !== undefined) return { x: part.x, y: part.y || cy };
    const spacing = Math.min(180, (width - 100) / Math.max(parts.length, 1));
    const startX = (width - spacing * (parts.length - 1)) / 2;
    return { x: startX + index * spacing, y: cy };
  };

  parts.forEach((part, idx) => {
    const pos = getPosition(part, idx);
    const scale = Math.max(0.6, Math.min(1.8, width / 600));

    switch (part.type) {
      case 'gear': {
        const radius = (part.radius || 40) * scale;
        const teeth = part.teeth || 12;
        const toothDepth = 8 * scale;
        const boreRadius = 8 * scale;

        ctx.strokeStyle = part.color || '#475569';
        ctx.lineWidth = 2;
        ctx.fillStyle = part.fill || '#f1f5f9';

        // Draw teeth
        ctx.beginPath();
        const angleStep = (2 * Math.PI) / teeth;
        for (let i = 0; i < teeth; i++) {
          const a1 = angleStep * i - 0.15;
          const a2 = angleStep * i + 0.15;
          const a3 = angleStep * i + angleStep / 2 - 0.15;
          const a4 = angleStep * i + angleStep / 2 + 0.15;

          const r1 = radius;
          const r2 = radius + toothDepth;

          ctx.lineTo(pos.x + r1 * Math.cos(a1), pos.y + r1 * Math.sin(a1));
          ctx.lineTo(pos.x + r2 * Math.cos(a2), pos.y + r2 * Math.sin(a2));
          ctx.lineTo(pos.x + r2 * Math.cos(a3), pos.y + r2 * Math.sin(a3));
          ctx.lineTo(pos.x + r1 * Math.cos(a4), pos.y + r1 * Math.sin(a4));
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius - 6 * scale, 0, Math.PI * 2);
        ctx.stroke();

        // Center bore
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, boreRadius, 0, Math.PI * 2);
        ctx.fill();

        // Spokes
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI / 4) + (Math.PI / 2) * i;
          ctx.beginPath();
          ctx.moveTo(pos.x + boreRadius * 2 * Math.cos(a), pos.y + boreRadius * 2 * Math.sin(a));
          ctx.lineTo(pos.x + (radius - 6 * scale) * Math.cos(a), pos.y + (radius - 6 * scale) * Math.sin(a));
          ctx.stroke();
        }

        if (showLabels && part.label) {
          ctx.fillStyle = '#1e293b';
          ctx.font = `${fontSize - 2}px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(part.label, pos.x, pos.y + radius + toothDepth + fontSize + 4);
        }
        break;
      }

      case 'lever': {
        const leverLen = (part.length || 150) * scale;
        const fulcrumY = pos.y + (part.fulcrumOffset || 0);
        const angleRad = ((part.angle || 0) * Math.PI) / 180;
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);

        // Fulcrum (triangle)
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(pos.x - 10 * scale, fulcrumY + 12 * scale);
        ctx.lineTo(pos.x + 10 * scale, fulcrumY + 12 * scale);
        ctx.lineTo(pos.x, fulcrumY);
        ctx.closePath();
        ctx.fill();

        // Lever arm
        ctx.strokeStyle = part.color || '#8b5cf6';
        ctx.lineWidth = 4 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pos.x - (leverLen / 2) * cosA, fulcrumY - (leverLen / 2) * sinA);
        ctx.lineTo(pos.x + (leverLen / 2) * cosA, fulcrumY + (leverLen / 2) * sinA);
        ctx.stroke();

        // End caps
        ctx.fillStyle = part.color || '#8b5cf6';
        const endSize = 6 * scale;
        ctx.beginPath();
        ctx.arc(pos.x - (leverLen / 2) * cosA, fulcrumY - (leverLen / 2) * sinA, endSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pos.x + (leverLen / 2) * cosA, fulcrumY + (leverLen / 2) * sinA, endSize, 0, Math.PI * 2);
        ctx.fill();

        // Load/Effort labels
        if (showLabels) {
          ctx.fillStyle = '#ef4444';
          ctx.font = `bold ${fontSize}px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('F₁', pos.x - (leverLen / 2) * cosA, fulcrumY - (leverLen / 2) * sinA - 12);
          ctx.fillStyle = '#3b82f6';
          ctx.fillText('F₂', pos.x + (leverLen / 2) * cosA, fulcrumY + (leverLen / 2) * sinA - 12);
        }
        break;
      }

      case 'pulley': {
        const pulleyRadius = (part.radius || 30) * scale;
        const ropeLen = (part.ropeLength || 100) * scale;
        const ropeDir = part.direction === 'horizontal' ? 'horizontal' : 'vertical';

        // Pulley wheel
        ctx.fillStyle = part.fill || '#e2e8f0';
        ctx.strokeStyle = part.color || '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulleyRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner groove
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulleyRadius * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        // Axle
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Rope
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        if (ropeDir === 'vertical') {
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - pulleyRadius);
          ctx.lineTo(pos.x, pos.y - pulleyRadius - ropeLen);
          ctx.stroke();
          // Load
          ctx.setLineDash([]);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(pos.x - 12, pos.y - pulleyRadius - ropeLen - 5, 24, 20);
          ctx.fillStyle = '#fff';
          ctx.font = `10px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('m', pos.x, pos.y - pulleyRadius - ropeLen + 9);
        } else {
          ctx.beginPath();
          ctx.moveTo(pos.x - pulleyRadius, pos.y);
          ctx.lineTo(pos.x - pulleyRadius - ropeLen, pos.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(pos.x - pulleyRadius - ropeLen - 12, pos.y - 10, 24, 20);
          ctx.fillStyle = '#fff';
          ctx.font = `10px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('m', pos.x - pulleyRadius - ropeLen, pos.y + 4);
        }
        ctx.setLineDash([]);

        if (showLabels && part.label) {
          ctx.fillStyle = '#1e293b';
          ctx.font = `${fontSize - 2}px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(part.label, pos.x, pos.y + pulleyRadius + fontSize + 4);
        }
        break;
      }

      case 'spring': {
        const springLen = (part.length || 120) * scale;
        const coils = part.coils || 8;
        const coilAmp = 12 * scale;
        const startY = pos.y - springLen / 2;
        const endY = pos.y + springLen / 2;

        // End lines
        ctx.strokeStyle = part.color || '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pos.x, startY);
        ctx.lineTo(pos.x, startY + 8 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x, endY);
        ctx.lineTo(pos.x, endY - 8 * scale);
        ctx.stroke();

        // Coils
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(pos.x, startY + 8 * scale);
        const coilHeight = (springLen - 16 * scale) / coils;
        for (let i = 0; i < coils; i++) {
          const cy1 = startY + 8 * scale + i * coilHeight;
          const cy2 = cy1 + coilHeight;
          ctx.lineTo(pos.x + coilAmp, cy1 + coilHeight / 4);
          ctx.lineTo(pos.x - coilAmp, cy1 + coilHeight / 2);
          ctx.lineTo(pos.x + coilAmp, cy1 + coilHeight * 3 / 4);
          ctx.lineTo(pos.x, cy2);
        }
        ctx.stroke();

        if (showLabels && part.label) {
          ctx.fillStyle = '#1e293b';
          ctx.font = `${fontSize - 2}px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(part.label, pos.x + coilAmp + 20, pos.y + 4);
        }
        break;
      }

      case 'pendulum': {
        // Pendulum — fixed pivot, string at an angle, bob (mass)
        const angleDeg = part.angle !== undefined ? part.angle : 25;
        const theta = (angleDeg * Math.PI) / 180;
        const bobRadius = (part.bobRadius || 16) * scale;
        const color = part.color || '#7c3aed';
        const maxLen = Math.max(40, pos.y - 70 * scale); // keep whole pendulum on canvas
        const pendLen = Math.min((part.length || 160) * scale, maxLen);
        const pivotX = pos.x;
        const pivotY = pos.y - pendLen;
        const bobX = pivotX + pendLen * Math.sin(theta);
        const bobY = pivotY + pendLen * Math.cos(theta);

        // Ceiling support bar + pivot pin
        ctx.fillStyle = '#64748b';
        ctx.fillRect(pivotX - 32 * scale, pivotY - 9 * scale, 64 * scale, 6 * scale);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 4 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Dashed vertical equilibrium line
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(pivotX, pivotY + pendLen + bobRadius + 16 * scale);
        ctx.stroke();
        ctx.setLineDash([]);

        // String
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        // Bob (mass)
        ctx.fillStyle = part.fill || '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Angle arc θ (between string and vertical) with label
        if (showLabels && part.showAngle !== false) {
          const arcR = Math.min(pendLen * 0.4, 60 * scale);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pivotX, pivotY, arcR, Math.PI / 2 - theta, Math.PI / 2);
          ctx.stroke();
          const am = Math.PI / 2 - theta / 2;
          ctx.fillStyle = '#d97706';
          ctx.font = `${fontSize}px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('θ', pivotX + (arcR + 14 * scale) * Math.cos(am), pivotY + (arcR + 14 * scale) * Math.sin(am));
        }

        // Oscillation double-arrow beside the bob
        if (part.oscillate !== false) {
          const oscR = bobRadius + 12 * scale;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bobX, bobY, oscR, -0.55, 0.55);
          ctx.stroke();
          for (const dir of [-1, 1]) {
            const a = dir * 0.55;
            const ax = bobX + oscR * Math.cos(a);
            const ay = bobY + oscR * Math.sin(a);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - 7 * scale * Math.cos(a - dir * 0.55), ay - 7 * scale * Math.sin(a - dir * 0.55));
            ctx.lineTo(ax - 7 * scale * Math.cos(a + dir * 0.55), ay - 7 * scale * Math.sin(a + dir * 0.55));
            ctx.closePath();
            ctx.fill();
          }
        }

        // Weight arrow (mg) downward beside the bob
        if (showLabels && part.showWeight !== false) {
          const wLen = 34 * scale;
          const wX = bobX + bobRadius + 12 * scale;
          const wTop = bobY - wLen / 2;
          const wBot = bobY + wLen / 2;
          ctx.strokeStyle = '#16a34a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(wX, wTop);
          ctx.lineTo(wX, wBot);
          ctx.stroke();
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.moveTo(wX, wBot + 4 * scale);
          ctx.lineTo(wX - 5 * scale, wBot - 2 * scale);
          ctx.lineTo(wX + 5 * scale, wBot - 2 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.font = `bold ${fontSize - 2}px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('mg', wX, wTop - 6 * scale);
        }

        // Part label near bob
        if (showLabels && part.label) {
          ctx.fillStyle = '#1e293b';
          ctx.font = `${fontSize - 2}px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(part.label, bobX, bobY - bobRadius - 8 * scale);
        }
        break;
      }

      default: {
        // Unknown part — draw a box with label
        ctx.strokeStyle = part.color || '#6b7280';
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x - 25 * scale, pos.y - 20 * scale, 50 * scale, 40 * scale);
        if (showLabels) {
          ctx.fillStyle = '#1e293b';
          ctx.font = `${fontSize - 3}px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(part.type || '?', pos.x, pos.y + 4);
        }
      }
    }

    // ─── Rotation arrow for gears and pulleys ───
    if ((part.type === 'gear' || part.type === 'pulley') && part.rotation) {
      const rotRadius = (part.type === 'gear' ? (part.radius || 40) * scale + 20 * scale : (part.radius || 30) * scale + 15 * scale);
      ctx.strokeStyle = part.rotation === 'cw' ? '#3b82f6' : '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rotRadius, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();

      // Arrowhead
      const arrowAngle = part.rotation === 'cw' ? Math.PI / 3 : -Math.PI / 3;
      const ax = pos.x + rotRadius * Math.cos(arrowAngle);
      const ay = pos.y + rotRadius * Math.sin(arrowAngle);
      ctx.fillStyle = part.rotation === 'cw' ? '#3b82f6' : '#ef4444';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 8 * Math.cos(arrowAngle - 0.5), ay - 8 * Math.sin(arrowAngle - 0.5));
      ctx.lineTo(ax - 8 * Math.cos(arrowAngle + 0.5), ay - 8 * Math.sin(arrowAngle + 0.5));
      ctx.closePath();
      ctx.fill();
    }
  });

  ctx.restore();
}

export default drawMechanical;
