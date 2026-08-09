export interface Landmark {
  x: number; // 0 to 1
  y: number; // 0 to 1
  z: number;
}

export interface HandLandmarksResult {
  landmarks: Landmark[];
  handedness: 'Left' | 'Right';
  confidence: number;
}

export interface FingerState {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  count: number;
}

export type StateMachineStage = 
  | 'NO_HAND'
  | 'HAND_DETECTED'
  | 'COUNTING_FINGERS'
  | 'WAITING_FOR_REMOVAL'
  | 'ADD_COUNT';

export interface GestureEntry {
  id: string;
  sessionId: string;
  fingerCount: number;
  totalCount: number;
  gestureName: string;
  handType?: string;
  taskName?: string;
  createdAt: string;
}

export interface ProductivityTask {
  id: string;
  title: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  createdAt: string;
}

export type AppMode = 'accumulator' | 'calculator' | 'productivity' | 'game';

export interface GameChallenge {
  targetFingers: number;
  score: number;
  streak: number;
  timeLeft: number;
  active: boolean;
}

export interface CameraConfig {
  showLandmarks: boolean;
  showLabels: boolean;
  mirrorView: boolean;
  confidenceThreshold: number;
  simulationMode: boolean;
}
