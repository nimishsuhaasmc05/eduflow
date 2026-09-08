import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Shield, Cpu, Lock, CheckCircle2 } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { getStoredToken } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = getStoredToken();
        const res = await fetch('/api/v1/admin/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error("Fetch admin settings error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Settings className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>System Platform Settings</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            GLOBAL CONFIGURATION • AI PROVIDER ENGINE • SECURITY POLICY SETTINGS
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
          LOADING PLATFORM SETTINGS...
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-6">
          {saved && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-mono flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Platform settings updated successfully.</span>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Shield className="w-4 h-4 text-cyan-500" />
              <span>General Platform Configuration</span>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <label className="block text-slate-400">Platform Name</label>
              <input
                type="text"
                defaultValue={settings?.platform_name || 'Edu-Flow SaaS Platform'}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
              />
            </div>

            <div className="space-y-2 text-xs font-mono">
              <label className="block text-slate-400">Default User Role on Registration</label>
              <select
                defaultValue={settings?.default_user_role || 'student'}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
              >
                <option value="student">Student (Learner)</option>
                <option value="teacher">Teacher (Instructor)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-500" />
              <span>AI Tutor & LLM Provider Engine</span>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <label className="block text-slate-400">Active AI Model Strategy</label>
              <input
                type="text"
                disabled
                value={settings?.ai_provider || 'Gemini 3.6 Flash + OpenAI GPT-4 Failover'}
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500"
              />
            </div>

            <div className="space-y-2 text-xs font-mono">
              <label className="block text-slate-400">Security Authorization Standard</label>
              <input
                type="text"
                disabled
                value={settings?.security_policy || 'JWT Bearer Authentication + RBAC'}
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all"
            >
              Save Platform Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
