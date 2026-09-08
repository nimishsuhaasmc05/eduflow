import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { AffectiveMetrics, ClosedLoopIntervention, WebcamStatus } from '../types';
import { ClientVisionEngine, FacialLandmark, VisionState } from '../services/visionEngine';
import { closedLoopController } from '../services/closedLoopController';
import { attentionMonitor } from '../services/attentionMonitor';

interface AffectiveContextType {
  metrics: AffectiveMetrics;
  landmarks: FacialLandmark[];
  isMonitoring: boolean;
  activeIntervention: ClosedLoopIntervention | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: WebcamStatus;
  fps: number;
  landmarkCount: number;
  errorMessage: string | null;
  faceDetected: boolean;
  startWebcam: () => Promise<void>;
  stopWebcam: () => void;
  startMonitoring: (videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement) => Promise<void>;
  stopMonitoring: () => void;
  triggerStateOverride: (state: 'CONFUSION' | 'DISTRACTION' | 'BOREDOM' | 'ENGAGED' | 'HIGH_COGNITIVE_LOAD') => void;
  dismissIntervention: () => void;
  setCurrentContext: (courseId: number, moduleId: number, timestampSeconds: number) => void;
}

const defaultMetrics: AffectiveMetrics = {
  attention: 0.0,
  confusion: 0.0,
  boredom: 0.0,
  engagement: 0.0,
  distraction: 1.0,
  cognitive_load: 0.0,
  primary_state: 'DISTRACTION',
  fps: 0
};

const AffectiveContext = createContext<AffectiveContextType | undefined>(undefined);

export const AffectiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [metrics, setMetrics] = useState<AffectiveMetrics>(defaultMetrics);
  const [landmarks, setLandmarks] = useState<FacialLandmark[]>([]);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [activeIntervention, setActiveIntervention] = useState<ClosedLoopIntervention | null>(null);

  const [visionState, setVisionState] = useState<VisionState>({
    status: 'OFFLINE',
    fps: 0,
    landmarkCount: 0,
    errorMessage: null,
    faceDetected: false,
  });

  const courseIdRef = useRef<number>(1);
  const moduleIdRef = useRef<number>(1);
  const timestampRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);
  const lastStatusRef = useRef<string>('OFFLINE');

  const visionEngineRef = useRef<ClientVisionEngine | null>(null);

  useEffect(() => {
    const unsubscribe = closedLoopController.subscribe((intervention) => {
      setActiveIntervention(intervention);
    });
    return () => unsubscribe();
  }, []);

  const setCurrentContext = (courseId: number, moduleId: number, timestampSeconds: number) => {
    courseIdRef.current = courseId;
    moduleIdRef.current = moduleId;
    timestampRef.current = timestampSeconds;
  };

  const handleVisionFrame = useCallback((state: VisionState, updatedLandmarks: FacialLandmark[]) => {
    const now = Date.now();
    const statusChanged = state.status !== lastStatusRef.current;

    if (state.status === 'CONNECTED') {
      setIsMonitoring(true);
      // Derive affective metrics on every frame internally
      const derivedMetrics = attentionMonitor.deriveAffectiveMetrics(updatedLandmarks, state.fps);

      // Evaluate telemetry with actual course context
      closedLoopController.evaluateMetrics(
        courseIdRef.current,
        moduleIdRef.current,
        timestampRef.current,
        derivedMetrics
      );

      // Decouple CV pipeline from React rendering: throttle state updates to prevent UI shaking
      if (statusChanged || now - lastUiUpdateRef.current >= 500) {
        lastUiUpdateRef.current = now;
        lastStatusRef.current = state.status;
        setVisionState(state);
        setLandmarks(updatedLandmarks);
        setMetrics(derivedMetrics);
      }
    } else {
      setIsMonitoring(false);
      if (statusChanged || now - lastUiUpdateRef.current >= 500) {
        lastUiUpdateRef.current = now;
        lastStatusRef.current = state.status;
        setVisionState(state);
        setLandmarks([]);
      }
    }
  }, []);

  const startWebcam = useCallback(async () => {
    if (!visionEngineRef.current) {
      visionEngineRef.current = new ClientVisionEngine();
    }
    if (videoRef.current && canvasRef.current) {
      await visionEngineRef.current.start(
        videoRef.current,
        canvasRef.current,
        handleVisionFrame
      );
    }
  }, [handleVisionFrame]);

  const startMonitoring = async (vEl: HTMLVideoElement, cEl: HTMLCanvasElement) => {
    if (!visionEngineRef.current) {
      visionEngineRef.current = new ClientVisionEngine();
    }
    await visionEngineRef.current.start(vEl, cEl, handleVisionFrame);
  };

  const stopWebcam = useCallback(() => {
    if (visionEngineRef.current) {
      visionEngineRef.current.stop();
    }
    setIsMonitoring(false);
    setLandmarks([]);
    setVisionState({
      status: 'OFFLINE',
      fps: 0,
      landmarkCount: 0,
      errorMessage: null,
      faceDetected: false,
    });
  }, []);

  const stopMonitoring = stopWebcam;

  const triggerStateOverride = (state: 'CONFUSION' | 'DISTRACTION' | 'BOREDOM' | 'ENGAGED' | 'HIGH_COGNITIVE_LOAD') => {
    if (visionEngineRef.current) {
      visionEngineRef.current.injectStateOverride(state);
    }
  };

  const dismissIntervention = () => {
    setActiveIntervention(null);
  };

  return (
    <AffectiveContext.Provider value={{
      metrics,
      landmarks,
      isMonitoring,
      activeIntervention,
      videoRef,
      canvasRef,
      status: visionState.status,
      fps: visionState.fps,
      landmarkCount: visionState.landmarkCount,
      errorMessage: visionState.errorMessage,
      faceDetected: visionState.faceDetected,
      startWebcam,
      stopWebcam,
      startMonitoring,
      stopMonitoring,
      triggerStateOverride,
      dismissIntervention,
      setCurrentContext
    }}>
      {children}
    </AffectiveContext.Provider>
  );
};

export const useAffective = () => {
  const context = useContext(AffectiveContext);
  if (!context) {
    throw new Error("useAffective must be used within an AffectiveProvider");
  }
  return context;
};
