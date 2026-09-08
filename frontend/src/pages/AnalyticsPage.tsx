import React, { useEffect } from 'react';
import { AffectiveHeatmap } from '../components/teacher/AffectiveHeatmap';
import { BarChart3, Brain, Activity, Sparkles } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  useEffect(() => {
    document.title = 'EduFlow | Analytics';
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Engagement & Learning Analytics</h1>
        <p className="text-xs text-slate-400">Class-wide attention telemetry, learning difficulty indicators & closed-loop efficiency logs</p>
      </div>

      <AffectiveHeatmap />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400">Average Focus Duration</span>
          <div className="text-2xl font-extrabold text-cyan-400 font-mono">42 Minutes</div>
          <p className="text-[10px] text-slate-500">Without distraction triggers</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400">Confusion Recovery Speed</span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">1.8 Seconds</div>
          <p className="text-[10px] text-slate-500">Post closed-loop intervention</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400">Learning Difficulty Indicator</span>
          <div className="text-2xl font-extrabold text-purple-400 font-mono">35% (Optimal)</div>
          <p className="text-[10px] text-slate-500">Pacing automatically calibrated</p>
        </div>
      </div>
    </div>
  );
};
