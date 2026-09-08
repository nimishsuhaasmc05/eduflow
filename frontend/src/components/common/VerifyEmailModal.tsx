import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertTriangle, RefreshCw, Send } from 'lucide-react';
import { sendVerificationEmailLink, checkFirebaseEmailVerified } from '../../services/firebaseAuth';

interface VerifyEmailModalProps {
  email: string;
  onVerified: () => void;
  onLogout: () => void;
}

export const VerifyEmailModal: React.FC<VerifyEmailModalProps> = ({ email, onVerified, onLogout }) => {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setResending(true);
    setMessage(null);
    setError(null);
    try {
      await sendVerificationEmailLink();
      setMessage("A fresh verification link has been sent to your email address.");
    } catch (err: any) {
      setError(err.message || "Failed to resend verification email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    setChecking(true);
    setMessage(null);
    setError(null);
    try {
      const verified = await checkFirebaseEmailVerified();
      if (verified) {
        onVerified();
      } else {
        setError("Your email address is not verified yet. Please click the link sent to your inbox.");
      }
    } catch (err: any) {
      setError("Unable to check verification status. Please check your network.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#080B0F]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#11171D] border border-slate-200 dark:border-[#26323A] rounded-md max-w-md w-full p-6 space-y-5 shadow-2xl font-sans">
        
        {/* Header Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                EMAIL VERIFICATION REQUIRED
              </span>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Verify Your Email
              </h2>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          We've sent a verification link to <strong className="text-slate-900 dark:text-white font-mono">{email}</strong>. Please verify your email before continuing to your dashboard.
        </p>

        {message && (
          <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="p-3 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-mono">
            ⚠️ {error}
          </div>
        )}

        {/* Action Triggers */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#26323A]">
          <button
            type="button"
            onClick={handleCheckVerified}
            disabled={checking}
            className="w-full py-2.5 rounded bg-[#0EA5E9] dark:bg-[#22D3EE] text-white dark:text-black font-mono font-extrabold text-xs tracking-wider transition-opacity hover:opacity-90 flex items-center justify-center space-x-2"
          >
            {checking ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>I'VE VERIFIED MY EMAIL</span>
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full py-2.5 rounded bg-white dark:bg-[#080B0F] border border-slate-300 dark:border-[#26323A] text-slate-700 dark:text-slate-300 font-mono font-bold text-xs hover:border-[#0EA5E9] dark:hover:border-[#22D3EE] transition-colors flex items-center justify-center space-x-2"
          >
            {resending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>RESEND VERIFICATION EMAIL</span>
          </button>
        </div>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onLogout}
            className="text-[11px] font-mono text-slate-400 hover:text-rose-500 underline"
          >
            Sign out and return to Login
          </button>
        </div>

      </div>
    </div>
  );
};
