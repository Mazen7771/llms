"use client";

import { useEffect, useState } from "react";

interface LoginBackgroundProps {
  variant: "student" | "teacher";
}

interface Particle {
  left: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
}

/**
 * Random particle positions/sizes are generated ONLY after the component
 * mounts on the client. Generating them in render would produce different
 * values on the server vs. the client, causing a React hydration mismatch
 * that disables interactivity on the whole page ("buttons do nothing").
 */
export function LoginBackground({ variant }: LoginBackgroundProps) {
  const isStudent = variant === "student";
  const primaryColor = isStudent ? "from-primary via-primary/60 to-primary-light" : "from-secondary via-secondary/60 to-primary";
  const secondaryColor = isStudent ? "from-accent/20 via-primary/10 to-transparent" : "from-accent/20 via-secondary/10 to-transparent";

  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 15 + Math.random() * 10,
        size: 2 + Math.random() * 4,
      }))
    );
  }, []);

  return (
    <>
      {/* Main gradient orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className={`absolute top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full blur-3xl opacity-30 animate-pulse-slow bg-gradient-to-br ${primaryColor}`}
          style={{ animationDelay: "0s" }}
        />
        <div
          className={`absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full blur-3xl opacity-30 animate-pulse-slow bg-gradient-to-tl ${secondaryColor}`}
          style={{ animationDelay: "2s" }}
        />
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-3xl opacity-10 bg-gradient-to-r ${isStudent ? "from-primary to-accent" : "from-secondary to-primary"}`}
        />
      </div>

      {/* Floating particles (rendered only after mount to avoid hydration mismatch) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {particles.map((p, i) => (
          <div
            key={i}
            className={`absolute rounded-full opacity-30 animate-float ${
              isStudent ? "bg-primary" : "bg-secondary"
            }`}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              width: `${p.size}px`,
              height: `${p.size}px`,
            }}
          />
        ))}
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </>
  );
}