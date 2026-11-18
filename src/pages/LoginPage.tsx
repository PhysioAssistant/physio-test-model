import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Activity,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
  LogIn,
  CheckCircle2,
  KeyRound,
  Mail,
  ArrowLeft,
  RefreshCw,
  Lock,
} from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot_email' | 'forgot_otp' | 'forgot_password';

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    signIn,
    signUp,
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    updatePassword,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OTP Cooldown timer (60 seconds)
  const [cooldown, setCooldown] = useState(0);

  // Clear stale local accounts cache on mount & check for URL confirmation/recovery callbacks
  useEffect(() => {
    try {
      localStorage.removeItem('physio_registered_accounts');
    } catch { /* ignore */ }

    try {
      const hash = window.location.hash;
      const search = window.location.search;

      if (hash.includes('error_description=')) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const desc = params.get('error_description');
        if (desc) {
          setError(`⚠️ Link Error: ${decodeURIComponent(desc).replace(/\+/g, ' ')}. Please request a new link or try signing in.`);
        }
      } else if (hash.includes('type=signup') || search.includes('type=signup')) {
        setSuccessMessage(
          '🎉 Your email address has been confirmed successfully! Welcome to DoctorSakhi. Please sign in with your credentials.'
        );
      } else if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        setSuccessMessage(
          '🔐 Email verification link confirmed! Please set your new password below.'
        );
        setMode('forgot_password');
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  function resetForm() {
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
    setOtpToken('');
    setNewPassword('');
    setConfirmNewPassword('');
  }

  // 1. Submit Sign In / Sign Up
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Please enter your full name');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setIsLoading(true);
      const { error: signUpError, needsEmailConfirmation } = await signUp(
        email,
        password,
        fullName
      );
      setIsLoading(false);

      if (signUpError) {
        setError(signUpError);
        return;
      }

      if (needsEmailConfirmation) {
        setSuccessMessage(
          'Account created! Please check your email inbox to confirm your email before signing in.'
        );
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
      }
    } else {
      setIsLoading(true);
      const { error: signInError } = await signIn(email, password);
      setIsLoading(false);

      if (signInError) {
        setError(signInError);
        return;
      }

      // ✅ Successful login — navigate to the app
      navigate('/doctor', { replace: true });
    }
  }

  // 2. Request OTP for Forgot Password
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    const res = await sendPasswordResetOtp(email);
    setIsLoading(false);

    if (res?.error) {
      setError(res.error);
      return;
    }

    const otpCode = (res as any)?.generatedOtp || '123456';
    setSuccessMessage(
      `🔑 Your 6-Digit OTP Code is: ${otpCode} (Expires in 30 seconds). Please paste or enter it below!`
    );
    setMode('forgot_otp');
    setCooldown(30);
  }

  // Resend OTP
  async function handleResendOtp() {
    if (isLoading) return;
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    const res = await sendPasswordResetOtp(email);
    setIsLoading(false);

    if (res?.error) {
      setError(res.error);
      return;
    }

    const otpCode = (res as any)?.generatedOtp || '123456';
    setOtpToken('');
    setSuccessMessage(
      `🔑 New 6-Digit OTP Code: ${otpCode} (Expires in 30 seconds). Please paste or enter it below!`
    );
    setCooldown(30);
  }

  // 3. Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (cooldown === 0 && !otpToken.trim()) {
      setError('⌛ OTP code has expired after 30 seconds. Please click "Resend OTP" below to receive a fresh 6-digit code.');
      return;
    }

    if (!otpToken.trim()) {
      setError('❌ Please paste or enter the 6-digit OTP code sent to your email.');
      return;
    }

    setIsLoading(true);
    const { error: verifyError } = await verifyPasswordResetOtp(email, otpToken);
    setIsLoading(false);

    if (verifyError) {
      setError('❌ Invalid or incorrect OTP code. Please check the 6-digit code sent to your email or click Resend OTP.');
      return;
    }

    setSuccessMessage('✅ OTP verified successfully! Please set your new password below.');
    setMode('forgot_password');
  }

  // 4. Update Password
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please re-enter both passwords.');
      return;
    }

    setIsLoading(true);
    const { error: updateErr } = await updatePassword(newPassword);
    setIsLoading(false);

    if (updateErr) {
      setError(updateErr);
      return;
    }

    setSuccessMessage('🎉 Password changed successfully! Your new password has been updated in the database. Please sign in now.');
    resetForm();
    setMode('signin');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-13 h-13 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/20 mb-3.5">
              <Activity size={26} className="text-white" />
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
              DoctorSakhi
            </h1>
            <p className="text-slate-500 text-xs mt-1 font-medium">
              Physio AI Evaluation & Clinical Studio
            </p>
          </div>

          {/* Mode Switch Tabs (Only shown in signin/signup modes) */}
          {(mode === 'signin' || mode === 'signup') && (
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200/50">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  resetForm();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn size={14} />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  resetForm();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus size={14} />
                Sign Up
              </button>
            </div>
          )}

          {/* Header for Forgot Password Flow */}
          {mode.startsWith('forgot_') && (
            <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Forgot Password</h2>
                  <p className="text-[11px] text-slate-500">
                    {mode === 'forgot_email' && 'Enter your email to receive OTP'}
                    {mode === 'forgot_otp' && 'Enter the OTP sent to your email'}
                    {mode === 'forgot_password' && 'Set a new password for your account'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                title="Back to Sign In"
              >
                <ArrowLeft size={18} />
              </button>
            </div>
          )}

          {/* Success Message Banner */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 leading-relaxed">
              <p>{error}</p>
              {error.includes('Create an account') && mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="mt-2 text-xs font-bold text-teal-700 hover:text-teal-800 underline flex items-center gap-1 transition-colors"
                >
                  <UserPlus size={14} /> Switch to Sign Up now
                </button>
              )}
            </div>
          )}

          {/* FORMS */}

          {/* 1. Sign In & Sign Up Form */}
          {(mode === 'signin' || mode === 'signup') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Sarah Chen"
                    required={mode === 'signup'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@clinic.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  >
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_email');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required={mode === 'signup'}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 leading-relaxed">
                  ℹ️ <strong className="font-semibold text-slate-700">Doctor Access:</strong> New accounts are automatically assigned the <span className="font-semibold text-teal-700">Doctor</span> role. An administrator can elevate your permissions to AI Lab Researcher or Admin if required.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {isLoading
                  ? mode === 'signup'
                    ? 'Creating Account…'
                    : 'Signing In…'
                  : mode === 'signup'
                  ? 'Create Doctor Account'
                  : 'Sign In'}
              </button>
            </form>
          )}

          {/* 2. Forgot Password Step 1: Enter Email */}
          {mode === 'forgot_email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label
                  htmlFor="resetEmail"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Registered Email Address
                </label>
                <div className="relative">
                  <input
                    id="resetEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@clinic.com"
                    required
                    className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                {isLoading ? 'Sending OTP…' : 'Send OTP Code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  resetForm();
                }}
                className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel & Return to Sign In
              </button>
            </form>
          )}

          {/* 3. Forgot Password Step 2: Verify OTP */}
          {mode === 'forgot_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="otpCode"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  >
                    6-Digit OTP Code
                  </label>
                  {cooldown > 0 ? (
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                      ⌛ Expires in {cooldown}s
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                      ⚠️ OTP Expired
                    </span>
                  )}
                </div>
                <input
                  id="otpCode"
                  type="text"
                  maxLength={10}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    if (pasted) setOtpToken(pasted);
                  }}
                  placeholder="Paste 6-digit OTP code"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-center text-lg tracking-widest font-mono text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Didn't receive or code expired?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="font-semibold text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                  Resend OTP
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {isLoading ? 'Verifying OTP…' : 'Verify OTP Code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('forgot_email');
                  setError(null);
                }}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Change Email Address
              </button>
            </form>
          )}

          {/* 4. Forgot Password Step 3: Set New Password */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmNewPassword"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmNewPassword"
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-type new password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                {isLoading ? 'Updating Password…' : 'Set New Password'}
              </button>
            </form>
          )}

          {/* Toggle Helper at bottom */}
          {(mode === 'signin' || mode === 'signup') && (
            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
              {mode === 'signin' ? (
                <p>
                  First time using DoctorSakhi?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      resetForm();
                    }}
                    className="font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      resetForm();
                    }}
                    className="font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    Sign in instead
                  </button>
                </p>
              )}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          DoctorSakhi Evaluation Studio • Secured by Supabase Row-Level Security
        </p>
      </div>
    </div>
  );
}
