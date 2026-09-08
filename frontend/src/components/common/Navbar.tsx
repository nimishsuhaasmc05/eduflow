import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAffective } from '../../context/AffectiveContext';
import { ThemeToggle } from './ThemeToggle';
import { BrainCircuit, ShieldCheck, LogOut, Activity } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { metrics, isMonitoring } = useAffective();
  const navigate = useNavigate();

  const getStatusBadge = () => {
    switch (metrics.primary_state) {
      case 'CONFUSION': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'DISTRACTION': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'BOREDOM': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'HIGH_COGNITIVE_LOAD': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
      default: return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <nav className="h-14 border-b border-slate-200 dark:border-[#26323A] bg-white/95 dark:bg-[#080B0F]/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 font-sans transition-colors duration-150">
      {/* Brand Logo */}
      <div className="flex items-center space-x-6">
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded bg-[#0EA5E9] dark:bg-[#22D3EE] flex items-center justify-center text-black font-extrabold text-sm">
            <BrainCircuit className="w-4 h-4 text-black" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              Edu<span className="text-[#0EA5E9] dark:text-[#22D3EE]">-Flow</span>
            </span>
          </div>
        </Link>
      </div>

      {/* Center Vision Telemetry Instrumentation Indicator */}
      {isMonitoring && (
        <div className="hidden md:flex items-center space-x-3 bg-slate-50 dark:bg-[#11171D] border border-slate-200 dark:border-[#26323A] rounded px-3 py-1 font-mono text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22D3EE] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22D3EE]"></span>
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-bold">TELEMETRY:</span>
            <span className="text-[#0EA5E9] dark:text-[#22D3EE] font-bold">{metrics.fps} FPS</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-300 dark:bg-[#26323A]"></div>
          <div className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getStatusBadge()}`}>
            {metrics.primary_state} (ATTENTION: {(metrics.attention * 100).toFixed(0)}%)
          </div>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        <ThemeToggle />

        {user ? (
          <div className="flex items-center space-x-3">
            <Link to="/profile" className="flex items-center space-x-3 group cursor-pointer" title="View Profile">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#0EA5E9] dark:group-hover:text-[#22D3EE] transition-colors">{user.full_name}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono capitalize flex items-center justify-end space-x-1">
                  <ShieldCheck className="w-3 h-3 text-[#0EA5E9] dark:text-[#22D3EE]" />
                  <span>{user.role} Portal</span>
                </div>
              </div>
              
              {user.avatar_url ? (
                <img
                  src={user.avatar_url.startsWith('/') ? `${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/v1\/?$/, '')}${user.avatar_url}` : user.avatar_url}
                  alt={user.full_name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-[#26323A] group-hover:border-[#0EA5E9] dark:group-hover:border-[#22D3EE] transition-colors"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#0EA5E9] dark:bg-[#22D3EE] text-white dark:text-black font-mono font-bold flex items-center justify-center text-xs group-hover:opacity-90 transition-opacity">
                  {user.full_name.charAt(0)}
                </div>
              )}
            </Link>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Link to="/login" className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5">
              SIGN IN
            </Link>
            <Link to="/register" className="text-xs font-mono font-bold text-white dark:text-black bg-[#0EA5E9] dark:bg-[#22D3EE] px-3.5 py-1.5 rounded transition-colors">
              GET STARTED
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};
