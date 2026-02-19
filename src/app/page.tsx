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
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface Settings {
  particleCount: number;
  mouseRadius: number;
  mouseForce: number;
  friction: number;
  gravity: number;
}

const COLOR_PRESETS = {
  ocean: { name: 'Ocean', colors: ['#00d9ff', '#0099cc', '#00ffcc', '#66ffff'], bg: 'rgba(0, 20, 40, 0.3)' },
  sunset: { name: 'Sunset', colors: ['#ff6b35', '#f7c59f', '#efa00b', '#d62246'], bg: 'rgba(40, 20, 10, 0.3)' },
  neon: { name: 'Neon', colors: ['#ff00ff', '#00ffff', '#ff00ff', '#ffff00'], bg: 'rgba(20, 0, 30, 0.3)' },
  aurora: { name: 'Aurora', colors: ['#00ff87', '#60efff', '#ff00ff', '#7b2dff'], bg: 'rgba(10, 20, 30, 0.3)' },
  fire: { name: 'Fire', colors: ['#ff4500', '#ff8c00', '#ffd700', '#ff6347'], bg: 'rgba(30, 10, 0, 0.3)' },
  forest: { name: 'Forest', colors: ['#228b22', '#32cd32', '#90ee90', '#006400'], bg: 'rgba(0, 20, 10, 0.3)' },
  cosmic: { name: 'Cosmic', colors: ['#ffffff', '#e0e0ff', '#a0a0ff', '#ff80c0'], bg: 'rgba(5, 5, 20, 0.3)' },
};

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const smokeCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const smokeParticlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, pressed: false, prevX: 0, prevY: 0 });
  const animationRef = useRef<number>();
  
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    particleCount: 200,
    mouseRadius: 200,
    mouseForce: 3,
    friction: 0.97,
    gravity: 0,
  });
  
  const [colorPreset, setColorPreset] = useState('cosmic');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const colors = COLOR_PRESETS[colorPreset as keyof typeof COLOR_PRESETS]?.colors || COLOR_PRESETS.cosmic.colors;
  const bgColor = COLOR_PRESETS[colorPreset as keyof typeof COLOR_PRESETS]?.bg || COLOR_PRESETS.cosmic.bg;

  const createParticle = useCallback((width: number, height: number): Particle => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    size: Math.random() * 3 + 1,
    color: colors[Math.floor(Math.random() * colors.length)],
    alpha: Math.random() * 0.5 + 0.5,
  }), [colors]);

  const createStar = useCallback((width: number, height: number): Star => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2 + 0.5,
    alpha: Math.random() * 0.5 + 0.3,
    twinkleSpeed: Math.random() * 0.02 + 0.01,
    twinklePhase: Math.random() * Math.PI * 2,
  }), []);

  const createSmokeParticle = useCallback((width: number, height: number): Particle => {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = Math.random() * width; y = height + 50; }
    else if (side === 1) { x = Math.random() * width; y = -50; }
    else if (side === 2) { x = -50; y = Math.random() * height; }
    else { x = width + 50; y = Math.random() * height; }
    
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.5 - 0.2,
      size: Math.random() * 80 + 40,
      color: '#ffffff',
      alpha: Math.random() * 0.03 + 0.01,
    };
  }, []);

  const initParticles = useCallback((width: number, height: number) => {
    particlesRef.current = Array.from({ length: settings.particleCount }, () => 
      createParticle(width, height)
    );
    starsRef.current = Array.from({ length: 150 }, () => createStar(width, height));
    smokeParticlesRef.current = Array.from({ length: 30 }, () => createSmokeParticle(width, height));
  }, [settings.particleCount, createParticle, createStar, createSmokeParticle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    const smokeCanvas = smokeCanvasRef.current;
    if (!canvas || !bgCanvas || !smokeCanvas) return;

    const ctx = canvas.getContext('2d');
    const bgCtx = bgCanvas.getContext('2d');
    const smokeCtx = smokeCanvas.getContext('2d');
    if (!ctx || !bgCtx || !smokeCtx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      bgCanvas.width = window.innerWidth;
      bgCanvas.height = window.innerHeight;
      smokeCanvas.width = window.innerWidth;
      smokeCanvas.height = window.innerHeight;
      initParticles(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    let time = 0;

    const animate = () => {
      time++;
      
      // Clear with fade for trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw stars (background)
      bgCtx.fillStyle = '#000';
      bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      
      const mouseSpeed = Math.sqrt(
        Math.pow(mouseRef.current.x - mouseRef.current.prevX, 2) +
        Math.pow(mouseRef.current.y - mouseRef.current.prevY, 2)
      );
      const mouseInfluence = Math.min(mouseSpeed * 2, 50);

      starsRef.current.forEach((star) => {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        const distToMouse = Math.sqrt(
          Math.pow(star.x - mouseRef.current.x, 2) +
          Math.pow(star.y - mouseRef.current.y, 2)
        );
        
        // Stars move slightly away from mouse
        if (distToMouse < 200) {
          const force = (200 - distToMouse) / 200;
          const angle = Math.atan2(star.y - mouseRef.current.y, star.x - mouseRef.current.x);
          star.x += Math.cos(angle) * force * mouseInfluence * 0.1;
          star.y += Math.sin(angle) * force * mouseInfluence * 0.1;
          
          // Wrap around screen
          if (star.x < 0) star.x = bgCanvas.width;
          if (star.x > bgCanvas.width) star.x = 0;
          if (star.y < 0) star.y = bgCanvas.height;
          if (star.y > bgCanvas.height) star.y = 0;
        }
        
        bgCtx.beginPath();
        bgCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
        bgCtx.fill();
      });

      // Draw smoke
      smokeCtx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      smokeCtx.fillRect(0, 0, smokeCanvas.width, smokeCanvas.height);
      
      smokeParticlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha *= 0.998;
        
        if (particle.alpha < 0.001 || 
            particle.y < -100 || particle.y > smokeCanvas.height + 100 ||
            particle.x < -100 || particle.x > smokeCanvas.width + 100) {
          const newParticle = createSmokeParticle(smokeCanvas.width, smokeCanvas.height);
          Object.assign(particle, newParticle);
        }
        
        const gradient = smokeCtx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.alpha})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        smokeCtx.beginPath();
        smokeCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        smokeCtx.fillStyle = gradient;
        smokeCtx.fill();
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
            particle.vx += Math.cos(angle) * force * settings.mouseForce * 2;
            particle.vy += Math.sin(angle) * force * settings.mouseForce * 2;
          } else {
            particle.vx -= Math.cos(angle) * force * settings.mouseForce * 0.5;
            particle.vy -= Math.sin(angle) * force * settings.mouseForce * 0.5;
          }
        }

        particle.vy += settings.gravity;
        particle.vx *= settings.friction;
        particle.vy *= settings.friction;

        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -0.8;
          particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy *= -0.8;
          particle.y = Math.max(0, Math.min(canvas.height, particle.y));
        }

        // Glow effect
        const glow = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 4
        );
        glow.addColorStop(0, particle.color);
        glow.addColorStop(0.3, particle.color);
        glow.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.globalAlpha = particle.alpha * 0.4;
        ctx.fill();
        
        // Core particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.alpha;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      
      // Update previous mouse position
      mouseRef.current.prevX = mouseRef.current.x;
      mouseRef.current.prevY = mouseRef.current.y;
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [settings, createSmokeParticle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) initParticles(canvas.width, canvas.height);
  }, [settings.particleCount, initParticles]);

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

  const handleMouseDown = () => {
    mouseRef.current.pressed = true;
  };

  const handleMouseUp = () => {
    mouseRef.current.pressed = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      mouseRef.current.x = e.touches[0].clientX;
      mouseRef.current.y = e.touches[0].clientY;
    }
  };

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
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#000' }}>
      {/* Layered canvases */}
      <canvas ref={bgCanvasRef} className="absolute inset-0" style={{ zIndex: 0 }} />
      <canvas ref={smokeCanvasRef} className="absolute inset-0" style={{ zIndex: 1 }} />
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            mouseRef.current.x = e.touches[0].clientX;
            mouseRef.current.y = e.touches[0].clientY;
            mouseRef.current.pressed = true;
          }
        }}
        onTouchEnd={() => {
          mouseRef.current.pressed = false;
        }}
        className="absolute inset-0 cursor-crosshair"
        style={{ zIndex: 2 }}
      />
      
      {/* Big Title */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 3 }}
      >
        <h1 
          className="text-8xl font-bold tracking-wider"
          style={{
            background: 'linear-gradient(135deg, #fff 0%, #a0a0ff 50%, #ff80c0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 60px rgba(160, 160, 255, 0.5)',
            filter: 'drop-shadow(0 0 20px rgba(160, 160, 255, 0.3))',
          }}
        >
          PARTICLE FLOW
        </h1>
      </div>

      {/* Glass Control Panel */}
      <div 
        className="absolute top-6 left-6 z-10 transition-all duration-500"
        style={{
          transform: settingsOpen ? 'translateX(0)' : 'translateX(-320px)',
        }}
      >
        <div 
          className="p-6 rounded-2xl backdrop-blur-xl"
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Settings</h2>
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-white/50 hover:text-white transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4 w-72">
            {/* Color Presets */}
            <div>
              <label className="text-xs text-white/60 mb-2 block">Color Theme</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(COLOR_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => setColorPreset(key)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
                    style={{
                      background: colorPreset === key 
                        ? `linear-gradient(135deg, ${preset.colors[0]}40, ${preset.colors[preset.colors.length - 1]}40)`
                        : 'rgba(255, 255, 255, 0.1)',
                      border: `1px solid ${colorPreset === key ? preset.colors[0] : 'rgba(255, 255, 255, 0.2)'}`,
                      color: '#fff'
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Particle Count */}
            <div>
              <label className="text-xs text-white/60 mb-1 block">
                Particles: {settings.particleCount}
              </label>
              <input
                type="range"
                min="50"
                max="500"
                value={settings.particleCount}
                onChange={(e) => setSettings({ ...settings, particleCount: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Mouse Radius */}
            <div>
              <label className="text-xs text-white/60 mb-1 block">
                Mouse Radius: {settings.mouseRadius}
              </label>
              <input
                type="range"
                min="50"
                max="400"
                value={settings.mouseRadius}
                onChange={(e) => setSettings({ ...settings, mouseRadius: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Friction */}
            <div>
              <label className="text-xs text-white/60 mb-1 block">
                Friction: {settings.friction.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.9"
                max="0.99"
                step="0.01"
                value={settings.friction}
                onChange={(e) => setSettings({ ...settings, friction: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Gravity */}
            <div>
              <label className="text-xs text-white/60 mb-1 block">
                Gravity: {settings.gravity}
              </label>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.05"
                value={settings.gravity}
                onChange={(e) => setSettings({ ...settings, gravity: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="w-full py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.6), rgba(168, 85, 247, 0.6))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                color: '#fff'
              }}
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Go Fullscreen'}
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Settings Button */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute top-6 left-6 z-10 p-3 rounded-xl backdrop-blur-xl transition-all hover:scale-110"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
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
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/40 z-10">
        Move mouse to interact • Click to attract • Scroll to zoom (coming soon)
      </div>
    </div>
  );
}
