/**
 * Clever Painter — Electrical Circuit Command
 * رسم الدوائر الكهربائية (بطارية، مقاومات، أسلاك، مفتاح، لمبة)
 */

export function drawCircuit(engine, params = {}) {
  const { ctx } = engine;
  const { width, height } = engine.getSize();
  const cx = width / 2;
  const cy = height / 2;

  const {
    components: rawComponents = [],
    wires: rawWires = [],
    title = 'دائرة كهربائية',
    showLabels = true,
  } = params;

  const fontSize = Math.max(12, Math.min(16, width / 50));
  const wireColor = '#1e293b';
  const labelColor = '#4b5563';
  const activeColor = '#dc2626';
  const passiveColor = '#2563eb';

  ctx.save();

  // ─── Title ───
  if (showLabels && title) {
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${fontSize + 4}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(title, cx, 30);
  }

  // ─── Wire styling ───
  ctx.strokeStyle = wireColor;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ─── Draw wires ───
  if (rawWires.length > 0) {
    rawWires.forEach((wire) => {
      ctx.beginPath();
      ctx.moveTo(wire.x1, wire.y1);
      if (wire.x3 !== undefined && wire.y3 !== undefined) {
        // Quad bezier wire
        ctx.quadraticCurveTo(wire.x2 || wire.x1, wire.y2 || wire.y1, wire.x3, wire.y3);
      } else if (wire.x2 !== undefined && wire.y2 !== undefined) {
        ctx.lineTo(wire.x2, wire.y2);
      }
      ctx.stroke();

      // Wire label
      if (wire.label && showLabels) {
        const midX = (wire.x1 + (wire.x2 || wire.x3 || wire.x1)) / 2;
        const midY = (wire.y1 + (wire.y2 || wire.y3 || wire.y1)) / 2;
        ctx.fillStyle = labelColor;
        ctx.font = `${fontSize - 2}px 'Tajawal', Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(wire.label, midX + 12, midY - 8);
      }
    });
  }

  // ─── Auto-layout for common circuits ───
  function getComponentPos(index, total) {
    const spacing = Math.min(120, (width - 100) / Math.max(total, 1));
    const startX = (width - spacing * (total - 1)) / 2;
    return {
      x: startX + index * spacing,
      y: cy,
    };
  }

  // ─── Draw components ───
  if (rawComponents.length > 0) {
    rawComponents.forEach((comp, idx) => {
      const pos = comp.x !== undefined ? { x: comp.x, y: comp.y || cy } : getComponentPos(idx, rawComponents.length);
      const scale = Math.max(0.5, Math.min(2, width / 600));

      ctx.strokeStyle = comp.active ? activeColor : (comp.color || passiveColor);
      ctx.lineWidth = 2.5;
      ctx.fillStyle = comp.active ? '#fef2f2' : (comp.fill || '#ffffff');

      switch (comp.type) {
        case 'battery': {
          const bw = 24 * scale;
          const bh = 36 * scale;
          // Terminal lines
          ctx.strokeStyle = wireColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - bh / 2 - 10);
          ctx.lineTo(pos.x, pos.y - bh / 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y + bh / 2 + 10);
          ctx.lineTo(pos.x, pos.y + bh / 2);
          ctx.stroke();

          // Thin plate (top)
          ctx.strokeRect(pos.x - bw / 2, pos.y - bh / 2, bw, bh * 0.3);
          // Thick plate (bottom)
          ctx.lineWidth = 3;
          ctx.strokeRect(pos.x - bw / 2, pos.y + bh * 0.2, bw, bh * 0.3);

          // Plus sign
          ctx.fillStyle = '#dc2626';
          ctx.font = `bold ${fontSize}px 'Tajawal', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('+', pos.x, pos.y - bh / 2 - 14);
          ctx.fillText('−', pos.x, pos.y + bh / 2 + fontSize + 4);

          if (showLabels && comp.value) {
            ctx.fillStyle = labelColor;
            ctx.font = `${fontSize - 3}px 'Tajawal', Arial, sans-serif`;
            ctx.fillText(comp.value, pos.x, pos.y - bh / 2 - 28);
          }
          break;
        }

        case 'resistor': {
          const rw = 40 * scale;
          const rh = 14 * scale;
          const segments = 6;
          const segW = rw / segments;

          ctx.beginPath();
          for (let i = 0; i <= segments; i++) {
            const rx = pos.x - rw / 2 + i * segW;
            const ry = i % 2 === 0 ? pos.y - rh / 2 : pos.y + rh / 2;
            if (i === 0) ctx.moveTo(rx, pos.y);
            else ctx.lineTo(rx, ry);
          }
          ctx.lineTo(pos.x + rw / 2, pos.y);
          ctx.stroke();

          // Lead wires
          ctx.strokeStyle = wireColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pos.x - rw / 2 - 15, pos.y);
          ctx.lineTo(pos.x - rw / 2, pos.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x + rw / 2, pos.y);
          ctx.lineTo(pos.x + rw / 2 + 15, pos.y);
          ctx.stroke();

          if (showLabels && comp.value) {
            ctx.fillStyle = labelColor;
            ctx.font = `${fontSize - 3}px 'Tajawal', Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(comp.value, pos.x, pos.y - rh / 2 - 8);
          }
          break;
        }

        case 'bulb': {
          const radius = 16 * scale;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.stroke();

          // Cross inside
          ctx.beginPath();
          ctx.moveTo(pos.x - radius * 0.6, pos.y);
          ctx.lineTo(pos.x + radius * 0.6, pos.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - radius * 0.6);
          ctx.lineTo(pos.x, pos.y + radius * 0.6);
          ctx.stroke();

          // Lead wires
          ctx.strokeStyle = wireColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - radius - 10);
          ctx.lineTo(pos.x, pos.y - radius);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y + radius);
          ctx.lineTo(pos.x, pos.y + radius + 10);
          ctx.stroke();

          if (comp.active) {
            ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius + 8, 0, Math.PI * 2);
            ctx.fill();
          }

          if (showLabels && comp.value) {
            ctx.fillStyle = labelColor;
            ctx.font = `${fontSize - 3}px 'Tajawal', Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(comp.value, pos.x, pos.y + radius + fontSize + 6);
          }
          break;
        }

        case 'switch': {
          const sw = 30 * scale;
          const isClosed = comp.closed !== false;

          // Pads
          ctx.strokeStyle = wireColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pos.x - sw / 2, pos.y);
          ctx.lineTo(pos.x - sw / 2 - 10, pos.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x + sw / 2, pos.y);
          ctx.lineTo(pos.x + sw / 2 + 10, pos.y);
          ctx.stroke();

          // Dots
          ctx.fillStyle = wireColor;
          ctx.beginPath();
          ctx.arc(pos.x - sw / 2, pos.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(pos.x + sw / 2, pos.y, 3, 0, Math.PI * 2);
          ctx.fill();

          // Switch arm
          ctx.strokeStyle = comp.active ? activeColor : wireColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          if (isClosed) {
            ctx.moveTo(pos.x - sw / 2, pos.y);
            ctx.lineTo(pos.x + sw / 2, pos.y);
          } else {
            ctx.moveTo(pos.x - sw / 2, pos.y);
            const armAngle = -Math.PI / 4;
            const armLen = sw * 0.7;
            ctx.lineTo(
              pos.x - sw / 2 + armLen * Math.cos(armAngle),
              pos.y + armLen * Math.sin(armAngle)
            );
          }
          ctx.stroke();

          if (showLabels) {
            ctx.fillStyle = labelColor;
            ctx.font = `${fontSize - 3}px 'Tajawal', Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(isClosed ? 'مغلق' : 'مفتوح', pos.x, pos.y + 28);
          }
          break;
        }

        case 'capacitor': {
          const capW = 18 * scale;
          const capH = 30 * scale;

          // Lead wires
          ctx.strokeStyle = wireColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - capH / 2 - 10);
          ctx.lineTo(pos.x, pos.y - capH / 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y + capH / 2 + 10);
          ctx.lineTo(pos.x, pos.y + capH / 2);
          ctx.stroke();

          // Plates
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = comp.color || passiveColor;
          ctx.beginPath();
          ctx.moveTo(pos.x - capW / 2, pos.y - capH / 2);
          ctx.lineTo(pos.x + capW / 2, pos.y - capH / 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x - capW / 2, pos.y + capH / 2);
          ctx.lineTo(pos.x + capW / 2, pos.y + capH / 2);
          ctx.stroke();

          if (showLabels && comp.value) {
            ctx.fillStyle = labelColor;
            ctx.font = `${fontSize - 3}px 'Tajawal', Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(comp.value, pos.x, pos.y + capH / 2 + fontSize + 4);
          }
          break;
        }

        case 'inductor': {
          const iw = 36 * scale;
          const ih = 16 * scale;
          const loops = 5;
          const loopW = iw / loops;

          // Lead wires
          ctx.strokeStyle = wireColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pos.x - iw / 2 - 10, pos.y);
          ctx.lineTo(pos.x - iw / 2, pos.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x + iw / 2, pos.y);
          ctx.lineTo(pos.x + iw / 2 + 10, pos.y);
          ctx.stroke();

          // Coil loops
          ctx.strokeStyle = comp.color || passiveColor;
          ctx.lineWidth = 2.5;
          for (let i = 0; i < loops; i++) {
            const lx = pos.x - iw / 2 + i * loopW;
            ctx.beginPath();
            ctx.arc(lx + loopW / 2, pos.y, loopW / 2, Math.PI, 0);
            ctx.stroke();
          }

          if (showLabels && comp.value) {
            ctx.fillStyle = labelColor;
            ctx.font = `${fontSize - 3}px 'Tajawal', Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(comp.value, pos.x, pos.y + fontSize + 8);
          }
          break;
        }

        default: {
          // Generic component — draw a labeled box
          const bw = 40 * scale;
          const bh = 30 * scale;
          ctx.strokeStyle = comp.color || passiveColor;
          ctx.strokeRect(pos.x - bw / 2, pos.y - bh / 2, bw, bh);
          if (showLabels) {
            ctx.fillStyle = '#1e293b';
            ctx.font = `${fontSize - 4}px 'Tajawal', Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(comp.type || '?', pos.x, pos.y + 4);
            if (comp.value) {
              ctx.fillStyle = labelColor;
              ctx.font = `${fontSize - 5}px 'Tajawal', Arial, sans-serif`;
              ctx.fillText(comp.value, pos.x, pos.y + bh / 2 + fontSize - 2);
            }
          }
        }
      }
    });
  }

  // ─── Legend ───
  if (showLabels && (rawComponents.length > 0 || rawWires.length > 0)) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${fontSize - 4}px 'Tajawal', Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`المكونات: ${rawComponents.length} | الأسلاك: ${rawWires.length}`, 15, height - 12);
  }

  ctx.restore();
}

export default drawCircuit;
