"use client";

/** Corner cobweb, drawn as radial spokes + sagging concentric threads. */
export function Cobweb({
  className = "",
  size = 220,
  flip = false,
  flipY = false,
}: {
  className?: string;
  size?: number;
  flip?: boolean;
  flipY?: boolean;
}) {
  const spokes = 7;
  const rings = 7;
  const R = 200;
  const angles = Array.from({ length: spokes }, (_, i) => (i / (spokes - 1)) * (Math.PI / 2));

  const ringPaths = Array.from({ length: rings }, (_, r) => {
    const rad = (R / rings) * (r + 1);
    let d = "";
    angles.forEach((a, i) => {
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) {
        d += `M ${x} ${y}`;
      } else {
        const pa = angles[i - 1];
        const mid = (a + pa) / 2;
        // sag toward the corner between spokes
        const sag = rad * 0.82;
        d += ` Q ${Math.cos(mid) * sag} ${Math.sin(mid) * sag} ${x} ${y}`;
      }
    });
    return d;
  });

  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`hw-web pointer-events-none ${className}`}
      style={{
        transform: `scale(${flip ? -1 : 1}, ${flipY ? -1 : 1})`,
        transformOrigin: "center",
      }}
    >
      <defs>
        <filter id="web-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g stroke="rgba(226, 215, 255, 0.55)" strokeWidth="0.7" fill="none" filter="url(#web-glow)">
        {angles.map((a, i) => (
          <line key={i} x1="0" y1="0" x2={Math.cos(a) * R * 1.05} y2={Math.sin(a) * R * 1.05} />
        ))}
        {ringPaths.map((d, i) => (
          <path key={i} d={d} strokeOpacity={1 - i * 0.08} />
        ))}
      </g>
      {/* dew drops */}
      <g fill="rgba(255, 200, 140, 0.8)">
        <circle cx="62" cy="38" r="1.4" />
        <circle cx="110" cy="96" r="1.2" />
        <circle cx="40" cy="120" r="1.1" />
      </g>
    </svg>
  );
}

/** A spider hanging from a silk thread. `drop` lengthens the thread. */
export function HangingSpider({
  className = "",
  length = 120,
  size = 46,
  delay = 0,
}: {
  className?: string;
  length?: number;
  size?: number;
  delay?: number;
}) {
  return (
    <div aria-hidden className={`pointer-events-none absolute top-0 flex flex-col items-center ${className}`}>
      <div
        className="hw-spider-thread w-px bg-gradient-to-b from-white/10 via-white/50 to-white/70"
        style={{ height: length }}
      />
      <div className="hw-spider -mt-1" style={{ animationDelay: `${delay}s` }}>
        <svg width={size} height={size} viewBox="0 0 60 60" className="drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]">
          <g className="hw-spider-legs" stroke="#0b0612" strokeWidth="2.4" strokeLinecap="round" fill="none">
            {/* left legs */}
            <path d="M24 28 Q12 18 6 24" />
            <path d="M24 31 Q10 28 4 34" />
            <path d="M24 34 Q12 38 6 46" />
            <path d="M25 37 Q16 46 12 54" />
            {/* right legs */}
            <path d="M36 28 Q48 18 54 24" />
            <path d="M36 31 Q50 28 56 34" />
            <path d="M36 34 Q48 38 54 46" />
            <path d="M35 37 Q44 46 48 54" />
          </g>
          {/* abdomen */}
          <ellipse cx="30" cy="38" rx="10" ry="12" fill="#120a1c" stroke="#3b1f5c" strokeWidth="1" />
          {/* hourglass */}
          <path d="M27 34 L33 34 L30 38 L33 42 L27 42 L30 38 Z" fill="#ff5e1a" />
          {/* head */}
          <circle cx="30" cy="24" r="6.5" fill="#120a1c" stroke="#3b1f5c" strokeWidth="1" />
          {/* eyes */}
          <circle cx="27.5" cy="23" r="1.6" fill="#ff3b1f" />
          <circle cx="32.5" cy="23" r="1.6" fill="#ff3b1f" />
          <circle cx="27.8" cy="22.6" r="0.5" fill="#fff" />
          <circle cx="32.8" cy="22.6" r="0.5" fill="#fff" />
        </svg>
      </div>
    </div>
  );
}

export function BatSVG({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={`pointer-events-none ${className}`}
      style={style}
    >
      <path d="M 50 45 Q 60 40 75 45 Q 90 20 95 30 Q 80 50 90 70 Q 75 60 65 70 Q 55 55 50 65 Q 45 55 35 70 Q 25 60 10 70 Q 20 50 5 30 Q 10 20 25 45 Q 40 40 50 45 Z" />
    </svg>
  );
}
