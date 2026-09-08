import React from 'react';
import { Award, Download, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const CertificateModal: React.FC<{ onClose: () => void; courseId?: number; courseTitle?: string }> = ({ onClose, courseId = 1, courseTitle }) => {
  const { user } = useAuth();
  const userName = user?.full_name || 'Enrolled Learner';
  const title = courseTitle || 'Deep Learning Architecture & Affective Feedback Loops';

  const [certData, setCertData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('eduflow_access_token') || localStorage.getItem('token');
    fetch(`/api/v1/courses/${courseId}/claim-certificate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Complete 100% of the course before claiming your certificate.');
        }
        if (isMounted) setCertData(data);
      })
      .catch((err: any) => {
        if (isMounted) setError(err.message || 'Complete 100% of the course before claiming your certificate.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl glass-panel rounded-3xl border border-indigo-500/40 p-8 space-y-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold print:hidden"
        >
          ✕
        </button>

        {/* Certificate Content or Locked Error Display */}
        {loading ? (
          <div className="p-12 text-center text-slate-300 font-mono text-xs animate-pulse">
            Verifying 100% course completion & server entitlement...
          </div>
        ) : error ? (
          <div className="p-8 bg-amber-950/60 border-2 border-amber-500/40 rounded-2xl text-center space-y-4 font-mono">
            <div className="text-3xl">🔒</div>
            <h3 className="text-lg font-extrabold text-amber-300">CERTIFICATE LOCKED</h3>
            <p className="text-xs text-amber-200/90 max-w-md mx-auto leading-relaxed">{error}</p>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-sans font-bold text-xs hover:bg-amber-400 transition-all shadow-md"
              >
                Return to Course & Complete Lessons →
              </button>
            </div>
          </div>
        ) : (
          <div className="border-4 border-double border-indigo-500/40 rounded-2xl p-8 bg-gradient-to-b from-[#0F172A] via-[#0B0F17] to-[#0A0E1A] text-center space-y-6 relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] shadow-glow-cyan">
                <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center text-cyan-400">
                  <Award className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-cyan-200 to-white">
                Certificate of Completion
              </h2>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Edu-Flow Affective-Feedback Closed-Loop Adaptive Learning Platform
              </p>
            </div>

            <p className="text-xs text-slate-300 italic">This is to certify that</p>

            <h3 className="text-3xl font-extrabold text-white tracking-tight underline decoration-cyan-500/50 underline-offset-8">
              {certData?.student_name || userName}
            </h3>

            <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
              has successfully completed 100% of the advanced curriculum on
            </p>

            <h4 className="text-lg font-bold text-cyan-300">
              {certData?.course_title || title}
            </h4>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-left text-xs max-w-xl mx-auto">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Average Attention Score</p>
                <p className="font-mono font-bold text-emerald-400">92.4% Optimal</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Closed-Loop Recovery</p>
                <p className="font-mono font-bold text-cyan-400">100% Adaptive</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Certificate ID</p>
                <p className="font-mono text-[9px] text-slate-400 truncate">{certData?.certificate_code || 'EDFL-2026-99A8-77BF'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800/80 max-w-xl mx-auto text-xs text-slate-400">
              <div className="text-left">
                <p className="font-bold text-slate-200">Edu-Flow Academic Board</p>
                <p className="text-[10px]">Head of AI & Adaptive Systems</p>
              </div>
              <div className="flex items-center space-x-1 text-cyan-400 font-mono text-[10px]">
                <ShieldCheck className="w-4 h-4" />
                <span>Digitally Authenticated Certificate</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-end space-x-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
          {!error && !loading && (
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-slate-950 font-bold text-xs hover:opacity-90 transition-all flex items-center space-x-2 shadow-glow-cyan"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Certificate</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
