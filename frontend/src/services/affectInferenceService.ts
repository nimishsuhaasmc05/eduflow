/**
 * Affect Inference Service
 * ========================
 * Edge-side (browser) AffectNet ONNX inference for emotion, valence and arousal.
 * Mirrors the Python `PretrainedAffectNetClassifier._map_to_eduflow_states` mapping exactly.
 *
 * Model: enet_b0_8_va_mtl (EfficientNet-B0 pretrained on AffectNet-8)
 * Input:  [1, 3, 224, 224]  float32 — ImageNet-normalised RGB face crop
 * Output: [1, 10]           float32 — 8 emotion logits + valence + arousal
 */

import * as ort from 'onnxruntime-web';
import type { FacialPoint } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

const AFFECTNET_EMOTIONS = [
  'Neutral', 'Happy', 'Sad', 'Surprise',
  'Fear', 'Disgust', 'Anger', 'Contempt',
] as const;

type Emotion = typeof AFFECTNET_EMOTIONS[number];

const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD  = [0.229, 0.224, 0.225];
const INPUT_SIZE    = 224;
const FACE_MARGIN   = 0.22;   // 22% padding around detected face bounding box

// ─── Public Types ────────────────────────────────────────────────────────────

export interface AffectInferenceResult {
  /** Overall attention strength 0-1 (blended engagement × positive valence) */
  attention: number;
  /** Confusion probability 0-1 */
  confusion: number;
  /** Boredom probability 0-1 */
  boredom: number;
  /** Engagement probability 0-1 */
  engagement: number;
  /** Cognitive load estimate 0-1 */
  cognitive_load: number;
  /** Continuous valence in range [-1, +1] */
  valence: number;
  /** Continuous arousal in range [0, 1] */
  arousal: number;
  /** Dominant Edu-Flow primary state */
  primary_state: 'ENGAGED' | 'CONFUSION' | 'BOREDOM' | 'DISTRACTION' | 'HIGH_COGNITIVE_LOAD';
  /** Highest-probability AffectNet emotion label */
  dominantEmotion: string;
  /** Full emotion probability map */
  emotionScores: Record<Emotion, number>;
  /** Whether this result came from live inference (true) or baseline (false) */
  isLiveInference: boolean;
}

// ─── Baseline / Default ─────────────────────────────────────────────────────

const BASELINE: AffectInferenceResult = {
  attention:     0.90,
  confusion:     0.05,
  boredom:       0.05,
  engagement:    0.90,
  cognitive_load: 0.35,
  valence:       0.20,
  arousal:       0.45,
  primary_state: 'ENGAGED',
  dominantEmotion: 'Neutral',
  emotionScores: Object.fromEntries(
    AFFECTNET_EMOTIONS.map(e => [e, 0.125])
  ) as Record<Emotion, number>,
  isLiveInference: false,
};

// ─── Service ─────────────────────────────────────────────────────────────────

class AffectInferenceService {
  private session: ort.InferenceSession | null = null;
  private offCanvas: HTMLCanvasElement | null = null;
  private isInitializing = false;
  private _isReady       = false;
  private lastResult: AffectInferenceResult = { ...BASELINE };
  private framesSinceInfer = 0;
  private INFER_EVERY_N_FRAMES = 15; // ~2 Hz at 30fps

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this._isReady || this.isInitializing) return;
    this.isInitializing = true;

    try {
      // Point WASM loader to official CDN to prevent Vite /public ESM import restriction
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/';
      // Single-threaded — avoids SharedArrayBuffer COEP/COOP requirement
      ort.env.wasm.numThreads = 1;

      console.log('[EduFlow][ONNX] Loading AffectNet model...');
      this.session = await ort.InferenceSession.create(
        '/models/affective/affect_model.onnx',
        {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
          enableCpuMemArena: true,
        }
      );

      this.offCanvas = document.createElement('canvas');
      this.offCanvas.width  = INPUT_SIZE;
      this.offCanvas.height = INPUT_SIZE;

      this._isReady = true;
      console.log('[EduFlow][ONNX] AffectNet model ready ✓  inputs:', this.session.inputNames, ' outputs:', this.session.outputNames);
    } catch (err) {
      console.warn('[EduFlow][ONNX] Model load failed — using landmark-only baseline:', err);
      this._isReady       = false;
      this.isInitializing = false; // allow retry on next call
    }
  }

  get isReady(): boolean { return this._isReady; }

  /** Returns the last inference result (or BASELINE if model not ready yet) */
  getLastResult(): AffectInferenceResult { return this.lastResult; }

  // ── Inference Entry Point ─────────────────────────────────────────────────

  /**
   * Run inference on the current video frame.
   * Throttled — returns the cached result on most frames to avoid stutter.
   * @param videoEl  Live <video> element with the webcam stream
   * @param landmarks MediaPipe 468-point face mesh landmarks (normalised 0-1)
   * @param forceRun  Set true to bypass throttle
   */
  async infer(
    videoEl: HTMLVideoElement,
    landmarks: FacialPoint[],
    forceRun = false
  ): Promise<AffectInferenceResult> {
    if (!this._isReady || !this.session || !this.offCanvas) {
      return { ...BASELINE };
    }

    this.framesSinceInfer++;
    if (!forceRun && this.framesSinceInfer < this.INFER_EVERY_N_FRAMES) {
      return this.lastResult; // return cached, avoid per-frame stutter
    }
    this.framesSinceInfer = 0;

    try {
      const tensor = this.extractFaceTensor(videoEl, landmarks);
      if (!tensor) return this.lastResult;

      const feeds: Record<string, ort.Tensor> = {
        [this.session.inputNames[0]]: tensor,
      };

      const outputs = await this.session.run(feeds);
      const rawOut  = outputs[this.session.outputNames[0]].data as Float32Array;

      // Decompose: 8 emotion logits + valence + arousal
      const logits  = Array.from(rawOut.slice(0, 8));
      const valence = rawOut[8];
      const arousal = rawOut[9];

      // Numerically stable softmax
      const maxLogit = Math.max(...logits);
      const exps     = logits.map(v => Math.exp(v - maxLogit));
      const sumExps  = exps.reduce((a, b) => a + b, 0);
      const probs    = exps.map(e => e / sumExps);

      const emotionScores = Object.fromEntries(
        AFFECTNET_EMOTIONS.map((em, i) => [em, probs[i]])
      ) as Record<Emotion, number>;

      this.lastResult = this.mapToEduFlow(emotionScores, valence, arousal);
      return this.lastResult;
    } catch (err) {
      console.warn('[EduFlow][ONNX] Inference error (returning cached):', err);
      return this.lastResult;
    }
  }

  // ── Preprocessing ─────────────────────────────────────────────────────────

  private extractFaceTensor(
    videoEl: HTMLVideoElement,
    landmarks: FacialPoint[]
  ): ort.Tensor | null {
    const vw = videoEl.videoWidth  || 640;
    const vh = videoEl.videoHeight || 480;

    if (landmarks.length === 0) {
      // Full-frame centre crop when no face is detected
      return this.cropAndNormalize(videoEl, vw * 0.1, vh * 0.1, vw * 0.8, vh * 0.8);
    }

    // Bounding box from MediaPipe landmarks
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const lm of landmarks) {
      const px = lm.x * vw;
      const py = lm.y * vh;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }

    const fW = maxX - minX;
    const fH = maxY - minY;
    const mx = fW * FACE_MARGIN;
    const my = fH * FACE_MARGIN;

    const x = Math.max(0, minX - mx);
    const y = Math.max(0, minY - my);
    const w = Math.min(vw - x, fW + 2 * mx);
    const h = Math.min(vh - y, fH + 2 * my);

    return this.cropAndNormalize(videoEl, x, y, w, h);
  }

  private cropAndNormalize(
    videoEl: HTMLVideoElement,
    sx: number, sy: number, sw: number, sh: number
  ): ort.Tensor | null {
    const canvas = this.offCanvas!;
    const ctx    = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE); // RGBA uint8

    const N = INPUT_SIZE * INPUT_SIZE;
    const float32 = new Float32Array(3 * N); // CHW format

    for (let i = 0; i < N; i++) {
      const r = data[i * 4]     / 255;
      const g = data[i * 4 + 1] / 255;
      const b = data[i * 4 + 2] / 255;
      float32[i]         = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0]; // R channel
      float32[N + i]     = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1]; // G channel
      float32[2 * N + i] = (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2]; // B channel
    }

    return new ort.Tensor('float32', float32, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  }

  // ── Output Mapping ────────────────────────────────────────────────────────

  /** Mirrors Python PretrainedAffectNetClassifier._map_to_eduflow_states exactly */
  private mapToEduFlow(
    ep: Record<Emotion, number>,
    valence: number,
    arousal: number
  ): AffectInferenceResult {
    const posVal = Math.max(0, valence);
    const negVal = 1.0 - posVal;

    // Confusion: contempt + surprise weighted by negative valence
    const confusion = clamp01(
      (ep.Contempt * 0.6 + ep.Surprise * 0.4) * negVal
    );

    // Boredom: neutral + sadness × low arousal
    const boredom = clamp01(
      (ep.Neutral * 0.5 + ep.Sad * 0.5)
      * (arousal < 0.3 ? (0.3 - arousal) / 0.3 : 0)
    );

    // Engagement: happy + neutral + moderate arousal
    const engagement = clamp01(
      ep.Happy * 0.3 + ep.Neutral * 0.4 + Math.max(0, arousal) * 0.3
    );

    // Cognitive load: confusion × tension + anger + arousal
    const cognitive_load = clamp01(
      confusion * 0.5 + ep.Anger * 0.3 + Math.max(0, arousal) * 0.2
    );

    // Distraction proxy: disgust + anger × negative valence
    const distraction = clamp01(
      (ep.Disgust * 0.4 + ep.Anger * 0.3) * negVal * 0.5 + (1 - engagement) * 0.5
    );

    // Overall attention: engagement × positive valence blend
    const attention = clamp01(engagement * 0.6 + posVal * 0.4);

    // Dominant emotion
    const dominantEmotion = (Object.entries(ep) as [string, number][])
      .reduce((a, b) => (b[1] > a[1] ? b : a))[0];

    // Primary Edu-Flow state (largest winning candidate above 0.4)
    const candidates: Record<string, number> = {
      CONFUSION: confusion,
      BOREDOM: boredom,
      DISTRACTION: distraction,
      HIGH_COGNITIVE_LOAD: cognitive_load,
      ENGAGED: engagement,
    };
    const top = (Object.entries(candidates) as [string, number][])
      .reduce((a, b) => (b[1] > a[1] ? b : a));
    const primary_state = (
      top[1] > 0.4 ? top[0] : 'ENGAGED'
    ) as AffectInferenceResult['primary_state'];

    return {
      attention,
      confusion,
      boredom,
      engagement,
      cognitive_load,
      valence,
      arousal,
      primary_state,
      dominantEmotion,
      emotionScores: ep,
      isLiveInference: true,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const affectInferenceService = new AffectInferenceService();
