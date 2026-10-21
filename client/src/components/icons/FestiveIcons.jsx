import React from 'react';

/**
 * Custom Festive SVG Icons with Gold Gradients and Glow Filters
 */

export const SparkleIcon = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="goldSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffe29a" />
        <stop offset="50%" stopColor="#f7c948" />
        <stop offset="100%" stopColor="#ff9a2e" />
      </linearGradient>
      <filter id="sparkleGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="glow" />
        <feComposite in="SourceGraphic" in2="glow" operator="over" />
      </filter>
    </defs>
    <path
      d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z"
      fill="url(#goldSparkleGrad)"
      filter="url(#sparkleGlow)"
    />
  </svg>
);

export const DiyaFlameIcon = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="flameGrad" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor="#f7c948" />
        <stop offset="70%" stopColor="#ff9a2e" />
        <stop offset="100%" stopColor="#c2185b" />
      </linearGradient>
    </defs>
    <path
      d="M12 2C12 2 7 8 7 13C7 16.866 9.23858 19 12 19C14.7614 19 17 16.866 17 13C17 8 12 2 12 2Z"
      fill="url(#flameGrad)"
    />
    <path
      d="M5 19C5 19 8 22 12 22C16 22 19 19 19 19C18 20.5 15.5 22 12 22C8.5 22 6 20.5 5 19Z"
      fill="#b9861c"
    />
  </svg>
);

export const FireworkBurstIcon = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2V6M12 18V22M2 12H6M18 12H22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="#f7c948" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="12" r="3" fill="#ffe29a" />
  </svg>
);

export const MarigoldFlowerIcon = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="marigoldGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff3d1" />
        <stop offset="50%" stopColor="#ff9a2e" />
        <stop offset="100%" stopColor="#c2185b" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="9" fill="url(#marigoldGrad)" />
    <path d="M12 4C9 8 15 8 12 4ZM4 12C8 9 8 15 4 12ZM20 12C16 9 16 15 20 12ZM12 20C9 16 15 16 12 20Z" fill="#ffe29a" />
  </svg>
);

export const LanternIcon = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 1V4M8 4H16L19 10L16 16H8L5 10L8 4ZM9 16V22M15 16V22M12 16V23" stroke="#f7c948" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <polygon points="10,8 14,8 15,12 14,14 10,14 9,12" fill="#ff9a2e" opacity="0.8" />
  </svg>
);

export const GiftOfferTagIcon = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M20.59 13.41L13.42 20.58C12.64 21.36 11.37 21.36 10.59 20.58L2.5 12.5V2H13L20.59 9.59C21.37 10.37 21.37 11.64 20.59 13.41Z" stroke="#f7c948" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(247, 201, 72, 0.15)" />
    <circle cx="7" cy="7" r="2" fill="#ffe29a" />
  </svg>
);

export const RupeeCoinIcon = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" stroke="#f7c948" strokeWidth="2" fill="rgba(247, 201, 72, 0.2)" />
    <path d="M8 7H15M8 10H14M8 7V13C10.5 13 12.5 12 13 10M11 13L15 18" stroke="#ffe29a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const StarburstBadgeSvg = ({ className = '' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="starburstGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffe29a" />
        <stop offset="50%" stopColor="#f7c948" />
        <stop offset="100%" stopColor="#ff9a2e" />
      </linearGradient>
    </defs>
    <path
      d="M50 0L57 15L73 7L74 24L91 22L86 38L100 44L89 56L99 67L84 73L87 90L71 88L67 104L52 94L42 103L35 88L19 92L21 75L5 72L12 57L0 49L12 39L5 25L21 24L21 8L36 13L46 1L50 0Z"
      fill="url(#starburstGrad)"
      filter="drop-shadow(0 2px 8px rgba(0,0,0,0.4))"
    />
  </svg>
);

export const MandalaWatermarkSvg = ({ className = '' }) => (
  <svg
    viewBox="0 0 800 800"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="400" cy="400" r="380" stroke="#f7c948" strokeWidth="2" strokeDasharray="6 6" />
    <circle cx="400" cy="400" r="340" stroke="#f7c948" strokeWidth="1.5" />
    <circle cx="400" cy="400" r="280" stroke="#f7c948" strokeWidth="2" strokeDasharray="12 8" />
    <circle cx="400" cy="400" r="220" stroke="#f7c948" strokeWidth="1.5" />
    <circle cx="400" cy="400" r="160" stroke="#f7c948" strokeWidth="2" />
    <circle cx="400" cy="400" r="100" stroke="#f7c948" strokeWidth="1.5" />
    <circle cx="400" cy="400" r="40" stroke="#f7c948" strokeWidth="2" fill="rgba(247, 201, 72, 0.1)" />
    {/* 16 Radial Petals */}
    {Array.from({ length: 16 }).map((_, i) => (
      <g key={i} transform={`rotate(${i * 22.5} 400 400)`}>
        <path d="M400 120 C370 200 430 200 400 120 Z" stroke="#ffe29a" strokeWidth="1.5" />
        <path d="M400 220 C380 270 420 270 400 220 Z" stroke="#f7c948" strokeWidth="1.5" />
        <line x1="400" y1="40" x2="400" y2="100" stroke="#f7c948" strokeWidth="1.5" />
      </g>
    ))}
  </svg>
);
