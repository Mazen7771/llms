"use client";

export function ScienceBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
    >
      {/* ── Atoms (chemistry) ───────────────────────────── */}
      {/* Atom 1 — large, top-left */}
      <svg
        className="science-float-1"
        style={{
          position: "absolute",
          top: "8%",
          left: "10%",
          width: 160,
          height: 160,
          opacity: 0.07,
          color: "currentColor",
        }}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
      >
        {/* nucleus */}
        <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.5" />
        {/* 3 electron orbits at different tilts */}
        <ellipse cx="50" cy="50" rx="40" ry="16" />
        <ellipse cx="50" cy="50" rx="40" ry="16" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="50" rx="40" ry="16" transform="rotate(-60 50 50)" />
        {/* electrons */}
        <circle cx="90" cy="50" r="2.5" fill="currentColor" />
        <circle cx="30" cy="18" r="2.5" fill="currentColor" />
        <circle cx="30" cy="82" r="2.5" fill="currentColor" />
      </svg>

      {/* Atom 2 — medium, mid-right */}
      <svg
        className="science-float-2"
        style={{
          position: "absolute",
          top: "35%",
          right: "8%",
          width: 120,
          height: 120,
          opacity: 0.09,
          color: "currentColor",
        }}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
      >
        <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.5" />
        <ellipse cx="50" cy="50" rx="40" ry="14" />
        <ellipse cx="50" cy="50" rx="40" ry="14" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="50" rx="40" ry="14" transform="rotate(-60 50 50)" />
        <circle cx="90" cy="50" r="2.5" fill="currentColor" />
        <circle cx="30" cy="16" r="2.5" fill="currentColor" />
        <circle cx="30" cy="84" r="2.5" fill="currentColor" />
      </svg>

      {/* Atom 3 — small, bottom-left */}
      <svg
        className="science-float-3"
        style={{
          position: "absolute",
          bottom: "12%",
          left: "18%",
          width: 90,
          height: 90,
          opacity: 0.06,
          color: "currentColor",
        }}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
      >
        <circle cx="50" cy="50" r="5" fill="currentColor" opacity="0.5" />
        <ellipse cx="50" cy="50" rx="38" ry="15" />
        <ellipse cx="50" cy="50" rx="38" ry="15" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="50" rx="38" ry="15" transform="rotate(-60 50 50)" />
        <circle cx="88" cy="50" r="2.5" fill="currentColor" />
        <circle cx="31" cy="17" r="2.5" fill="currentColor" />
        <circle cx="31" cy="83" r="2.5" fill="currentColor" />
      </svg>

      {/* Atom 4 — small, top-right */}
      <svg
        className="science-float-4"
        style={{
          position: "absolute",
          top: "15%",
          right: "22%",
          width: 80,
          height: 80,
          opacity: 0.05,
          color: "currentColor",
        }}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
      >
        <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.5" />
        <ellipse cx="50" cy="50" rx="38" ry="14" />
        <ellipse cx="50" cy="50" rx="38" ry="14" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="50" rx="38" ry="14" transform="rotate(-60 50 50)" />
        <circle cx="88" cy="50" r="2.5" fill="currentColor" />
        <circle cx="31" cy="17" r="2.5" fill="currentColor" />
        <circle cx="31" cy="83" r="2.5" fill="currentColor" />
      </svg>

      {/* Atom 5 — tiny, center-bottom */}
      <svg
        className="science-float-5"
        style={{
          position: "absolute",
          bottom: "25%",
          right: "35%",
          width: 70,
          height: 70,
          opacity: 0.04,
          color: "currentColor",
        }}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
      >
        <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.5" />
        <ellipse cx="50" cy="50" rx="38" ry="14" />
        <ellipse cx="50" cy="50" rx="38" ry="14" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="50" rx="38" ry="14" transform="rotate(-60 50 50)" />
        <circle cx="88" cy="50" r="2.5" fill="currentColor" />
        <circle cx="31" cy="17" r="2.5" fill="currentColor" />
        <circle cx="31" cy="83" r="2.5" fill="currentColor" />
      </svg>

      {/* ── DNA Double Helices (biology) ────────────────── */}
      {/* DNA 1 — tall, left side */}
      <svg
        className="science-drift-1"
        style={{
          position: "absolute",
          top: "5%",
          left: "5%",
          width: 60,
          height: 320,
          opacity: 0.07,
          color: "currentColor",
        }}
        viewBox="0 0 60 320"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        {/* Left strand (sinusoidal) */}
        <path d="M10,0 Q40,20 10,40 Q-20,60 10,80 Q40,100 10,120 Q-20,140 10,160 Q40,180 10,200 Q-20,220 10,240 Q40,260 10,280 Q-20,300 10,320" />
        {/* Right strand (mirror) */}
        <path d="M50,0 Q20,20 50,40 Q80,60 50,80 Q20,100 50,120 Q80,140 50,160 Q20,180 50,200 Q80,220 50,240 Q20,260 50,280 Q80,300 50,320" />
        {/* Rungs — horizontal connectors every 40px */}
        {[20, 60, 100, 140, 180, 220, 260, 300].map((y) => (
          <line key={y} x1="20" y1={y} x2="40" y2={y} strokeWidth="0.6" opacity="0.6" />
        ))}
      </svg>

      {/* DNA 2 — tall, right side */}
      <svg
        className="science-drift-2"
        style={{
          position: "absolute",
          top: "40%",
          right: "3%",
          width: 55,
          height: 300,
          opacity: 0.06,
          color: "currentColor",
        }}
        viewBox="0 0 60 320"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <path d="M10,0 Q40,20 10,40 Q-20,60 10,80 Q40,100 10,120 Q-20,140 10,160 Q40,180 10,200 Q-20,220 10,240 Q40,260 10,280 Q-20,300 10,320" />
        <path d="M50,0 Q20,20 50,40 Q80,60 50,80 Q20,100 50,120 Q80,140 50,160 Q20,180 50,200 Q80,220 50,240 Q20,260 50,280 Q80,300 50,320" />
        {[20, 60, 100, 140, 180, 220, 260, 300].map((y) => (
          <line key={y} x1="20" y1={y} x2="40" y2={y} strokeWidth="0.6" opacity="0.6" />
        ))}
      </svg>

      {/* DNA 3 — short, center area */}
      <svg
        className="science-drift-3"
        style={{
          position: "absolute",
          bottom: "8%",
          left: "45%",
          width: 50,
          height: 200,
          opacity: 0.05,
          color: "currentColor",
        }}
        viewBox="0 0 60 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <path d="M10,0 Q40,15 10,30 Q-10,45 10,60 Q40,75 10,90 Q-10,105 10,120 Q40,135 10,150 Q-10,165 10,180 Q40,195 10,200" />
        <path d="M50,0 Q20,15 50,30 Q70,45 50,60 Q20,75 50,90 Q70,105 50,120 Q20,135 50,150 Q70,165 50,180 Q20,195 50,200" />
        {[15, 45, 75, 105, 135, 165].map((y) => (
          <line key={y} x1="20" y1={y} x2="40" y2={y} strokeWidth="0.6" opacity="0.6" />
        ))}
      </svg>

      {/* ── Inline CSS keyframes ───────────────────────── */}
      <style>{`
        @keyframes scienceFloat1 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-18px) rotate(3deg); }
        }
        @keyframes scienceFloat2 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(14px) rotate(-2deg); }
        }
        @keyframes scienceFloat3 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-12px) rotate(4deg); }
        }
        @keyframes scienceFloat4 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(10px) rotate(-3deg); }
        }
        @keyframes scienceFloat5 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes scienceDrift1 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-25px) rotate(2deg); }
        }
        @keyframes scienceDrift2 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(20px) rotate(-1.5deg); }
        }
        @keyframes scienceDrift3 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-16px) rotate(1deg); }
        }
        .science-float-1 { animation: scienceFloat1 22s ease-in-out infinite; }
        .science-float-2 { animation: scienceFloat2 28s ease-in-out infinite; }
        .science-float-3 { animation: scienceFloat3 20s ease-in-out infinite; }
        .science-float-4 { animation: scienceFloat4 32s ease-in-out infinite; }
        .science-float-5 { animation: scienceFloat5 26s ease-in-out infinite; }
        .science-drift-1 { animation: scienceDrift1 35s ease-in-out infinite; }
        .science-drift-2 { animation: scienceDrift2 40s ease-in-out infinite; }
        .science-drift-3 { animation: scienceDrift3 30s ease-in-out infinite; }

        /* Dark mode: use the dark foreground so shapes show against dark bg */
        :root:where(.dark, .dark *) .science-float-1,
        :root:where(.dark, .dark *) .science-float-2,
        :root:where(.dark, .dark *) .science-float-3,
        :root:where(.dark, .dark *) .science-float-4,
        :root:where(.dark, .dark *) .science-float-5,
        :root:where(.dark, .dark *) .science-drift-1,
        :root:where(.dark, .dark *) .science-drift-2,
        :root:where(.dark, .dark *) .science-drift-3 {
          color: #f8fafc;
        }
      `}</style>
    </div>
  );
}
