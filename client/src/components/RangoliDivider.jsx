import React from 'react';

/**
 * Rangoli-inspired decorative divider (inline SVG gold line art)
 * Placed between the Hero section and the Offers section.
 */
export const RangoliDivider = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '1000px',
        margin: '1.5rem auto 3rem',
        padding: '0 1.5rem',
        position: 'relative',
        zIndex: 2,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 800 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', maxHeight: '55px' }}
      >
        <defs>
          <linearGradient id="rangoliLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f7c948" stopOpacity="0" />
            <stop offset="25%" stopColor="#f7c948" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#ffe29a" stopOpacity="0.9" />
            <stop offset="75%" stopColor="#f7c948" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f7c948" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Center decorative mandala / diya emblem */}
        <g transform="translate(400, 30)">
          {/* Central Diya Flame */}
          <path
            d="M0 -18 C -5 -6, -2 0, 0 3 C 2 0, 5 -6, 0 -18 Z"
            fill="#ff9a2e"
          />
          <path
            d="M-12 3 Q 0 14, 12 3 Q 0 7, -12 3 Z"
            fill="#f7c948"
          />

          {/* Symmetrical Rangoli Petals */}
          <circle cx="0" cy="0" r="22" stroke="url(#rangoliLineGrad)" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="0" cy="0" r="16" stroke="#f7c948" strokeWidth="1" />
          
          <path d="M-28 0 C -22 -10, -22 10, -28 0 Z" fill="#ffe29a" opacity="0.8" />
          <path d="M28 0 C 22 -10, 22 10, 28 0 Z" fill="#ffe29a" opacity="0.8" />
        </g>

        {/* Left Wing flourish */}
        <path
          d="M360 30 Q 300 15, 240 30 T 120 30 L 10 30"
          stroke="url(#rangoliLineGrad)"
          strokeWidth="1.5"
        />
        <circle cx="240" cy="30" r="3" fill="#f7c948" />
        <circle cx="180" cy="30" r="2" fill="#ffe29a" />

        {/* Right Wing flourish */}
        <path
          d="M440 30 Q 500 15, 560 30 T 680 30 L 790 30"
          stroke="url(#rangoliLineGrad)"
          strokeWidth="1.5"
        />
        <circle cx="560" cy="30" r="3" fill="#f7c948" />
        <circle cx="620" cy="30" r="2" fill="#ffe29a" />
      </svg>
    </div>
  );
};
