'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';

function ProfileContent() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (err) {
      console.error('Sign out error:', err);
      setSigningOut(false);
    }
  };

  const initial = user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'K';

  return (
    <div className="page-container safe-bottom">
      {/* Header */}
      <div style={{ paddingTop: '24px', paddingBottom: '8px' }}>
        <h1
          className="heading-lg"
          style={{ opacity: 0, animation: 'fadeInDown 500ms ease-out forwards' }}
        >
          Profile
        </h1>
      </div>

      <div className="ornament" style={{ margin: '16px 0 32px' }}>
        <span className="ornament-icon">◆</span>
      </div>

      {/* Avatar & Info */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '40px',
          opacity: 0,
          animation: 'fadeInUp 500ms ease-out 100ms forwards',
        }}
      >
        <div className="profile-avatar">{initial}</div>
        <h2 className="heading-md" style={{ marginBottom: '4px' }}>
          {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Storyteller'}
        </h2>
        <p className="body-text-sm">{user?.email || ''}</p>
      </div>

      {/* Account Section */}
      <div
        style={{
          opacity: 0,
          animation: 'fadeInUp 500ms ease-out 200ms forwards',
        }}
      >
        <h3 className="label-text" style={{ marginBottom: '12px', paddingLeft: '4px' }}>
          Account
        </h3>
        <div className="profile-section">
          <div className="profile-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-10 7L2 7" />
              </svg>
              <span style={{ fontSize: '14px' }}>Email</span>
            </div>
            <span className="body-text-sm">{user?.email || '—'}</span>
          </div>
          <div className="profile-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span style={{ fontSize: '14px' }}>Joined</span>
            </div>
            <span className="body-text-sm">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* App Section */}
      <div
        style={{
          marginTop: '24px',
          opacity: 0,
          animation: 'fadeInUp 500ms ease-out 300ms forwards',
        }}
      >
        <h3 className="label-text" style={{ marginBottom: '12px', paddingLeft: '4px' }}>
          App
        </h3>
        <div className="profile-section">
          <div className="profile-row" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <span style={{ fontSize: '14px' }}>Version</span>
            </div>
            <span className="body-text-sm">1.0.0</span>
          </div>
          <div className="profile-row" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span style={{ fontSize: '14px' }}>Privacy</span>
            </div>
            <span style={{ color: 'var(--green)', fontSize: '13px', fontWeight: 500 }}>
              End-to-end encrypted
            </span>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div
        style={{
          marginTop: '32px',
          opacity: 0,
          animation: 'fadeInUp 500ms ease-out 400ms forwards',
        }}
      >
        <button
          className="btn btn-danger btn-full"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <>
              <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} />
              Signing out…
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '40px',
          paddingBottom: '20px',
          opacity: 0,
          animation: 'fadeIn 600ms ease-out 500ms forwards',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '20px',
            fontWeight: 300,
            color: 'var(--amber)',
            marginBottom: '4px',
          }}
        >
          Kahoma
        </div>
        <p className="body-text-sm" style={{ fontSize: '12px' }}>
          Your stories, beautifully preserved
        </p>
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <Link href="/stories" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          Stories
        </Link>
        <Link href="/profile" className="nav-item nav-item-active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile
        </Link>
      </nav>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
