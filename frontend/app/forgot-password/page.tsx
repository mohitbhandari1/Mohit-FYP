'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import { apiFetch } from '../lib/auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email');

  // Email step
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Verify code step
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);

  // Reset password step
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (step !== 'verify' || resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  // Step 1: Send reset code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      setStep('verify');
      setResendTimer(60);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  // Step 2: Verify code
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setVerifyError('');
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newCode = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
      setCode(newCode);
      codeRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const codeStr = code.join('');
    if (codeStr.length !== 6) {
      setVerifyError('Please enter the complete 6-digit code.');
      return;
    }

    setVerifyLoading(true);
    setVerifyError('');
    try {
      const res = await apiFetch('/api/auth/verify-reset-code', {
        method: 'POST',
        body: JSON.stringify({ email, code: codeStr }),
      });

      const data = await res.json();

      if (!res.ok) {
        setVerifyError(data.error || 'Verification failed. Please try again.');
        setVerifyLoading(false);
        return;
      }

      // Code verified, move to reset password step
      setStep('reset');
    } catch {
      setVerifyError('Something went wrong. Please try again.');
    }
    setVerifyLoading(false);
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setResendLoading(true);
    try {
      const res = await apiFetch('/api/auth/resend-reset-code', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setResendTimer(60);
        setCode(['', '', '', '', '', '']);
        setVerifyError('');
        codeRefs.current[0]?.focus();
      } else {
        setVerifyError(data.error || 'Failed to resend code.');
      }
    } catch {
      setVerifyError('Failed to resend code. Please try again.');
    }
    setResendLoading(false);
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (!newPassword || !confirmPassword) {
      setResetError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }

    setResetLoading(true);
    try {
      const codeStr = code.join('');
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code: codeStr, new_password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResetError(data.error || 'Failed to reset password. Please try again.');
        setResetLoading(false);
        return;
      }

      setResetSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setResetError('Something went wrong. Please try again.');
    }
    setResetLoading(false);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center relative px-4 py-20">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="glow-orb glow-orb-amber w-[400px] h-[400px] -top-20 -right-20 opacity-20" />
          <div className="glow-orb glow-orb-orange w-[300px] h-[300px] bottom-20 -left-20 opacity-15" />
        </div>

        {/* Forgot password card */}
        <div className="relative w-full max-w-md opacity-0 animate-fade-in-up animate-fill-both">
          <div className="glass-strong rounded-3xl p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 mb-4">
                <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.27a4.5 4.5 0 00-6.364-6.365L7.5 4.872M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-100">
                {step === 'email' && 'Forgot Password?'}
                {step === 'verify' && 'Enter Verification Code'}
                {step === 'reset' && 'Set New Password'}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {step === 'email' && "Enter your email and we'll send you a reset code"}
                {step === 'verify' && `Enter the 6-digit code sent to ${email}`}
                {step === 'reset' && 'Choose a new password for your account'}
              </p>
            </div>

            {/* ─── Step 1: Enter Email ─── */}
            {step === 'email' && (
              <>
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-start gap-3 animate-scale-in">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSendCode} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="input-glass w-full pl-12 pr-4 py-3.5 rounded-xl"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-3.5 rounded-xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      'Send Reset Code'
                    )}
                  </button>
                </form>
              </>
            )}

            {/* ─── Step 2: Verify Code ─── */}
            {step === 'verify' && (
              <div className="space-y-6">
                {/* Email icon */}
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 mb-3">
                    <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-400">
                    We&apos;ve sent a 6-digit code to
                  </p>
                  <p className="text-sm text-slate-200 font-medium mt-1">{email}</p>
                </div>

                {verifyError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-start gap-3 animate-scale-in">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span>{verifyError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Verification Code
                  </label>
                  <div className="flex justify-center gap-3">
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { codeRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onPaste={handleCodePaste}
                        onKeyDown={(e) => handleCodeKeyDown(index, e)}
                        className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-white/5 border border-white/10 text-slate-100 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleVerifyCode}
                  disabled={verifyLoading || code.join('').length !== 6}
                  className="w-full btn-primary py-3.5 rounded-xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-slate-400">
                    Didn&apos;t receive the code?{' '}
                    {resendTimer > 0 ? (
                      <span className="text-slate-500">Resend in {resendTimer}s</span>
                    ) : (
                      <button
                        onClick={handleResendCode}
                        disabled={resendLoading}
                        className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
                      >
                        {resendLoading ? 'Sending...' : 'Resend Code'}
                      </button>
                    )}
                  </p>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => {
                      setStep('email');
                      setCode(['', '', '', '', '', '']);
                      setVerifyError('');
                    }}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    ← Use a different email
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 3: Reset Password ─── */}
            {step === 'reset' && (
              <>
                {/* Success message */}
                {resetSuccess && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300 flex items-start gap-3 animate-scale-in">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium mb-1">Password Reset Successful!</p>
                      <p className="text-emerald-400/80">Redirecting to login...</p>
                    </div>
                  </div>
                )}

                {resetError && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-start gap-3 animate-scale-in">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span>{resetError}</span>
                  </div>
                )}

                {!resetSuccess && (
                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-2">
                        New Password <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        </div>
                        <input
                          id="newPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="input-glass w-full pl-12 pr-12 py-3.5 rounded-xl"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                        Confirm New Password <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                          </svg>
                        </div>
                        <input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your new password"
                          className="input-glass w-full pl-12 pr-4 py-3.5 rounded-xl"
                          autoComplete="new-password"
                        />
                        {confirmPassword && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {newPassword === confirmPassword ? (
                              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full btn-primary py-3.5 rounded-xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetLoading ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Resetting...
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-slate-500">or</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* Back to login */}
            <p className="text-center text-sm text-slate-400">
              Remember your password?{' '}
              <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
                Back to Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Chatbot />
    </>
  );
}
