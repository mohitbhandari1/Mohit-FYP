'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import { apiFetch } from '../lib/auth';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
  if (score === 3) return { score: 3, label: 'Good', color: 'bg-yellow-400' };
  if (score === 4) return { score: 4, label: 'Strong', color: 'bg-orange-400' };
  return { score: 5, label: 'Excellent', color: 'bg-emerald-400' };
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Verification code flow state
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyName, setVerifyName] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const strength = password ? getPasswordStrength(password) : null;

  // Countdown timer for resend
  useEffect(() => {
    if (step !== 'verify' || resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  // Handle registration form submit - sends code
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the terms and conditions.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      // Move to verification code step
      setVerifyEmail(email);
      setVerifyName(name);
      setStep('verify');
      setResendTimer(60);
      // Focus first code input
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  // Handle code input change
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setVerifyError('');

    // Auto-focus next input
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  // Handle code paste
  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newCode = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
      setCode(newCode);
      // Focus the next empty or last input
      const nextIndex = Math.min(pasted.length, 5);
      codeRefs.current[nextIndex]?.focus();
    }
  };

  // Handle backspace in code input
  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  // Submit verification code
  const handleVerifyCode = async () => {
    const codeStr = code.join('');
    if (codeStr.length !== 6) {
      setVerifyError('Please enter the complete 6-digit code.');
      return;
    }

    setVerifyLoading(true);
    setVerifyError('');
    try {
      const res = await apiFetch('/api/auth/verify-registration', {
        method: 'POST',
        body: JSON.stringify({ email: verifyEmail, code: codeStr }),
      });

      const data = await res.json();

      if (!res.ok) {
        setVerifyError(data.error || 'Verification failed. Please try again.');
        setVerifyLoading(false);
        return;
      }

      // Success! Store token and redirect
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      router.push('/onboarding');
    } catch {
      setVerifyError('Something went wrong. Please try again.');
    }
    setVerifyLoading(false);
  };

  // Resend verification code
  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setResendLoading(true);
    try {
      const res = await apiFetch('/api/auth/resend-verification-code', {
        method: 'POST',
        body: JSON.stringify({ email: verifyEmail }),
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

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center relative px-4 py-20">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="glow-orb glow-orb-orange w-[400px] h-[400px] -top-20 -left-20 opacity-20" />
          <div className="glow-orb glow-orb-amber w-[350px] h-[350px] bottom-10 -right-20 opacity-15" />
        </div>

        {/* Register card */}
        <div className="relative w-full max-w-lg opacity-0 animate-fade-in-up animate-fill-both">
          <div className="glass-strong rounded-3xl p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-white/10 mb-4">
                <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-100">
                {step === 'form' ? 'Create Account' : 'Verify Your Email'}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {step === 'form'
                  ? 'Join the Smart Connects community'
                  : `Enter the 6-digit code sent to ${verifyEmail}`}
              </p>
            </div>

            {/* ─── Step 1: Registration Form ─── */}
            {step === 'form' && (
              <>
                {/* Error display */}
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-start gap-3 animate-scale-in">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleRegister} className="space-y-5">
                  {/* Name field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="input-glass w-full pl-12 pr-4 py-3.5 rounded-xl"
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  {/* Email field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                      Email Address <span className="text-red-400">*</span>
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

                  {/* Password field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                      Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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

                    {/* Password strength indicator */}
                    {strength && (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                i < strength.score ? strength.color : 'bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs ${
                          strength.score <= 1 ? 'text-red-400' :
                          strength.score <= 2 ? 'text-amber-400' :
                          strength.score <= 3 ? 'text-yellow-400' :
                          'text-emerald-400'
                        }`}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                      Confirm Password <span className="text-red-400">*</span>
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
                        placeholder="Re-enter your password"
                        className="input-glass w-full pl-12 pr-4 py-3.5 rounded-xl"
                        autoComplete="new-password"
                      />
                      {confirmPassword && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {password === confirmPassword ? (
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

                  {/* Terms checkbox */}
                  <div className="flex items-start gap-3">
                    <div className="relative flex items-center">
                      <input
                        id="terms"
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-white/10 bg-white/5 text-amber-500 focus:ring-amber-500/30 focus:ring-offset-0 cursor-pointer"
                      />
                    </div>
                    <label htmlFor="terms" className="text-sm text-slate-400 cursor-pointer leading-snug">
                      I agree to the{' '}
                      <span className="text-amber-400 hover:text-amber-300 cursor-pointer">
                        Terms of Service
                      </span>{' '}
                      and{' '}
                      <span className="text-amber-400 hover:text-amber-300 cursor-pointer">
                        Privacy Policy
                      </span>
                    </label>
                  </div>

                  {/* Submit button */}
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
                        Sending verification code...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-xs text-slate-500">or</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* Login link */}
                <p className="text-center text-sm text-slate-400">
                  Already have an account?{' '}
                  <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
                    Sign in
                  </Link>
                </p>
              </>
            )}

            {/* ─── Step 2: Verification Code Entry ─── */}
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
                    Hi <strong className="text-amber-400">{verifyName}</strong>, we&apos;ve sent a verification code to
                  </p>
                  <p className="text-sm text-slate-200 font-medium mt-1">{verifyEmail}</p>
                </div>

                {/* Error display */}
                {verifyError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-start gap-3 animate-scale-in">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span>{verifyError}</span>
                  </div>
                )}

                {/* Code input */}
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

                {/* Verify button */}
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
                    'Verify & Create Account'
                  )}
                </button>

                {/* Resend code */}
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

                {/* Back to form */}
                <div className="text-center">
                  <button
                    onClick={() => {
                      setStep('form');
                      setCode(['', '', '', '', '', '']);
                      setVerifyError('');
                    }}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    ← Back to registration form
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Chatbot />
    </>
  );
}
