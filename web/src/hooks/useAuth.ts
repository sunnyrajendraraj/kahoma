'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

export function useAuth() {
  const {
    user,
    session,
    loading,
    initialized,
    isOnboarded,
    setOnboarded,
    initialize,
    signOut,
  } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  return {
    user,
    session,
    loading,
    initialized,
    isOnboarded,
    isAuthenticated: !!user,
    setOnboarded,
    signOut,
  };
}
