/**
 * Clever Painter — Force Diagram Command (FBD)
 * رسم مخططات القوى في الفيزياء (FBD)
 */

export function drawForce(engine, params = {}) {
  const { ctx } = engine;
  const { width, height } = engine.getSize();
  const cx = width / 2;
  const cy = height / 2;

  const {
    forces = [],
    mass = null,
    surface = null,
    title = 'مخطط القوى (Free Body Diagram)',
    showLabels = true,
    angle = 0,
  } = params;

  const fontSize = Math.max(12, Math.min(16, width / 50));
  const arrowLen = Math.min(80, width / 8);
  const bodyRadius = Math.min(30, width / 15);
  const colors = {
    normal: '#10b981',     // أخضر
    weight: '#ef4444',     // أحمر
    applied: '#3b82f6',    // أزرق
    friction: '#f59e0b',   // برتقالي
    tension: '#8b5cf6',    // بنفسجي
    spring: '#06b6d4',     // سماوي
    drag: '#ec4899',        // زهري
  };
  const labels = {
    normal: 'القوة العمودية N',
    weight: 'الوزن W',
    applied: 'قوة مؤثرة F',
    friction: 'الاحتكاك fᵢ',
    tension: 'الشد T',
    spring: 'قوة النابض Fₛ',
    drag: 'مقاومة الهواء D',
  };

  ctx.save();

  // ─── Title ───
  if (showLabels && title) {
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${fontSize + 2}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(title, cx, 25);
  }

  // ─── Surface (inclined plane or horizontal) ───
  if (surface) {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const surfAngle = surface.angle || 0;
    const surfLen = Math.min(width * 0.7, 400);
    const sx = cx - surfLen / 2;
    const sy = cy + bodyRadius + 20;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + surfLen, sy - surfLen * Math.sin((surfAngle * Math.PI) / 180));
    ctx.stroke();

    // Surface label
    if (showLabels && surface.label) {
      ctx.fillStyle = '#64748b';
      ctx.font = `${fontSize - 2}px 'Tajawal', Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(surface.label, sx + surfLen / 2, sy + 20);
    }
  }

  // ─── The body (box / circle) ───
  const drawBody = () => {
    if (mass) {
      // Draw as a box
      const bSize = bodyRadius * 1.5;
      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.fillRect(cx - bSize / 2, cy - bSize / 2, bSize, bSize);
      ctx.strokeRect(cx - bSize / 2, cy - bSize / 2, bSize, bSize);

      if (showLabels && mass) {
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${fontSize}px 'Tajawal', Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(mass, cx, cy + fontSize / 3);
      }
    } else {
      // Draw as a circle
      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, bodyRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (showLabels) {
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${fontSize}px 'Tajawal', Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('m', cx, cy + fontSize / 3);
      }
    }
  };

  drawBody();

  // ─── Draw force arrows ───
  const drawArrow = (fx, fy, label, color, forceLen = arrowLen, customDir = null) => {
    const len = customDir || forceLen;
    const angle_rad = Math.atan2(fy, fx);
    const endX = cx + fx * len;
    const endY = cy + fy * len;

    // Arrow line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arrowhead
    const headLen = 12;
    const headAngle = 0.45;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLen * Math.cos(angle_rad - headAngle),
      endY - headLen * Math.sin(angle_rad - headAngle)
    );
    ctx.lineTo(
      endX - headLen * Math.cos(angle_rad + headAngle),
      endY - headLen * Math.sin(angle_rad + headAngle)
    );
    ctx.closePath();
    ctx.fill();

    // Label
    if (showLabels && label) {
      ctx.fillStyle = color;
      ctx.font = `bold ${fontSize - 1}px 'Tajawal', Arial, sans-serif`;
      ctx.textAlign = 'center';
      const labelOffX = endX + fx * 20;
      const labelOffY = endY + fy * 20;
      ctx.fillText(label, labelOffX, labelOffY + 4);

      // Math-style notation below
      ctx.font = `${fontSize - 4}px 'Tajawal', Arial, sans-serif`;
      ctx.fillStyle = color + 'cc';
      ctx.fillText(`→ ${Math.round(Math.hypot(fx, fy) * 100) / 100} N`, labelOffX, labelOffY + fontSize + 4);
    }
  };

  if (forces.length > 0) {
    const forceScale = arrowLen;

    forces.forEach((f) => {
      const color = colors[f.type] || '#6b7280';
      const label = f.label || labels[f.type] || f.type;
      const fx = f.x || 0;
      const fy = f.y || 0;
      const mag = Math.hypot(fx, fy) || 1;

      drawArrow(fx / mag, fy / mag, label, color, f.magnitude ? Math.min(f.magnitude * 3, arrowLen * 1.5) : arrowLen);

      // If magnitude is specified as number instead of x/y
      if (f.magnitude && !f.x && !f.y) {
        const dirRad = ((f.direction || 0) * Math.PI) / 180;
        drawArrow(Math.cos(dirRad), Math.sin(dirRad), label, color, Math.min(f.magnitude * 2, arrowLen * 1.5));
      }
    });
  }

  // ─── Legend ───
  if (showLabels && forces.length > 0) {
    const legendX = 15;
    const legendY = height - 30 - forces.length * 20;
    ctx.font = `${fontSize - 4}px 'Tajawal', Arial, sans-serif`;

    forces.forEach((f, i) => {
      const color = colors[f.type] || '#6b7280';
      const label = f.label || labels[f.type] || f.type;
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY + i * 20, 12, 12);
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'left';
      ctx.fillText(label, legendX + 18, legendY + i * 20 + 10);
    });
  }

  ctx.restore();
}

export default drawForce;
