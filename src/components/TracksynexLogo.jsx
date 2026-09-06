import { forwardRef } from 'react';

const TracksynexLogo = forwardRef(({ compact = false, brandDestination = false }, ref) => (
  <div
    ref={ref}
    className={`tracksynex-logo ${compact ? 'compact' : ''}`}
    data-intro-brand-destination={brandDestination ? 'true' : undefined}
    aria-label="Tracksynex Railway Operations Intelligence"
  >
    <div className="logo-mark" id="tracksynex-logo-anchor" title="Tracksynex AI Train Operations">
      <svg
        className="logo-glyph"
        viewBox="0 0 128 68"
        role="img"
        aria-label="Modern aerodynamic high-speed bullet train on dual tracks"
      >
        <defs>
          <linearGradient id="train-hull-grad" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="45%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          <linearGradient id="train-accent-stripe" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
            <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>
          <linearGradient id="light-beam" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
          <filter id="headlight-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Dynamic speed motion trails behind train */}
        <g className="logo-speed-trails" opacity="0.6">
          <path d="M4 22h14M2 28h18M6 34h12M1 48h22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Dual steel railway tracks with sleeper cross-ties */}
        <g className="logo-tracks">
          {/* Main running rail */}
          <path d="M12 56h108" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
          {/* Lower ballast / secondary rail */}
          <path d="M16 62h100" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
          {/* Sleepers / ties */}
          <path d="M22 54v10M36 54v10M50 54v10M64 54v10M78 54v10M92 54v10M106 54v10" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
        </g>

        {/* Headlight beam sweeping forward from nose */}
        <path d="M116 42l11-4v10l-11-2Z" fill="url(#light-beam)" opacity="0.85" />

        {/* Aerodynamic Bullet Train Body */}
        <g className="logo-train-body">
          {/* Roof Pantograph */}
          <path d="M42 16l8-6h14l6 6M56 10v6" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.85" />
          
          {/* Main Aerodynamic Shell */}
          <path
            d="M22 16h62c12 0 22 5 28 14l6 12H16l6-10V16Z"
            fill="url(#train-hull-grad)"
          />

          {/* Aerodynamic speed stripe */}
          <path d="M18 36h98l-3-6H22l-4 6Z" fill="url(#train-accent-stripe)" />

          {/* Cabin Windshield & Passenger Windows */}
          <path d="M28 20h14l-3 8H25l3-8Z" fill="#e0f2fe" opacity="0.95" />
          <path d="M47 20h14l-1 8H45l2-8Z" fill="#e0f2fe" opacity="0.95" />
          <path d="M66 20h14l1 8H65l1-8Z" fill="#e0f2fe" opacity="0.95" />
          <path d="M85 20h8c6 0 11 3 15 7l2 1H84l1-8Z" fill="#bae6fd" opacity="0.95" />

          {/* Lower Skirt & Coupler Detail */}
          <path d="M16 42h100l-3 6H19l-3-6Z" fill="#0f172a" opacity="0.75" />

          {/* High-beam LED Headlights */}
          <circle cx="115" cy="41" r="3" fill="#f8fafc" filter="url(#headlight-glow)" />
          <circle cx="115" cy="41" r="1.6" fill="#38bdf8" />
          <circle cx="106" cy="44" r="2" fill="#f8fafc" opacity="0.9" />

          {/* Bogie Wheels */}
          <circle cx="32" cy="50" r="4.5" fill="#0f172a" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="32" cy="50" r="2" fill="#38bdf8" />
          <circle cx="94" cy="50" r="4.5" fill="#0f172a" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="94" cy="50" r="2" fill="#38bdf8" />
        </g>
      </svg>
    </div>

    {!compact && (
      <div className="logo-copy">
        <div className="logo-brand-row">
          <span className="logo-name">TRACKSYNEX</span>
          <span className="logo-rail-badge">RAIL AI</span>
        </div>
        {/* Animated small train running continuously below the title */}
        <div className="brand-mini-rail" aria-hidden="true" title="Live train track monitoring">
          <div className="mini-rail-track" />
          <div className="mini-rail-sleepers" />
          <svg className="mini-rail-train" viewBox="0 0 54 20">
            <path d="M4 14h36c5 0 8-3 10-6l2-4H2l2 6v4Z" fill="#38bdf8" />
            <circle cx="50" cy="8" r="1.8" fill="#f8fafc" />
            <circle cx="10" cy="15" r="2.2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <circle cx="22" cy="15" r="2.2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <circle cx="36" cy="15" r="2.2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <path d="M8 8h5M17 8h5M26 8h5" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
        <span className="logo-subline">AI BLOCK PLANNING SYSTEM</span>
      </div>
    )}
  </div>
));

TracksynexLogo.displayName = 'TracksynexLogo';

export default TracksynexLogo;
