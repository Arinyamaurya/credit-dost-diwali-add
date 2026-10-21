import React from 'react';

/**
 * Torana: Festive garland & twinkling string-light border across the very top of the page.
 *
 * FIX: The wrapper is now `position: absolute; overflow: visible` so it sits as an
 * overlay and never clips the box-shadow glow of the bulbs. A CSS mask fades the
 * bottom edge to transparent, eliminating the hard horizontal line.
 */
export const Torana = () => {
  const bulbs = [
    { x: '4%',  delay: '0s',   color: '#ff9a2e' },
    { x: '10%', delay: '0.4s', color: '#f7c948' },
    { x: '16%', delay: '0.8s', color: '#ffe29a' },
    { x: '22%', delay: '0.2s', color: '#ff9a2e' },
    { x: '28%', delay: '0.6s', color: '#f7c948' },
    { x: '34%', delay: '1.0s', color: '#ffe29a' },
    { x: '40%', delay: '0.3s', color: '#ff9a2e' },
    { x: '46%', delay: '0.7s', color: '#f7c948' },
    { x: '52%', delay: '0.1s', color: '#ffe29a' },
    { x: '58%', delay: '0.5s', color: '#ff9a2e' },
    { x: '64%', delay: '0.9s', color: '#f7c948' },
    { x: '70%', delay: '0.2s', color: '#ffe29a' },
    { x: '76%', delay: '0.6s', color: '#ff9a2e' },
    { x: '82%', delay: '1.1s', color: '#f7c948' },
    { x: '88%', delay: '0.4s', color: '#ffe29a' },
    { x: '94%', delay: '0.8s', color: '#ff9a2e' },
  ];

  return (
    /*
     * KEY FIX:
     * - position: absolute + overflow: visible  →  glow never gets clipped
     * - height: 100px gives enough room for the full box-shadow halo
     * - z-index: 200 places it above the topbar (z-index 100) so it isn't painted over
     * - mask-image fades the bottom to transparent, so there is no hard edge
     * - pointer-events: none keeps it non-interactive
     */
    <div
      className="torana-strip-wrap"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 'clamp(70px, 12vw, 100px)',
        overflow: 'visible',
        zIndex: 200,
        pointerEvents: 'none',
        maskImage: 'linear-gradient(to bottom, #000 45%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 45%, transparent 100%)',
      }}
      aria-hidden="true"
    >
      {/* Curved garland wire — full width, no gap, subtle */}
      <svg
        viewBox="0 0 1200 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '24px',
          display: 'block',
          overflow: 'visible',
        }}
      >
        <path
          d="M0 4 Q 150 16, 300 4 T 600 4 T 900 4 T 1200 4"
          stroke="rgba(247, 201, 72, 0.25)"
          strokeWidth="1"
          fill="none"
        />
      </svg>

      {/* Twinkling festive bulb lights */}
      {bulbs.map((bulb, index) => (
        <span
          key={index}
          className="torana-bulb"
          style={{
            position: 'absolute',
            top: '3px',
            left: bulb.x,
            transform: 'translateX(-50%)',
            width: 'clamp(6px, 1vw, 8px)',
            height: 'clamp(9px, 1.5vw, 12px)',
            borderRadius: '50% 50% 42% 42%',
            backgroundColor: bulb.color,
            boxShadow: `0 0 10px 3px ${bulb.color}, 0 0 22px 6px ${bulb.color}88`,
            animation: 'bulbTwinkle 1.8s infinite ease-in-out',
            animationDelay: bulb.delay,
            display: 'inline-block',
          }}
        />
      ))}
    </div>
  );
};
