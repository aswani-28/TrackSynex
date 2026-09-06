import { useEffect, useState } from 'react';
import TracksynexLogo from './TracksynexLogo';

const CinematicIntro = ({ onComplete, replayTrigger = 0 }) => {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Plays on initial open and every page refresh
  const [visible, setVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [telemetryText, setTelemetryText] = useState('CORRIDOR CLEAR • TRAIN DEPARTING...');
  const [trainTransform, setTrainTransform] = useState({
    x: -600,
    y: 0,
    scale: 1,
    opacity: 0,
  });

  // Reset when replayTrigger updates
  useEffect(() => {
    if (replayTrigger > 0) {
      setVisible(true);
      setIsExiting(false);
      setTelemetryText('CORRIDOR CLEAR • TRAIN DEPARTING...');
    }
  }, [replayTrigger]);

  useEffect(() => {
    if (!visible || prefersReducedMotion) {
      if (prefersReducedMotion) {
        setVisible(false);
        onComplete?.();
      }
      return undefined;
    }

    let animationFrameId;
    const startTime = performance.now();
    const duration = 2600; // total 2.6s journey

    const t1 = setTimeout(() => {
      setTelemetryText('HIGH-SPEED TRANSIT IN PROGRESS...');
    }, 700);

    const t2 = setTimeout(() => {
      setTelemetryText('DOCKING INTO TRACKSYNEX RAIL COMMAND...');
    }, 1600);

    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2800);

    const finishTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 3200);

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Target logo position on the left of TRACKSYNEX title
      const logoEl =
        document.querySelector('[data-intro-brand-destination="true"] .logo-mark') ||
        document.getElementById('tracksynex-logo-anchor') ||
        document.querySelector('.logo-mark');

      const targetRect = logoEl ? logoEl.getBoundingClientRect() : { left: 24, top: 22, width: 48, height: 48 };

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Track height in lower half
      const trackY = vh * 0.58;

      let currentX = 0;
      let currentY = 0;
      let currentScale = 1;
      let opacity = 1;

      if (progress < 0.55) {
        // Phase 1: High-speed sweep from far left to right along the tracks
        const p1 = progress / 0.55;
        // Ease in-out fast
        const eased1 = p1 < 0.5 ? 2 * p1 * p1 : 1 - Math.pow(-2 * p1 + 2, 2) / 2;
        currentX = -450 + (vw * 0.52 - (-450)) * eased1;
        currentY = trackY;
        currentScale = 0.85 + 0.15 * Math.sin(p1 * Math.PI);
        opacity = Math.min(p1 * 3, 1);
      } else {
        // Phase 2: Curving smoothly from right toward the logo on the left of TRACKSYNEX
        const p2 = (progress - 0.55) / 0.45;
        // Smooth cubic ease out
        const eased2 = 1 - Math.pow(1 - p2, 3);

        const startX = vw * 0.52;
        const startY = trackY;
        const targetX = targetRect.left;
        const targetY = targetRect.top;

        // Curve path upwards toward the logo
        currentX = startX + (targetX - startX) * eased2;
        currentY = startY + (targetY - startY) * eased2;

        // Smoothly shrink to settle into the logo size
        currentScale = 0.95 - (0.95 - 0.18) * eased2;
        opacity = 1;
      }

      setTrainTransform({
        x: currentX,
        y: currentY,
        scale: currentScale,
        opacity,
      });

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [visible, prefersReducedMotion, onComplete, replayTrigger]);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 250);
  };

  if (!visible) return null;

  return (
    <div
      className={`cinematic-train-overlay ${isExiting ? 'fade-out' : ''} ${prefersReducedMotion ? 'reduced-motion' : ''}`}
      aria-live="polite"
      aria-label="Tracksynex high-speed train opening animation"
    >
      <button
        type="button"
        className="intro-skip-button"
        onClick={handleSkip}
        aria-label="Skip intro animation"
      >
        <span>Skip to Dashboard</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>

      <div className="train-cinematic-stage" aria-hidden="true">
        {/* Starry Night Sky & Distance Gradient */}
        <div className="train-scene-stars" />
        <div className="train-scene-horizon-glow" />

        {/* Overhead Electrified Catenary (OHE) Wire Structure */}
        <div className="train-catenary-system">
          <div className="catenary-wire catenary-contact-wire" />
          <div className="catenary-wire catenary-messenger-wire" />
          <div className="catenary-mast catenary-mast-1" />
          <div className="catenary-mast catenary-mast-2" />
          <div className="catenary-mast catenary-mast-3" />
        </div>

        {/* 3D Perspective Railway Tracks with Cross-Ties */}
        <div className="perspective-track-bed">
          <div className="ballast-gradient" />
          <div className="perspective-sleepers-container">
            <div className="moving-sleepers" />
          </div>
          <div className="perspective-rail rail-left" />
          <div className="perspective-rail rail-right" />
          <div className="perspective-rail-center-glow" />
        </div>

        {/* Trackside Signal Changing Yellow to Green */}
        <div className="trackside-signal-post">
          <div className="signal-housing">
            <span className="signal-aspect aspect-amber" />
            <span className="signal-aspect aspect-green active" />
          </div>
        </div>

        {/* High-Speed Aerodynamic Bullet Train with Volumetric Headlights */}
        <div
          className="high-speed-train-rig dynamic-trajectory"
          style={{
            transform: `translate3d(${trainTransform.x}px, ${trainTransform.y}px, 0) scale(${trainTransform.scale})`,
            opacity: trainTransform.opacity,
            transformOrigin: 'top left',
          }}
        >
          {/* Volumetric Headlight Cones sweeping track and foreground */}
          <div className="volumetric-light-cone left-beam" />
          <div className="volumetric-light-cone right-beam" />
          <div className="volumetric-ground-pool" />

          {/* High-Fidelity Bullet Train SVG */}
          <svg
            className="bullet-train-svg"
            viewBox="0 0 820 260"
            role="presentation"
          >
            <defs>
              <linearGradient id="intro-train-body-grad" x1="0%" y1="20%" x2="100%" y2="80%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="25%" stopColor="#e2e8f0" />
                <stop offset="65%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0c4a6e" />
              </linearGradient>

              <linearGradient id="intro-speed-stripe" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="40%" stopColor="#38bdf8" />
                <stop offset="85%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>

              <linearGradient id="intro-window-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.85" />
              </linearGradient>

              <filter id="intro-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="glow" />
                <feComposite in="SourceGraphic" in2="glow" operator="over" />
              </filter>
            </defs>

            {/* Aerodynamic Roof & Pantograph with electric arc sparks */}
            <g className="train-roof-assembly">
              <path
                d="M320 80 L370 40 L450 40 L500 80 M410 40 L410 80"
                stroke="#38bdf8"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="410" cy="38" r="7" fill="#38bdf8" filter="url(#intro-glow)" className="pantograph-spark" />
            </g>

            {/* Main Aerodynamic Train Silhouette */}
            <path
              d="M60 90 Q220 85 480 85 Q640 85 740 145 Q790 175 810 205 L800 220 L60 220 Z"
              fill="url(#intro-train-body-grad)"
              className="train-main-hull"
            />

            {/* Aerodynamic Speed S-Curve Stripe (Vande Bharat / Bullet train livery) */}
            <path
              d="M60 170 Q450 170 660 170 Q740 175 795 208 L785 218 Q730 188 640 185 L60 185 Z"
              fill="url(#intro-speed-stripe)"
            />

            {/* Tinted Cockpit Windshield */}
            <path
              d="M650 105 Q725 120 755 152 L730 156 Q695 130 635 120 Z"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />

            {/* Passenger Coach Windows with Warm Ambient Illumination */}
            <g className="train-cabin-windows">
              <rect x="100" y="112" width="70" height="34" rx="6" fill="url(#intro-window-glow)" />
              <rect x="195" y="112" width="70" height="34" rx="6" fill="url(#intro-window-glow)" />
              <rect x="290" y="112" width="70" height="34" rx="6" fill="url(#intro-window-glow)" />
              <rect x="385" y="112" width="70" height="34" rx="6" fill="url(#intro-window-glow)" />
              <rect x="480" y="112" width="70" height="34" rx="6" fill="url(#intro-window-glow)" />
              <rect x="575" y="112" width="55" height="34" rx="6" fill="url(#intro-window-glow)" />
            </g>

            {/* Lower Skirt & Aerodynamic Fairing */}
            <rect x="60" y="220" width="740" height="24" rx="4" fill="#090d16" />

            {/* High-Intensity Dual LED Headlights */}
            <g className="train-headlights">
              <circle cx="802" cy="198" r="9" fill="#ffffff" filter="url(#intro-glow)" />
              <circle cx="802" cy="198" r="4.5" fill="#38bdf8" />
              <circle cx="770" cy="208" r="7" fill="#ffffff" filter="url(#intro-glow)" />
              <circle cx="770" cy="208" r="3.5" fill="#38bdf8" />
            </g>

            {/* Rotating Bogie Wheels */}
            <g className="train-bogies">
              <circle cx="160" cy="242" r="15" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
              <circle cx="230" cy="242" r="15" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
              <circle cx="490" cy="242" r="15" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
              <circle cx="560" cy="242" r="15" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
              <circle cx="710" cy="242" r="15" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
            </g>
          </svg>

          {/* Rail Friction Sparks */}
          <div className="wheel-sparks spark-bogie-1" />
          <div className="wheel-sparks spark-bogie-2" />
          <div className="wheel-sparks spark-bogie-3" />
        </div>

        {/* High-Speed Streaks & Velocity Trails */}
        <div className="speed-streak streak-1" />
        <div className="speed-streak streak-2" />
        <div className="speed-streak streak-3" />
        <div className="speed-streak streak-4" />
        <div className="speed-streak streak-5" />

        {/* Central Brand & Telemetry Display */}
        <div className="intro-branding-pod">
          <div className="intro-brand-logo-wrap">
            <TracksynexLogo />
          </div>
          <div className="intro-telemetry-badge">
            <span className="telemetry-live-dot" />
            <span className="telemetry-text">{telemetryText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CinematicIntro;
