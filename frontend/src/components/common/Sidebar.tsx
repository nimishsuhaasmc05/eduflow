import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, BookOpen, Compass, Trophy, BarChart3, Settings, 
  LogOut, Video, Users, UserCheck
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
    <aside className="hidden md:flex w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col p-4 space-y-6 shadow-sm transition-colors duration-200">
      <div className="space-y-3">
        <div className="px-3 text-xs font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400">
          Navigation Menu
        </div>
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Gamification / XP Widget & Action Block */}
      <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        {role === 'student' && user && (
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Learning Streak</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1 font-mono">
                🔥 {user.streak_days || 7} Days
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>Total XP</span>
              <span className="text-cyan-700 dark:text-cyan-400 font-bold">{user.total_xp || 1450} XP</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="bg-cyan-600 dark:bg-cyan-500 h-full w-[72%] rounded-full"></div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
