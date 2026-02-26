'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { googleLogin } from '@/store/slices/authSlice';
import { AppDispatch } from '@/store/store';
import { GOOGLE_CLIENT_ID } from '@/lib/config';

// Global flag to track if Google Sign-In script is being loaded
let googleScriptLoading = false;
let googleScriptLoaded = false;

// Declare Google types
interface GoogleAccounts {
  id: {
    initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
    renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    disableAutoSelect: () => void;
  };
}

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts;
    };
  }
}

interface GoogleAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  redirectTo?: string;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onSuccess,
  onError,
  redirectTo = '/dashboard',
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(googleScriptLoaded);

  const handleCredentialResponse = React.useCallback(async (response: { credential: string }) => {
    setIsLoading(true);
    try {
      await dispatch(googleLogin({ credential: response.credential })).unwrap();
      onSuccess?.();
      router.push(redirectTo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
      console.error('Google sign-in error:', error);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, onSuccess, onError, router, redirectTo]);

  const renderGoogleButton = React.useCallback(() => {
    if (window.google && buttonContainerRef.current && !buttonContainerRef.current.hasChildNodes()) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });

        window.google.accounts.id.disableAutoSelect();

        window.google.accounts.id.renderButton(
          buttonContainerRef.current,
          {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: buttonContainerRef.current.offsetWidth || 350
          }
        );
      } catch (error) {
        console.error('Google Sign-In initialization error:', error);
      }
    }
  }, [handleCredentialResponse]);

  useEffect(() => {
    // If script already loaded, render button
    if (googleScriptLoaded && window.google) {
      setScriptReady(true);
      renderGoogleButton();
      return;
    }

    // If script is currently loading, wait for it
    if (googleScriptLoading) {
      const checkInterval = setInterval(() => {
        if (googleScriptLoaded && window.google) {
          clearInterval(checkInterval);
          setScriptReady(true);
          renderGoogleButton();
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    // Load the script for the first time
    googleScriptLoading = true;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.id = 'google-signin-script';

    script.onload = () => {
      googleScriptLoaded = true;
      googleScriptLoading = false;
      setScriptReady(true);
      renderGoogleButton();
    };

    script.onerror = () => {
      console.error('Failed to load Google Sign-In script');
      googleScriptLoading = false;
    };

    document.head.appendChild(script);

    // No cleanup - script stays loaded
  }, [renderGoogleButton]);

  // Re-render button when script becomes ready
  useEffect(() => {
    if (scriptReady) {
      renderGoogleButton();
    }
  }, [scriptReady, renderGoogleButton]);

  return (
    <div
      ref={buttonContainerRef}
      className="w-full"
      style={{ minHeight: '40px' }}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
          <span className="text-sm">Connecting...</span>
        </div>
      )}
    </div>
  );
};
