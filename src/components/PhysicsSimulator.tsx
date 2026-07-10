import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, Zap, Activity, Target, Wind, Thermometer, Atom, Magnet, Waves, Eye, Camera } from 'lucide-react';

interface SimulationConfig {
  type: 'free-fall' | 'projectile' | 'pendulum' | 'wave' | 'circuit' | 'refraction' | 'spring' | 'collision' | 'magnetic' | 'gas';
  variables: Record<string, number>;
  onUpdate?: (data: { time: number; position: { x: number; y: number }; velocity?: number; acceleration?: number }) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  trail: { x: number; y: number }[];
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export default function PhysicsSimulator({ config, width = 600, height = 400 }: { config: SimulationConfig; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [trails, setTrails] = useState<TrailPoint[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [projectilePath, setProjectilePath] = useState<{ x: number; y: number }[]>([]);
  
  const g = 9.8;
  
  // Initialize particles based on simulation type
  const initParticles = useCallback(() => {
    const { type, variables } = config;
    const newParticles: Particle[] = [];
    
    switch (type) {
      case 'free-fall':
        newParticles.push({
          x: width / 2,
          y: 50,
          vx: 0,
          vy: 0,
          radius: 15,
          color: '#06b6d4',
          trail: []
        });
        break;
        
      case 'projectile':
        newParticles.push({
          x: 50,
          y: height - 50,
          vx: variables.velocity * Math.cos((variables.angle * Math.PI) / 180),
          vy: -variables.velocity * Math.sin((variables.angle * Math.PI) / 180),
          radius: 12,
          color: '#f59e0b',
          trail: []
        });
        break;
        
      case 'pendulum':
        const angleRad = (variables.angle * Math.PI) / 180;
        newParticles.push({
          x: width / 2 + Math.sin(angleRad) * 150,
          y: 50 + Math.cos(angleRad) * 150,
          vx: 0,
          vy: 0,
          radius: 10,
          color: '#8b5cf6',
          trail: []
        });
        break;
        
      case 'collision':
        newParticles.push({
          x: 100,
          y: height / 2,
          vx: variables.v1 || 10,
          vy: 0,
          radius: (variables.m1 || 10) * 2,
          color: '#3b82f6',
          trail: []
        });
        newParticles.push({
          x: width - 100,
          y: height / 2,
          vx: variables.v2 || -5,
          vy: 0,
          radius: (variables.m2 || 5) * 2,
          color: '#ef4444',
          trail: []
        });
        break;
        
      case 'wave':
        for (let i = 0; i < 20; i++) {
          newParticles.push({
            x: (i / 20) * width,
            y: height / 2,
            vx: 0,
            vy: 0,
            radius: 8,
            color: `hsl(${180 + i * 9}, 70%, 60%)`,
            trail: []
          });
        }
        break;
        
      case 'magnetic':
        for (let i = 0; i < 50; i++) {
          const angle = (i / 50) * Math.PI * 2;
          newParticles.push({
            x: width / 2 + Math.cos(angle) * 30,
            y: height / 2 + Math.sin(angle) * 30,
            vx: 0,
            vy: 0,
            radius: 5,
            color: '#10b981',
            trail: []
          });
        }
        break;
        
      case 'spring':
        newParticles.push({
          x: width / 2,
          y: 100,
          vx: 0,
          vy: 0,
          radius: 15,
          color: '#ec4899',
          trail: []
        });
        break;
        
      default:
        newParticles.push({
          x: width / 2,
          y: height / 2,
          vx: 5,
          vy: 3,
          radius: 20,
          color: '#06b6d4',
          trail: []
        });
    }
    
    setParticles(newParticles);
    setTrails([]);
    setProjectilePath([]);
    setTime(0);
  }, [config, width, height]);
  
  useEffect(() => {
    initParticles();
  }, [initParticles]);
  
  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;
    
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      
      setTime(prev => prev + deltaTime);
      
      setParticles(prev => {
        return prev.map(p => {
          let { x, y, vx, vy, trail } = p;
          
          switch (config.type) {
            case 'free-fall': {
              vy += g * deltaTime * 20;
              y += vy * deltaTime;
              x += vx * deltaTime;
              
              if (y > height - 30) {
                y = height - 30;
                vy = -vy * 0.6;
              }
              break;
            }
            
            case 'projectile': {
              const v0 = config.variables.velocity || 30;
              const angle = ((config.variables.angle || 45) * Math.PI) / 180;
              const t = time;
              
              x = 50 + v0 * Math.cos(angle) * t * 5;
              y = height - 50 - (v0 * Math.sin(angle) * t - 0.5 * g * t * t) * 5;
              
              if (y > height - 30) {
                y = height - 30;
              }
              
              setProjectilePath(prev => {
                const newPath = [...prev, { x, y }];
                return newPath.slice(-200);
              });
              break;
            }
            
            case 'pendulum': {
              const L = (config.variables.length || 1) * 150;
              const angle0 = ((config.variables.angle || 15) * Math.PI) / 180;
              const omega = Math.sqrt(g / (L / 150));
              const angle = angle0 * Math.cos(omega * time);
              
              x = width / 2 + Math.sin(angle) * L;
              y = 50 + Math.cos(angle) * L;
              
              const dAngle = -omega * angle0 * Math.sin(omega * time);
              const tangentX = Math.cos(angle);
              const tangentY = -Math.sin(angle);
              vx = dAngle * tangentX * L * 0.1;
              vy = dAngle * tangentY * L * 0.1;
              break;
            }
            
            case 'wave': {
              const frequency = config.variables.frequency || 2;
              const amplitude = config.variables.amplitude || 50;
              const waveLength = width / 5;
              
              x = p.x; // Keep original x
              y = height / 2 + Math.sin((x / waveLength) * 2 * Math.PI - time * frequency * 2) * amplitude;
              break;
            }
            
            case 'collision': {
              x += vx * deltaTime * 30;
              
              // Check for collision with other particle
              const other = prev.find(op => op !== p);
              if (other) {
                const dist = Math.sqrt((x - other.x) ** 2 + (y - other.y) ** 2);
                if (dist < p.radius + other.radius) {
                  // Elastic collision
                  const m1 = p.radius / 2;
                  const m2 = other.radius / 2;
                  const v1Final = ((m1 - m2) * vx + 2 * m2 * other.vx) / (m1 + m2);
                  const v2Final = ((m2 - m1) * other.vx + 2 * m1 * vx) / (m1 + m2);
                  vx = v1Final;
                  
                  // Update other particle
                  other.vx = v2Final;
                  other.x = x + v1Final * deltaTime * 30;
                }
              }
              
              // Bounce off walls
              if (x < p.radius || x > width - p.radius) {
                vx = -vx * 0.95;
                x = Math.max(p.radius, Math.min(width - p.radius, x));
              }
              break;
            }
            
            case 'spring': {
              const k = 0.5; // Spring constant
              const amplitude = config.variables.amplitude || 50;
              const freq = config.variables.frequency || 1;
              
              y = height / 2 + Math.sin(time * freq * 2 * Math.PI) * amplitude;
              vy = Math.cos(time * freq * 2 * Math.PI) * amplitude * freq * 2 * Math.PI;
              break;
            }
            
            case 'magnetic': {
              const B = config.variables.B || 0.5;
              const charge = config.variables.charge || 10;
              
              // Lorentz force: F = qvB (perpendicular to velocity)
              const speed = Math.sqrt(vx * vx + vy * vy) + 0.1;
              const force = charge * speed * B * 0.01;
              
              // Perpendicular direction
              const perpX = -vy / speed;
              const perpY = vx / speed;
              
              vx += perpX * force;
              vy += perpY * force;
              
              x += vx * deltaTime * 50;
              y += vy * deltaTime * 50;
              
              // Keep within bounds
              if (x < 0 || x > width) { vx = -vx; x = Math.max(0, Math.min(width, x)); }
              if (y < 0 || y > height) { vy = -vy; y = Math.max(0, Math.min(height, y)); }
              break;
            }
            
            default:
              x += vx * deltaTime * 20;
              y += vy * deltaTime * 20;
              
              if (x < 0 || x > width) vx = -vx;
              if (y < 0 || y > height) vy = -vy;
          }
          
          // Update trail
          trail = [...trail, { x, y }].slice(-50);
          
          return { ...p, x, y, vx, vy, trail };
        });
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, config, time, height, width]);
  
  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw based on simulation type
    switch (config.type) {
      case 'free-fall':
        // Ground
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, height - 30, width, 30);
        
        // Draw particle trail
        particles.forEach(p => {
          // Trail
          if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
              const alpha = i / p.trail.length;
              ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.5})`;
              ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }
            ctx.stroke();
          }
          
          // Particle with glow
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
          gradient.addColorStop(0, '#06b6d4');
          gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.5)');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
        
      case 'projectile':
        // Ground
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, height - 30, width, 30);
        
        // Draw path
        if (projectilePath.length > 1) {
          ctx.beginPath();
          ctx.moveTo(projectilePath[0].x, projectilePath[0].y);
          for (let i = 1; i < projectilePath.length; i++) {
            const alpha = i / projectilePath.length;
            ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.lineTo(projectilePath[i].x, projectilePath[i].y);
          }
          ctx.stroke();
        }
        
        // Draw particles
        particles.forEach(p => {
          // Glow
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
          gradient.addColorStop(0, '#f59e0b');
          gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.5)');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
        
      case 'pendulum':
        // Pivot point
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(width / 2, 50, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // String
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        particles.forEach(p => {
          ctx.beginPath();
          ctx.moveTo(width / 2, 50);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        });
        
        // Particles
        particles.forEach(p => {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
          gradient.addColorStop(0, '#8b5cf6');
          gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.5)');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#8b5cf6';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
        
      case 'wave':
        // Wave path
        ctx.beginPath();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        
        let first = true;
        particles.forEach(p => {
          if (first) {
            ctx.moveTo(p.x, p.y);
            first = false;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        });
        ctx.stroke();
        
        // Particles
        particles.forEach((p, i) => {
          const hue = 180 + i * 9;
          ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Glow
          ctx.shadowColor = `hsl(${hue}, 70%, 60%)`;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
        break;
        
      case 'collision':
        particles.forEach(p => {
          // Trail
          if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
              const alpha = i / p.trail.length * 0.3;
              ctx.strokeStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
              ctx.lineWidth = 1;
              ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }
            ctx.stroke();
          }
          
          // Particle
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(1, p.color.replace(')', ', 0.5)').replace('rgb', 'rgba').replace('#', ''));
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Border
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
        break;
        
      case 'magnetic':
        // Magnetic field lines
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, 50 + i * 30, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Center magnet
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(width / 2 - 40, height / 2 - 10, 30, 20);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(width / 2 + 10, height / 2 - 10, 30, 20);
        
        // Particles with motion blur
        particles.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
        
      case 'spring':
        // Spring coil
        const amplitude = config.variables.amplitude || 50;
        const baseY = 50;
        const springY = height / 2 + Math.sin(time * (config.variables.frequency || 1) * 2 * Math.PI) * amplitude;
        
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(width / 2, baseY);
        const coils = 8;
        const springHeight = springY - baseY;
        for (let i = 0; i <= coils * 10; i++) {
          const y = baseY + (i / (coils * 10)) * springHeight;
          const x = width / 2 + (i % 2 === 0 ? -15 : 15);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width / 2, springY);
        ctx.stroke();
        
        // Support
        ctx.fillStyle = '#64748b';
        ctx.fillRect(width / 2 - 30, baseY - 10, 60, 10);
        
        // Mass
        particles.forEach(p => {
          const gradient = ctx.createRadialGradient(p.x, p.y - 15, 0, p.x, p.y - 15, 30);
          gradient.addColorStop(0, '#ec4899');
          gradient.addColorStop(0.5, 'rgba(236, 72, 153, 0.5)');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(p.x - 30, p.y - 30, 60, 60);
          
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(p.x - 20, p.y - 5, 40, 25);
        });
        break;
        
      default:
        particles.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        });
    }
    
    // Draw info overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(10, 10, 150, 60);
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
    ctx.strokeRect(10, 10, 150, 60);
    
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px monospace';
    ctx.fillText(`الزمن: ${time.toFixed(2)}s`, 20, 30);
    
    if (particles[0]) {
      const p = particles[0];
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      ctx.fillText(`السرعة: ${speed.toFixed(2)}`, 20, 50);
    }
    
  }, [particles, projectilePath, config, time, width, height]);
  
  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-2 bg-gradient-to-b from-slate-900/90 to-transparent z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] text-slate-300 font-mono">
              {time.toFixed(2)}s
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={initParticles}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="إعادة تعيين"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1.5 rounded-lg transition ${
              isPlaying 
                ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title={isPlaying ? 'إيقاف' : 'تشغيل'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full cursor-pointer"
        onClick={() => setIsPlaying(!isPlaying)}
      />
      
      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-slate-900/90 to-transparent">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            {config.type === 'free-fall' && <><Zap className="w-3 h-3" /> السقوط الحر</>}
            {config.type === 'projectile' && <><Target className="w-3 h-3" /> الحركة القذفية</>}
            {config.type === 'pendulum' && <><Activity className="w-3 h-3" /> البندول</>}
            {config.type === 'wave' && <><Waves className="w-3 h-3" /> الأمواج</>}
            {config.type === 'collision' && <><Zap className="w-3 h-3" /> التصادمات</>}
            {config.type === 'magnetic' && <><Magnet className="w-3 h-3" /> المغناطيسية</>}
            {config.type === 'spring' && <><Activity className="w-3 h-3" /> النابض</>}
          </span>
          <span>انقر للتشغيل/الإيقاف</span>
        </div>
      </div>
    </div>
  );
}
