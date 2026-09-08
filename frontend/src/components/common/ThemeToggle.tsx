import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Laptop } from 'lucide-react';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div 
      role="group" 
      aria-label="Theme selection" 
      className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 ${className}`}
    >
      <button
        type="button"
        onClick={() => setThemeMode('light')}
        title="Light theme"
        aria-label="Switch to light theme"
        className={`p-1.5 rounded-lg transition-all ${
          themeMode === 'light'
            ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Sun className="w-4 h-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => setThemeMode('dark')}
        title="Dark theme"
        aria-label="Switch to dark theme"
        className={`p-1.5 rounded-lg transition-all ${
          themeMode === 'dark'
            ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Moon className="w-4 h-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => setThemeMode('system')}
        title="System theme"
        aria-label="Switch to system theme"
        className={`p-1.5 rounded-lg transition-all ${
          themeMode === 'system'
            ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Laptop className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};
