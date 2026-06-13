'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LandingPage() {
  const { user, loading, initialized, isOnboarded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialized || loading) return;

    if (user) {
      if (!isOnboarded) {
        router.replace('/onboarding');
      } else {
        router.replace('/stories');
      }
    } else {
      router.replace('/auth/login');
    }
  }, [user, loading, initialized, isOnboarded, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--amber) 0%, var(--amber-dark) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-serif)',
          fontSize: '32px',
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
          fontSize: '28px',
          fontWeight: 300,
          color: 'var(--text-primary)',
          animation: 'fadeIn 800ms ease-out',
        }}
      >
        Kahoma
      </div>
      <div
        style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          animation: 'fadeIn 1200ms ease-out',
        }}
      >
        Your stories, beautifully preserved
      </div>
    </div>
  );
}
