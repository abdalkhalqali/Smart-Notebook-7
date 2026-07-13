import React, { useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════
// MATH & COLOR HELPERS
// ═══════════════════════════════════════════════════════════════════
const TAU = Math.PI * 2;
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function rnd(a: number, b: number) { return a + Math.random() * (b - a); }
function polar(cx: number, cy: number, r: number, ang: number): [number, number] {
  return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
}
function rgba(r: number, g: number, b: number, a = 1) { return `rgba(${r},${g},${b},${a})`; }

// ═══════════════════════════════════════════════════════════════════
// DRAWING PRIMITIVES
// ═══════════════════════════════════════════════════════════════════
function bg(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0f1e');
  grad.addColorStop(1, '#050810');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // subtle grid
  ctx.strokeStyle = 'rgba(30,60,120,0.18)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function glowCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, glow = 18) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r + glow);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(r / (r + glow), color);
  g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r + glow, 0, TAU); ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

function glowLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number,
  color: string, lw = 2, blur = 12) {
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = blur;
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}

function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number,
  color: string, lw = 2, hs = 10) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
  ctx.shadowColor = color; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hs * Math.cos(ang - 0.42), y2 - hs * Math.sin(ang - 0.42));
  ctx.lineTo(x2 - hs * Math.cos(ang + 0.42), y2 - hs * Math.sin(ang + 0.42));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  color = '#e2e8f0', size = 12, align: CanvasTextAlign = 'left') {
  ctx.save();
  ctx.fillStyle = color; ctx.font = `bold ${size}px 'Segoe UI', sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function badge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, color: string) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, x, y - 10, w, 20, 6); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = color; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y);
  ctx.restore();
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

function infoPanel(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, accent: string) {
  const pad = 10, lh = 18, w = 170;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, x, y, w, pad * 2 + lh * lines.length, 8); ctx.fill();
  ctx.strokeStyle = accent; ctx.lineWidth = 1; ctx.stroke();
  lines.forEach((l, i) => {
    ctx.fillStyle = i === 0 ? accent : '#cbd5e1';
    ctx.font = i === 0 ? 'bold 11px monospace' : '10px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(l, x + pad, y + pad + i * lh);
  });
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════
// EXPERIMENT IDS
// ═══════════════════════════════════════════════════════════════════
const ELEC_MECH_IDS = new Set([
  // Electricity
  'ohms-law', 'magnetic', 'electric-field', 'electric-potential',
  'capacitors', 'magnetic-field', 'electromagnetic-induction',
  'ac-circuits', 'maxwell-equations', 'electromagnetic-waves',
  // Mechanics
  'free-fall', 'projectile', 'pendulum', 'spring', 'collision',
  'simple-machine', 'density', 'moment', 'uniform-motion',
  'uniform-acceleration', 'newtons-laws', 'circular-motion',
  'momentum', 'work-energy', 'simple-harmonic', 'rotational-motion',
  'angular-momentum', 'gravity-orbits', 'sound-waves', 'standing-waves',
  'fluid-statics', 'fluid-dynamics', 'surface-tension', 'viscosity',
  'doppler-effect',
]);

export function isElectricityMechanicsExperiment(id: string): boolean {
  return ELEC_MECH_IDS.has(id);
}

// ═══════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════
interface Props {
  experimentId: string;
  vars: Record<string, number>;
  results: Record<string, number | string>;
  isPlaying: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function ElectricityMechanicsCanvas({ experimentId, vars, results, isPlaying }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  // ── per-experiment state ──
  // Free-fall
  const ffBallRef = useRef<{ y: number; vy: number; trail: { x: number; y: number }[] }>({ y: 40, vy: 0, trail: [] });
  // Projectile
  const projRef = useRef<{ x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[] } | null>(null);
  // Pendulum
  const pendRef = useRef<{ angle: number; omega: number; trail: { x: number; y: number }[] }>({ angle: Math.PI / 4, omega: 0, trail: [] });
  // Spring
  const springRef = useRef<{ y: number; vy: number; trail: number[] }>({ y: 0, vy: 2, trail: [] });
  // Collision
  const collRef = useRef<{ b1x: number; b2x: number; b1vx: number; b2vx: number; hit: boolean }>({ b1x: 80, b2x: 500, b1vx: 2.5, b2vx: -1.2, hit: false });
  // Electrons for Ohm's law
  const electronsRef = useRef<{ x: number; y: number; lane: number; speed: number }[]>([]);
  // Magnetic field lines
  const magParticlesRef = useRef<{ x: number; y: number; angle: number; life: number }[]>([]);
  // Electric field
  const efTestRef = useRef<{ x: number; y: number; vx: number; vy: number }>({ x: 580, y: 170, vx: -0.4, vy: 0 });
  // Capacitor
  const capChargeRef = useRef<number>(0);
  const capElectronsRef = useRef<{ x: number; y: number; side: number }[]>([]);
  // Induction
  const magXRef = useRef<number>(100);
  const magVxRef = useRef<number>(1.4);
  const inducCurrentRef = useRef<number>(0);
  // Circular motion
  const circAngRef = useRef<number>(0);
  // Rotational
  const rotAngRef = useRef<number>(0);
  const rotOmegaRef = useRef<number>(0.04);
  // Angular momentum
  const angMomRef = useRef<{ arms: number; omega: number }>({ arms: 80, omega: 0.025 });
  // Gravity orbits
  const orbitsRef = useRef<{ angle: number; r: number; speed: number; color: string; trail: { x: number; y: number }[] }[]>([]);
  // AC circuits
  const acPhaseRef = useRef<number>(0);
  // Sound waves
  const soundSrcRef = useRef<number>(0);
  // Doppler
  const dopplerSrcRef = useRef<{ x: number; y: number; vx: number; waves: { x: number; y: number; r: number; born: number }[] }>({ x: 80, y: 170, vx: 1.8, waves: [] });
  // EM waves
  const emPhaseRef = useRef<number>(0);
  // Work-energy
  const weRef = useRef<{ x: number; y: number; v: number }>({ x: 100, y: 80, v: 0 });
  // SHM phase space
  const shmPhaseRef = useRef<{ x: number; y: number; trail: { x: number; y: number }[] }>({ x: 1, y: 0, trail: [] });
  // Fluid dynamics
  const fluidParticlesRef = useRef<{ x: number; y: number; speed: number }[]>([]);
  // Fluid statics
  const floatObjRef = useRef<{ y: number; vy: number }>({ y: 60, vy: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    // Reset state on experiment change
    ffBallRef.current = { y: 40, vy: 0, trail: [] };
    projRef.current = null;
    pendRef.current = { angle: Math.PI / 4, omega: 0, trail: [] };
    springRef.current = { y: 0, vy: 2, trail: [] };
    collRef.current = { b1x: 80, b2x: 500, b1vx: 2.5, b2vx: -1.2, hit: false };
    electronsRef.current = Array.from({ length: 18 }, (_, i) => ({
      x: 120 + (i * 35) % 480, y: [145, 170, 195][i % 3], lane: i % 3, speed: rnd(1.2, 2.5)
    }));
    magParticlesRef.current = Array.from({ length: 40 }, () => ({
      x: rnd(80, 640), y: rnd(40, 300), angle: rnd(0, TAU), life: rnd(0, 1)
    }));
    efTestRef.current = { x: 580, y: 170, vx: -0.4, vy: 0 };
    capChargeRef.current = 0;
    capElectronsRef.current = Array.from({ length: 16 }, (_, i) => ({
      x: i % 2 === 0 ? 230 + rnd(0, 60) : 430 + rnd(0, 60),
      y: 60 + (i >> 1) * 24, side: i % 2
    }));
    magXRef.current = 100;
    magVxRef.current = 1.4;
    inducCurrentRef.current = 0;
    circAngRef.current = 0;
    rotAngRef.current = 0;
    rotOmegaRef.current = 0.04;
    angMomRef.current = { arms: 80, omega: 0.025 };
    orbitsRef.current = [
      { angle: 0, r: 70, speed: 0.04, color: '#60a5fa', trail: [] },
      { angle: 2, r: 110, speed: 0.025, color: '#34d399', trail: [] },
      { angle: 4, r: 155, speed: 0.015, color: '#f59e0b', trail: [] },
    ];
    acPhaseRef.current = 0;
    soundSrcRef.current = 0;
    dopplerSrcRef.current = { x: 80, y: 170, vx: 1.8, waves: [] };
    emPhaseRef.current = 0;
    weRef.current = { x: 100, y: 80, v: 0 };
    shmPhaseRef.current = { x: 1, y: 0, trail: [] };
    fluidParticlesRef.current = Array.from({ length: 35 }, () => ({
      x: rnd(0, 300), y: rnd(80, 260), speed: rnd(0.8, 2)
    }));
    floatObjRef.current = { y: 60, vy: 0 };
    tRef.current = 0;
    lastTsRef.current = 0;

    function draw(ts: number) {
      if (!isPlaying) { rafRef.current = requestAnimationFrame(draw); return; }
      const dt = lastTsRef.current ? Math.min((ts - lastTsRef.current) / 16.67, 3) : 1;
      lastTsRef.current = ts;
      tRef.current += dt * 0.016;
      const t = tRef.current;

      ctx.clearRect(0, 0, W, H);
      bg(ctx, W, H);

      switch (experimentId) {

        // ─────────────────────────────────────────────────────────
        case 'ohms-law': drawOhmsLaw(ctx, W, H, t, dt, electronsRef.current, vars); break;
        case 'magnetic': drawMagneticForce(ctx, W, H, t, dt, magParticlesRef.current, vars); break;
        case 'electric-field': drawElectricField(ctx, W, H, t, dt, efTestRef.current, vars); break;
        case 'electric-potential': drawElectricPotential(ctx, W, H, t); break;
        case 'capacitors': drawCapacitors(ctx, W, H, t, dt, capChargeRef, capElectronsRef.current, vars); break;
        case 'magnetic-field': drawMagneticField(ctx, W, H, t, vars); break;
        case 'electromagnetic-induction': drawEMInduction(ctx, W, H, t, dt, magXRef, magVxRef, inducCurrentRef, vars); break;
        case 'ac-circuits': drawACCircuits(ctx, W, H, t, dt, acPhaseRef, vars); break;
        case 'maxwell-equations': drawMaxwellEq(ctx, W, H, t); break;
        case 'electromagnetic-waves': drawEMWaves(ctx, W, H, t, dt, emPhaseRef); break;
        // ─────────────────────────────────────────────────────────
        case 'free-fall': drawFreeFall(ctx, W, H, t, dt, ffBallRef.current, vars); break;
        case 'projectile': drawProjectile(ctx, W, H, t, dt, projRef, vars); break;
        case 'pendulum': drawPendulum(ctx, W, H, t, dt, pendRef.current, vars); break;
        case 'spring': drawSpring(ctx, W, H, t, dt, springRef.current, vars); break;
        case 'collision': drawCollision(ctx, W, H, t, dt, collRef.current, vars); break;
        case 'circular-motion': drawCircularMotion(ctx, W, H, t, dt, circAngRef, vars); break;
        case 'newtons-laws': drawNewtonsLaws(ctx, W, H, t); break;
        case 'momentum': drawMomentum(ctx, W, H, t, dt, collRef.current, vars); break;
        case 'work-energy': drawWorkEnergy(ctx, W, H, t, dt, weRef.current, vars); break;
        case 'simple-harmonic': drawSHM(ctx, W, H, t, dt, shmPhaseRef.current, vars); break;
        case 'rotational-motion': drawRotationalMotion(ctx, W, H, t, dt, rotAngRef, rotOmegaRef, vars); break;
        case 'angular-momentum': drawAngularMomentum(ctx, W, H, t, dt, angMomRef, vars); break;
        case 'gravity-orbits': drawGravityOrbits(ctx, W, H, t, dt, orbitsRef.current, vars); break;
        case 'sound-waves': drawSoundWaves(ctx, W, H, t, dt, soundSrcRef, vars); break;
        case 'standing-waves': drawStandingWaves(ctx, W, H, t, vars); break;
        case 'fluid-statics': drawFluidStatics(ctx, W, H, t, dt, floatObjRef.current, vars); break;
        case 'fluid-dynamics': drawFluidDynamics(ctx, W, H, t, dt, fluidParticlesRef.current, vars); break;
        case 'surface-tension': drawSurfaceTension(ctx, W, H, t); break;
        case 'viscosity': drawViscosity(ctx, W, H, t); break;
        case 'doppler-effect': drawDoppler(ctx, W, H, t, dt, dopplerSrcRef.current, vars); break;
        case 'simple-machine': drawSimpleMachine(ctx, W, H, t, vars); break;
        case 'density': drawDensity(ctx, W, H, t); break;
        case 'moment': drawMoment(ctx, W, H, t, vars); break;
        case 'uniform-motion': drawUniformMotion(ctx, W, H, t, vars); break;
        case 'uniform-acceleration': drawUniformAcceleration(ctx, W, H, t, dt, ffBallRef.current, vars); break;

        default: {
          label(ctx, '⚗️ ' + experimentId, W / 2, H / 2, '#60a5fa', 18, 'center');
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [experimentId, isPlaying, vars]);

  return (
    <canvas
      ref={canvasRef}
      width={720}
      height={340}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// ELECTRICITY SIMULATIONS
// ═══════════════════════════════════════════════════════════════════

// ── Ohm's Law: I = V/R ──────────────────────────────────────────
function drawOhmsLaw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  electrons: { x: number; y: number; lane: number; speed: number }[], vars: Record<string, number>) {
  const V = clamp(vars.voltage ?? 12, 1, 24);
  const R = clamp(vars.resistance ?? 6, 1, 20);
  const I = V / R;
  const speed = clamp(I * 0.6, 0.2, 5);

  // Circuit background
  const laneY = [130, 170, 210];
  const wireColor = '#334155';

  // Draw battery
  const bx = 60, by = 150;
  ctx.save();
  ctx.fillStyle = '#1e293b'; roundRect(ctx, bx - 18, by - 35, 36, 70, 6); ctx.fill();
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke();
  // terminals
  ctx.fillStyle = '#ef4444'; ctx.fillRect(bx - 6, by - 45, 12, 10);
  ctx.fillStyle = '#94a3b8'; ctx.fillRect(bx - 6, by + 35, 12, 10);
  label(ctx, '+', bx, by - 38, '#ef4444', 11, 'center');
  label(ctx, '−', bx, by + 48, '#94a3b8', 11, 'center');
  label(ctx, `${V}V`, bx, by, '#fbbf24', 13, 'center');
  ctx.restore();

  // Resistor
  const rx = 380, ry = 170;
  ctx.save();
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3; ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    ctx.lineTo(rx - 40 + i * 10, ry + (i % 2 === 0 ? -14 : 14));
  }
  ctx.stroke();
  label(ctx, `${R}Ω`, rx, ry + 28, '#f97316', 12, 'center');
  ctx.restore();

  // Wires
  [laneY[0], laneY[1], laneY[2]].forEach(ly => {
    ctx.save(); ctx.strokeStyle = wireColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx + 18, ly); ctx.lineTo(rx - 50, ly);
    ctx.moveTo(rx + 50, ly); ctx.lineTo(640, ly);
    ctx.stroke(); ctx.restore();
  });
  // Top / bottom connectors
  glowLine(ctx, bx + 18, laneY[0], bx + 18, laneY[2], '#334155', 2, 0);
  glowLine(ctx, 640, laneY[0], 640, laneY[2], '#334155', 2, 0);
  glowLine(ctx, bx - 18, 150, 30, 150, '#475569', 2, 0);
  glowLine(ctx, 640, 170, 660, 170, '#475569', 2, 0);

  // Ammeter
  const amx = 540, amy = 170;
  ctx.save();
  const ag = ctx.createRadialGradient(amx, amy, 0, amx, amy, 22);
  ag.addColorStop(0, '#1e293b'); ag.addColorStop(1, '#0f172a');
  ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(amx, amy, 22, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.stroke();
  // needle
  const needleAng = -Math.PI * 0.75 + (I / 5) * Math.PI * 1.5;
  const [nx, ny] = polar(amx, amy, 16, needleAng);
  glowLine(ctx, amx, amy, nx, ny, '#ef4444', 2, 8);
  label(ctx, 'A', amx, amy + 8, '#60a5fa', 9, 'center');
  ctx.restore();

  // Voltmeter
  const vmx = 240, vmy = 100;
  ctx.save();
  const vg = ctx.createRadialGradient(vmx, vmy, 0, vmx, vmy, 22);
  vg.addColorStop(0, '#1e293b'); vg.addColorStop(1, '#0f172a');
  ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(vmx, vmy, 22, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.stroke();
  const vnAng = -Math.PI * 0.75 + (V / 24) * Math.PI * 1.5;
  const [vnx, vny] = polar(vmx, vmy, 16, vnAng);
  glowLine(ctx, vmx, vmy, vnx, vny, '#ef4444', 2, 8);
  label(ctx, 'V', vmx, vmy + 8, '#a78bfa', 9, 'center');
  // wires to circuit
  glowLine(ctx, vmx, vmy + 22, vmx, laneY[0], '#a78bfa', 1, 4);
  glowLine(ctx, vmx + 22, vmy, rx - 50, laneY[0], '#a78bfa', 1, 4);
  ctx.restore();

  // Electrons moving
  electrons.forEach(e => {
    e.x += speed * e.speed * dt;
    if (e.x > 640) e.x = bx + 18;
    glowCircle(ctx, e.x, laneY[e.lane], 4, '#60a5fa', 6);
    label(ctx, 'e⁻', e.x, laneY[e.lane] - 10, 'rgba(96,165,250,0.7)', 8, 'center');
  });

  // Info panel
  infoPanel(ctx, [
    '⚡ Ohm\'s Law  I = V/R',
    `V = ${V.toFixed(1)} V`,
    `R = ${R.toFixed(1)} Ω`,
    `I = ${I.toFixed(2)} A`,
    `P = ${(V * I).toFixed(1)} W`,
  ], 10, 10, '#60a5fa');
}

// ── Magnetic Force on Conductor ───────────────────────────────────
function drawMagneticForce(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  particles: { x: number; y: number; angle: number; life: number }[], vars: Record<string, number>) {
  const B = clamp(vars.magnetic_field ?? 0.5, 0.1, 2);
  const I2 = clamp(vars.current ?? 3, 0.5, 10);
  const F = B * I2 * 0.3;

  // Field dots (into page) background
  ctx.fillStyle = 'rgba(147,51,234,0.15)';
  for (let x = 40; x < W - 40; x += 50) {
    for (let y = 40; y < H - 40; y += 50) {
      ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
      label(ctx, '×', x, y, 'rgba(147,51,234,0.35)', 16, 'center');
    }
  }

  // Conductor wire
  const wireY = 170;
  const offset = Math.sin(t * 2) * F * 18;
  ctx.save();
  ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 20;
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(80, wireY + offset); ctx.lineTo(640, wireY + offset); ctx.stroke();
  ctx.restore();

  // Current direction arrows
  for (let x = 120; x < 640; x += 80) {
    arrow(ctx, x, wireY + offset, x + 30, wireY + offset, '#ef4444', 2, 8);
  }

  // Force arrow (Lorentz force)
  const fy = wireY + offset;
  arrow(ctx, 360, fy, 360, fy - F * 35, '#34d399', 3, 14);
  label(ctx, 'F = IL×B', 375, fy - F * 18, '#34d399', 12);

  // Moving charge particles in field
  particles.forEach(p => {
    p.life += dt * 0.008;
    if (p.life > 1) { p.life = 0; p.x = rnd(80, 640); p.y = rnd(40, 300); }
    p.x += Math.cos(p.angle) * 1.2 * dt;
    p.y += Math.sin(p.angle) * 1.2 * dt;
    const a = p.life;
    glowCircle(ctx, p.x, p.y, 2, `rgba(147,51,234,${a * 0.7})`, 4);
  });

  infoPanel(ctx, [
    '🧲 Magnetic Force  F = BIL',
    `B = ${B.toFixed(2)} T`,
    `I = ${I2.toFixed(1)} A`,
    `F = ${(B * I2 * 0.3).toFixed(2)} N/m`,
  ], 10, 10, '#a78bfa');

  label(ctx, 'B × (into page)', W / 2, 20, 'rgba(147,51,234,0.7)', 11, 'center');
}

// ── Electric Field Lines ──────────────────────────────────────────
function drawElectricField(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  test: { x: number; y: number; vx: number; vy: number }, vars: Record<string, number>) {
  const cx = W / 2, cy = H / 2;
  const q = vars.charge ?? 1; // +1 or -1

  // Field lines
  const nLines = 16;
  for (let i = 0; i < nLines; i++) {
    const ang = (i / nLines) * TAU;
    const alpha = 0.4;
    ctx.save();
    ctx.strokeStyle = `rgba(251,191,36,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 4;
    ctx.beginPath();
    let px = cx + 22 * Math.cos(ang), py = cy + 22 * Math.sin(ang);
    ctx.moveTo(px, py);
    for (let s = 0; s < 120; s++) {
      const dx = px - cx, dy = py - cy, r2 = dx * dx + dy * dy + 1;
      const f = 3000 / r2;
      px += (q > 0 ? dx : -dx) * f * 0.005;
      py += (q > 0 ? dy : -dy) * f * 0.005;
      if (px < 0 || px > W || py < 0 || py > H) break;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Equipotential rings
  [50, 90, 140, 200].forEach(r => {
    ctx.save();
    ctx.strokeStyle = `rgba(99,102,241,0.25)`;
    ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  });

  // Central charge
  glowCircle(ctx, cx, cy, 14, q > 0 ? '#ef4444' : '#3b82f6', 24);
  label(ctx, q > 0 ? '+Q' : '−Q', cx, cy, 'white', 11, 'center');

  // Test charge moving in field
  const dx = test.x - cx, dy = test.y - cy;
  const r2 = dx * dx + dy * dy + 1;
  const f = 15000 / r2;
  test.vx += (q > 0 ? dx : -dx) / Math.sqrt(r2) * f * 0.0004 * dt;
  test.vy += (q > 0 ? dy : -dy) / Math.sqrt(r2) * f * 0.0004 * dt;
  test.vx *= 0.992; test.vy *= 0.992;
  test.x += test.vx * dt; test.y += test.vy * dt;
  if (test.x < 20 || test.x > W - 20 || test.y < 20 || test.y > H - 20 || r2 < 900) {
    test.x = rnd(W * 0.6, W - 30); test.y = cy + rnd(-60, 60); test.vx = -0.4; test.vy = rnd(-0.2, 0.2);
  }
  glowCircle(ctx, test.x, test.y, 6, '#34d399', 12);
  label(ctx, '+q', test.x, test.y - 14, '#34d399', 10, 'center');
  arrow(ctx, test.x, test.y, test.x + test.vx * 20, test.y + test.vy * 20, '#34d399', 2, 7);

  infoPanel(ctx, [
    '⚡ Electric Field',
    `E = kQ/r²`,
    `Q = ${q > 0 ? '+' : ''}${q} C`,
    `F = qE`,
  ], 10, 10, '#fbbf24');
}

// ── Electric Potential ────────────────────────────────────────────
function drawElectricPotential(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // Heat-map potential
  const imageData = ctx.createImageData(W, H);
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const dx = x - cx, dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy) + 1;
      const V = 8000 / r;
      const t2 = clamp(V / 200, 0, 1);
      const ri = Math.round(lerp(10, 239, t2));
      const gi = Math.round(lerp(20, 68, t2));
      const bi = Math.round(lerp(80, 68, 1 - t2));
      const idx = (y * W + x) * 4;
      imageData.data[idx] = ri; imageData.data[idx + 1] = gi;
      imageData.data[idx + 2] = bi; imageData.data[idx + 3] = 200;
      // fill 2x2
      if (x + 1 < W) {
        imageData.data[idx + 4] = ri; imageData.data[idx + 5] = gi;
        imageData.data[idx + 6] = bi; imageData.data[idx + 7] = 200;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Overlay grid again for style
  ctx.strokeStyle = 'rgba(30,60,120,0.10)'; ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Equipotential contours
  [40, 70, 110, 160, 220].forEach((r, i) => {
    ctx.save();
    ctx.strokeStyle = `rgba(253,224,71,${0.7 - i * 0.12})`; ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    label(ctx, `${(8000 / r).toFixed(0)}V`, cx + r + 4, cy, '#fde047', 9);
    ctx.restore();
  });

  // Charge
  glowCircle(ctx, cx, cy, 14, '#ef4444', 26);
  label(ctx, '+Q', cx, cy, 'white', 11, 'center');

  // Animated test charge orbiting
  const orb = polar(cx, cy, 120 + Math.sin(t * 0.8) * 20, t * 0.6);
  glowCircle(ctx, orb[0], orb[1], 7, '#34d399', 14);
  label(ctx, '+q', orb[0], orb[1] - 15, '#34d399', 10, 'center');
  arrow(ctx, orb[0], orb[1], cx + (orb[0] - cx) * 0.8, cy + (orb[1] - cy) * 0.8, '#60a5fa', 1.5, 7);

  infoPanel(ctx, [
    '🔵 Electric Potential',
    'V = kQ/r',
    'Color = potential level',
    'Dashed = equipotential',
  ], 10, 10, '#fde047');
}

// ── Capacitor Charging ────────────────────────────────────────────
function drawCapacitors(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  chargeRef: React.MutableRefObject<number>,
  electrons: { x: number; y: number; side: number }[], vars: Record<string, number>) {
  const V = clamp(vars.voltage ?? 12, 1, 24);
  const C = clamp(vars.capacitance ?? 100e-6, 10e-6, 500e-6);
  chargeRef.current = Math.min(chargeRef.current + dt * 0.008, 1);
  const q = chargeRef.current;

  // Plates
  const pl = 280, pr = 440, pt = 60, pb = 280;
  // Left plate (negative)
  const lg = ctx.createLinearGradient(pl - 20, 0, pl, 0);
  lg.addColorStop(0, '#1e3a5f'); lg.addColorStop(1, '#2563eb');
  ctx.fillStyle = lg; ctx.fillRect(pl - 20, pt, 20, pb - pt);
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
  ctx.strokeRect(pl - 20, pt, 20, pb - pt);

  // Right plate (positive)
  const rg = ctx.createLinearGradient(pr, 0, pr + 20, 0);
  rg.addColorStop(0, '#7f1d1d'); rg.addColorStop(1, '#ef4444');
  ctx.fillStyle = rg; ctx.fillRect(pr, pt, 20, pb - pt);
  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.strokeRect(pr, pt, 20, pb - pt);

  // E-field lines between plates
  const eStrength = q * 0.7;
  for (let y = pt + 20; y < pb; y += 30) {
    arrow(ctx, pl, y, pr, y, `rgba(251,191,36,${eStrength})`, 1.5, 8);
  }

  // Charge labels
  for (let iy = pt + 10; iy < pb - 10; iy += 25) {
    label(ctx, '−', pl - 12, iy, `rgba(96,165,250,${q})`, 14, 'center');
    label(ctx, '+', pr + 10, iy, `rgba(239,68,68,${q})`, 14, 'center');
  }

  // Electrons drifting
  electrons.forEach(e => {
    if (e.side === 0) e.x -= 0.4 * dt * q;
    else e.x += 0.25 * dt * q;
    if (e.side === 0 && e.x < pl - 30) e.x = pl + 100;
    if (e.side === 1 && e.x > pr + 100) e.x = pr - 20;
    glowCircle(ctx, e.x, e.y, 3, e.side === 0 ? '#60a5fa' : '#ef4444', 6);
  });

  // Battery symbol left of left plate
  const bx = 140;
  for (let i = 0; i < 4; i++) {
    const w = i % 2 === 0 ? 20 : 12;
    ctx.fillStyle = i % 2 === 0 ? '#475569' : '#94a3b8';
    ctx.fillRect(bx - w / 2, 110 + i * 30, w, 6);
  }
  label(ctx, `${V}V`, bx, 220, '#fbbf24', 11, 'center');

  // Connecting wires
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx + 10, 110); ctx.lineTo(bx + 10, 80); ctx.lineTo(pl - 20, 80); ctx.lineTo(pl - 20, pt); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx - 10, 230); ctx.lineTo(bx - 10, 300); ctx.lineTo(pr + 20, 300); ctx.lineTo(pr + 20, pb); ctx.stroke();

  // Charge meter
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, 520, 60, 160, 140, 8); ctx.fill();
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.stroke();
  label(ctx, 'Charge Level', 600, 80, '#94a3b8', 10, 'center');
  const barH = 100;
  ctx.fillStyle = '#1e293b'; ctx.fillRect(560, 90, 80, barH);
  const grad = ctx.createLinearGradient(0, 90 + barH * (1 - q), 0, 90 + barH);
  grad.addColorStop(0, '#3b82f6'); grad.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = grad;
  ctx.fillRect(560, 90 + barH * (1 - q), 80, barH * q);
  label(ctx, `${(q * 100).toFixed(0)}%`, 600, 165, '#60a5fa', 11, 'center');
  ctx.restore();

  infoPanel(ctx, [
    '🔋 Capacitor  Q = CV',
    `V = ${V.toFixed(0)} V`,
    `C = ${(C * 1e6).toFixed(0)} μF`,
    `Q = ${(C * V * q * 1e6).toFixed(0)} μC`,
    `E = ½CV² = ${(0.5 * C * V * V * q).toFixed(3)} J`,
  ], 10, 10, '#3b82f6');
}

// ── Magnetic Field (Solenoid) ─────────────────────────────────────
function drawMagneticField(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, vars: Record<string, number>) {
  const n = Math.round(vars.turns ?? 8);
  const I3 = clamp(vars.current ?? 3, 0.5, 10);
  const cx = W / 2, cy = H / 2;

  // Solenoid coils
  const solenoidLeft = 140, solenoidRight = 580;
  const coilW = (solenoidRight - solenoidLeft) / n;
  for (let i = 0; i < n; i++) {
    const x = solenoidLeft + i * coilW;
    ctx.save();
    ctx.strokeStyle = `rgba(251,191,36,0.85)`; ctx.lineWidth = 3;
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(x + coilW / 2, cy, coilW * 0.45, 55, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    // Current direction
    const cdir = i % 2 === 0 ? 1 : -1;
    arrow(ctx, x + coilW / 2, cy - 50, x + coilW / 2 + cdir * 8, cy - 50, '#ef4444', 1.5, 6);
  }

  // Field lines inside solenoid
  [cy - 25, cy, cy + 25].forEach(ly => {
    arrow(ctx, solenoidLeft - 20, ly, solenoidRight + 30, ly, `rgba(96,165,250,0.7)`, 2, 10);
  });
  // Return field lines outside
  const curves: [number, number, number][] = [
    [cy, -70, 0.8],
    [cy, 70, 0.8],
    [cy, -110, 0.45],
    [cy, 110, 0.45],
  ];
  curves.forEach(([y0, dy, a]) => {
    ctx.save();
    ctx.strokeStyle = `rgba(96,165,250,${a * 0.4})`; ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(solenoidRight + 30, y0);
    ctx.bezierCurveTo(solenoidRight + 80, y0 + dy, solenoidLeft - 80, y0 + dy, solenoidLeft - 20, y0);
    ctx.stroke();
    ctx.restore();
  });

  // N/S labels
  glowCircle(ctx, solenoidLeft - 10, cy, 20, '#3b82f6', 28);
  label(ctx, 'S', solenoidLeft - 10, cy, 'white', 14, 'center');
  glowCircle(ctx, solenoidRight + 10, cy, 20, '#ef4444', 28);
  label(ctx, 'N', solenoidRight + 10, cy, 'white', 14, 'center');

  // Compass needles
  const needlePositions = [
    [cx - 160, cy - 80], [cx, cy - 90], [cx + 160, cy - 80],
    [cx - 160, cy + 80], [cx, cy + 90], [cx + 160, cy + 80],
  ];
  needlePositions.forEach(([nx, ny]) => {
    const ang = Math.atan2(cy - ny, solenoidRight - nx) * 0.5;
    ctx.save();
    ctx.translate(nx as number, ny as number); ctx.rotate(ang);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(-12, -2, 12, 4);
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(0, -2, 12, 4);
    ctx.restore();
  });

  infoPanel(ctx, [
    '🧲 Solenoid B Field',
    `B = μ₀nI`,
    `n = ${n} turns`,
    `I = ${I3.toFixed(1)} A`,
    `B = ${(4e-7 * Math.PI * n * I3).toExponential(2)} T`,
  ], 10, 10, '#60a5fa');
}

// ── Electromagnetic Induction ─────────────────────────────────────
function drawEMInduction(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  magXRef: React.MutableRefObject<number>, magVxRef: React.MutableRefObject<number>,
  inducRef: React.MutableRefObject<number>, vars: Record<string, number>) {
  const cy = H / 2;
  const coilLeft = 270, coilRight = 450;

  // Move magnet
  magXRef.current += magVxRef.current * dt;
  if (magXRef.current > coilRight + 150 || magXRef.current < 80) magVxRef.current *= -1;
  const mx = magXRef.current;

  // Induced EMF (Faraday) — proportional to dΦ/dt ≈ v/r²
  const r = Math.abs(mx - (coilLeft + coilRight) / 2) + 10;
  inducRef.current = lerp(inducRef.current, magVxRef.current > 0 ? -1.5 / r * 100 : 1.5 / r * 100, 0.08);
  const emf = inducRef.current;

  // Coil
  const coilCx = (coilLeft + coilRight) / 2;
  for (let i = 0; i < 8; i++) {
    const x = coilLeft + i * (coilRight - coilLeft) / 8;
    ctx.save();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(x + (coilRight - coilLeft) / 16, cy, (coilRight - coilLeft) / 16 + 2, 50, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // Galvanometer
  const gx = 560, gy = cy;
  ctx.save();
  const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 28);
  gg.addColorStop(0, '#1e293b'); gg.addColorStop(1, '#0f172a');
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gx, gy, 28, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.stroke();
  const gAng = -Math.PI * 0.75 + clamp((emf + 10) / 20, 0, 1) * Math.PI * 1.5;
  const [gnx, gny] = polar(gx, gy, 20, gAng);
  glowLine(ctx, gx, gy, gnx, gny, '#ef4444', 2, 10);
  label(ctx, 'G', gx, gy + 10, '#34d399', 9, 'center');
  // connecting wires
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(coilRight, cy - 50); ctx.lineTo(coilRight + 40, cy - 50); ctx.lineTo(gx - 28, gy - 15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(coilRight, cy + 50); ctx.lineTo(coilRight + 40, cy + 50); ctx.lineTo(gx - 28, gy + 15); ctx.stroke();
  ctx.restore();

  // Magnet
  const magW = 70, magH = 50;
  const leftHalf = mx - magW / 2, rightHalf = mx;
  // N pole
  ctx.fillStyle = '#ef4444';
  roundRect(ctx, leftHalf, cy - magH / 2, magW / 2, magH, 4); ctx.fill();
  label(ctx, 'N', leftHalf + magW / 4, cy, 'white', 14, 'center');
  // S pole
  ctx.fillStyle = '#3b82f6';
  roundRect(ctx, rightHalf, cy - magH / 2, magW / 2, magH, 4); ctx.fill();
  label(ctx, 'S', rightHalf + magW / 4, cy, 'white', 14, 'center');
  // velocity arrow
  arrow(ctx, mx, cy - 35, mx + magVxRef.current * 20, cy - 35, '#94a3b8', 2, 8);

  // Induced current arrows on coil
  if (Math.abs(emf) > 0.5) {
    const dir = emf > 0 ? 1 : -1;
    const arcCol = emf > 0 ? '#60a5fa' : '#f97316';
    for (let i = 0; i < 6; i++) {
      const x = coilLeft + 20 + i * 30;
      arrow(ctx, x, cy - 55, x + dir * 14, cy - 55, arcCol, 2, 7);
    }
    label(ctx, `ε = ${emf.toFixed(1)} V`, coilCx, cy - 75, arcCol, 12, 'center');
  }

  infoPanel(ctx, [
    '🔄 Faraday\'s Law',
    'ε = −dΦ/dt',
    `v = ${magVxRef.current.toFixed(1)} m/s`,
    `ε = ${emf.toFixed(2)} V`,
  ], 10, 10, '#34d399');
}

// ── AC Circuits ───────────────────────────────────────────────────
function drawACCircuits(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  phaseRef: React.MutableRefObject<number>, vars: Record<string, number>) {
  phaseRef.current += dt * 0.05;
  const phi = phaseRef.current;
  const R = clamp(vars.resistance ?? 100, 10, 500);
  const L = clamp(vars.inductance ?? 0.1, 0.01, 1);
  const f = clamp(vars.frequency ?? 50, 10, 500);
  const omega = TAU * f;
  const XL = omega * L;
  const Z = Math.sqrt(R * R + XL * XL);
  const phiAngle = Math.atan2(XL, R);

  // Graph area
  const gLeft = 60, gRight = 500, gTop = 50, gBot = 290, midY = (gTop + gBot) / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; roundRect(ctx, gLeft, gTop, gRight - gLeft, gBot - gTop, 6); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
  // Grid
  ctx.strokeStyle = 'rgba(71,85,105,0.4)'; ctx.lineWidth = 0.5;
  for (let y = gTop + 40; y < gBot; y += 40) { ctx.beginPath(); ctx.moveTo(gLeft, y); ctx.lineTo(gRight, y); ctx.stroke(); }
  ctx.restore();

  label(ctx, '0', gLeft - 15, midY, '#94a3b8', 9, 'right');
  label(ctx, 'Voltage (V)', gLeft + 10, gTop + 15, '#ef4444', 11);
  label(ctx, 'Current (I)', gLeft + 10, gTop + 30, '#60a5fa', 11);

  // Waves
  const pts = 200;
  ['voltage', 'current'].forEach((type, ti) => {
    ctx.save();
    ctx.strokeStyle = type === 'voltage' ? '#ef4444' : '#60a5fa';
    ctx.lineWidth = 2.5; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const x = gLeft + (i / pts) * (gRight - gLeft);
      const ang = phi + (i / pts) * TAU * 2 - (ti === 1 ? phiAngle : 0);
      const amp = (gBot - gTop) * 0.42;
      const y = midY - Math.sin(ang) * amp * (ti === 0 ? 1 : R / Z);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.restore();
  });

  // Phasor diagram
  const px = 600, py = 170, pr = 60;
  ctx.save();
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px - pr - 10, py); ctx.lineTo(px + pr + 10, py); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px, py - pr - 10); ctx.lineTo(px, py + pr + 10); ctx.stroke();
  // V phasor
  arrow(ctx, px, py, px + pr * Math.cos(-phi), py + pr * Math.sin(-phi), '#ef4444', 2, 8);
  // I phasor
  arrow(ctx, px, py, px + pr * Math.cos(-phi + phiAngle), py + pr * Math.sin(-phi + phiAngle), '#60a5fa', 2, 8);
  label(ctx, 'V', px + pr * Math.cos(-phi) + 8, py + pr * Math.sin(-phi), '#ef4444', 10);
  label(ctx, 'I', px + pr * Math.cos(-phi + phiAngle) + 8, py + pr * Math.sin(-phi + phiAngle), '#60a5fa', 10);
  label(ctx, 'Phasors', px, py - pr - 15, '#94a3b8', 10, 'center');
  ctx.restore();

  infoPanel(ctx, [
    '⚡ AC Circuit  RLC',
    `f = ${f.toFixed(0)} Hz`,
    `R = ${R.toFixed(0)} Ω  XL = ${XL.toFixed(0)} Ω`,
    `Z = ${Z.toFixed(0)} Ω`,
    `φ = ${(phiAngle * 180 / Math.PI).toFixed(1)}°`,
  ], 10, 10, '#a78bfa');
}

// ── Maxwell Equations (EM Wave) ───────────────────────────────────
function drawMaxwellEq(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const cy = H / 2, amp = 80;

  // Axis
  arrow(ctx, 40, cy, W - 20, cy, '#475569', 1.5, 8);
  label(ctx, 'x (propagation)', W - 30, cy - 12, '#475569', 10);

  // E field (vertical)
  ctx.save(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let i = 0; i <= 300; i++) {
    const x = 40 + (i / 300) * (W - 60);
    const y = cy - Math.sin((i / 300) * TAU * 3 - t * 3) * amp;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.restore();

  // B field (horizontal — shown as dots/crosses on a third axis)
  for (let i = 0; i <= 30; i++) {
    const x = 40 + (i / 30) * (W - 60);
    const bVal = Math.sin((i / 30) * TAU * 3 - t * 3) * amp * 0.6;
    if (bVal > 0) {
      // dot (out of page)
      ctx.save(); ctx.fillStyle = '#60a5fa'; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(x, cy + bVal, 4, 0, TAU); ctx.fill(); ctx.restore();
    } else {
      label(ctx, '×', x, cy + bVal, '#60a5fa', 14, 'center');
    }
  }

  // Labels
  label(ctx, 'E field', 120, cy - amp - 15, '#ef4444', 12);
  label(ctx, 'B field', 120, cy + amp * 0.6 + 15, '#60a5fa', 12);

  // Equations panel
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; roundRect(ctx, W - 220, 10, 210, 110, 8); ctx.fill();
  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1; ctx.stroke();
  const eqs = ['Maxwell\'s Equations:', '∇·E = ρ/ε₀', '∇·B = 0', '∇×E = −∂B/∂t', '∇×B = μ₀J + μ₀ε₀∂E/∂t'];
  eqs.forEach((eq, i) => {
    ctx.fillStyle = i === 0 ? '#a78bfa' : '#e2e8f0';
    ctx.font = i === 0 ? 'bold 11px monospace' : '10px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(eq, W - 212, 18 + i * 19);
  });
  ctx.restore();

  label(ctx, `c = 1/√(μ₀ε₀) = 3×10⁸ m/s`, W / 2, H - 20, '#fbbf24', 12, 'center');
}

// ── Electromagnetic Waves Spectrum ────────────────────────────────
function drawEMWaves(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  phaseRef: React.MutableRefObject<number>) {
  phaseRef.current += dt * 0.05;
  const phi = phaseRef.current;

  // Spectrum bar
  const bLeft = 30, bRight = W - 30, bY = 200, bH = 40;
  const specGrad = ctx.createLinearGradient(bLeft, 0, bRight, 0);
  specGrad.addColorStop(0, '#7f00ff');
  specGrad.addColorStop(0.15, '#4400ff');
  specGrad.addColorStop(0.3, '#0055ff');
  specGrad.addColorStop(0.45, '#00cc44');
  specGrad.addColorStop(0.6, '#ffff00');
  specGrad.addColorStop(0.75, '#ff8800');
  specGrad.addColorStop(0.9, '#ff0000');
  specGrad.addColorStop(1, '#660000');
  ctx.fillStyle = specGrad; ctx.fillRect(bLeft, bY, bRight - bLeft, bH);
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.strokeRect(bLeft, bY, bRight - bLeft, bH);

  // Labels
  const bands = ['γ-ray', 'X-ray', 'UV', 'Visible', 'IR', 'Micro', 'Radio'];
  bands.forEach((b, i) => {
    const x = bLeft + (i + 0.5) * (bRight - bLeft) / bands.length;
    label(ctx, b, x, bY + bH + 15, '#94a3b8', 9, 'center');
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bLeft + i * (bRight - bLeft) / bands.length, bY);
    ctx.lineTo(bLeft + i * (bRight - bLeft) / bands.length, bY + bH); ctx.stroke(); ctx.restore();
  });

  // Animated EM wave — 3 different λ shown
  const waves = [
    { y: 70, color: '#7f00ff', cycles: 10, label: 'UV  λ≈300nm' },
    { y: 130, color: '#34d399', cycles: 5, label: 'Visible  λ≈550nm' },
    { y: 175, color: '#f97316', cycles: 2.5, label: 'IR  λ≈1μm' },
  ];
  waves.forEach(w => {
    ctx.save();
    ctx.strokeStyle = w.color; ctx.lineWidth = 2; ctx.shadowColor = w.color; ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let i = 0; i <= 250; i++) {
      const x = bLeft + (i / 250) * (bRight - bLeft);
      const y = w.y - Math.sin((i / 250) * TAU * w.cycles - phi) * 22;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.restore();
    label(ctx, w.label, bLeft + 5, w.y - 30, w.color, 10);
  });

  label(ctx, 'Electromagnetic Spectrum', W / 2, 25, '#fbbf24', 14, 'center');
  label(ctx, '← Higher freq / shorter λ                 Lower freq / longer λ →', W / 2, bY - 12, '#64748b', 10, 'center');
  label(ctx, 'c = λf = 3×10⁸ m/s', W / 2, H - 20, '#fde047', 12, 'center');
}

// ═══════════════════════════════════════════════════════════════════
// MECHANICS SIMULATIONS
// ═══════════════════════════════════════════════════════════════════

// ── Free Fall ─────────────────────────────────────────────────────
function drawFreeFall(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  ball: { y: number; vy: number; trail: { x: number; y: number }[] }, vars: Record<string, number>) {
  const g = clamp(vars.gravity ?? 9.81, 1, 25);
  const bx = W / 2 - 60;
  const groundY = H - 50;

  // Ground
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();

  // Height ruler
  ctx.save(); ctx.strokeStyle = 'rgba(71,85,105,0.4)'; ctx.lineWidth = 1;
  for (let y = 40; y < groundY; y += 40) {
    ctx.beginPath(); ctx.moveTo(bx - 55, y); ctx.lineTo(bx - 45, y); ctx.stroke();
    const h = ((groundY - y) / (groundY - 40) * 20).toFixed(1);
    label(ctx, `${h}m`, bx - 40, y, '#64748b', 9);
  }
  ctx.restore();

  // Physics
  ball.vy += g * 0.04 * dt;
  ball.y += ball.vy * 0.7 * dt;
  ball.trail.push({ x: bx, y: ball.y });
  if (ball.trail.length > 30) ball.trail.shift();
  if (ball.y >= groundY - 18) {
    ball.y = 40; ball.vy = 0; ball.trail = [];
  }

  // Trail
  ball.trail.forEach((p, i) => {
    const a = i / ball.trail.length;
    ctx.save(); ctx.fillStyle = `rgba(96,165,250,${a * 0.4})`; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(p.x, p.y, 5 * a, 0, TAU); ctx.fill(); ctx.restore();
  });

  // Velocity vector
  const vScaled = Math.min(ball.vy * 2, 80);
  arrow(ctx, bx, ball.y, bx, ball.y + vScaled, '#ef4444', 2.5, 10);
  label(ctx, `v=${ball.vy.toFixed(1)} m/s`, bx + 14, ball.y + vScaled / 2, '#ef4444', 10);

  // Gravity vector
  arrow(ctx, bx, ball.y - 15, bx, ball.y + 30, '#f97316', 2, 8);
  label(ctx, `g=${g}m/s²`, bx + 14, ball.y, '#f97316', 10);

  // Ball
  glowCircle(ctx, bx, ball.y, 18, '#60a5fa', 28);
  label(ctx, '⚽', bx, ball.y, 'transparent', 22, 'center');

  // Graph (v-t)
  const gx = W - 190, gy = 40, gw = 170, gh = 130;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, gx, gy, gw, gh, 6); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
  label(ctx, 'v(t) graph', gx + gw / 2, gy + 12, '#94a3b8', 9, 'center');
  const vNorm = ball.vy / (g * 3);
  const dotX = gx + clamp((ball.y - 40) / (groundY - 40), 0, 1) * gw;
  const dotY = gy + gh - clamp(vNorm, 0, 1) * (gh - 20);
  ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + 20); ctx.stroke();
  glowCircle(ctx, dotX, dotY, 4, '#ef4444', 8);
  ctx.restore();

  infoPanel(ctx, [
    '🔴 Free Fall',
    `g = ${g} m/s²`,
    `h = ${((groundY - ball.y) / 20).toFixed(1)} m`,
    `v = ${ball.vy.toFixed(1)} m/s`,
    `t = ${(ball.vy / g).toFixed(2)} s`,
  ], 10, 10, '#60a5fa');
}

// ── Projectile Motion ─────────────────────────────────────────────
function drawProjectile(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  projRef: React.MutableRefObject<{ x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[] } | null>,
  vars: Record<string, number>) {
  const angle = clamp(vars.angle ?? 45, 5, 85) * Math.PI / 180;
  const v0 = clamp(vars.initial_velocity ?? 15, 5, 30);
  const g = 9.81;
  const groundY = H - 50;

  // Ground
  ctx.fillStyle = '#166534'; ctx.fillRect(0, groundY, W, H - groundY);
  ctx.strokeStyle = '#15803d'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();

  // Launch cannon
  const cx = 50, cy = groundY;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-angle);
  ctx.fillStyle = '#475569'; ctx.fillRect(0, -8, 50, 16);
  ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
  ctx.restore();

  // Init/reset projectile
  if (!projRef.current || projRef.current.x > W + 30) {
    const spd = v0 * 6;
    projRef.current = {
      x: cx, y: cy, vx: spd * Math.cos(angle), vy: -spd * Math.sin(angle), trail: []
    };
  }
  const p = projRef.current;
  p.vy += g * 0.04 * dt;
  p.x += p.vx * 0.04 * dt;
  p.y += p.vy * 0.04 * dt;
  p.trail.push({ x: p.x, y: p.y });
  if (p.trail.length > 80) p.trail.shift();
  if (p.y >= groundY) { p.y = groundY; p.vx = 0; p.vy = 0; }

  // Theoretical trajectory
  ctx.save(); ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
  ctx.beginPath();
  const spd = v0 * 6;
  for (let i = 0; i <= 200; i++) {
    const ti2 = (i / 200) * 10;
    const tx = cx + spd * Math.cos(angle) * 0.04 * ti2;
    const ty = cy - spd * Math.sin(angle) * 0.04 * ti2 + 0.5 * g * 0.04 * 0.04 * ti2 * ti2;
    if (ty > groundY) break;
    i === 0 ? ctx.moveTo(tx, ty) : ctx.lineTo(tx, ty);
  }
  ctx.stroke(); ctx.restore();

  // Trail
  p.trail.forEach((pt, i) => {
    const a = i / p.trail.length;
    ctx.fillStyle = `rgba(251,191,36,${a * 0.6})`;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 4 * a, 0, TAU); ctx.fill();
  });

  // Velocity vectors
  const scale = 0.3;
  arrow(ctx, p.x, p.y, p.x + p.vx * scale, p.y, '#34d399', 2, 8);
  arrow(ctx, p.x, p.y, p.x, p.y + p.vy * scale, '#ef4444', 2, 8);
  label(ctx, 'vₓ', p.x + p.vx * scale + 5, p.y, '#34d399', 9);
  label(ctx, 'vᵧ', p.x + 5, p.y + p.vy * scale, '#ef4444', 9);

  // Ball
  glowCircle(ctx, p.x, p.y, 10, '#fbbf24', 18);

  // Range label
  if (p.x > cx + 30) {
    const range = p.x - cx;
    label(ctx, `Range: ${(range / 6).toFixed(0)} m`, p.x / 2 + cx / 2, groundY + 20, '#94a3b8', 11, 'center');
  }

  infoPanel(ctx, [
    '🏹 Projectile Motion',
    `θ = ${Math.round(angle * 180 / Math.PI)}°`,
    `v₀ = ${v0} m/s`,
    `vₓ = ${(p.vx / 6).toFixed(1)} m/s`,
    `vᵧ = ${(-p.vy / 6).toFixed(1)} m/s`,
  ], 10, 10, '#fbbf24');
}

// ── Pendulum ──────────────────────────────────────────────────────
function drawPendulum(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  pend: { angle: number; omega: number; trail: { x: number; y: number }[] }, vars: Record<string, number>) {
  const L = clamp(vars.length ?? 1.5, 0.5, 3) * 110;
  const g = 9.81;
  const damping = 0.998;
  const pivotX = W / 2, pivotY = 40;

  // Physics (RK4 simplified)
  const alpha = -g / L * Math.sin(pend.angle);
  pend.omega = (pend.omega + alpha * dt * 0.04) * damping;
  pend.angle += pend.omega * dt;

  const bx = pivotX + L * Math.sin(pend.angle);
  const by = pivotY + L * Math.cos(pend.angle);

  pend.trail.push({ x: bx, y: by });
  if (pend.trail.length > 60) pend.trail.shift();

  // Equilibrium line
  ctx.save(); ctx.strokeStyle = 'rgba(71,85,105,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(pivotX, pivotY + L + 30); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  // Trail
  pend.trail.forEach((p2, i) => {
    const a = i / pend.trail.length;
    ctx.fillStyle = `rgba(251,191,36,${a * 0.5})`;
    ctx.beginPath(); ctx.arc(p2.x, p2.y, 3 * a, 0, TAU); ctx.fill();
  });

  // Rod
  glowLine(ctx, pivotX, pivotY, bx, by, '#64748b', 2, 0);

  // Pivot
  glowCircle(ctx, pivotX, pivotY, 6, '#94a3b8', 10);

  // Bob
  glowCircle(ctx, bx, by, 18, '#fbbf24', 26);

  // Angle arc
  const arcR = 50;
  ctx.save(); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(pivotX, pivotY, arcR, Math.PI / 2, Math.PI / 2 + pend.angle, pend.angle < 0);
  ctx.stroke();
  label(ctx, `θ=${(pend.angle * 180 / Math.PI).toFixed(1)}°`, pivotX + 55, pivotY + 30, '#a78bfa', 10);
  ctx.restore();

  // Velocity arrow on bob
  const vx = L * pend.omega * Math.cos(pend.angle);
  const vy = -L * pend.omega * Math.sin(pend.angle);
  if (Math.abs(pend.omega) > 0.003) {
    arrow(ctx, bx, by, bx + vx * 0.4, by + vy * 0.4, '#60a5fa', 2, 8);
  }

  // Energy bars
  const maxH = L;
  const h = L - L * Math.cos(pend.angle);
  const v2 = Math.abs(pend.omega) * L;
  const PE = h / maxH;
  const KE = 0.5 * v2 * v2 / (g * maxH);
  const eX = W - 120, eY = 40;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, eX, eY, 100, 130, 6); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
  label(ctx, 'Energy', eX + 50, eY + 12, '#94a3b8', 9, 'center');
  ['PE', 'KE'].forEach((lbl, i) => {
    const val = i === 0 ? PE : clamp(KE, 0, 1);
    const col = i === 0 ? '#a78bfa' : '#fbbf24';
    const bx2 = eX + 15 + i * 45;
    ctx.fillStyle = '#1e293b'; ctx.fillRect(bx2, eY + 22, 30, 90);
    const grad = ctx.createLinearGradient(0, eY + 22 + 90 * (1 - val), 0, eY + 112);
    grad.addColorStop(0, col); grad.addColorStop(1, col.replace(')', ',0.3)').replace('rgba', 'rgba').replace('#', 'rgba(').split(',').slice(0, 3).join(',') + ',0.3)');
    ctx.fillStyle = col;
    ctx.fillRect(bx2, eY + 22 + 90 * (1 - val), 30, 90 * val);
    label(ctx, lbl, bx2 + 15, eY + 118, col, 9, 'center');
  });
  ctx.restore();

  infoPanel(ctx, [
    '🔵 Pendulum  T=2π√(L/g)',
    `L = ${(L / 110).toFixed(1)} m`,
    `T = ${(2 * Math.PI * Math.sqrt(L / 110 / g)).toFixed(2)} s`,
    `ω = ${pend.omega.toFixed(3)} rad/s`,
  ], 10, 10, '#fbbf24');
}

// ── Spring (Hooke's Law) ──────────────────────────────────────────
function drawSpring(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  sp: { y: number; vy: number; trail: number[] }, vars: Record<string, number>) {
  const k = clamp(vars.spring_constant ?? 40, 5, 200);
  const m = clamp(vars.mass ?? 0.5, 0.1, 5);
  const anchor = 30;
  const eq = 140;

  // SHM
  sp.vy -= k / m * sp.y * 0.003 * dt;
  sp.vy *= 0.9995;
  sp.y += sp.vy * dt;
  sp.trail.push(sp.y);
  if (sp.trail.length > 120) sp.trail.shift();

  const massX = W / 3, massY = anchor + eq + sp.y;
  const massSize = 30;

  // Draw spring coils
  const nCoils = 12;
  const springLen = massY - anchor - massSize / 2;
  ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(massX, anchor);
  for (let i = 0; i <= nCoils * 2; i++) {
    const fy = anchor + (i / (nCoils * 2)) * springLen;
    const fx = massX + (i % 2 === 0 ? -16 : 16);
    ctx.lineTo(fx, fy);
  }
  ctx.lineTo(massX, massY - massSize / 2);
  ctx.stroke(); ctx.restore();

  // Ceiling
  ctx.fillStyle = '#334155'; ctx.fillRect(massX - 40, 0, 80, anchor);

  // Rest position line
  ctx.save(); ctx.strokeStyle = 'rgba(71,85,105,0.4)'; ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(massX - 50, anchor + eq); ctx.lineTo(massX + 50, anchor + eq); ctx.stroke();
  label(ctx, 'x=0', massX + 55, anchor + eq, '#475569', 9);
  ctx.setLineDash([]); ctx.restore();

  // Displacement arrow
  if (Math.abs(sp.y) > 2) {
    arrow(ctx, massX + 60, anchor + eq, massX + 60, anchor + eq + sp.y, '#a78bfa', 2, 8);
    label(ctx, `x=${sp.y.toFixed(0)}`, massX + 70, anchor + eq + sp.y / 2, '#a78bfa', 9);
  }

  // Mass block
  ctx.save(); ctx.fillStyle = '#1d4ed8';
  ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 18;
  roundRect(ctx, massX - massSize / 2, massY - massSize / 2, massSize, massSize, 5); ctx.fill();
  ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.stroke();
  label(ctx, `${m}kg`, massX, massY, 'white', 10, 'center');
  ctx.restore();

  // Velocity arrow
  if (Math.abs(sp.vy) > 0.2) {
    arrow(ctx, massX, massY + massSize / 2, massX, massY + massSize / 2 + sp.vy * 2, '#ef4444', 2, 7);
  }

  // x-t graph
  const gX = W - 220, gY = 30, gW = 200, gH = 110;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, gX, gY, gW, gH, 6); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
  label(ctx, 'x(t) — SHM', gX + gW / 2, gY + 12, '#94a3b8', 9, 'center');
  ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1.5; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 6;
  ctx.beginPath();
  sp.trail.forEach((y2, i) => {
    const px = gX + (i / sp.trail.length) * gW;
    const py = gY + gH / 2 - y2 * 0.35;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.restore();

  // Spring force
  const F = -k * sp.y / 100;
  infoPanel(ctx, [
    '🌀 Hooke\'s Law  F=−kx',
    `k = ${k} N/m`,
    `m = ${m} kg`,
    `x = ${(sp.y / 10).toFixed(2)} m`,
    `F = ${F.toFixed(2)} N`,
    `T = ${(2 * Math.PI * Math.sqrt(m / k)).toFixed(2)} s`,
  ], 10, 10, '#60a5fa');
}

// ── Collision ─────────────────────────────────────────────────────
function drawCollision(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  col: { b1x: number; b2x: number; b1vx: number; b2vx: number; hit: boolean }, vars: Record<string, number>) {
  const m1 = clamp(vars.mass1 ?? 2, 0.5, 5);
  const m2 = clamp(vars.mass2 ?? 1, 0.5, 5);
  const r1 = 20 + m1 * 5, r2 = 15 + m2 * 5;
  const groundY = H - 60;

  // Ground
  ctx.fillStyle = '#1e293b'; ctx.fillRect(0, groundY, W, 10);
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 20) {
    ctx.beginPath(); ctx.moveTo(x, groundY + 10); ctx.lineTo(x + 10, groundY); ctx.stroke();
  }

  // Move balls
  col.b1x += col.b1vx * dt;
  col.b2x += col.b2vx * dt;

  // Elastic collision
  if (!col.hit && col.b1x + r1 >= col.b2x - r2) {
    col.hit = true;
    const v1n = (col.b1vx * (m1 - m2) + 2 * m2 * col.b2vx) / (m1 + m2);
    const v2n = (col.b2vx * (m2 - m1) + 2 * m1 * col.b1vx) / (m1 + m2);
    col.b1vx = v1n; col.b2vx = v2n;
    // Flash
    glowCircle(ctx, (col.b1x + col.b2x) / 2, groundY - r1, 30, '#fbbf24', 45);
  }

  // Reset if out of bounds
  if (col.b1x < -50 || col.b2x > W + 50) {
    col.b1x = 80; col.b2x = 500; col.b1vx = 2.5; col.b2vx = -1.2; col.hit = false;
  }

  const b1y = groundY - r1, b2y = groundY - r2;

  // Momentum arrows
  const pScale = 12;
  arrow(ctx, col.b1x, b1y - r1 - 5, col.b1x + col.b1vx * m1 * pScale, b1y - r1 - 5, '#60a5fa', 2.5, 10);
  arrow(ctx, col.b2x, b2y - r2 - 5, col.b2x + col.b2vx * m2 * pScale, b2y - r2 - 5, '#f97316', 2.5, 10);
  label(ctx, `p₁=${(m1 * col.b1vx).toFixed(1)}`, col.b1x, b1y - r1 - 18, '#60a5fa', 9, 'center');
  label(ctx, `p₂=${(m2 * col.b2vx).toFixed(1)}`, col.b2x, b2y - r2 - 18, '#f97316', 9, 'center');

  // Ball 1
  glowCircle(ctx, col.b1x, b1y, r1, '#3b82f6', r1 + 10);
  label(ctx, `${m1}kg`, col.b1x, b1y, 'white', 10, 'center');

  // Ball 2
  glowCircle(ctx, col.b2x, b2y, r2, '#f97316', r2 + 10);
  label(ctx, `${m2}kg`, col.b2x, b2y, 'white', 10, 'center');

  const totalP = m1 * col.b1vx + m2 * col.b2vx;
  const totalKE = 0.5 * m1 * col.b1vx * col.b1vx + 0.5 * m2 * col.b2vx * col.b2vx;
  infoPanel(ctx, [
    '💥 Elastic Collision',
    `m₁=${m1}kg  v₁=${col.b1vx.toFixed(1)} m/s`,
    `m₂=${m2}kg  v₂=${col.b2vx.toFixed(1)} m/s`,
    `p_total = ${totalP.toFixed(2)} kg·m/s`,
    `KE = ${totalKE.toFixed(2)} J`,
  ], 10, 10, '#60a5fa');
}

// ── Circular Motion ───────────────────────────────────────────────
function drawCircularMotion(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  angRef: React.MutableRefObject<number>, vars: Record<string, number>) {
  const R = clamp(vars.radius ?? 100, 40, 140);
  const omega2 = clamp(vars.angular_velocity ?? 2, 0.5, 8);
  angRef.current += omega2 * dt * 0.04;
  const ang = angRef.current;
  const cx = W / 2 - 60, cy = H / 2;

  // Orbit circle
  ctx.save(); ctx.strokeStyle = 'rgba(71,85,105,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  // Center dot
  glowCircle(ctx, cx, cy, 5, '#475569', 8);

  const bx = cx + R * Math.cos(ang), by = cy + R * Math.sin(ang);

  // Radius line
  glowLine(ctx, cx, cy, bx, by, '#475569', 1.5, 0);
  label(ctx, `r=${R}`, (cx + bx) / 2 + 5, (cy + by) / 2, '#64748b', 9);

  // Velocity vector (tangent)
  const vMag = R * omega2 * 0.4;
  const vx2 = -Math.sin(ang) * vMag, vy2 = Math.cos(ang) * vMag;
  arrow(ctx, bx, by, bx + vx2, by + vy2, '#34d399', 2.5, 10);
  label(ctx, 'v', bx + vx2 + 5, by + vy2, '#34d399', 10);

  // Centripetal force (toward center)
  const fc = 0.5;
  arrow(ctx, bx, by, bx + (cx - bx) * fc, by + (cy - by) * fc, '#ef4444', 2.5, 10);
  label(ctx, 'Fc', bx + (cx - bx) * fc + 5, by + (cy - by) * fc, '#ef4444', 10);

  // Ball
  glowCircle(ctx, bx, by, 14, '#fbbf24', 22);

  // Angle arc
  ctx.save(); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 25, 0, ang, ang < 0); ctx.stroke();
  label(ctx, `ω=${omega2} r/s`, cx + 30, cy - 20, '#a78bfa', 10);
  ctx.restore();

  // Data panel
  const v3 = R * omega2 / 10;
  const ac = omega2 * omega2 * R / 100;
  infoPanel(ctx, [
    '⭕ Circular Motion',
    `ω = ${omega2} rad/s`,
    `r = ${R/10} m`,
    `v = ${v3.toFixed(1)} m/s`,
    `aₓ = ${ac.toFixed(1)} m/s²`,
    `T = ${(TAU / omega2).toFixed(2)} s`,
  ], W - 190, 10, '#fbbf24');

  // v-t mini-graph (sinusoidal vx)
  const gx2 = W - 185, gy2 = 180, gw2 = 165, gh2 = 100;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(ctx, gx2, gy2, gw2, gh2, 6); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
  label(ctx, 'vₓ vs time', gx2 + gw2 / 2, gy2 + 12, '#94a3b8', 9, 'center');
  ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1.5; ctx.shadowColor = '#34d399'; ctx.shadowBlur = 6;
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const px = gx2 + (i / 100) * gw2;
    const py = gy2 + gh2 / 2 - Math.sin(ang - (i / 100) * TAU * 2) * (gh2 / 2 - 8);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke(); ctx.restore();
}

// ── Newton's Laws ─────────────────────────────────────────────────
function drawNewtonsLaws(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // Three panels
  const panels = [
    { x: 20, title: '1st Law: Inertia', color: '#60a5fa' },
    { x: 255, title: '2nd Law: F = ma', color: '#34d399' },
    { x: 490, title: '3rd Law: Action-Reaction', color: '#f97316' },
  ];
  const panW = 220, panH = 280, panTop = 40;

  panels.forEach((pan, pi) => {
    // Panel background
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(ctx, pan.x, panTop, panW, panH, 8); ctx.fill();
    ctx.strokeStyle = pan.color + '66'; ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, pan.title, pan.x + panW / 2, panTop + 16, pan.color, 10, 'center');
    ctx.restore();

    if (pi === 0) {
      // Block moving at constant v — no net force
      const bx = pan.x + 20 + ((t * 30) % (panW - 40));
      const by = panTop + 160;
      ctx.fillStyle = '#3b82f6'; roundRect(ctx, bx - 20, by - 18, 40, 36, 4); ctx.fill();
      label(ctx, 'm', bx, by, 'white', 11, 'center');
      // No friction arrows
      label(ctx, 'No net force → v = const', pan.x + panW / 2, panTop + 200, '#94a3b8', 9, 'center');
      label(ctx, 'v →', bx + 25, by - 5, '#60a5fa', 10);

    } else if (pi === 1) {
      // Cart being pushed by F
      const F = 120 + 60 * Math.sin(t * 0.7);
      const m = 3;
      const a = F / m;
      const bx = pan.x + 30 + (a * 0.4 * Math.sin(t * 0.3 + 0.5) + 0.5) * 100;
      const by = panTop + 155;
      ctx.fillStyle = '#059669'; roundRect(ctx, bx - 22, by - 18, 44, 36, 4); ctx.fill();
      label(ctx, 'm', bx, by, 'white', 11, 'center');
      // Wheels
      [bx - 14, bx + 14].forEach(wx => {
        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(wx, by + 18, 8, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
      });
      arrow(ctx, bx - 40, by, bx - 22, by, pan.color, 2.5, 9);
      label(ctx, `F=${F.toFixed(0)}N`, bx - 60, by - 10, pan.color, 9, 'center');
      label(ctx, `a=${a.toFixed(0)} m/s²`, pan.x + panW / 2, panTop + 210, pan.color, 10, 'center');
      label(ctx, 'F = ma', pan.x + panW / 2, panTop + 225, '#94a3b8', 9, 'center');

    } else {
      // Two rockets pushing each other
      const sep = 40 + Math.sin(t * 1.5) * 20;
      const cy2 = panTop + 140;
      // Rocket 1 (left)
      ctx.save(); ctx.fillStyle = '#ef4444';
      ctx.translate(pan.x + panW / 2 - sep, cy2); ctx.scale(-1, 1);
      ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(30, 0); ctx.lineTo(0, 15); ctx.closePath(); ctx.fill();
      // Exhaust
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.ellipse(5, 0, 10, 4, 0, 0, TAU); ctx.fill();
      ctx.restore();
      // Rocket 2 (right)
      ctx.save(); ctx.fillStyle = '#f97316';
      ctx.translate(pan.x + panW / 2 + sep, cy2);
      ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(30, 0); ctx.lineTo(0, 15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.ellipse(5, 0, 10, 4, 0, 0, TAU); ctx.fill();
      ctx.restore();
      // Arrows
      arrow(ctx, pan.x + panW / 2 - sep, cy2 - 25, pan.x + panW / 2 - sep - 30, cy2 - 25, '#ef4444', 2, 7);
      arrow(ctx, pan.x + panW / 2 + sep, cy2 - 25, pan.x + panW / 2 + sep + 30, cy2 - 25, '#f97316', 2, 7);
      label(ctx, '−F', pan.x + panW / 2 - sep - 18, cy2 - 38, '#ef4444', 9, 'center');
      label(ctx, '+F', pan.x + panW / 2 + sep + 18, cy2 - 38, '#f97316', 9, 'center');
      label(ctx, 'Action = −Reaction', pan.x + panW / 2, panTop + 220, '#94a3b8', 9, 'center');
    }
  });

  label(ctx, "Newton's Laws of Motion", W / 2, 20, '#fde047', 13, 'center');
}

// ── Momentum ──────────────────────────────────────────────────────
function drawMomentum(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  col: { b1x: number; b2x: number; b1vx: number; b2vx: number; hit: boolean }, vars: Record<string, number>) {
  const m1 = clamp(vars.mass1 ?? 3, 0.5, 8);
  const m2 = clamp(vars.mass2 ?? 1.5, 0.5, 8);
  const r1 = 20 + m1 * 4, r2 = 15 + m2 * 4;
  const groundY = H - 60;

  col.b1x += col.b1vx * dt;
  col.b2x += col.b2vx * dt;
  if (!col.hit && col.b1x + r1 >= col.b2x - r2) {
    col.hit = true;
    // Perfectly inelastic
    const vCommon = (m1 * col.b1vx + m2 * col.b2vx) / (m1 + m2);
    col.b1vx = vCommon; col.b2vx = vCommon;
  }
  if (col.b1x < -50 || col.b2x > W + 50) {
    col.b1x = 80; col.b2x = 500; col.b1vx = 2.5; col.b2vx = -1; col.hit = false;
  }

  ctx.fillStyle = '#1e293b'; ctx.fillRect(0, groundY, W, 10);

  const b1y = groundY - r1, b2y = groundY - r2;
  const pScale = 8;

  // p vectors
  const p1 = m1 * col.b1vx, p2 = m2 * col.b2vx;
  const pTotal = p1 + p2;
  arrow(ctx, col.b1x, b1y - r1 - 10, col.b1x + p1 * pScale, b1y - r1 - 10, '#60a5fa', 2.5, 10);
  arrow(ctx, col.b2x, b2y - r2 - 10, col.b2x + p2 * pScale, b2y - r2 - 10, '#f97316', 2.5, 10);
  label(ctx, `p₁=${p1.toFixed(1)}`, col.b1x, b1y - r1 - 22, '#60a5fa', 9, 'center');
  label(ctx, `p₂=${p2.toFixed(1)}`, col.b2x, b2y - r2 - 22, '#f97316', 9, 'center');

  glowCircle(ctx, col.b1x, b1y, r1, '#3b82f6', r1 + 10);
  label(ctx, `${m1}`, col.b1x, b1y, 'white', 10, 'center');
  glowCircle(ctx, col.b2x, b2y, r2, '#f97316', r2 + 10);
  label(ctx, `${m2}`, col.b2x, b2y, 'white', 10, 'center');

  // Conservation bar
  const barX = 50, barY = 30, barW = W - 100;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(ctx, barX, barY, barW, 40, 6); ctx.fill();
  label(ctx, 'Momentum Conservation: p_total = const', barX + barW / 2, barY + 12, '#94a3b8', 10, 'center');
  const maxP = (m1 + m2) * 2.5;
  const frac = clamp((pTotal + maxP) / (maxP * 2), 0, 1);
  const grad = ctx.createLinearGradient(barX + 10, 0, barX + barW - 10, 0);
  grad.addColorStop(0, '#3b82f6'); grad.addColorStop(1, '#f97316');
  ctx.fillStyle = grad; ctx.fillRect(barX + 10, barY + 22, (barW - 20) * frac, 10);
  label(ctx, `p = ${pTotal.toFixed(2)} kg·m/s`, barX + barW / 2, barY + 48, '#fbbf24', 10, 'center');
}

// ── Work-Energy Theorem ───────────────────────────────────────────
function drawWorkEnergy(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  we: { x: number; y: number; v: number }, vars: Record<string, number>) {
  const angle = clamp(vars.angle ?? 25, 5, 50) * Math.PI / 180;
  const m = clamp(vars.mass ?? 2, 0.5, 10);
  const mu = clamp(vars.friction ?? 0.1, 0, 0.5);
  const g = 9.81;

  // Ramp
  const rampX1 = 80, rampY1 = H - 60, rampX2 = W - 80, rampY2 = 80;
  const rampLen = Math.sqrt((rampX2 - rampX1) ** 2 + (rampY2 - rampY1) ** 2);

  ctx.save();
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(rampX1, rampY1); ctx.lineTo(rampX2, rampY2);
  ctx.lineTo(rampX2, rampY1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(rampX1, rampY1); ctx.lineTo(rampX2, rampY2); ctx.stroke();
  ctx.restore();

  // Block on ramp
  const accel = g * (Math.sin(angle) - mu * Math.cos(angle));
  we.v += accel * dt * 0.03;
  if (we.v < 0) we.v = 0;
  const dist = we.v * t * 0.005 % rampLen;
  const frac2 = dist / rampLen;
  const bx = rampX1 + (rampX2 - rampX1) * frac2;
  const by = rampY1 + (rampY2 - rampY1) * frac2;

  // Height and energy
  const h = ((rampY1 - by) / (rampY1 - rampY2)) * ((rampY1 - rampY2) / 10);
  const KE2 = 0.5 * m * we.v * we.v * 0.01;
  const PE2 = m * g * Math.max(0, h) * 0.001;
  const E_total = KE2 + PE2;

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-angle);
  ctx.fillStyle = '#1d4ed8'; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 16;
  roundRect(ctx, -18, -16, 36, 32, 4); ctx.fill();
  ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  // Forces
  arrow(ctx, bx, by, bx, by + 30, '#ef4444', 2, 8); // gravity
  label(ctx, 'mg', bx + 5, by + 28, '#ef4444', 9);
  arrow(ctx, bx, by, bx + 20 * Math.cos(angle), by - 20 * Math.sin(angle), '#34d399', 2, 8); // normal
  label(ctx, 'N', bx + 25, by - 15, '#34d399', 9);

  // Energy bars
  const barX = W - 140, barY = 50, barH = 200;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, barX, barY, 120, barH + 30, 8); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
  label(ctx, 'Energy', barX + 60, barY + 14, '#94a3b8', 9, 'center');

  [
    { lbl: 'KE', val: KE2 / (E_total + 0.01), col: '#fbbf24', bx2: barX + 15 },
    { lbl: 'PE', val: PE2 / (E_total + 0.01), col: '#a78bfa', bx2: barX + 55 },
    { lbl: 'E', val: 1, col: '#34d399', bx2: barX + 95 - 30 },
  ].forEach(bar => {
    const fullH = barH - 20;
    const barFillH = fullH * clamp(bar.val, 0, 1);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(bar.bx2, barY + 22, 28, fullH);
    ctx.fillStyle = bar.col;
    ctx.fillRect(bar.bx2, barY + 22 + fullH - barFillH, 28, barFillH);
    label(ctx, bar.lbl, bar.bx2 + 14, barY + 22 + fullH + 10, bar.col, 9, 'center');
  });

  infoPanel(ctx, [
    '⚡ Work-Energy Theorem',
    `W_net = ΔKE`,
    `θ = ${Math.round(angle * 180 / Math.PI)}°  μ = ${mu}`,
    `KE = ${KE2.toFixed(2)} J`,
    `PE = ${PE2.toFixed(2)} J`,
  ], 10, 10, '#fbbf24');
}

// ── Simple Harmonic Motion (Phase Space) ──────────────────────────
function drawSHM(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  shm: { x: number; y: number; trail: { x: number; y: number }[] }, vars: Record<string, number>) {
  const omega3 = clamp(vars.angular_frequency ?? 2, 0.5, 6);
  const A = clamp(vars.amplitude ?? 1, 0.1, 2);
  const cx = W / 2, cy = H / 2;
  const scaleX = 120 / A, scaleY = 80;

  // x(t) = A cos(ωt), v(t) = -Aω sin(ωt)
  const xVal = A * Math.cos(omega3 * t);
  const vVal = -A * omega3 * Math.sin(omega3 * t);

  shm.x = xVal; shm.y = vVal;
  shm.trail.push({ x: xVal, y: vVal });
  if (shm.trail.length > 200) shm.trail.shift();

  // Phase space ellipse
  ctx.save();
  ctx.strokeStyle = 'rgba(71,85,105,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.ellipse(cx, cy, A * scaleX, A * omega3 * scaleY, 0, 0, TAU); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  // Axes
  arrow(ctx, cx - 180, cy, cx + 180, cy, '#475569', 1.5, 8);
  arrow(ctx, cx, cy + 130, cx, cy - 130, '#475569', 1.5, 8);
  label(ctx, 'x (position)', cx + 185, cy, '#64748b', 10);
  label(ctx, 'v (velocity)', cx + 5, cy - 135, '#64748b', 10);
  label(ctx, '0', cx - 12, cy + 12, '#64748b', 9);

  // Trail
  shm.trail.forEach((p2, i) => {
    const a = i / shm.trail.length;
    ctx.fillStyle = `rgba(96,165,250,${a * 0.6})`;
    ctx.beginPath(); ctx.arc(cx + p2.x * scaleX, cy - p2.y * scaleY, 2 * a, 0, TAU); ctx.fill();
  });

  // Current point
  glowCircle(ctx, cx + xVal * scaleX, cy - vVal * scaleY, 8, '#60a5fa', 16);

  // x(t) graph top-right
  const gx = W - 200, gy = 10, gw = 190, gh = 100;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(ctx, gx, gy, gw, gh, 6); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
  label(ctx, 'x(t)', gx + gw / 2, gy + 12, '#94a3b8', 9, 'center');
  ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1.5; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 6;
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const ti3 = t - (100 - i) * 0.04;
    const px = gx + (i / 100) * gw;
    const py = gy + gh / 2 - A * Math.cos(omega3 * ti3) * (gh / 2 - 8);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke(); ctx.restore();

  infoPanel(ctx, [
    '🌊 SHM Phase Space',
    `ω = ${omega3} rad/s`,
    `A = ${A} m`,
    `x = ${xVal.toFixed(2)} m`,
    `v = ${vVal.toFixed(2)} m/s`,
    `T = ${(TAU / omega3).toFixed(2)} s`,
  ], 10, 10, '#60a5fa');
}

// ── Rotational Motion ─────────────────────────────────────────────
function drawRotationalMotion(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  angRef: React.MutableRefObject<number>, omegaRef: React.MutableRefObject<number>, vars: Record<string, number>) {
  const tau = clamp(vars.torque ?? 5, 0, 20);
  const I_mom = clamp(vars.moment_of_inertia ?? 2, 0.5, 10);
  const alpha2 = tau / I_mom;
  omegaRef.current = Math.min(omegaRef.current + alpha2 * dt * 0.002, 0.25);
  angRef.current += omegaRef.current * dt;

  const cx = 280, cy = H / 2;
  const R = 110;

  // Disk gradient
  const diskGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
  diskGrad.addColorStop(0, '#1e40af'); diskGrad.addColorStop(0.6, '#1d4ed8'); diskGrad.addColorStop(1, '#0f172a');
  ctx.save();
  ctx.fillStyle = diskGrad; ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 25;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();

  // Spokes
  for (let i = 0; i < 4; i++) {
    const a = angRef.current + i * Math.PI / 2;
    glowLine(ctx, cx, cy, cx + R * Math.cos(a), cy + R * Math.sin(a), '#93c5fd', 2, 8);
  }

  // Reference mark
  const rx2 = cx + R * Math.cos(angRef.current), ry2 = cy + R * Math.sin(angRef.current);
  glowCircle(ctx, rx2, ry2, 8, '#ef4444', 14);

  // Center hub
  glowCircle(ctx, cx, cy, 10, '#fbbf24', 16);

  // ω vector (out of plane)
  arrow(ctx, cx, cy, cx, cy - 90, '#34d399', 3, 12);
  label(ctx, 'ω', cx + 8, cy - 90, '#34d399', 13);

  // Torque arc
  ctx.save(); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5; ctx.shadowColor = '#f97316'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(cx, cy, R + 20, -Math.PI / 2, -Math.PI / 2 + Math.min(omegaRef.current * 40, TAU - 0.1));
  ctx.stroke();
  label(ctx, `τ=${tau}N·m`, cx, cy + R + 40, '#f97316', 11, 'center');
  ctx.restore();

  // Angular velocity graph
  const gx = W - 230, gy = 30, gw = 210, gh = 120;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, gx, gy, gw, gh, 6); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
  label(ctx, 'ω(t) — angular velocity', gx + gw / 2, gy + 12, '#94a3b8', 9, 'center');
  ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.shadowColor = '#34d399'; ctx.shadowBlur = 6;
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const px = gx + (i / 100) * gw;
    const py = gy + gh - 10 - Math.min(alpha2 * (i / 100) * t * 0.5, 1) * (gh - 20);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke(); ctx.restore();

  infoPanel(ctx, [
    '🔄 Rotational Motion',
    'τ = Iα  L = Iω',
    `τ = ${tau} N·m`,
    `I = ${I_mom} kg·m²`,
    `α = ${alpha2.toFixed(2)} rad/s²`,
    `ω = ${omegaRef.current.toFixed(3)} rad/s`,
  ], W - 225, 165, '#34d399');
}

// ── Angular Momentum Conservation ─────────────────────────────────
function drawAngularMomentum(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  ref: React.MutableRefObject<{ arms: number; omega: number }>, vars: Record<string, number>) {
  const cx = W / 2, cy = H / 2;
  const armLen = 40 + 60 * (0.5 + 0.5 * Math.sin(t * 0.6));
  const I4 = 2 + (armLen / 100) * 4;
  const L = 0.8; // conserved
  ref.current.omega = L / I4;
  ref.current.arms = armLen;

  const omega4 = ref.current.omega;
  const totalAng = t * omega4 * 3;

  // Body
  ctx.save();
  ctx.fillStyle = '#1d4ed8'; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, TAU); ctx.fill();
  ctx.restore();

  // Arms
  for (let side = -1; side <= 1; side += 2) {
    const ax = cx + side * armLen * Math.cos(totalAng);
    const ay = cy + side * armLen * Math.sin(totalAng);
    glowLine(ctx, cx, cy, ax, ay, '#94a3b8', 4, 8);
    glowCircle(ctx, ax, ay, 10, '#fbbf24', 16);
  }

  // L vector (always same)
  arrow(ctx, cx, cy, cx, cy - 80, '#34d399', 3, 12);
  label(ctx, `L = ${L.toFixed(1)} kg·m²/s`, cx + 8, cy - 80, '#34d399', 10);
  label(ctx, '(conserved)', cx + 8, cy - 65, '#64748b', 9);

  // ω and I displays
  infoPanel(ctx, [
    '💃 Angular Momentum',
    'L = Iω = const',
    `Arms: ${armLen.toFixed(0)} px`,
    `I = ${I4.toFixed(2)} kg·m²`,
    `ω = ${omega4.toFixed(3)} rad/s`,
  ], 10, 10, '#34d399');

  // Side comparison bars
  const barX = W - 160, barY = 40;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(ctx, barX, barY, 140, 160, 6); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
  label(ctx, 'I  vs  ω', barX + 70, barY + 14, '#94a3b8', 10, 'center');
  [
    { lbl: 'I', val: (I4 - 2) / 4, col: '#a78bfa', bx2: barX + 20 },
    { lbl: 'ω', val: omega4 / 0.4, col: '#fbbf24', bx2: barX + 75 },
  ].forEach(bar => {
    const fullH = 110;
    const fillH = fullH * clamp(bar.val, 0, 1);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(bar.bx2, barY + 25, 40, fullH);
    ctx.fillStyle = bar.col; ctx.fillRect(bar.bx2, barY + 25 + fullH - fillH, 40, fillH);
    label(ctx, bar.lbl, bar.bx2 + 20, barY + 142, bar.col, 11, 'center');
  });
}

// ── Gravity & Orbits ──────────────────────────────────────────────
function drawGravityOrbits(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  orbits: { angle: number; r: number; speed: number; color: string; trail: { x: number; y: number }[] }[],
  vars: Record<string, number>) {
  const cx = W / 2, cy = H / 2;

  // Sun glow
  const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 45);
  sunGrad.addColorStop(0, '#fff7ed');
  sunGrad.addColorStop(0.4, '#fbbf24');
  sunGrad.addColorStop(0.8, '#f97316');
  sunGrad.addColorStop(1, 'rgba(249,115,22,0)');
  ctx.fillStyle = sunGrad; ctx.beginPath(); ctx.arc(cx, cy, 45, 0, TAU); ctx.fill();
  label(ctx, '☀', cx, cy, 'transparent', 30, 'center');

  // Orbit rings
  orbits.forEach(orb => {
    ctx.save(); ctx.strokeStyle = `${orb.color}20`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, orb.r, orb.r * 0.7, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  });

  // Stars
  for (let i = 0; i < 50; i++) {
    const sx = ((i * 137 + 50) % (W - 20)) + 10;
    const sy = ((i * 89 + 20) % (H - 20)) + 10;
    const sa = 0.3 + 0.5 * Math.sin(t * 2 + i);
    ctx.fillStyle = `rgba(255,255,255,${sa * 0.5})`;
    ctx.beginPath(); ctx.arc(sx, sy, 1, 0, TAU); ctx.fill();
  }

  const planets = ['🌑', '🌍', '🔴'];
  orbits.forEach((orb, i) => {
    orb.angle += orb.speed * dt;
    const px = cx + orb.r * Math.cos(orb.angle);
    const py = cy + orb.r * 0.7 * Math.sin(orb.angle);
    orb.trail.push({ x: px, y: py });
    if (orb.trail.length > 60) orb.trail.shift();

    // Trail
    orb.trail.forEach((p2, ti) => {
      const a = ti / orb.trail.length;
      ctx.fillStyle = `${orb.color}${Math.round(a * 80).toString(16).padStart(2, '0')}`;
      ctx.beginPath(); ctx.arc(p2.x, p2.y, 2 * a, 0, TAU); ctx.fill();
    });

    // Planet
    glowCircle(ctx, px, py, 9 + i * 3, orb.color, 16 + i * 4);
    label(ctx, planets[i], px, py, 'transparent', 18, 'center');

    // Velocity vector
    const vx3 = -orb.r * orb.speed * Math.sin(orb.angle) * 5;
    const vy3 = orb.r * 0.7 * orb.speed * Math.cos(orb.angle) * 5;
    arrow(ctx, px, py, px + vx3, py + vy3, orb.color + '99', 1.5, 6);
  });

  infoPanel(ctx, [
    '🪐 Orbital Mechanics',
    "Kepler's 3rd Law:",
    'T² ∝ r³',
    `ω₁ = ${orbits[0].speed.toFixed(3)} r/s`,
    `ω₂ = ${orbits[1].speed.toFixed(3)} r/s`,
    `ω₃ = ${orbits[2].speed.toFixed(3)} r/s`,
  ], 10, 10, '#fbbf24');
}

// ── Sound Waves ───────────────────────────────────────────────────
function drawSoundWaves(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  phaseRef: React.MutableRefObject<number>, vars: Record<string, number>) {
  phaseRef.current += dt * 0.08;
  const phi = phaseRef.current;
  const f5 = clamp(vars.frequency ?? 440, 100, 2000);
  const lambda = 340 / f5 * 50; // pixels per wavelength

  const cy = H / 2;
  const spkX = 60;

  // Speaker
  ctx.save();
  ctx.fillStyle = '#1e293b'; roundRect(ctx, spkX - 30, cy - 50, 30, 100, 4); ctx.fill();
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke();
  // Cone oscillation
  const coneOff = Math.sin(phi * 4) * 8;
  ctx.fillStyle = '#334155';
  ctx.beginPath(); ctx.moveTo(spkX, cy - 30); ctx.lineTo(spkX + 20 + coneOff, cy - 10);
  ctx.lineTo(spkX + 20 + coneOff, cy + 10); ctx.lineTo(spkX, cy + 30); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Longitudinal wave — compression bands
  const nBands = Math.ceil(W / lambda) + 2;
  for (let i = 0; i < nBands * 20; i++) {
    const x = spkX + 50 + (i / (nBands * 20)) * (W - spkX - 70);
    const compression = 0.5 + 0.5 * Math.sin((x / lambda) * TAU - phi * 4);
    const alpha = compression * 0.6;
    ctx.strokeStyle = `rgba(96,165,250,${alpha})`;
    ctx.lineWidth = 2 * compression + 0.3;
    ctx.beginPath(); ctx.moveTo(x, cy - 55); ctx.lineTo(x, cy + 55); ctx.stroke();
  }

  // Transverse representation
  ctx.save(); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2.5; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let i = 0; i <= 300; i++) {
    const x = spkX + 50 + (i / 300) * (W - spkX - 70);
    const decay = Math.exp(-(i / 300) * 1.5);
    const y = cy - Math.sin((i / 300) * (W / lambda) * TAU - phi * 4) * 50 * decay;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.restore();

  // Pressure labels
  label(ctx, 'Compression →', spkX + 80, cy - 65, '#94a3b8', 9);
  label(ctx, 'Rarefaction ←', spkX + 200, cy + 70, '#64748b', 9);

  infoPanel(ctx, [
    '🔊 Sound Waves',
    `f = ${f5.toFixed(0)} Hz`,
    `λ = ${(340 / f5).toFixed(2)} m`,
    `v = λf = 340 m/s`,
    `T = ${(1 / f5 * 1000).toFixed(2)} ms`,
  ], 10, 10, '#60a5fa');
}

// ── Standing Waves ────────────────────────────────────────────────
function drawStandingWaves(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, vars: Record<string, number>) {
  const n = Math.round(clamp(vars.harmonic ?? 3, 1, 6));
  const L5 = W - 100;
  const x0 = 50;

  // String anchors
  glowCircle(ctx, x0, H / 2, 6, '#475569', 10);
  glowCircle(ctx, x0 + L5, H / 2, 6, '#475569', 10);

  // Harmonics stack
  const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f97316', '#a78bfa', '#ec4899'];
  for (let harmonic = 1; harmonic <= n; harmonic++) {
    const yOff = (H / 2) - (n - harmonic) * 50 + (n / 2) * 50 - 25;
    const amp = 30 - harmonic * 3;
    const col = colors[(harmonic - 1) % colors.length];
    const alpha = harmonic === n ? 1 : 0.35;

    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = harmonic === n ? 3 : 1.5;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = col; ctx.shadowBlur = harmonic === n ? 14 : 4;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = x0 + (i / 200) * L5;
      const y = yOff - Math.sin((i / 200) * Math.PI * harmonic) * Math.sin(t * 4) * amp;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    label(ctx, `n=${harmonic}`, x0 - 35, yOff, col, 9, 'center');

    // Nodes and antinodes
    if (harmonic === n) {
      for (let i = 0; i <= harmonic; i++) {
        const nx = x0 + (i / harmonic) * L5;
        glowCircle(ctx, nx, yOff, 4, '#ef4444', 7);
      }
      for (let i = 0; i < harmonic; i++) {
        const ax = x0 + ((i + 0.5) / harmonic) * L5;
        glowCircle(ctx, ax, yOff, 4, '#34d399', 7);
      }
    }
  }

  const lambda2 = 2 * L5 / n;
  infoPanel(ctx, [
    '〰 Standing Waves',
    `n = ${n} (harmonic)`,
    `L = ${(L5 / 100).toFixed(1)} m`,
    `λ = 2L/n = ${(lambda2 / 100).toFixed(2)} m`,
    `f = ${(340 * n / (2 * L5 / 100)).toFixed(0)} Hz`,
  ], 10, 10, colors[(n - 1) % colors.length]);

  label(ctx, '● Node  ● Antinode', W - 140, H - 20, '#94a3b8', 9);
}

// ── Fluid Statics (Archimedes) ────────────────────────────────────
function drawFluidStatics(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  obj: { y: number; vy: number }, vars: Record<string, number>) {
  const rhoF = clamp(vars.fluid_density ?? 1000, 500, 2000);
  const rhoObj = clamp(vars.object_density ?? 600, 100, 3000);
  const g6 = 9.81;
  const V6 = 0.002; // m³
  const m6 = rhoObj * V6;
  const Fb = rhoF * V6 * g6;
  const Fg = m6 * g6;
  const netF = Fb - Fg;

  // Container
  const cLeft = 100, cRight = W - 100, cBottom = H - 40, cTop = 80;
  ctx.save();
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cLeft, cTop); ctx.lineTo(cLeft, cBottom); ctx.lineTo(cRight, cBottom); ctx.lineTo(cRight, cTop); ctx.stroke();
  ctx.restore();

  // Water
  const waterTop = cTop + 40;
  const waterGrad = ctx.createLinearGradient(0, waterTop, 0, cBottom);
  waterGrad.addColorStop(0, 'rgba(37,99,235,0.4)');
  waterGrad.addColorStop(1, 'rgba(29,78,216,0.7)');
  ctx.fillStyle = waterGrad; ctx.fillRect(cLeft + 2, waterTop, cRight - cLeft - 4, cBottom - waterTop);

  // Water surface ripple
  ctx.save(); ctx.strokeStyle = 'rgba(147,197,253,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = cLeft + 2; x < cRight; x++) {
    const y = waterTop + Math.sin(x * 0.1 + t * 3) * 2;
    x === cLeft + 2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.restore();

  // Fluid mechanics: buoyancy
  obj.vy += (netF / m6) * 0.02 * dt;
  obj.vy *= 0.94;
  obj.y += obj.vy * dt;
  const subFrac = clamp(rhoObj / rhoF, 0, 1);
  const equilibriumY = waterTop + (cBottom - waterTop) * 0.3;
  const objY = clamp(cTop + 30 + obj.y * 0.3, cTop + 20, cBottom - 40);

  // Object (box)
  const objW = 60, objH = 40;
  const objCol = rhoObj < rhoF ? '#fbbf24' : '#ef4444';
  ctx.save();
  ctx.fillStyle = objCol; ctx.shadowColor = objCol; ctx.shadowBlur = 14;
  roundRect(ctx, W / 2 - objW / 2, objY - objH / 2, objW, objH, 4); ctx.fill();
  ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke();
  label(ctx, `ρ=${rhoObj}`, W / 2, objY, 'white', 9, 'center');
  ctx.restore();

  // Forces
  arrow(ctx, W / 2, objY - objH / 2, W / 2, objY - objH / 2 - clamp(Fb / 50, 5, 80), '#34d399', 2.5, 10);
  label(ctx, `Fb=${Fb.toFixed(0)}N`, W / 2 + 35, objY - objH / 2 - 25, '#34d399', 9);
  arrow(ctx, W / 2, objY + objH / 2, W / 2, objY + objH / 2 + clamp(Fg / 50, 5, 80), '#ef4444', 2.5, 10);
  label(ctx, `Fg=${Fg.toFixed(0)}N`, W / 2 + 35, objY + objH / 2 + 25, '#ef4444', 9);

  // Depth pressure
  for (let d = 0; d < 4; d++) {
    const py = waterTop + d * 30 + 20;
    const pressure = rhoF * g6 * (py - waterTop) / 100;
    const pw = clamp(pressure * 0.5, 2, 40);
    ctx.fillStyle = `rgba(96,165,250,${0.2 + d * 0.1})`;
    ctx.fillRect(cLeft + 2, py, pw, 8);
    ctx.fillRect(cRight - 2 - pw, py, pw, 8);
  }

  infoPanel(ctx, [
    '🌊 Fluid Statics',
    'Archimedes: Fb = ρVg',
    `ρ_fluid = ${rhoF} kg/m³`,
    `ρ_object = ${rhoObj} kg/m³`,
    `Fb = ${Fb.toFixed(1)} N`,
    rhoObj < rhoF ? '→ Object FLOATS' : '→ Object SINKS',
  ], 10, 10, rhoObj < rhoF ? '#34d399' : '#ef4444');
}

// ── Fluid Dynamics (Bernoulli) ────────────────────────────────────
function drawFluidDynamics(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  particles: { x: number; y: number; speed: number }[], vars: Record<string, number>) {
  // Venturi tube shape
  const tubeColor = '#334155';
  const wide = 70, narrow = 25;
  const x1 = 80, x2 = 280, x3 = 450, x4 = W - 30;
  const cy7 = H / 2;

  // Tube walls
  ctx.save(); ctx.fillStyle = tubeColor;
  // Top wall
  ctx.beginPath();
  ctx.moveTo(x1, cy7 - wide);
  ctx.lineTo(x2, cy7 - wide);
  ctx.quadraticCurveTo(x2 + 50, cy7 - narrow, x3, cy7 - narrow);
  ctx.lineTo(x4, cy7 - narrow);
  ctx.lineTo(x4, cy7 - narrow - 16);
  ctx.lineTo(x3, cy7 - narrow - 16);
  ctx.quadraticCurveTo(x2 + 30, cy7 - wide - 16, x2, cy7 - wide - 16);
  ctx.lineTo(x1, cy7 - wide - 16);
  ctx.closePath(); ctx.fill();
  // Bottom wall
  ctx.beginPath();
  ctx.moveTo(x1, cy7 + wide);
  ctx.lineTo(x2, cy7 + wide);
  ctx.quadraticCurveTo(x2 + 50, cy7 + narrow, x3, cy7 + narrow);
  ctx.lineTo(x4, cy7 + narrow);
  ctx.lineTo(x4, cy7 + narrow + 16);
  ctx.lineTo(x3, cy7 + narrow + 16);
  ctx.quadraticCurveTo(x2 + 30, cy7 + wide + 16, x2, cy7 + wide + 16);
  ctx.lineTo(x1, cy7 + wide + 16);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // Fluid fill
  const fluidGrad = ctx.createLinearGradient(x1, 0, x4, 0);
  fluidGrad.addColorStop(0, 'rgba(37,99,235,0.5)');
  fluidGrad.addColorStop(0.5, 'rgba(6,182,212,0.6)');
  fluidGrad.addColorStop(1, 'rgba(37,99,235,0.5)');
  ctx.fillStyle = fluidGrad;
  ctx.beginPath();
  ctx.moveTo(x1, cy7 - wide);
  ctx.lineTo(x2, cy7 - wide);
  ctx.quadraticCurveTo(x2 + 50, cy7 - narrow, x3, cy7 - narrow);
  ctx.lineTo(x4, cy7 - narrow);
  ctx.lineTo(x4, cy7 + narrow);
  ctx.lineTo(x3, cy7 + narrow);
  ctx.quadraticCurveTo(x2 + 50, cy7 + narrow, x2, cy7 + wide);
  ctx.lineTo(x1, cy7 + wide);
  ctx.closePath(); ctx.fill();

  // Particles
  particles.forEach(p => {
    // Speed depends on cross-section
    const sectionSpd = p.x > x2 && p.x < x3 ? p.speed * 3.5 : p.speed;
    p.x += sectionSpd * dt;
    if (p.x > x4 + 20) { p.x = x1; p.y = cy7 + rnd(-wide + 8, wide - 8); }
    // Clamp y to tube
    const hw = p.x < x2 ? wide : p.x > x3 ? narrow : lerp(wide, narrow, (p.x - x2) / (x3 - x2));
    p.y = clamp(p.y, cy7 - hw + 4, cy7 + hw - 4);
    glowCircle(ctx, p.x, p.y, 3, '#7dd3fc', 5);
  });

  // Pressure columns
  [
    { x: 160, hw: wide, label: 'P₁ high', col: '#60a5fa' },
    { x: 360, hw: narrow, label: 'P₂ low', col: '#34d399' },
    { x: 540, hw: narrow, label: 'P₃ high', col: '#60a5fa' },
  ].forEach(col => {
    const colH = col.hw === wide ? 90 : 30;
    ctx.save();
    ctx.fillStyle = col.col + '55'; ctx.strokeStyle = col.col; ctx.lineWidth = 1.5;
    ctx.fillRect(col.x - 10, cy7 - col.hw - colH, 20, colH);
    ctx.strokeRect(col.x - 10, cy7 - col.hw - colH, 20, colH);
    label(ctx, col.label, col.x, cy7 - col.hw - colH - 10, col.col, 9, 'center');
    ctx.restore();
  });

  // Velocity arrows in tube
  ['slow', 'fast', 'slow'].forEach((s, i) => {
    const bx = [160, 360, 540][i];
    const col = s === 'fast' ? '#34d399' : '#60a5fa';
    const vl = s === 'fast' ? 40 : 15;
    arrow(ctx, bx - vl / 2, cy7, bx + vl / 2, cy7, col, 2, 8);
    label(ctx, `v${i + 1}`, bx, cy7 + 12, col, 9, 'center');
  });

  infoPanel(ctx, [
    '💧 Bernoulli\'s Principle',
    'P + ½ρv² + ρgh = const',
    'Fast flow → Low pressure',
    'Slow flow → High pressure',
    'A₁v₁ = A₂v₂ (continuity)',
  ], 10, 10, '#06b6d4');
}

// ── Surface Tension ───────────────────────────────────────────────
function drawSurfaceTension(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const cy8 = H / 2 + 40;

  // Water surface
  ctx.save();
  const surfGrad = ctx.createLinearGradient(0, cy8 - 5, 0, H - 20);
  surfGrad.addColorStop(0, 'rgba(37,99,235,0.6)');
  surfGrad.addColorStop(1, 'rgba(29,78,216,0.85)');
  ctx.fillStyle = surfGrad; ctx.fillRect(40, cy8, W - 80, H - cy8 - 20);

  // Surface tension line with ripples
  ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2.5; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let x = 40; x < W - 40; x++) {
    const y = cy8 + Math.sin(x * 0.05 + t * 2) * 3 + Math.sin(x * 0.12 - t * 1.5) * 1.5;
    x === 40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.restore();

  // Water strider on surface
  const bugX = W / 2 + Math.sin(t * 0.5) * 80;
  const bugY = cy8 + Math.sin(bugX * 0.05 + t * 2) * 3;

  // Leg dents (surface depression)
  [bugX - 35, bugX - 12, bugX + 12, bugX + 35].forEach(lx => {
    ctx.save(); ctx.fillStyle = 'rgba(37,99,235,0.4)';
    ctx.beginPath(); ctx.ellipse(lx, bugY + 3, 6, 3, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(lx, bugY + 2, 5, 0, Math.PI); ctx.stroke();
    ctx.restore();
  });

  // Bug body
  ctx.save(); ctx.fillStyle = '#16a34a'; ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.ellipse(bugX, bugY - 5, 18, 8, 0, 0, TAU); ctx.fill();
  ctx.restore();
  label(ctx, '🐞', bugX, bugY - 5, 'transparent', 20, 'center');

  // Legs
  [bugX - 30, bugX, bugX + 30].forEach(lx => {
    glowLine(ctx, bugX, bugY - 5, lx, bugY + 2, '#16a34a', 2, 4);
  });

  // Surface tension force arrows
  [bugX - 30, bugX + 30].forEach((lx, i) => {
    arrow(ctx, lx, bugY + 3, lx + (i === 0 ? -18 : 18), bugY + 3, '#fbbf24', 2, 7);
  });
  label(ctx, 'γ', bugX - 50, bugY - 5, '#fbbf24', 12);
  label(ctx, 'γ', bugX + 52, bugY - 5, '#fbbf24', 12);

  // Capillary tubes
  [200, 350, 500].forEach((tx, i) => {
    const tubeW = 18 - i * 4;
    const riseH = 20 + i * 25;
    ctx.save();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx - tubeW, cy8 - 60); ctx.lineTo(tx - tubeW, cy8 + 60);
    ctx.moveTo(tx + tubeW, cy8 - 60); ctx.lineTo(tx + tubeW, cy8 + 60); ctx.stroke();
    ctx.fillStyle = 'rgba(37,99,235,0.6)';
    ctx.fillRect(tx - tubeW + 2, cy8 - riseH, tubeW * 2 - 4, riseH + 60);
    // meniscus
    ctx.fillStyle = 'rgba(147,197,253,0.7)';
    ctx.beginPath(); ctx.ellipse(tx, cy8 - riseH, tubeW - 2, 5, 0, 0, TAU); ctx.fill();
    label(ctx, `d=${(20 - i * 4)}mm`, tx, cy8 - 75, '#94a3b8', 8, 'center');
    label(ctx, `h=${riseH}px`, tx, cy8 - riseH - 15, '#60a5fa', 8, 'center');
    ctx.restore();
  });
  label(ctx, 'h ∝ 1/r  (capillary action)', W / 2, cy8 - 90, '#94a3b8', 10, 'center');

  infoPanel(ctx, [
    '💧 Surface Tension',
    'γ = F/L (N/m)',
    'Water: γ ≈ 0.073 N/m',
    'Capillary: h = 2γcosθ/ρgr',
    'Smaller tube → higher rise',
  ], 10, 10, '#34d399');
}

// ── Viscosity ─────────────────────────────────────────────────────
function drawViscosity(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // Couette flow — fluid between plates
  const topY = 60, botY = H - 60;
  const plateH = 16;

  // Bottom plate (fixed)
  ctx.fillStyle = '#334155'; ctx.fillRect(40, botY, W - 80, plateH);
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.strokeRect(40, botY, W - 80, plateH);
  label(ctx, 'Fixed plate  (v = 0)', W / 2, botY + plateH + 14, '#64748b', 10, 'center');

  // Top plate (moving)
  const topSpeed = 80;
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(40 + (t * topSpeed % 200), topY - plateH, W - 80, plateH);
  ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.strokeRect(40, topY - plateH, W - 80, plateH);
  label(ctx, 'Moving plate  →  v = v₀', W / 2, topY - plateH - 10, '#60a5fa', 10, 'center');

  // Fluid layers with velocity profile
  const nLayers = 14;
  for (let i = 0; i < nLayers; i++) {
    const frac = i / (nLayers - 1);
    const layerY = botY - (botY - topY) * frac;
    const vFrac = frac; // linear profile for laminar flow
    const vLen = vFrac * 120;
    const col = `hsl(${220 - frac * 80}, 80%, ${40 + frac * 30}%)`;

    // Layer
    ctx.fillStyle = col + '40';
    ctx.fillRect(40, layerY - (botY - topY) / nLayers, W - 80, (botY - topY) / nLayers);

    // Velocity arrow
    arrow(ctx, W / 2 - 60, layerY - 4, W / 2 - 60 + vLen, layerY - 4, col, 1.5, 6);

    // Particles in layer
    for (let j = 0; j < 4; j++) {
      const px = 80 + j * 150 + ((t * vFrac * 60) % 160);
      glowCircle(ctx, px, layerY - 4, 3, col, 5);
    }
  }

  // Shear stress arrow
  arrow(ctx, 40, (topY + botY) / 2, 40, topY, '#f97316', 2.5, 10);
  label(ctx, 'τ = η(dv/dy)', 45, (topY + botY) / 2 - 15, '#f97316', 10);

  // Velocity profile curve
  ctx.save(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let i = 0; i <= 50; i++) {
    const y = botY - (botY - topY) * (i / 50);
    const vLen = (i / 50) * 120;
    ctx.lineTo(W / 2 - 60 + vLen, y);
  }
  ctx.stroke(); ctx.restore();
  label(ctx, 'Velocity\nprofile', W / 2 + 75, (topY + botY) / 2, '#fbbf24', 10);

  infoPanel(ctx, [
    '🌀 Viscosity',
    'τ = η × (dv/dy)',
    'Laminar (Couette) flow',
    'Linear velocity gradient',
    'η: dynamic viscosity',
  ], 10, 10, '#a78bfa');
}

// ── Doppler Effect ────────────────────────────────────────────────
function drawDoppler(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  src: { x: number; y: number; vx: number; waves: { x: number; y: number; r: number; born: number }[] },
  vars: Record<string, number>) {
  const v_sound = 340;
  const v_source = clamp(vars.source_speed ?? 60, 0, 300);
  const f0 = clamp(vars.frequency ?? 440, 100, 2000);

  src.x += v_source * dt * 0.1;
  if (src.x > W + 50) { src.x = -50; src.waves = []; }

  // Emit wave every N frames
  if (Math.floor(t * 30) % Math.max(1, Math.floor(20 * (v_sound / (v_sound + v_source)))) === 0) {
    src.waves.push({ x: src.x, y: src.y, r: 0, born: t });
  }

  // Expand waves
  src.waves.forEach(w => {
    w.r += v_sound * dt * 0.1;
  });
  src.waves = src.waves.filter(w => w.r < Math.max(W, H) + 100);

  // Draw waves
  src.waves.forEach(w => {
    const alpha = clamp(1 - w.r / 300, 0, 0.6);
    // Compressed front (observer ahead)
    ctx.save(); ctx.strokeStyle = `rgba(239,68,68,${alpha})`; ctx.lineWidth = 1.5; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.stroke(); ctx.restore();
  });

  // Source (car / airplane)
  ctx.save(); ctx.fillStyle = '#1d4ed8'; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(src.x, src.y, 16, 0, TAU); ctx.fill();
  ctx.restore();
  label(ctx, '🚗', src.x, src.y, 'transparent', 22, 'center');
  arrow(ctx, src.x, src.y - 25, src.x + 30, src.y - 25, '#fbbf24', 2, 8);

  // Observer ahead
  glowCircle(ctx, W - 60, src.y, 10, '#34d399', 16);
  label(ctx, '👂', W - 60, src.y, 'transparent', 20, 'center');

  // Observer behind
  glowCircle(ctx, 60, src.y, 10, '#f97316', 16);
  label(ctx, '👂', 60, src.y, 'transparent', 20, 'center');

  // Computed frequencies
  const f_ahead = f0 * v_sound / (v_sound - v_source);
  const f_behind = f0 * v_sound / (v_sound + v_source);
  label(ctx, `f_obs = ${f_ahead.toFixed(0)} Hz ↑`, W - 200, src.y - 30, '#34d399', 11);
  label(ctx, `f_obs = ${f_behind.toFixed(0)} Hz ↓`, 80, src.y - 30, '#f97316', 11);
  label(ctx, 'Compressed wavefronts →', W / 2 + 30, src.y + 40, '#ef4444', 10, 'center');
  label(ctx, '← Stretched wavefronts', W / 2 - 30, src.y + 55, '#f97316', 10, 'center');

  infoPanel(ctx, [
    '🔊 Doppler Effect',
    `f₀ = ${f0} Hz`,
    `v_s = ${v_source} m/s`,
    `f_ahead = ${f_ahead.toFixed(0)} Hz`,
    `f_behind = ${f_behind.toFixed(0)} Hz`,
  ], 10, 10, '#ef4444');
}

// ── Simple Machine (Lever) ────────────────────────────────────────
function drawSimpleMachine(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, vars: Record<string, number>) {
  const MA = clamp(vars.mechanical_advantage ?? 3, 1, 6);
  const pivot = clamp(vars.pivot_position ?? 0.25, 0.1, 0.9);
  const groundY = H - 60;
  const leverLeft = 60, leverRight = W - 60;
  const leverLen = leverRight - leverLeft;
  const pivotX = leverLeft + leverLen * pivot;
  const tilt = Math.sin(t * 0.8) * 0.18;
  const pivotY = groundY - 30;

  // Triangle fulcrum
  ctx.save(); ctx.fillStyle = '#475569';
  ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(pivotX - 20, groundY); ctx.lineTo(pivotX + 20, groundY); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Lever bar
  const leftEnd = [leverLeft, pivotY - (pivotX - leverLeft) * Math.tan(tilt)] as [number, number];
  const rightEnd = [leverRight, pivotY + (leverRight - pivotX) * Math.tan(tilt)] as [number, number];

  ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 8; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(leftEnd[0], leftEnd[1]); ctx.lineTo(rightEnd[0], rightEnd[1]); ctx.stroke();
  ctx.restore();

  // Force 1 (effort — small, long arm)
  const F1 = 50, F2 = F1 * MA;
  const arm1 = pivotX - leverLeft;
  const arm2 = leverRight - pivotX;
  arrow(ctx, leftEnd[0], leftEnd[1], leftEnd[0], leftEnd[1] - F1 - Math.sin(t * 2) * 10, '#60a5fa', 3, 12);
  label(ctx, `F₁=${F1}N`, leftEnd[0] + 10, leftEnd[1] - 40, '#60a5fa', 10);
  label(ctx, `d₁=${arm1.toFixed(0)}`, leftEnd[0] + 10, leftEnd[1] - 25, '#64748b', 9);

  // Force 2 (load)
  arrow(ctx, rightEnd[0], rightEnd[1], rightEnd[0], rightEnd[1] + F2 * 0.5, '#ef4444', 3, 12);
  label(ctx, `F₂=${F2.toFixed(0)}N`, rightEnd[0] - 60, rightEnd[1] + 25, '#ef4444', 10);
  label(ctx, `d₂=${arm2.toFixed(0)}`, rightEnd[0] - 60, rightEnd[1] + 38, '#64748b', 9);

  // Weights
  glowCircle(ctx, leftEnd[0], leftEnd[1] - F1 / 2 - 20, 12, '#3b82f6', 18);
  label(ctx, '↓', leftEnd[0], leftEnd[1] - 80, '#60a5fa', 12, 'center');
  glowCircle(ctx, rightEnd[0], rightEnd[1] + F2 * 0.25, 16, '#ef4444', 22);
  label(ctx, '↓', rightEnd[0], rightEnd[1] + 50, '#ef4444', 12, 'center');

  // Torque balance
  const tau1 = F1 * arm1;
  const tau2 = F2 * arm2;
  label(ctx, `τ₁ = F₁d₁ = ${tau1.toFixed(0)} N·m`, W / 2, groundY + 20, '#60a5fa', 10, 'center');
  label(ctx, `τ₂ = F₂d₂ = ${tau2.toFixed(0)} N·m`, W / 2, groundY + 35, '#ef4444', 10, 'center');

  infoPanel(ctx, [
    '⚖️ Lever (Simple Machine)',
    `MA = d₁/d₂ = ${MA}`,
    'F₁d₁ = F₂d₂',
    `F₁ = ${F1} N`,
    `F₂ = ${F2.toFixed(0)} N`,
  ], 10, 10, '#fbbf24');
}

// ── Density ───────────────────────────────────────────────────────
function drawDensity(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // Show different density materials side by side
  const items = [
    { lbl: 'Cork', density: 200, col: '#fbbf24', emoji: '🪵' },
    { lbl: 'Wood', density: 600, col: '#92400e', emoji: '🪵' },
    { lbl: 'Water', density: 1000, col: '#3b82f6', emoji: '💧' },
    { lbl: 'Iron', density: 7874, col: '#6b7280', emoji: '🔩' },
    { lbl: 'Gold', density: 19300, col: '#fbbf24', emoji: '🥇' },
  ];

  const containerX = 80, containerW = 110, containerH = 200;
  const waterLevel = H / 2 + 30;

  items.forEach((item, i) => {
    const cx9 = containerX + i * (containerW + 20);
    const floatFrac = clamp(item.density / 1000, 0, 1.5);
    const cubeH = 30;
    const cubeY = item.density < 1000
      ? waterLevel - cubeH * (1 - floatFrac) - 5
      : waterLevel + cubeH * 0.5;

    // Container
    ctx.save(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx9, H / 2 - 80); ctx.lineTo(cx9, waterLevel + containerH / 2);
    ctx.lineTo(cx9 + containerW, waterLevel + containerH / 2); ctx.lineTo(cx9 + containerW, H / 2 - 80); ctx.stroke();

    // Water
    ctx.fillStyle = 'rgba(37,99,235,0.45)';
    ctx.fillRect(cx9 + 2, waterLevel, containerW - 4, containerH / 2 - 2);
    ctx.restore();

    // Object cube
    ctx.save(); ctx.fillStyle = item.col; ctx.shadowColor = item.col; ctx.shadowBlur = 10;
    ctx.fillRect(cx9 + (containerW - 32) / 2, cubeY, 32, cubeH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(cx9 + (containerW - 32) / 2, cubeY, 32, cubeH);
    ctx.restore();

    label(ctx, item.lbl, cx9 + containerW / 2, H / 2 - 92, '#94a3b8', 9, 'center');
    label(ctx, `${item.density}`, cx9 + containerW / 2, waterLevel + containerH / 2 + 14, '#64748b', 8, 'center');
    label(ctx, 'kg/m³', cx9 + containerW / 2, waterLevel + containerH / 2 + 24, '#64748b', 7, 'center');
    label(ctx, item.density <= 1000 ? '↑ floats' : '↓ sinks', cx9 + containerW / 2, waterLevel + containerH / 2 + 36, item.density <= 1000 ? '#34d399' : '#ef4444', 8, 'center');
  });

  label(ctx, 'ρ = m/V  (kg/m³)', W / 2, 25, '#fbbf24', 14, 'center');
  label(ctx, 'Object floats when ρ_object < ρ_fluid', W / 2, 45, '#94a3b8', 10, 'center');
}

// ── Moment (Torque) ───────────────────────────────────────────────
function drawMoment(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, vars: Record<string, number>) {
  const F3 = clamp(vars.force ?? 20, 5, 100);
  const d = clamp(vars.distance ?? 0.5, 0.1, 2) * 100;
  const tau3 = F3 * d / 100;
  const pivotX = W / 2, pivotY = H / 2;

  // Wrench/arm
  const armAng = -Math.PI / 4 + Math.sin(t * 0.5) * 0.3;
  const armLen = 180;
  const endX = pivotX + armLen * Math.cos(armAng);
  const endY = pivotY + armLen * Math.sin(armAng);

  // Bolt (pivot)
  ctx.save(); ctx.fillStyle = '#475569'; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(pivotX, pivotY, 18, 0, TAU); ctx.fill();
  ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(pivotX, pivotY, 8, 0, TAU); ctx.fill();
  ctx.restore();

  // Arm
  ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 10; ctx.shadowColor = '#64748b'; ctx.shadowBlur = 6;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(endX, endY); ctx.stroke();
  ctx.restore();

  // Distance marker
  ctx.save(); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(pivotX + d, pivotY); ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, `d = ${(d / 100).toFixed(2)} m`, pivotX + d / 2, pivotY + 14, '#a78bfa', 10, 'center');
  ctx.restore();

  // Force arrow (perpendicular)
  const perpX = -Math.sin(armAng), perpY = Math.cos(armAng);
  arrow(ctx, endX, endY, endX + perpX * F3 * 0.8, endY + perpY * F3 * 0.8, '#ef4444', 3, 12);
  label(ctx, `F = ${F3} N`, endX + perpX * F3 * 0.8 + 8, endY + perpY * F3 * 0.8, '#ef4444', 10);

  // Torque arc
  ctx.save(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(pivotX, pivotY, 60, armAng - Math.PI / 3, armAng, false); ctx.stroke();
  label(ctx, `τ = ${tau3.toFixed(1)} N·m`, pivotX - 70, pivotY - 70, '#fbbf24', 11);
  ctx.restore();

  infoPanel(ctx, [
    '🔧 Moment (Torque)',
    'τ = r × F  (N·m)',
    `F = ${F3} N`,
    `d = ${(d / 100).toFixed(2)} m`,
    `τ = ${tau3.toFixed(2)} N·m`,
  ], 10, 10, '#fbbf24');
}

// ── Uniform Motion ────────────────────────────────────────────────
function drawUniformMotion(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, vars: Record<string, number>) {
  const v4 = clamp(vars.velocity ?? 5, 1, 20);
  const groundY = H - 70;
  const carX = (t * v4 * 8) % (W + 60) - 30;

  // Road
  ctx.fillStyle = '#1e293b'; ctx.fillRect(0, groundY, W, H - groundY);
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.setLineDash([30, 20]);
  ctx.beginPath(); ctx.moveTo(0, groundY + (H - groundY) / 2); ctx.lineTo(W, groundY + (H - groundY) / 2); ctx.stroke();
  ctx.setLineDash([]);

  // Distance markers
  for (let x = 0; x < W; x += 80) {
    label(ctx, `${Math.round(x * v4 / 80)}m`, x, groundY - 15, '#64748b', 9, 'center');
    ctx.save(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, groundY - 8); ctx.lineTo(x, groundY); ctx.stroke(); ctx.restore();
  }

  // Car
  ctx.save();
  ctx.fillStyle = '#1d4ed8'; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 16;
  roundRect(ctx, carX - 35, groundY - 36, 70, 30, 6); ctx.fill();
  ctx.fillStyle = '#93c5fd'; roundRect(ctx, carX - 22, groundY - 48, 44, 18, 4); ctx.fill();
  ctx.restore();
  // Wheels
  [carX - 20, carX + 20].forEach(wx => {
    ctx.save(); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(wx, groundY - 8, 10, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    // Spin
    glowLine(ctx, wx - 8 * Math.cos(t * v4), groundY - 8 - 8 * Math.sin(t * v4),
      wx + 8 * Math.cos(t * v4), groundY - 8 + 8 * Math.sin(t * v4), '#475569', 2, 0);
    ctx.restore();
  });

  // Velocity arrow
  arrow(ctx, carX + 40, groundY - 22, carX + 40 + v4 * 4, groundY - 22, '#34d399', 2.5, 10);
  label(ctx, `v = ${v4} m/s`, carX + 40 + v4 * 4 + 5, groundY - 22, '#34d399', 10);

  // x-t graph
  const gx = W - 200, gy = 20, gw = 180, gh = 100;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(ctx, gx, gy, gw, gh, 6); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
  label(ctx, 'x = vt (linear)', gx + gw / 2, gy + 12, '#94a3b8', 9, 'center');
  ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.shadowColor = '#34d399'; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(gx, gy + gh - 5);
  ctx.lineTo(gx + gw, gy + 10); ctx.stroke();
  // current point
  const dotT = (t * v4 * 8 % (W + 60)) / W;
  glowCircle(ctx, gx + clamp(dotT, 0, 1) * gw, gy + gh - 5 - clamp(dotT, 0, 1) * (gh - 15), 4, '#fbbf24', 8);
  ctx.restore();

  infoPanel(ctx, [
    '➡ Uniform Motion',
    'x = v·t  (a = 0)',
    `v = ${v4} m/s (constant)`,
    `x = ${(t * v4).toFixed(1)} m`,
    `t = ${t.toFixed(1)} s`,
  ], 10, 10, '#34d399');
}

// ── Uniform Acceleration ──────────────────────────────────────────
function drawUniformAcceleration(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number,
  ball: { y: number; vy: number; trail: { x: number; y: number }[] }, vars: Record<string, number>) {
  const a5 = clamp(vars.acceleration ?? 3, 0.5, 15);
  const v0 = clamp(vars.initial_velocity ?? 0, 0, 20);
  const groundY = H - 60;
  let carX2 = 60 + v0 * t * 8 + 0.5 * a5 * t * t * 3;
  if (carX2 > W + 50) carX2 = 60;

  // Road
  ctx.fillStyle = '#1e293b'; ctx.fillRect(0, groundY, W, H - groundY);

  // Velocity arrows along path (increasing)
  for (let i = 0; i < 5; i++) {
    const xi = 60 + i * 120;
    const vi = v0 + a5 * (i * 0.5);
    arrow(ctx, xi, groundY - 50, xi + vi * 5, groundY - 50, '#60a5fa', 1.5, 7);
    label(ctx, `v${i}`, xi, groundY - 62, '#64748b', 8, 'center');
  }

  // Car
  ctx.save(); ctx.fillStyle = '#d97706'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 14;
  roundRect(ctx, carX2 - 30, groundY - 34, 60, 28, 5); ctx.fill();
  ctx.restore();
  [carX2 - 16, carX2 + 16].forEach(wx => {
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(wx, groundY - 8, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
  });

  // v-t graph
  const gx = W - 200, gy = 20, gw = 185, gh = 110;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, gx, gy, gw, gh, 6); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
  label(ctx, 'v(t) = v₀ + at', gx + gw / 2, gy + 13, '#94a3b8', 9, 'center');
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(gx, gy + gh - 5 - (v0 / 20) * (gh - 20));
  const vEnd = v0 + a5 * 5;
  ctx.lineTo(gx + gw, gy + gh - 5 - clamp(vEnd / 20, 0, 1) * (gh - 20));
  ctx.stroke();
  // Shaded area (displacement)
  const vi = v0 + a5 * Math.min(t * 0.5, 5);
  const dotX = gx + clamp(t * 0.1, 0, 1) * gw;
  const dotY = gy + gh - 5 - clamp(vi / 20, 0, 1) * (gh - 20);
  glowCircle(ctx, dotX, dotY, 5, '#ef4444', 10);
  ctx.restore();

  infoPanel(ctx, [
    '🚀 Uniform Acceleration',
    'v = v₀ + at',
    's = v₀t + ½at²',
    `a = ${a5} m/s²`,
    `v₀ = ${v0} m/s`,
    `v = ${(v0 + a5 * t * 0.5).toFixed(1)} m/s`,
  ], 10, 10, '#fbbf24');
}
