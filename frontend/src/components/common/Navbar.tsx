import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAffective } from '../../context/AffectiveContext';
import { ThemeToggle } from './ThemeToggle';
import { BrainCircuit, ShieldCheck, LogOut, Activity, Menu, X, LayoutDashboard, Video, Compass, BookOpen, Trophy, BarChart3, Settings } from 'lucide-react';
import { Link, useNavigate, NavLink } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { metrics, isMonitoring } = useAffective();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getStatusBadge = () => {
    switch (metrics.primary_state) {
      case 'CONFUSION': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'DISTRACTION': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'BOREDOM': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'HIGH_COGNITIVE_LOAD': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
      default: return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    }
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/live', label: 'Online Classes', icon: Video },
    { to: '/explore', label: 'Explore Courses', icon: Compass },
    { to: '/library', label: 'Digital Library', icon: BookOpen },
    { to: '/leaderboard', label: 'Leaderboard & XP', icon: Trophy },
    { to: '/analytics', label: 'Cognitive Reports', icon: BarChart3 },
    { to: '/profile', label: 'Profile Settings', icon: Settings },
  ];

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

            {/* Mobile Hamburger Toggle (Visible only on mobile) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
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

      {/* Mobile Drawer Overlay (Prevents UI overlapping and ensures clean mobile navigation) */}
      {mobileMenuOpen && user && (
        <div className="md:hidden fixed inset-x-0 top-14 bg-white/95 dark:bg-[#080B0F]/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 p-4 space-y-2 z-50 shadow-2xl animate-fade-in">
          <div className="px-3 pb-2 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
            Navigation Menu
          </div>
          <div className="grid grid-cols-1 gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

