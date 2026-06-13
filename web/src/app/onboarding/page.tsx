'use client';

import React from 'react';
import AuthGuard from '@/components/AuthGuard';
import OnboardingCarousel from '@/components/OnboardingCarousel';

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingCarousel />
    </AuthGuard>
  );
}
