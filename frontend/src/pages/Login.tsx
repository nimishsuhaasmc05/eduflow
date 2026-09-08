import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, formatApiError } from '../services/api';
import { BrainCircuit, Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('student@eduflow.ai');
  const [password, setPassword] = useState('student123');
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'EduFlow | Sign In';
  }, []);

  const handleQuickFill = (selectedRole: 'student' | 'teacher' | 'admin') => {
    if (loading) return;
    setRole(selectedRole);
    setError('');
    if (selectedRole === 'student') {
      setEmailOrUsername('student@eduflow.ai');
      setPassword('student123');
    } else if (selectedRole === 'teacher') {
      setEmailOrUsername('teacher@eduflow.ai');
      setPassword('teacher123');
    } else {
      setEmailOrUsername('admin@eduflow.ai');
      setPassword('admin123');
    }
  };

  const getRoleDisplayName = (r: 'student' | 'teacher' | 'admin') => {
    switch (r) {
      case 'student': return 'Student';
      case 'teacher': return 'Teacher';
      case 'admin': return 'Admin';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmittingRef.current) return;

    setError('');
    const input = emailOrUsername.trim();

    // Client-side validation before API call
    if (!input) {
      setError('Email or username is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    isSubmittingRef.current = true;

    try {
      const tokenData = await authApi.login(input, password);
      // Backend may return user in Token response or via getMe
      let me = tokenData.user;
      if (!me) {
        me = await authApi.getMe();
      }
      login(tokenData.access_token, me);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('[LOGIN ERROR]', err);
      const friendlyMsg = formatApiError(err, 'Unable to sign in. Please check your credentials and try again.');
      setError(friendlyMsg);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col lg:flex-row overflow-hidden font-sans">
      
      {/* Left Side (Form Area - 45%) */}
      <div className="lg:w-[45%] bg-white dark:bg-slate-950 flex items-center justify-center p-6 md:p-12 overflow-y-auto border-r border-slate-200 dark:border-slate-800">
        <div className="w-full max-w-md space-y-6">
          
          <div className="space-y-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-extrabold text-sm shadow-md">
                <BrainCircuit className="w-5 h-5 text-cyan-600 dark:text-cyan-500" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">Edu-Flow</span>
            </div>

            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Sign In</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">Welcome back to your adaptive learning workspace.</p>
          </div>

          {/* Quick-Fill Role Selector */}
          <div>
            <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 mb-1.5 tracking-wider">
              Quick Role Select
            </div>
            <div role="tablist" aria-label="Select demo role" className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-1">
              <button
                type="button"
                role="tab"
                aria-selected={role === 'student'}
                onClick={() => handleQuickFill('student')}
                disabled={loading}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-50 ${
                  role === 'student' 
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60' 
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={role === 'teacher'}
                onClick={() => handleQuickFill('teacher')}
                disabled={loading}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-50 ${
                  role === 'teacher' 
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60' 
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
                }`}
              >
                Teacher
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={role === 'admin'}
                onClick={() => handleQuickFill('admin')}
                disabled={loading}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-50 ${
                  role === 'admin' 
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60' 
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
                }`}
              >
                Admin
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-sans flex items-start space-x-2">
              <span className="font-bold flex-shrink-0" aria-hidden="true">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-identifier" className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5 tracking-wider">
                Email Address or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" aria-hidden="true" />
                <input
                  id="login-identifier"
                  type="text"
                  required
                  disabled={loading}
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="student@eduflow.ai or alex_learner"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-sans disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5 tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-11 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-sans disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono font-bold text-xs tracking-wider transition-all hover:opacity-90 active:scale-[0.99] flex items-center justify-center space-x-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 dark:text-cyan-600" aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {getRoleDisplayName(role)}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Security Badge (Neutral Informational Style) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center space-x-2 font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
              <span>Secure • On-Device Vision Processing</span>
            </div>
            <p className="font-sans text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Raw video feeds remain strictly on your local browser. No video pixels are ever stored or transmitted.
            </p>
          </div>

          <div className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            Don't have an account?{' '}
            <Link to="/register" className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline">
              Create one
            </Link>
          </div>

        </div>
      </div>

      {/* Right Side (55% Large Real Student Photography) */}
      <div className="lg:w-[55%] relative bg-slate-950 hidden lg:flex flex-col justify-between p-14 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80"
          alt="Students studying together with laptops"
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
          <span className="px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-slate-700/80 text-cyan-400 text-xs font-mono font-bold tracking-wider backdrop-blur-md inline-block shadow-md">
            Vision Telemetry Engine
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Real-Time Diagnostic Learning Workspace
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Edu-Flow measures facial landmark mesh vectors locally inside your browser to continuously optimize pedagogical delivery.
          </p>
        </div>
      </div>

    </div>
  );
};

export default Login;
