'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Home, LayoutDashboard } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/6 rounded-full blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 text-center max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-purple-500 rounded-2xl blur-lg opacity-40" />
            <div className="relative p-3.5 bg-gradient-to-br from-brand-500/15 to-purple-500/15 rounded-2xl border border-brand-500/25">
              <Zap className="w-7 h-7 text-brand-500" />
            </div>
          </div>
        </div>

        {/* 404 number */}
        <motion.p
          className="text-8xl sm:text-9xl font-black tracking-tighter bg-gradient-to-b from-foreground to-muted-foreground/30 bg-clip-text text-transparent leading-none mb-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          404
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        >
          <h1 className="text-xl font-bold mb-2">Page not found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Check the URL or navigate back to a known page.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        >
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
          <Link href="/dashboard">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 text-white text-sm font-medium hover:from-brand-500 hover:to-purple-500 transition-all duration-150">
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
            </div>
          </Link>
          <Link href="/">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150">
              <Home className="w-4 h-4" />
              Home
            </div>
          </Link>
        </motion.div>

        {/* Helpful links */}
        <motion.div
          className="mt-10 pt-6 border-t border-border/40"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
        >
          <p className="text-xs text-muted-foreground/60 mb-3">Looking for one of these?</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { href: '/scada', label: 'SCADA' },
              { href: '/devices', label: 'Devices' },
              { href: '/oms', label: 'OMS' },
              { href: '/reports', label: 'Reports' },
              { href: '/tickets', label: 'Tickets' },
            ].map(link => (
              <Link key={link.href} href={link.href}>
                <span className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/40 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
