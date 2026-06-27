'use client';

import { useEffect, useState } from 'react';
import { initAuthListener, useAuthStore } from '@/features/auth/stores/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn } = useAuthStore();
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuthListener();

    // Set a timeout so the app doesn't stay stuck if Firebase is slow
    const timeout = setTimeout(() => {
      setAuthInitialized(true);
      useAuthStore.getState().setLoading(false);
    }, 3000);

    // If auth resolves faster, clear the timeout
    const checkAuth = setInterval(() => {
      if (!useAuthStore.getState().loading) {
        setAuthInitialized(true);
        clearTimeout(timeout);
        clearInterval(checkAuth);
      }
    }, 100);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
      clearInterval(checkAuth);
    };
  }, []);

  useEffect(() => {
    // Auto sign in anonymously if auth is ready but no user
    if (authInitialized && !user) {
      signIn().catch(() => {
        // Auth failed — continue without auth for now (landing page)
        console.warn('Anonymous auth failed. Some features may be unavailable.');
      });
    }
  }, [authInitialized, user, signIn]);

  // Show loading for max 2 seconds, then render content anyway
  if (loading && !authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F1A' }}>
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}
          />
          <p style={{ color: '#94A3B8', fontSize: '1.125rem' }}>Memuat Remi 41...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
