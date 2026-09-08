import React, { useState } from 'react';
import { useAffective } from '../../context/AffectiveContext';
import { attentionMonitor } from '../../services/attentionMonitor';
import { learnerStateClassifier } from '../../services/learnerStateClassifier';
import { closedLoopController } from '../../services/closedLoopController';
import { 
  Activity, Eye, Compass, CheckCircle2, AlertCircle, ShieldAlert, 
  ChevronDown, ChevronUp, Sparkles, RotateCcw, Sliders, User, Clock, Check
} from 'lucide-react';

const EYE_STATE_LABELS: Record<string, { label: string; color: string }> = {
  'OPEN':              { label: 'Open',          color: 'text-emerald-400' },
  'PARTIALLY_CLOSED':  { label: 'Partially Open', color: 'text-amber-400' },
  'CLOSED':            { label: 'Closed',        color: 'text-amber-300' },
  'NORMAL_BLINK':      { label: 'Normal Blink',  color: 'text-cyan-400' },
  'PROLONGED_CLOSURE': { label: 'Closed (Long)',  color: 'text-rose-400' },
};

export const AffectiveHUD: React.FC = () => {
  const { metrics, landmarks } = useAffective();
  const [showDevControls, setShowDevControls] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState<string | null>(null);

  // Compute real-time attention & perceptual telemetry
  const attention = attentionMonitor.computeMetrics(landmarks, metrics.fps);
  const debug = attentionMonitor.getDebugInfo();

  // Unified Learner State Classification
  const stateInfo = learnerStateClassifier.classify(
    metrics,
    debug,
    attention.isFaceDetected,
    attention.gazeDirection,
    attention.headPose.yaw,
    attention.headPose.pitch
  );

  const context = stateInfo.context;
  const lastIntervention = closedLoopController.getLastInterventionRecord();

  // Status Badge Logic
  const getLearnerStatusBadge = () => {
    if (!attention.isFaceDetected && debug.faceLostDurationMs > 3000) {
      return {
        bg: 'bg-rose-950/80 text-rose-400 border-rose-800/80',
        icon: ShieldAlert,
        label: 'Face Not Detected',
      };
    }
    if (stateInfo.state === 'FOCUSED') {
      return {
        bg: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80',
        icon: CheckCircle2,
        label: 'Focused',
      };
    }
    if (stateInfo.state === 'NEEDS_SUPPORT') {
      return {
        bg: 'bg-indigo-950/80 text-indigo-400 border-indigo-800/80',
        icon: Sparkles,
        label: 'Needs Support',
      };
    }
    return {
      bg: 'bg-amber-950/80 text-amber-400 border-amber-800/80',
      icon: AlertCircle,
      label: 'Low Engagement',
    };
  };

  const badge = getLearnerStatusBadge();
  const BadgeIcon = badge.icon;
  const eyeDisplay = EYE_STATE_LABELS[debug.eyeState] || EYE_STATE_LABELS['OPEN'];

  const isVisualMeasurementAvailable = attention.isFaceDetected || debug.faceLostDurationMs <= 3000;

  const handleSimulate = (preset: string) => {
    setActiveSimulation(preset);
    if (preset === 'RESET') {
      attentionMonitor.setSimulationOverride(null);
      learnerStateClassifier.setRecentQuizScore(85);
      setActiveSimulation(null);
      return;
    }

    if (preset === 'FOCUSED') {
      attentionMonitor.setSimulationOverride({
        attentionScore: 92,
        gazeDirection: 'CENTER',
        status: 'Focused',
        headPose: { yaw: 0, pitch: 0, roll: 0 },
        blinkRateBPM: 16,
        isFaceDetected: true,
      }, {
        eyeState: 'OPEN',
        attentionScore: 92,
        learnerState: 'FOCUSED'
      });
      learnerStateClassifier.setRecentQuizScore(90);
    } else if (preset === 'NORMAL_BLINK') {
      // Test 2: Normal Blink (150ms) -> No Intervention
      attentionMonitor.setSimulationOverride({
        attentionScore: 90,
        gazeDirection: 'CENTER',
        status: 'Focused'
      }, {
        eyeState: 'NORMAL_BLINK',
        closureDurationMs: 150,
        attentionScore: 90
      });
      setTimeout(() => {
        attentionMonitor.setSimulationOverride(null);
        setActiveSimulation(null);
      }, 1500);
    } else if (preset === 'BRIEF_GAZE') {
      // Test 3: Brief Gaze Left 1s -> No Intervention
      attentionMonitor.setSimulationOverride({
        attentionScore: 88,
        gazeDirection: 'LEFT',
        status: 'Focused',
        headPose: { yaw: -14, pitch: 1, roll: 0 },
        isFaceDetected: true,
      });
      setTimeout(() => {
        attentionMonitor.setSimulationOverride(null);
        setActiveSimulation(null);
      }, 1200);
    } else if (preset === 'BRIEF_HEAD') {
      // Test 4: Brief Head Movement 1s -> No Intervention
      attentionMonitor.setSimulationOverride({
        attentionScore: 88,
        gazeDirection: 'CENTER',
        status: 'Focused',
        headPose: { yaw: -22, pitch: 4, roll: 2 },
        isFaceDetected: true,
      });
      setTimeout(() => {
        attentionMonitor.setSimulationOverride(null);
        setActiveSimulation(null);
      }, 1200);
    } else if (preset === 'SINGLE_YAWN') {
      // Test Y1: Single Yawn (2.0s MAR=0.7) -> Focused (90) -> No Intervention
      attentionMonitor.setSimulationOverride({
        attentionScore: 90,
        gazeDirection: 'CENTER',
        status: 'Focused',
        headPose: { yaw: 0, pitch: 0, roll: 0 },
        blinkRateBPM: 18,
        isFaceDetected: true,
      }, {
        eyeState: 'OPEN',
        mar: 0.72,
        mouthState: 'YAWN_DETECTED',
        yawnCount: (debug.yawnCount || 0) + 1,
        recentYawnCount: 1,
        attentionScore: 90,
        learnerState: 'FOCUSED'
      });
      setTimeout(() => {
        attentionMonitor.setSimulationOverride(null);
        setActiveSimulation(null);
      }, 2500);
    } else if (preset === 'FATIGUE_SIGNAL') {
      // Test Y2: Repeated Yawns + Gaze Deviation -> Possible fatigue signal
      attentionMonitor.setSimulationOverride({
        attentionScore: 54,
        gazeDirection: 'LEFT',
        status: 'Looking Away',
        headPose: { yaw: -22, pitch: 6, roll: 0 },
        blinkRateBPM: 28,
        isFaceDetected: true,
      }, {
        eyeState: 'PARTIALLY_CLOSED',
        mar: 0.68,
        mouthState: 'YAWN_DETECTED',
        yawnCount: (debug.yawnCount || 0) + 2,
        recentYawnCount: 2,
        attentionScore: 54,
        learnerState: 'DISTRACTED'
      });
    } else if (preset === 'HIGH_ATTENTION_NEEDS_SUPPORT') {
      // Test 10: High Attention (93) + Academic Needs Support (Quiz: 1/3)
      attentionMonitor.setSimulationOverride({
        attentionScore: 93,
        gazeDirection: 'CENTER',
        status: 'Focused',
        headPose: { yaw: 0, pitch: 0, roll: 0 },
        blinkRateBPM: 18,
        isFaceDetected: true,
      }, {
        eyeState: 'OPEN',
        attentionScore: 93,
        learnerState: 'NEEDS_SUPPORT'
      });
      learnerStateClassifier.setRecentQuizScore(33.3, 'Algorithm Efficiency');
    } else if (preset === 'SUSTAINED_DISENGAGEMENT') {
      // Test 7 & 8: Sustained disengagement (32) -> Micro Quiz eligible
      attentionMonitor.setSimulationOverride({
        attentionScore: 32,
        gazeDirection: 'LEFT',
        status: 'Looking Away',
        headPose: { yaw: -28, pitch: 14, roll: 5 },
        blinkRateBPM: 36,
        isFaceDetected: true,
      }, {
        eyeState: 'PROLONGED_CLOSURE',
        attentionScore: 32,
        learnerState: 'DISTRACTED'
      });
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
      {/* Clean Header: Learner State & Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">LEARNER STATE</span>
            <h3 className="text-sm font-bold text-slate-100">{stateInfo.state}</h3>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('eduflow:pop_interactive_quiz'))}
            className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold hover:bg-amber-500/30 transition-all flex items-center space-x-1"
            title="Try interactive knowledge challenge"
          >
            <span>⚡ Knowledge Check</span>
          </button>
          <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center space-x-1.5 shadow-sm ${badge.bg}`}>
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
          </div>
        </div>
      </div>

      {/* Attention / Engagement Score Gauge (Stable Height & Layout Containment) */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 space-y-2 min-h-[96px] flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-400">Attention / Engagement Score</span>
          {isVisualMeasurementAvailable ? (
            <span className="font-mono font-extrabold text-lg text-cyan-400">
              {attention.attentionScore} <span className="text-xs text-slate-500 font-normal">/ 100</span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-rose-400 font-mono">
              Temporarily Unavailable
            </span>
          )}
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-0.5">
          {isVisualMeasurementAvailable ? (
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                attention.attentionScore >= 70
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                  : attention.attentionScore >= 50
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-rose-500 to-pink-500'
              }`}
              style={{ width: `${attention.attentionScore}%` }}
            />
          ) : (
            <div className="h-full w-full bg-slate-700/50 animate-pulse rounded-full" />
          )}
        </div>
        <div className="min-h-[16px] flex items-center">
          {!isVisualMeasurementAvailable && (
            <p className="text-[10px] text-slate-400 italic">
              Visual engagement temporarily unavailable. Please position your face toward the camera.
            </p>
          )}
        </div>
      </div>

      {/* Simple 4-Card Telemetry Grid (Student-Facing) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Eye */}
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center space-x-1">
            <Eye className="w-3 h-3 text-indigo-400" />
            <span>Eye</span>
          </span>
          <div className={`text-xs font-bold font-mono ${eyeDisplay.color}`}>
            {isVisualMeasurementAvailable ? eyeDisplay.label : '—'}
          </div>
        </div>

        {/* Gaze */}
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center space-x-1">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>Gaze</span>
          </span>
          <div className="text-xs font-bold font-mono text-slate-200">
            {isVisualMeasurementAvailable ? attention.gazeDirection : '—'}
          </div>
        </div>

        {/* Head */}
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center space-x-1">
            <User className="w-3 h-3 text-emerald-400" />
            <span>Head</span>
          </span>
          <div className="text-xs font-bold font-mono text-slate-200">
            {isVisualMeasurementAvailable
              ? (Math.abs(attention.headPose.yaw) > 18
                  ? (attention.headPose.yaw < 0 ? 'Left' : 'Right')
                  : Math.abs(attention.headPose.pitch) > 18
                  ? (attention.headPose.pitch < 0 ? 'Up' : 'Down')
                  : 'Forward')
              : '—'}
          </div>
        </div>

        {/* Face */}
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center space-x-1">
            <Check className="w-3 h-3 text-cyan-400" />
            <span>Face</span>
          </span>
          <div className={`text-xs font-bold font-mono ${isVisualMeasurementAvailable ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isVisualMeasurementAvailable ? 'Detected' : 'Not Detected'}
          </div>
        </div>
      </div>

      {/* Historical Intervention Context (Shown only if prior intervention occurred) */}
      {lastIntervention && (
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] space-y-1">
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-amber-400 font-bold uppercase flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Prior Support: {lastIntervention.type}</span>
            </span>
            <span className="text-slate-400">{lastIntervention.resolved ? '✓ Completed' : 'In Progress'}</span>
          </div>
          <p className="text-slate-300">
            Context: <span className="text-slate-100">{lastIntervention.triggerReason}</span> • 
            Attention at trigger: <span className="text-cyan-400 font-mono font-bold">{lastIntervention.triggerScore}/100</span>
          </p>
        </div>
      )}

      {/* Developer & Evaluator Diagnostic Controls (Collapsed by default) */}
      <div className="pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Perception Rate: <strong className="text-cyan-400 font-mono">{attention.fps} FPS</strong></span>
          <button
            onClick={() => setShowDevControls(!showDevControls)}
            className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition-colors font-mono"
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px]">Developer Test Controls</span>
            {showDevControls ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {showDevControls && (
          <div className="mt-3 p-3 bg-slate-950/90 rounded-xl border border-slate-800/80 space-y-3 animate-fade-in text-[11px]">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase block mb-1.5">
                Research Test Scenarios (Multimodal & Yawn Pipeline)
              </span>
              <div className="grid grid-cols-2 gap-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => handleSimulate('FOCUSED')}
                  className={`py-1 px-2 rounded border text-[10px] transition-all text-left ${
                    activeSimulation === 'FOCUSED' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  🟢 Test 1: Focused (92)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('NORMAL_BLINK')}
                  className="py-1 px-2 rounded border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-[10px] text-left"
                >
                  ✨ Test 2: Normal Blink (150ms)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('SINGLE_YAWN')}
                  className={`py-1 px-2 rounded border text-[10px] transition-all text-left ${
                    activeSimulation === 'SINGLE_YAWN' ? 'bg-amber-600 text-white border-amber-400' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  🥱 Test Y1: Single Yawn (No Quiz)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('FATIGUE_SIGNAL')}
                  className={`py-1 px-2 rounded border text-[10px] transition-all text-left ${
                    activeSimulation === 'FATIGUE_SIGNAL' ? 'bg-rose-600 text-white border-rose-400' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  😴 Test Y2: 2 Yawns + Gaze Away
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('BRIEF_GAZE')}
                  className="py-1 px-2 rounded border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-[10px] text-left"
                >
                  👀 Test 3: Brief Gaze Left (1s)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('HIGH_ATTENTION_NEEDS_SUPPORT')}
                  className={`py-1 px-2 rounded border text-[10px] transition-all text-left ${
                    activeSimulation === 'HIGH_ATTENTION_NEEDS_SUPPORT' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  🔵 Test 10: Focused (93) + Quiz Difficulty
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('SUSTAINED_DISENGAGEMENT')}
                  className={`py-1 px-2 rounded border text-[10px] transition-all text-left ${
                    activeSimulation === 'SUSTAINED_DISENGAGEMENT' ? 'bg-rose-600 text-white border-rose-400' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  🔴 Test 7/8: Sustained Low (32)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('RESET')}
                  className="py-1 px-2 rounded border border-cyan-800/60 bg-cyan-950 text-cyan-300 hover:bg-cyan-900 text-[10px] col-span-2 flex items-center justify-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Live Webcam</span>
                </button>
              </div>
            </div>

            {/* Diagnostic Feature Panel for Evaluators & Debugging */}
            <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-[10px] font-mono text-slate-400">
              <div>Face: <span className={attention.isFaceDetected ? 'text-emerald-400 font-bold' : 'text-rose-400'}>{attention.isFaceDetected ? 'Detected' : 'Not Detected'}</span></div>
              <div>Eye openness: <span className="text-slate-200 font-bold">{debug.eyeOpenness?.toFixed(2) || (debug.avgEAR / (debug.baselineEAR || 0.28)).toFixed(2)}</span></div>
              <div>Blink: <span className={debug.blinkStatus === 'NORMAL' ? 'text-cyan-400 font-bold' : debug.blinkStatus === 'PROLONGED' ? 'text-rose-400 font-bold' : 'text-slate-300'}>{debug.blinkStatus || 'NONE'}</span></div>
              
              <div>Gaze: <span className="text-cyan-300 font-bold">{attention.gazeDirection}</span></div>
              <div>Head: <span className="text-emerald-300 font-bold">{Math.abs(attention.headPose.yaw) > 18 ? (attention.headPose.yaw < 0 ? 'LEFT' : 'RIGHT') : Math.abs(attention.headPose.pitch) > 18 ? (attention.headPose.pitch < 0 ? 'UP' : 'DOWN') : 'FORWARD'}</span></div>
              <div>Mouth MAR: <span className="text-amber-300 font-bold">{debug.mar.toFixed(2)}</span></div>
              
              <div>Mouth duration: <span className="text-slate-300">{debug.mouthOpenDurationMs || 0} ms</span></div>
              <div>Yawn: <span className={debug.yawnState === 'CONFIRMED' ? 'text-amber-400 font-bold' : debug.yawnState === 'CANDIDATE' ? 'text-cyan-400 font-bold' : 'text-slate-400'}>{debug.yawnState || (debug.yawnCount > 0 ? 'CONFIRMED' : 'NO')}</span></div>
              <div>Interaction: <span className={debug.interactionStatus === 'ACTIVE' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{debug.interactionStatus || 'ACTIVE'}</span></div>
              
              <div>Inactivity: <span className="text-slate-300">{debug.inactivitySeconds || 0} s</span></div>
              <div>Smoothed engagement: <span className="text-cyan-400 font-bold">{attention.attentionScore}</span></div>
              <div>Possible off-task: <span className={context.offTaskLikelihood === 'HIGH' ? 'text-rose-400 font-bold' : context.offTaskLikelihood === 'MEDIUM' ? 'text-amber-400 font-bold' : 'text-emerald-400'}>{context.offTaskLikelihood}</span></div>
              
              <div>Academic state: <span className={context.knowledgeState === 'NEEDS_SUPPORT' ? 'text-indigo-400 font-bold' : 'text-emerald-400'}>{context.knowledgeState}</span></div>
              <div>Learner state: <span className="text-cyan-300 font-bold">{stateInfo.state}</span></div>
              <div>Intervention: <span className={closedLoopController.getActiveInterventionId() ? 'text-amber-300 font-bold' : 'text-slate-400'}>{closedLoopController.getActiveInterventionId() ? (lastIntervention?.type || 'ACTIVE') : 'NONE'}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
