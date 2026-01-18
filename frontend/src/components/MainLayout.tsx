'use client'

import { ReactNode } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

interface MainLayoutProps {
  children: ReactNode
  showFooter?: boolean
  /** Add padding for fixed navbar - set to false for full-screen hero sections */
  padNavbar?: boolean
}

export function MainLayout({
  children,
  showFooter = true,
  padNavbar = true
}: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className={`flex-1 ${padNavbar ? 'pt-16 md:pt-20' : ''}`}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}
