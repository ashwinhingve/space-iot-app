'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Zap, ArrowLeft, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SldPage() {
  return (
    <MainLayout>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 max-w-7xl">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl blur-lg opacity-40" />
                <div className="relative p-2.5 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 rounded-xl border border-amber-500/20">
                  <Zap className="h-6 w-6 text-amber-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500">
                Pump House SLD
              </h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">
              Single Line Diagram for pump house electrical systems
            </p>
          </motion.div>

          {/* Coming Soon Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-full blur-2xl" />
              <div className="relative p-6 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 rounded-full border border-amber-500/20">
                <Construction className="h-12 w-12 text-amber-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Coming Soon</h2>
            <p className="text-muted-foreground text-center max-w-md">
              The Pump House Single Line Diagram is currently under development. This module will provide electrical system visualization, circuit diagrams, and power distribution monitoring.
            </p>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
