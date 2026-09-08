import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, AlertCircle, Sparkles } from 'lucide-react';

export const AffectiveHeatmap: React.FC = () => {
  const data = [
    { time: '0s', Attention: 92, Confusion: 10, Boredom: 5, LearningDifficulty: 35 },
    { time: '30s', Attention: 90, Confusion: 12, Boredom: 8, LearningDifficulty: 40 },
    { time: '60s', Attention: 88, Confusion: 15, Boredom: 10, LearningDifficulty: 45 },
    { time: '90s', Attention: 65, Confusion: 78, Boredom: 12, LearningDifficulty: 82 }, // Hotspot
    { time: '120s', Attention: 72, Confusion: 64, Boredom: 15, LearningDifficulty: 75 }, // Hotspot
    { time: '150s', Attention: 85, Confusion: 25, Boredom: 10, LearningDifficulty: 50 }, // Recovery
    { time: '180s', Attention: 94, Confusion: 12, Boredom: 8, LearningDifficulty: 42 },
    { time: '210s', Attention: 91, Confusion: 10, Boredom: 14, LearningDifficulty: 45 },
    { time: '240s', Attention: 70, Confusion: 15, Boredom: 62, LearningDifficulty: 38 }, // Boredom spike
    { time: '270s', Attention: 88, Confusion: 12, Boredom: 20, LearningDifficulty: 40 },
    { time: '300s', Attention: 95, Confusion: 8, Boredom: 5, LearningDifficulty: 35 },
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Class-wide Timeline Affective Heatmap</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Aggregated real-time telemetry across 48 enrolled students for Module 1
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-amber-950/80 text-amber-400 border border-amber-800/60 px-3 py-1 rounded-full font-semibold flex items-center space-x-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Hotspot Detected at 90s-120s</span>
          </span>
        </div>
      </div>

      <div className="h-72 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDiff" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EC4899" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="time" stroke="#64748B" fontSize={11} />
            <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Area type="monotone" dataKey="Attention" name="Attention Level" stroke="#3B82F6" fillOpacity={1} fill="url(#colorAtt)" />
            <Area type="monotone" dataKey="Confusion" name="Confusion" stroke="#F59E0B" fillOpacity={1} fill="url(#colorConf)" />
            <Area type="monotone" dataKey="LearningDifficulty" name="Learning Difficulty Indicator" stroke="#EC4899" fillOpacity={1} fill="url(#colorDiff)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start space-x-2">
        <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold text-white">AI Instructional Recommendation:</span> At timestamp 01:30 (90s), 78% of students exhibited eyebrows contraction during the math proof. Edu-Flow automatically generated a 3D visual diagram intervention which successfully restored class attention to 94%.
        </div>
      </div>
    </div>
  );
};
