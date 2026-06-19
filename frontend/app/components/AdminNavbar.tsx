'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useRouter } from 'next/navigation';
import { logout, BACKEND_URL } from '../lib/auth';
import Image from 'next/image';

export default function AdminNavbar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const avatarSrc = user?.avatar_url ? `${BACKEND_URL}${user.avatar_url}` : null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link href="/admin" className="group flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
          {imgError ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 text-sm font-bold text-white shadow-sm">
              SC
            </span>
          ) : (
            <Image
              src="/logo.png"
              alt="Smart Connects"
              width={32}
              height={32}
              className="rounded-lg shadow-sm"
              onError={() => setImgError(true)}
            />
          )}
          <span className="hidden sm:inline">Smart Connects</span>
          <span className="ml-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white">Admin</span>
        </Link>

        {/* Right side: profile, theme toggle + logout */}
        <div className="flex items-center gap-2">
          {/* Profile avatar */}
          {avatarSrc && !avatarError ? (
            <img
              src={avatarSrc}
              alt={user?.name || ''}
              className="h-7 w-7 rounded-full border-2 border-slate-200 object-cover shadow-sm"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-xs font-bold text-white shadow-sm">
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </span>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {theme === 'light' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-slate-500 dark:text-slate-400 transition-all hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:border-red-800 dark:hover:text-red-400"
            title="Logout"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline ml-1.5">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
