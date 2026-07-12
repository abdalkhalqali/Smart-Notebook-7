import React, { useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 COLOR HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function wlToRGB(nm: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  if (nm < 380)        { r = 0.6; g = 0.0; b = 1.0; }
  else if (nm < 440)   { r = (440 - nm) / 60; g = 0; b = 1; }
  else if (nm < 490)   { r = 0; g = (nm - 440) / 50; b = 1; }
  else if (nm < 510)   { r = 0; g = 1; b = (510 - nm) / 20; }
  else if (nm < 580)   { r = (nm - 510) / 70; g = 1; b = 0; }
  else if (nm < 645)   { r = 1; g = (645 - nm) / 65; b = 0; }
  else if (nm <= 780)  { r = 1; g = 0; b = 0; }
  else                 { r = 0.5; g = 0; b = 0; }
  const f = nm < 380 ? 0.6 : nm > 700 ? 0.3 + ((780 - nm) / 80) * 0.7 : 1;
  return [Math.round(r * 255 * f), Math.round(g * 255 * f), Math.round(b * 255 * f)];
}

function wlColor(nm: number, a = 1): string {
  const [r, g, b] = wlToRGB(nm);
  return `rgba(${r},${g},${b},${a})`;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ═══════════════════════════════════════════════════════════════════════════
// 🛠 DRAWING PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

function glowDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, glowR = r * 4) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.3, color);
  grad.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function draw3DPlate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, depth: number, accent: string) {
  // Front face
  const fg = ctx.createLinearGradient(x, y, x + w, y + h);
  fg.addColorStop(0, '#94a3b8');
  fg.addColorStop(0.35, accent);
  fg.addColorStop(0.7, '#334155');
  fg.addColorStop(1, '#0f172a');
  ctx.fillStyle = fg;
  ctx.fillRect(x, y, w, h);

  // Top bevel
  const tg = ctx.createLinearGradient(x, y - depth, x + depth, y);
  tg.addColorStop(0, '#e2e8f0');
  tg.addColorStop(1, '#94a3b8');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + depth, y - depth);
  ctx.lineTo(x + w + depth, y - depth);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();

  // Right bevel
  const rg = ctx.createLinearGradient(x + w, y, x + w + depth, y);
  rg.addColorStop(0, '#475569');
  rg.addColorStop(1, '#1e293b');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w + depth, y - depth);
  ctx.lineTo(x + w + depth, y + h - depth);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // Outline
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function drawAmmeter(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, current: number, maxI: number) {
  // Case
  const cg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
  cg.addColorStop(0, '#334155');
  cg.addColorStop(1, '#0f172a');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Scale arc
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, -Math.PI * 0.85, Math.PI * 0.85);
  ctx.stroke();

  // Scale marks
  for (let i = 0; i <= 10; i++) {
    const ang = lerp(-Math.PI * 0.8, Math.PI * 0.8, i / 10) - Math.PI / 2;
    const inner = i % 5 === 0 ? r * 0.58 : r * 0.68;
    ctx.strokeStyle = i % 5 === 0 ? '#64748b' : '#334155';
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
    ctx.lineTo(cx + Math.cos(ang) * (r * 0.85), cy + Math.sin(ang) * (r * 0.85));
    ctx.stroke();
  }

  // Needle glow
  const norm = clamp(current / maxI, 0, 1);
  const needleAng = lerp(-Math.PI * 0.8, Math.PI * 0.8, norm) - Math.PI / 2;
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#f97316';
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(needleAng) * r * 0.2, cy - Math.sin(needleAng) * r * 0.2);
  ctx.lineTo(cx + Math.cos(needleAng) * r * 0.76, cy + Math.sin(needleAng) * r * 0.76);
  ctx.stroke();
  ctx.restore();

  // Center
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = '#94a3b8';
  ctx.font = `bold ${r * 0.28}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('μA', cx, cy + r * 0.4);
  ctx.fillStyle = current > 0 ? '#f97316' : '#475569';
  ctx.font = `bold ${r * 0.3}px monospace`;
  ctx.fillText(current.toFixed(1), cx, cy + r + 14);
}

function drawAnalogClock(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, timeSec: number, color: string, slowed = false) {
  const cg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 0, cx, cy, r);
  cg.addColorStop(0, '#1e293b');
  cg.addColorStop(1, '#0a0f1e');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = slowed ? 2 : 1.5;
  ctx.stroke();

  if (slowed) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = i % 3 === 0 ? 2 : 0.8;
    ctx.globalAlpha = i % 3 === 0 ? 0.7 : 0.3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
    ctx.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const sec = timeSec % 60;
  const min = (timeSec / 60) % 60;
  const hour = (timeSec / 3600) % 12;

  const hands = [
    { angle: (hour / 12) * Math.PI * 2 - Math.PI / 2, len: r * 0.55, w: 3, c: color },
    { angle: (min / 60) * Math.PI * 2 - Math.PI / 2, len: r * 0.75, w: 2, c: color },
    { angle: (sec / 60) * Math.PI * 2 - Math.PI / 2, len: r * 0.85, w: 1, c: slowed ? '#818cf8' : '#ef4444' },
  ];

  hands.forEach(h => {
    ctx.save();
    if (slowed && h.w === 1) { ctx.shadowBlur = 10; ctx.shadowColor = '#818cf8'; }
    ctx.strokeStyle = h.c;
    ctx.lineWidth = h.w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(h.angle) * h.len, cy + Math.sin(h.angle) * h.len);
    ctx.stroke();
    ctx.restore();
  });

  ctx.fillStyle = slowed ? '#818cf8' : color;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawRuler(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, color: string, label: string) {
  const h = 22;
  const rg = ctx.createLinearGradient(x, y, x, y + h);
  rg.addColorStop(0, '#1e293b');
  rg.addColorStop(0.5, '#334155');
  rg.addColorStop(1, '#1e293b');
  ctx.fillStyle = rg;
  ctx.fillRect(x, y, length, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, length, h);

  for (let i = 0; i <= 10; i++) {
    const tx = x + (i / 10) * length;
    const tickH = i % 5 === 0 ? h * 0.65 : h * 0.35;
    ctx.strokeStyle = color;
    ctx.lineWidth = i % 5 === 0 ? 1.5 : 0.8;
    ctx.globalAlpha = i % 5 === 0 ? 0.8 : 0.4;
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(tx, y + tickH);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = color;
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + length / 2, y - 5);
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚡ 1. PHOTOELECTRIC EFFECT — 3D Vacuum Tube
// ═══════════════════════════════════════════════════════════════════════════

interface PhotoParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  r: number; color: string;
  type: 'photon' | 'electron' | 'spark' | 'bounce';
}

function drawPhotoelectric(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, results: Record<string, number>,
  isPlaying: boolean,
  particlesRef: React.MutableRefObject<PhotoParticle[]>,
  t: number
) {
  const wl = vars.wavelength || 500;
  const intensity = vars.intensity || 80;
  const matIdx = clamp(Math.round(vars.material ?? 0), 0, 4);
  const matNames = ['Cs', 'K', 'Na', 'Ca', 'Zn'];
  const matAccents: Record<string, string> = { Cs: '#c084fc', K: '#a78bfa', Na: '#60a5fa', Ca: '#34d399', Zn: '#94a3b8' };
  const matName = matNames[matIdx];
  const matColor = matAccents[matName];
  const photonColor = wlColor(wl);
  const hasEmission = (results.emission ?? 0) > 0;
  const KE = results.ke2 ?? 0;
  const E_photon = results.photonEnergy ?? 0;
  const phi = results.workFunc ?? 2.1;
  const current = results.current ?? 0;
  const V_stop = results.stoppingVoltage ?? 0;
  const critWL = results.criticalWavelength ?? 590;

  // ── Background ──────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#020617');
  bg.addColorStop(1, '#050d1f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Lab grid (very subtle)
  ctx.strokeStyle = 'rgba(30,41,59,0.6)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // ── Electromagnetic Spectrum Bar ─────────────────────────────────────
  const specX = 70, specY = 16, specW = W - 150, specH = 14;
  for (let i = 0; i < specW; i++) {
    const nm = 260 + (i / specW) * (800 - 260);
    ctx.fillStyle = wlColor(nm, 0.9);
    ctx.fillRect(specX + i, specY, 1, specH);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(specX, specY, specW, specH);

  // Wavelength pointer
  const ptrX = clamp(specX + ((wl - 260) / 540) * specW, specX, specX + specW);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(ptrX, specY - 2);
  ctx.lineTo(ptrX - 5, specY - 9);
  ctx.lineTo(ptrX + 5, specY - 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = photonColor;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${wl}nm`, ptrX, specY - 11);

  // Critical wavelength marker
  const critX = clamp(specX + ((critWL - 260) / 540) * specW, specX, specX + specW);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(critX, specY + specH);
  ctx.lineTo(critX, specY + specH + 20);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '8px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`λc=${critWL.toFixed(0)}nm`, critX, specY + specH + 29);

  // Spectrum labels
  ctx.font = '8px Arial';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';  ctx.fillText('UV', specX, specY + specH + 10);
  ctx.textAlign = 'center'; ctx.fillText('مرئي', specX + specW / 2, specY + specH + 10);
  ctx.textAlign = 'right';  ctx.fillText('IR', specX + specW, specY + specH + 10);

  // ── Light Source (lamp) ──────────────────────────────────────────────
  const lampX = 65, lampY = H / 2 + 10;

  // Halo glow
  const halo = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, 48);
  halo.addColorStop(0, wlColor(wl, 0.5 * intensity / 100));
  halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(lampX, lampY, 48, 0, Math.PI * 2);
  ctx.fill();

  // Lamp body (glass bulb shape)
  ctx.save();
  ctx.shadowBlur = 20 + 8 * Math.sin(t * 2);
  ctx.shadowColor = photonColor;
  const bulbG = ctx.createRadialGradient(lampX - 6, lampY - 6, 0, lampX, lampY, 19);
  bulbG.addColorStop(0, '#fff');
  bulbG.addColorStop(0.25, wlColor(wl, 1));
  bulbG.addColorStop(0.7, wlColor(wl, 0.6));
  bulbG.addColorStop(1, '#1e293b');
  ctx.fillStyle = bulbG;
  ctx.beginPath();
  ctx.arc(lampX, lampY, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Lamp base
  ctx.fillStyle = '#475569';
  ctx.fillRect(lampX - 7, lampY + 19, 14, 22);
  ctx.fillRect(lampX - 16, lampY + 38, 32, 7);

  ctx.fillStyle = '#64748b';
  ctx.font = '8px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`I = ${intensity}%`, lampX, lampY + 56);

  // ── Light Beam (converging lens effect) ──────────────────────────────
  const beamStart = lampX + 20;
  const beamEnd = 248; // cathode left edge
  const beamBG = ctx.createLinearGradient(beamStart, 0, beamEnd, 0);
  beamBG.addColorStop(0, wlColor(wl, 0.35 * intensity / 100));
  beamBG.addColorStop(0.6, wlColor(wl, 0.15 * intensity / 100));
  beamBG.addColorStop(1, wlColor(wl, 0.03));
  ctx.fillStyle = beamBG;
  ctx.beginPath();
  ctx.moveTo(beamStart, lampY - 20);
  ctx.lineTo(beamEnd, lampY - 8);
  ctx.lineTo(beamEnd, lampY + 8);
  ctx.lineTo(beamStart, lampY + 20);
  ctx.closePath();
  ctx.fill();

  // ── Vacuum Tube Glass Envelope ────────────────────────────────────────
  const tubeCX = 380, tubeCY = H / 2 + 10;
  const tubeRX = 175, tubeRY = 80;

  // Outer glow
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = wlColor(wl, 0.3);

  // Glass body
  const glassG = ctx.createRadialGradient(tubeCX - tubeRX * 0.35, tubeCY - tubeRY * 0.4, 0, tubeCX, tubeCY, tubeRX * 1.05);
  glassG.addColorStop(0, 'rgba(148,163,184,0.05)');
  glassG.addColorStop(0.6, 'rgba(15,23,42,0.04)');
  glassG.addColorStop(1, 'rgba(148,163,184,0.12)');
  ctx.fillStyle = glassG;
  ctx.beginPath();
  ctx.ellipse(tubeCX, tubeCY, tubeRX, tubeRY, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glass rim
  ctx.strokeStyle = 'rgba(148,163,184,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(tubeCX, tubeCY, tubeRX, tubeRY, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Top reflection
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(tubeCX, tubeCY - tubeRY * 0.32, tubeRX * 0.55, tubeRY * 0.14, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Vacuum glow inside
  const vacG = ctx.createRadialGradient(tubeCX, tubeCY, 0, tubeCX, tubeCY, tubeRX);
  vacG.addColorStop(0, hasEmission ? 'rgba(250,204,21,0.03)' : 'rgba(99,102,241,0.02)');
  vacG.addColorStop(1, 'transparent');
  ctx.fillStyle = vacG;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(tubeCX, tubeCY, tubeRX - 2, tubeRY - 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Cathode Plate (3D metallic) ────────────────────────────────────────
  const cathX = tubeCX - tubeRX + 38;
  const cathY = tubeCY - 55;
  const cathW = 15, cathH = 110;

  draw3DPlate(ctx, cathX, cathY, cathW, cathH, 9, matColor);

  // Material shimmer
  ctx.save();
  ctx.globalAlpha = 0.4;
  const shimG = ctx.createLinearGradient(cathX, cathY, cathX, cathY + cathH);
  shimG.addColorStop(0, matColor);
  shimG.addColorStop(0.5, 'transparent');
  shimG.addColorStop(1, matColor);
  ctx.fillStyle = shimG;
  ctx.fillRect(cathX, cathY, cathW, cathH);
  ctx.restore();

  // Material label with badge
  ctx.fillStyle = 'rgba(15,23,42,0.8)';
  roundRect(ctx, cathX - 2, cathY - 28, cathW + 4, 20, 4);
  ctx.fill();
  ctx.fillStyle = matColor;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(matName, cathX + cathW / 2, cathY - 13);
  ctx.fillStyle = '#64748b';
  ctx.font = '7px monospace';
  ctx.fillText(`φ=${phi.toFixed(1)}eV`, cathX + cathW / 2, cathY - 3);

  // Wire terminal from cathode bottom
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cathX + cathW / 2, cathY + cathH);
  ctx.lineTo(cathX + cathW / 2, tubeCY + tubeRY + 20);
  ctx.stroke();

  // ── Anode (collector) ─────────────────────────────────────────────────
  const anodeX = tubeCX + tubeRX - 48;
  const anodeY = tubeCY - 42;
  const anodeW = 12, anodeH = 84;

  const anodeG = ctx.createLinearGradient(anodeX, anodeY, anodeX, anodeY + anodeH);
  anodeG.addColorStop(0, '#94a3b8');
  anodeG.addColorStop(0.5, '#64748b');
  anodeG.addColorStop(1, '#1e293b');
  ctx.fillStyle = anodeG;
  ctx.fillRect(anodeX, anodeY, anodeW, anodeH);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(anodeX, anodeY, anodeW, anodeH);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('+', anodeX + anodeW / 2, anodeY - 8);

  // Wire terminal from anode top
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(anodeX + anodeW / 2, anodeY);
  ctx.lineTo(anodeX + anodeW / 2, tubeCY - tubeRY - 20);
  ctx.stroke();

  // ── Circuit (outside tube) ─────────────────────────────────────────────
  const circY1 = tubeCY - tubeRY - 20;
  const circY2 = tubeCY + tubeRY + 20;
  const ammX = W - 68, ammY = tubeCY;

  // Top wire: anode → ammeter
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(anodeX + anodeW / 2, circY1);
  ctx.lineTo(ammX, circY1);
  ctx.lineTo(ammX, ammY - 32);
  ctx.stroke();

  // Bottom wire: cathode → ammeter
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cathX + cathW / 2, circY2);
  ctx.lineTo(ammX, circY2);
  ctx.lineTo(ammX, ammY + 32);
  ctx.stroke();

  // ── Ammeter ────────────────────────────────────────────────────────────
  drawAmmeter(ctx, ammX, ammY, 30, current, 100);

  // ── Particles ──────────────────────────────────────────────────────────
  if (isPlaying) {
    // Spawn photons
    const numSpawn = Math.ceil(intensity / 40);
    for (let i = 0; i < numSpawn; i++) {
      if (Math.random() < intensity / 600) {
        const yOff = (Math.random() - 0.5) * 28;
        particlesRef.current.push({
          x: lampX + 22, y: lampY + yOff,
          vx: 3.2 + Math.random() * 1.5, vy: (Math.random() - 0.5) * 0.25,
          life: 1, maxLife: 1, r: 3.5, color: photonColor, type: 'photon'
        });
      }
    }

    // Update particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx; p.y += p.vy;

      // Photon hits cathode zone
      if (p.type === 'photon' && p.x >= cathX && p.x <= cathX + cathW + 14 && p.y >= cathY - 5 && p.y <= cathY + cathH + 5) {
        if (hasEmission) {
          // Emit 1-2 electrons
          for (let k = 0; k < (KE > 1 ? 2 : 1); k++) {
            const speed = 1.5 + KE * 0.7 + Math.random() * 0.5;
            particlesRef.current.push({
              x: cathX + cathW + 4, y: p.y + (Math.random() - 0.5) * 8,
              vx: speed, vy: (Math.random() - 0.5) * 1.2,
              life: 1, maxLife: 1, r: 3, color: '#fbbf24', type: 'electron'
            });
          }
          // Surface sparks
          for (let k = 0; k < 4; k++) {
            particlesRef.current.push({
              x: cathX + cathW, y: p.y,
              vx: -1 - Math.random() * 2, vy: (Math.random() - 0.5) * 3.5,
              life: 0.6, maxLife: 0.6, r: 2, color: matColor, type: 'spark'
            });
          }
        } else {
          // Bounce off
          particlesRef.current.push({
            x: cathX, y: p.y,
            vx: -(p.vx * 0.6), vy: (Math.random() - 0.5) * 2,
            life: 0.7, maxLife: 0.7, r: 3, color: wlColor(wl, 0.5), type: 'bounce'
          });
        }
        return false;
      }

      // Fade logic
      if (p.type !== 'photon') {
        p.life -= 0.018;
      } else if (p.x > anodeX + anodeW + 10 || p.x < 0) {
        return false;
      }

      return p.life > 0;
    });

    // Cap particles
    if (particlesRef.current.length > 220) {
      particlesRef.current = particlesRef.current.slice(-200);
    }
  }

  // Draw particles
  particlesRef.current.forEach(p => {
    const alpha = p.type === 'photon' ? 0.92 : p.life / p.maxLife;
    ctx.save();
    if (p.type === 'electron') {
      ctx.shadowBlur = 12; ctx.shadowColor = '#fbbf24';
      ctx.fillStyle = `rgba(251,191,36,${alpha})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      // e⁻ label
      ctx.fillStyle = `rgba(254,240,138,${alpha * 0.8})`;
      ctx.font = '6px Arial'; ctx.textAlign = 'center';
      ctx.fillText('e⁻', p.x, p.y - 6);
    } else if (p.type === 'photon') {
      glowDot(ctx, p.x, p.y, p.r, p.color, p.r * 3.5);
    } else {
      ctx.shadowBlur = 6; ctx.shadowColor = p.color;
      ctx.fillStyle = p.color.includes('rgba') ? p.color : `rgba(${p.color},${alpha})`;
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });

  // ── Physics Panel (bottom left) ────────────────────────────────────────
  ctx.fillStyle = 'rgba(15,23,42,0.92)';
  roundRect(ctx, 8, H - 100, 215, 95, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, 8, H - 100, 215, 95, 8);
  ctx.stroke();

  const rows = [
    { lbl: 'E_فوتون', val: `${E_photon.toFixed(3)} eV`, c: wlColor(wl, 1) },
    { lbl: 'φ (دالة الشغل)', val: `${phi.toFixed(2)} eV`, c: '#f87171' },
    { lbl: 'KE_max', val: hasEmission ? `${KE.toFixed(3)} eV` : 'لا انبعاث', c: '#fbbf24' },
    { lbl: 'V_stop', val: `${V_stop.toFixed(3)} V`, c: '#34d399' },
    { lbl: 'التيار I', val: `${current.toFixed(1)} μA`, c: '#f97316' },
  ];
  rows.forEach((row, i) => {
    ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(row.lbl + ':', 16, H - 86 + i * 17);
    ctx.fillStyle = row.c; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(row.val, 218, H - 86 + i * 17);
  });

  // ── Status Banner ─────────────────────────────────────────────────────
  const bannerX = tubeCX, bannerY = H - 22;
  const bannerText = hasEmission
    ? `✓ انبعاث! hf=${E_photon.toFixed(2)}eV > φ=${phi.toFixed(2)}eV → KE=${KE.toFixed(2)}eV`
    : `✗ لا انبعاث — hf=${E_photon.toFixed(2)}eV < φ=${phi.toFixed(2)}eV (λ > λc=${critWL.toFixed(0)}nm)`;

  ctx.fillStyle = hasEmission ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
  roundRect(ctx, bannerX - 200, bannerY - 17, 400, 22, 6);
  ctx.fill();
  ctx.fillStyle = hasEmission ? '#4ade80' : '#f87171';
  ctx.font = 'bold 9px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(bannerText, bannerX, bannerY - 3);
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚛️ 2. BOHR ATOM MODEL
// ═══════════════════════════════════════════════════════════════════════════

function drawBohrModel(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, results: Record<string, number>,
  isPlaying: boolean, t: number
) {
  const n1 = clamp(Math.round(vars.n1 ?? 3), 1, 6);
  const n2 = clamp(Math.round(vars.n2 ?? 1), 1, 6);
  const E1 = -13.6 / (n1 * n1);
  const E2 = -13.6 / (n2 * n2);
  const deltaE = Math.abs(E2 - E1);
  const photonWL = deltaE > 0.001 ? clamp(1240 / deltaE, 100, 1800) : 500;
  const isEmission = n1 > n2;

  // Background
  const bg = ctx.createRadialGradient(W * 0.38, H / 2, 0, W * 0.38, H / 2, W * 0.5);
  bg.addColorStop(0, '#07052a');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Starfield
  const STARS = [[40,25],[110,65],[560,30],[590,75],[620,140],[25,185],[650,95],[200,15],[480,50],[160,130]];
  STARS.forEach(([sx, sy]) => {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
    ctx.fill();
  });

  const cx = W * 0.36, cy = H / 2 + 5;
  const orbitR = [0, 38, 72, 100, 125, 147, 167];

  // ── Orbit rings ────────────────────────────────────────────────────────
  for (let n = 6; n >= 1; n--) {
    const r = orbitR[n];
    const active = n === n1;
    const target = n === n2;

    // Orbit ellipse (tilted for 3D feel)
    ctx.save();
    ctx.strokeStyle = active ? 'rgba(99,102,241,0.75)'
      : target ? 'rgba(52,211,153,0.6)'
        : 'rgba(30,41,59,0.7)';
    ctx.lineWidth = active ? 1.8 : target ? 1.4 : 0.7;
    if (active) { ctx.shadowBlur = 8; ctx.shadowColor = '#6366f1'; }
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // n-label outside orbit
    ctx.fillStyle = active ? '#a5b4fc' : target ? '#6ee7b7' : '#334155';
    ctx.font = `${active || target ? 'bold ' : ''}9px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`n=${n}`, cx + r + 5, cy + 4);
    const En = -13.6 / (n * n);
    ctx.fillStyle = active ? '#818cf8' : '#1e3a5f';
    ctx.font = '7px monospace';
    ctx.fillText(`${En.toFixed(2)}eV`, cx + r + 5, cy + 15);
  }

  // ── Nucleus ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowBlur = 25;
  ctx.shadowColor = '#ef4444';
  const nuclG = ctx.createRadialGradient(cx - 5, cy - 5, 0, cx, cy, 20);
  nuclG.addColorStop(0, '#fca5a5');
  nuclG.addColorStop(0.4, '#ef4444');
  nuclG.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = nuclG;
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fill();

  // Proton/neutron dots inside nucleus
  const nucPositions = [[-7,-5],[7,-5],[0,0],[-5,7],[7,6],[-10,1]];
  nucPositions.forEach(([px, py], i) => {
    ctx.fillStyle = i % 2 === 0 ? '#fca5a5' : '#93c5fd';
    ctx.beginPath();
    ctx.arc(cx + px, cy + py, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 9px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('H', cx, cy + 4);

  // ── Orbiting Electron ─────────────────────────────────────────────────
  const orb = orbitR[n1];
  const angSpeed = isPlaying ? t * (2.5 - n1 * 0.3) : 0;
  const ex = cx + orb * Math.cos(angSpeed);
  const ey = cy + orb * 0.32 * Math.sin(angSpeed);

  // Electron trail
  for (let i = 1; i <= 10; i++) {
    const ta = angSpeed - i * 0.12;
    const tx = cx + orb * Math.cos(ta);
    const ty = cy + orb * 0.32 * Math.sin(ta);
    ctx.fillStyle = `rgba(99,102,241,${(10 - i) * 0.04})`;
    ctx.beginPath();
    ctx.arc(tx, ty, 5 - i * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Electron
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = '#818cf8';
  const eG = ctx.createRadialGradient(ex - 1.5, ey - 1.5, 0, ex, ey, 7);
  eG.addColorStop(0, '#e0e7ff');
  eG.addColorStop(0.5, '#818cf8');
  eG.addColorStop(1, '#3730a3');
  ctx.fillStyle = eG;
  ctx.beginPath();
  ctx.arc(ex, ey, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#a5b4fc';
  ctx.font = '7px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('e⁻', ex, ey - 10);

  // ── Transition Photon ──────────────────────────────────────────────────
  if (isPlaying && n1 !== n2) {
    const pColor = wlColor(photonWL);
    const pPhase = (t * 2.5) % (Math.PI * 2);
    const midR = (orbitR[n1] + orbitR[n2]) / 2;
    const px2 = cx + midR * Math.cos(pPhase + Math.PI * 0.6);
    const py2 = cy + midR * 0.32 * Math.sin(pPhase + Math.PI * 0.6);

    glowDot(ctx, px2, py2, 4, pColor, 14);

    // Transition arrow
    const r1 = orbitR[n1], r2 = orbitR[n2];
    const arrowAng = Math.PI * 1.15;
    const ax1 = cx + r1 * Math.cos(arrowAng), ay1 = cy + r1 * 0.32 * Math.sin(arrowAng);
    const ax2 = cx + r2 * Math.cos(arrowAng), ay2 = cy + r2 * 0.32 * Math.sin(arrowAng);

    ctx.save();
    ctx.shadowBlur = 8; ctx.shadowColor = pColor;
    ctx.strokeStyle = pColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.stroke();

    const dx = ax2 - ax1, dy = ay2 - ay1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len, ny = dy / len;
    ctx.fillStyle = pColor;
    ctx.beginPath();
    ctx.moveTo(ax2, ay2);
    ctx.lineTo(ax2 - nx * 10 - ny * 5, ay2 - ny * 10 + nx * 5);
    ctx.lineTo(ax2 - nx * 10 + ny * 5, ay2 - ny * 10 - nx * 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ── Energy Level Diagram (right panel) ────────────────────────────────
  const diagX = W * 0.7, diagY = 30;
  const diagH = H - 60;
  const diagW = W - diagX - 15;

  ctx.fillStyle = 'rgba(15,23,42,0.88)';
  roundRect(ctx, diagX, diagY, diagW, diagH, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.3)'; ctx.lineWidth = 1;
  roundRect(ctx, diagX, diagY, diagW, diagH, 8);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('مستويات الطاقة', diagX + diagW / 2, diagY + 15);
  ctx.fillStyle = '#334155'; ctx.font = '7px Arial';
  ctx.fillText('ذرة الهيدروجين', diagX + diagW / 2, diagY + 26);

  const eMin = -13.6, eMax = 0;
  const eToY = (e: number) => diagY + 35 + ((1 - (e - eMin) / (eMax - eMin)) * (diagH - 50));

  for (let n = 1; n <= 6; n++) {
    const En = -13.6 / (n * n);
    const ly = eToY(En);
    const isN1 = n === n1, isN2 = n === n2;

    ctx.strokeStyle = isN1 ? '#818cf8' : isN2 ? '#34d399' : '#1e3a5f';
    ctx.lineWidth = isN1 || isN2 ? 2 : 0.8;
    ctx.beginPath(); ctx.moveTo(diagX + 8, ly); ctx.lineTo(diagX + diagW - 8, ly); ctx.stroke();

    ctx.fillStyle = isN1 ? '#a5b4fc' : isN2 ? '#6ee7b7' : '#334155';
    ctx.font = `${isN1 || isN2 ? 'bold ' : ''}8px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`n=${n}`, diagX + 10, ly - 2);
    ctx.textAlign = 'right';
    ctx.fillText(`${En.toFixed(2)}`, diagX + diagW - 9, ly - 2);
  }

  // Arrow
  const ly1 = eToY(-13.6 / (n1 * n1));
  const ly2 = eToY(-13.6 / (n2 * n2));
  const arrowX = diagX + diagW / 2;

  ctx.save();
  ctx.shadowBlur = 6; ctx.shadowColor = wlColor(photonWL);
  ctx.strokeStyle = wlColor(photonWL); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(arrowX, ly1); ctx.lineTo(arrowX, ly2); ctx.stroke();
  const aDir = ly2 < ly1 ? -1 : 1;
  ctx.fillStyle = wlColor(photonWL);
  ctx.beginPath();
  ctx.moveTo(arrowX, ly2);
  ctx.lineTo(arrowX - 5, ly2 + aDir * 10);
  ctx.lineTo(arrowX + 5, ly2 + aDir * 10);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  const midLY = (ly1 + ly2) / 2;
  ctx.fillStyle = wlColor(photonWL); ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText(`λ=${photonWL.toFixed(0)}nm`, arrowX, midLY + 4);
  ctx.fillText(`ΔE=${deltaE.toFixed(2)}eV`, arrowX, midLY + 15);

  // Photon color swatch
  ctx.fillStyle = wlColor(photonWL);
  roundRect(ctx, diagX + diagW / 2 - 20, midLY + 20, 40, 8, 4);
  ctx.fill();

  // ── Series label & info ────────────────────────────────────────────────
  const series = n2 === 1 ? '⟶ Lyman (UV فوق بنفسجي)' : n2 === 2 ? '⟶ Balmer (مرئي)' : n2 === 3 ? '⟶ Paschen (تحت أحمر)' : `⟶ n=${n2}`;
  ctx.fillStyle = 'rgba(15,23,42,0.9)';
  roundRect(ctx, 8, H - 60, 320, 56, 8);
  ctx.fill();

  const infoR = [
    { t: `n₁=${n1}  →  E₁ = ${E1.toFixed(3)} eV`, c: '#818cf8' },
    { t: `n₂=${n2}  →  E₂ = ${E2.toFixed(3)} eV`, c: '#34d399' },
    { t: `${isEmission ? '↓ إصدار' : '↑ امتصاص'} | ${series}`, c: wlColor(photonWL) },
  ];
  infoR.forEach((r, i) => {
    ctx.fillStyle = r.c; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.t, 16, H - 46 + i * 16);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌊 3. DOUBLE-SLIT EXPERIMENT
// ═══════════════════════════════════════════════════════════════════════════

interface SlitParticle { x: number; y: number; vx: number; vy: number; active: boolean; }

function drawDoubleSlit(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>,
  isPlaying: boolean,
  dotsRef: React.MutableRefObject<{ y: number }[]>,
  slitParticlesRef: React.MutableRefObject<SlitParticle[]>,
  t: number
) {
  const wl = vars.wavelength || 500;
  const d = vars.slitSep || 0.1;   // mm — affects fringe spacing
  const pColor = wlColor(wl);

  // Background
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(15,23,42,0.7)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  const srcX = 62, barrierX = Math.round(W * 0.42), screenX = W - 68;
  const slitGap = clamp(50 + d * 20, 35, 85);
  const slitHalf = 13;
  const slit1Y = H / 2 - slitGap / 2;
  const slit2Y = H / 2 + slitGap / 2;

  // ── Source ─────────────────────────────────────────────────────────────
  const srcG = ctx.createRadialGradient(srcX, H / 2, 0, srcX, H / 2, 30);
  srcG.addColorStop(0, 'white');
  srcG.addColorStop(0.3, pColor);
  srcG.addColorStop(1, 'transparent');
  ctx.fillStyle = srcG;
  ctx.beginPath(); ctx.arc(srcX, H / 2, 30, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#64748b'; ctx.font = '8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('مصدر', srcX, H / 2 + 36);
  ctx.fillStyle = pColor; ctx.font = '8px monospace';
  ctx.fillText(`λ=${wl}nm`, srcX, H / 2 + 46);

  // Wavefronts before barrier
  for (let i = 0; i < 5; i++) {
    const rr = ((t * 45 + i * 28) % (barrierX - srcX - 20));
    if (rr > 0) {
      ctx.strokeStyle = wlColor(wl, (1 - rr / (barrierX - srcX)) * 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(srcX, H / 2, rr, -Math.PI * 0.72, Math.PI * 0.72);
      ctx.stroke();
    }
  }

  // ── Barrier ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#1e3a5f';
  const gap = slitHalf;
  ctx.fillRect(barrierX - 7, 0, 14, slit1Y - gap);
  ctx.fillRect(barrierX - 7, slit1Y + gap, 14, slit2Y - gap - slit1Y - gap);
  ctx.fillRect(barrierX - 7, slit2Y + gap, 14, H - slit2Y - gap);
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1;
  [slit1Y - gap, slit2Y - gap + 2 * gap + (slit2Y - slit1Y - 2 * gap)].forEach((y, i) => {
    ctx.strokeRect(barrierX - 7, i === 0 ? 0 : slit2Y + gap, 14, i === 0 ? slit1Y - gap : H - slit2Y - gap);
  });

  ctx.fillStyle = '#93c5fd'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('S₁', barrierX, slit1Y + 4);
  ctx.fillText('S₂', barrierX, slit2Y + 4);

  // Diffraction after slits
  [slit1Y, slit2Y].forEach(sy => {
    for (let i = 0; i < 5; i++) {
      const rr = ((t * 45 + i * 28) % (screenX - barrierX - 15));
      if (rr > 0) {
        ctx.strokeStyle = wlColor(wl, (1 - rr / (screenX - barrierX)) * 0.22);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(barrierX, sy, rr, -Math.PI * 0.85, Math.PI * 0.85);
        ctx.stroke();
      }
    }
  });

  // ── Screen ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(screenX - 4, 0, 8, H);
  ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1;
  ctx.strokeRect(screenX - 4, 0, 8, H);

  // Intensity pattern on screen
  for (let py = 20; py < H - 20; py++) {
    const y = (py - H / 2) * 4e-4; // scale to meters
    const dSep = d * 1e-3 * 1e-3;   // mm → m
    const L = 1.0;
    const lambda = wl * 1e-9;
    const phase = Math.PI * dSep * y / (lambda * L);
    const intensity = Math.pow(Math.cos(phase), 2);
    ctx.fillStyle = wlColor(wl, intensity * 0.85);
    ctx.fillRect(screenX + 5, py, 18, 1);
  }

  // Accumulated detection dots
  if (isPlaying && Math.random() < 0.35) {
    // Sample from interference distribution
    let bestY = H / 2;
    let bestI = 0;
    for (let k = 0; k < 30; k++) {
      const ty = 25 + Math.random() * (H - 50);
      const y = (ty - H / 2) * 4e-4;
      const dSep = d * 1e-3 * 1e-3;
      const lambda = wl * 1e-9;
      const phase = Math.PI * dSep * y / (lambda * 1.0);
      const ints = Math.pow(Math.cos(phase), 2);
      if (ints > bestI) { bestI = ints; bestY = ty; }
    }
    if (Math.random() < bestI) {
      dotsRef.current.push({ y: bestY });
      if (dotsRef.current.length > 600) dotsRef.current = dotsRef.current.slice(-550);
    }
  }

  dotsRef.current.forEach(dot => {
    ctx.fillStyle = wlColor(wl, 0.75);
    ctx.beginPath(); ctx.arc(screenX + 14, dot.y, 1.5, 0, Math.PI * 2); ctx.fill();
  });

  // Flying particles
  if (isPlaying && Math.random() < 0.07) {
    const targetSlit = Math.random() < 0.5 ? slit1Y : slit2Y;
    slitParticlesRef.current.push({
      x: srcX + 28, y: H / 2,
      vx: 2.8,
      vy: (targetSlit - H / 2) / 50,
      active: true
    });
  }

  slitParticlesRef.current = slitParticlesRef.current.filter(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x > barrierX + 5) {
      const nearest = dotsRef.current.length > 0
        ? dotsRef.current[dotsRef.current.length - 1].y : H / 2;
      p.vy += (nearest - p.y) * 0.002;
    }
    if (p.x > screenX) return false;
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = pColor;
    ctx.fillStyle = pColor;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return true;
  });

  // ── Counter ─────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(15,23,42,0.9)';
  roundRect(ctx, 8, 8, 170, 55, 8);
  ctx.fill();
  ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
  ctx.fillText('جسيمات مرصودة:', 16, 25);
  ctx.fillStyle = pColor; ctx.font = 'bold 16px monospace';
  ctx.fillText(dotsRef.current.length.toString(), 16, 50);

  ctx.fillStyle = '#334155'; ctx.font = '8px monospace';
  ctx.fillText(`λ=${wl}nm  d=${d.toFixed(2)}mm`, 16, H - 10);

  // ── Caption ─────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  roundRect(ctx, barrierX - 120, H - 52, 240, 46, 8);
  ctx.fill();
  ctx.fillStyle = '#94a3b8'; ctx.font = '8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('تجربة يونغ بالشق المزدوج', barrierX, H - 39);
  ctx.fillStyle = '#64748b'; ctx.font = '7px Arial';
  ctx.fillText('الجسيمات تتداخل كأمواج وتبني نمط حيود', barrierX, H - 27);
  ctx.fillStyle = '#3b82f6';
  ctx.fillText('ازدواجية الموجة-الجسيم (Wave-Particle Duality)', barrierX, H - 15);
}

// ═══════════════════════════════════════════════════════════════════════════
// ☢️ 4. RADIOACTIVE DECAY — Animated Grid
// ═══════════════════════════════════════════════════════════════════════════

interface AtomCell {
  x: number; y: number;
  decayed: boolean;
  decayTime: number;
  emitting: boolean;
  emitStart: number;
  particle: 'α' | 'β' | 'γ';
  element: string;
}

interface DecayRay { x: number; y: number; vx: number; vy: number; life: number; type: 'α' | 'β' | 'γ'; }

function drawRadioactiveDecay(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>,
  isPlaying: boolean,
  atomsRef: React.MutableRefObject<AtomCell[]>,
  raysRef: React.MutableRefObject<DecayRay[]>,
  histRef: React.MutableRefObject<{ t: number; n: number }[]>,
  t: number
) {
  const halfLife = clamp(vars.halfLife ?? 5, 0.5, 30);
  const lambda = Math.LN2 / halfLife;
  const N0 = 100;

  // Init atoms
  if (atomsRef.current.length === 0) {
    const elements = ['Ra', 'U', 'Th', 'Rn', 'Po', 'Bi', 'Pb'];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const sx = W * 0.07 + c * (W * 0.52 / 10);
        const sy = 40 + r * ((H - 80) / 10);
        atomsRef.current.push({
          x: sx + 18, y: sy + 14,
          decayed: false,
          decayTime: -Math.log(Math.random()) / lambda,
          emitting: false,
          emitStart: 0,
          particle: Math.random() < 0.55 ? 'β' : Math.random() < 0.6 ? 'α' : 'γ',
          element: elements[Math.floor(Math.random() * elements.length)]
        });
      }
    }
  }

  // Background
  ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(15,23,42,0.5)'; ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  const divX = W * 0.6;
  ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(divX, 0); ctx.lineTo(divX, H); ctx.stroke();

  // Update atom states
  const alive = atomsRef.current.filter(a => !a.decayed && !a.emitting).length;

  if (isPlaying) {
    atomsRef.current.forEach(a => {
      if (!a.decayed && !a.emitting && t > a.decayTime) {
        a.emitting = true;
        a.emitStart = t;
        const ang = Math.random() * Math.PI * 2;
        const speed = a.particle === 'α' ? 1.5 : a.particle === 'γ' ? 4 : 2.5;
        raysRef.current.push({ x: a.x, y: a.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life: 1, type: a.particle });
      }
      if (a.emitting && t - a.emitStart > 0.6) {
        a.decayed = true;
        a.emitting = false;
      }
    });

    const lastH = histRef.current[histRef.current.length - 1];
    if (!lastH || t - lastH.t >= 0.08) {
      histRef.current.push({ t, n: alive });
      if (histRef.current.length > 250) histRef.current = histRef.current.slice(-230);
    }
  }

  // ── Draw atoms ──────────────────────────────────────────────────────────
  atomsRef.current.forEach(a => {
    ctx.save();
    if (a.emitting) { ctx.shadowBlur = 20; ctx.shadowColor = '#fbbf24'; }

    if (a.decayed) {
      const dg = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 8);
      dg.addColorStop(0, '#475569'); dg.addColorStop(1, '#1e293b');
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.arc(a.x, a.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#334155'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
      ctx.fillText('✓', a.x, a.y + 2);
    } else if (a.emitting) {
      const flash = Math.sin((t - a.emitStart) * 20) > 0;
      const ag = ctx.createRadialGradient(a.x - 3, a.y - 3, 0, a.x, a.y, 12);
      ag.addColorStop(0, flash ? '#fff' : '#fef08a');
      ag.addColorStop(0.35, '#fbbf24');
      ag.addColorStop(1, '#f97316');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.arc(a.x, a.y, 12, 0, Math.PI * 2); ctx.fill();
    } else {
      const ag = ctx.createRadialGradient(a.x - 3, a.y - 3, 0, a.x, a.y, 10);
      ag.addColorStop(0, '#6ee7b7');
      ag.addColorStop(0.5, '#10b981');
      ag.addColorStop(1, '#065f46');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.arc(a.x, a.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a7f3d0'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
      ctx.fillText(a.element, a.x, a.y + 2);
    }
    ctx.restore();
  });

  // ── Decay rays ──────────────────────────────────────────────────────────
  raysRef.current = raysRef.current.filter(p => {
    p.x += p.vx; p.y += p.vy; p.life -= 0.022;
    const pColors: Record<string, string> = { α: '#f97316', β: '#818cf8', γ: '#22d3ee' };
    const col = pColors[p.type];
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = col;
    ctx.fillStyle = col;
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.type === 'α' ? 5 : p.type === 'β' ? 3.5 : 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
    ctx.fillText(p.type, p.x, p.y - 7);
    ctx.restore();
    return p.life > 0 && p.x > 0 && p.x < divX && p.y > 0 && p.y < H;
  });

  // ── Decay Curve (right panel) ────────────────────────────────────────────
  const cX = divX + 12, cY = 30;
  const cW = W - cX - 12, cH = H - 80;

  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  roundRect(ctx, cX - 5, cY - 5, cW + 10, cH + 10, 8);
  ctx.fill();

  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('منحنى الاضمحلال الإشعاعي', cX + cW / 2, cY + 12);

  const maxT = Math.max(t + 0.5, halfLife * 3.5);

  // Theoretical curve
  ctx.strokeStyle = 'rgba(239,68,68,0.35)';
  ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const tt = (i / 100) * maxT;
    const nn = N0 * Math.exp(-lambda * tt);
    const px = cX + (tt / maxT) * cW;
    const py = cY + 20 + (1 - nn / N0) * (cH - 25);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke(); ctx.setLineDash([]);

  // Actual curve
  if (histRef.current.length > 1) {
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
    ctx.beginPath();
    histRef.current.forEach((pt, i) => {
      const px = cX + (pt.t / maxT) * cW;
      const py = cY + 20 + (1 - pt.n / N0) * (cH - 25);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  // Half-life markers
  for (let k = 1; k <= 4; k++) {
    const mx = cX + (k * halfLife / maxT) * cW;
    if (mx < cX + cW) {
      ctx.strokeStyle = 'rgba(251,191,36,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(mx, cY + 18); ctx.lineTo(mx, cY + cH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`t½×${k}`, mx, cY + cH + 10);
    }
  }

  // Axes
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cX, cY + 18); ctx.lineTo(cX, cY + cH);
  ctx.lineTo(cX + cW, cY + cH);
  ctx.stroke();

  ctx.fillStyle = '#64748b'; ctx.font = '8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('الزمن (s)', cX + cW / 2, cY + cH + 22);
  ctx.save();
  ctx.translate(cX - 12, cY + cH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('N الذرات الباقية', 0, 0);
  ctx.restore();

  // ── Stats ─────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(15,23,42,0.9)';
  roundRect(ctx, divX + 8, H - 48, cW - 3, 44, 6);
  ctx.fill();

  const activity = alive * lambda;
  const sRows = [
    { t: `ذرات باقية: ${alive}/${N0}  (${((alive/N0)*100).toFixed(0)}%)`, c: '#4ade80' },
    { t: `النشاط: ${activity.toFixed(2)} تحلل/ث`, c: '#f97316' },
    { t: `t½=${halfLife}s  |  λ=${lambda.toFixed(3)} s⁻¹  |  t=${t.toFixed(1)}s`, c: '#94a3b8' },
  ];
  sRows.forEach((r, i) => {
    ctx.fillStyle = r.c; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.t, divX + 14, H - 36 + i * 14);
  });

  // Legend
  [['α', '#f97316', 'ألفا'], ['β', '#818cf8', 'بيتا'], ['γ', '#22d3ee', 'غاما']].forEach(([sym, col, name], i) => {
    ctx.save();
    ctx.shadowBlur = 6; ctx.shadowColor = col as string;
    ctx.fillStyle = col as string;
    ctx.beginPath(); ctx.arc(14 + i * 80, H - 12, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#94a3b8'; ctx.font = '8px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`${sym} (${name})`, 24 + i * 80, H - 9);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 💥 5. NUCLEAR FISSION — Chain Reaction
// ═══════════════════════════════════════════════════════════════════════════

type FissState = 'idle' | 'approaching' | 'vibrating' | 'splitting' | 'fragments';
interface FissFragment { x: number; y: number; vx: number; vy: number; r: number; color: string; trail: { x: number; y: number }[]; label: string; }
interface ChainNeutron { x: number; y: number; vx: number; vy: number; life: number; }

function drawNuclearFission(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>,
  isPlaying: boolean,
  stateRef: React.MutableRefObject<FissState>,
  neutronRef: React.MutableRefObject<{ x: number; y: number }>,
  fissTimeRef: React.MutableRefObject<number>,
  fragmentsRef: React.MutableRefObject<FissFragment[]>,
  chainRef: React.MutableRefObject<ChainNeutron[]>,
  t: number
) {
  const cx = W / 2, cy = H / 2;

  // Background
  ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(15,23,42,0.5)'; ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // State machine
  if (isPlaying) {
    const elapsed = t - fissTimeRef.current;
    switch (stateRef.current) {
      case 'idle':
        neutronRef.current = { x: 55, y: cy };
        stateRef.current = 'approaching';
        fissTimeRef.current = t;
        break;

      case 'approaching':
        neutronRef.current.x += 2.8;
        if (neutronRef.current.x >= cx - 42) {
          stateRef.current = 'vibrating';
          fissTimeRef.current = t;
        }
        break;

      case 'vibrating':
        if (elapsed > 1.8) {
          stateRef.current = 'splitting';
          fissTimeRef.current = t;
          fragmentsRef.current = [
            { x: cx, y: cy, vx: -2.2, vy: -1.2, r: 24, color: '#3b82f6', trail: [], label: '¹⁴¹Ba' },
            { x: cx, y: cy, vx: 2.2, vy: 1.2, r: 20, color: '#8b5cf6', trail: [], label: '⁹²Kr' },
          ];
          for (let i = 0; i < 3; i++) {
            const ang = (i / 3) * Math.PI * 2 + 0.4;
            chainRef.current.push({ x: cx, y: cy, vx: Math.cos(ang) * 3.5, vy: Math.sin(ang) * 3.5, life: 1 });
          }
        }
        break;

      case 'splitting':
        fragmentsRef.current.forEach(f => {
          f.trail.push({ x: f.x, y: f.y });
          if (f.trail.length > 22) f.trail.shift();
          f.x += f.vx; f.y += f.vy;
          f.vx *= 0.985; f.vy *= 0.985;
        });
        chainRef.current.forEach(n => { n.x += n.vx; n.y += n.vy; n.life -= 0.004; });
        chainRef.current = chainRef.current.filter(n => n.life > 0 && n.x > 0 && n.x < W && n.y > 0 && n.y < H);
        if (elapsed > 6) {
          stateRef.current = 'idle';
          fragmentsRef.current = [];
          chainRef.current = [];
          neutronRef.current = { x: 55, y: cy };
          fissTimeRef.current = t;
        }
        break;
    }
  }

  const state = stateRef.current;
  const elapsed2 = t - fissTimeRef.current;
  const vibAmp = state === 'vibrating' ? Math.min(elapsed2 * 8, 20) * Math.sin(t * 14) : 0;

  // ── U-235 Nucleus (if not split) ────────────────────────────────────────
  if (state !== 'splitting' || fragmentsRef.current.length === 0) {
    const nR = 40 + (state === 'vibrating' ? Math.abs(vibAmp * 0.5) : 0);
    const nW = nR + (state === 'vibrating' ? vibAmp : 0);
    const nH = nR - (state === 'vibrating' ? Math.abs(vibAmp * 0.3) : 0);

    ctx.save();
    ctx.shadowBlur = 22 + (state === 'vibrating' ? Math.abs(vibAmp) : 0);
    ctx.shadowColor = '#3b82f6';
    const ng = ctx.createRadialGradient(cx - 10, cy - 10, 0, cx, cy, nW);
    ng.addColorStop(0, '#93c5fd');
    ng.addColorStop(0.3, '#3b82f6');
    ng.addColorStop(0.7, '#1d4ed8');
    ng.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(10, nW), Math.max(10, nH), 0, 0, Math.PI * 2);
    ctx.fill();

    // Internal protons/neutrons
    const dots = [[-14,-12],[14,-12],[0,-2],[-22,5],[22,5],[0,-22],[-10,18],[10,18],[6,-10],[-6,10],[-18,-3],[18,-3]];
    dots.forEach(([px, py], i) => {
      ctx.fillStyle = i % 2 === 0 ? '#f87171' : '#94a3b8';
      ctx.beginPath(); ctx.arc(cx + px, cy + py, 5.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    ctx.fillStyle = '#bfdbfe'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('²³⁵U', cx, cy - nH - 12);
    ctx.fillStyle = '#64748b'; ctx.font = '8px Arial';
    ctx.fillText('92 بروتون • 143 نيوترون', cx, cy + nH + 16);

    // Energy level rings (decor)
    for (let k = 1; k <= 3; k++) {
      ctx.strokeStyle = `rgba(59,130,246,${0.12 - k * 0.03})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, nW + k * 25, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ── Approaching neutron ──────────────────────────────────────────────────
  if (state === 'approaching' || state === 'idle') {
    const n = neutronRef.current;
    ctx.save();
    ctx.shadowBlur = 12; ctx.shadowColor = '#94a3b8';
    const ng = ctx.createRadialGradient(n.x - 2, n.y - 2, 0, n.x, n.y, 8);
    ng.addColorStop(0, '#e2e8f0'); ng.addColorStop(1, '#475569');
    ctx.fillStyle = ng;
    ctx.beginPath(); ctx.arc(n.x, n.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('n⁰', n.x, n.y - 12);

    ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(22, cy); ctx.lineTo(n.x - 12, cy); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Fragments ────────────────────────────────────────────────────────────
  fragmentsRef.current.forEach(f => {
    f.trail.forEach((pt, i) => {
      ctx.fillStyle = `rgba(99,102,241,${(i / f.trail.length) * 0.25})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, f.r * (i / f.trail.length) * 0.8, 0, Math.PI * 2); ctx.fill();
    });
    ctx.save();
    ctx.shadowBlur = 18; ctx.shadowColor = f.color;
    const fg = ctx.createRadialGradient(f.x - 6, f.y - 6, 0, f.x, f.y, f.r);
    fg.addColorStop(0, '#fff'); fg.addColorStop(0.4, f.color); fg.addColorStop(1, '#0f172a');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#e0e7ff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(f.label, f.x, f.y + 4);
  });

  // ── Chain neutrons ───────────────────────────────────────────────────────
  chainRef.current.forEach(n => {
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = '#94a3b8';
    ctx.fillStyle = `rgba(148,163,184,${n.life})`;
    ctx.beginPath(); ctx.arc(n.x, n.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = `rgba(100,116,139,${n.life})`; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('n⁰', n.x, n.y - 10);
  });

  // ── Energy flash at split moment ─────────────────────────────────────────
  if (state === 'splitting' && elapsed2 < 1.2) {
    const alpha = (1 - elapsed2 / 1.2) * 0.55;
    const flashR = elapsed2 * 180;
    ctx.save();
    ctx.globalAlpha = alpha;
    const flashG = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
    flashG.addColorStop(0, '#fff');
    flashG.addColorStop(0.2, '#fef08a');
    flashG.addColorStop(0.5, '#f97316');
    flashG.addColorStop(1, 'transparent');
    ctx.fillStyle = flashG;
    ctx.beginPath(); ctx.arc(cx, cy, flashR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Info panel ───────────────────────────────────────────────────────────
  const stateLabels: Record<FissState, string> = {
    idle: '⬤ جاهز — سيبدأ الانشطار تلقائياً',
    approaching: '← نيوترون بطيء يقترب من ²³⁵U',
    vibrating: '⚡ النواة تمتص النيوترون وتتذبذب...',
    splitting: '💥 انشطار نووي! تفاعل متسلسل',
    fragments: '✓ شظايا + نيوترونات جديدة'
  };

  ctx.fillStyle = 'rgba(15,23,42,0.92)';
  roundRect(ctx, 8, H - 72, 380, 67, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239,68,68,0.3)'; ctx.lineWidth = 1;
  roundRect(ctx, 8, H - 72, 380, 67, 8);
  ctx.stroke();

  ctx.fillStyle = state === 'splitting' ? '#f97316' : '#94a3b8';
  ctx.font = 'bold 10px Arial'; ctx.textAlign = 'left';
  ctx.fillText(stateLabels[state] || '', 16, H - 56);
  ctx.fillStyle = '#64748b'; ctx.font = '8px monospace';
  ctx.fillText('²³⁵U + n⁰  →  ¹⁴¹Ba + ⁹²Kr + 3n⁰ + 200 MeV', 16, H - 40);
  ctx.fillStyle = '#fbbf24'; ctx.font = '8px monospace';
  ctx.fillText('طاقة محررة: ≈200 MeV = 3.2×10⁻¹¹ J  |  E=Δmc²', 16, H - 26);
  ctx.fillStyle = '#475569';
  ctx.fillText(`حالة: ${state}  |  t=${t.toFixed(1)}s`, 16, H - 12);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 6. SPECIAL RELATIVITY — Two Frames + Clocks + Ruler
// ═══════════════════════════════════════════════════════════════════════════

function drawSpaceship(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const w = 70 * scale, h = 28;
  ctx.save();
  ctx.shadowBlur = 12; ctx.shadowColor = '#818cf8';
  const sg = ctx.createLinearGradient(x, y, x + w, y + h);
  sg.addColorStop(0, '#4c1d95'); sg.addColorStop(0.5, '#7c3aed'); sg.addColorStop(1, '#4c1d95');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(x + w, y + h / 2);
  ctx.lineTo(x + w * 0.65, y);
  ctx.lineTo(x, y + h * 0.2);
  ctx.lineTo(x, y + h * 0.8);
  ctx.lineTo(x + w * 0.65, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Engine flame
  const fl = 12 + 8 * Math.sin(Date.now() * 0.015);
  const fg = ctx.createLinearGradient(x, 0, x - fl, 0);
  fg.addColorStop(0, '#f97316'); fg.addColorStop(0.5, '#fbbf24'); fg.addColorStop(1, 'transparent');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.28);
  ctx.lineTo(x - fl, y + h * 0.5);
  ctx.lineTo(x, y + h * 0.72);
  ctx.closePath();
  ctx.fill();

  // Window
  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.arc(x + w * 0.55, y + h / 2, h * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpecialRelativity(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>,
  isPlaying: boolean,
  t: number
) {
  const v = clamp(vars.v ?? 200000000, 0, 2.99e8);
  const c = 3e8;
  const beta = v / c;
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const t0 = vars.t0 ?? 10;

  // Background
  ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, H);

  // Stars (parallax)
  const STARS2 = [[60,25],[155,55],[250,18],[370,42],[500,28],[610,48],[690,22],[30,145],[180,175],[310,160],[460,188],[600,170],[720,140]];
  STARS2.forEach(([sx, sy]) => {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.3})`;
    ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI * 2); ctx.fill();
  });

  const panel1Y = 18, panel2Y = H / 2 + 10;
  const panelH = H / 2 - 24;

  // Panel backgrounds
  ctx.fillStyle = 'rgba(8,16,38,0.85)';
  roundRect(ctx, 8, panel1Y, W - 16, panelH, 8);
  ctx.fill();
  ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 1;
  roundRect(ctx, 8, panel1Y, W - 16, panelH, 8);
  ctx.stroke();

  ctx.fillStyle = 'rgba(20,10,45,0.88)';
  roundRect(ctx, 8, panel2Y, W - 16, panelH, 8);
  ctx.fill();
  ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 1;
  roundRect(ctx, 8, panel2Y, W - 16, panelH, 8);
  ctx.stroke();

  // Panel labels
  ctx.fillStyle = '#64748b'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
  ctx.fillText('📍 الإطار الساكن — المراقب على الأرض', 18, panel1Y + 16);
  ctx.fillStyle = '#818cf8'; ctx.font = 'bold 9px Arial';
  ctx.fillText(`🚀 الإطار المتحرك — v = ${(beta * 100).toFixed(2)}%c (β=${beta.toFixed(4)})`, 18, panel2Y + 16);

  // ── Clock 1 — Stationary ───────────────────────────────────────────────
  const clk1X = 90, clk1Y = panel1Y + panelH / 2 + 10;
  drawAnalogClock(ctx, clk1X, clk1Y, 38, isPlaying ? t : 0, '#22d3ee', false);
  ctx.fillStyle = '#94a3b8'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('t₀ (زمن صحيح)', clk1X, clk1Y + 48);
  ctx.fillStyle = '#22d3ee'; ctx.font = 'bold 9px monospace';
  ctx.fillText(`t = ${(isPlaying ? t : 0).toFixed(2)}s`, clk1X, clk1Y + 60);

  // ── Clock 2 — Dilated ─────────────────────────────────────────────────
  const clk2X = 90, clk2Y = panel2Y + panelH / 2 + 10;
  drawAnalogClock(ctx, clk2X, clk2Y, 38, isPlaying ? t / gamma : 0, '#818cf8', true);
  ctx.fillStyle = '#818cf8'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText(`t' = t₀/γ (أبطأ ×${gamma.toFixed(2)})`, clk2X, clk2Y + 48);
  ctx.fillStyle = '#a78bfa'; ctx.font = 'bold 9px monospace';
  ctx.fillText(`t' = ${(isPlaying ? t / gamma : 0).toFixed(2)}s`, clk2X, clk2Y + 60);

  // ── Ruler 1 — Stationary L₀ ───────────────────────────────────────────
  const rulerX = 160, ruler1Y = panel1Y + panelH / 2 - 5;
  drawRuler(ctx, rulerX, ruler1Y, 200, '#22d3ee', 'L₀ = 1.0 m (الطول الطبيعي)');

  // ── Ruler 2 — Contracted L ────────────────────────────────────────────
  const ruler2Y = panel2Y + panelH / 2 - 5;
  const contractedLen = 200 / gamma;
  drawRuler(ctx, rulerX, ruler2Y, contractedLen, '#818cf8', `L = L₀/γ = ${(1 / gamma).toFixed(3)} m`);

  // ── Moving Spaceship ──────────────────────────────────────────────────
  const shipSpd = beta * 80;
  const shipX = isPlaying ? (160 + ((t * shipSpd) % (W - 280))) : W * 0.55;
  drawSpaceship(ctx, shipX, panel2Y + panelH / 2 - 28, 1 / gamma);

  // ── γ Info Panel (right side) ─────────────────────────────────────────
  const infoX = W - 225, infoY = panel1Y + 4;
  const infoH = H - 30;
  ctx.fillStyle = 'rgba(15,23,42,0.95)';
  roundRect(ctx, infoX, infoY, 215, infoH, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.35)'; ctx.lineWidth = 1;
  roundRect(ctx, infoX, infoY, 215, infoH, 8);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
  ctx.fillText('معاملات النسبية الخاصة', infoX + 107, infoY + 18);
  ctx.fillStyle = '#334155'; ctx.font = '7px Arial';
  ctx.fillText('أينشتاين 1905', infoX + 107, infoY + 30);

  const infoRows = [
    { l: 'السرعة v', v: `${(v / 1e6).toFixed(2)} Mm/s`, c: '#f97316' },
    { l: 'β = v/c', v: `${beta.toFixed(5)}`, c: '#fbbf24' },
    { l: 'γ (لورنتز)', v: gamma.toFixed(5), c: '#22d3ee' },
    { l: 'تمدد الزمن', v: `×${gamma.toFixed(4)}`, c: '#818cf8' },
    { l: 'انكماش الطول', v: `${(100 / gamma).toFixed(2)}%`, c: '#34d399' },
    { l: 'زيادة الكتلة', v: `×${gamma.toFixed(4)}`, c: '#f87171' },
    { l: 'الزمن الصحيح t₀', v: `${t0} s`, c: '#94a3b8' },
    { l: 'الزمن المتمدد t', v: `${(t0 * gamma).toFixed(3)} s`, c: '#818cf8' },
    { l: 'الطول المنكمش L', v: `${(t0 / gamma).toFixed(3)} m`, c: '#34d399' },
  ];

  infoRows.forEach((r, i) => {
    const ry = infoY + 46 + i * 24;
    ctx.fillStyle = 'rgba(30,41,59,0.75)';
    roundRect(ctx, infoX + 8, ry - 12, 198, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.l + ':', infoX + 13, ry + 3);
    ctx.fillStyle = r.c; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(r.v, infoX + 200, ry + 3);
  });

  // γ formula
  ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('γ = 1 / √(1 − v²/c²)', infoX + 107, infoY + 46 + infoRows.length * 24 + 5);

  // γ bar
  const barY = infoY + 46 + infoRows.length * 24 + 20;
  ctx.fillStyle = '#1e293b';
  roundRect(ctx, infoX + 10, barY, 194, 11, 4);
  ctx.fill();
  const fill = clamp((gamma - 1) / 6, 0, 1);
  const barG = ctx.createLinearGradient(infoX + 10, 0, infoX + 204, 0);
  barG.addColorStop(0, '#22d3ee'); barG.addColorStop(0.5, '#818cf8'); barG.addColorStop(1, '#f87171');
  ctx.fillStyle = barG;
  roundRect(ctx, infoX + 10, barY, 194 * fill, 11, 4);
  ctx.fill();
  ctx.fillStyle = '#64748b'; ctx.font = '7px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`γ = ${gamma.toFixed(3)} (يزيد كلما زادت السرعة)`, infoX + 107, barY + 22);

  // Warning when approaching c
  if (beta > 0.95) {
    ctx.fillStyle = 'rgba(239,68,68,0.15)';
    roundRect(ctx, infoX + 8, barY + 28, 198, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#f87171'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
    ctx.fillText('⚠ قريب جداً من سرعة الضوء!', infoX + 107, barY + 41);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎬 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export interface ModernPhysicsCanvasProps {
  experimentId: string;
  vars: Record<string, number>;
  results: Record<string, number>;
  isPlaying: boolean;
}

const MODERN_PHYSICS_IDS = new Set([
  'photoelectric', 'bohr-model', 'special-relativity', 'special-relativity2',
  'radioactivity', 'nuclear-physics', 'nuclear-fission', 'double-slit',
  'quantum-energy', 'wave-particle', 'heisenberg', 'compton',
  'laser', 'semiconductor', 'fusion-fission', 'particle-physics',
]);

export function isModernPhysicsExperiment(id: string): boolean {
  return MODERN_PHYSICS_IDS.has(id);
}

export default function ModernPhysicsCanvas({ experimentId, vars, results, isPlaying }: ModernPhysicsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  // Photoelectric particles
  const photoParticlesRef = useRef<PhotoParticle[]>([]);
  // Double-slit state
  const dotsRef = useRef<{ y: number }[]>([]);
  const slitParticlesRef = useRef<SlitParticle[]>([]);
  // Radioactive decay state
  const atomsRef = useRef<AtomCell[]>([]);
  const raysRef = useRef<DecayRay[]>([]);
  const histRef = useRef<{ t: number; n: number }[]>([]);
  // Fission state
  const fissStateRef = useRef<FissState>('idle');
  const fissNeutronRef = useRef<{ x: number; y: number }>({ x: 55, y: 190 });
  const fissTimeRef = useRef<number>(0);
  const fragmentsRef = useRef<FissFragment[]>([]);
  const chainRef = useRef<ChainNeutron[]>([]);

  // Reset all state when experiment changes
  useEffect(() => {
    photoParticlesRef.current = [];
    dotsRef.current = [];
    slitParticlesRef.current = [];
    atomsRef.current = [];
    raysRef.current = [];
    histRef.current = [];
    fragmentsRef.current = [];
    chainRef.current = [];
    fissStateRef.current = 'idle';
    fissNeutronRef.current = { x: 55, y: 190 };
    fissTimeRef.current = 0;
    tRef.current = 0;
  }, [experimentId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    const animate = (timestamp: number) => {
      const dt = Math.min((timestamp - (lastTsRef.current || timestamp)) / 1000, 0.05);
      lastTsRef.current = timestamp;
      if (isPlaying) tRef.current += dt;
      const t = tRef.current;

      ctx.clearRect(0, 0, W, H);

      switch (experimentId) {
        case 'photoelectric':
          drawPhotoelectric(ctx, W, H, vars, results, isPlaying, photoParticlesRef, t);
          break;
        case 'bohr-model':
          drawBohrModel(ctx, W, H, vars, results, isPlaying, t);
          break;
        case 'double-slit':
          drawDoubleSlit(ctx, W, H, vars, isPlaying, dotsRef, slitParticlesRef, t);
          break;
        case 'radioactivity':
        case 'nuclear-physics':
          drawRadioactiveDecay(ctx, W, H, vars, results, isPlaying, atomsRef, raysRef, histRef, t);
          break;
        case 'nuclear-fission':
        case 'fusion-fission':
          drawNuclearFission(ctx, W, H, vars, isPlaying, fissStateRef, fissNeutronRef, fissTimeRef, fragmentsRef, chainRef, t);
          break;
        case 'special-relativity':
        case 'special-relativity2':
          drawSpecialRelativity(ctx, W, H, vars, isPlaying, t);
          break;
        default:
          // Generic modern physics background
          ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, H);
          const pulse = 50 + 15 * Math.sin(t * 1.5);
          const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, pulse);
          grd.addColorStop(0, 'rgba(99,102,241,0.3)');
          grd.addColorStop(1, 'transparent');
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.arc(W / 2, H / 2, pulse, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#818cf8'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
          ctx.fillText(`⚛️  ${experimentId}`, W / 2, H / 2 + 5);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    lastTsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [experimentId, vars, results, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={720}
      height={340}
      className="w-full rounded-xl"
    />
  );
}
