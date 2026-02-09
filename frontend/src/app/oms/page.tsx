'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
import { BarChart3, ArrowLeft, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OmsPage() {
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
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl blur-lg opacity-40" />
                <div className="relative p-2.5 bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-xl border border-purple-500/20">
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500">
                OMS Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">
              Operations Management System for maintenance and scheduling
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
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-full blur-2xl" />
              <div className="relative p-6 bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-full border border-purple-500/20">
                <Construction className="h-12 w-12 text-purple-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Coming Soon</h2>
            <p className="text-muted-foreground text-center max-w-md">
              The Operations Management System is currently under development. This module will provide maintenance scheduling, work order management, and operational analytics.
            </p>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
