import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi, formatApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BrainCircuit, ArrowRight, ShieldCheck, User as UserIcon, Mail, Lock, AtSign, Eye, EyeOff, Loader2 } from 'lucide-react';

export const Register: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'EduFlow | Create Account';
  }, []);

  const validateInputs = (): string | null => {
    const trimmedFullName = fullName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFullName) {
      return 'Full name is required.';
    }
    if (!trimmedUsername) {
      return 'Username is required.';
    }
    if (trimmedUsername.length < 3) {
      return 'Username must be at least 3 characters long.';
    }
    if (!trimmedEmail) {
      return 'Email address is required.';
    }
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return 'Please enter a valid email address.';
    }
    if (!password) {
      return 'Password is required.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmittingRef.current) return;

    setError('');
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    isSubmittingRef.current = true;

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();
    const trimmedFullName = fullName.trim();

    const payload = {
      email: trimmedEmail,
      username: trimmedUsername,
      full_name: trimmedFullName,
      password: password,
      role: role.toLowerCase()
    };

    try {
      // 1. Create Account
      await authApi.register(payload);

      // 2. Authenticate Session
      const tokenData = await authApi.login(trimmedEmail, password);
      let me = tokenData.user;
      if (!me) {
        me = await authApi.getMe();
      }
      login(tokenData.access_token, me);

      // 3. Navigate to Dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('[REGISTRATION ERROR]', err);
      const friendlyMsg = formatApiError(err, 'Unable to create your account. Please check your details and try again.');
      setError(friendlyMsg);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080B0F] text-[#0F172A] dark:text-[#F1F5F9] flex flex-col lg:flex-row overflow-hidden font-sans">
      
      {/* Left Side (Registration Form - 45%) */}
      <div className="lg:w-[45%] bg-white dark:bg-[#080B0F] flex items-center justify-center p-6 md:p-12 overflow-y-auto border-r border-slate-200 dark:border-slate-800">
        <div className="w-full max-w-md space-y-6">
          
          <div className="space-y-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-extrabold text-sm shadow-md">
                <BrainCircuit className="w-5 h-5 text-cyan-400 dark:text-cyan-600" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">Edu-Flow</span>
            </div>

            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">CREATE ACCOUNT</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">Fill in your details below to activate your adaptive learning workspace.</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-sans flex items-start space-x-2">
              <span className="font-bold flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-slate-50 dark:bg-[#11171D] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-sans disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex_learner"
                  className="w-full bg-slate-50 dark:bg-[#11171D] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-sans disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@eduflow.ai"
                  className="w-full bg-slate-50 dark:bg-[#11171D] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-sans disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-50 dark:bg-[#11171D] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-11 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-sans disabled:opacity-60"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Register As
              </label>
              <select
                value={role}
                disabled={loading}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-[#11171D] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono font-bold disabled:opacity-60"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono font-bold text-xs tracking-wider transition-all hover:opacity-90 active:scale-[0.99] flex items-center justify-center space-x-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 dark:text-cyan-600" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>CREATE ACCOUNT</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Security Badge */}
          <div className="p-4 bg-slate-50 dark:bg-[#11171D] border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>SECURE • ON-DEVICE VISION PROCESSING</span>
            </div>
            <p className="font-sans text-[11px]">Raw video feeds remain strictly on your local browser. No video pixels are ever stored or transmitted.</p>
          </div>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline">
              Sign in here
            </Link>
          </div>

        </div>
      </div>

      {/* Right Side (55% Large Real Educational Photography) */}
      <div className="lg:w-[55%] relative bg-slate-950 hidden lg:flex flex-col justify-between p-14 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop&q=80"
          alt="Students studying together"
          className="absolute inset-0 w-full h-full object-cover filter brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-slate-950 font-extrabold text-sm shadow-md">
            <BrainCircuit className="w-5 h-5 text-cyan-600" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white font-sans">
            Edu<span className="text-cyan-400">-Flow</span>
          </span>
        </div>

        <div className="relative z-10 space-y-4 max-w-lg">
          <span className="px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-widest backdrop-blur-md">
            PRIVACY-BY-DESIGN
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Create Your Adaptive Workspace
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Join thousands of learners benefiting from privacy-first vision telemetry and adaptive generative AI tutoring.
          </p>
        </div>
      </div>

    </div>
  );
};
