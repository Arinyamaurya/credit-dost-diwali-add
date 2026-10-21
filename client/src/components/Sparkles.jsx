import React, { useEffect, useRef } from 'react';

/**
 * Sparkles: Twinkling stars and rising gold embers/bokeh lights.
 * Max ~40 particles, performance-friendly GPU canvas.
 * Automatically pauses when tab is hidden or prefers-reduced-motion is active.
 */
export const Sparkles = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Respect user's motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        lastTime = performance.now();
        render();
      } else {
        cancelAnimationFrame(animationFrameId);
      }
    };

    // Responsive particle count: ~18 on small mobile, 30 on tablet, 40 on desktop
    const getParticleCount = (w) => {
      if (w < 480) return 18;
      if (w < 900) return 30;
      return 40;
    };

    let particleCount = getParticleCount(window.innerWidth);
    let particles = [];

    const initParticles = () => {
      particleCount = getParticleCount(canvas.width);
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 0.8,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(Math.random() * 0.4 + 0.15), // Slow rising ember
          opacity: Math.random() * 0.7 + 0.2,
          twinkleSpeed: Math.random() * 0.02 + 0.008,
          twinkleDir: Math.random() > 0.5 ? 1 : -1,
          color: Math.random() > 0.4 ? '#f7c948' : '#ffe29a',
        });
      }
    };

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
      const newCount = getParticleCount(canvas.width);
      if (Math.abs(newCount - particles.length) > 5) {
        initParticles();
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    initParticles();

    let lastTime = performance.now();

    const render = () => {
      if (!isTabVisible) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Twinkle opacity
        p.opacity += p.twinkleDir * p.twinkleSpeed;
        if (p.opacity > 0.9) {
          p.opacity = 0.9;
          p.twinkleDir = -1;
        } else if (p.opacity < 0.15) {
          p.opacity = 0.15;
          p.twinkleDir = 1;
        }

        // Wrap around borders
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        // Draw particle with gentle glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#f7c948';
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className="hero-canvas-container" aria-hidden="true">
      <canvas ref={canvasRef} className="sparkle-canvas" />
    </div>
  );
};
