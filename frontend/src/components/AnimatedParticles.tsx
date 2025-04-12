'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type Particle = {
  id: number;
  top: string;
  left: string;
  width: string;
  height: string;
  yAnimation: number;
  duration: number;
  delay: number;
};

interface AnimatedParticlesProps {
  count?: number;
  className?: string;
  color?: string;
}

export const AnimatedParticles: React.FC<AnimatedParticlesProps> = ({ 
  count = 20,
  className = "absolute inset-0 opacity-30",
  color = "bg-blue-500"
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  
  useEffect(() => {
    // Only generate particles on the client side
    const newParticles = Array.from({ length: count }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 3 + 1}px`,
      height: `${Math.random() * 3 + 1}px`,
      yAnimation: Math.random() * -100 - 50,
      duration: Math.random() * 5 + 10,
      delay: Math.random() * 5,
    }));
    
    setParticles(newParticles);
  }, [count]);
  
  return (
    <div className={className}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${color}`}
          style={{
            top: particle.top,
            left: particle.left,
            width: particle.width,
            height: particle.height,
          }}
          animate={{
            y: [0, particle.yAnimation],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

export default AnimatedParticles; 