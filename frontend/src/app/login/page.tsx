'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, clearError } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { RootState, AppDispatch } from '@/store/store';
import { motion } from 'framer-motion';
import AnimatedBackground from '@/components/AnimatedBackground';
import { ArrowRight, Lock, Mail, AlertCircle, Sparkles, Zap } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());

    try {
      await dispatch(login({ email, password })).unwrap();
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

      {/* Header */}
      <motion.header
        className="relative z-10 w-full py-6 px-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-purple-500 rounded-lg blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative p-1.5 bg-gradient-to-br from-brand-500/10 to-purple-500/10 rounded-lg border border-brand-500/20">
              <Zap className="h-5 w-5 text-brand-500" />
            </div>
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 bg-clip-text text-transparent">
            IoT Space
          </span>
        </Link>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <motion.div
          className="w-full max-w-md space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Welcome Text */}
          <div className="text-center">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-brand-500/10 border border-brand-500/20 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-medium text-brand-600 dark:text-brand-400">Welcome Back</span>
            </motion.div>
            <motion.h1
              className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Sign in to your account
            </motion.h1>
            <motion.p
              className="mt-3 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Continue managing your IoT devices
            </motion.p>
          </div>

          {/* Login Card */}
          <motion.div
            className="relative overflow-hidden bg-card/80 backdrop-blur-xl p-8 border border-border/50 rounded-2xl shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Gradient border effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500/10 via-transparent to-purple-500/10 pointer-events-none" />

            <div className="relative">
              {/* Google Sign-In Button */}
              <div className="mb-6">
                <GoogleAuthButton onError={(err) => console.error(err)} />
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-card/80 text-muted-foreground backdrop-blur-sm">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Email/Password Login Form */}
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Email Field */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email address
                    </label>
                    <div className={`relative group transition-all duration-300 ${focusedField === 'email' ? 'scale-[1.02]' : ''}`}>
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/20 to-purple-500/20 blur-xl opacity-0 transition-opacity duration-300 ${focusedField === 'email' ? 'opacity-100' : 'group-hover:opacity-50'}`} />
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Mail className={`h-5 w-5 transition-colors duration-300 ${focusedField === 'email' ? 'text-brand-500' : 'text-muted-foreground'}`} />
                        </div>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          autoComplete="username"
                          className="pl-11 w-full px-4 py-3 border border-border/50 rounded-xl bg-background/50 backdrop-blur-sm focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-300 outline-none"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Password Field */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <label htmlFor="password" className="block text-sm font-medium mb-2">
                      Password
                    </label>
                    <div className={`relative group transition-all duration-300 ${focusedField === 'password' ? 'scale-[1.02]' : ''}`}>
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/20 to-purple-500/20 blur-xl opacity-0 transition-opacity duration-300 ${focusedField === 'password' ? 'opacity-100' : 'group-hover:opacity-50'}`} />
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Lock className={`h-5 w-5 transition-colors duration-300 ${focusedField === 'password' ? 'text-brand-500' : 'text-muted-foreground'}`} />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          required
                          autoComplete="current-password"
                          className="pl-11 w-full px-4 py-3 border border-border/50 rounded-xl bg-background/50 backdrop-blur-sm focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-300 outline-none"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 hover:shadow-glow text-white border-0 py-6 rounded-xl group relative overflow-hidden"
                    disabled={loading}
                    size="lg"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {loading ? (
                        <>
                          <motion.div
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign in
                          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-600 via-purple-600 to-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </motion.div>
              </form>

              {/* Sign Up Link */}
              <motion.div
                className="mt-6 text-center text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <p className="text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/register"
                    className="text-brand-500 hover:text-brand-600 font-medium transition-colors"
                  >
                    Sign up
                  </Link>
                </p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
