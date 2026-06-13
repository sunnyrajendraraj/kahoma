'use client';

import React, { useState, useRef, useEffect, FormEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';

function VerifyPageContent() {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  useEffect(() => {
    if (!email) {
      router.replace('/auth/login');
    }
  }, [email, router]);

  useEffect(() => {
    // Focus first input
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (newOtp.every((d) => d !== '') && value) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (code?: string) => {
    const token = code || otp.join('');
    if (token.length !== 6) return;

    setLoading(true);
    setError('');

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (verifyError) {
        setError(verifyError.message);
        setOtp(new Array(6).fill(''));
        inputRefs.current[0]?.focus();
        return;
      }

      // Auth state change handler in the store will update the user
      // The AuthGuard will handle routing
      router.replace('/stories');
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setResent(false);

    try {
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email,
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        setResent(true);
        setTimeout(() => setResent(false), 3000);
      }
    } catch (err) {
      setError('Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <div className="auth-page">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="btn btn-ghost"
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '8px',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      <div style={{ opacity: 0, animation: 'fadeInDown 600ms ease-out forwards' }}>
        <div className="auth-logo">Verify</div>
        <p className="auth-subtitle">
          Enter the 6-digit code sent to<br />
          <span style={{ color: 'var(--amber)', fontWeight: 500 }}>{email}</span>
        </p>
      </div>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
        style={{ opacity: 0, animation: 'fadeInUp 600ms ease-out 200ms forwards' }}
      >
        {/* OTP Inputs */}
        <div className="otp-container">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="otp-input"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              autoComplete="one-time-code"
              disabled={loading}
            />
          ))}
        </div>

        {error && <div className="auth-error">{error}</div>}

        {resent && (
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--green-muted)',
              border: '1px solid rgba(92, 158, 92, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--green)',
              fontSize: '14px',
              textAlign: 'center',
              animation: 'fadeInDown var(--transition-base) ease-out',
            }}
          >
            Code resent successfully!
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading || otp.some((d) => d === '')}
        >
          {loading ? (
            <>
              <div className="spinner spinner-sm" style={{ borderTopColor: 'var(--text-inverse)' }} />
              Verifying…
            </>
          ) : (
            'Verify Code'
          )}
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-full"
          onClick={handleResend}
          disabled={resending}
          style={{ marginTop: '4px' }}
        >
          {resending ? 'Sending…' : 'Resend code'}
        </button>
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page" style={{ alignItems: 'center' }}>
          <div className="spinner spinner-lg" />
        </div>
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}
