'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
import { FileText, ArrowLeft, Construction, Droplets, Zap, BarChart3, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

const REPORT_TABS = [
  { id: 'pump', label: 'Pump Reports', icon: Droplets, color: 'text-blue-400', activeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'electrical', label: 'Electrical Reports', icon: Zap, color: 'text-amber-400', activeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'oms', label: 'OMS Reports', icon: BarChart3, color: 'text-purple-400', activeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'rssi', label: 'RSSI Reports', icon: Wifi, color: 'text-emerald-400', activeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
] as const;

type ReportTab = typeof REPORT_TABS[number]['id'];

const REPORT_DESCRIPTIONS: Record<ReportTab, string> = {
  pump: 'Flow rates, pressure readings, pump run hours, and maintenance logs for all pump house operations.',
  electrical: 'Power consumption, voltage profiles, load analysis, and electrical fault reports.',
  oms: 'Work order summaries, maintenance schedules, asset health trends, and operational KPIs.',
  rssi: 'Signal strength analysis, connectivity trends, device communication quality, and network reliability reports.',
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('pump');
  const activeTabConfig = REPORT_TABS.find((t) => t.id === activeTab)!;

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
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl blur-lg opacity-40" />
                <div className="relative p-2.5 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-xl border border-cyan-500/20">
                  <FileText className="h-6 w-6 text-cyan-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500">
                Reports
              </h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">
              Pump, Electrical, OMS & RSSI reports and analytics
            </p>
          </motion.div>

          {/* Report Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="flex flex-wrap gap-2 mb-8"
          >
            {REPORT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                  activeTab === tab.id
                    ? tab.activeColor
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border-transparent'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* Coming Soon Content for active tab */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-full blur-2xl" />
              <div className="relative p-6 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-full border border-cyan-500/20">
                <Construction className="h-12 w-12 text-cyan-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              {activeTabConfig.label} - Coming Soon
            </h2>
            <p className="text-muted-foreground text-center max-w-md">
              {REPORT_DESCRIPTIONS[activeTab]}
            </p>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
