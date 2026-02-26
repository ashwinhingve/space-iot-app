'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X, ChevronRight, ChevronDown, LogOut, Settings, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { logout } from '@/store/slices/authSlice'
import { RootState } from '@/store/store'
import { AppDispatch } from '@/store/store'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'

const navLinks = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Devices', href: '/devices' },
  { name: 'Documentation', href: '/documentation' },
]

export function Navbar() {
  const { user } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Scroll behavior state
  const [isVisible, setIsVisible] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Smooth spring animation for navbar position
  const navY = useMotionValue(0)
  const smoothNavY = useSpring(navY, { stiffness: 400, damping: 40 })

  // Scroll handler with hide/show logic
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY
    const scrollDelta = currentScrollY - lastScrollY

    // Update scrolled state for background
    setIsScrolled(currentScrollY > 20)

    // Hide/show logic
    if (currentScrollY < 100) {
      // Always show near top
      setIsVisible(true)
      navY.set(0)
    } else if (scrollDelta > 10) {
      // Scrolling down - hide
      setIsVisible(false)
      navY.set(-100)
    } else if (scrollDelta < -5) {
      // Scrolling up - show
      setIsVisible(true)
      navY.set(0)
    }

    setLastScrollY(currentScrollY)
  }, [lastScrollY, navY])

  useEffect(() => {
    let ticking = false

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [handleScroll])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false)
    setIsUserMenuOpen(false)
  }, [pathname])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setIsUserMenuOpen(false)
    if (isUserMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isUserMenuOpen])

  const handleLogout = () => {
    dispatch(logout())
    router.push('/')
  }

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      <motion.nav
        className={`fixed top-0 z-50 w-full transition-colors duration-300 ${
          isScrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/5'
            : 'bg-transparent'
        }`}
        style={{ y: smoothNavY }}
        initial={{ y: -100 }}
        animate={{ y: isVisible ? 0 : -100 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Progress bar */}
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-brand-500 to-purple-500"
          style={{
            scaleX: useTransform(
              useMotionValue(typeof window !== 'undefined' ? window.scrollY : 0),
              [0, typeof document !== 'undefined' ? document.body.scrollHeight - window.innerHeight : 1000],
              [0, 1]
            ),
            transformOrigin: 'left',
          }}
        />

        <div className="container flex h-16 md:h-20 items-center justify-between px-4 md:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center group relative z-10">
            <motion.span
              className="font-bold text-xl md:text-2xl bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 bg-clip-text text-transparent"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              IoT Space
            </motion.span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center">
            <div className="flex items-center bg-muted/30 backdrop-blur-sm rounded-full p-1.5 border border-border/30">
              {navLinks.map((link) => {
                const isActive = isActiveLink(link.href)
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="relative px-4 py-2 text-sm font-medium transition-colors duration-300"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="navbar-active"
                        className="absolute inset-0 bg-background rounded-full shadow-sm border border-border/50"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <span
                      className={`relative z-10 transition-colors duration-300 ${
                        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {link.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />

            {user ? (
              <div className="hidden md:block relative">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsUserMenuOpen(!isUserMenuOpen)
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted/30 border border-border/30 hover:bg-muted/50 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${
                      isUserMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </motion.button>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-2 w-56 bg-background/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-xl shadow-black/10 overflow-hidden"
                    >
                      <div className="p-3 border-b border-border/50">
                        <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="p-2">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Link>
                        <Link
                          href="/devices"
                          className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200"
                        >
                          <Settings className="h-4 w-4" />
                          My Devices
                        </Link>
                      </div>
                      <div className="p-2 border-t border-border/50">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-muted-foreground hover:text-foreground rounded-full px-4"
                >
                  <Link href="/login">Sign in</Link>
                </Button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    size="sm"
                    asChild
                    className="bg-gradient-to-r from-brand-500 to-purple-500 hover:from-brand-600 hover:to-purple-600 text-white border-0 rounded-full px-5 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all duration-300"
                  >
                    <Link href="/register" className="flex items-center gap-1">
                      Get Started
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
              </div>
            )}

            {/* Mobile menu button */}
            <motion.button
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full bg-muted/30 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              whileTap={{ scale: 0.95 }}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile navigation menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-background/80 backdrop-blur-md z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-background border-l border-border/50 z-50 lg:hidden overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border/50">
                <span className="font-bold text-xl bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 bg-clip-text text-transparent">
                  IoT Space
                </span>
                <motion.button
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              {/* Navigation Links */}
              <div className="p-6 space-y-2">
                {navLinks.map((link, index) => {
                  const isActive = isActiveLink(link.href)
                  return (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                    >
                      <Link
                        href={link.href}
                        className={`flex items-center justify-between py-4 px-4 rounded-2xl text-lg font-medium transition-all duration-300 ${
                          isActive
                            ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {link.name}
                        <ChevronRight className={`h-5 w-5 transition-colors ${isActive ? 'text-brand-500' : ''}`} />
                      </Link>
                    </motion.div>
                  )
                })}
              </div>

              {/* User Section */}
              <div className="p-6 border-t border-border/50 mt-auto">
                {user ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-lg font-semibold">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-center rounded-xl h-12 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
                      onClick={() => {
                        handleLogout()
                        setIsMenuOpen(false)
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-3"
                  >
                    <Button
                      variant="outline"
                      asChild
                      className="w-full justify-center rounded-xl h-12"
                    >
                      <Link href="/login" onClick={() => setIsMenuOpen(false)}>Sign in</Link>
                    </Button>
                    <Button
                      asChild
                      className="w-full justify-center bg-gradient-to-r from-brand-500 to-purple-500 text-white border-0 rounded-xl h-12"
                    >
                      <Link href="/register" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
