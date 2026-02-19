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
  life: number;
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
  trail?: { x: number; y: number; alpha: number }[];
  trailTimer?: number;
}

interface SmokeCloud {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
}

interface Settings {
  particleCount: number;
  mouseRadius: number;
  mouseForce: number;
  friction: number;
  gravity: number;
}

const THEMES = {
  cosmic: { 
    name: 'Cosmic', 
    particles: ['#ffffff', '#e8e8ff', '#d0d0ff', '#c8c8ff', '#ffffff'],
    smoke: ['rgba(255,255,255,', 'rgba(220,220,240,', 'rgba(200,200,220,'],
    accent: '#a0a0ff',
    accentLight: 'rgba(160,160,255,0.5)',
  },
  ocean: { 
    name: 'Ocean', 
    particles: ['#00d9ff', '#00ffcc', '#66ffff', '#00b3cc'],
    smoke: ['rgba(0,217,255,', 'rgba(0,255,204,'],
    accent: '#00d9ff',
    accentLight: 'rgba(0,217,255,0.5)',
  },
  sunset: { 
    name: 'Sunset', 
    particles: ['#ff6b35', '#f7c59f', '#efa00b', '#d62246'],
    smoke: ['rgba(255,107,53,', 'rgba(247,197,159,'],
    accent: '#ff6b35',
    accentLight: 'rgba(255,107,53,0.5)',
  },
  neon: { 
    name: 'Neon', 
    particles: ['#ff00ff', '#00ffff', '#ffff00', '#ff0080'],
    smoke: ['rgba(255,0,255,', 'rgba(0,255,255,'],
    accent: '#ff00ff',
    accentLight: 'rgba(255,0,255,0.5)',
  },
  fire: { 
    name: 'Fire', 
    particles: ['#ff4500', '#ff8c00', '#ffd700', '#ff6347'],
    smoke: ['rgba(255,69,0,', 'rgba(255,140,0,'],
    accent: '#ff4500',
    accentLight: 'rgba(255,69,0,0.5)',
  },
};

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const smokeRef = useRef<SmokeCloud[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, pressed: false, prevX: 0, prevY: 0 });
  const animationRef = useRef<number>();
  
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    particleCount: 120,
    mouseRadius: 150,
    mouseForce: 2,
    friction: 0.97,
    gravity: 0,
  });
  
  const [theme, setTheme] = useState('cosmic');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentTheme = THEMES[theme as keyof typeof THEMES] || THEMES.cosmic;

  const createParticle = useCallback((width: number, height: number): Particle => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 1,
    vy: (Math.random() - 0.5) * 1,
    size: Math.random() * 3 + 1.5,
    color: currentTheme.particles[Math.floor(Math.random() * currentTheme.particles.length)],
    alpha: Math.random() * 0.5 + 0.5,
    life: Math.random() * 100,
  }), [currentTheme.particles]);

  const createStar = useCallback((width: number, height: number): Star => ({
    x: Math.random() * width,
    y: Math.random() * height,
    baseX: 0,
    baseY: 0,
    size: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.5 + 0.5,
    twinkleSpeed: Math.random() * 0.02 + 0.01,
    twinklePhase: Math.random() * Math.PI * 2,
  }), []);

  const createSmoke = useCallback((width: number, height: number): SmokeCloud => ({
    x: width + 200, // Start from RIGHT side
    y: Math.random() * height,
    vx: -Math.random() * 0.8 - 0.4, // Move LEFT toward center
    vy: (Math.random() - 0.5) * 0.2,
    size: Math.random() * 220 + 100, // Larger clouds
    alpha: 0,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.002,
  }), []);

  const initAll = useCallback((width: number, height: number) => {
    particlesRef.current = Array.from({ length: settings.particleCount }, () => createParticle(width, height));
    starsRef.current = Array.from({ length: 250 }, () => {
      const star = createStar(width, height);
      star.baseX = star.x;
      star.baseY = star.y;
      return star;
    });
    smokeRef.current = Array.from({ length: 20 }, () => createSmoke(width, height));
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
      const width = canvas.width;
      const height = canvas.height;
      
      // Dark background
      ctx.fillStyle = '#080810';
      ctx.fillRect(0, 0, width, height);

      // Draw smoke clouds - large, slow, flowing
      smokeRef.current.forEach((smoke) => {
        smoke.x += smoke.vx;
        smoke.y += smoke.vy;
        smoke.rotation += smoke.rotationSpeed;
        
        // Fade in then fade out - more visible
        if (smoke.alpha < 0.12) smoke.alpha += 0.0015;
        
        // Reset when off screen (left side)
        if (smoke.x < -smoke.size * 2 || smoke.y < -smoke.size || smoke.y > height + smoke.size) {
          Object.assign(smoke, createSmoke(width, height));
        }
        
        // Mouse interaction with smoke - push away with sharper response
        const smokeDx = smoke.x - mouseRef.current.x;
        const smokeDy = smoke.y - mouseRef.current.y;
        const smokeDist = Math.sqrt(smokeDx * smokeDx + smokeDy * smokeDy);
        const smokeMouseRadius = 120;
        
        if (smokeDist < smokeMouseRadius) {
          const smokeForce = Math.pow((smokeMouseRadius - smokeDist) / smokeMouseRadius, 1.5);
          const smokeAngle = Math.atan2(smokeDy, smokeDx);
          smoke.x += Math.cos(smokeAngle) * smokeForce * 4;
          smoke.y += Math.sin(smokeAngle) * smokeForce * 4;
          smoke.vx += Math.cos(smokeAngle) * smokeForce * 0.08;
          smoke.vy += Math.sin(smokeAngle) * smokeForce * 0.08;
        }
        
        // Draw smoke cloud - ethereal wispy look
        ctx.save();
        ctx.translate(smoke.x, smoke.y);
        ctx.rotate(smoke.rotation);
        
        // Multiple layered gradients for wispy effect
        for (let i = 0; i < 3; i++) {
          const layerSize = smoke.size * (1 - i * 0.25);
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, layerSize);
          const smokeColor = currentTheme.smoke[i % currentTheme.smoke.length];
          gradient.addColorStop(0, `${smokeColor}${smoke.alpha * (1 - i * 0.3)})`);
          gradient.addColorStop(0.5, `${smokeColor}${smoke.alpha * 0.3 * (1 - i * 0.3)})`);
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          
          ctx.beginPath();
          ctx.arc(i * 20 - 30, i * 10 - 15, layerSize, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw stars with occasional trails/shooting stars
      starsRef.current.forEach((star) => {
        // Random trail spawning - more frequent
        if (!star.trail && Math.random() < 0.008) {
          star.trail = [];
          star.trailTimer = 40;
        }
        
        // Update trail
        if (star.trail && star.trailTimer) {
          star.trailTimer--;
          if (star.trailTimer <= 0) {
            star.trail = undefined;
            star.trailTimer = undefined;
          } else {
            star.trail.push({ x: star.x, y: star.y, alpha: 1 });
            if (star.trail.length > 15) star.trail.shift();
          }
        }
        
        // Draw trail
        if (star.trail) {
          star.trail.forEach((point, i) => {
            const trailAlpha = (i / star.trail!.length) * 0.8;
            ctx.beginPath();
            ctx.arc(point.x, point.y, star.size * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${trailAlpha})`;
            ctx.fill();
          });
        }
        
        // Random wandering movement
        const wander = Math.sin(Date.now() * 0.001 + star.baseX) * 0.3;
        
        // Mouse interaction
        const dx = star.x - mouseRef.current.x;
        const dy = star.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const mouseDist = 120;
        
        if (dist < mouseDist) {
          const force = Math.pow((mouseDist - dist) / mouseDist, 2);
          const angle = Math.atan2(dy, dx);
          star.x = star.baseX + Math.cos(angle) * force * 40;
          star.y = star.baseY + Math.sin(angle) * force * 40;
        } else {
          star.x += (star.baseX - star.x) * 0.03;
          star.y += (star.baseY - star.y) * 0.03;
        }
        
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
        ctx.fill();
      });

      // Draw particles
      particlesRef.current.forEach((particle) => {
        // Random wandering movement - gives natural organic feel
        particle.vx += (Math.random() - 0.5) * 0.15;
        particle.vy += (Math.random() - 0.5) * 0.15;
        
        // Text collision - letters act as walls, particles cannot pass through
        const textCenterX = width / 2;
        const textCenterY = height * 0.35;
        
        // Define the text bounding box
        const textBoxWidth = width * 0.4;
        const textBoxHeight = 70;
        
        const dxText = particle.x - textCenterX;
        const dyText = particle.y - textCenterY;
        
        // Check if particle is trying to enter the text box
        const inTextZone = Math.abs(dxText) < textBoxWidth / 2 && Math.abs(dyText) < textBoxHeight / 2;
        
        if (inTextZone) {
          // Strong repulsion - treat letters as solid walls
          const distFromCenter = Math.sqrt(dxText * dxText + dyText * dyText);
          
          if (distFromCenter > 5) {
            const force = 2.5; // Strong force to push back
            const angle = Math.atan2(dyText, dxText);
            
            // Push particle outside the text box
            particle.vx += Math.cos(angle) * force;
            particle.vy += Math.sin(angle) * force;
          }
        }
        
        // Mouse influence
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < settings.mouseRadius) {
          const force = (settings.mouseRadius - dist) / settings.mouseRadius;
          const angle = Math.atan2(dy, dx);
          
          if (mouseRef.current.pressed) {
            particle.vx += Math.cos(angle) * force * settings.mouseForce * 4;
            particle.vy += Math.sin(angle) * force * settings.mouseForce * 4;
          } else {
            particle.vx += Math.cos(angle) * force * settings.mouseForce * 0.2;
            particle.vy += Math.sin(angle) * force * settings.mouseForce * 0.2;
          }
        }

        particle.vy += settings.gravity;
        particle.vx *= settings.friction;
        particle.vy *= settings.friction;

        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;

        // Glow
        const glow = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 4
        );
        glow.addColorStop(0, particle.color);
        glow.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.globalAlpha = particle.alpha * 0.4;
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
  }, [settings, createSmoke, currentTheme]);

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
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#080810' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="absolute inset-0"
      />
      
      {/* Title - smaller and shifted up */}
      <div className="absolute inset-0 flex items-start justify-center pointer-events-none z-10" style={{ paddingTop: '8vh' }}>
        <h1 
          className="text-[90px] font-bold tracking-[0.15em] text-center"
          style={{
            color: '#fff',
            textShadow: `0 0 40px ${currentTheme.accent}, 0 0 80px ${currentTheme.accentLight}`,
          }}
        >
          PARTICLE<br />FLOW
        </h1>
      </div>

      {/* Glass Settings Panel - only render when open */}
      {settingsOpen && (
        <div className="absolute top-0 left-0 bottom-0 w-80 z-30 overflow-hidden">
          <div 
            className="p-6 rounded-2xl h-full"
            style={{ 
              background: 'rgba(15, 15, 35, 0.85)',
              backdropFilter: 'blur(24px)',
              borderRight: `1px solid ${currentTheme.accent}40`,
              boxShadow: `0 8px 40px rgba(0, 0, 0, 0.6), 0 0 30px ${currentTheme.accentLight}, inset 0 1px 0 rgba(255, 255, 255, 0.08)`,
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold" style={{ color: currentTheme.accent }}>Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
            </div>
          
          <div className="space-y-4 w-64">
            <div>
              <label className="text-xs text-white/40 mb-2 block">Theme</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: theme === key ? t.accentLight : 'rgba(255, 255, 255, 0.08)',
                      border: `1px solid ${theme === key ? t.accent : 'rgba(255, 255, 255, 0.1)'}`,
                      color: '#fff'
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Particles: {settings.particleCount}</label>
              <input
                type="range"
                min="30"
                max="300"
                value={settings.particleCount}
                onChange={(e) => setSettings({ ...settings, particleCount: Number(e.target.value) })}
                className="w-full"
                style={{ accentColor: currentTheme.accent }}
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Mouse Radius: {settings.mouseRadius}</label>
              <input
                type="range"
                min="50"
                max="300"
                value={settings.mouseRadius}
                onChange={(e) => setSettings({ ...settings, mouseRadius: Number(e.target.value) })}
                className="w-full"
                style={{ accentColor: currentTheme.accent }}
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Friction: {settings.friction.toFixed(2)}</label>
              <input
                type="range"
                min="0.9"
                max="0.99"
                step="0.01"
                value={settings.friction}
                onChange={(e) => setSettings({ ...settings, friction: Number(e.target.value) })}
                className="w-full"
                style={{ accentColor: currentTheme.accent }}
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Gravity: {settings.gravity}</label>
              <input
                type="range"
                min="-0.2"
                max="0.2"
                step="0.02"
                value={settings.gravity}
                onChange={(e) => setSettings({ ...settings, gravity: Number(e.target.value) })}
                className="w-full"
                style={{ accentColor: currentTheme.accent }}
              />
            </div>

            <button
              onClick={handleFullscreen}
              className="w-full py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.accent}, ${currentTheme.accent}dd)`,
                boxShadow: `0 4px 20px ${currentTheme.accentLight}`,
              }}
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>
        </div>}

      {/* Toggle Button - bottom left when panel closed */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute bottom-6 left-6 z-30 p-3 rounded-xl transition-all hover:scale-110"
        style={{
          background: `${currentTheme.accent}40`,
          border: `1px solid ${currentTheme.accent}`,
          boxShadow: `0 4px 20px ${currentTheme.accentLight}`,
          opacity: settingsOpen ? 0 : 1,
          pointerEvents: settingsOpen ? 'none' : 'auto',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4" />
        </svg>
      </button>

      {/* Instructions */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-white/25 z-10">
        Move mouse to interact • Click to attract • Close panel with × or open with gear icon
      </div>
    </div>
  );
}
