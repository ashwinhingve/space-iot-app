'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface AnimatedBackgroundProps {
  variant?: 'default' | 'hero' | 'subtle';
  showGrid?: boolean;
  showParticles?: boolean;
  showGradientOrbs?: boolean;
  className?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  variant = 'default',
  showGrid = true,
  showParticles = true,
  showGradientOrbs = true,
  className = '',
}) => {
  // Generate particles only once
  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      initialX: Math.random() * 100,
      initialY: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
    }));
  }, []);

  // Gradient orb configurations based on variant
  const orbConfigs = useMemo(() => {
    if (variant === 'hero') {
      return [
        { color: 'from-brand-500/20 to-purple-500/20', size: 'w-[600px] h-[600px]', position: 'top-0 -right-48', duration: 20 },
        { color: 'from-blue-500/15 to-cyan-500/15', size: 'w-[500px] h-[500px]', position: '-bottom-24 -left-24', duration: 25 },
        { color: 'from-purple-500/10 to-pink-500/10', size: 'w-[400px] h-[400px]', position: 'top-1/2 left-1/2', duration: 30 },
      ];
    } else if (variant === 'subtle') {
      return [
        { color: 'from-brand-500/10 to-purple-500/10', size: 'w-[400px] h-[400px]', position: 'top-0 right-0', duration: 25 },
        { color: 'from-blue-500/8 to-cyan-500/8', size: 'w-[300px] h-[300px]', position: 'bottom-0 left-0', duration: 30 },
      ];
    }
    return [
      { color: 'from-brand-500/15 to-purple-500/15', size: 'w-[500px] h-[500px]', position: 'top-0 right-0', duration: 22 },
      { color: 'from-blue-500/10 to-cyan-500/10', size: 'w-[400px] h-[400px]', position: 'bottom-0 left-0', duration: 28 },
      { color: 'from-purple-500/8 to-pink-500/8', size: 'w-[350px] h-[350px]', position: 'top-1/3 -left-24', duration: 35 },
    ];
  }, [variant]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/50" />

      {/* Grid pattern */}
      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      )}

      {/* Animated gradient orbs */}
      {showGradientOrbs && orbConfigs.map((orb, index) => (
        <motion.div
          key={index}
          className={`absolute ${orb.position} ${orb.size} rounded-full bg-gradient-radial ${orb.color} blur-3xl`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Floating particles */}
      {showParticles && (
        <div className="absolute inset-0">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-brand-400/30 dark:bg-brand-400/20"
              style={{
                left: `${particle.initialX}%`,
                top: `${particle.initialY}%`,
                width: particle.size,
                height: particle.size,
              }}
              animate={{
                y: [-20, -60, -20],
                x: [-10, 10, -10],
                opacity: [0, 0.6, 0],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-background/80" />
    </div>
  );
};

export default AnimatedBackground;
