import React, { useState, useEffect, useCallback } from 'react';
import { Landmark, FingerState, CameraConfig, AppMode, GestureEntry, ProductivityTask } from './types';
import { Header } from './components/Header';
import { CameraFeed } from './components/CameraFeed';
import { HandCalculator } from './components/HandCalculator';
import { TaskTracker } from './components/TaskTracker';
import { HistoryLog } from './components/HistoryLog';
import { AnalyticsModal } from './components/AnalyticsModal';
import { playResetSound } from './utils/soundEffects';

export default function App() {
  // Global App States
  const [mode, setMode] = useState<AppMode>('accumulator');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [history, setHistory] = useState<GestureEntry[]>([]);
  const [tasks, setTasks] = useState<ProductivityTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Audio / Voice Controls
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Analytics Modal
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);

  // Camera Configuration
  const [cameraConfig, setCameraConfig] = useState<CameraConfig>({
    showLandmarks: true,
    showLabels: true,
    mirrorView: true,
    confidenceThreshold: 0.5,
    simulationMode: false,
  });

  // Current Live Hand State from Camera Feed
  const [currentFingerState, setCurrentFingerState] = useState<FingerState>({
    thumb: false,
    index: false,
    middle: false,
    ring: false,
    pinky: false,
    count: 0,
  });

  const [handedness, setHandedness] = useState<'Left' | 'Right'>('Right');

  // Load initial backend data
  const fetchBackendData = useCallback(async () => {
    try {
      const [resCurrent, resHistory, resTasks] = await Promise.all([
        fetch('/api/current').then((r) => r.json()),
        fetch('/api/history').then((r) => r.json()),
        fetch('/api/tasks').then((r) => r.json()),
      ]);

      if (resCurrent && typeof resCurrent.totalCount === 'number') {
        setTotalCount(resCurrent.totalCount);
      }
      if (resHistory && Array.isArray(resHistory.history)) {
        setHistory(resHistory.history);
      }
      if (resTasks && Array.isArray(resTasks.tasks)) {
        setTasks(resTasks.tasks);
        if (resTasks.tasks.length > 0 && !activeTaskId) {
          setActiveTaskId(resTasks.tasks[0].id);
        }
      }
    } catch (e) {
      console.warn('Backend connection note:', e);
    }
  }, [activeTaskId]);

  useEffect(() => {
    fetchBackendData();
  }, [fetchBackendData]);

  // Handle Hand Detection callback from CameraFeed
  const handleHandDetected = useCallback(
    (state: FingerState, _landmarks: Landmark[] | null, rawHandedness: 'Left' | 'Right') => {
      setCurrentFingerState(state);
      setHandedness(rawHandedness);
    },
    []
  );

  // Commit Count to Backend API
  const handleCommitCount = async (count: number, gestureName: string, handType: string) => {
    try {
      const activeTaskObj = tasks.find((t) => t.id === activeTaskId);

      const res = await fetch('/api/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerCount: count,
          gestureName,
          handType,
          taskId: activeTaskId || undefined,
          taskName: activeTaskObj ? activeTaskObj.title : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTotalCount(data.totalCount);
        if (Array.isArray(data.history)) {
          setHistory(data.history);
        }
        // Refresh tasks to update progress
        const resTasks = await fetch('/api/tasks').then((r) => r.json());
        if (resTasks && Array.isArray(resTasks.tasks)) {
          setTasks(resTasks.tasks);
        }
      }
    } catch (e) {
      console.error('Failed to post count:', e);
      // Local fallback
      setTotalCount((prev) => prev + count);
    }
  };

  // Reset Counter
  const handleResetCounter = async () => {
    if (soundEnabled) playResetSound();
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTotalCount(0);
        setHistory([]);
      }
    } catch (e) {
      setTotalCount(0);
      setHistory([]);
    }
  };

  // Create Productivity Task
  const handleCreateTask = async (title: string, targetCount: number) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, targetCount }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        if (data.task) setActiveTaskId(data.task.id);
      }
    } catch (e) {
      console.error('Error creating task:', e);
    }
  };

  // Delete Productivity Task
  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        if (activeTaskId === id) setActiveTaskId(null);
      }
    } catch (e) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // Delete History Entry
  const handleDeleteHistoryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTotalCount(data.totalCount);
        setHistory(data.history);
      }
    } catch (e) {
      setHistory((prev) => prev.filter((h) => h.id !== id));
    }
  };

  const activeTaskObj = tasks.find((t) => t.id === activeTaskId) || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Header Bar */}
      <Header
        totalCount={totalCount}
        currentMode={mode}
        setMode={setMode}
        voiceEnabled={voiceEnabled}
        setVoiceEnabled={setVoiceEnabled}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onResetCounter={handleResetCounter}
        cameraActive={!cameraConfig.simulationMode}
        activeTaskTitle={activeTaskObj?.title}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera & Gesture Recognition Feed */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <CameraFeed
            onHandDetected={handleHandDetected}
            config={cameraConfig}
            setConfig={setCameraConfig}
          />

          <HandCalculator
            currentFingerState={currentFingerState}
            handedness={handedness}
            totalCount={totalCount}
            setTotalCount={setTotalCount}
            mode={mode}
            voiceEnabled={voiceEnabled}
            soundEnabled={soundEnabled}
            activeTask={activeTaskObj}
            onCommitCount={handleCommitCount}
          />
        </div>

        {/* Right Column: Deep Work Tasks & Capture History */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <TaskTracker
            tasks={tasks}
            activeTaskId={activeTaskId}
            setActiveTaskId={setActiveTaskId}
            onCreateTask={handleCreateTask}
            onDeleteTask={handleDeleteTask}
          />

          <HistoryLog
            history={history}
            onDeleteItem={handleDeleteHistoryItem}
            onClearHistory={handleResetCounter}
          />
        </div>
      </main>

      {/* Analytics Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        history={history}
        totalCount={totalCount}
        tasks={tasks}
      />
    </div>
  );
}
