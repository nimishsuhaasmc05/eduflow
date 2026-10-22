import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, BookOpen, Compass, Trophy, BarChart3, Settings, 
  LogOut, Video, Users, UserCheck, ChevronLeft, ChevronRight
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const role = user?.role || 'student';

  const studentLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/live', label: 'Online Classes', icon: Video },
    { to: '/explore', label: 'Explore Courses', icon: Compass },
    { to: '/library', label: 'Digital Library', icon: BookOpen },
    { to: '/leaderboard', label: 'Leaderboard & XP', icon: Trophy },
    { to: '/analytics', label: 'Cognitive Reports', icon: BarChart3 },
    { to: '/profile', label: 'Student Profile', icon: Settings },
  ];

  const teacherLinks = [
    { to: '/dashboard', label: 'Teacher Portal', icon: LayoutDashboard },
    { to: '/live', label: 'Online Classes', icon: Video },
    { to: '/explore', label: 'Course Catalog', icon: Compass },
    { to: '/analytics', label: 'Affective Heatmaps', icon: BarChart3 },
    { to: '/profile', label: 'Profile Settings', icon: Settings }
  ];

  const adminLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/teachers', label: 'Teacher Management', icon: UserCheck },
    { to: '/admin/students', label: 'Student Management', icon: Compass },
    { to: '/admin/courses', label: 'Course Management', icon: BookOpen },
    { to: '/admin/live-classes', label: 'Live Classes', icon: Video },
    { to: '/admin/system', label: 'System Monitoring', icon: BarChart3 },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: Settings },
    { to: '/admin/settings', label: 'System Settings', icon: Settings },
    { to: '/profile', label: 'My Profile', icon: Settings }
  ];

  const links = role === 'admin' ? adminLinks : role === 'teacher' ? teacherLinks : studentLinks;

  return (
    <aside
      className={`hidden md:flex shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0B0F17] flex-col transition-all duration-300 relative select-none ${
        collapsed ? 'w-16 p-2' : 'w-56 p-3.5'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm z-30 transition-transform"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      <div className="space-y-2 flex-1">
        {!collapsed && (
          <div className="px-2.5 py-1 text-[11px] font-mono font-medium tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Menu
          </div>
        )}
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                title={collapsed ? link.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-lg text-xs font-medium transition-all ${
                    collapsed ? 'justify-center p-2.5' : 'space-x-3 px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{link.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Gamification / Streak / Sign Out Footer */}
      <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
        {role === 'student' && user && !collapsed && (
          <div className="bg-slate-50 dark:bg-[#111722] rounded-xl p-3 border border-slate-200/60 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Streak</span>
              <span className="font-bold text-amber-500 dark:text-amber-400 font-mono text-[11px]">
                🔥 {user.streak_days || 7}d
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full w-[72%] rounded-full"></div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          title={collapsed ? "Sign Out" : undefined}
          className={`w-full rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center ${
            collapsed ? 'justify-center p-2.5' : 'space-x-2.5 px-3 py-2'
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
