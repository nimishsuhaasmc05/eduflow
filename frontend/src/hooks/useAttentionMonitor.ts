import { useState, useCallback } from 'react';
import { useWebcamFaceMesh } from './useWebcamFaceMesh';
import { attentionMonitor } from '../services/attentionMonitor';
import { AttentionMetrics, FacialPoint } from '../types';

export interface UseAttentionMonitorReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  webcamStatus: string;
  attentionMetrics: AttentionMetrics;
  landmarks: FacialPoint[];
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
}

const initialMetrics: AttentionMetrics = {
  isFaceDetected: false,
  gazeDirection: 'CENTER',
  blinkRateBPM: 0,
  ear: 0.28,
  headPose: { yaw: 0, pitch: 0, roll: 0 },
  attentionScore: 0,
  status: 'No Face Detected',
  fps: 0,
};

export function useAttentionMonitor(): UseAttentionMonitorReturn {
  const [attentionMetrics, setAttentionMetrics] = useState<AttentionMetrics>(initialMetrics);

  const {
    videoRef,
    canvasRef,
    status: webcamStatus,
    fps,
    landmarks,
    startWebcam,
    stopWebcam,
  } = useWebcamFaceMesh();

  // Compute live metrics when landmarks update
  const startMonitoring = useCallback(async () => {
    await startWebcam();
  }, [startWebcam]);

  const stopMonitoring = useCallback(() => {
    stopWebcam();
    setAttentionMetrics(initialMetrics);
  }, [stopWebcam]);

  // Synchronously compute metrics on each frame loop
  const computed = attentionMonitor.computeMetrics(landmarks, fps);

  return {
    videoRef,
    canvasRef,
    webcamStatus,
    attentionMetrics: webcamStatus === 'CONNECTED' ? computed : { ...initialMetrics, fps },
    landmarks,
    startMonitoring,
    stopMonitoring,
  };
}
