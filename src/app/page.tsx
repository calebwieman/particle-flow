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

interface Settings {
  particleCount: number;
  mouseRadius: number;
  mouseForce: number;
  friction: number;
  gravity: number;
  trailLength: number;
}

const COLOR_PRESETS = {
  ocean: ['#00d9ff', '#0099cc', '#00ffcc', '#66ffff'],
  sunset: ['#ff6b35', '#f7c59f', '#efa00b', '#d62246'],
  neon: ['#ff00ff', '#00ffff', '#ff00ff', '#ffff00'],
  aurora: ['#00ff87', '#60efff', '#ff00ff', '#7b2dff'],
  fire: ['#ff4500', '#ff8c00', '#ffd700', '#ff6347'],
  forest: ['#228b22', '#32cd32', '#90ee90', '#006400'],
};

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, pressed: false });
  const animationRef = useRef<number>();
  
  const [settings, setSettings] = useState<Settings>({
    particleCount: 150,
    mouseRadius: 150,
    mouseForce: 2,
    friction: 0.98,
    gravity: 0,
    trailLength: 20,
  });
  
  const [colorPreset, setColorPreset] = useState('neon');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const colors = COLOR_PRESETS[colorPreset as keyof typeof COLOR_PRESETS] || COLOR_PRESETS.neon;

  const createParticle = useCallback((width: number, height: number): Particle => {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.5 + 0.5,
    };
  }, [colors]);

  const initParticles = useCallback((width: number, height: number) => {
    particlesRef.current = Array.from({ length: settings.particleCount }, () => 
      createParticle(width, height)
    );
  }, [settings.particleCount, createParticle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        // Mouse influence
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < settings.mouseRadius) {
          const force = (settings.mouseRadius - dist) / settings.mouseRadius;
          const angle = Math.atan2(dy, dx);
          
          if (mouseRef.current.pressed) {
            // Attract when pressed
            particle.vx += Math.cos(angle) * force * settings.mouseForce * 2;
            particle.vy += Math.sin(angle) * force * settings.mouseForce * 2;
          } else {
            // Gentle push when just hovering
            particle.vx -= Math.cos(angle) * force * settings.mouseForce * 0.5;
            particle.vy -= Math.sin(angle) * force * settings.mouseForce * 0.5;
          }
        }

        // Gravity
        particle.vy += settings.gravity;

        // Friction
        particle.vx *= settings.friction;
        particle.vy *= settings.friction;

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off walls
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -0.8;
          particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy *= -0.8;
          particle.y = Math.max(0, Math.min(canvas.height, particle.y));
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.alpha;
        ctx.fill();
        
        // Glow effect
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.alpha * 0.3;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [settings]);

  // Reinitialize when particle count changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      initParticles(canvas.width, canvas.height);
    }
  }, [settings.particleCount, initParticles]);

  // Reinitialize when colors change
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
      />
      
      {/* Controls Panel */}
      <div 
        className="absolute top-4 left-4 p-4 rounded-xl backdrop-blur-md"
        style={{ 
          background: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <h1 className="text-xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          Particle Flow
        </h1>
        
        <div className="space-y-3 w-64">
          {/* Color Presets */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Color Theme</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(COLOR_PRESETS).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setColorPreset(preset)}
                  className="px-3 py-1 rounded-full text-xs transition-all"
                  style={{
                    background: colorPreset === preset ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                    border: `1px solid ${colorPreset === preset ? '#6366f1' : 'rgba(255, 255, 255, 0.2)'}`,
                    color: '#fff'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Particle Count */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
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
            <label className="text-xs text-gray-400 mb-1 block">
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
            <label className="text-xs text-gray-400 mb-1 block">
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
            <label className="text-xs text-gray-400 mb-1 block">
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
            className="w-full py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'rgba(99, 102, 241, 0.3)',
              border: '1px solid rgba(99, 102, 241, 0.5)',
              color: '#fff'
            }}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-500">
        Move mouse to interact • Click to attract • Touch supported
      </div>
    </div>
  );
}
