import React from 'react';
import { useWebcamFaceMesh } from '../../hooks/useWebcamFaceMesh';
import { Camera, ShieldCheck, Play, Square, AlertTriangle, RefreshCw, Activity, CheckCircle2 } from 'lucide-react';

export const WebcamMonitor: React.FC = () => {
  const {
    videoRef,
    canvasRef,
    status,
    fps,
    landmarkCount,
    errorMessage,
    faceDetected,
    startWebcam,
    stopWebcam,
  } = useWebcamFaceMesh();

  const isConnected = status === 'CONNECTED';
  const isInitializing = status === 'INITIALIZING';
  const isPermissionDenied = status === 'PERMISSION_DENIED';
  const isInsecureContext = status === 'INSECURE_CONTEXT';
  const isError = status === 'ERROR';

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 relative overflow-hidden space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Camera className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>Webcam MediaPipe Face Mesh Sensor</span>
              <span className="text-[10px] bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 px-2 py-0.5 rounded-full flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>100% Client-Side</span>
              </span>
            </h3>
          </div>
        </div>

        {/* Start / Stop Action Button */}
        <div>
          {isConnected || isInitializing ? (
            <button
              onClick={stopWebcam}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-all flex items-center space-x-2"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              onClick={startWebcam}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all flex items-center space-x-2 shadow-glow-cyan"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isPermissionDenied || isInsecureContext || isError ? 'Retry Camera' : 'Start Camera'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Video Stream & Canvas Container */}
      <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center shadow-inner">
        {/* HTML5 Live Video Stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${
            !isConnected ? 'hidden' : 'block'
          }`}
        />

        {/* Real-time MediaPipe Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 ${
            !isConnected ? 'hidden' : 'block'
          }`}
        />

        {/* Offline Initial State Banner */}
        {status === 'OFFLINE' && (
          <div className="text-center p-8 space-y-3 max-w-sm">
            <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400 shadow-lg">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">Webcam Sensor Ready</h4>
              <p className="text-xs text-slate-400 mt-1">
                Click <strong>"Start Camera"</strong> to request browser camera access and render MediaPipe 3D Face Mesh landmarks.
              </p>
            </div>
          </div>
        )}

        {/* Initializing Spinner State */}
        {isInitializing && (
          <div className="text-center p-8 space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-cyan-300">
              Accessing browser camera & initializing MediaPipe Face Mesh...
            </p>
          </div>
        )}

        {/* Insecure Context Warning Banner */}
        {isInsecureContext && (
          <div className="text-center p-6 space-y-3 max-w-md bg-amber-950/40 border border-amber-500/30 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">Secure Context Required</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {errorMessage}
              </p>
              <p className="text-[11px] text-amber-200/80 mt-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-left font-mono">
                💡 Fix: Open the application in your browser at <strong>http://localhost:5174</strong> instead of the LAN IP.
              </p>
            </div>
          </div>
        )}

        {/* Graceful Permission Denied Warning Banner */}
        {isPermissionDenied && (
          <div className="text-center p-6 space-y-3 max-w-md bg-rose-950/40 border border-rose-500/30 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-300">Camera Permission Denied</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {errorMessage || 'Browser camera access was denied or blocked.'}
              </p>
              <p className="text-[11px] text-slate-400 mt-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-left font-mono">
                💡 To fix: Click the lock icon 🔒 next to the browser URL address bar and allow <strong>Camera</strong> permissions, then click Retry.
              </p>
            </div>
            <button
              onClick={startWebcam}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all inline-flex items-center space-x-1.5 shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Permission</span>
            </button>
          </div>
        )}

        {/* Generic Error Banner */}
        {isError && (
          <div className="text-center p-6 space-y-3 max-w-md bg-amber-950/40 border border-amber-500/30 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">Webcam Connection Error</h4>
              <p className="text-xs text-slate-300 mt-1">{errorMessage}</p>
            </div>
            <button
              onClick={startWebcam}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all inline-flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Connected Live Status & FPS HUD Badge Overlay */}
        {isConnected && (
          <div className="absolute top-3 left-3 flex items-center space-x-2 z-10">
            <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 flex items-center space-x-2 text-[11px] font-mono shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-emerald-400 font-bold">CONNECTED</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400 font-bold">{fps} FPS</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300">{landmarkCount} Landmarks</span>
            </div>
          </div>
        )}
      </div>

      {/* Connection Details Footer */}
      <div className="grid grid-cols-3 gap-3 text-center text-xs">
        <div className="glass-panel p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Status</span>
          <span className={`font-bold ${
            isConnected ? 'text-emerald-400' : isPermissionDenied ? 'text-rose-400' : 'text-slate-400'
          }`}>
            {status}
          </span>
        </div>
        <div className="glass-panel p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Frame Rate</span>
          <span className="font-bold text-cyan-400 font-mono">{fps} FPS</span>
        </div>
        <div className="glass-panel p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Landmarks</span>
          <span className="font-bold text-slate-200 font-mono">{landmarkCount} Mesh Points</span>
        </div>
      </div>
    </div>
  );
};
