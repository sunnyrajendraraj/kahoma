'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push(`/auth/verify?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Brand */}
      <div style={{ opacity: 0, animation: 'fadeInDown 600ms ease-out forwards' }}>
        <div className="auth-logo">Kahoma</div>
        <p className="auth-subtitle">Your stories, beautifully preserved</p>
      </div>

      {/* Ornament */}
      <div className="ornament" style={{ marginBottom: '40px', opacity: 0, animation: 'fadeIn 600ms ease-out 200ms forwards' }}>
        <span className="ornament-icon">◆</span>
      </div>

      {/* Form */}
      <form
        className="auth-form"
        onSubmit={handleSubmit}
        style={{ opacity: 0, animation: 'fadeInUp 600ms ease-out 300ms forwards' }}
      >
        <div>
          <label
            className="label-text"
            style={{ display: 'block', marginBottom: '8px', paddingLeft: '4px' }}
          >
            Email Address
          </label>
          <input
            type="email"
            className="input-field"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            required
          />
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading || !email.trim()}
        >
          {loading ? (
            <>
              <div className="spinner spinner-sm" style={{ borderTopColor: 'var(--text-inverse)' }} />
              Sending code…
            </>
          ) : (
            'Continue with Email'
          )}
        </button>

        <p
          className="body-text-sm"
          style={{ textAlign: 'center', marginTop: '8px' }}
        >
          We&apos;ll send a 6-digit verification code to your email.
        </p>
      </form>

      {/* Footer ornament */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '60px',
          opacity: 0,
          animation: 'fadeIn 600ms ease-out 500ms forwards',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '14px',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}
        >
          &ldquo;Every story deserves to be told.&rdquo;
        </span>
      </div>
    </div>
  );
}
