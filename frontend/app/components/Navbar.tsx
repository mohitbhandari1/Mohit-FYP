'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useRouter } from 'next/navigation';
import { logout, BACKEND_URL } from '../lib/auth';
import Image from 'next/image';

export default function Navbar() {
  const { user, isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const avatarSrc = user?.avatar_url ? `${BACKEND_URL}${user.avatar_url}` : null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/20 dark:border-slate-700/50 glass animate-fade-in-down">
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
          {imgError ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-110">
              SC
            </span>
          ) : (
            <Image
              src="/logo.png"
              alt="Smart Connects"
              width={32}
              height={32}
              className="rounded-lg shadow-sm transition-transform group-hover:scale-110"
              onError={() => setImgError(true)}
            />
          )}
          <span className="hidden sm:inline">Smart Connects</span>
        </Link>

        {/* Right section: nav links + theme toggle */}
        <div className="flex items-center gap-1">
          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink href="/communities">Communities</NavLink>
            <NavLink href="/events">Events</NavLink>

            {isAuthenticated && !loading ? (
              <>
                {user?.is_admin && <NavLink href="/admin">Admin</NavLink>}
                <NavLink href="/my-events">My Events</NavLink>
                <NavLink href="/my-communities">My Groups</NavLink>
                <NavLink href="/apply">Start a Group</NavLink>
                <div className="ml-2 flex items-center gap-1.5">
                  {/* Profile circle: links to /profile */}
                  <Link
                    href="/profile"
                    className="flex items-center justify-center"
                  >
                    {avatarSrc && !avatarError ? (
                      <img
                        src={avatarSrc}
                        alt={user?.name || ''}
                        className="h-8 w-8 rounded-full border-2 border-white/50 object-cover shadow-sm"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-sm font-bold text-white shadow-sm transition-transform hover:scale-110">
                        {user?.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </Link>

                  {/* Logout icon button on the side */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    title="Logout"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </>
            ) : !loading ? (
              <div className="ml-2 flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-105"
                >
                  Sign up
                </Link>
              </div>
            ) : null}
          </nav>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="ml-2 rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
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

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 sm:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 pb-4 pt-2 animate-fade-in sm:hidden">
          <MobileNavLink href="/communities" onClick={() => setMobileOpen(false)}>Communities</MobileNavLink>
          <MobileNavLink href="/events" onClick={() => setMobileOpen(false)}>Events</MobileNavLink>
          {isAuthenticated && !loading ? (
            <>
              {user?.is_admin && <MobileNavLink href="/admin" onClick={() => setMobileOpen(false)}>Admin</MobileNavLink>}
              <MobileNavLink href="/my-events" onClick={() => setMobileOpen(false)}>My Events</MobileNavLink>
              <MobileNavLink href="/my-communities" onClick={() => setMobileOpen(false)}>My Groups</MobileNavLink>
              <MobileNavLink href="/apply" onClick={() => setMobileOpen(false)}>Start a Group</MobileNavLink>
              <MobileNavLink href="/profile" onClick={() => setMobileOpen(false)}>Profile</MobileNavLink>
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </>
          ) : !loading ? (
            <>
              <MobileNavLink href="/login" onClick={() => setMobileOpen(false)}>Sign in</MobileNavLink>
              <MobileNavLink href="/register" onClick={() => setMobileOpen(false)}>Sign up</MobileNavLink>
            </>
          ) : null}
        </div>
      )}
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700"
    >
      {children}
    </Link>
  );
}
