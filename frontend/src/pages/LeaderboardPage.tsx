import React, { useEffect, useState } from 'react';
import { userApi } from '../services/api';
import { User } from '../types';
import { Trophy, Award, Flame, Sparkles, Medal, RefreshCw } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    document.title = 'EduFlow | Leaderboard';
    userApi.getLeaderboard()
      .then(setUsers)
      .catch((err) => console.warn('Failed to load leaderboard:', err))
      .finally(() => setLoading(false));
  }, []);

  const getBadge = (rank: number, xp: number) => {
    if (rank === 1) return 'Focus Titan';
    if (rank === 2) return 'Master Learner';
    if (rank === 3) return 'Deep Focus';
    if (xp >= 500) return 'Rising Star';
    return 'Active Learner';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
          <Trophy className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Affective Leaderboard & Gamification</h1>
        <p className="text-xs text-slate-400">Database rankings sorted by total XP, streak consistency & adaptive quiz mastery</p>
      </div>

      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-cyan-400 flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Fetching PostgreSQL leaderboard...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((item, index) => {
              const rank = index + 1;
              const badge = getBadge(rank, item.total_xp || 0);
              const attPercent = `${Math.round((item.avg_attention_score || 0.85) * 100)}%`;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    rank === 1
                      ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/30 border-amber-500/40 shadow-glow-cyan'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      rank === 1 ? 'bg-amber-400 text-slate-950 font-extrabold' : rank === 2 ? 'bg-slate-300 text-slate-950 font-bold' : rank === 3 ? 'bg-amber-700 text-white font-bold' : 'bg-slate-800 text-slate-400'
                    }`}>
                      #{rank}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                        <span>{item.full_name}</span>
                        <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full capitalize">
                          {item.role} • {badge}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">Streak: 🔥 {item.streak_days || 1} Days • Attention: {attPercent}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-cyan-400 font-mono">{item.total_xp || 0} XP</div>
                    <div className="text-[10px] text-emerald-400 font-semibold">PostgreSQL Verified</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
