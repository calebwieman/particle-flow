'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

interface Star {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface Settings {
  particleCount: number;
  mouseRadius: number;
  mouseForce: number;
  friction: number;
  gravity: number;
}

const COLOR_PRESETS = {
  cosmic: { name: 'Cosmic', colors: ['#ffffff', '#e0e0ff', '#a0a0ff', '#ff80c0', '#00ffff'] },
  ocean: { name: 'Ocean', colors: ['#00d9ff', '#0099cc', '#00ffcc', '#66ffff'] },
  sunset: { name: 'Sunset', colors: ['#ff6b35', '#f7c59f', '#efa00b', '#d62246'] },
  neon: { name: 'Neon', colors: ['#ff00ff', '#00ffff', '#ff00ff', '#ffff00'] },
  aurora: { name: 'Aurora', colors: ['#00ff87', '#60efff', '#ff00ff', '#7b2dff'] },
  fire: { name: 'Fire', colors: ['#ff4500', '#ff8c00', '#ffd700', '#ff6347'] },
};

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const smokeRef = useRef<SmokeParticle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, pressed: false, prevX: 0, prevY: 0 });
  const animationRef = useRef<number>();
  const frameRef = useRef<number>(0);
  
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    particleCount: 150,
    mouseRadius: 150,
    mouseForce: 2,
    friction: 0.97,
    gravity: 0,
  });
  
  const [colorPreset, setColorPreset] = useState('cosmic');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const colors = COLOR_PRESETS[colorPreset as keyof typeof COLOR_PRESETS]?.colors || COLOR_PRESETS.cosmic.colors;

  const createParticle = useCallback((width: number, height: number): Particle => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 1.5,
    vy: (Math.random() - 0.5) * 1.5,
    size: Math.random() * 4 + 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    alpha: Math.random() * 0.6 + 0.4,
  }), [colors]);

  const createStar = useCallback((width: number, height: number): Star => ({
    x: Math.random() * width,
    y: Math.random() * height,
    baseX: 0,
    baseY: 0,
    size: Math.random() * 2 + 1,
    alpha: Math.random() * 0.6 + 0.4,
    twinkleSpeed: Math.random() * 0.03 + 0.01,
    twinklePhase: Math.random() * Math.PI * 2,
  }), []);

  const createSmoke = useCallback((width: number, height: number): SmokeParticle => {
    const side = Math.random();
    let x: number, y: number;
    if (side < 0.5) {
      x = Math.random() * width;
      y = height + 50;
    } else {
      x = Math.random() < 0.5 ? -50 : width + 50;
      y = Math.random() * height;
    }
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.4 - 0.1,
      size: Math.random() * 100 + 50,
      alpha: 0,
    };
  }, []);

  const initAll = useCallback((width: number, height: number) => {
    particlesRef.current = Array.from({ length: settings.particleCount }, () => createParticle(width, height));
    starsRef.current = Array.from({ length: 200 }, () => {
      const star = createStar(width, height);
      star.baseX = star.x;
      star.baseY = star.y;
      return star;
    });
    smokeRef.current = Array.from({ length: 25 }, () => createSmoke(width, height));
  }, [settings.particleCount, createParticle, createStar, createSmoke]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initAll(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      frameRef.current++;
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear with dark background
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, width, height);

      // Draw stars
      starsRef.current.forEach((star) => {
        // Mouse repulsion
        const dx = star.x - mouseRef.current.x;
        const dy = star.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const mouseDist = 150;
        
        if (dist < mouseDist) {
          const force = (mouseDist - dist) / mouseDist;
          const angle = Math.atan2(dy, dx);
          const moveX = Math.cos(angle) * force * 30;
          const moveY = Math.sin(angle) * force * 30;
          star.x = star.baseX + moveX;
          star.y = star.baseY + moveY;
        } else {
          // Slowly return to base position
          star.x += (star.baseX - star.x) * 0.02;
          star.y += (star.baseY - star.y) * 0.02;
        }
        
        // Twinkle
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.4 + 0.6;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
        ctx.fill();
      });

      // Draw smoke
      smokeRef.current.forEach((smoke) => {
        smoke.x += smoke.vx;
        smoke.y += smoke.vy;
        smoke.alpha += 0.002;
        
        if (smoke.alpha > 0.08 || smoke.y < -100) {
          Object.assign(smoke, createSmoke(width, height));
        }
        
        const gradient = ctx.createRadialGradient(
          smoke.x, smoke.y, 0,
          smoke.x, smoke.y, smoke.size
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${smoke.alpha})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(smoke.x, smoke.y, smoke.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      // Draw particles
      particlesRef.current.forEach((particle) => {
        // Mouse influence
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < settings.mouseRadius) {
          const force = (settings.mouseRadius - dist) / settings.mouseRadius;
          const angle = Math.atan2(dy, dx);
          
          if (mouseRef.current.pressed) {
            particle.vx += Math.cos(angle) * force * settings.mouseForce * 3;
            particle.vy += Math.sin(angle) * force * settings.mouseForce * 3;
          } else {
            particle.vx += Math.cos(angle) * force * settings.mouseForce * 0.3;
            particle.vy += Math.sin(angle) * force * settings.mouseForce * 0.3;
          }
        }

        particle.vy += settings.gravity;
        particle.vx *= settings.friction;
        particle.vy *= settings.friction;

        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > width) {
          particle.vx *= -0.8;
          particle.x = Math.max(0, Math.min(width, particle.x));
        }
        if (particle.y < 0 || particle.y > height) {
          particle.vy *= -0.8;
          particle.y = Math.max(0, Math.min(height, particle.y));
        }

        // Glow
        const glow = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 3
        );
        glow.addColorStop(0, particle.color);
        glow.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.globalAlpha = particle.alpha * 0.5;
        ctx.fill();
        
        // Core
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.alpha;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      mouseRef.current.prevX = mouseRef.current.x;
      mouseRef.current.prevY = mouseRef.current.y;
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [settings, createSmoke]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && particlesRef.current.length > 0) {
      particlesRef.current.forEach(p => {
        p.color = colors[Math.floor(Math.random() * colors.length)];
      });
    }
  }, [colors]);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
  };

  const handleMouseDown = () => mouseRef.current.pressed = true;
  const handleMouseUp = () => mouseRef.current.pressed = false;

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#050510' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="absolute inset-0"
      />
      
      {/* Title */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <h1 
          className="text-9xl font-bold tracking-[0.3em]"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #c0c0ff 50%, #8080ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 40px rgba(150, 150, 255, 0.4))',
          }}
        >
          PARTICLE FLOW
        </h1>
      </div>

      {/* Glass Panel */}
      <div 
        className="absolute top-6 left-6 z-20 transition-transform duration-300"
        style={{ transform: settingsOpen ? 'translateX(0)' : 'translateX(-340px)' }}
      >
        <div 
          className="p-6 rounded-2xl"
          style={{ 
            background: 'rgba(20, 20, 40, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Settings</h2>
            <button onClick={() => setSettingsOpen(false)} className="text-white/50 hover:text-white text-2xl">×</button>
          </div>
          
          <div className="space-y-4 w-72">
            <div>
              <label className="text-xs text-white/50 mb-2 block">Theme</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(COLOR_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => setColorPreset(key)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: colorPreset === key ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                      border: `1px solid ${colorPreset === key ? '#6366f1' : 'rgba(255, 255, 255, 0.15)'}`,
                      color: '#fff'
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">Particles: {settings.particleCount}</label>
              <input
                type="range"
                min="50"
                max="400"
                value={settings.particleCount}
                onChange={(e) => setSettings({ ...settings, particleCount: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">Mouse Radius: {settings.mouseRadius}</label>
              <input
                type="range"
                min="50"
                max="300"
                value={settings.mouseRadius}
                onChange={(e) => setSettings({ ...settings, mouseRadius: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">Friction: {settings.friction.toFixed(2)}</label>
              <input
                type="range"
                min="0.9"
                max="0.99"
                step="0.01"
                value={settings.friction}
                onChange={(e) => setSettings({ ...settings, friction: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">Gravity: {settings.gravity}</label>
              <input
                type="range"
                min="-0.3"
                max="0.3"
                step="0.02"
                value={settings.gravity}
                onChange={(e) => setSettings({ ...settings, gravity: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            <button
              onClick={handleFullscreen}
              className="w-full py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
              }}
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute top-6 left-6 z-20 p-3 rounded-xl transition-all hover:scale-110"
        style={{
          background: 'rgba(99, 102, 241, 0.3)',
          border: '1px solid rgba(99, 102, 241, 0.5)',
          opacity: settingsOpen ? 0 : 1,
          pointerEvents: settingsOpen ? 'none' : 'auto',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
        </svg>
      </button>

      {/* Instructions */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/30 z-10">
        Move mouse to interact • Click and hold to attract • Press × to hide settings
      </div>
    </div>
  );
}
