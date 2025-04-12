'use client'

import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { logout } from '@/store/slices/authSlice'
import { RootState } from '@/store/store'
import { AppDispatch } from '@/store/store'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Devices', href: '/devices' },
  { name: 'Documentation', href: '/documentation' }
]

export function Navbar() {
  const { user } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    router.push('/')
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link 
            href="/" 
            className="flex items-center space-x-2"
          >
            <span className="font-bold text-xl inline-block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              IoT Space
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {user ? (
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, <span className="text-primary">{user.name}</span>
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground hover:bg-primary/10"
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="text-muted-foreground hover:text-foreground hover:bg-primary/10"
              >
                <Link href="/login">Login</Link>
              </Button>
              <Button 
                size="sm" 
                asChild
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
              >
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
          
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-muted-foreground hover:text-foreground hover:bg-primary/10" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      {/* Mobile navigation menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            className="md:hidden" 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="container py-4 space-y-4 bg-background/95 backdrop-blur">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href}
                  className="block py-3 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              
              <div className="border-t border-border pt-4 mt-4">
                {user ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Signed in as <span className="font-medium text-primary">{user.email}</span>
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="text-muted-foreground hover:text-foreground hover:bg-primary/10"
                    >
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      asChild
                      className="text-muted-foreground hover:text-foreground hover:bg-primary/10"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Link href="/login">Login</Link>
                    </Button>
                    <Button 
                      size="sm" 
                      asChild
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Link href="/register">Register</Link>
                    </Button>
                  </div>
                )}
                
                {/* Mobile Theme Toggle */}
                <div className="flex justify-center mt-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>Toggle theme:</span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
} 