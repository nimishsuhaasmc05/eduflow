import { useAffective } from '../context/AffectiveContext';
import { FacialPoint, WebcamStatus } from '../types';

export interface UseWebcamFaceMeshReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: WebcamStatus;
  fps: number;
  landmarkCount: number;
  errorMessage: string | null;
  faceDetected: boolean;
  landmarks: FacialPoint[];
  startWebcam: () => Promise<void>;
  stopWebcam: () => void;
}

export function useWebcamFaceMesh(): UseWebcamFaceMeshReturn {
  const {
    videoRef,
    canvasRef,
    status,
    fps,
    landmarkCount,
    errorMessage,
    faceDetected,
    landmarks,
    startWebcam,
    stopWebcam,
  } = useAffective();

  return {
    videoRef,
    canvasRef,
    status,
    fps,
    landmarkCount,
    errorMessage,
    faceDetected,
    landmarks,
    startWebcam,
    stopWebcam,
  };
}
