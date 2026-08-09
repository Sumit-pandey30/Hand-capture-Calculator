import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw, Eye, EyeOff, Sliders, Play, Settings2, Sparkles } from 'lucide-react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Landmark, FingerState, CameraConfig } from '../types';
import { analyzeFingers, drawHandOverlay, getSimulatedLandmarks } from '../utils/handDetection';

interface CameraFeedProps {
  onHandDetected: (state: FingerState, landmarks: Landmark[] | null, rawHandedness: 'Left' | 'Right') => void;
  config: CameraConfig;
  setConfig: React.Dispatch<React.SetStateAction<CameraConfig>>;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ onHandDetected, config, setConfig }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [loadingModel, setLoadingModel] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(0);
  const [simulatedFingerCount, setSimulatedFingerCount] = useState<number>(5);

  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    let active = true;

    async function initHandLandmarker() {
      try {
        setLoadingModel(true);
        setModelError(null);

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: config.confidenceThreshold,
          minHandPresenceConfidence: config.confidenceThreshold,
          minTrackingConfidence: config.confidenceThreshold,
        });

        if (active) {
          handLandmarkerRef.current = landmarker;
          setLoadingModel(false);
        }
      } catch (err: unknown) {
        console.error('Failed to load MediaPipe HandLandmarker:', err);
        if (active) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setModelError(`Vision model loading note: ${errorMessage}. Interactive camera simulator available!`);
          setLoadingModel(false);
          // Auto switch to simulation mode if model or webcam fails
          setConfig((prev) => ({ ...prev, simulationMode: true }));
        }
      }
    }

    initHandLandmarker();

    return () => {
      active = false;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, [config.confidenceThreshold, setConfig]);

  // Start Real Video Stream
  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam API is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
        };
      }
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      setCameraActive(false);
      setConfig((prev) => ({ ...prev, simulationMode: true }));
    }
  }, [setConfig]);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Main Detection Loop
  useEffect(() => {
    if (config.simulationMode) {
      stopCamera();
      // Simulation Loop
      const interval = setInterval(() => {
        const landmarks = getSimulatedLandmarks(simulatedFingerCount);
        const state = analyzeFingers(landmarks, 'Right');
        onHandDetected(state, landmarks, 'Right');

        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            drawHandOverlay(
              ctx,
              landmarks,
              state,
              canvasRef.current.width,
              canvasRef.current.height,
              config.showLabels
            );
          }
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      startCamera();
    }
  }, [config.simulationMode, simulatedFingerCount, config.showLabels, startCamera, stopCamera, onHandDetected]);

  // Real Frame Video Processing Loop
  const processFrame = useCallback(() => {
    if (!config.simulationMode && videoRef.current && videoRef.current.readyState >= 2) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (canvas) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        const ctx = canvas.getContext('2d');
        const startTimeMs = performance.now();

        // Calculate FPS
        frameCountRef.current++;
        if (startTimeMs - lastTimeRef.current >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (startTimeMs - lastTimeRef.current)));
          frameCountRef.current = 0;
          lastTimeRef.current = startTimeMs;
        }

        if (handLandmarkerRef.current) {
          try {
            const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

            if (results && results.landmarks && results.landmarks.length > 0) {
              const rawLandmarks = results.landmarks[0] as Landmark[];
              const handednessCategory = results.handedness?.[0]?.[0]?.categoryName || 'Right';
              const handedness = handednessCategory as 'Left' | 'Right';

              const fingerState = analyzeFingers(rawLandmarks, handedness);
              onHandDetected(fingerState, rawLandmarks, handedness);

              if (ctx && config.showLandmarks) {
                drawHandOverlay(ctx, rawLandmarks, fingerState, canvas.width, canvas.height, config.showLabels);
              } else if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
              }
            } else {
              onHandDetected(
                { thumb: false, index: false, middle: false, ring: false, pinky: false, count: 0 },
                null,
                'Right'
              );
              if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          } catch (e) {
            console.error('Frame detection error:', e);
          }
        }
      }
    }

    if (!config.simulationMode) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
    }
  }, [config.simulationMode, config.showLandmarks, config.showLabels, onHandDetected]);

  useEffect(() => {
    if (!config.simulationMode && cameraActive) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraActive, config.simulationMode, processFrame]);

  return (
    <div className="relative flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Overlay Badge Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-full text-xs font-semibold text-slate-200 shadow-md">
            <span
              className={`w-2 h-2 rounded-full ${
                config.simulationMode ? 'bg-amber-400 animate-pulse' : cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}
            />
            <span>{config.simulationMode ? 'SIMULATOR MODE' : cameraActive ? 'LIVE WEBCAM' : 'OFFLINE'}</span>
          </div>

          {!config.simulationMode && cameraActive && (
            <div className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-full text-[11px] font-mono text-slate-400">
              {fps} FPS
            </div>
          )}
        </div>

        {/* Mode Switch Button */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-full border border-slate-700/80 shadow-md">
          <button
            onClick={() => setConfig((prev) => ({ ...prev, simulationMode: !prev.simulationMode }))}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              config.simulationMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-blue-600 text-white shadow-sm'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{config.simulationMode ? 'Use Live Webcam' : 'Use Virtual Hand'}</span>
          </button>
        </div>
      </div>

      {/* Main Video & Canvas Viewport */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {loadingModel && !config.simulationMode && (
          <div className="absolute inset-0 z-10 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-200">Loading AI Vision Model...</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">Initializing MediaPipe 21-Landmark Hand Landmarker</p>
          </div>
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transition-transform duration-300 ${
            config.mirrorView ? 'scale-x-[-1]' : ''
          } ${config.simulationMode ? 'hidden' : 'block'}`}
        />

        {/* Skeleton Canvas Overlay */}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-300 ${
            config.mirrorView ? 'scale-x-[-1]' : ''
          }`}
        />

        {/* Simulation Canvas / Virtual Control Overlay */}
        {config.simulationMode && (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 p-4 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-xl max-w-md w-full">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Virtual Hand Gesture Controls
              </div>
              <p className="text-xs text-slate-300 mb-4">
                Select finger count or click fingers to simulate gestures without webcam!
              </p>

              {/* Quick Finger Selector Buttons */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {[0, 1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSimulatedFingerCount(num)}
                    className={`w-10 h-10 rounded-xl font-bold font-mono transition-all border ${
                      simulatedFingerCount === num
                        ? 'bg-blue-600 text-white border-blue-400 scale-110 shadow-lg shadow-blue-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Finger Visual Icons */}
              <div className="flex items-center justify-center gap-2 text-2xl font-bold py-2 bg-slate-900/90 rounded-xl border border-slate-800">
                <span>{simulatedFingerCount === 0 ? '✊ 0' : simulatedFingerCount === 1 ? '☝️ 1' : simulatedFingerCount === 2 ? '✌️ 2' : simulatedFingerCount === 3 ? '🤟 3' : simulatedFingerCount === 4 ? '🖖 4' : '🖐️ 5'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Controls Footer Toolbar */}
      <div className="bg-slate-900 p-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfig((prev) => ({ ...prev, showLandmarks: !prev.showLandmarks }))}
            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-medium ${
              config.showLandmarks
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {config.showLandmarks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{config.showLandmarks ? 'Skeleton ON' : 'Skeleton OFF'}</span>
          </button>

          <button
            onClick={() => setConfig((prev) => ({ ...prev, showLabels: !prev.showLabels }))}
            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-medium ${
              config.showLabels
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <span>{config.showLabels ? 'Finger Labels ON' : 'Labels OFF'}</span>
          </button>

          <button
            onClick={() => setConfig((prev) => ({ ...prev, mirrorView: !prev.mirrorView }))}
            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-medium ${
              config.mirrorView
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <span>{config.mirrorView ? 'Mirror ON' : 'Mirror OFF'}</span>
          </button>
        </div>

        {/* Re-sync / Restart Camera */}
        <button
          onClick={() => {
            if (!config.simulationMode) {
              stopCamera();
              setTimeout(() => startCamera(), 300);
            }
          }}
          className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync View</span>
        </button>
      </div>
    </div>
  );
};
