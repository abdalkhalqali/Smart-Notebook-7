import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, Zap, Activity, Target, 
  Atom, Magnet, Waves, Timer, CircleDot, Radio
} from 'lucide-react';

// ============================================================
// 🎯 Physics Simulator V2 - World Class Physics Simulation
// ============================================================

// Types
interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  energy?: number;
  wavelength?: number;
  type: 'electron' | 'proton' | 'neutron' | 'photon' | 'nucleus' | 'atom' | 'molecule';
  trail?: { x: number; y: number; age: number }[];
}

interface SimulationState {
  particles: Particle[];
  time: number;
  isPlaying: boolean;
  info: { [key: string]: number | string };
}

interface SimulationConfig {
  type: string;
  title: string;
  description: string;
  variables: {
    name: string;
    label: string;
    min: number;
    max: number;
    default: number;
    unit?: string;
  }[];
  color: string;
  icon: string;
}

// Color palettes for different wavelengths
const WAVELENGTH_COLORS: Record<number, string> = {
  400: '#8B00FF', // Violet
  450: '#0000FF', // Blue
  500: '#00FF00', // Green
  550: '#FFFF00', // Yellow
  600: '#FF7F00', // Orange
  650: '#FF0000', // Red
  700: '#8B0000', // Dark Red
};

const getWavelengthColor = (wavelength: number): string => {
  // Visible spectrum: 400-700nm
  if (wavelength < 400) return '#8B00FF';
  if (wavelength > 700) return '#FF0000';
  
  // Interpolate colors
  const colors = [
    { nm: 400, r: 139, g: 0, b: 255 },    // Violet
    { nm: 450, r: 0, g: 0, b: 255 },       // Blue
    { nm: 500, r: 0, g: 255, b: 0 },       // Green
    { nm: 550, r: 255, g: 255, b: 0 },      // Yellow
    { nm: 600, r: 255, g: 127, b: 0 },     // Orange
    { nm: 650, r: 255, g: 0, b: 0 },       // Red
    { nm: 700, r: 139, g: 0, b: 0 },      // Dark Red
  ];
  
  for (let i = 0; i < colors.length - 1; i++) {
    if (wavelength >= colors[i].nm && wavelength <= colors[i + 1].nm) {
      const t = (wavelength - colors[i].nm) / (colors[i + 1].nm - colors[i].nm);
      const r = Math.round(colors[i].r + t * (colors[i + 1].r - colors[i].r));
      const g = Math.round(colors[i].g + t * (colors[i + 1].g - colors[i].g));
      const b = Math.round(colors[i].b + t * (colors[i + 1].b - colors[i].b));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return '#FF0000';
};

// ============================================================
// 🧪 Photoelectric Effect Simulation
// ============================================================
function PhotoelectricSimulation({ 
  config, 
  width, 
  height 
}: { 
  config: Record<string, number>;
  width: number;
  height: number;
}) {
  const [state, setState] = useState<SimulationState>({
    particles: [],
    time: 0,
    isPlaying: false,
    info: {}
  });
  
  const animationRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Constants
  const h = 6.626e-34; // Planck's constant
  const c = 3e8; // Speed of light
  const e = 1.602e-19; // Electron charge
  
  // Calculate photon energy: E = hf = hc/λ
  const wavelength = config.wavelength || 550; // nm
  const frequency = c / (wavelength * 1e-9);
  const photonEnergy = (h * frequency) / e; // in eV
  
  // Work function (depends on metal)
  const workFunction = config.workFunction || 4.5; // eV (typically 2-6 eV)
  
  // Kinetic energy of emitted electrons
  const kineticEnergy = Math.max(0, photonEnergy - workFunction);
  
  // Determine if effect occurs
  const effectOccurs = photonEnergy >= workFunction;
  
  // Initialize photons
  const initPhotons = useCallback(() => {
    const photons: Particle[] = [];
    const photonCount = 15;
    
    for (let i = 0; i < photonCount; i++) {
      photons.push({
        id: `photon-${i}`,
        x: width / 2 - 100 + Math.random() * 50,
        y: 50 + Math.random() * 30,
        vx: 2 + Math.random() * 2,
        vy: 1 + Math.random(),
        radius: 6,
        color: getWavelengthColor(wavelength),
        wavelength: wavelength,
        energy: photonEnergy,
        type: 'photon',
        trail: []
      });
    }
    
    return photons;
  }, [width, wavelength]);
  
  // Animation loop
  useEffect(() => {
    if (!state.isPlaying) return;
    
    let lastTime = performance.now();
    
    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = Math.min((currentTime - lastTime) / 16, 2);
      lastTime = currentTime;
      
      setState(prev => {
        const newParticles = prev.particles.map(p => {
          // Update trail
          const newTrail = [...(p.trail || []), { x: p.x, y: p.y, age: 0 }]
            .map(t => ({ ...t, age: t.age + 1 }))
            .filter(t => t.age < 30);
          
          // Photon moving down
          if (p.type === 'photon' && p.y < height - 100) {
            return {
              ...p,
              y: p.y + p.vy * deltaTime * 3,
              trail: newTrail
            };
          }
          
          // Photon hits metal surface
          if (p.type === 'photon' && p.y >= height - 100 && p.y < height - 80) {
            // Emit electron if photon energy > work function
            if (effectOccurs) {
              return {
                ...p,
                y: height - 100,
                vy: -Math.sqrt(kineticEnergy) * 0.5 + Math.random() * 0.5,
                vx: (Math.random() - 0.5) * 4,
                color: '#00FFFF',
                type: 'electron',
                radius: 4,
                energy: kineticEnergy
              };
            } else {
              // Photon absorbed but no electron emitted
              return {
                ...p,
                y: height - 100,
                vy: 0,
                vx: 0,
                color: '#666666',
                radius: 4
              };
            }
          }
          
          // Electron moving up
          if (p.type === 'electron') {
            return {
              ...p,
              y: Math.max(50, p.y + p.vy * deltaTime * 2),
              x: p.x + p.vx * deltaTime,
              vy: p.vy - 0.02 * deltaTime, // Gravity effect
              trail: newTrail
            };
          }
          
          return { ...p, trail: newTrail };
        });
        
        return {
          ...prev,
          particles: newParticles,
          time: prev.time + deltaTime * 0.016
        };
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationRef.current);
  }, [state.isPlaying, effectOccurs, kineticEnergy, height]);
  
  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw background grid
    ctx.strokeStyle = 'rgba(50, 50, 80, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw metal surface
    const gradient = ctx.createLinearGradient(0, height - 100, 0, height);
    gradient.addColorStop(0, '#4a5568');
    gradient.addColorStop(0.5, '#718096');
    gradient.addColorStop(1, '#2d3748');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - 100, width, 100);
    
    // Metal surface shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, height - 100, width, 5);
    
    // Draw particles
    state.particles.forEach(p => {
      // Draw trail
      if (p.trail && p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          const alpha = 1 - p.trail[i].age / 30;
          ctx.strokeStyle = p.color.replace(')', `, ${alpha * 0.5})`).replace('rgb', 'rgba');
          ctx.lineWidth = 2;
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        ctx.stroke();
      }
      
      // Glow effect
      const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
      glowGradient.addColorStop(0, p.color);
      glowGradient.addColorStop(0.3, p.color + '80');
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Particle
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Label
      if (p.type === 'photon') {
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText('γ', p.x - 4, p.y + 3);
      } else if (p.type === 'electron') {
        ctx.fillStyle = '#00ffff';
        ctx.font = '10px monospace';
        ctx.fillText('e⁻', p.x - 6, p.y + 3);
      }
    });
    
    // ═══════════════════════════════════════════════════════════
    // 🎯 لوحة المعلومات الشاملة للمتغيرات الفيزيائية
    // ═══════════════════════════════════════════════════════════
    
    // Panel 1: Input Variables (Left)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(10, 10, 200, 160);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 200, 160);
    
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('📥 المدخلات', 20, 28);
    
    ctx.font = '11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`الطول الموجي: λ = ${wavelength} nm`, 20, 50);
    
    // Show color indicator
    ctx.fillStyle = getWavelengthColor(wavelength);
    ctx.beginPath();
    ctx.arc(195, 46, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`دالة الشغل: φ = ${workFunction.toFixed(2)} eV`, 20, 70);
    
    // Panel 2: Calculated Values (Middle)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(220, 10, 220, 160);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.strokeRect(220, 10, 220, 160);
    
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('📐 القيم المحسوبة', 230, 28);
    
    ctx.font = '11px monospace';
    ctx.fillStyle = '#86efac';
    
    // Frequency (f = c/λ)
    const fDisplay = (frequency / 1e14).toFixed(3);
    ctx.fillText(`التردد: f = ${fDisplay} × 10¹⁴ Hz`, 230, 50);
    
    // Photon Energy (E = hf = hc/λ)
    ctx.fillText(`طاقة الفوتون: E = ${photonEnergy.toFixed(3)} eV`, 230, 70);
    
    // Threshold frequency
    const thresholdFreq = (workFunction * e) / h;
    const thresholdWavelength = (h * c) / (workFunction * e);
    ctx.fillText(`التردد الحرج: f₀ = ${(thresholdFreq/1e14).toFixed(3)} × 10¹⁴ Hz`, 230, 90);
    ctx.fillText(`الطول الموجي الحرج: λ₀ = ${thresholdWavelength.toFixed(0)} nm`, 230, 110);
    
    // Kinetic Energy
    ctx.fillStyle = effectOccurs ? '#4ade80' : '#ef4444';
    ctx.fillText(`KE_max = ${kineticEnergy.toFixed(3)} eV`, 230, 130);
    
    // Status indicator
    ctx.fillStyle = effectOccurs ? '#22c55e' : '#ef4444';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(effectOccurs ? '✅ تأثير كهروضوئي ✓' : '❌ لا يوجد تأثير', 230, 150);
    
    // Panel 3: Physics Equations (Right)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(450, 10, 160, 160);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(450, 10, 160, 160);
    
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('📝 المعادلات', 460, 28);
    
    ctx.font = '10px monospace';
    ctx.fillStyle = '#fcd34d';
    ctx.fillText('E = hf = hc/λ', 460, 50);
    ctx.fillText('KE = hf - φ', 460, 70);
    ctx.fillText('f₀ = φ/h', 460, 90);
    ctx.fillText('λ₀ = hc/φ', 460, 110);
    
    // Visual comparison bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(460, 125, 140, 20);
    
    // Energy comparison
    const barWidth = 140;
    const photonBar = Math.min((photonEnergy / 10) * barWidth, barWidth);
    const workBar = Math.min((workFunction / 10) * barWidth, barWidth);
    
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(460, 125, photonBar, 8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(460, 137, workBar, 8);
    
    ctx.font = '8px sans-serif';
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Eγ', 465, 132);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('φ', 465, 144);
    
    // Result indicator below canvas
    if (effectOccurs) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`✅ KE_electron = ${kineticEnergy.toFixed(3)} eV | vf = √(2KE/m)`, width / 2 - 100, height - 10);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`❌ لا يوجد تأثير كهروضوئي (hf < φ)`, width / 2 - 120, height - 10);
    }
    
  }, [state.particles, width, height, wavelength, frequency, photonEnergy, workFunction, effectOccurs, kineticEnergy, state.time, state.isPlaying]);
  
  // Start/reset
  const start = () => setState(prev => ({ 
    ...prev, 
    isPlaying: !prev.isPlaying,
    particles: prev.particles.length === 0 ? initPhotons() : prev.particles
  }));
  
  const reset = () => {
    setState({
      particles: [],
      time: 0,
      isPlaying: false,
      info: {}
    });
  };
  
  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-xl cursor-pointer"
        onClick={start}
      />
      
      {/* Controls */}
      <div className="absolute top-2 right-2 flex gap-2">
        <button
          onClick={start}
          className={`p-2 rounded-lg transition ${
            state.isPlaying ? 'bg-amber-600' : 'bg-emerald-600'
          } hover:opacity-80`}
        >
          {state.isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
        </button>
        <button onClick={reset} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition">
          <RotateCcw className="w-4 h-4 text-white" />
        </button>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-black/70 rounded-lg p-2 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getWavelengthColor(wavelength) }} />
            <span className="text-slate-300">فوتون (γ)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-cyan-400" />
            <span className="text-slate-300">إلكترون (e⁻)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ⚛️ Bohr Model Simulation
// ============================================================
function BohrModelSimulation({ 
  config, 
  width, 
  height 
}: { 
  config: Record<string, number>;
  width: number;
  height: number;
}) {
  const [state, setState] = useState<{
    electrons: Particle[];
    time: number;
    isPlaying: boolean;
    selectedLevel: number;
  }>({
    electrons: [],
    time: 0,
    isPlaying: false,
    selectedLevel: 1
  });
  
  const animationRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const n1 = config.n1 || 2;
  const n2 = config.n2 || 1;
  
  // Energy levels: En = -13.6 / n² eV
  const getEnergy = (n: number) => -13.6 / (n * n);
  const E1 = getEnergy(n1);
  const E2 = getEnergy(n2);
  const deltaE = E2 - E1;
  
  // Wavelength of emitted/absorbed photon
  const wavelength = deltaE > 0 ? (1240 / Math.abs(deltaE)) : 0;
  
  const initElectrons = useCallback(() => {
    const electrons: Particle[] = [];
    const maxLevel = 5;
    
    for (let n = 1; n <= maxLevel; n++) {
      const radius = n * 35;
      const electronCount = n <= 3 ? n * 2 : Math.floor(n * 1.5);
      
      for (let i = 0; i < electronCount; i++) {
        const angle = (i / electronCount) * 2 * Math.PI;
        electrons.push({
          id: `e-${n}-${i}`,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          radius: 8,
          color: n === n1 ? '#22c55e' : n === n2 ? '#ef4444' : '#60a5fa',
          energy: getEnergy(n),
          type: 'electron',
          trail: []
        });
      }
    }
    
    return electrons;
  }, [width, height]);
  
  useEffect(() => {
    if (!state.isPlaying) return;
    
    const animate = () => {
      setState(prev => ({
        ...prev,
        time: prev.time + 0.016,
        electrons: prev.electrons.map(e => {
          const n = Math.round(Math.sqrt(-13.6 / e.energy!));
          const targetRadius = n * 35;
          const currentX = e.x - width / 2;
          const currentY = e.y - height / 2;
          const currentRadius = Math.sqrt(currentX * currentX + currentY * currentY);
          
          if (Math.abs(currentRadius - targetRadius) > 1) {
            const angle = Math.atan2(currentY, currentX);
            const newRadius = currentRadius + (targetRadius - currentRadius) * 0.05;
            return {
              ...e,
              x: width / 2 + Math.cos(angle) * newRadius,
              y: height / 2 + Math.sin(angle) * newRadius
            };
          }
          
          const speed = 0.02 / n;
          const currentAngle = Math.atan2(currentY, currentX);
          const newAngle = currentAngle + speed;
          
          return {
            ...e,
            x: width / 2 + Math.cos(newAngle) * targetRadius,
            y: height / 2 + Math.sin(newAngle) * targetRadius
          };
        })
      }));
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [state.isPlaying, width, height]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);
    
    const cx = width / 2;
    const cy = height / 2;
    
    // Draw orbital rings
    for (let n = 1; n <= 5; n++) {
      ctx.beginPath();
      ctx.arc(cx, cy, n * 35, 0, Math.PI * 2);
      ctx.strokeStyle = n === n1 ? '#22c55e' : n === n2 ? '#ef4444' : 'rgba(100, 150, 255, 0.3)';
      ctx.lineWidth = n === n1 || n === n2 ? 2 : 1;
      ctx.stroke();
      
      // Level label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`n=${n}`, cx + n * 35 + 5, cy + 3);
    }
    
    // Nucleus
    const nucleusGradient = ctx.createRadialGradient(cx - 5, cy - 5, 0, cx, cy, 20);
    nucleusGradient.addColorStop(0, '#ff6b6b');
    nucleusGradient.addColorStop(0.5, '#c92a2a');
    nucleusGradient.addColorStop(1, '#7c1d1d');
    ctx.fillStyle = nucleusGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Nucleus label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('+Z', cx - 6, cy + 4);
    
    // Draw electrons
    state.electrons.forEach(e => {
      const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius * 2);
      glow.addColorStop(0, e.color);
      glow.addColorStop(0.5, e.color + '60');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius * 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.font = '8px monospace';
      ctx.fillText('e⁻', e.x - 5, e.y + 3);
    });
    
    // Photon emission/absorption arrow
    if (deltaE !== 0) {
      const photonWavelength = wavelength > 0 ? wavelength : 500;
      ctx.strokeStyle = getWavelengthColor(photonWavelength);
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(cx - 100, cy);
      ctx.lineTo(cx + 100, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Arrow head
      ctx.beginPath();
      ctx.moveTo(cx + 100, cy);
      ctx.lineTo(cx + 90, cy - 8);
      ctx.lineTo(cx + 90, cy + 8);
      ctx.closePath();
      ctx.fillStyle = getWavelengthColor(photonWavelength);
      ctx.fill();
      
      // Photon label
      ctx.fillStyle = getWavelengthColor(photonWavelength);
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`λ = ${wavelength.toFixed(0)} nm`, cx - 40, cy - 15);
    }
    
    // Info panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 200, 100);
    ctx.strokeStyle = '#4a5568';
    ctx.strokeRect(10, 10, 200, 100);
    
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('⚛️ نموذج بور', 20, 30);
    
    ctx.font = '11px monospace';
    ctx.fillStyle = '#22c55e';
    ctx.fillText(`E₁ = ${E1.toFixed(2)} eV (n=${n1})`, 20, 50);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`E₂ = ${E2.toFixed(2)} eV (n=${n2})`, 20, 70);
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(`ΔE = ${deltaE.toFixed(2)} eV`, 20, 90);
    
  }, [state.electrons, width, height, n1, n2, E1, E2, deltaE, wavelength]);
  
  const start = () => setState(prev => ({ 
    ...prev, 
    isPlaying: !prev.isPlaying,
    electrons: prev.electrons.length === 0 ? initElectrons() : prev.electrons
  }));
  
  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-xl cursor-pointer"
        onClick={start}
      />
      
      <div className="absolute top-2 right-2 flex gap-2">
        <button
          onClick={start}
          className={`p-2 rounded-lg transition ${state.isPlaying ? 'bg-amber-600' : 'bg-emerald-600'}`}
        >
          {state.isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
        </button>
        <button onClick={() => setState(s => ({ ...s, electrons: [], time: 0 }))} className="p-2 bg-slate-700 rounded-lg">
          <RotateCcw className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ☢️ Radioactive Decay Simulation
// ============================================================
function RadioactiveDecaySimulation({ 
  config, 
  width, 
  height 
}: { 
  config: Record<string, number>;
  width: number;
  height: number;
}) {
  const [state, setState] = useState<{
    nuclei: Particle[];
    decayedNuclei: Particle[];
    time: number;
    isPlaying: boolean;
    decayCount: number;
  }>({
    nuclei: [],
    decayedNuclei: [],
    time: 0,
    isPlaying: false,
    decayCount: 0
  });
  
  const animationRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const initialCount = config.initialCount || 50;
  const halfLife = config.halfLife || 5; // seconds
  const decayConstant = Math.log(2) / halfLife;
  
  // Initialize nuclei
  const initNuclei = useCallback(() => {
    const nuclei: Particle[] = [];
    for (let i = 0; i < initialCount; i++) {
      nuclei.push({
        id: `nucleus-${i}`,
        x: 100 + Math.random() * (width - 200),
        y: 100 + Math.random() * (height - 200),
        vx: 0,
        vy: 0,
        radius: 15,
        color: '#8b5cf6',
        type: 'nucleus'
      });
    }
    return nuclei;
  }, [initialCount, width, height]);
  
  useEffect(() => {
    if (!state.isPlaying) return;
    
    let lastTime = performance.now();
    
    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      setState(prev => {
        // Check for decay
        const newDecayed: Particle[] = [];
        const survivors: Particle[] = [];
        
        prev.nuclei.forEach(nucleus => {
          const decayProbability = 1 - Math.exp(-decayConstant * deltaTime);
          if (Math.random() < decayProbability) {
            // Decay!
            newDecayed.push({
              ...nucleus,
              color: '#ef4444',
              radius: 8,
              vx: (Math.random() - 0.5) * 100,
              vy: (Math.random() - 0.5) * 100
            });
          } else {
            survivors.push(nucleus);
          }
        });
        
        // Update decayed particles (radiation emission)
        const updatedDecayed = prev.decayedNuclei.map(p => ({
          ...p,
          x: p.x + p.vx * deltaTime,
          y: p.y + p.vy * deltaTime,
          radius: Math.max(2, p.radius - deltaTime * 2),
          vx: p.vx * 0.98,
          vy: p.vy * 0.98
        })).filter(p => p.radius > 2);
        
        return {
          ...prev,
          nuclei: survivors,
          decayedNuclei: [...updatedDecayed, ...newDecayed],
          time: prev.time + deltaTime,
          decayCount: prev.decayCount + newDecayed.length
        };
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [state.isPlaying, decayConstant]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw background radiation effect
    state.decayedNuclei.forEach(p => {
      // Radiation glow
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 30);
      glow.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - 30, p.y - 30, 60, 60);
      
      // Radiation particles
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw stable nuclei
    state.nuclei.forEach(nucleus => {
      // Glow
      const glow = ctx.createRadialGradient(nucleus.x, nucleus.y, 0, nucleus.x, nucleus.y, nucleus.radius * 2);
      glow.addColorStop(0, '#8b5cf6');
      glow.addColorStop(0.5, 'rgba(139, 92, 246, 0.5)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(nucleus.x, nucleus.y, nucleus.radius * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Nucleus
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(nucleus.x, nucleus.y, nucleus.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(nucleus.x - 5, nucleus.y - 5, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Info panel
    const remaining = state.nuclei.length;
    const total = initialCount;
    const percentage = (remaining / total) * 100;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 220, 130);
    ctx.strokeStyle = '#4a5568';
    ctx.strokeRect(10, 10, 220, 130);
    
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('☢️ التحلل الإشعاعي', 20, 30);
    
    ctx.font = '11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`N = ${remaining} / ${total} ذرة`, 20, 55);
    ctx.fillText(`t½ = ${halfLife} ثانية`, 20, 75);
    ctx.fillText(`λ = ${decayConstant.toFixed(3)} s⁻¹`, 20, 95);
    
    // Progress bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, 105, 180, 15);
    ctx.fillStyle = percentage > 50 ? '#22c55e' : percentage > 25 ? '#eab308' : '#ef4444';
    ctx.fillRect(20, 105, 180 * (percentage / 100), 15);
    
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${percentage.toFixed(1)}% متبقي`, 90, 117);
    
  }, [state, width, height, initialCount, halfLife, decayConstant]);
  
  const start = () => setState(prev => ({ 
    ...prev, 
    isPlaying: !prev.isPlaying,
    nuclei: prev.nuclei.length === 0 ? initNuclei() : prev.nuclei
  }));
  
  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-xl cursor-pointer"
        onClick={start}
      />
      
      <div className="absolute top-2 right-2 flex gap-2">
        <button
          onClick={start}
          className={`p-2 rounded-lg transition ${state.isPlaying ? 'bg-amber-600' : 'bg-emerald-600'}`}
        >
          {state.isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
        </button>
        <button onClick={() => setState(s => ({ ...s, nuclei: [], decayedNuclei: [], time: 0, decayCount: 0 }))} className="p-2 bg-slate-700 rounded-lg">
          <RotateCcw className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 🌊 Wave Simulation (General)
// ============================================================
function WaveSimulation({ 
  config, 
  width, 
  height 
}: { 
  config: Record<string, number>;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState({
    time: 0,
    isPlaying: false
  });
  
  const animationRef = useRef<number>(0);
  
  const frequency = config.frequency || 2;
  const amplitude = config.amplitude || 50;
  const wavelength = config.wavelength || 100;
  
  useEffect(() => {
    if (!state.isPlaying) return;
    
    let lastTime = performance.now();
    
    const animate = () => {
      setState(prev => ({
        ...prev,
        time: prev.time + 0.016
      }));
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [state.isPlaying]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = 'rgba(50, 50, 80, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    const centerY = height / 2;
    
    // Draw wave
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    
    for (let x = 0; x < width; x++) {
      const y = centerY + Math.sin((x / wavelength) * 2 * Math.PI - state.time * frequency * 2) * amplitude;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Particles on wave
    for (let i = 0; i < 20; i++) {
      const x = (i / 20) * width;
      const y = centerY + Math.sin((x / wavelength) * 2 * Math.PI - state.time * frequency * 2) * amplitude;
      
      // Glow
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 10);
      glow.addColorStop(0, '#06b6d4');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Particle
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Info panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 180, 80);
    ctx.strokeStyle = '#4a5568';
    ctx.strokeRect(10, 10, 180, 80);
    
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('🌊 الموجة', 20, 30);
    
    ctx.font = '11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`f = ${frequency} Hz`, 20, 50);
    ctx.fillText(`A = ${amplitude} m`, 20, 65);
    ctx.fillText(`λ = ${wavelength} m`, 20, 80);
    
  }, [state.time, width, height, frequency, amplitude, wavelength]);
  
  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-xl cursor-pointer"
        onClick={() => setState(s => ({ ...s, isPlaying: !s.isPlaying }))}
      />
      
      <div className="absolute top-2 right-2">
        <button
          onClick={() => setState(s => ({ ...s, isPlaying: !s.isPlaying }))}
          className={`p-2 rounded-lg transition ${state.isPlaying ? 'bg-amber-600' : 'bg-emerald-600'}`}
        >
          {state.isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 🎯 Main Physics Simulator Component
// ============================================================
export default function PhysicsSimulatorV2({ 
  experimentType, 
  variables = {}, 
  width = 600, 
  height = 400 
}: { 
  experimentType: string;
  variables?: Record<string, number>;
  width?: number;
  height?: number;
}) {
  // Render appropriate simulation based on experiment type
  switch (experimentType) {
    case 'photoelectric':
      return <PhotoelectricSimulation config={variables} width={width} height={height} />;
    
    case 'bohr-model':
      return <BohrModelSimulation config={variables} width={width} height={height} />;
    
    case 'radioactivity':
      return <RadioactiveDecaySimulation config={variables} width={width} height={height} />;
    
    case 'wave':
    case 'waves':
    case 'sound-waves':
    case 'standing-waves':
    case 'interference':
    case 'diffraction':
      return <WaveSimulation config={variables} width={width} height={height} />;
    
    default:
      return <WaveSimulation config={variables} width={width} height={height} />;
  }
}
