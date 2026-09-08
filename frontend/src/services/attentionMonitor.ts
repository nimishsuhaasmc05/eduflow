import { FacialPoint, AttentionMetrics, AttentionStatus, GazeDirection, HeadPose, AffectiveMetrics } from '../types';
import { LEARNER_CONFIG } from './learnerConfig';

/**
 * EYE STATE CLASSIFICATION
 * Properly distinguishes between normal blinks and concerning eye closures.
 */
export type EyeState = 'OPEN' | 'PARTIALLY_CLOSED' | 'CLOSED' | 'NORMAL_BLINK' | 'PROLONGED_CLOSURE';

/**
 * MOUTH STATE CLASSIFICATION (Yawn & Mouth Opening Detection)
 */
export type MouthState = 'CLOSED' | 'OPEN' | 'SUSTAINED_OPEN' | 'YAWN_DETECTED';

export interface EyeDebugInfo {
  leftEAR: number;
  rightEAR: number;
  avgEAR: number;
  eyeOpenness: number;               // 0.00 - 1.00 normalized
  eyeState: EyeState;
  blinkStatus: 'NONE' | 'NORMAL' | 'PROLONGED';
  blinkCount: number;
  closureDurationMs: number;
  calibrationState: 'CALIBRATING' | 'READY' | 'NO_FACE';
  baselineEAR: number;
  faceLostDurationMs: number;
  attentionScore: number;
  smoothedScore: number;
  learnerState: string;
  // Mouth & Yawn telemetry
  mar: number;
  mouthState: MouthState;
  mouthOpenDurationMs: number;
  yawnState: 'NO' | 'CANDIDATE' | 'CONFIRMED';
  yawnCount: number;
  recentYawnCount: number;
  // Interaction telemetry
  interactionStatus: 'ACTIVE' | 'LOW';
  inactivitySeconds: number;
}

/**
 * CONFIGURABLE THRESHOLDS
 * These can be adjusted without code changes for different environments.
 */
const CONFIG = {
  // Calibration
  CALIBRATION_FRAMES: 60,          // ~2 seconds at 30fps
  CALIBRATION_MIN_SAMPLES: 20,     // Minimum valid EAR samples for calibration

  // Eye state thresholds (multipliers of baseline EAR)
  EAR_OPEN_RATIO: 0.75,            // Above this = OPEN
  EAR_PARTIAL_RATIO: 0.55,         // Between partial and open = PARTIALLY_CLOSED
  // Below PARTIAL_RATIO = CLOSED

  // Blink classification
  NORMAL_BLINK_MIN_MS: 50,         // Minimum blink duration
  NORMAL_BLINK_MAX_MS: 400,        // Maximum normal blink duration
  PROLONGED_CLOSURE_MS: 800,       // Closure longer than this = prolonged

  // Default EAR thresholds (used before calibration)
  DEFAULT_BASELINE_EAR: 0.28,
  DEFAULT_CLOSED_THRESHOLD: 0.16,
  DEFAULT_OPEN_THRESHOLD: 0.21,

  // ---- MULTI-SIGNAL FUSION WEIGHTS ----
  // Each signal contributes a weighted score to the final attention value.
  // Weights must sum to 1.0. Academically grounded in multimodal affective computing.
  SIGNAL_WEIGHT_FACE_PRESENCE: 0.20,   // Binary face detection signal
  SIGNAL_WEIGHT_EYE_OPENNESS: 0.25,    // Calibrated EAR-based eye state
  SIGNAL_WEIGHT_GAZE_DIRECTION: 0.20,  // Gaze on-screen vs off-screen
  SIGNAL_WEIGHT_HEAD_POSE: 0.20,       // Yaw/pitch deviation from forward
  SIGNAL_WEIGHT_BLINK_BEHAVIOR: 0.15,  // Blink rate normality vs abnormality

  // Gaze signal mapping (continuous 0.0-1.0)
  GAZE_CENTER_SCORE: 1.0,
  GAZE_SLIGHT_OFF_SCORE: 0.6,          // Within 25° but beyond threshold
  GAZE_FAR_OFF_SCORE: 0.2,            // Beyond 25°
  GAZE_FAR_OFF_DEGREES: 25,

  // Head pose signal mapping
  HEAD_POSE_MAX_PENALTY_DEGREES: 35,   // Beyond this, head pose signal = 0

  // Blink behavior signal mapping
  BLINK_NORMAL_BPM_LOW: 8,            // Normal range: 8-25 BPM
  BLINK_NORMAL_BPM_HIGH: 25,
  BLINK_EXCESSIVE_BPM: 35,            // Above this = drowsiness/stress signal

  // Signal history ring buffer
  SIGNAL_HISTORY_SIZE: 30,             // ~1 second at 30fps for trend analysis

  // Legacy penalty values (kept for backward compat in deriveAffectiveMetrics)
  HEAD_POSE_PENALTY_FACTOR: 1.2,
  HEAD_POSE_MAX_PENALTY: 45,
  OFF_CENTER_GAZE_PENALTY: 15,
  PROLONGED_CLOSURE_PENALTY: 35,
  PARTIAL_CLOSE_PENALTY: 8,
  NORMAL_BLINK_PENALTY: 0,

  // Temporal smoothing
  SMOOTHING_ALPHA: 0.20,           // EMA: 20% new, 80% history
  SCORE_SMOOTHING_ALPHA: 0.15,     // Score is smoothed more aggressively

  // Face loss grace period
  FACE_LOSS_GRACE_MS: 2000,        // Maintain last state for 2 seconds after face loss

  // Low attention quiz trigger
  LOW_ATTENTION_THRESHOLD: 40,
  LOW_ATTENTION_DURATION_MS: 8000,  // 8 seconds sustained
  QUIZ_COOLDOWN_MS: 180000,        // 3 minutes between quiz triggers

  // Gaze thresholds (degrees)
  GAZE_THRESHOLD: 15,

  // Blink rate window
  BLINK_WINDOW_MS: 60000,          // Count blinks over last 60 seconds
  BLINK_CALIBRATION_MS: 5000,      // Wait 5 seconds before reporting BPM
};

/**
 * Signal snapshot for the ring buffer — captures all raw signals at a single frame
 * for temporal trend analysis (e.g., detecting sustained drift vs momentary glance).
 */
interface SignalSnapshot {
  timestamp: number;
  facePresence: number;    // 0.0 or 1.0
  eyeOpenness: number;     // 0.0 to 1.0 from EAR
  gazeScore: number;       // 0.0 to 1.0
  headPoseScore: number;   // 0.0 to 1.0
  blinkScore: number;      // 0.0 to 1.0
  fusedScore: number;      // Weighted combination
}

export class AttentionMonitorService {
  // ---- Calibration State ----
  private calibrationSamples: number[] = [];
  private isCalibrated: boolean = false;
  private baselineEAR: number = LEARNER_CONFIG.DEFAULT_BASELINE_EAR;
  private closedThreshold: number = LEARNER_CONFIG.DEFAULT_BASELINE_EAR * LEARNER_CONFIG.EAR_PARTIAL_RATIO;
  private openThreshold: number = LEARNER_CONFIG.DEFAULT_BASELINE_EAR * LEARNER_CONFIG.EAR_OPEN_RATIO;

  // ---- Eye State Tracking ----
  private currentEyeState: EyeState = 'OPEN';
  private eyeClosedStartTime: number = 0;
  private isEyeCurrentlyClosed: boolean = false;
  private lastEyeOpenTime: number = performance.now();

  // ---- Blink Tracking ----
  private blinkTimestamps: number[] = [];
  private totalBlinkCount: number = 0;
  private lastBlinkTime: number = 0;

  // ---- Face Presence ----
  private lastFaceDetectedTime: number = performance.now();
  private lastKnownScore: number = 92;
  private lastKnownState: AttentionStatus = 'Focused';

  // ---- Smoothing ----
  private smoothedScore: number = 92;
  private smoothedYaw: number = 0;
  private smoothedPitch: number = 0;
  private smoothedRoll: number = 0;
  private smoothedEar: number = LEARNER_CONFIG.DEFAULT_BASELINE_EAR;

  // ---- Multi-Signal Fusion History ----
  private signalHistory: SignalSnapshot[] = [];

  // ---- Interaction Tracking ----
  private lastInteractionTime: number = performance.now();

  // ---- Quiz Trigger ----
  private startTime: number = performance.now();
  private lowAttentionStartTime: number | null = null;
  private lastQuizPopTime: number = 0;

  // ---- Mouth & Yawn Tracking ----
  private currentMouthState: MouthState = 'CLOSED';
  private currentYawnState: 'NO' | 'CANDIDATE' | 'CONFIRMED' = 'NO';
  private mouthOpenStartTime: number | null = null;
  private isMouthOpen: boolean = false;
  private smoothedMar: number = 0.15;
  private yawnCount: number = 0;
  private lastYawnTime: number = 0;
  private recentYawnTimestamps: number[] = [];

  // ---- Debug Info (accessible for debug overlay & evaluator controls) ----
  private _debugInfo: EyeDebugInfo = {
    leftEAR: 0,
    rightEAR: 0,
    avgEAR: 0,
    eyeOpenness: 1.0,
    eyeState: 'OPEN',
    blinkStatus: 'NONE',
    blinkCount: 0,
    closureDurationMs: 0,
    calibrationState: 'CALIBRATING',
    baselineEAR: LEARNER_CONFIG.DEFAULT_BASELINE_EAR,
    faceLostDurationMs: 0,
    attentionScore: 92,
    smoothedScore: 92,
    learnerState: 'FOCUSED',
    mar: 0.15,
    mouthState: 'CLOSED',
    mouthOpenDurationMs: 0,
    yawnState: 'NO',
    yawnCount: 0,
    recentYawnCount: 0,
    interactionStatus: 'ACTIVE',
    inactivitySeconds: 0,
  };

  // ---- Simulation Override (for evaluator demonstration & testing) ----
  private simulatedMetrics: Partial<AttentionMetrics> | null = null;
  private simulatedEyeDebug: Partial<EyeDebugInfo> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const onUserAction = () => {
        this.lastInteractionTime = performance.now();
      };
      window.addEventListener('click', onUserAction, { passive: true });
      window.addEventListener('keypress', onUserAction, { passive: true });
      window.addEventListener('scroll', onUserAction, { passive: true });
      window.addEventListener('mousemove', onUserAction, { passive: true });
    }
  }

  public recordInteraction(): void {
    this.lastInteractionTime = performance.now();
  }

  public setSimulationOverride(metrics: Partial<AttentionMetrics> | null, eyeDebug?: Partial<EyeDebugInfo> | null): void {
    this.simulatedMetrics = metrics;
    this.simulatedEyeDebug = eyeDebug || null;
    if (metrics && metrics.attentionScore !== undefined) {
      this.smoothedScore = metrics.attentionScore;
      this.lastKnownScore = metrics.attentionScore;
    }
  }

  public getDebugInfo(): EyeDebugInfo {
    if (this.simulatedEyeDebug) {
      return { ...this._debugInfo, ...this.simulatedEyeDebug };
    }
    return { ...this._debugInfo };
  }

  // ========================================================
  //  DERIVE AFFECTIVE METRICS (sent to backend telemetry)
  // ========================================================
  public deriveAffectiveMetrics(landmarks: FacialPoint[], fps: number): AffectiveMetrics {
    if (this.simulatedMetrics) {
      const attScore = (this.simulatedMetrics.attentionScore ?? 92) / 100;
      let primary_state: 'ENGAGED' | 'CONFUSION' | 'DISTRACTION' | 'BOREDOM' | 'HIGH_COGNITIVE_LOAD' = 'ENGAGED';
      if (attScore < 0.40) primary_state = 'DISTRACTION';
      else if (attScore < 0.65) primary_state = 'CONFUSION';
      return {
        attention: Number(attScore.toFixed(2)),
        confusion: primary_state === 'CONFUSION' ? 0.65 : 0.10,
        boredom: 0.10,
        engagement: Number(Math.max(0.1, attScore).toFixed(2)),
        distraction: primary_state === 'DISTRACTION' ? 0.75 : 0.10,
        cognitive_load: 0.35,
        primary_state,
        fps
      };
    }

    const att = this.computeMetrics(landmarks, fps);

    if (!att.isFaceDetected || landmarks.length === 0) {
      const now = performance.now();
      const faceLostMs = now - this.lastFaceDetectedTime;

      // Grace period: if face was lost recently, maintain last known valid values
      if (faceLostMs < LEARNER_CONFIG.FACE_LOST_GRACE_PERIOD_MS) {
        return {
          attention: Math.max(0.3, this.lastKnownScore / 100),
          confusion: 0.10,
          boredom: 0.15,
          engagement: Math.max(0.2, (this.lastKnownScore / 100) * 0.8),
          distraction: 0.20,
          cognitive_load: 0.20,
          primary_state: 'ENGAGED',
          fps
        };
      }

      return {
        attention: 0.0,
        confusion: 0.0,
        boredom: 0.50,
        engagement: 0.0,
        distraction: 1.0,
        cognitive_load: 0.0,
        primary_state: 'DISTRACTION',
        fps
      };
    }

    const attention = Number((att.attentionScore / 100).toFixed(2));
    let distraction = 0.0;
    if (att.gazeDirection !== 'CENTER' || Math.abs(att.headPose.yaw) > 18 || Math.abs(att.headPose.pitch) > 18) {
      distraction = Number(Math.min(1.0, 0.4 + (100 - att.attentionScore) / 100).toFixed(2));
    } else {
      distraction = Number(((100 - att.attentionScore) / 200).toFixed(2));
    }

    const numericBpm = typeof att.blinkRateBPM === 'number' ? att.blinkRateBPM : 0;

    let boredom = 0.08;
    if (this.currentEyeState === 'PROLONGED_CLOSURE') {
      boredom = 0.65;
    } else if (numericBpm > 30) {
      boredom = 0.50;
    }

    let confusion = 0.12;
    if (landmarks.length >= 336) {
      const p107 = landmarks[107] || { x: 0.43, y: 0.32 };
      const p336 = landmarks[336] || { x: 0.57, y: 0.32 };
      const ebDist = this.dist(p107, p336);
      if (ebDist < 0.11) {
        confusion = Number(Math.min(1.0, 0.35 + (0.11 - ebDist) * 7.5).toFixed(2));
      }
    }

    const cognitive_load = Number(Math.min(1.0, 0.30 + (numericBpm / 60) + (Math.abs(att.headPose.pitch) / 70)).toFixed(2));
    const engagement = Number(Math.max(0.0, Math.min(1.0, attention * (1 - distraction) * (1 - boredom))).toFixed(2));

    let primary_state: 'ENGAGED' | 'CONFUSION' | 'DISTRACTION' | 'BOREDOM' | 'HIGH_COGNITIVE_LOAD' = 'ENGAGED';
    if (confusion >= 0.65) primary_state = 'CONFUSION';
    else if (distraction >= 0.70) primary_state = 'DISTRACTION';
    else if (boredom >= 0.60) primary_state = 'BOREDOM';
    else if (cognitive_load >= 0.75) primary_state = 'HIGH_COGNITIVE_LOAD';

    return {
      attention,
      confusion,
      boredom,
      engagement,
      distraction,
      cognitive_load,
      primary_state,
      fps
    };
  }

  // ========================================================
  //  COMPUTE ATTENTION METRICS (core processing)
  // ========================================================
  public computeMetrics(landmarks: FacialPoint[], fps: number): AttentionMetrics {
    if (this.simulatedMetrics) {
      const finalScore = this.simulatedMetrics.attentionScore ?? 92;
      const status = this.simulatedMetrics.status ?? (finalScore >= 70 ? 'Focused' : 'Looking Away');
      return {
        isFaceDetected: this.simulatedMetrics.isFaceDetected ?? true,
        gazeDirection: this.simulatedMetrics.gazeDirection ?? 'CENTER',
        blinkRateBPM: this.simulatedMetrics.blinkRateBPM ?? 16,
        ear: this.simulatedMetrics.ear ?? 0.28,
        headPose: this.simulatedMetrics.headPose ?? { yaw: 0, pitch: 0, roll: 0 },
        attentionScore: finalScore,
        status,
        fps,
        calibrationState: 'READY'
      };
    }

    const now = performance.now();

    if (!landmarks || landmarks.length === 0) {
      const faceLostMs = now - this.lastFaceDetectedTime;

      // Grace period: maintain last known state during temporary occlusion/movement (3s)
      if (faceLostMs < LEARNER_CONFIG.FACE_LOST_GRACE_PERIOD_MS && this.lastKnownScore > 20) {
        this._debugInfo.faceLostDurationMs = faceLostMs;
        this._debugInfo.attentionScore = this.lastKnownScore;

        return {
          isFaceDetected: false,
          gazeDirection: 'CENTER',
          blinkRateBPM: 'Face Lost (Grace)',
          ear: this.smoothedEar,
          headPose: { yaw: 0, pitch: 0, roll: 0 },
          attentionScore: this.lastKnownScore,
          status: this.lastKnownState,
          fps,
          calibrationState: this.isCalibrated ? 'READY' : 'CALIBRATING',
        };
      }

      // Beyond grace period — state is NO_VALID_MEASUREMENT, do NOT fabricate 0 as genuine attention
      this._debugInfo.faceLostDurationMs = faceLostMs;
      this._debugInfo.attentionScore = 0;
      this._debugInfo.calibrationState = 'NO_FACE';

      return {
        isFaceDetected: false,
        gazeDirection: 'CENTER',
        blinkRateBPM: 'Face Not Detected',
        ear: 0,
        headPose: { yaw: 0, pitch: 0, roll: 0 },
        attentionScore: 0, // Treated as null/unavailable in UI
        status: 'No Face Detected',
        fps,
        calibrationState: 'NO_FACE',
      };
    }

    // Face is detected — update timestamp
    this.lastFaceDetectedTime = now;

    // 1. Calculate Eye Aspect Ratio (EAR) for EACH eye
    const { leftEAR, rightEAR } = this.calculateEARBoth(landmarks);
    const rawEar = (leftEAR + rightEAR) / 2;
    this.smoothedEar = this.ema(rawEar, this.smoothedEar, LEARNER_CONFIG.LANDMARK_SMOOTHING_ALPHA);

    // 2. Calibration phase: collect baseline EAR samples
    if (!this.isCalibrated) {
      this.calibrationSamples.push(rawEar);
      if (this.calibrationSamples.length >= 60) {
        this.completeCalibration();
      }
    }

    // 3. Eye state classification with temporal analysis
    this.classifyEyeState(rawEar, now);

    // 4. Track blinks
    this.trackBlinks(rawEar, now);
    const blinkRateBPM = this.getBlinksPerMinute();

    // 4b. Calculate Mouth Aspect Ratio (MAR) & Yawn Detection
    const rawMar = this.calculateMAR(landmarks);
    this.smoothedMar = this.ema(rawMar, this.smoothedMar, LEARNER_CONFIG.LANDMARK_SMOOTHING_ALPHA);
    this.classifyMouthState(rawMar, now);

    // 5. Calculate Head Pose (Yaw, Pitch, Roll)
    const rawPose = this.calculateHeadPose(landmarks);
    this.smoothedYaw = this.ema(rawPose.yaw, this.smoothedYaw, LEARNER_CONFIG.LANDMARK_SMOOTHING_ALPHA);
    this.smoothedPitch = this.ema(rawPose.pitch, this.smoothedPitch, LEARNER_CONFIG.LANDMARK_SMOOTHING_ALPHA);
    this.smoothedRoll = this.ema(rawPose.roll, this.smoothedRoll, LEARNER_CONFIG.LANDMARK_SMOOTHING_ALPHA);

    const headPose: HeadPose = {
      yaw: Math.round(this.smoothedYaw),
      pitch: Math.round(this.smoothedPitch),
      roll: Math.round(this.smoothedRoll),
    };

    // 6. Determine Eye Gaze Direction
    const gazeDirection = this.determineGaze(this.smoothedYaw, this.smoothedPitch);

    // 7. MULTIMODAL FUSION SCORING
    // Signal 1: Face Presence
    const sigFace = 1.0;

    // Signal 2: Eye Openness (from calibrated EAR)
    let sigEye = 1.0;
    switch (this.currentEyeState) {
      case 'OPEN':             sigEye = 1.0;  break;
      case 'NORMAL_BLINK':     sigEye = 1.0;  break; // Normal blinks = no degradation
      case 'PARTIALLY_CLOSED': sigEye = 0.75; break;
      case 'CLOSED': {
        const closedDuration = now - this.eyeClosedStartTime;
        if (closedDuration <= LEARNER_CONFIG.NORMAL_BLINK_MAX_MS) {
          sigEye = 1.0; // Within normal blink window
        } else {
          const factor = Math.min(1.0, (closedDuration - LEARNER_CONFIG.NORMAL_BLINK_MAX_MS) / LEARNER_CONFIG.PROLONGED_CLOSURE_MS);
          sigEye = Math.max(0.1, 0.7 - factor * 0.6);
        }
        break;
      }
      case 'PROLONGED_CLOSURE': sigEye = 0.1; break;
    }

    // Signal 3: Gaze Direction
    let sigGaze = 1.0;
    if (gazeDirection !== 'CENTER') {
      const maxDeviation = Math.max(Math.abs(this.smoothedYaw), Math.abs(this.smoothedPitch));
      if (maxDeviation > 25) {
        sigGaze = 0.2;
      } else {
        sigGaze = 0.6;
      }
    }

    // Signal 4: Head Pose
    const poseDeviation = Math.abs(this.smoothedYaw) + Math.abs(this.smoothedPitch);
    const sigHeadPose = Math.max(0.0, 1.0 - (poseDeviation / 70));

    // Signal 5: Blink Behavior
    let sigBlink = 1.0;
    const elapsedMs = now - this.startTime;
    if (elapsedMs > 5000) {
      const bpm = typeof this.getBlinksPerMinute() === 'number' ? (this.getBlinksPerMinute() as number) : 16;
      if (bpm >= 8 && bpm <= 25) {
        sigBlink = 1.0;
      } else if (bpm > 35) {
        sigBlink = 0.4;
      } else if (bpm > 25) {
        sigBlink = 0.7;
      } else if (bpm < 8 && bpm > 0) {
        sigBlink = 0.85;
      }
      if (this.currentEyeState === 'PROLONGED_CLOSURE') {
        sigBlink = 0.1;
      }
    }

    // Signal 6: User Interaction & Inactivity
    const inactivitySeconds = Math.max(0, Math.round((now - this.lastInteractionTime) / 1000));
    const interactionStatus: 'ACTIVE' | 'LOW' = (inactivitySeconds <= 15) ? 'ACTIVE' : 'LOW';
    const sigInteraction = (inactivitySeconds <= 15) ? 1.0 : (inactivitySeconds <= 60) ? 0.8 : 0.4;

    // Weighted fusion: fusedScore = Σ(signal × weight)
    const rawScore = (
      sigFace        * LEARNER_CONFIG.WEIGHT_FACE_PRESENCE +
      sigEye         * LEARNER_CONFIG.WEIGHT_EYE_OPENNESS +
      sigHeadPose    * LEARNER_CONFIG.WEIGHT_HEAD_ORIENTATION +
      sigInteraction * LEARNER_CONFIG.WEIGHT_INTERACTION +
      sigBlink       * LEARNER_CONFIG.WEIGHT_BLINK_RATE
    ) * 100;

    const snapshot: SignalSnapshot = {
      timestamp: now,
      facePresence: sigFace,
      eyeOpenness: sigEye,
      gazeScore: sigGaze,
      headPoseScore: sigHeadPose,
      blinkScore: sigBlink,
      fusedScore: rawScore,
    };
    this.signalHistory.push(snapshot);
    if (this.signalHistory.length > 30) {
      this.signalHistory.shift();
    }

    const clampedRaw = Math.max(0, Math.min(100, rawScore));
    this.smoothedScore = this.ema(clampedRaw, this.smoothedScore, LEARNER_CONFIG.SCORE_SMOOTHING_ALPHA);
    const finalScore = Math.round(this.smoothedScore);

    this.lastKnownScore = finalScore;

    // 8. Track low attention duration for diagnostic telemetry
    if (finalScore < 45) {
      if (!this.lowAttentionStartTime) {
        this.lowAttentionStartTime = now;
      }
    } else {
      this.lowAttentionStartTime = null;
    }

    // 9. Status string
    let status: AttentionStatus = 'Focused';
    if (finalScore >= 60) {
      status = 'Focused';
    } else {
      status = 'Looking Away';
    }
    this.lastKnownState = status;

    // 10. Update debug info
    const mouthDuration = this.isMouthOpen && this.mouthOpenStartTime ? Math.round(now - this.mouthOpenStartTime) : 0;
    const normalizedOpenness = Number(Math.min(1.0, Math.max(0.0, this.smoothedEar / (this.baselineEAR || 0.28))).toFixed(2));
    let blinkStatus: 'NONE' | 'NORMAL' | 'PROLONGED' = 'NONE';
    if (this.currentEyeState === 'NORMAL_BLINK') {
      blinkStatus = 'NORMAL';
    } else if (this.currentEyeState === 'PROLONGED_CLOSURE') {
      blinkStatus = 'PROLONGED';
    }

    this._debugInfo = {
      leftEAR: Number(leftEAR.toFixed(3)),
      rightEAR: Number(rightEAR.toFixed(3)),
      avgEAR: Number(this.smoothedEar.toFixed(3)),
      eyeOpenness: normalizedOpenness,
      eyeState: this.currentEyeState,
      blinkStatus,
      blinkCount: this.totalBlinkCount,
      closureDurationMs: this.isEyeCurrentlyClosed ? Math.round(now - this.eyeClosedStartTime) : 0,
      calibrationState: this.isCalibrated ? 'READY' : 'CALIBRATING',
      baselineEAR: Number(this.baselineEAR.toFixed(3)),
      faceLostDurationMs: 0,
      attentionScore: finalScore,
      smoothedScore: finalScore,
      learnerState: status === 'Focused' ? 'FOCUSED' : 'DISTRACTED',
      mar: Number(this.smoothedMar.toFixed(3)),
      mouthState: this.currentMouthState,
      mouthOpenDurationMs: mouthDuration,
      yawnState: this.currentYawnState,
      yawnCount: this.yawnCount,
      recentYawnCount: this.recentYawnTimestamps.length,
      interactionStatus,
      inactivitySeconds,
    };

    return {
      isFaceDetected: true,
      gazeDirection,
      blinkRateBPM,
      ear: Number(this.smoothedEar.toFixed(2)),
      headPose,
      attentionScore: finalScore,
      status,
      fps,
      calibrationState: this.isCalibrated ? 'READY' : 'CALIBRATING',
    };
  }

  // ========================================================
  //  CALIBRATION — Learn individual's baseline EAR
  // ========================================================
  private completeCalibration(): void {
    const sorted = [...this.calibrationSamples].sort((a, b) => a - b);
    const startIdx = Math.floor(sorted.length * 0.4);
    const openEyeSamples = sorted.slice(startIdx);

    if (openEyeSamples.length >= 20) {
      const sum = openEyeSamples.reduce((a, b) => a + b, 0);
      this.baselineEAR = sum / openEyeSamples.length;
      this.closedThreshold = this.baselineEAR * LEARNER_CONFIG.EAR_PARTIAL_RATIO;
      this.openThreshold = this.baselineEAR * LEARNER_CONFIG.EAR_OPEN_RATIO;
      this.isCalibrated = true;
    } else {
      this.isCalibrated = true;
    }
  }

  // ========================================================
  //  EYE STATE CLASSIFICATION (temporal analysis)
  // ========================================================
  private classifyEyeState(rawEar: number, now: number): void {
    const threshold = this.isCalibrated ? this.closedThreshold : (LEARNER_CONFIG.DEFAULT_BASELINE_EAR * LEARNER_CONFIG.EAR_PARTIAL_RATIO);
    const openThresh = this.isCalibrated ? this.openThreshold : (LEARNER_CONFIG.DEFAULT_BASELINE_EAR * LEARNER_CONFIG.EAR_OPEN_RATIO);

    if (rawEar < threshold) {
      if (!this.isEyeCurrentlyClosed) {
        this.isEyeCurrentlyClosed = true;
        this.eyeClosedStartTime = now;
        this.currentEyeState = 'CLOSED';
      } else {
        const closedDuration = now - this.eyeClosedStartTime;
        if (closedDuration > LEARNER_CONFIG.PROLONGED_CLOSURE_MS) {
          this.currentEyeState = 'PROLONGED_CLOSURE';
        } else {
          this.currentEyeState = 'CLOSED';
        }
      }
    } else if (rawEar >= openThresh) {
      if (this.isEyeCurrentlyClosed) {
        const closedDuration = now - this.eyeClosedStartTime;
        if (closedDuration >= LEARNER_CONFIG.NORMAL_BLINK_MIN_MS && closedDuration <= LEARNER_CONFIG.NORMAL_BLINK_MAX_MS) {
          this.currentEyeState = 'NORMAL_BLINK';
          setTimeout(() => {
            if (this.currentEyeState === 'NORMAL_BLINK') {
              this.currentEyeState = 'OPEN';
            }
          }, 100);
        } else {
          this.currentEyeState = 'OPEN';
        }
        this.isEyeCurrentlyClosed = false;
        this.lastEyeOpenTime = now;
      } else {
        this.currentEyeState = 'OPEN';
      }
    } else {
      if (!this.isEyeCurrentlyClosed) {
        this.currentEyeState = 'PARTIALLY_CLOSED';
      }
    }
  }

  // ========================================================
  //  BLINK TRACKING
  // ========================================================
  private trackBlinks(ear: number, now: number): void {
    if (this.currentEyeState === 'NORMAL_BLINK' && (now - this.lastBlinkTime >= 150)) {
      this.blinkTimestamps.push(now);
      this.totalBlinkCount++;
      this.lastBlinkTime = now;
    }

    const cutoff = now - 60000;
    this.blinkTimestamps = this.blinkTimestamps.filter((t) => t >= cutoff);
  }

  private getBlinksPerMinute(): number | string {
    const elapsedMs = performance.now() - this.startTime;
    if (elapsedMs < 5000) {
      return "Calibrating...";
    }
    const windowMinutes = Math.min(1.0, elapsedMs / 60000);
    if (windowMinutes <= 0) return "Calibrating...";
    return Math.round(this.blinkTimestamps.length / windowMinutes);
  }

  // ========================================================
  //  EAR CALCULATION (per eye)
  // ========================================================
  private calculateEARBoth(landmarks: FacialPoint[]): { leftEAR: number; rightEAR: number } {
    if (landmarks.length < 386) {
      return { leftEAR: LEARNER_CONFIG.DEFAULT_BASELINE_EAR, rightEAR: LEARNER_CONFIG.DEFAULT_BASELINE_EAR };
    }

    // Left Eye landmarks
    const p159 = landmarks[159] || { x: 0.35, y: 0.34 };
    const p145 = landmarks[145] || { x: 0.35, y: 0.36 };
    const p158 = landmarks[158] || { x: 0.34, y: 0.34 };
    const p144 = landmarks[144] || { x: 0.34, y: 0.36 };
    const p33  = landmarks[33]  || { x: 0.30, y: 0.35 };
    const p133 = landmarks[133] || { x: 0.40, y: 0.35 };

    const leftVert1 = this.dist(p159, p145);
    const leftVert2 = this.dist(p158, p144);
    const leftHoriz = this.dist(p33, p133) || 0.001;
    const leftEAR = (leftVert1 + leftVert2) / (2 * leftHoriz);

    // Right Eye landmarks
    const p386 = landmarks[386] || { x: 0.65, y: 0.34 };
    const p374 = landmarks[374] || { x: 0.65, y: 0.36 };
    const p385 = landmarks[385] || { x: 0.66, y: 0.34 };
    const p373 = landmarks[373] || { x: 0.66, y: 0.36 };
    const p362 = landmarks[362] || { x: 0.60, y: 0.35 };
    const p263 = landmarks[263] || { x: 0.70, y: 0.35 };

    const rightVert1 = this.dist(p386, p374);
    const rightVert2 = this.dist(p385, p373);
    const rightHoriz = this.dist(p362, p263) || 0.001;
    const rightEAR = (rightVert1 + rightVert2) / (2 * rightHoriz);

    return { leftEAR, rightEAR };
  }

  // ========================================================
  //  HEAD POSE CALCULATION
  // ========================================================
  private calculateHeadPose(landmarks: FacialPoint[]): HeadPose {
    const nose = landmarks[1] || landmarks[0] || { x: 0.5, y: 0.5 };
    const leftEye = landmarks[33] || landmarks[10] || { x: 0.35, y: 0.35 };
    const rightEye = landmarks[263] || landmarks[20] || { x: 0.65, y: 0.35 };
    const chin = landmarks[152] || landmarks[30] || { x: 0.5, y: 0.8 };

    const eyeMidX = (leftEye.x + rightEye.x) / 2;
    const eyeMidY = (leftEye.y + rightEye.y) / 2;
    const eyeDist = this.dist(leftEye, rightEye) || 0.001;

    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const roll = Math.atan2(dy, dx) * (180 / Math.PI);

    const noseHorizOffset = nose.x - eyeMidX;
    const yaw = Math.max(-90, Math.min(90, (noseHorizOffset / eyeDist) * 110));

    const chinDist = chin.y - eyeMidY || 0.001;
    const noseVertRatio = (nose.y - eyeMidY) / chinDist;
    const pitch = Math.max(-90, Math.min(90, (noseVertRatio - 0.4) * 120));

    return { yaw, pitch, roll };
  }

  // ========================================================
  //  GAZE DIRECTION
  // ========================================================
  private determineGaze(yaw: number, pitch: number): GazeDirection {
    if (yaw < -LEARNER_CONFIG.GAZE_DEVIATION_ANGLE_DEG) return 'LEFT';
    if (yaw > LEARNER_CONFIG.GAZE_DEVIATION_ANGLE_DEG) return 'RIGHT';
    if (pitch < -LEARNER_CONFIG.GAZE_DEVIATION_ANGLE_DEG) return 'UP';
    if (pitch > LEARNER_CONFIG.GAZE_DEVIATION_ANGLE_DEG) return 'DOWN';
    return 'CENTER';
  }

  // ========================================================
  //  MOUTH ASPECT RATIO (MAR) & YAWNING DETECTION
  // ========================================================
  private calculateMAR(landmarks: FacialPoint[]): number {
    if (!landmarks || landmarks.length < 318) {
      return 0.15;
    }

    const p13 = landmarks[13] || { x: 0.5, y: 0.70 };
    const p14 = landmarks[14] || { x: 0.5, y: 0.73 };
    const p82 = landmarks[82] || { x: 0.45, y: 0.70 };
    const p87 = landmarks[87] || { x: 0.45, y: 0.73 };
    const p312 = landmarks[312] || { x: 0.55, y: 0.70 };
    const p317 = landmarks[317] || { x: 0.55, y: 0.73 };
    const p61 = landmarks[61] || { x: 0.40, y: 0.71 };
    const p291 = landmarks[291] || { x: 0.60, y: 0.71 };

    const vert1 = this.dist(p13, p14);
    const vert2 = this.dist(p82, p87);
    const vert3 = this.dist(p312, p317);
    const horiz = this.dist(p61, p291) || 0.001;

    const mar = (vert1 + vert2 + vert3) / (2 * horiz);
    return Number(mar.toFixed(3));
  }

  private classifyMouthState(rawMar: number, now: number): void {
    const openThresh = LEARNER_CONFIG.MAR_OPEN_THRESHOLD;   // 0.60
    const closeThresh = LEARNER_CONFIG.MAR_CLOSE_THRESHOLD; // 0.35
    const moderateThresh = 0.40;                            // Speech / smile threshold

    if (rawMar >= openThresh) {
      if (!this.isMouthOpen) {
        this.isMouthOpen = true;
        this.mouthOpenStartTime = now;
        this.currentMouthState = 'OPEN';
        this.currentYawnState = 'NO';
      } else {
        const openDuration = now - (this.mouthOpenStartTime || now);
        if (openDuration >= LEARNER_CONFIG.YAWN_MIN_SUSTAINED_MS && openDuration <= LEARNER_CONFIG.YAWN_MAX_SUSTAINED_MS) {
          this.currentMouthState = 'SUSTAINED_OPEN';
          this.currentYawnState = 'CANDIDATE';
        }
      }
    } else if (rawMar >= moderateThresh) {
      if (!this.isMouthOpen) {
        this.isMouthOpen = true;
        this.mouthOpenStartTime = now;
      }
      this.currentMouthState = 'OPEN';
      if (this.currentYawnState !== 'CANDIDATE') {
        this.currentYawnState = 'NO';
      }
    } else if (rawMar < closeThresh) {
      if (this.isMouthOpen) {
        const openDuration = now - (this.mouthOpenStartTime || now);
        if (this.currentYawnState === 'CANDIDATE' && openDuration >= LEARNER_CONFIG.YAWN_MIN_SUSTAINED_MS && openDuration <= LEARNER_CONFIG.YAWN_MAX_SUSTAINED_MS) {
          if (now - this.lastYawnTime >= LEARNER_CONFIG.YAWN_COOLDOWN_MS) {
            this.yawnCount++;
            this.lastYawnTime = now;
            this.recentYawnTimestamps.push(now);
            this.currentMouthState = 'YAWN_DETECTED';
            this.currentYawnState = 'CONFIRMED';

            setTimeout(() => {
              if (this.currentMouthState === 'YAWN_DETECTED') {
                this.currentMouthState = 'CLOSED';
                this.currentYawnState = 'NO';
              }
            }, 1000);
          } else {
            this.currentMouthState = 'CLOSED';
            this.currentYawnState = 'NO';
          }
        } else {
          this.currentMouthState = 'CLOSED';
          this.currentYawnState = 'NO';
        }
        this.isMouthOpen = false;
        this.mouthOpenStartTime = null;
      } else {
        if (this.currentMouthState !== 'YAWN_DETECTED') {
          this.currentMouthState = 'CLOSED';
          this.currentYawnState = 'NO';
        }
      }
    }

    const cutoff = now - LEARNER_CONFIG.FATIGUE_YAWN_WINDOW_MS;
    this.recentYawnTimestamps = this.recentYawnTimestamps.filter((t) => t >= cutoff);
  }

  // ========================================================
  //  PUBLIC ACCESSORS FOR CONTROLLERS
  // ========================================================
  public getSmoothedPose(): HeadPose {
    return {
      yaw: Math.round(this.smoothedYaw),
      pitch: Math.round(this.smoothedPitch),
      roll: Math.round(this.smoothedRoll),
    };
  }

  public getGazeDirection(): GazeDirection {
    return this.determineGaze(this.smoothedYaw, this.smoothedPitch);
  }

  public getYawnCount(): number {
    return this.yawnCount;
  }

  public getRecentYawnCount(): number {
    return this.recentYawnTimestamps.length;
  }

  private dist(p1: FacialPoint, p2: FacialPoint): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private ema(current: number, previous: number, alpha: number): number {
    return alpha * current + (1 - alpha) * previous;
  }
}

export const attentionMonitor = new AttentionMonitorService();

