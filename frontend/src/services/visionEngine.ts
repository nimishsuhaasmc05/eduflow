import { WebcamStatus, FacialPoint } from '../types';
import { attentionMonitor } from './attentionMonitor';
import { affectInferenceService, AffectInferenceResult } from './affectInferenceService';

declare global {
  interface Window {
    FaceMesh?: any;
    Camera?: any;
  }
}

export type FacialLandmark = FacialPoint;

export interface VisionState {
  status: WebcamStatus;
  fps: number;
  landmarkCount: number;
  errorMessage: string | null;
  faceDetected: boolean;
  /** Latest ONNX affective inference result (undefined until first result) */
  affectResult?: AffectInferenceResult;
}

export type VisionStateCallback = (state: VisionState, landmarks: FacialPoint[]) => void;

export class ClientVisionEngine {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private isRunning: boolean = false;
  private isMediaPipeInitialized: boolean = false;
  private faceMeshInstance: any = null;
  private animFrameId: number | null = null;
  private mediaStream: MediaStream | null = null;
  private callback: VisionStateCallback | null = null;

  // FPS Tracking
  private frameCount: number = 0;
  private lastFpsUpdate: number = performance.now();
  private currentFps: number = 0;

  // ONNX inference — latest cached result
  private lastAffectResult: AffectInferenceResult | undefined = undefined;

  // Internal State
  private currentState: VisionState = {
    status: 'OFFLINE',
    fps: 0,
    landmarkCount: 0,
    errorMessage: null,
    faceDetected: false,
    affectResult: undefined,
  };

  private log(stage: string, detail?: any) {
    console.log(`[Edu-Flow][MediaPipe] ${stage}`, detail !== undefined ? detail : '');
  }

  public async initialize(
    videoEl: HTMLVideoElement,
    canvasEl: HTMLCanvasElement,
    legacyCallback?: (metrics: any, landmarks: FacialPoint[]) => void
  ): Promise<void> {
    const wrappedCallback: VisionStateCallback = (state, landmarks) => {
      if (legacyCallback) {
        const metrics = attentionMonitor.deriveAffectiveMetrics(landmarks, state.fps);
        legacyCallback(metrics, landmarks);
      }
    };
    return this.start(videoEl, canvasEl, wrappedCallback);
  }

  public injectStateOverride(state: string): void {
    // Compatibility no-op
  }

  public async start(
    videoEl: HTMLVideoElement,
    canvasEl: HTMLCanvasElement,
    onUpdate: VisionStateCallback
  ): Promise<void> {
    // Clean up any existing running instance before starting fresh
    if (this.isRunning || this.mediaStream || this.faceMeshInstance) {
      await this.stop();
    }

    this.videoElement = videoEl;
    this.canvasElement = canvasEl;
    this.callback = onUpdate;
    this.isRunning = true;
    this.isMediaPipeInitialized = false;

    // Kick off ONNX model loading in background (non-blocking)
    affectInferenceService.init().catch(() => {/* graceful degradation */});

    this.updateState({ status: 'INITIALIZING', errorMessage: null });
    this.log('Stage 1: Checking browser context & camera support...');

    try {
      // 1. Check for Secure Context (HTTPS or localhost)
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        const host = window.location.hostname;
        if (host !== 'localhost' && host !== '127.0.0.1') {
          throw new Error(`INSECURE_CONTEXT: Camera access is disabled over plain HTTP LAN (${window.location.host}). Browsers require a Secure Context (http://localhost:5174 or HTTPS) for webcam access.`);
        }
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam access (getUserMedia) is not supported by your browser.');
      }

      // 2. Request Camera MediaStream
      this.log('Stage 2: Requesting getUserMedia webcam stream...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      this.videoElement.srcObject = this.mediaStream;

      // 3. Wait for Video Readiness & Metadata
      this.log('Stage 3: Attaching video stream & waiting for metadata...');
      await new Promise<void>((resolve) => {
        if (!this.videoElement) return resolve();
        
        const onReady = () => {
          if (this.videoElement) {
            this.videoElement.play().then(() => resolve()).catch(() => resolve());
          } else {
            resolve();
          }
        };

        if (this.videoElement.readyState >= 2 && this.videoElement.videoWidth > 0) {
          onReady();
        } else {
          this.videoElement.onloadedmetadata = onReady;
          // Fallback timeout in case onloadedmetadata fires fast
          setTimeout(onReady, 1000);
        }
      });

      const videoWidth = this.videoElement.videoWidth || 640;
      const videoHeight = this.videoElement.videoHeight || 480;
      this.log(`Stage 3 Complete: Video dimensions ready (${videoWidth}x${videoHeight}).`);

      // 4. Initialize MediaPipe Face Mesh
      this.log('Stage 4: Initializing MediaPipe Face Mesh model & WASM assets (v0.4.1633559619)...');
      await this.initMediaPipe();

      this.log('Stage 5: MediaPipe Face Mesh initialization complete. Setting CONNECTED status.');
      this.updateState({ status: 'CONNECTED', errorMessage: null });
      this.lastFpsUpdate = performance.now();
      this.frameCount = 0;

      // 5. Start Frame Processing Loop
      this.log('Stage 6: Starting real-time detection frame loop.');
      this.runDetectionLoop();

    } catch (error: any) {
      console.error('[Edu-Flow][MediaPipe] Initialization Failure:', error);
      let status: WebcamStatus = 'ERROR';
      let message = error?.message || 'Failed to access webcam or initialize MediaPipe.';

      if (message.startsWith('INSECURE_CONTEXT:')) {
        status = 'INSECURE_CONTEXT';
        message = message.replace('INSECURE_CONTEXT: ', '');
      } else if (
        error.name === 'NotAllowedError' ||
        error.name === 'PermissionDeniedError' ||
        message.includes('Permission denied')
      ) {
        status = 'PERMISSION_DENIED';
        message = 'Webcam access denied. Please grant camera permissions in your browser address bar.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        status = 'ERROR';
        message = 'No camera device found on this system.';
      }

      this.updateState({ status, errorMessage: message, fps: 0, landmarkCount: 0, faceDetected: false });
    }
  }

  private async initMediaPipe(): Promise<void> {
    const FaceMeshClass = (typeof window !== 'undefined' && window.FaceMesh) ? window.FaceMesh : null;

    if (!FaceMeshClass) {
      throw new Error('MediaPipe Face Mesh library (face_mesh.js v0.4.1633559619) failed to load from window context. Check script tags or network.');
    }

    try {
      // Pin locateFile to exact version 0.4.1633559619 to prevent WASM / asset mismatch
      this.faceMeshInstance = new FaceMeshClass({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
      });

      this.faceMeshInstance.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.faceMeshInstance.onResults(this.onMediaPipeResults);

      if (typeof this.faceMeshInstance.initialize === 'function') {
        this.log('Invoking faceMeshInstance.initialize()...');
        await this.faceMeshInstance.initialize();
      }

      this.isMediaPipeInitialized = true;
      this.log('faceMeshInstance.initialize() completed successfully.');
    } catch (err: any) {
      this.isMediaPipeInitialized = false;
      throw new Error(`MediaPipe model asset or WASM initialization failed: ${err?.message || err}`);
    }
  }

  private onMediaPipeResults = (results: any) => {
    if (!this.isRunning) return;

    let landmarks: FacialPoint[] = [];
    let detected = false;

    if (results && results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const firstFace = results.multiFaceLandmarks[0];
      if (Array.isArray(firstFace) && firstFace.length > 0) {
        landmarks = firstFace.map((pt: any) => ({ x: pt.x, y: pt.y, z: pt.z }));
        detected = true;
      }
    }

    // Run ONNX affect inference (internally throttled to ~2 Hz)
    if (this.videoElement && affectInferenceService.isReady) {
      affectInferenceService
        .infer(this.videoElement, landmarks)
        .then((result) => { this.lastAffectResult = result; })
        .catch(() => {/* ignore — cached last result is used */});
    }

    this.processFrameLandmarks(landmarks, detected);
  };

  private runDetectionLoop = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    // Safety checks: only send image if MediaPipe is fully initialized and video metadata is ready
    if (
      this.isMediaPipeInitialized &&
      this.faceMeshInstance &&
      this.videoElement &&
      this.videoElement.readyState >= 2 &&
      this.videoElement.videoWidth > 0 &&
      this.videoElement.videoHeight > 0
    ) {
      try {
        this.faceMeshInstance.send({ image: this.videoElement }).catch((err: any) => {
          // Log once and handle frame gracefully without setting error state
          this.processFrameLandmarks([], false);
        });
      } catch (err) {
        this.processFrameLandmarks([], false);
      }
    } else {
      this.processFrameLandmarks([], false);
    }

    if (this.isRunning) {
      this.animFrameId = requestAnimationFrame(this.runDetectionLoop);
    }
  };

  private processFrameLandmarks(landmarks: FacialPoint[], detected: boolean) {
    this.updateState({
      fps: this.currentFps,
      landmarkCount: landmarks.length,
      faceDetected: detected,
      affectResult: this.lastAffectResult,
    });

    if (this.callback) {
      this.callback(this.currentState, landmarks);
    }

    this.drawOverlay(landmarks);
  }

  private drawOverlay(landmarks: FacialPoint[]) {
    if (!this.canvasElement || !this.videoElement) return;
    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) return;

    const w = (this.canvasElement.width = this.videoElement.videoWidth || 640);
    const h = (this.canvasElement.height = this.videoElement.videoHeight || 480);

    ctx.clearRect(0, 0, w, h);

    if (landmarks.length === 0) return;

    ctx.fillStyle = '#06B6D4'; // Cyan 500
    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      const px = pt.x * w;
      const py = pt.y * h;

      ctx.beginPath();
      ctx.arc(px, py, i % 5 === 0 ? 2.2 : 1.2, 0, 2 * Math.PI);
      ctx.fill();
    }

    if (landmarks.length >= 68) {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let i = 0; i < Math.min(36, landmarks.length); i += 2) {
        const pt = landmarks[i];
        if (i === 0) ctx.moveTo(pt.x * w, pt.y * h);
        else ctx.lineTo(pt.x * w, pt.y * h);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  public async stop(): Promise<void> {
    this.log('Stopping ClientVisionEngine & releasing camera/MediaPipe resources...');
    this.isRunning = false;
    this.isMediaPipeInitialized = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.mediaStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    if (this.canvasElement) {
      const ctx = this.canvasElement.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    if (this.faceMeshInstance) {
      try {
        if (typeof this.faceMeshInstance.close === 'function') {
          await this.faceMeshInstance.close();
        }
      } catch (e) {
        // Ignore cleanup close errors
      }
      this.faceMeshInstance = null;
    }

    this.updateState({
      status: 'OFFLINE',
      fps: 0,
      landmarkCount: 0,
      errorMessage: null,
      faceDetected: false,
    });

    this.log('ClientVisionEngine stopped.');
  }

  private updateState(partial: Partial<VisionState>) {
    this.currentState = { ...this.currentState, ...partial };
  }
}
