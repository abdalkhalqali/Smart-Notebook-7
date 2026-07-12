import React, { useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 COLOR & MATH HELPERS
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
function wlColor(nm: number, a = 1) {
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
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.98)'; ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
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
  const fg = ctx.createLinearGradient(x, y, x + w, y + h);
  fg.addColorStop(0, '#94a3b8'); fg.addColorStop(0.35, accent);
  fg.addColorStop(0.7, '#334155'); fg.addColorStop(1, '#0f172a');
  ctx.fillStyle = fg; ctx.fillRect(x, y, w, h);
  const tg = ctx.createLinearGradient(x, y - depth, x + depth, y);
  tg.addColorStop(0, '#e2e8f0'); tg.addColorStop(1, '#94a3b8');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + depth, y - depth);
  ctx.lineTo(x + w + depth, y - depth); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
  const rg = ctx.createLinearGradient(x + w, y, x + w + depth, y);
  rg.addColorStop(0, '#475569'); rg.addColorStop(1, '#1e293b');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + depth, y - depth);
  ctx.lineTo(x + w + depth, y + h - depth); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
}

function drawAmmeter(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, current: number, maxI: number) {
  const cg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
  cg.addColorStop(0, '#334155'); cg.addColorStop(1, '#0f172a');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, -Math.PI * 0.85, Math.PI * 0.85); ctx.stroke();
  for (let i = 0; i <= 10; i++) {
    const ang = lerp(-Math.PI * 0.8, Math.PI * 0.8, i / 10) - Math.PI / 2;
    const inner = i % 5 === 0 ? r * 0.58 : r * 0.68;
    ctx.strokeStyle = i % 5 === 0 ? '#64748b' : '#334155';
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
    ctx.lineTo(cx + Math.cos(ang) * (r * 0.85), cy + Math.sin(ang) * (r * 0.85)); ctx.stroke();
  }
  const norm = clamp(current / maxI, 0, 1);
  const needleAng = lerp(-Math.PI * 0.8, Math.PI * 0.8, norm) - Math.PI / 2;
  ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = '#f97316';
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(needleAng) * r * 0.2, cy - Math.sin(needleAng) * r * 0.2);
  ctx.lineTo(cx + Math.cos(needleAng) * r * 0.78, cy + Math.sin(needleAng) * r * 0.78);
  ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#94a3b8'; ctx.font = `bold ${r * 0.28}px monospace`;
  ctx.textAlign = 'center'; ctx.fillText('μA', cx, cy + r * 0.42);
  ctx.fillStyle = current > 0 ? '#f97316' : '#475569';
  ctx.font = `bold ${r * 0.3}px monospace`;
  ctx.fillText(current.toFixed(1), cx, cy + r + 16);
}

function drawAnalogClock(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, timeSec: number, color: string, slowed = false) {
  const cg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 0, cx, cy, r);
  cg.addColorStop(0, '#1e293b'); cg.addColorStop(1, '#0a0f1e');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = slowed ? 2 : 1.5; ctx.stroke();
  if (slowed) {
    ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = color;
    ctx.strokeStyle = color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = color; ctx.lineWidth = i % 3 === 0 ? 2 : 0.8;
    ctx.globalAlpha = i % 3 === 0 ? 0.7 : 0.3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
    ctx.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  const sec = timeSec % 60, min = (timeSec / 60) % 60, hour = (timeSec / 3600) % 12;
  const hands = [
    { angle: (hour / 12) * Math.PI * 2 - Math.PI / 2, len: r * 0.55, w: 3, c: color },
    { angle: (min / 60) * Math.PI * 2 - Math.PI / 2, len: r * 0.75, w: 2, c: color },
    { angle: (sec / 60) * Math.PI * 2 - Math.PI / 2, len: r * 0.85, w: 1, c: slowed ? '#818cf8' : '#ef4444' },
  ];
  hands.forEach(h => {
    ctx.save(); if (slowed && h.w === 1) { ctx.shadowBlur = 12; ctx.shadowColor = '#818cf8'; }
    ctx.strokeStyle = h.c; ctx.lineWidth = h.w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(h.angle) * h.len, cy + Math.sin(h.angle) * h.len);
    ctx.stroke(); ctx.restore();
  });
  ctx.fillStyle = slowed ? '#818cf8' : color;
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
}

function drawRuler(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, color: string, label: string) {
  const h = 22;
  const rg = ctx.createLinearGradient(x, y, x, y + h);
  rg.addColorStop(0, '#1e293b'); rg.addColorStop(0.5, '#334155'); rg.addColorStop(1, '#1e293b');
  ctx.fillStyle = rg; ctx.fillRect(x, y, length, h);
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, length, h);
  for (let i = 0; i <= 10; i++) {
    const tx = x + (i / 10) * length;
    const tickH = i % 5 === 0 ? h * 0.65 : h * 0.35;
    ctx.strokeStyle = color; ctx.lineWidth = i % 5 === 0 ? 1.5 : 0.8;
    ctx.globalAlpha = i % 5 === 0 ? 0.8 : 0.4;
    ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y + tickH); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = color; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  ctx.fillText(label, x + length / 2, y - 5);
}

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#020617'); bg.addColorStop(1, '#050d1f');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(30,41,59,0.5)'; ctx.lineWidth = 0.4;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚡ 1. PHOTOELECTRIC EFFECT — Enhanced with Visible Electrons
// ═══════════════════════════════════════════════════════════════════════════

interface PhotoParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; r: number; color: string;
  type: 'photon' | 'electron' | 'spark' | 'bounce';
  trail: { x: number; y: number }[];
}

function drawPhotoelectric(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, results: Record<string, number>,
  isPlaying: boolean,
  particlesRef: React.MutableRefObject<PhotoParticle[]>,
  flashRef: React.MutableRefObject<{ x: number; y: number; life: number }[]>,
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

  drawBackground(ctx, W, H);

  // ── EM Spectrum Bar ──────────────────────────────────────────────────────
  const specX = 70, specY = 16, specW = W - 150, specH = 14;
  for (let i = 0; i < specW; i++) {
    const nm = 260 + (i / specW) * (800 - 260);
    ctx.fillStyle = wlColor(nm, 0.9); ctx.fillRect(specX + i, specY, 1, specH);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
  ctx.strokeRect(specX, specY, specW, specH);
  const ptrX = clamp(specX + ((wl - 260) / 540) * specW, specX, specX + specW);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(ptrX, specY - 2); ctx.lineTo(ptrX - 5, specY - 9); ctx.lineTo(ptrX + 5, specY - 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = photonColor; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText(`${wl}nm`, ptrX, specY - 11);
  const critX = clamp(specX + ((critWL - 260) / 540) * specW, specX, specX + specW);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(critX, specY + specH); ctx.lineTo(critX, specY + specH + 22); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#94a3b8'; ctx.font = '8px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`λc=${critWL.toFixed(0)}nm`, critX, specY + specH + 31);
  ctx.font = '8px Arial'; ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';  ctx.fillText('UV', specX, specY + specH + 10);
  ctx.textAlign = 'center'; ctx.fillText('مرئي', specX + specW / 2, specY + specH + 10);
  ctx.textAlign = 'right';  ctx.fillText('IR', specX + specW, specY + specH + 10);

  // ── Lamp ────────────────────────────────────────────────────────────────
  const lampX = 65, lampY = H / 2 + 10;
  const halo = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, 52);
  halo.addColorStop(0, wlColor(wl, 0.55 * intensity / 100));
  halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(lampX, lampY, 52, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.shadowBlur = 22 + 8 * Math.sin(t * 2); ctx.shadowColor = photonColor;
  const bulbG = ctx.createRadialGradient(lampX - 6, lampY - 6, 0, lampX, lampY, 19);
  bulbG.addColorStop(0, '#fff'); bulbG.addColorStop(0.25, wlColor(wl, 1));
  bulbG.addColorStop(0.7, wlColor(wl, 0.6)); bulbG.addColorStop(1, '#1e293b');
  ctx.fillStyle = bulbG; ctx.beginPath(); ctx.arc(lampX, lampY, 19, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#475569'; ctx.fillRect(lampX - 7, lampY + 19, 14, 22); ctx.fillRect(lampX - 16, lampY + 38, 32, 7);
  ctx.fillStyle = '#64748b'; ctx.font = '8px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`I = ${intensity}%`, lampX, lampY + 56);

  // ── Beam ─────────────────────────────────────────────────────────────────
  const beamStart = lampX + 20, beamEnd = 248;
  const beamBG = ctx.createLinearGradient(beamStart, 0, beamEnd, 0);
  beamBG.addColorStop(0, wlColor(wl, 0.38 * intensity / 100));
  beamBG.addColorStop(0.6, wlColor(wl, 0.18 * intensity / 100));
  beamBG.addColorStop(1, wlColor(wl, 0.04));
  ctx.fillStyle = beamBG;
  ctx.beginPath(); ctx.moveTo(beamStart, lampY - 22); ctx.lineTo(beamEnd, lampY - 8);
  ctx.lineTo(beamEnd, lampY + 8); ctx.lineTo(beamStart, lampY + 22); ctx.closePath(); ctx.fill();

  // ── Vacuum Tube ───────────────────────────────────────────────────────────
  const tubeCX = 380, tubeCY = H / 2 + 10, tubeRX = 175, tubeRY = 80;
  ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = wlColor(wl, 0.3);
  const glassG = ctx.createRadialGradient(tubeCX - tubeRX * 0.35, tubeCY - tubeRY * 0.4, 0, tubeCX, tubeCY, tubeRX * 1.05);
  glassG.addColorStop(0, 'rgba(148,163,184,0.05)'); glassG.addColorStop(0.6, 'rgba(15,23,42,0.04)'); glassG.addColorStop(1, 'rgba(148,163,184,0.12)');
  ctx.fillStyle = glassG; ctx.beginPath(); ctx.ellipse(tubeCX, tubeCY, tubeRX, tubeRY, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(tubeCX, tubeCY, tubeRX, tubeRY, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(tubeCX, tubeCY - tubeRY * 0.32, tubeRX * 0.55, tubeRY * 0.14, 0, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // ── Cathode ───────────────────────────────────────────────────────────────
  const cathX = tubeCX - tubeRX + 38, cathY = tubeCY - 55, cathW = 15, cathH = 110;
  draw3DPlate(ctx, cathX, cathY, cathW, cathH, 9, matColor);
  ctx.save(); ctx.globalAlpha = 0.4;
  const shimG = ctx.createLinearGradient(cathX, cathY, cathX, cathY + cathH);
  shimG.addColorStop(0, matColor); shimG.addColorStop(0.5, 'transparent'); shimG.addColorStop(1, matColor);
  ctx.fillStyle = shimG; ctx.fillRect(cathX, cathY, cathW, cathH); ctx.restore();
  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  roundRect(ctx, cathX - 2, cathY - 30, cathW + 4, 22, 4); ctx.fill();
  ctx.fillStyle = matColor; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText(matName, cathX + cathW / 2, cathY - 15);
  ctx.fillStyle = '#64748b'; ctx.font = '7px monospace';
  ctx.fillText(`φ=${phi.toFixed(1)}eV`, cathX + cathW / 2, cathY - 4);
  ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cathX + cathW / 2, cathY + cathH); ctx.lineTo(cathX + cathW / 2, tubeCY + tubeRY + 20); ctx.stroke();

  // ── Anode ─────────────────────────────────────────────────────────────────
  const anodeX = tubeCX + tubeRX - 48, anodeY = tubeCY - 42, anodeW = 12, anodeH = 84;
  const anodeG = ctx.createLinearGradient(anodeX, anodeY, anodeX, anodeY + anodeH);
  anodeG.addColorStop(0, '#94a3b8'); anodeG.addColorStop(0.5, '#64748b'); anodeG.addColorStop(1, '#1e293b');
  ctx.fillStyle = anodeG; ctx.fillRect(anodeX, anodeY, anodeW, anodeH);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.strokeRect(anodeX, anodeY, anodeW, anodeH);
  ctx.fillStyle = '#64748b'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
  ctx.fillText('+', anodeX + anodeW / 2, anodeY - 8);
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(anodeX + anodeW / 2, anodeY); ctx.lineTo(anodeX + anodeW / 2, tubeCY - tubeRY - 20); ctx.stroke();

  // ── Circuit wires ──────────────────────────────────────────────────────────
  const circY1 = tubeCY - tubeRY - 20, circY2 = tubeCY + tubeRY + 20;
  const ammX = W - 68, ammY = tubeCY;
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(anodeX + anodeW / 2, circY1); ctx.lineTo(ammX, circY1); ctx.lineTo(ammX, ammY - 32); ctx.stroke();
  ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cathX + cathW / 2, circY2); ctx.lineTo(ammX, circY2); ctx.lineTo(ammX, ammY + 32); ctx.stroke();
  drawAmmeter(ctx, ammX, ammY, 32, current, 100);

  // ── Flash effects at cathode surface ────────────────────────────────────────
  if (isPlaying) {
    flashRef.current.forEach(fl => {
      const flashAlpha = fl.life;
      const flashR = (1 - fl.life) * 30 + 5;
      ctx.save(); ctx.globalAlpha = flashAlpha * 0.7;
      const flashG = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, flashR);
      flashG.addColorStop(0, '#fff'); flashG.addColorStop(0.3, '#fef08a'); flashG.addColorStop(1, 'transparent');
      ctx.fillStyle = flashG; ctx.beginPath(); ctx.arc(fl.x, fl.y, flashR, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    flashRef.current = flashRef.current.filter(fl => { fl.life -= 0.07; return fl.life > 0; });
  }

  // ── Particles ──────────────────────────────────────────────────────────────
  if (isPlaying) {
    const numSpawn = Math.ceil(intensity / 40);
    for (let i = 0; i < numSpawn; i++) {
      if (Math.random() < intensity / 500) {
        const yOff = (Math.random() - 0.5) * 28;
        particlesRef.current.push({
          x: lampX + 22, y: lampY + yOff,
          vx: 3.4 + Math.random() * 1.5, vy: (Math.random() - 0.5) * 0.25,
          life: 1, maxLife: 1, r: 3.5, color: photonColor, type: 'photon', trail: []
        });
      }
    }

    particlesRef.current = particlesRef.current.filter(p => {
      if (p.type === 'electron') {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 12) p.trail.shift();
      }
      p.x += p.vx; p.y += p.vy;

      if (p.type === 'photon' && p.x >= cathX - 2 && p.x <= cathX + cathW + 14 && p.y >= cathY - 5 && p.y <= cathY + cathH + 5) {
        // Flash at impact point
        flashRef.current.push({ x: cathX + cathW + 2, y: p.y, life: 1 });

        if (hasEmission) {
          const numElectrons = KE > 2 ? 4 : KE > 1 ? 3 : 2;
          for (let k = 0; k < numElectrons; k++) {
            const speed = 2.5 + KE * 1.0 + Math.random() * 1.2;
            const spreadAngle = (Math.random() - 0.5) * 1.2;
            particlesRef.current.push({
              x: cathX + cathW + 6, y: p.y + (Math.random() - 0.5) * 14,
              vx: speed * Math.cos(spreadAngle), vy: speed * Math.sin(spreadAngle) + (Math.random() - 0.5) * 1.5,
              life: 2.0, maxLife: 2.0, r: 7, color: '#fbbf24', type: 'electron', trail: []
            });
          }
          for (let k = 0; k < 6; k++) {
            particlesRef.current.push({
              x: cathX + cathW, y: p.y,
              vx: -1 - Math.random() * 2.5, vy: (Math.random() - 0.5) * 4,
              life: 0.7, maxLife: 0.7, r: 2.5, color: matColor, type: 'spark', trail: []
            });
          }
        } else {
          for (let k = 0; k < 3; k++) {
            particlesRef.current.push({
              x: cathX, y: p.y,
              vx: -(p.vx * 0.5 + Math.random() * 0.5), vy: (Math.random() - 0.5) * 2.5,
              life: 0.8, maxLife: 0.8, r: 3, color: wlColor(wl, 0.6), type: 'bounce', trail: []
            });
          }
        }
        return false;
      }

      if (p.type !== 'photon') { p.life -= 0.014; }
      else if (p.x > anodeX + anodeW + 10 || p.x < 0) return false;
      return p.life > 0;
    });

    if (particlesRef.current.length > 300) particlesRef.current = particlesRef.current.slice(-260);
  }

  // Draw particles
  particlesRef.current.forEach(p => {
    const alpha = p.type === 'photon' ? 0.95 : p.life / p.maxLife;
    ctx.save();

    if (p.type === 'electron') {
      // Draw trail first
      p.trail.forEach((pt, i) => {
        const ta = (i / p.trail.length) * alpha * 0.6;
        ctx.fillStyle = `rgba(251,191,36,${ta})`;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, p.r * (i / p.trail.length) * 0.7, 0, Math.PI * 2); ctx.fill();
      });
      // Electron glow
      ctx.shadowBlur = 22; ctx.shadowColor = '#fbbf24';
      const eGlow = ctx.createRadialGradient(p.x - 2, p.y - 2, 0, p.x, p.y, p.r * 2.5);
      eGlow.addColorStop(0, `rgba(255,255,200,${alpha})`);
      eGlow.addColorStop(0.4, `rgba(251,191,36,${alpha * 0.8})`);
      eGlow.addColorStop(1, `rgba(251,191,36,0)`);
      ctx.fillStyle = eGlow; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2); ctx.fill();
      // Core
      const eCore = ctx.createRadialGradient(p.x - 2, p.y - 2, 0, p.x, p.y, p.r);
      eCore.addColorStop(0, `rgba(255,255,255,${alpha})`);
      eCore.addColorStop(0.5, `rgba(251,191,36,${alpha})`);
      eCore.addColorStop(1, `rgba(245,158,11,${alpha})`);
      ctx.fillStyle = eCore; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      // Label
      ctx.fillStyle = `rgba(255,255,200,${alpha * 0.95})`;
      ctx.font = `bold 9px Arial`; ctx.textAlign = 'center';
      ctx.fillText('e⁻', p.x, p.y - p.r - 5);

    } else if (p.type === 'photon') {
      glowDot(ctx, p.x, p.y, p.r, p.color, p.r * 3.8);
    } else {
      ctx.shadowBlur = 7; ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });

  // ── Electron count display ────────────────────────────────────────────────
  const electronCount = particlesRef.current.filter(p => p.type === 'electron').length;
  if (hasEmission && electronCount > 0) {
    ctx.fillStyle = 'rgba(251,191,36,0.15)';
    roundRect(ctx, tubeCX - 80, tubeCY - tubeRY - 50, 160, 28, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(251,191,36,0.4)'; ctx.lineWidth = 1;
    roundRect(ctx, tubeCX - 80, tubeCY - tubeRY - 50, 160, 28, 6); ctx.stroke();
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`⚡ ${electronCount} إلكترون منبعث`, tubeCX, tubeCY - tubeRY - 31);
  }

  // ── Physics Panel ─────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(15,23,42,0.92)';
  roundRect(ctx, 8, H - 105, 220, 100, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.35)'; ctx.lineWidth = 1;
  roundRect(ctx, 8, H - 105, 220, 100, 8); ctx.stroke();
  const rows = [
    { lbl: 'E_فوتون', val: `${E_photon.toFixed(3)} eV`, c: wlColor(wl, 1) },
    { lbl: 'φ (دالة الشغل)', val: `${phi.toFixed(2)} eV`, c: '#f87171' },
    { lbl: 'KE_max', val: hasEmission ? `${KE.toFixed(3)} eV` : '✗ لا انبعاث', c: '#fbbf24' },
    { lbl: 'V_stop', val: `${V_stop.toFixed(3)} V`, c: '#34d399' },
    { lbl: 'التيار I', val: `${current.toFixed(1)} μA`, c: '#f97316' },
  ];
  rows.forEach((row, i) => {
    ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(row.lbl + ':', 16, H - 91 + i * 18);
    ctx.fillStyle = row.c; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(row.val, 224, H - 91 + i * 18);
  });

  // ── Status Banner ─────────────────────────────────────────────────────────
  const bannerText = hasEmission
    ? `✓ انبعاث! hf=${E_photon.toFixed(2)}eV > φ=${phi.toFixed(2)}eV → KE=${KE.toFixed(2)}eV`
    : `✗ لا انبعاث — hf=${E_photon.toFixed(2)}eV < φ=${phi.toFixed(2)}eV`;
  ctx.fillStyle = hasEmission ? 'rgba(34,197,94,0.13)' : 'rgba(239,68,68,0.13)';
  roundRect(ctx, tubeCX - 205, H - 22, 410, 20, 5); ctx.fill();
  ctx.fillStyle = hasEmission ? '#4ade80' : '#f87171';
  ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText(bannerText, tubeCX, H - 8);
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

  const bg = ctx.createRadialGradient(W * 0.38, H / 2, 0, W * 0.38, H / 2, W * 0.5);
  bg.addColorStop(0, '#07052a'); bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const STARS = [[40,25],[110,65],[560,30],[590,75],[620,140],[25,185],[650,95],[200,15],[480,50],[160,130]];
  STARS.forEach(([sx, sy]) => {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(sx, sy, 0.9, 0, Math.PI * 2); ctx.fill();
  });

  const cx = W * 0.36, cy = H / 2 + 5;
  const orbitR = [0, 38, 72, 100, 125, 147, 167];

  for (let n = 6; n >= 1; n--) {
    const r = orbitR[n];
    const active = n === n1, target = n === n2;
    ctx.save();
    ctx.strokeStyle = active ? 'rgba(99,102,241,0.8)' : target ? 'rgba(52,211,153,0.65)' : 'rgba(30,41,59,0.7)';
    ctx.lineWidth = active ? 1.8 : target ? 1.4 : 0.7;
    if (active) { ctx.shadowBlur = 10; ctx.shadowColor = '#6366f1'; }
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.32, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.fillStyle = active ? '#a5b4fc' : target ? '#6ee7b7' : '#334155';
    ctx.font = `${active || target ? 'bold ' : ''}9px monospace`; ctx.textAlign = 'left';
    ctx.fillText(`n=${n}`, cx + r + 5, cy + 4);
    ctx.fillStyle = active ? '#818cf8' : '#1e3a5f'; ctx.font = '7px monospace';
    ctx.fillText(`${(-13.6 / (n * n)).toFixed(2)}eV`, cx + r + 5, cy + 15);
  }

  ctx.save(); ctx.shadowBlur = 28; ctx.shadowColor = '#ef4444';
  const nuclG = ctx.createRadialGradient(cx - 5, cy - 5, 0, cx, cy, 22);
  nuclG.addColorStop(0, '#fca5a5'); nuclG.addColorStop(0.4, '#ef4444'); nuclG.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = nuclG; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
  const nucPositions = [[-7,-5],[7,-5],[0,0],[-5,7],[7,6],[-10,1],[4,-13],[-4,13]];
  nucPositions.forEach(([px, py], i) => {
    ctx.fillStyle = i % 2 === 0 ? '#fca5a5' : '#93c5fd';
    ctx.beginPath(); ctx.arc(cx + px, cy + py, 4, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('H', cx, cy + 4);

  const orb = orbitR[n1];
  const angSpeed = isPlaying ? t * (2.8 - n1 * 0.32) : 0;
  const ex = cx + orb * Math.cos(angSpeed);
  const ey = cy + orb * 0.32 * Math.sin(angSpeed);

  for (let i = 1; i <= 12; i++) {
    const ta = angSpeed - i * 0.1;
    const tx = cx + orb * Math.cos(ta), ty = cy + orb * 0.32 * Math.sin(ta);
    ctx.fillStyle = `rgba(99,102,241,${(12 - i) * 0.035})`;
    ctx.beginPath(); ctx.arc(tx, ty, 5 - i * 0.35, 0, Math.PI * 2); ctx.fill();
  }

  ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = '#818cf8';
  const eG = ctx.createRadialGradient(ex - 1.5, ey - 1.5, 0, ex, ey, 8);
  eG.addColorStop(0, '#e0e7ff'); eG.addColorStop(0.5, '#818cf8'); eG.addColorStop(1, '#3730a3');
  ctx.fillStyle = eG; ctx.beginPath(); ctx.arc(ex, ey, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#a5b4fc'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('e⁻', ex, ey - 12);

  if (isPlaying && n1 !== n2) {
    const pColor = wlColor(photonWL);
    const pPhase = (t * 2.5) % (Math.PI * 2);
    const midR = (orbitR[n1] + orbitR[n2]) / 2;
    glowDot(ctx, cx + midR * Math.cos(pPhase + Math.PI * 0.6), cy + midR * 0.32 * Math.sin(pPhase + Math.PI * 0.6), 4, pColor, 15);
    const arrowAng = Math.PI * 1.15;
    const ax1 = cx + orbitR[n1] * Math.cos(arrowAng), ay1 = cy + orbitR[n1] * 0.32 * Math.sin(arrowAng);
    const ax2 = cx + orbitR[n2] * Math.cos(arrowAng), ay2 = cy + orbitR[n2] * 0.32 * Math.sin(arrowAng);
    ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = pColor;
    ctx.strokeStyle = pColor; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.stroke();
    const dx = ax2 - ax1, dy = ay2 - ay1, len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len, ny = dy / len;
    ctx.fillStyle = pColor; ctx.beginPath();
    ctx.moveTo(ax2, ay2); ctx.lineTo(ax2 - nx * 10 - ny * 5, ay2 - ny * 10 + nx * 5);
    ctx.lineTo(ax2 - nx * 10 + ny * 5, ay2 - ny * 10 - nx * 5); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  const diagX = W * 0.7, diagY = 30, diagH = H - 60, diagW = W - diagX - 15;
  ctx.fillStyle = 'rgba(15,23,42,0.88)'; roundRect(ctx, diagX, diagY, diagW, diagH, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.3)'; ctx.lineWidth = 1; roundRect(ctx, diagX, diagY, diagW, diagH, 8); ctx.stroke();
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('مستويات الطاقة', diagX + diagW / 2, diagY + 15);
  ctx.fillStyle = '#334155'; ctx.font = '7px Arial';
  ctx.fillText('ذرة الهيدروجين', diagX + diagW / 2, diagY + 26);
  const eMin = -13.6, eMax = 0;
  const eToY = (e: number) => diagY + 35 + ((1 - (e - eMin) / (eMax - eMin)) * (diagH - 50));
  for (let n = 1; n <= 6; n++) {
    const En = -13.6 / (n * n), ly = eToY(En);
    const isN1 = n === n1, isN2 = n === n2;
    ctx.strokeStyle = isN1 ? '#818cf8' : isN2 ? '#34d399' : '#1e3a5f';
    ctx.lineWidth = isN1 || isN2 ? 2.5 : 0.8;
    ctx.beginPath(); ctx.moveTo(diagX + 8, ly); ctx.lineTo(diagX + diagW - 8, ly); ctx.stroke();
    ctx.fillStyle = isN1 ? '#a5b4fc' : isN2 ? '#6ee7b7' : '#334155';
    ctx.font = `${isN1 || isN2 ? 'bold ' : ''}8px monospace`; ctx.textAlign = 'left';
    ctx.fillText(`n=${n}`, diagX + 10, ly - 2);
    ctx.textAlign = 'right'; ctx.fillText(`${En.toFixed(2)}`, diagX + diagW - 9, ly - 2);
  }
  const ly1 = eToY(-13.6 / (n1 * n1)), ly2 = eToY(-13.6 / (n2 * n2)), arrowX = diagX + diagW / 2;
  ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = wlColor(photonWL);
  ctx.strokeStyle = wlColor(photonWL); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(arrowX, ly1); ctx.lineTo(arrowX, ly2); ctx.stroke();
  const aDir = ly2 < ly1 ? -1 : 1;
  ctx.fillStyle = wlColor(photonWL); ctx.beginPath();
  ctx.moveTo(arrowX, ly2); ctx.lineTo(arrowX - 6, ly2 + aDir * 12); ctx.lineTo(arrowX + 6, ly2 + aDir * 12);
  ctx.closePath(); ctx.fill(); ctx.restore();
  const midLY = (ly1 + ly2) / 2;
  ctx.fillStyle = wlColor(photonWL); ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText(`λ=${photonWL.toFixed(0)}nm`, arrowX, midLY + 4);
  ctx.fillText(`ΔE=${deltaE.toFixed(2)}eV`, arrowX, midLY + 15);
  ctx.fillStyle = wlColor(photonWL); roundRect(ctx, arrowX - 22, midLY + 20, 44, 9, 4); ctx.fill();
  const series = n2 === 1 ? '⟶ Lyman (UV)' : n2 === 2 ? '⟶ Balmer (مرئي)' : '⟶ Paschen (IR)';
  ctx.fillStyle = 'rgba(15,23,42,0.9)'; roundRect(ctx, 8, H - 62, 330, 58, 8); ctx.fill();
  const infoR = [
    { t: `n₁=${n1}  →  E₁ = ${E1.toFixed(3)} eV`, c: '#818cf8' },
    { t: `n₂=${n2}  →  E₂ = ${E2.toFixed(3)} eV`, c: '#34d399' },
    { t: `${isEmission ? '↓ إصدار' : '↑ امتصاص'} | ${series}`, c: wlColor(photonWL) },
  ];
  infoR.forEach((r, i) => {
    ctx.fillStyle = r.c; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.t, 16, H - 48 + i * 17);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌊 3. DOUBLE-SLIT EXPERIMENT
// ═══════════════════════════════════════════════════════════════════════════

interface SlitParticle { x: number; y: number; vx: number; vy: number; active: boolean; }

function drawDoubleSlit(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, isPlaying: boolean,
  dotsRef: React.MutableRefObject<{ y: number }[]>,
  slitParticlesRef: React.MutableRefObject<SlitParticle[]>, t: number
) {
  const wl = vars.wavelength || 500;
  const d = vars.slitSep || 0.1;
  const pColor = wlColor(wl);
  drawBackground(ctx, W, H);
  const srcX = 62, barrierX = Math.round(W * 0.42), screenX = W - 68;
  const slitGap = clamp(50 + d * 20, 35, 85);
  const slitHalf = 13;
  const slit1Y = H / 2 - slitGap / 2, slit2Y = H / 2 + slitGap / 2;

  const srcG = ctx.createRadialGradient(srcX, H / 2, 0, srcX, H / 2, 32);
  srcG.addColorStop(0, 'white'); srcG.addColorStop(0.3, pColor); srcG.addColorStop(1, 'transparent');
  ctx.fillStyle = srcG; ctx.beginPath(); ctx.arc(srcX, H / 2, 32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#64748b'; ctx.font = '8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('مصدر', srcX, H / 2 + 38);
  ctx.fillStyle = pColor; ctx.font = '8px monospace'; ctx.fillText(`λ=${wl}nm`, srcX, H / 2 + 48);

  for (let i = 0; i < 5; i++) {
    const rr = ((t * 45 + i * 28) % (barrierX - srcX - 20));
    if (rr > 0) {
      ctx.strokeStyle = wlColor(wl, (1 - rr / (barrierX - srcX)) * 0.38);
      ctx.lineWidth = 1; ctx.beginPath();
      ctx.arc(srcX, H / 2, rr, -Math.PI * 0.72, Math.PI * 0.72); ctx.stroke();
    }
  }

  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(barrierX - 7, 0, 14, slit1Y - slitHalf);
  ctx.fillRect(barrierX - 7, slit1Y + slitHalf, 14, slit2Y - slitHalf - (slit1Y + slitHalf));
  ctx.fillRect(barrierX - 7, slit2Y + slitHalf, 14, H - slit2Y - slitHalf);
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5;
  ctx.strokeRect(barrierX - 7, 0, 14, slit1Y - slitHalf);
  ctx.strokeRect(barrierX - 7, slit2Y + slitHalf, 14, H - slit2Y - slitHalf);
  ctx.fillStyle = '#93c5fd'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('S₁', barrierX, slit1Y + 4); ctx.fillText('S₂', barrierX, slit2Y + 4);

  [slit1Y, slit2Y].forEach(sy => {
    for (let i = 0; i < 5; i++) {
      const rr = ((t * 45 + i * 28) % (screenX - barrierX - 15));
      if (rr > 0) {
        ctx.strokeStyle = wlColor(wl, (1 - rr / (screenX - barrierX)) * 0.22);
        ctx.lineWidth = 1; ctx.beginPath();
        ctx.arc(barrierX, sy, rr, -Math.PI * 0.85, Math.PI * 0.85); ctx.stroke();
      }
    }
  });

  ctx.fillStyle = '#0f172a'; ctx.fillRect(screenX - 4, 0, 8, H);
  ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1; ctx.strokeRect(screenX - 4, 0, 8, H);
  for (let py = 15; py < H - 15; py++) {
    const y = (py - H / 2) * 4e-4;
    const dSep = d * 1e-3 * 1e-3;
    const phase = Math.PI * dSep * y / ((wl * 1e-9) * 1.0);
    const intensity = Math.pow(Math.cos(phase), 2);
    ctx.fillStyle = wlColor(wl, intensity * 0.88);
    ctx.fillRect(screenX + 5, py, 18, 1);
  }

  if (isPlaying && Math.random() < 0.38) {
    let bestY = H / 2, bestI = 0;
    for (let k = 0; k < 30; k++) {
      const ty = 25 + Math.random() * (H - 50);
      const y = (ty - H / 2) * 4e-4;
      const dSep = d * 1e-3 * 1e-3;
      const phase = Math.PI * dSep * y / ((wl * 1e-9) * 1.0);
      const ints = Math.pow(Math.cos(phase), 2);
      if (ints > bestI) { bestI = ints; bestY = ty; }
    }
    if (Math.random() < bestI) {
      dotsRef.current.push({ y: bestY });
      if (dotsRef.current.length > 700) dotsRef.current = dotsRef.current.slice(-640);
    }
  }
  dotsRef.current.forEach(dot => {
    ctx.fillStyle = wlColor(wl, 0.78);
    ctx.beginPath(); ctx.arc(screenX + 14, dot.y, 1.5, 0, Math.PI * 2); ctx.fill();
  });

  if (isPlaying && Math.random() < 0.07) {
    const targetSlit = Math.random() < 0.5 ? slit1Y : slit2Y;
    slitParticlesRef.current.push({ x: srcX + 28, y: H / 2, vx: 2.8, vy: (targetSlit - H / 2) / 50, active: true });
  }
  slitParticlesRef.current = slitParticlesRef.current.filter(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x > barrierX + 5) p.vy += (dotsRef.current.length > 0 ? dotsRef.current[dotsRef.current.length - 1].y - p.y : 0) * 0.002;
    if (p.x > screenX) return false;
    ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = pColor;
    ctx.fillStyle = pColor; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    return true;
  });

  ctx.fillStyle = 'rgba(15,23,42,0.9)'; roundRect(ctx, 8, 8, 175, 60, 8); ctx.fill();
  ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
  ctx.fillText('جسيمات مرصودة:', 16, 28);
  ctx.fillStyle = pColor; ctx.font = 'bold 18px monospace'; ctx.fillText(dotsRef.current.length.toString(), 16, 56);
  ctx.fillStyle = '#334155'; ctx.font = '8px monospace';
  ctx.fillText(`λ=${wl}nm  d=${d.toFixed(2)}mm`, 16, H - 10);
  ctx.fillStyle = 'rgba(15,23,42,0.85)'; roundRect(ctx, barrierX - 125, H - 55, 250, 48, 8); ctx.fill();
  ctx.fillStyle = '#94a3b8'; ctx.font = '8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('تجربة يونغ بالشق المزدوج (1801)', barrierX, H - 42);
  ctx.fillStyle = '#64748b'; ctx.font = '7px Arial';
  ctx.fillText('الجسيمات تتداخل كأمواج → نمط حيود', barrierX, H - 30);
  ctx.fillStyle = '#3b82f6'; ctx.fillText('ازدواجية الموجة-الجسيم ✦ Duality', barrierX, H - 18);
}

// ═══════════════════════════════════════════════════════════════════════════
// ☢️ 4. RADIOACTIVE DECAY
// ═══════════════════════════════════════════════════════════════════════════

interface AtomCell {
  x: number; y: number; decayed: boolean; decayTime: number;
  emitting: boolean; emitStart: number; particle: 'α' | 'β' | 'γ'; element: string;
}
interface DecayRay { x: number; y: number; vx: number; vy: number; life: number; type: 'α' | 'β' | 'γ'; }

function drawRadioactiveDecay(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, results: Record<string, number>,
  isPlaying: boolean, atomsRef: React.MutableRefObject<AtomCell[]>,
  raysRef: React.MutableRefObject<DecayRay[]>,
  histRef: React.MutableRefObject<{ t: number; n: number }[]>, t: number
) {
  const halfLife = clamp(vars.halfLife ?? 5, 0.5, 30);
  const lambda = Math.LN2 / halfLife;
  const N0 = 100;

  if (atomsRef.current.length === 0) {
    const elements = ['Ra', 'U', 'Th', 'Rn', 'Po', 'Bi', 'Pb'];
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
      const sx = W * 0.07 + c * (W * 0.52 / 10), sy = 40 + r * ((H - 80) / 10);
      atomsRef.current.push({
        x: sx + 18, y: sy + 14, decayed: false,
        decayTime: -Math.log(Math.random()) / lambda,
        emitting: false, emitStart: 0,
        particle: Math.random() < 0.55 ? 'β' : Math.random() < 0.6 ? 'α' : 'γ',
        element: elements[Math.floor(Math.random() * elements.length)]
      });
    }
  }

  drawBackground(ctx, W, H);
  const divX = W * 0.6;
  ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(divX, 0); ctx.lineTo(divX, H); ctx.stroke();

  const alive = atomsRef.current.filter(a => !a.decayed && !a.emitting).length;
  if (isPlaying) {
    atomsRef.current.forEach(a => {
      if (!a.decayed && !a.emitting && t > a.decayTime) {
        a.emitting = true; a.emitStart = t;
        const ang = Math.random() * Math.PI * 2;
        const speed = a.particle === 'α' ? 1.5 : a.particle === 'γ' ? 4 : 2.5;
        raysRef.current.push({ x: a.x, y: a.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life: 1, type: a.particle });
      }
      if (a.emitting && t - a.emitStart > 0.6) { a.decayed = true; a.emitting = false; }
    });
    const lastH = histRef.current[histRef.current.length - 1];
    if (!lastH || t - lastH.t >= 0.08) {
      histRef.current.push({ t, n: alive });
      if (histRef.current.length > 260) histRef.current = histRef.current.slice(-240);
    }
  }

  atomsRef.current.forEach(a => {
    ctx.save();
    if (a.emitting) { ctx.shadowBlur = 22; ctx.shadowColor = '#fbbf24'; }
    if (a.decayed) {
      const dg = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 8);
      dg.addColorStop(0, '#475569'); dg.addColorStop(1, '#1e293b');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(a.x, a.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#334155'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
      ctx.fillText('✓', a.x, a.y + 2);
    } else if (a.emitting) {
      const flash = Math.sin((t - a.emitStart) * 20) > 0;
      const ag = ctx.createRadialGradient(a.x - 3, a.y - 3, 0, a.x, a.y, 13);
      ag.addColorStop(0, flash ? '#fff' : '#fef08a'); ag.addColorStop(0.35, '#fbbf24'); ag.addColorStop(1, '#f97316');
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(a.x, a.y, 13, 0, Math.PI * 2); ctx.fill();
    } else {
      const ag = ctx.createRadialGradient(a.x - 3, a.y - 3, 0, a.x, a.y, 10);
      ag.addColorStop(0, '#6ee7b7'); ag.addColorStop(0.5, '#10b981'); ag.addColorStop(1, '#065f46');
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(a.x, a.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a7f3d0'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
      ctx.fillText(a.element, a.x, a.y + 2);
    }
    ctx.restore();
  });

  raysRef.current = raysRef.current.filter(p => {
    p.x += p.vx; p.y += p.vy; p.life -= 0.022;
    const pColors: Record<string, string> = { α: '#f97316', β: '#818cf8', γ: '#22d3ee' };
    const col = pColors[p.type];
    ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = col; ctx.fillStyle = col; ctx.globalAlpha = p.life;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.type === 'α' ? 5.5 : p.type === 'β' ? 3.5 : 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
    ctx.fillText(p.type, p.x, p.y - 8); ctx.restore();
    return p.life > 0 && p.x > 0 && p.x < divX && p.y > 0 && p.y < H;
  });

  const cX = divX + 12, cY = 30, cW = W - cX - 12, cH = H - 80;
  ctx.fillStyle = 'rgba(15,23,42,0.85)'; roundRect(ctx, cX - 5, cY - 5, cW + 10, cH + 10, 8); ctx.fill();
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('منحنى الاضمحلال الإشعاعي', cX + cW / 2, cY + 13);
  const maxT = Math.max(t + 0.5, halfLife * 3.5);
  ctx.strokeStyle = 'rgba(239,68,68,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const tt = (i / 100) * maxT, nn = N0 * Math.exp(-lambda * tt);
    const px = cX + (tt / maxT) * cW, py = cY + 20 + (1 - nn / N0) * (cH - 25);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke(); ctx.setLineDash([]);
  if (histRef.current.length > 1) {
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.5; ctx.beginPath();
    histRef.current.forEach((pt, i) => {
      const px = cX + (pt.t / maxT) * cW, py = cY + 20 + (1 - pt.n / N0) * (cH - 25);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }
  for (let k = 1; k <= 4; k++) {
    const mx = cX + (k * halfLife / maxT) * cW;
    if (mx < cX + cW) {
      ctx.strokeStyle = 'rgba(251,191,36,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(mx, cY + 18); ctx.lineTo(mx, cY + cH); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`t½×${k}`, mx, cY + cH + 10);
    }
  }
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cX, cY + 18); ctx.lineTo(cX, cY + cH); ctx.lineTo(cX + cW, cY + cH); ctx.stroke();
  ctx.fillStyle = '#64748b'; ctx.font = '8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('الزمن (s)', cX + cW / 2, cY + cH + 22);
  ctx.fillStyle = 'rgba(15,23,42,0.9)'; roundRect(ctx, divX + 8, H - 50, cW - 3, 46, 6); ctx.fill();
  const activity = alive * lambda;
  [
    { t: `ذرات باقية: ${alive}/${N0}  (${((alive / N0) * 100).toFixed(0)}%)`, c: '#4ade80' },
    { t: `النشاط: ${activity.toFixed(2)} تحلل/ث`, c: '#f97316' },
    { t: `t½=${halfLife}s  λ=${lambda.toFixed(3)} s⁻¹  t=${t.toFixed(1)}s`, c: '#94a3b8' },
  ].forEach((r, i) => {
    ctx.fillStyle = r.c; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.t, divX + 14, H - 38 + i * 15);
  });
  [['α', '#f97316', 'ألفا'], ['β', '#818cf8', 'بيتا'], ['γ', '#22d3ee', 'غاما']].forEach(([sym, col, name], i) => {
    ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = col as string; ctx.fillStyle = col as string;
    ctx.beginPath(); ctx.arc(14 + i * 80, H - 12, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
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
  vars: Record<string, number>, isPlaying: boolean,
  stateRef: React.MutableRefObject<FissState>,
  neutronRef: React.MutableRefObject<{ x: number; y: number }>,
  fissTimeRef: React.MutableRefObject<number>,
  fragmentsRef: React.MutableRefObject<FissFragment[]>,
  chainRef: React.MutableRefObject<ChainNeutron[]>, t: number
) {
  const cx = W / 2, cy = H / 2;
  drawBackground(ctx, W, H);

  if (isPlaying) {
    const elapsed = t - fissTimeRef.current;
    switch (stateRef.current) {
      case 'idle':
        neutronRef.current = { x: 55, y: cy }; stateRef.current = 'approaching'; fissTimeRef.current = t; break;
      case 'approaching':
        neutronRef.current.x += 2.8;
        if (neutronRef.current.x >= cx - 45) { stateRef.current = 'vibrating'; fissTimeRef.current = t; } break;
      case 'vibrating':
        if (elapsed > 1.8) {
          stateRef.current = 'splitting'; fissTimeRef.current = t;
          fragmentsRef.current = [
            { x: cx, y: cy, vx: -2.4, vy: -1.4, r: 26, color: '#3b82f6', trail: [], label: '¹⁴¹Ba' },
            { x: cx, y: cy, vx: 2.4, vy: 1.4, r: 21, color: '#8b5cf6', trail: [], label: '⁹²Kr' },
          ];
          for (let i = 0; i < 3; i++) {
            const ang = (i / 3) * Math.PI * 2 + 0.4;
            chainRef.current.push({ x: cx, y: cy, vx: Math.cos(ang) * 3.8, vy: Math.sin(ang) * 3.8, life: 1 });
          }
        } break;
      case 'splitting':
        fragmentsRef.current.forEach(f => {
          f.trail.push({ x: f.x, y: f.y }); if (f.trail.length > 25) f.trail.shift();
          f.x += f.vx; f.y += f.vy; f.vx *= 0.984; f.vy *= 0.984;
        });
        chainRef.current.forEach(n => { n.x += n.vx; n.y += n.vy; n.life -= 0.003; });
        chainRef.current = chainRef.current.filter(n => n.life > 0 && n.x > 0 && n.x < W && n.y > 0 && n.y < H);
        if (elapsed > 7) {
          stateRef.current = 'idle'; fragmentsRef.current = []; chainRef.current = [];
          neutronRef.current = { x: 55, y: cy }; fissTimeRef.current = t;
        } break;
    }
  }

  const state = stateRef.current;
  const elapsed2 = t - fissTimeRef.current;
  const vibAmp = state === 'vibrating' ? Math.min(elapsed2 * 8, 22) * Math.sin(t * 14) : 0;

  if (state !== 'splitting' || fragmentsRef.current.length === 0) {
    const nR = 42 + (state === 'vibrating' ? Math.abs(vibAmp * 0.5) : 0);
    const nW = nR + (state === 'vibrating' ? vibAmp : 0);
    const nH = nR - (state === 'vibrating' ? Math.abs(vibAmp * 0.32) : 0);
    ctx.save(); ctx.shadowBlur = 24 + (state === 'vibrating' ? Math.abs(vibAmp) : 0); ctx.shadowColor = '#3b82f6';
    const ng = ctx.createRadialGradient(cx - 12, cy - 12, 0, cx, cy, Math.max(nW, 1));
    ng.addColorStop(0, '#93c5fd'); ng.addColorStop(0.3, '#3b82f6'); ng.addColorStop(0.7, '#1d4ed8'); ng.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = ng; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(10, nW), Math.max(10, nH), 0, 0, Math.PI * 2); ctx.fill();
    const dots2 = [[-14,-12],[14,-12],[0,-2],[-22,5],[22,5],[0,-22],[-10,18],[10,18],[6,-10],[-6,10],[-18,-3],[18,-3]];
    dots2.forEach(([px, py], i) => {
      ctx.fillStyle = i % 2 === 0 ? '#f87171' : '#94a3b8';
      ctx.beginPath(); ctx.arc(cx + px, cy + py, 5.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    ctx.fillStyle = '#bfdbfe'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillText('²³⁵U', cx, cy - nH - 14);
    ctx.fillStyle = '#64748b'; ctx.font = '8px Arial';
    ctx.fillText('92 بروتون • 143 نيوترون', cx, cy + nH + 18);
    for (let k = 1; k <= 3; k++) {
      ctx.strokeStyle = `rgba(59,130,246,${0.12 - k * 0.03})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, nW + k * 26, 0, Math.PI * 2); ctx.stroke();
    }
  }

  if (state === 'approaching' || state === 'idle') {
    const n = neutronRef.current;
    ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = '#94a3b8';
    const ng = ctx.createRadialGradient(n.x - 2, n.y - 2, 0, n.x, n.y, 9);
    ng.addColorStop(0, '#e2e8f0'); ng.addColorStop(1, '#475569');
    ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(n.x, n.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('n⁰', n.x, n.y - 14);
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(22, cy); ctx.lineTo(n.x - 13, cy); ctx.stroke(); ctx.setLineDash([]);
  }

  fragmentsRef.current.forEach(f => {
    f.trail.forEach((pt, i) => {
      ctx.fillStyle = `rgba(99,102,241,${(i / f.trail.length) * 0.28})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, f.r * (i / f.trail.length) * 0.85, 0, Math.PI * 2); ctx.fill();
    });
    ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = f.color;
    const fg = ctx.createRadialGradient(f.x - 7, f.y - 7, 0, f.x, f.y, f.r);
    fg.addColorStop(0, '#fff'); fg.addColorStop(0.4, f.color); fg.addColorStop(1, '#0f172a');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#e0e7ff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(f.label, f.x, f.y + 4);
  });

  chainRef.current.forEach(n => {
    ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = '#94a3b8';
    ctx.fillStyle = `rgba(148,163,184,${n.life})`;
    ctx.beginPath(); ctx.arc(n.x, n.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = `rgba(100,116,139,${n.life})`; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('n⁰', n.x, n.y - 11);
  });

  if (state === 'splitting' && elapsed2 < 1.4) {
    const alpha = (1 - elapsed2 / 1.4) * 0.6;
    ctx.save(); ctx.globalAlpha = alpha;
    const flashG = ctx.createRadialGradient(cx, cy, 0, cx, cy, elapsed2 * 200);
    flashG.addColorStop(0, '#fff'); flashG.addColorStop(0.2, '#fef08a');
    flashG.addColorStop(0.5, '#f97316'); flashG.addColorStop(1, 'transparent');
    ctx.fillStyle = flashG; ctx.beginPath(); ctx.arc(cx, cy, elapsed2 * 200, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  const stateLabels: Record<FissState, string> = {
    idle: '⬤ جاهز — الانشطار يبدأ تلقائياً',
    approaching: '← نيوترون بطيء يقترب من ²³⁵U',
    vibrating: '⚡ النواة تمتص النيوترون وتتذبذب...',
    splitting: '💥 انشطار نووي! تفاعل متسلسل',
    fragments: '✓ شظايا + نيوترونات جديدة'
  };
  ctx.fillStyle = 'rgba(15,23,42,0.93)'; roundRect(ctx, 8, H - 75, 390, 70, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(239,68,68,0.3)'; ctx.lineWidth = 1; roundRect(ctx, 8, H - 75, 390, 70, 8); ctx.stroke();
  ctx.fillStyle = state === 'splitting' ? '#f97316' : '#94a3b8'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'left';
  ctx.fillText(stateLabels[state] || '', 16, H - 59);
  ctx.fillStyle = '#64748b'; ctx.font = '8px monospace';
  ctx.fillText('²³⁵U + n⁰  →  ¹⁴¹Ba + ⁹²Kr + 3n⁰ + 200 MeV', 16, H - 43);
  ctx.fillStyle = '#fbbf24'; ctx.font = '8px monospace';
  ctx.fillText('طاقة محررة: ≈200 MeV = 3.2×10⁻¹¹ J  |  E=Δmc²', 16, H - 29);
  ctx.fillStyle = '#475569'; ctx.fillText(`حالة: ${state}  |  t=${t.toFixed(1)}s`, 16, H - 15);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 6. SPECIAL RELATIVITY
// ═══════════════════════════════════════════════════════════════════════════

function drawSpaceship(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number) {
  const w = 70 * scale, h = 28;
  ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = '#818cf8';
  const sg = ctx.createLinearGradient(x, y, x + w, y + h);
  sg.addColorStop(0, '#4c1d95'); sg.addColorStop(0.5, '#7c3aed'); sg.addColorStop(1, '#4c1d95');
  ctx.fillStyle = sg; ctx.beginPath();
  ctx.moveTo(x + w, y + h / 2); ctx.lineTo(x + w * 0.65, y);
  ctx.lineTo(x, y + h * 0.2); ctx.lineTo(x, y + h * 0.8); ctx.lineTo(x + w * 0.65, y + h);
  ctx.closePath(); ctx.fill(); ctx.restore();
  const fl = 12 + 8 * Math.sin(t * 15);
  const fg = ctx.createLinearGradient(x, 0, x - fl, 0);
  fg.addColorStop(0, '#f97316'); fg.addColorStop(0.5, '#fbbf24'); fg.addColorStop(1, 'transparent');
  ctx.fillStyle = fg; ctx.beginPath();
  ctx.moveTo(x, y + h * 0.28); ctx.lineTo(x - fl, y + h * 0.5); ctx.lineTo(x, y + h * 0.72);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7dd3fc'; ctx.beginPath();
  ctx.arc(x + w * 0.55, y + h / 2, h * 0.2, 0, Math.PI * 2); ctx.fill();
}

function drawSpecialRelativity(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, isPlaying: boolean, t: number
) {
  const v = clamp(vars.v ?? 200000000, 0, 2.99e8);
  const c = 3e8, beta = v / c;
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const t0 = vars.t0 ?? 10;
  ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, H);
  const STARS2 = [[60,25],[155,55],[250,18],[370,42],[500,28],[610,48],[690,22],[30,145],[180,175],[310,160],[460,188],[600,170],[720,140]];
  STARS2.forEach(([sx, sy]) => {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.2})`;
    ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI * 2); ctx.fill();
  });
  const panel1Y = 18, panel2Y = H / 2 + 10, panelH = H / 2 - 24;
  ctx.fillStyle = 'rgba(8,16,38,0.88)'; roundRect(ctx, 8, panel1Y, W - 16, panelH, 8); ctx.fill();
  ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 1; roundRect(ctx, 8, panel1Y, W - 16, panelH, 8); ctx.stroke();
  ctx.fillStyle = 'rgba(20,10,45,0.9)'; roundRect(ctx, 8, panel2Y, W - 16, panelH, 8); ctx.fill();
  ctx.strokeStyle = '#4c1d95'; roundRect(ctx, 8, panel2Y, W - 16, panelH, 8); ctx.stroke();
  ctx.fillStyle = '#64748b'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
  ctx.fillText('📍 الإطار الساكن — المراقب على الأرض', 18, panel1Y + 16);
  ctx.fillStyle = '#818cf8';
  ctx.fillText(`🚀 الإطار المتحرك — v=${(beta * 100).toFixed(2)}%c  β=${beta.toFixed(4)}`, 18, panel2Y + 16);
  const clk1X = 90, clk1Y = panel1Y + panelH / 2 + 10;
  drawAnalogClock(ctx, clk1X, clk1Y, 40, isPlaying ? t : 0, '#22d3ee', false);
  ctx.fillStyle = '#94a3b8'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('t₀ (زمن صحيح)', clk1X, clk1Y + 50);
  ctx.fillStyle = '#22d3ee'; ctx.font = 'bold 9px monospace';
  ctx.fillText(`t=${(isPlaying ? t : 0).toFixed(2)}s`, clk1X, clk1Y + 63);
  const clk2X = 90, clk2Y = panel2Y + panelH / 2 + 10;
  drawAnalogClock(ctx, clk2X, clk2Y, 40, isPlaying ? t / gamma : 0, '#818cf8', true);
  ctx.fillStyle = '#818cf8'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText(`t'=t₀/γ (أبطأ×${gamma.toFixed(2)})`, clk2X, clk2Y + 50);
  ctx.fillStyle = '#a78bfa'; ctx.font = 'bold 9px monospace';
  ctx.fillText(`t'=${(isPlaying ? t / gamma : 0).toFixed(2)}s`, clk2X, clk2Y + 63);
  const rulerX = 158, ruler1Y = panel1Y + panelH / 2 - 5;
  drawRuler(ctx, rulerX, ruler1Y, 200, '#22d3ee', 'L₀ = 1.0 m (الطول الطبيعي)');
  const ruler2Y = panel2Y + panelH / 2 - 5;
  drawRuler(ctx, rulerX, ruler2Y, 200 / gamma, '#818cf8', `L=L₀/γ=${(1 / gamma).toFixed(3)} m`);
  const shipSpd = beta * 80, shipX = isPlaying ? (158 + ((t * shipSpd) % (W - 310))) : W * 0.55;
  drawSpaceship(ctx, shipX, panel2Y + panelH / 2 - 28, 1 / gamma, t);
  const infoX = W - 228, infoY = panel1Y + 4, infoH = H - 30;
  ctx.fillStyle = 'rgba(15,23,42,0.96)'; roundRect(ctx, infoX, infoY, 218, infoH, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.38)'; ctx.lineWidth = 1; roundRect(ctx, infoX, infoY, 218, infoH, 8); ctx.stroke();
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
  ctx.fillText('معاملات النسبية الخاصة', infoX + 109, infoY + 18);
  ctx.fillStyle = '#334155'; ctx.font = '7px Arial'; ctx.fillText('أينشتاين 1905', infoX + 109, infoY + 30);
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
    ctx.fillStyle = 'rgba(30,41,59,0.75)'; roundRect(ctx, infoX + 8, ry - 13, 200, 21, 4); ctx.fill();
    ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.l + ':', infoX + 13, ry + 3);
    ctx.fillStyle = r.c; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(r.v, infoX + 203, ry + 3);
  });
  ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('γ = 1 / √(1 − v²/c²)', infoX + 109, infoY + 46 + infoRows.length * 24 + 8);
  const barY = infoY + 46 + infoRows.length * 24 + 24;
  ctx.fillStyle = '#1e293b'; roundRect(ctx, infoX + 10, barY, 196, 12, 4); ctx.fill();
  const fill = clamp((gamma - 1) / 6, 0, 1);
  const barG = ctx.createLinearGradient(infoX + 10, 0, infoX + 206, 0);
  barG.addColorStop(0, '#22d3ee'); barG.addColorStop(0.5, '#818cf8'); barG.addColorStop(1, '#f87171');
  ctx.fillStyle = barG; roundRect(ctx, infoX + 10, barY, 196 * fill, 12, 4); ctx.fill();
  ctx.fillStyle = '#64748b'; ctx.font = '7px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`γ=${gamma.toFixed(3)} (يزيد مع السرعة)`, infoX + 109, barY + 24);
  if (beta > 0.95) {
    ctx.fillStyle = 'rgba(239,68,68,0.16)'; roundRect(ctx, infoX + 8, barY + 30, 200, 22, 4); ctx.fill();
    ctx.fillStyle = '#f87171'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
    ctx.fillText('⚠ قريب جداً من سرعة الضوء!', infoX + 109, barY + 44);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚡ 7. COMPTON SCATTERING
// ═══════════════════════════════════════════════════════════════════════════

type ComptonState = 'incoming' | 'collision' | 'scattered' | 'reset';
interface ComptonPhoton { x: number; y: number; vx: number; vy: number; wl: number; life: number; }

function drawComptonScattering(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, isPlaying: boolean,
  compStateRef: React.MutableRefObject<ComptonState>,
  compTimeRef: React.MutableRefObject<number>,
  compPhotonRef: React.MutableRefObject<{ x: number; y: number } | null>,
  compElectronRef: React.MutableRefObject<{ x: number; y: number; vx: number; vy: number } | null>,
  compScatterRef: React.MutableRefObject<ComptonPhoton | null>,
  t: number
) {
  const wl0 = clamp(vars.wavelength ?? 71, 10, 500); // pm → nm scale for display
  const thetaDeg = clamp(vars.theta ?? 60, 0, 180);
  const theta = thetaDeg * Math.PI / 180;
  const h = 6.626e-34, me = 9.109e-31, c = 3e8;
  const deltaLambda = (h / (me * c)) * (1 - Math.cos(theta)) * 1e12; // pm
  const wl1 = wl0 + deltaLambda; // scattered pm
  const keElec = (h * c / (wl0 * 1e-12) - h * c / (wl1 * 1e-12)) / 1.6e-19; // eV

  drawBackground(ctx, W, H);
  const cx = W / 2, cy = H / 2;

  // Title
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('تشتت كومبتون — Compton Scattering', cx, 28);
  ctx.fillStyle = '#475569'; ctx.font = '8px Arial';
  ctx.fillText('Δλ = (h/mₑc)(1−cosθ)  |  1923 آرثر كومبتون', cx, 42);

  // Electron atom at center
  ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = '#22d3ee';
  const eg = ctx.createRadialGradient(cx - 8, cy - 8, 0, cx, cy, 22);
  eg.addColorStop(0, '#a5f3fc'); eg.addColorStop(0.4, '#06b6d4'); eg.addColorStop(1, '#164e63');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('e⁻', cx, cy + 4);

  // State machine
  if (isPlaying) {
    const el = t - compTimeRef.current;
    switch (compStateRef.current) {
      case 'incoming':
        if (!compPhotonRef.current) compPhotonRef.current = { x: 80, y: cy };
        compPhotonRef.current.x += 3.2;
        if (compPhotonRef.current.x >= cx - 26) { compStateRef.current = 'collision'; compTimeRef.current = t; }
        break;
      case 'collision':
        if (el > 0.5) {
          compStateRef.current = 'scattered';
          compPhotonRef.current = { x: cx, y: cy };
          const scatterVx = 2.8 * Math.cos(-theta + Math.PI / 6);
          const scatterVy = 2.8 * Math.sin(-theta + Math.PI / 6);
          compScatterRef.current = { x: cx, y: cy, vx: scatterVx, vy: scatterVy, wl: clamp(wl1 / wl0 * 480, 400, 780), life: 1 };
          compElectronRef.current = { x: cx, y: cy, vx: 2.5 * Math.cos(theta * 0.6 + Math.PI / 2), vy: 2.5 * Math.sin(theta * 0.6 + Math.PI / 2) };
        } break;
      case 'scattered':
        if (compScatterRef.current) { compScatterRef.current.x += compScatterRef.current.vx; compScatterRef.current.y += compScatterRef.current.vy; compScatterRef.current.life -= 0.008; }
        if (compElectronRef.current) { compElectronRef.current.x += compElectronRef.current.vx; compElectronRef.current.y += compElectronRef.current.vy; compElectronRef.current.vx *= 0.98; compElectronRef.current.vy *= 0.98; }
        if (el > 5) { compStateRef.current = 'reset'; compTimeRef.current = t; }
        break;
      case 'reset':
        compPhotonRef.current = null; compScatterRef.current = null; compElectronRef.current = null;
        if (el > 0.5) { compStateRef.current = 'incoming'; compTimeRef.current = t; compPhotonRef.current = { x: 80, y: cy }; }
        break;
    }
  }

  // Draw incoming photon path guide
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(60, cy); ctx.lineTo(cx - 25, cy); ctx.stroke(); ctx.setLineDash([]);

  // Draw incoming photon
  if (compPhotonRef.current && compStateRef.current === 'incoming') {
    const ph = compPhotonRef.current;
    glowDot(ctx, ph.x, ph.y, 5, wlColor(Math.min(wl0 * 6, 400)), 16);
    ctx.fillStyle = '#94a3b8'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`X-ray λ₀=${wl0.toFixed(0)}pm`, ph.x, ph.y - 20);
  }

  // Collision flash
  if (compStateRef.current === 'collision') {
    const el = t - compTimeRef.current;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - el * 2);
    const flashG = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55);
    flashG.addColorStop(0, '#fff'); flashG.addColorStop(0.3, '#fef08a'); flashG.addColorStop(1, 'transparent');
    ctx.fillStyle = flashG; ctx.beginPath(); ctx.arc(cx, cy, 55, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  // Scattered photon
  if (compScatterRef.current) {
    const sp = compScatterRef.current;
    ctx.save(); ctx.globalAlpha = clamp(sp.life, 0, 1);
    glowDot(ctx, sp.x, sp.y, 5, wlColor(sp.wl), 18);
    ctx.fillStyle = wlColor(sp.wl); ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`λ'=${wl1.toFixed(1)}pm`, sp.x, sp.y - 22);
    ctx.restore();
  }

  // Recoil electron
  if (compElectronRef.current) {
    const ep = compElectronRef.current;
    ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = '#fbbf24';
    const eCore = ctx.createRadialGradient(ep.x - 2, ep.y - 2, 0, ep.x, ep.y, 8);
    eCore.addColorStop(0, '#fff'); eCore.addColorStop(0.5, '#fbbf24'); eCore.addColorStop(1, '#f59e0b');
    ctx.fillStyle = eCore; ctx.beginPath(); ctx.arc(ep.x, ep.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#fef08a'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
    ctx.fillText('e⁻ منتعش', ep.x, ep.y - 14);
  }

  // Angle arc
  const arcR = 50;
  ctx.strokeStyle = 'rgba(99,102,241,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, arcR, -Math.PI * 0.95, -(theta - Math.PI / 6)); ctx.stroke();
  ctx.fillStyle = '#818cf8'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`θ=${thetaDeg.toFixed(0)}°`, cx + arcR * 0.7, cy - 38);

  // Info panel
  ctx.fillStyle = 'rgba(15,23,42,0.93)'; roundRect(ctx, 8, H - 112, 250, 107, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.35)'; ctx.lineWidth = 1; roundRect(ctx, 8, H - 112, 250, 107, 8); ctx.stroke();
  const rows = [
    { l: 'λ₀ (فوتون ساقط)', v: `${wl0.toFixed(1)} pm`, c: '#818cf8' },
    { l: 'θ (زاوية التشتت)', v: `${thetaDeg.toFixed(0)}°`, c: '#a78bfa' },
    { l: 'Δλ (إزاحة كومبتون)', v: `${deltaLambda.toFixed(3)} pm`, c: '#22d3ee' },
    { l: "λ' (فوتون مشتت)", v: `${wl1.toFixed(2)} pm`, c: '#34d399' },
    { l: 'KE الإلكترون', v: `${keElec.toFixed(2)} eV`, c: '#fbbf24' },
    { l: 'h/(mₑc) كومبتون', v: '2.426 pm', c: '#94a3b8' },
  ];
  rows.forEach((r, i) => {
    ctx.fillStyle = '#475569'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.l + ':', 14, H - 98 + i * 17);
    ctx.fillStyle = r.c; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'right';
    ctx.fillText(r.v, 254, H - 98 + i * 17);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 8. QUANTUM ENERGY LEVELS — Particle in a Box
// ═══════════════════════════════════════════════════════════════════════════

function drawQuantumEnergy(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, isPlaying: boolean, t: number
) {
  const f = vars.f ?? 5e14;
  const E_eV = (6.626e-34 * f) / 1.6e-19;
  const activeN = clamp(Math.round(E_eV / 2.06), 1, 4);

  drawBackground(ctx, W, H);

  // Title
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('تكميم الطاقة — الجسيم في صندوق كمي', W / 2, 25);

  // Box walls
  const boxX = 100, boxY = 50, boxW = W * 0.52, boxH = H - 110;
  ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(boxX, boxY); ctx.lineTo(boxX, boxY + boxH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(boxX + boxW, boxY); ctx.lineTo(boxX + boxW, boxY + boxH); ctx.stroke();
  ctx.strokeStyle = 'rgba(96,165,250,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(boxX, boxY + boxH); ctx.lineTo(boxX + boxW, boxY + boxH); ctx.stroke();
  ctx.fillStyle = 'rgba(59,130,246,0.04)'; ctx.fillRect(boxX, boxY, boxW, boxH);

  // Wall labels
  ctx.fillStyle = '#60a5fa'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('V=∞', boxX, boxY - 8); ctx.fillText('V=∞', boxX + boxW, boxY - 8);
  ctx.fillText('x=0', boxX, boxY + boxH + 18); ctx.fillText('x=L', boxX + boxW, boxY + boxH + 18);

  const colors = ['#22d3ee', '#34d399', '#fbbf24', '#f87171'];
  const eV1 = 0.38; // E1 in eV for 1nm box

  for (let n = 1; n <= 4; n++) {
    const En = eV1 * n * n;
    const levelY = boxY + boxH - (En / (eV1 * 16 + 1)) * boxH * 0.88;
    const isActive = n === activeN;
    const col = colors[n - 1];

    // Energy level line
    ctx.strokeStyle = isActive ? col : `${col}55`;
    ctx.lineWidth = isActive ? 2 : 0.8;
    ctx.beginPath(); ctx.moveTo(boxX + 3, levelY); ctx.lineTo(boxX + boxW - 3, levelY); ctx.stroke();

    // Level label
    ctx.fillStyle = isActive ? col : `${col}88`;
    ctx.font = `${isActive ? 'bold ' : ''}9px monospace`; ctx.textAlign = 'left';
    ctx.fillText(`n=${n}  E=${En.toFixed(2)} eV`, boxX + boxW + 10, levelY + 4);

    // Wavefunction ψ_n(x)
    const ampY = isActive ? 28 : 14;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = boxX + (i / 200) * boxW;
      const xi = i / 200;
      const psi = Math.sin(n * Math.PI * xi) * ampY * (isActive ? 1 : 0.6);
      const py = levelY - psi;
      if (i === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
    }
    ctx.strokeStyle = isActive ? col : `${col}55`;
    ctx.lineWidth = isActive ? 2 : 1; ctx.stroke();

    // Probability density |ψ|² fill
    if (isActive) {
      ctx.save();
      for (let i = 0; i <= 200; i++) {
        const x = boxX + (i / 200) * boxW;
        const xi = i / 200;
        const psi2 = Math.pow(Math.sin(n * Math.PI * xi), 2);
        ctx.fillStyle = `${col}${Math.round(psi2 * 40).toString(16).padStart(2, '0')}`;
        ctx.fillRect(x - 1, levelY - psi2 * 50, 2, psi2 * 50);
      }
      ctx.restore();
    }
  }

  // Animated quantum particle (probability cloud bouncing)
  if (isPlaying) {
    const n = activeN;
    const col = colors[n - 1];
    const En = eV1 * n * n;
    const levelY = boxY + boxH - (En / (eV1 * 16 + 1)) * boxH * 0.88;
    // Show oscillating position expectation
    const xi = (Math.sin(t * (2 + n * 0.5)) + 1) / 2;
    const psi2 = Math.pow(Math.sin(n * Math.PI * xi), 2);
    if (psi2 > 0.1) {
      const px = boxX + xi * boxW, py = levelY - psi2 * 28;
      ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = col;
      const pg = ctx.createRadialGradient(px, py, 0, px, py, 10);
      pg.addColorStop(0, '#fff'); pg.addColorStop(0.4, col); pg.addColorStop(1, `${col}00`);
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 10 * psi2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }

  // Info panel bottom
  ctx.fillStyle = 'rgba(15,23,42,0.93)'; roundRect(ctx, 8, H - 65, 300, 60, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.3)'; ctx.lineWidth = 1; roundRect(ctx, 8, H - 65, 300, 60, 8); ctx.stroke();
  const Ef = E_eV;
  [
    { l: 'التردد f', v: `${(f / 1e14).toFixed(2)} × 10¹⁴ Hz`, c: '#22d3ee' },
    { l: 'طاقة الفوتون E=hf', v: `${Ef.toFixed(3)} eV`, c: '#fbbf24' },
    { l: 'n النشط', v: `n=${activeN}  (E₁=${(eV1).toFixed(2)}eV)`, c: colors[activeN - 1] },
  ].forEach((r, i) => {
    ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.l + ':', 14, H - 51 + i * 18);
    ctx.fillStyle = r.c; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(r.v, 303, H - 51 + i * 18);
  });

  // Planck equation display
  ctx.fillStyle = 'rgba(15,23,42,0.9)'; roundRect(ctx, W - 210, H - 65, 200, 60, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(251,191,36,0.3)'; ctx.lineWidth = 1; roundRect(ctx, W - 210, H - 65, 200, 60, 8); ctx.stroke();
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('E = hf = hc/λ', W - 110, H - 48);
  ctx.fillStyle = '#94a3b8'; ctx.font = '8px Arial';
  ctx.fillText(`h = 6.626 × 10⁻³⁴ J·s`, W - 110, H - 34);
  ctx.fillText(`E = ${Ef.toFixed(4)} eV`, W - 110, H - 20);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔴 9. LASER — Stimulated Emission
// ═══════════════════════════════════════════════════════════════════════════

interface LaserPhoton { x: number; y: number; vx: number; vy: number; wl: number; bounces: number; }
interface LaserAtom { x: number; y: number; state: 0 | 1 | 2; stateTime: number; }

function drawLaser(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, isPlaying: boolean,
  laserPhotonsRef: React.MutableRefObject<LaserPhoton[]>,
  laserAtomsRef: React.MutableRefObject<LaserAtom[]>,
  t: number
) {
  const wl = clamp(vars.wavelength ?? 632, 400, 780);
  const pumpRate = clamp(vars.pumpRate ?? 50, 10, 100) / 100;
  const pColor = wlColor(wl);

  drawBackground(ctx, W, H);

  // Title
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('الليزر — الإصدار المحفوز للضوء (LASER)', W / 2, 25);
  ctx.fillStyle = '#475569'; ctx.font = '8px Arial';
  ctx.fillText('Light Amplification by Stimulated Emission of Radiation', W / 2, 40);

  // Cavity dimensions
  const cavX = 60, cavY = H * 0.22, cavW = W - 120, cavH = H * 0.35;
  const mirrorW = 12;

  // Mirrors
  const mirrorG = ctx.createLinearGradient(cavX, 0, cavX + mirrorW, 0);
  mirrorG.addColorStop(0, '#1e293b'); mirrorG.addColorStop(0.5, '#94a3b8'); mirrorG.addColorStop(1, '#1e293b');
  ctx.fillStyle = mirrorG; ctx.fillRect(cavX, cavY, mirrorW, cavH);
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(cavX, cavY, mirrorW, cavH);

  // Partial mirror (right — output)
  const partG = ctx.createLinearGradient(cavX + cavW - mirrorW, 0, cavX + cavW, 0);
  partG.addColorStop(0, '#1e293b'); partG.addColorStop(0.5, '#64748b'); partG.addColorStop(1, '#1e293b');
  ctx.fillStyle = partG; ctx.fillRect(cavX + cavW - mirrorW, cavY, mirrorW, cavH);
  ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5;
  ctx.strokeRect(cavX + cavW - mirrorW, cavY, mirrorW, cavH);
  // Dashed (partial)
  ctx.strokeStyle = pColor; ctx.lineWidth = 0.8; ctx.setLineDash([4, 4]);
  ctx.strokeRect(cavX + cavW - mirrorW + 2, cavY + 2, mirrorW - 4, cavH - 4);
  ctx.setLineDash([]);

  ctx.fillStyle = '#94a3b8'; ctx.font = '7px Arial'; ctx.textAlign = 'center';
  ctx.fillText('مرآة كاملة', cavX + mirrorW / 2, cavY - 8);
  ctx.fillText('مرآة جزئية', cavX + cavW - mirrorW / 2, cavY - 8);

  // Gain medium
  const gmG = ctx.createLinearGradient(cavX + mirrorW, cavY, cavX + mirrorW, cavY + cavH);
  gmG.addColorStop(0, 'rgba(99,102,241,0.04)'); gmG.addColorStop(0.5, 'rgba(99,102,241,0.1)'); gmG.addColorStop(1, 'rgba(99,102,241,0.04)');
  ctx.fillStyle = gmG; ctx.fillRect(cavX + mirrorW, cavY, cavW - 2 * mirrorW, cavH);
  ctx.strokeStyle = 'rgba(99,102,241,0.2)'; ctx.lineWidth = 1;
  ctx.strokeRect(cavX + mirrorW, cavY, cavW - 2 * mirrorW, cavH);
  ctx.fillStyle = '#4338ca'; ctx.font = '8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('الوسط الفعّال (Gain Medium)', cavX + cavW / 2, cavY + cavH + 14);

  // Initialize atoms
  if (laserAtomsRef.current.length === 0) {
    const cols = 10, rows = 4;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      laserAtomsRef.current.push({
        x: cavX + mirrorW + 18 + c * ((cavW - 2 * mirrorW - 36) / (cols - 1)),
        y: cavY + 15 + r * ((cavH - 30) / (rows - 1)),
        state: 0, stateTime: 0
      });
    }
  }

  // Update atoms
  if (isPlaying) {
    laserAtomsRef.current.forEach(a => {
      const el = t - a.stateTime;
      if (a.state === 0 && Math.random() < pumpRate * 0.015) { a.state = 2; a.stateTime = t; }
      if (a.state === 2 && el > 0.08) { a.state = 1; a.stateTime = t; } // fast decay to metastable
      if (a.state === 1 && el > 0.5 + Math.random() * 0.3) { // stimulated/spontaneous emission
        a.state = 0; a.stateTime = t;
        laserPhotonsRef.current.push({
          x: a.x, y: a.y + (Math.random() - 0.5) * 4,
          vx: (Math.random() < 0.6 ? 4.5 : (Math.random() < 0.5 ? -4.5 : 2.5 * (Math.random() < 0.5 ? 1 : -1))),
          vy: (Math.random() - 0.5) * 0.3,
          wl, bounces: 0
        });
      }
    });

    // Update photons
    laserPhotonsRef.current = laserPhotonsRef.current.filter(p => {
      p.x += p.vx; p.y += p.vy;
      // Bounce off top/bottom cavity walls
      if (p.y < cavY + 3 || p.y > cavY + cavH - 3) { p.vy = -p.vy; p.bounces++; }
      // Bounce off full mirror
      if (p.x <= cavX + mirrorW + 2 && p.vx < 0) { p.vx = -p.vx; p.bounces++; }
      // Partial mirror — 30% transmit, 70% bounce
      if (p.x >= cavX + cavW - mirrorW - 2 && p.vx > 0) {
        if (Math.random() < 0.3 || p.bounces > 8) {
          p.x = cavX + cavW + 2; // exit beam
        } else { p.vx = -p.vx; p.bounces++; }
      }
      return p.x > cavX - 40 && p.x < W + 20 && p.bounces < 20;
    });
    if (laserPhotonsRef.current.length > 300) laserPhotonsRef.current = laserPhotonsRef.current.slice(-260);
  }

  // Draw atoms
  const atomColors = ['#475569', '#10b981', '#818cf8'];
  const atomGlow = ['', '#10b981', '#818cf8'];
  laserAtomsRef.current.forEach(a => {
    ctx.save();
    if (a.state > 0) { ctx.shadowBlur = 12; ctx.shadowColor = atomGlow[a.state]; }
    ctx.fillStyle = atomColors[a.state];
    ctx.beginPath(); ctx.arc(a.x, a.y, a.state === 2 ? 7 : a.state === 1 ? 6 : 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  });

  // Draw photons
  laserPhotonsRef.current.forEach(p => {
    const inside = p.x > cavX && p.x < cavX + cavW;
    ctx.save();
    if (inside) { ctx.shadowBlur = 8; ctx.shadowColor = pColor; }
    ctx.fillStyle = inside ? pColor : `${pColor.replace(/[\d.]+\)$/, '0.7)')}`;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  });

  // Output beam outside cavity
  const beamPhotons = laserPhotonsRef.current.filter(p => p.x > cavX + cavW);
  if (beamPhotons.length > 0) {
    const beamG = ctx.createLinearGradient(cavX + cavW, cavY + cavH / 2, W - 10, cavY + cavH / 2);
    beamG.addColorStop(0, wlColor(wl, 0.7)); beamG.addColorStop(1, wlColor(wl, 0.08));
    ctx.fillStyle = beamG;
    ctx.fillRect(cavX + cavW, cavY + cavH / 2 - 6, W - cavX - cavW - 10, 12);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
    ctx.fillText('شعاع ليزر متماسك →', cavX + cavW + 6, cavY + cavH / 2 - 12);
  }

  // Energy level diagram (bottom left)
  const diagX = 12, diagY = cavY + cavH + 30, diagW = 180, diagH = H - diagY - 15;
  ctx.fillStyle = 'rgba(15,23,42,0.9)'; roundRect(ctx, diagX, diagY, diagW, diagH, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.3)'; ctx.lineWidth = 1; roundRect(ctx, diagX, diagY, diagW, diagH, 8); ctx.stroke();
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('مستويات الطاقة', diagX + diagW / 2, diagY + 14);
  const levels = [
    { y: diagY + diagH - 15, label: 'E₀ (أساسي)', color: '#475569' },
    { y: diagY + diagH * 0.45, label: 'E₁ (شبه ثابت)', color: '#10b981' },
    { y: diagY + 28, label: 'E₂ (ضخ)', color: '#818cf8' },
  ];
  levels.forEach(l => {
    ctx.strokeStyle = l.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(diagX + 8, l.y); ctx.lineTo(diagX + diagW - 8, l.y); ctx.stroke();
    ctx.fillStyle = l.color; ctx.font = '7px monospace'; ctx.textAlign = 'left';
    ctx.fillText(l.label, diagX + 10, l.y - 3);
  });
  // Pump arrow
  ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = '#818cf8';
  ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(diagX + 40, levels[0].y); ctx.lineTo(diagX + 40, levels[2].y); ctx.stroke();
  ctx.fillStyle = '#818cf8'; ctx.beginPath();
  ctx.moveTo(diagX + 40, levels[2].y); ctx.lineTo(diagX + 35, levels[2].y + 10); ctx.lineTo(diagX + 45, levels[2].y + 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#818cf8'; ctx.font = '7px Arial'; ctx.textAlign = 'center'; ctx.fillText('ضخ', diagX + 40, levels[1].y + 6); ctx.restore();
  // Emission arrow
  ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = pColor;
  ctx.strokeStyle = pColor; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(diagX + 140, levels[1].y); ctx.lineTo(diagX + 140, levels[0].y); ctx.stroke();
  ctx.fillStyle = pColor; ctx.beginPath();
  ctx.moveTo(diagX + 140, levels[0].y); ctx.lineTo(diagX + 135, levels[0].y - 10); ctx.lineTo(diagX + 145, levels[0].y - 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = pColor; ctx.font = '7px Arial'; ctx.textAlign = 'center'; ctx.fillText('إصدار', diagX + 140, levels[0].y + 12); ctx.restore();

  // Stats
  const excited = laserAtomsRef.current.filter(a => a.state === 1).length;
  const total = laserAtomsRef.current.length;
  const inverted = excited > total / 2;
  ctx.fillStyle = 'rgba(15,23,42,0.9)'; roundRect(ctx, diagX + diagW + 8, diagY, 200, diagH, 8); ctx.fill();
  ctx.strokeStyle = inverted ? 'rgba(16,185,129,0.4)' : 'rgba(100,116,139,0.3)'; ctx.lineWidth = 1;
  roundRect(ctx, diagX + diagW + 8, diagY, 200, diagH, 8); ctx.stroke();
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('إحصاءات الليزر', diagX + diagW + 108, diagY + 14);
  [
    { l: 'ذرات متحمسة E₁', v: `${excited}/${total}`, c: '#10b981' },
    { l: 'انقلاب التجمع', v: inverted ? '✓ محقق' : '✗ لا يزال', c: inverted ? '#4ade80' : '#f87171' },
    { l: 'فوتونات في التجويف', v: `${laserPhotonsRef.current.filter(p => p.x > cavX && p.x < cavX + cavW).length}`, c: pColor },
    { l: 'الطول الموجي', v: `λ=${wl}nm`, c: pColor },
  ].forEach((r, i) => {
    ctx.fillStyle = '#475569'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.l + ':', diagX + diagW + 14, diagY + 32 + i * 18);
    ctx.fillStyle = r.c; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'right';
    ctx.fillText(r.v, diagX + diagW + 202, diagY + 32 + i * 18);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ❓ 10. HEISENBERG UNCERTAINTY PRINCIPLE
// ═══════════════════════════════════════════════════════════════════════════

function drawHeisenberg(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, isPlaying: boolean, t: number
) {
  const dx = clamp(vars.dx ?? 1e-9, 1e-12, 1e-6);
  const hbar = 1.055e-34;
  const me = 9.109e-31;
  const dp = hbar / (2 * dx);
  const dv = dp / me;

  drawBackground(ctx, W, H);

  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('مبدأ هايزنبرغ لعدم اليقين', W / 2, 28);
  ctx.fillStyle = '#475569'; ctx.font = '8px Arial';
  ctx.fillText('ΔxΔp ≥ ℏ/2  |  كلما قلّ Δx، كلما زاد Δp', W / 2, 44);

  const panelY = 62, panelH = (H - panelY - 80) / 2, gap = 20;

  // σ_x for display (normalized to 0-1 range of canvas)
  const dxNorm = Math.log10(dx / 1e-12) / Math.log10(1e-6 / 1e-12);
  const dpNorm = 1 - dxNorm;
  const sigX = Math.max(8, dxNorm * 140);
  const sigP = Math.max(8, dpNorm * 140);

  // Panel 1: Position space ψ(x)
  ctx.fillStyle = 'rgba(15,23,42,0.88)'; roundRect(ctx, 20, panelY, W - 40, panelH, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(34,211,238,0.4)'; ctx.lineWidth = 1; roundRect(ctx, 20, panelY, W - 40, panelH, 8); ctx.stroke();
  ctx.fillStyle = '#22d3ee'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
  ctx.fillText('ψ(x) — دالة موجة الموقع', 30, panelY + 16);
  const wCx = W / 2, wCy = panelY + panelH / 2;
  ctx.save();
  const phase = isPlaying ? t * 2.5 : 0;
  for (let i = 0; i <= 400; i++) {
    const xi = (i / 400) * W - W / 2;
    const envelope = Math.exp(-xi * xi / (2 * sigX * sigX));
    const carrier = Math.cos(xi * 0.3 + phase);
    const psi = envelope * carrier * (panelH / 2 - 14);
    const col = `rgba(34,211,238,${Math.abs(envelope) * 0.9})`;
    if (i === 0) { ctx.beginPath(); ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; ctx.moveTo(wCx + xi * 0.4, wCy - psi); }
    else ctx.lineTo(wCx + xi * 0.4, wCy - psi);
  }
  ctx.stroke();
  // |ψ|² fill
  ctx.beginPath();
  for (let i = 0; i <= 400; i++) {
    const xi = (i / 400) * W - W / 2;
    const envelope = Math.exp(-xi * xi / (2 * sigX * sigX));
    const py = wCy - envelope * (panelH / 2 - 14);
    if (i === 0) ctx.moveTo(wCx + xi * 0.4, wCy); else if (i === 1) { ctx.lineTo(wCx + xi * 0.4, wCy); ctx.lineTo(wCx + xi * 0.4, py); } else ctx.lineTo(wCx + xi * 0.4, py);
  }
  ctx.lineTo(wCx + (400 / 400) * W * 0.4 - W * 0.2, wCy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(34,211,238,0.08)'; ctx.fill(); ctx.restore();

  // Δx indicator
  ctx.save(); ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(wCx - sigX * 0.4, panelY + 6); ctx.lineTo(wCx - sigX * 0.4, panelY + panelH - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wCx + sigX * 0.4, panelY + 6); ctx.lineTo(wCx + sigX * 0.4, panelY + panelH - 4); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(wCx - sigX * 0.4, wCy); ctx.lineTo(wCx + sigX * 0.4, wCy); ctx.stroke();
  ctx.fillStyle = '#22d3ee'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  const dxLabel = dx < 1e-9 ? `${(dx * 1e12).toFixed(0)} pm` : dx < 1e-6 ? `${(dx * 1e9).toFixed(1)} nm` : `${(dx * 1e6).toFixed(2)} μm`;
  ctx.fillText(`Δx = ${dxLabel}`, wCx, panelY + panelH - 6); ctx.restore();

  // Panel 2: Momentum space φ(p)
  const panel2Y = panelY + panelH + gap;
  ctx.fillStyle = 'rgba(15,23,42,0.88)'; roundRect(ctx, 20, panel2Y, W - 40, panelH, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(251,191,36,0.4)'; ctx.lineWidth = 1; roundRect(ctx, 20, panel2Y, W - 40, panelH, 8); ctx.stroke();
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
  ctx.fillText('φ(p) — دالة موجة الزخم', 30, panel2Y + 16);
  const pCy = panel2Y + panelH / 2;
  ctx.save(); ctx.beginPath(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
  for (let i = 0; i <= 400; i++) {
    const pi2 = (i / 400) * W - W / 2;
    const envelopeP = Math.exp(-pi2 * pi2 / (2 * sigP * sigP));
    const py = pCy - envelopeP * (panelH / 2 - 14);
    if (i === 0) ctx.moveTo(wCx + pi2 * 0.4, py); else ctx.lineTo(wCx + pi2 * 0.4, py);
  }
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i <= 400; i++) {
    const pi2 = (i / 400) * W - W / 2;
    const envelopeP = Math.exp(-pi2 * pi2 / (2 * sigP * sigP));
    const py = pCy - envelopeP * (panelH / 2 - 14);
    if (i === 0) { ctx.moveTo(wCx + pi2 * 0.4, pCy); ctx.lineTo(wCx + pi2 * 0.4, py); } else ctx.lineTo(wCx + pi2 * 0.4, py);
  }
  ctx.lineTo(wCx + (200) * 0.4, pCy); ctx.closePath();
  ctx.fillStyle = 'rgba(251,191,36,0.08)'; ctx.fill(); ctx.restore();

  ctx.save(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(wCx - sigP * 0.4, panel2Y + 6); ctx.lineTo(wCx - sigP * 0.4, panel2Y + panelH - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wCx + sigP * 0.4, panel2Y + 6); ctx.lineTo(wCx + sigP * 0.4, panel2Y + panelH - 4); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(wCx - sigP * 0.4, pCy); ctx.lineTo(wCx + sigP * 0.4, pCy); ctx.stroke();
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText(`Δp = ${dp.toExponential(2)} kg·m/s`, wCx, panel2Y + panelH - 6); ctx.restore();

  // Info panel bottom
  ctx.fillStyle = 'rgba(15,23,42,0.93)';
  roundRect(ctx, 20, panel2Y + panelH + 10, W - 40, H - panel2Y - panelH - 20, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(239,68,68,0.3)'; ctx.lineWidth = 1;
  roundRect(ctx, 20, panel2Y + panelH + 10, W - 40, H - panel2Y - panelH - 20, 8); ctx.stroke();
  const iy = panel2Y + panelH + 26;
  [
    { l: 'Δx (الموقع)', v: dxLabel, c: '#22d3ee' },
    { l: 'Δp (الزخم)', v: `${dp.toExponential(2)} kg·m/s`, c: '#fbbf24' },
    { l: 'Δv (السرعة)', v: `${dv.toExponential(2)} m/s`, c: '#f87171' },
    { l: 'ΔxΔp', v: `${(dx * dp).toExponential(2)} ≥ ℏ/2=${(hbar / 2).toExponential(2)}`, c: '#4ade80' },
  ].forEach((r, i) => {
    ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.l + ':', 30, iy + i * 16);
    ctx.fillStyle = r.c; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(r.v, W - 28, iy + i * 16);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 💡 11. SEMICONDUCTOR & P-N JUNCTION
// ═══════════════════════════════════════════════════════════════════════════

interface BandElectron { x: number; y: number; vx: number; vy: number; inConduction: boolean; life: number; }
interface Hole { x: number; y: number; vx: number; vy: number; life: number; }

function drawSemiconductor(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, isPlaying: boolean,
  bandElectronsRef: React.MutableRefObject<BandElectron[]>,
  holesRef: React.MutableRefObject<Hole[]>,
  t: number
) {
  const kT = 0.026 * clamp(vars.T ?? 300, 10, 1000) / 300;
  const Eg = clamp(vars.Eg ?? 1.12, 0.1, 5); // band gap eV (Si = 1.12)
  const exciteProb = Math.exp(-Eg / (2 * kT));

  drawBackground(ctx, W, H);
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('أشباه الموصلات وتقاطع p-n', W / 2, 28);

  // Band diagram
  const bX = 18, bY = 50, bW = W * 0.54, bH = H - 120;
  const valBandY = bY + bH * 0.65;
  const condBandY = bY + bH * 0.18;
  const gapH = valBandY - condBandY - 10;

  // Conduction band
  const condG = ctx.createLinearGradient(bX, condBandY, bX, condBandY + 35);
  condG.addColorStop(0, 'rgba(99,102,241,0.35)'); condG.addColorStop(1, 'rgba(99,102,241,0.05)');
  ctx.fillStyle = condG; ctx.fillRect(bX, condBandY, bW, 35);
  ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(bX, condBandY); ctx.lineTo(bX + bW, condBandY); ctx.stroke();
  ctx.fillStyle = '#818cf8'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
  ctx.fillText('نطاق التوصيل (CB)', bX + 5, condBandY - 5);

  // Band gap
  ctx.fillStyle = 'rgba(15,23,42,0.6)'; ctx.fillRect(bX, condBandY + 35, bW, gapH - 35);
  ctx.strokeStyle = 'rgba(239,68,68,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(bX, condBandY + 35 + (gapH - 35) / 2); ctx.lineTo(bX + bW, condBandY + 35 + (gapH - 35) / 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#f87171'; ctx.font = '9px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`Eg = ${Eg.toFixed(2)} eV`, bX + bW / 2, condBandY + 35 + (gapH - 35) / 2 + 4);

  // Valence band
  const valG = ctx.createLinearGradient(bX, valBandY - 35, bX, valBandY);
  valG.addColorStop(0, 'rgba(16,185,129,0.05)'); valG.addColorStop(1, 'rgba(16,185,129,0.35)');
  ctx.fillStyle = valG; ctx.fillRect(bX, valBandY - 35, bW, 35);
  ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(bX, valBandY - 35); ctx.lineTo(bX + bW, valBandY - 35); ctx.stroke();
  ctx.fillStyle = '#10b981'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
  ctx.fillText('نطاق التكافؤ (VB)', bX + 5, valBandY + 10);

  // Spawn electrons thermally excited
  if (isPlaying && Math.random() < exciteProb * 0.15) {
    const ex = bX + 10 + Math.random() * (bW - 20);
    bandElectronsRef.current.push({
      x: ex, y: condBandY + 15,
      vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 0.3,
      inConduction: true, life: 3 + Math.random() * 4
    });
    holesRef.current.push({
      x: ex + (Math.random() - 0.5) * 20, y: valBandY - 20,
      vx: (Math.random() - 0.5) * 0.8, vy: 0, life: 3 + Math.random() * 4
    });
  }

  // Update electrons
  if (isPlaying) {
    bandElectronsRef.current = bandElectronsRef.current.filter(e => {
      e.x += e.vx; e.y += e.vy; e.life -= 0.02;
      if (e.x < bX + 5 || e.x > bX + bW - 5) e.vx = -e.vx;
      e.y = clamp(e.y, condBandY + 5, condBandY + 28);
      return e.life > 0;
    });
    holesRef.current = holesRef.current.filter(h => {
      h.x += h.vx; h.y += h.vy; h.life -= 0.02;
      if (h.x < bX + 5 || h.x > bX + bW - 5) h.vx = -h.vx;
      h.y = clamp(h.y, valBandY - 32, valBandY - 8);
      return h.life > 0;
    });
    if (bandElectronsRef.current.length > 80) bandElectronsRef.current = bandElectronsRef.current.slice(-70);
    if (holesRef.current.length > 80) holesRef.current = holesRef.current.slice(-70);
  }

  // Draw conduction electrons
  bandElectronsRef.current.forEach(e => {
    ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = '#818cf8';
    ctx.fillStyle = `rgba(129,140,248,${clamp(e.life / 4, 0, 0.9)})`;
    ctx.beginPath(); ctx.arc(e.x, e.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '5px Arial'; ctx.textAlign = 'center';
    ctx.fillText('e', e.x, e.y + 2); ctx.restore();
  });

  // Draw holes
  holesRef.current.forEach(h => {
    ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = '#10b981';
    ctx.strokeStyle = `rgba(16,185,129,${clamp(h.life / 4, 0, 0.9)})`;
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(h.x, h.y, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(16,185,129,${clamp(h.life / 6, 0, 0.5)})`;
    ctx.beginPath(); ctx.arc(h.x, h.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#34d399'; ctx.font = '6px Arial'; ctx.textAlign = 'center';
    ctx.fillText('+', h.x, h.y + 2); ctx.restore();
  });

  // Transition arrow animation
  if (isPlaying && bandElectronsRef.current.length > 0) {
    const e = bandElectronsRef.current[0];
    if (Math.sin(t * 1.5) > 0.8) {
      ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = '#fbbf24';
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(e.x, condBandY); ctx.lineTo(e.x, valBandY - 35); ctx.stroke();
      ctx.fillStyle = '#fbbf24'; ctx.beginPath();
      ctx.moveTo(e.x, valBandY - 35); ctx.lineTo(e.x - 5, valBandY - 45); ctx.lineTo(e.x + 5, valBandY - 45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fbbf24'; ctx.font = '7px Arial'; ctx.textAlign = 'center';
      ctx.fillText('إعادة تركيب', e.x + 20, (condBandY + valBandY - 35) / 2);
      ctx.restore();
    }
  }

  // P-N Junction diagram (right panel)
  const jX = bX + bW + 18, jY = bY, jW = W - jX - 10, jH = H - 120;
  ctx.fillStyle = 'rgba(15,23,42,0.9)'; roundRect(ctx, jX, jY, jW, jH, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.3)'; ctx.lineWidth = 1; roundRect(ctx, jX, jY, jW, jH, 8); ctx.stroke();
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('تقاطع p-n', jX + jW / 2, jY + 15);
  const jMid = jX + jW / 2;
  // p-region
  ctx.fillStyle = 'rgba(239,68,68,0.08)'; ctx.fillRect(jX + 5, jY + 22, jW / 2 - 5, jH - 30);
  ctx.fillStyle = '#f87171'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('p', jX + jW / 4, jY + 35);
  // n-region
  ctx.fillStyle = 'rgba(59,130,246,0.08)'; ctx.fillRect(jMid, jY + 22, jW / 2 - 5, jH - 30);
  ctx.fillStyle = '#60a5fa'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('n', jX + jW * 3 / 4, jY + 35);
  // Depletion region
  const deplW = 16;
  ctx.fillStyle = 'rgba(148,163,184,0.15)'; ctx.fillRect(jMid - deplW / 2, jY + 22, deplW, jH - 30);
  ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
  ctx.beginPath(); ctx.moveTo(jMid, jY + 22); ctx.lineTo(jMid, jY + jH - 8); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#64748b'; ctx.font = '6px Arial'; ctx.textAlign = 'center';
  ctx.fillText('منطقة الحرمان', jMid, jY + jH - 10);

  // Electric field arrow
  ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = '#f97316';
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(jMid + deplW / 2, jY + jH / 2); ctx.lineTo(jMid - deplW / 2, jY + jH / 2); ctx.stroke();
  ctx.fillStyle = '#f97316'; ctx.beginPath();
  ctx.moveTo(jMid - deplW / 2, jY + jH / 2); ctx.lineTo(jMid - deplW / 2 + 8, jY + jH / 2 - 4);
  ctx.lineTo(jMid - deplW / 2 + 8, jY + jH / 2 + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f97316'; ctx.font = '6px Arial'; ctx.textAlign = 'center';
  ctx.fillText('E⃗', jMid, jY + jH / 2 - 8); ctx.restore();

  // Moving carriers
  if (isPlaying) {
    const ph = Math.sin(t * 1.2);
    // Holes in p side moving right
    for (let i = 0; i < 3; i++) {
      const hx = jX + 10 + ((t * 18 + i * 40) % (jW / 2 - 20));
      ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = '#f87171';
      ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hx, jY + 50 + i * 18, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#f87171'; ctx.font = '6px Arial'; ctx.textAlign = 'center';
      ctx.fillText('+', hx, jY + 53 + i * 18); ctx.restore();
    }
    // Electrons in n side moving left
    for (let i = 0; i < 3; i++) {
      const ex = jMid + jW / 2 - 15 - ((t * 18 + i * 40) % (jW / 2 - 20));
      ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = '#60a5fa';
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath(); ctx.arc(ex, jY + 50 + i * 18, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '5px Arial'; ctx.textAlign = 'center';
      ctx.fillText('e', ex, jY + 53 + i * 18); ctx.restore();
    }
  }

  // Bottom info
  ctx.fillStyle = 'rgba(15,23,42,0.93)'; roundRect(ctx, 18, H - 60, W - 36, 50, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(16,185,129,0.3)'; ctx.lineWidth = 1; roundRect(ctx, 18, H - 60, W - 36, 50, 8); ctx.stroke();
  [
    { l: 'فجوة الطاقة Eg (Si=1.12 eV)', v: `${Eg.toFixed(2)} eV`, c: '#f87171' },
    { l: 'الحرارة kT', v: `${kT.toFixed(4)} eV`, c: '#fbbf24' },
    { l: 'إلكترونات CB / فجوات VB', v: `${bandElectronsRef.current.length} / ${holesRef.current.length}`, c: '#818cf8' },
  ].forEach((r, i) => {
    ctx.fillStyle = '#475569'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.l + ':', 26, H - 46 + i * 17);
    ctx.fillStyle = r.c; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'right';
    ctx.fillText(r.v, W - 26, H - 46 + i * 17);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌊 12. WAVE-PARTICLE DUALITY (de Broglie)
// ═══════════════════════════════════════════════════════════════════════════

function drawWaveParticleDuality(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, isPlaying: boolean, t: number
) {
  const m = clamp(vars.m ?? 9.11e-31, 1e-31, 1e-25);
  const v = 2e6; // fixed velocity for display
  const h = 6.626e-34;
  const p = m * v;
  const lambda = h / p;
  const lambdaNm = lambda * 1e9;

  drawBackground(ctx, W, H);
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('ازدواجية الموجة-الجسيم — دوبروي', W / 2, 26);
  ctx.fillStyle = '#475569'; ctx.font = '8px Arial';
  ctx.fillText(`λ = h/p = h/(mv)  |  λ = ${lambdaNm < 0.001 ? lambdaNm.toExponential(2) : lambdaNm.toFixed(4)} nm`, W / 2, 42);

  const panelH = (H - 120) / 2;
  const panel1Y = 58, panel2Y = panel1Y + panelH + 16;

  // Panel 1 — Wave representation
  ctx.fillStyle = 'rgba(15,23,42,0.85)'; roundRect(ctx, 14, panel1Y, W - 28, panelH, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.4)'; ctx.lineWidth = 1; roundRect(ctx, 14, panel1Y, W - 28, panelH, 8); ctx.stroke();
  ctx.fillStyle = '#818cf8'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
  ctx.fillText('🌊 كموجة — deBroglie Wave Packet', 22, panel1Y + 15);

  const wCy = panel1Y + panelH / 2;
  const pixPerNm = Math.min(80, W / (lambdaNm * 6 + 1));
  const kNum = (2 * Math.PI) / Math.max(lambdaNm * pixPerNm, 5);
  const sigmaW = Math.min(W / 5, Math.max(20, lambdaNm * pixPerNm * 2));
  const waveX0 = isPlaying ? ((t * 40) % (W - 60)) + 30 : W / 2;

  ctx.save(); ctx.beginPath();
  for (let x = 14; x < W - 14; x++) {
    const xi = x - waveX0;
    const envelope = Math.exp(-xi * xi / (2 * sigmaW * sigmaW));
    const carrier = Math.cos(kNum * xi - (isPlaying ? t * 5 : 0));
    const py = wCy - envelope * carrier * (panelH / 2 - 12);
    if (x === 14) ctx.moveTo(x, py); else ctx.lineTo(x, py);
  }
  ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2; ctx.stroke();
  // Envelope
  ctx.beginPath();
  for (let x = 14; x < W - 14; x++) {
    const xi = x - waveX0;
    const env = Math.exp(-xi * xi / (2 * sigmaW * sigmaW)) * (panelH / 2 - 12);
    if (x === 14) ctx.moveTo(x, wCy - env); else ctx.lineTo(x, wCy - env);
  }
  ctx.strokeStyle = 'rgba(129,140,248,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke();
  ctx.beginPath();
  for (let x = 14; x < W - 14; x++) {
    const xi = x - waveX0;
    const env = Math.exp(-xi * xi / (2 * sigmaW * sigmaW)) * (panelH / 2 - 12);
    if (x === 14) ctx.moveTo(x, wCy + env); else ctx.lineTo(x, wCy + env);
  }
  ctx.stroke(); ctx.setLineDash([]); ctx.restore();

  // Panel 2 — Particle representation
  ctx.fillStyle = 'rgba(15,23,42,0.85)'; roundRect(ctx, 14, panel2Y, W - 28, panelH, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(251,191,36,0.4)'; ctx.lineWidth = 1; roundRect(ctx, 14, panel2Y, W - 28, panelH, 8); ctx.stroke();
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
  ctx.fillText('⚡ كجسيم — Classical Particle', 22, panel2Y + 15);

  const pCy = panel2Y + panelH / 2;
  const pX = isPlaying ? ((t * 40) % (W - 60)) + 30 : W / 2;
  // Trail
  for (let i = 1; i <= 20; i++) {
    const trailX = pX - i * 2;
    const ta = (1 - i / 20) * 0.5;
    ctx.save(); ctx.shadowBlur = 4; ctx.shadowColor = '#fbbf24';
    ctx.fillStyle = `rgba(251,191,36,${ta})`;
    ctx.beginPath(); ctx.arc(trailX, pCy, (1 - i / 20) * 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = '#fbbf24';
  const pg = ctx.createRadialGradient(pX - 3, pCy - 3, 0, pX, pCy, 12);
  pg.addColorStop(0, '#fff'); pg.addColorStop(0.4, '#fbbf24'); pg.addColorStop(1, '#92400e');
  ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(pX, pCy, 12, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('e⁻', pX, pCy + 3);

  // Info
  ctx.fillStyle = 'rgba(15,23,42,0.93)'; roundRect(ctx, 14, panel2Y + panelH + 10, W - 28, H - panel2Y - panelH - 20, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(251,191,36,0.3)'; ctx.lineWidth = 1; roundRect(ctx, 14, panel2Y + panelH + 10, W - 28, H - panel2Y - panelH - 20, 8); ctx.stroke();
  const iy2 = panel2Y + panelH + 26;
  const mLabel = m < 1e-28 ? `${(m / 9.11e-31).toFixed(1)} mₑ (إلكترون)` : `${(m * 1e28).toFixed(2)} × 10⁻²⁸ kg`;
  [
    { l: 'الكتلة m', v: mLabel, c: '#fbbf24' },
    { l: 'السرعة v', v: `${(v / 1e6).toFixed(2)} × 10⁶ m/s`, c: '#22d3ee' },
    { l: 'الزخم p=mv', v: `${(p).toExponential(2)} kg·m/s`, c: '#94a3b8' },
    { l: 'الطول الموجي λ=h/p', v: `${lambdaNm < 0.001 ? lambdaNm.toExponential(3) : lambdaNm.toFixed(4)} nm`, c: '#818cf8' },
  ].forEach((r, i) => {
    ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.l + ':', 22, iy2 + i * 17);
    ctx.fillStyle = r.c; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(r.v, W - 22, iy2 + i * 17);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔬 13. PARTICLE PHYSICS COLLIDER
// ═══════════════════════════════════════════════════════════════════════════

interface ColliderParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; r: number; color: string; label: string;
  trail: { x: number; y: number }[];
}
type ColliderState = 'circulating' | 'collision' | 'spray' | 'reset';

function drawParticlePhysics(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  vars: Record<string, number>, isPlaying: boolean,
  collStateRef: React.MutableRefObject<ColliderState>,
  collTimeRef: React.MutableRefObject<number>,
  collParticlesRef: React.MutableRefObject<ColliderParticle[]>,
  collCountRef: React.MutableRefObject<number>,
  t: number
) {
  const E = clamp(vars.E ?? 1, 0.1, 100); // GeV
  const cx = W / 2, cy = H / 2;

  drawBackground(ctx, W, H);

  // Title
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('مصادم الهادرونات — Particle Collider', cx, 26);
  ctx.fillStyle = '#475569'; ctx.font = '8px Arial';
  ctx.fillText(`طاقة التصادم: ${E.toFixed(1)} GeV = ${(E * 1.6e-10).toExponential(2)} J`, cx, 42);

  // Accelerator ring
  const ringR = Math.min(W, H) * 0.34;
  const ringG = ctx.createRadialGradient(cx, cy, ringR - 8, cx, cy, ringR + 8);
  ringG.addColorStop(0, 'rgba(99,102,241,0.15)'); ringG.addColorStop(0.5, 'rgba(59,130,246,0.3)'); ringG.addColorStop(1, 'rgba(99,102,241,0.1)');
  ctx.strokeStyle = ringG as unknown as string;
  ctx.fillStyle = ringG; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(148,163,184,0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, ringR - 8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, ringR + 8, 0, Math.PI * 2); ctx.stroke();

  // LHC labels
  ctx.fillStyle = '#334155'; ctx.font = '7px Arial'; ctx.textAlign = 'center';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const lx = cx + (ringR + 22) * Math.cos(a), ly = cy + (ringR + 22) * Math.sin(a);
    ctx.fillText(`D${i + 1}`, lx, ly + 3);
  }

  // State machine
  if (isPlaying) {
    const el = t - collTimeRef.current;
    switch (collStateRef.current) {
      case 'circulating':
        if (el > 3) { collStateRef.current = 'collision'; collTimeRef.current = t; } break;
      case 'collision':
        if (el > 0.5) {
          collStateRef.current = 'spray'; collTimeRef.current = t; collCountRef.current++;
          const particleTypes = [
            { label: 'π⁺', color: '#f97316', r: 4 }, { label: 'π⁻', color: '#818cf8', r: 4 },
            { label: 'π⁰', color: '#94a3b8', r: 4 }, { label: 'K⁺', color: '#fbbf24', r: 5 },
            { label: 'K⁻', color: '#22d3ee', r: 5 }, { label: 'p', color: '#f87171', r: 6 },
            { label: 'μ⁺', color: '#a78bfa', r: 4 }, { label: 'μ⁻', color: '#6d28d9', r: 4 },
            { label: 'e⁺', color: '#34d399', r: 3 }, { label: 'e⁻', color: '#10b981', r: 3 },
            { label: 'γ', color: '#fff', r: 3 }, { label: 'n', color: '#64748b', r: 5 },
          ];
          const numP = 8 + Math.round(E * 1.5);
          for (let i = 0; i < numP; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 1.5 + Math.random() * 3.5 * (E / 10);
            const pt = particleTypes[Math.floor(Math.random() * particleTypes.length)];
            collParticlesRef.current.push({ x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 1, r: pt.r, color: pt.color, label: pt.label, trail: [] });
          }
        } break;
      case 'spray':
        collParticlesRef.current.forEach(p => {
          p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 18) p.trail.shift();
          p.x += p.vx; p.y += p.vy; p.vx *= 0.992; p.vy *= 0.992; p.life -= 0.006;
        });
        collParticlesRef.current = collParticlesRef.current.filter(p => p.life > 0);
        if (el > 6 || collParticlesRef.current.length === 0) { collStateRef.current = 'reset'; collTimeRef.current = t; } break;
      case 'reset':
        collParticlesRef.current = [];
        if (el > 1) { collStateRef.current = 'circulating'; collTimeRef.current = t; } break;
    }
  }

  const state = collStateRef.current;

  // Circulating beams
  if (state === 'circulating' || state === 'collision') {
    const el = t - collTimeRef.current;
    const prog = state === 'circulating' ? (el / 3) : 1;

    for (let beam = 0; beam < 2; beam++) {
      const dir = beam === 0 ? 1 : -1;
      const numDots = 6;
      for (let i = 0; i < numDots; i++) {
        const a = (i / numDots) * Math.PI * 2 + t * dir * 2;
        const bx = cx + ringR * Math.cos(a), by = cy + ringR * Math.sin(a);
        if (state === 'collision' && el > 0.2) continue; // hide during collision
        ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = beam === 0 ? '#f87171' : '#60a5fa';
        ctx.fillStyle = beam === 0 ? '#f87171' : '#60a5fa';
        ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = '5px Arial'; ctx.textAlign = 'center';
        ctx.fillText(beam === 0 ? 'p' : 'p̄', bx, by + 2);
      }
    }
  }

  // Collision flash
  if (state === 'collision') {
    const el = t - collTimeRef.current;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - el * 2.5);
    const flashG = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
    flashG.addColorStop(0, '#fff'); flashG.addColorStop(0.2, '#fef08a'); flashG.addColorStop(0.5, '#f97316'); flashG.addColorStop(1, 'transparent');
    ctx.fillStyle = flashG; ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  // Spray particles
  collParticlesRef.current.forEach(p => {
    p.trail.forEach((pt, i) => {
      ctx.fillStyle = `${p.color}${Math.round((i / p.trail.length) * p.life * 40).toString(16).padStart(2, '0')}`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, p.r * (i / p.trail.length) * 0.7, 0, Math.PI * 2); ctx.fill();
    });
    ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = p.color;
    ctx.fillStyle = `${p.color}${Math.round(p.life * 220).toString(16).padStart(2, '0')}`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = `rgba(255,255,255,${p.life * 0.85})`;
    ctx.font = `bold ${p.r + 2}px Arial`; ctx.textAlign = 'center';
    ctx.fillText(p.label, p.x, p.y - p.r - 2);
  });

  // Info panel
  ctx.fillStyle = 'rgba(15,23,42,0.93)'; roundRect(ctx, 8, H - 100, 280, 95, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(239,68,68,0.3)'; ctx.lineWidth = 1; roundRect(ctx, 8, H - 100, 280, 95, 8); ctx.stroke();
  const stateLabel: Record<ColliderState, string> = {
    circulating: '🔄 الحزمتان تدوران في الحلقة',
    collision: '💥 تصادم! إنشاء جسيمات جديدة',
    spray: '🔬 رصد الجسيمات الناتجة',
    reset: '⬤ إعادة التهيئة...'
  };
  ctx.fillStyle = state === 'collision' || state === 'spray' ? '#f97316' : '#94a3b8';
  ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
  ctx.fillText(stateLabel[state], 14, H - 85);
  [
    { l: 'طاقة التصادم E', v: `${E.toFixed(1)} GeV`, c: '#fbbf24' },
    { l: 'جسيمات ناتجة', v: `${collParticlesRef.current.length}`, c: '#f97316' },
    { l: 'إجمالي التصادمات', v: `${collCountRef.current}`, c: '#22d3ee' },
    { l: 'الحالة', v: state, c: '#94a3b8' },
  ].forEach((r, i) => {
    ctx.fillStyle = '#475569'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
    ctx.fillText(r.l + ':', 14, H - 67 + i * 17);
    ctx.fillStyle = r.c; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'right';
    ctx.fillText(r.v, 283, H - 67 + i * 17);
  });

  // Standard model legend
  ctx.fillStyle = 'rgba(15,23,42,0.88)'; roundRect(ctx, W - 180, H - 100, 170, 95, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.3)'; ctx.lineWidth = 1; roundRect(ctx, W - 180, H - 100, 170, 95, 8); ctx.stroke();
  ctx.fillStyle = '#64748b'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('الجسيمات الأولية', W - 95, H - 87);
  const legend = [['π (بيون)', '#f97316'], ['K (كاون)', '#fbbf24'], ['p/n', '#f87171'], ['μ (ميوون)', '#a78bfa'], ['e± (إلكترون)', '#34d399'], ['γ (فوتون)', '#fff']];
  legend.forEach(([name, col], i) => {
    ctx.save(); ctx.shadowBlur = 4; ctx.shadowColor = col as string;
    ctx.fillStyle = col as string; ctx.beginPath(); ctx.arc(W - 168, H - 75 + i * 14, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#94a3b8'; ctx.font = '7px Arial'; ctx.textAlign = 'left';
    ctx.fillText(name as string, W - 160, H - 72 + i * 14);
  });
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

  // Photoelectric
  const photoParticlesRef = useRef<PhotoParticle[]>([]);
  const photoFlashRef = useRef<{ x: number; y: number; life: number }[]>([]);
  // Double-slit
  const dotsRef = useRef<{ y: number }[]>([]);
  const slitParticlesRef = useRef<SlitParticle[]>([]);
  // Radioactive decay
  const atomsRef = useRef<AtomCell[]>([]);
  const raysRef = useRef<DecayRay[]>([]);
  const histRef = useRef<{ t: number; n: number }[]>([]);
  // Fission
  const fissStateRef = useRef<FissState>('idle');
  const fissNeutronRef = useRef<{ x: number; y: number }>({ x: 55, y: 170 });
  const fissTimeRef = useRef<number>(0);
  const fragmentsRef = useRef<FissFragment[]>([]);
  const chainRef = useRef<ChainNeutron[]>([]);
  // Compton
  const compStateRef = useRef<ComptonState>('incoming');
  const compTimeRef = useRef<number>(0);
  const compPhotonRef = useRef<{ x: number; y: number } | null>(null);
  const compElectronRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const compScatterRef = useRef<ComptonPhoton | null>(null);
  // Laser
  const laserPhotonsRef = useRef<LaserPhoton[]>([]);
  const laserAtomsRef = useRef<LaserAtom[]>([]);
  // Semiconductor
  const bandElectronsRef = useRef<BandElectron[]>([]);
  const holesRef = useRef<Hole[]>([]);
  // Particle physics
  const collStateRef = useRef<ColliderState>('circulating');
  const collTimeRef = useRef<number>(0);
  const collParticlesRef = useRef<ColliderParticle[]>([]);
  const collCountRef = useRef<number>(0);

  useEffect(() => {
    // Reset all state on experiment change
    photoParticlesRef.current = []; photoFlashRef.current = [];
    dotsRef.current = []; slitParticlesRef.current = [];
    atomsRef.current = []; raysRef.current = []; histRef.current = [];
    fragmentsRef.current = []; chainRef.current = [];
    fissStateRef.current = 'idle'; fissNeutronRef.current = { x: 55, y: 170 }; fissTimeRef.current = 0;
    compStateRef.current = 'incoming'; compTimeRef.current = 0;
    compPhotonRef.current = null; compElectronRef.current = null; compScatterRef.current = null;
    laserPhotonsRef.current = []; laserAtomsRef.current = [];
    bandElectronsRef.current = []; holesRef.current = [];
    collStateRef.current = 'circulating'; collTimeRef.current = 0;
    collParticlesRef.current = []; collCountRef.current = 0;
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
          drawPhotoelectric(ctx, W, H, vars, results, isPlaying, photoParticlesRef, photoFlashRef, t);
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
        case 'compton':
          drawComptonScattering(ctx, W, H, vars, isPlaying, compStateRef, compTimeRef, compPhotonRef, compElectronRef, compScatterRef, t);
          break;
        case 'quantum-energy':
          drawQuantumEnergy(ctx, W, H, vars, isPlaying, t);
          break;
        case 'laser':
          drawLaser(ctx, W, H, vars, isPlaying, laserPhotonsRef, laserAtomsRef, t);
          break;
        case 'heisenberg':
          drawHeisenberg(ctx, W, H, vars, isPlaying, t);
          break;
        case 'semiconductor':
          drawSemiconductor(ctx, W, H, vars, isPlaying, bandElectronsRef, holesRef, t);
          break;
        case 'wave-particle':
          drawWaveParticleDuality(ctx, W, H, vars, isPlaying, t);
          break;
        case 'particle-physics':
          drawParticlePhysics(ctx, W, H, vars, isPlaying, collStateRef, collTimeRef, collParticlesRef, collCountRef, t);
          break;
        default: {
          ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, H);
          const pulse = 50 + 15 * Math.sin(t * 1.5);
          const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, pulse);
          grd.addColorStop(0, 'rgba(99,102,241,0.35)'); grd.addColorStop(1, 'transparent');
          ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(W / 2, H / 2, pulse, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#818cf8'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
          ctx.fillText(`⚛️  ${experimentId}`, W / 2, H / 2 + 5);
        }
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
