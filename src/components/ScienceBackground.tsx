"use client";

export function ScienceBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
    >
      {/* ═══════════════════════════════════════════════════
          ATOMS — large orbital shapes floating around
         ═══════════════════════════════════════════════════ */}

      {/* Atom 1 — big, top-left */}
      <svg className="sb-orbit sb-orbit-1" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="8" className="sb-nucleus" />
        <ellipse cx="100" cy="100" rx="90" ry="30" className="sb-ring" />
        <ellipse cx="100" cy="100" rx="90" ry="30" className="sb-ring" transform="rotate(60 100 100)" />
        <ellipse cx="100" cy="100" rx="90" ry="30" className="sb-ring" transform="rotate(-60 100 100)" />
        <circle cx="190" cy="100" r="5" className="sb-electron" />
        <circle cx="55" cy="22" r="5" className="sb-electron" />
        <circle cx="55" cy="178" r="5" className="sb-electron" />
      </svg>

      {/* Atom 2 — medium, right side */}
      <svg className="sb-orbit sb-orbit-2" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="7" className="sb-nucleus" />
        <ellipse cx="100" cy="100" rx="85" ry="28" className="sb-ring" />
        <ellipse cx="100" cy="100" rx="85" ry="28" className="sb-ring" transform="rotate(60 100 100)" />
        <ellipse cx="100" cy="100" rx="85" ry="28" className="sb-ring" transform="rotate(-60 100 100)" />
        <circle cx="185" cy="100" r="4.5" className="sb-electron" />
        <circle cx="57" cy="24" r="4.5" className="sb-electron" />
        <circle cx="57" cy="176" r="4.5" className="sb-electron" />
      </svg>

      {/* Atom 3 — small, bottom-left */}
      <svg className="sb-orbit sb-orbit-3" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="6" className="sb-nucleus" />
        <ellipse cx="100" cy="100" rx="80" ry="25" className="sb-ring" />
        <ellipse cx="100" cy="100" rx="80" ry="25" className="sb-ring" transform="rotate(60 100 100)" />
        <ellipse cx="100" cy="100" rx="80" ry="25" className="sb-ring" transform="rotate(-60 100 100)" />
        <circle cx="180" cy="100" r="4" className="sb-electron" />
        <circle cx="60" cy="26" r="4" className="sb-electron" />
        <circle cx="60" cy="174" r="4" className="sb-electron" />
      </svg>

      {/* Atom 4 — tiny, center-right */}
      <svg className="sb-orbit sb-orbit-4" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="5" className="sb-nucleus" />
        <ellipse cx="100" cy="100" rx="75" ry="22" className="sb-ring" />
        <ellipse cx="100" cy="100" rx="75" ry="22" className="sb-ring" transform="rotate(60 100 100)" />
        <ellipse cx="100" cy="100" rx="75" ry="22" className="sb-ring" transform="rotate(-60 100 100)" />
        <circle cx="175" cy="100" r="3.5" className="sb-electron" />
        <circle cx="62" cy="28" r="3.5" className="sb-electron" />
        <circle cx="62" cy="172" r="3.5" className="sb-electron" />
      </svg>

      {/* Atom 5 — small, top-center */}
      <svg className="sb-orbit sb-orbit-5" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="5" className="sb-nucleus" />
        <ellipse cx="100" cy="100" rx="70" ry="20" className="sb-ring" />
        <ellipse cx="100" cy="100" rx="70" ry="20" className="sb-ring" transform="rotate(60 100 100)" />
        <ellipse cx="100" cy="100" rx="70" ry="20" className="sb-ring" transform="rotate(-60 100 100)" />
        <circle cx="170" cy="100" r="3.5" className="sb-electron" />
        <circle cx="65" cy="29" r="3.5" className="sb-electron" />
        <circle cx="65" cy="171" r="3.5" className="sb-electron" />
      </svg>

      {/* Atom 6 — medium, bottom-right */}
      <svg className="sb-orbit sb-orbit-6" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="6" className="sb-nucleus" />
        <ellipse cx="100" cy="100" rx="82" ry="26" className="sb-ring" />
        <ellipse cx="100" cy="100" rx="82" ry="26" className="sb-ring" transform="rotate(60 100 100)" />
        <ellipse cx="100" cy="100" rx="82" ry="26" className="sb-ring" transform="rotate(-60 100 100)" />
        <circle cx="182" cy="100" r="4" className="sb-electron" />
        <circle cx="59" cy="25" r="4" className="sb-electron" />
        <circle cx="59" cy="175" r="4" className="sb-electron" />
      </svg>

      {/* ═══════════════════════════════════════════════════
          DNA DOUBLE HELICES — tall twisted strands
         ═══════════════════════════════════════════════════ */}

      {/* DNA 1 — left side, tall */}
      <svg className="sb-helix sb-helix-1" viewBox="0 0 80 500" fill="none">
        <path d="M15,0 Q55,25 15,50 Q-25,75 15,100 Q55,125 15,150 Q-25,175 15,200 Q55,225 15,250 Q-25,275 15,300 Q55,325 15,350 Q-25,375 15,400 Q55,425 15,450 Q-25,475 15,500" className="sb-strand" />
        <path d="M65,0 Q25,25 65,50 Q105,75 65,100 Q25,125 65,150 Q105,175 65,200 Q25,225 65,250 Q105,275 65,300 Q25,325 65,350 Q105,375 65,400 Q25,425 65,450 Q105,475 65,500" className="sb-strand" />
        {[25, 75, 125, 175, 225, 275, 325, 375, 425, 475].map((y) => (
          <line key={y} x1="25" y1={y} x2="55" y2={y} className="sb-rung" />
        ))}
      </svg>

      {/* DNA 2 — right side, tall */}
      <svg className="sb-helix sb-helix-2" viewBox="0 0 80 500" fill="none">
        <path d="M15,0 Q55,25 15,50 Q-25,75 15,100 Q55,125 15,150 Q-25,175 15,200 Q55,225 15,250 Q-25,275 15,300 Q55,325 15,350 Q-25,375 15,400 Q55,425 15,450 Q-25,475 15,500" className="sb-strand" />
        <path d="M65,0 Q25,25 65,50 Q105,75 65,100 Q25,125 65,150 Q105,175 65,200 Q25,225 65,250 Q105,275 65,300 Q25,325 65,350 Q105,375 65,400 Q25,425 65,450 Q105,475 65,500" className="sb-strand" />
        {[25, 75, 125, 175, 225, 275, 325, 375, 425, 475].map((y) => (
          <line key={y} x1="25" y1={y} x2="55" y2={y} className="sb-rung" />
        ))}
      </svg>

      {/* DNA 3 — center, shorter */}
      <svg className="sb-helix sb-helix-3" viewBox="0 0 80 350" fill="none">
        <path d="M15,0 Q55,20 15,40 Q-20,60 15,80 Q55,100 15,120 Q-20,140 15,160 Q55,180 15,200 Q-20,220 15,240 Q55,260 15,280 Q-20,300 15,320 Q55,340 15,350" className="sb-strand" />
        <path d="M65,0 Q25,20 65,40 Q100,60 65,80 Q25,100 65,120 Q100,140 65,160 Q25,180 65,200 Q100,220 65,240 Q25,260 65,280 Q100,300 65,320 Q25,340 65,350" className="sb-strand" />
        {[20, 60, 100, 140, 180, 220, 260, 300, 340].map((y) => (
          <line key={y} x1="25" y1={y} x2="55" y2={y} className="sb-rung" />
        ))}
      </svg>

      {/* DNA 4 — far right, medium */}
      <svg className="sb-helix sb-helix-4" viewBox="0 0 80 400" fill="none">
        <path d="M15,0 Q55,22 15,44 Q-22,66 15,88 Q55,110 15,132 Q-22,154 15,176 Q55,198 15,220 Q-22,242 15,264 Q55,286 15,308 Q-22,330 15,352 Q55,374 15,400" className="sb-strand" />
        <path d="M65,0 Q25,22 65,44 Q102,66 65,88 Q25,110 65,132 Q102,154 65,176 Q25,198 65,220 Q102,242 65,264 Q25,286 65,308 Q102,330 65,352 Q25,374 65,400" className="sb-strand" />
        {[22, 66, 110, 154, 198, 242, 286, 330, 374].map((y) => (
          <line key={y} x1="25" y1={y} x2="55" y2={y} className="sb-rung" />
        ))}
      </svg>

      {/* ═══════════════════════════════════════════════════
          MOLECULES — hexagonal benzene rings + bonds
         ═══════════════════════════════════════════════════ */}

      {/* Benzene ring 1 — top right */}
      <svg className="sb-molecule sb-molecule-1" viewBox="0 0 100 100" fill="none">
        <polygon points="50,10 85,27.5 85,72.5 50,90 15,72.5 15,27.5" className="sb-hex" />
        <polygon points="50,25 70,35 70,65 50,75 30,65 30,35" className="sb-hex-inner" />
      </svg>

      {/* Benzene ring 2 — bottom center */}
      <svg className="sb-molecule sb-molecule-2" viewBox="0 0 100 100" fill="none">
        <polygon points="50,10 85,27.5 85,72.5 50,90 15,72.5 15,27.5" className="sb-hex" />
        <polygon points="50,25 70,35 70,65 50,75 30,65 30,35" className="sb-hex-inner" />
      </svg>

      {/* Molecule with bonds — left center */}
      <svg className="sb-molecule sb-molecule-3" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="8" className="sb-atom-ball" />
        <circle cx="30" cy="30" r="6" className="sb-atom-ball" />
        <circle cx="90" cy="30" r="6" className="sb-atom-ball" />
        <circle cx="30" cy="90" r="6" className="sb-atom-ball" />
        <circle cx="90" cy="90" r="6" className="sb-atom-ball" />
        <line x1="60" y1="60" x2="30" y2="30" className="sb-bond" />
        <line x1="60" y1="60" x2="90" y2="30" className="sb-bond" />
        <line x1="60" y1="60" x2="30" y2="90" className="sb-bond" />
        <line x1="60" y1="60" x2="90" y2="90" className="sb-bond" />
      </svg>

      {/* Small water molecule — top left area */}
      <svg className="sb-molecule sb-molecule-4" viewBox="0 0 100 80" fill="none">
        <circle cx="50" cy="30" r="10" className="sb-atom-ball sb-oxygen" />
        <circle cx="25" cy="60" r="7" className="sb-atom-ball sb-hydrogen" />
        <circle cx="75" cy="60" r="7" className="sb-atom-ball sb-hydrogen" />
        <line x1="50" y1="30" x2="25" y2="60" className="sb-bond" />
        <line x1="50" y1="30" x2="75" y2="60" className="sb-bond" />
      </svg>

      {/* ═══════════════════════════════════════════════════
          INLINE STYLES — all animations + dark mode colors
         ═══════════════════════════════════════════════════ */}
      <style>{`
        /* ── Base colors (light mode) ─────────────────── */
        .sb-nucleus { fill: #0F6E63; opacity: 0.6; }
        .sb-ring { stroke: #0F6E63; stroke-width: 1.2; opacity: 0.35; }
        .sb-electron { fill: #14A894; opacity: 0.7; }
        .sb-strand { stroke: #0F6E63; stroke-width: 1.8; opacity: 0.3; }
        .sb-rung { stroke: #14A894; stroke-width: 1; opacity: 0.2; }
        .sb-hex { stroke: #1B4B66; stroke-width: 2; opacity: 0.25; }
        .sb-hex-inner { stroke: #1B4B66; stroke-width: 1.5; opacity: 0.15; stroke-dasharray: 4 3; }
        .sb-atom-ball { fill: #0F6E63; opacity: 0.3; }
        .sb-atom-ball.sb-oxygen { fill: #ef4444; opacity: 0.25; }
        .sb-atom-ball.sb-hydrogen { fill: #3b82f6; opacity: 0.25; }
        .sb-bond { stroke: #0F6E63; stroke-width: 2; opacity: 0.2; }

        /* ── Dark mode colors ─────────────────────────── */
        :root:where(.dark, .dark *) .sb-nucleus { fill: #14A894; opacity: 0.5; }
        :root:where(.dark, .dark *) .sb-ring { stroke: #14A894; opacity: 0.3; }
        :root:where(.dark, .dark *) .sb-electron { fill: #5eead4; opacity: 0.6; }
        :root:where(.dark, .dark *) .sb-strand { stroke: #14A894; opacity: 0.25; }
        :root:where(.dark, .dark *) .sb-rung { stroke: #5eead4; opacity: 0.18; }
        :root:where(.dark, .dark *) .sb-hex { stroke: #5eead4; opacity: 0.2; }
        :root:where(.dark, .dark *) .sb-hex-inner { stroke: #5eead4; opacity: 0.12; }
        :root:where(.dark, .dark *) .sb-atom-ball { fill: #14A894; opacity: 0.25; }
        :root:where(.dark, .dark *) .sb-atom-ball.sb-oxygen { fill: #f87171; opacity: 0.2; }
        :root:where(.dark, .dark *) .sb-atom-ball.sb-hydrogen { fill: #60a5fa; opacity: 0.2; }
        :root:where(.dark, .dark *) .sb-bond { stroke: #14A894; opacity: 0.18; }

        /* ── Atom orbital animations ──────────────────── */
        @keyframes sb-float-a {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25%      { transform: translate(12px, -18px) rotate(5deg); }
          50%      { transform: translate(-8px, -30px) rotate(-3deg); }
          75%      { transform: translate(15px, -10px) rotate(4deg); }
        }
        @keyframes sb-float-b {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25%      { transform: translate(-15px, 12px) rotate(-4deg); }
          50%      { transform: translate(10px, 25px) rotate(3deg); }
          75%      { transform: translate(-12px, 8px) rotate(-5deg); }
        }
        @keyframes sb-float-c {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33%      { transform: translate(18px, -14px) rotate(6deg); }
          66%      { transform: translate(-10px, 20px) rotate(-4deg); }
        }
        @keyframes sb-spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ── Atom positions + animation assignments ──── */
        .sb-orbit-1 {
          position: absolute; top: 5%; left: 6%;
          width: 220px; height: 220px;
          animation: sb-float-a 18s ease-in-out infinite, sb-spin-slow 40s linear infinite;
        }
        .sb-orbit-2 {
          position: absolute; top: 30%; right: 5%;
          width: 180px; height: 180px;
          animation: sb-float-b 22s ease-in-out infinite, sb-spin-slow 50s linear infinite reverse;
        }
        .sb-orbit-3 {
          position: absolute; bottom: 10%; left: 12%;
          width: 150px; height: 150px;
          animation: sb-float-c 20s ease-in-out infinite, sb-spin-slow 35s linear infinite;
        }
        .sb-orbit-4 {
          position: absolute; top: 55%; right: 18%;
          width: 120px; height: 120px;
          animation: sb-float-a 25s ease-in-out infinite, sb-spin-slow 45s linear infinite reverse;
        }
        .sb-orbit-5 {
          position: absolute; top: 8%; left: 42%;
          width: 130px; height: 130px;
          animation: sb-float-b 19s ease-in-out infinite, sb-spin-slow 38s linear infinite;
        }
        .sb-orbit-6 {
          position: absolute; bottom: 18%; right: 10%;
          width: 160px; height: 160px;
          animation: sb-float-c 23s ease-in-out infinite, sb-spin-slow 42s linear infinite reverse;
        }

        /* ── DNA helix animations ─────────────────────── */
        @keyframes sb-drift-down {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(30px) rotate(1.5deg); }
        }
        @keyframes sb-drift-up {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-25px) rotate(-1deg); }
        }

        .sb-helix-1 {
          position: absolute; top: 2%; left: 2%;
          width: 80px; height: 500px;
          animation: sb-drift-down 28s ease-in-out infinite;
        }
        .sb-helix-2 {
          position: absolute; top: 20%; right: 1%;
          width: 75px; height: 480px;
          animation: sb-drift-up 32s ease-in-out infinite;
        }
        .sb-helix-3 {
          position: absolute; bottom: 5%; left: 38%;
          width: 65px; height: 350px;
          animation: sb-drift-down 25s ease-in-out infinite;
        }
        .sb-helix-4 {
          position: absolute; top: 45%; right: 6%;
          width: 60px; height: 400px;
          animation: sb-drift-up 30s ease-in-out infinite;
        }

        /* ── Molecule animations ──────────────────────── */
        @keyframes sb-molecule-float {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          25%      { transform: translate(8px, -12px) rotate(8deg) scale(1.03); }
          50%      { transform: translate(-6px, -20px) rotate(-5deg) scale(0.97); }
          75%      { transform: translate(10px, -8px) rotate(3deg) scale(1.02); }
        }
        @keyframes sb-molecule-float-alt {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33%      { transform: translate(-10px, 15px) rotate(-6deg); }
          66%      { transform: translate(12px, -10px) rotate(4deg); }
        }

        .sb-molecule-1 {
          position: absolute; top: 12%; right: 15%;
          width: 100px; height: 100px;
          animation: sb-molecule-float 20s ease-in-out infinite;
        }
        .sb-molecule-2 {
          position: absolute; bottom: 15%; left: 30%;
          width: 90px; height: 90px;
          animation: sb-molecule-float-alt 24s ease-in-out infinite;
        }
        .sb-molecule-3 {
          position: absolute; top: 50%; left: 8%;
          width: 110px; height: 110px;
          animation: sb-molecule-float 22s ease-in-out infinite;
        }
        .sb-molecule-4 {
          position: absolute; top: 3%; right: 35%;
          width: 90px; height: 72px;
          animation: sb-molecule-float-alt 18s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
