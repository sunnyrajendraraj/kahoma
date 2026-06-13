'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface Slide {
  heading: string;
  body: string;
  button: string;
}

const SLIDES: Slide[] = [
  {
    heading: 'Some stories wait\na lifetime.',
    body: 'The ones you never told anyone. About people who shaped you. Moments that changed everything. They deserve to be heard.',
    button: 'I have a story',
  },
  {
    heading: 'Just speak.\nWe understand.',
    body: '• Speak in any language — Hindi, English, or both\n• We listen, understand, and ask gently if needed\n• Your words become a beautifully written book',
    button: 'How does it work?',
  },
  {
    heading: 'Your stories\nstay yours.',
    body: 'Everything you share is completely private. Your voice recordings are encrypted and never shared. Your book belongs to you alone.',
    button: 'Begin my story',
  },
];

export default function OnboardingCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const router = useRouter();
  const { setOnboarded } = useAuth();

  const handleNext = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      setDirection('right');
      setCurrentSlide((prev) => prev + 1);
    } else {
      // Finish onboarding
      setOnboarded(true);
      router.push('/stories');
    }
  }, [currentSlide, router, setOnboarded]);

  const slide = SLIDES[currentSlide];

  return (
    <div className="onboarding-page">
      {/* Background decorative elements */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          right: '-20%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,147,58,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '-15%',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,147,58,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="onboarding-slide"
        key={currentSlide}
        style={{
          animation: `${direction === 'right' ? 'slideInRight' : 'slideInLeft'} 400ms ease-out forwards`,
        }}
      >
        {/* Dots */}
        <div className="onboarding-dots">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`onboarding-dot ${i === currentSlide ? 'onboarding-dot-active' : ''}`}
            />
          ))}
        </div>

        {/* Brand mark */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '48px',
            opacity: 0,
            animation: 'fadeIn 600ms ease-out 100ms forwards',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--amber) 0%, var(--amber-dark) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-serif)',
              fontSize: '24px',
              fontWeight: 400,
              color: 'var(--text-inverse)',
              boxShadow: 'var(--shadow-amber)',
            }}
          >
            K
          </div>
        </div>

        {/* Heading */}
        <h1
          className="heading-xl"
          style={{
            textAlign: 'center',
            marginBottom: '24px',
            whiteSpace: 'pre-line',
            opacity: 0,
            animation: 'fadeInUp 600ms ease-out 150ms forwards',
          }}
        >
          {slide.heading}
        </h1>

        {/* Body */}
        <p
          className="body-text"
          style={{
            textAlign: 'center',
            maxWidth: '340px',
            margin: '0 auto 48px',
            whiteSpace: 'pre-line',
            opacity: 0,
            animation: 'fadeInUp 600ms ease-out 250ms forwards',
          }}
        >
          {slide.body}
        </p>

        {/* Button */}
        <div
          style={{
            opacity: 0,
            animation: 'fadeInUp 600ms ease-out 350ms forwards',
          }}
        >
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleNext}
          >
            {slide.button}
          </button>
        </div>

        {/* Skip */}
        {currentSlide < SLIDES.length - 1 && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setOnboarded(true);
              router.push('/stories');
            }}
            style={{
              marginTop: '16px',
              alignSelf: 'center',
              opacity: 0,
              animation: 'fadeIn 600ms ease-out 500ms forwards',
            }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
