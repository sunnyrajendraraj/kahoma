'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/auth/login', '/auth/verify', '/'];

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, initialized, isOnboarded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!initialized || loading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!user && !isPublicRoute) {
      // Not logged in, redirect to login
      router.replace('/auth/login');
    } else if (user && (pathname === '/auth/login' || pathname === '/auth/verify')) {
      // Logged in but on auth page
      if (!isOnboarded) {
        router.replace('/onboarding');
      } else {
        router.replace('/stories');
      }
    } else if (user && !isOnboarded && pathname !== '/onboarding') {
      // Logged in but not onboarded
      router.replace('/onboarding');
    }
  }, [user, loading, initialized, isOnboarded, pathname, router]);

  // Show loading screen while initializing
  if (!initialized || loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          background: 'var(--bg-primary)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--amber) 0%, var(--amber-dark) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-serif)',
            fontSize: '28px',
            fontWeight: 400,
            color: 'var(--text-inverse)',
            animation: 'pulseGlow 2s ease-in-out infinite',
          }}
        >
          K
        </div>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '20px',
            fontWeight: 300,
            color: 'var(--text-secondary)',
            animation: 'fadeIn 1s ease-out',
          }}
        >
          Kahoma
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
