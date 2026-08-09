import React from 'react';
import { Camera, Volume2, VolumeX, Mic, MicOff, BarChart2, ListCheck, Sparkles, RefreshCw, Calculator } from 'lucide-react';
import { AppMode } from '../types';

interface HeaderProps {
  totalCount: number;
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  soundEnabled: boolean;
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenAnalytics: () => void;
  onResetCounter: () => void;
  cameraActive: boolean;
  activeTaskTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  totalCount,
  currentMode,
  setMode,
  voiceEnabled,
  setVoiceEnabled,
  soundEnabled,
  setSoundEnabled,
  onOpenAnalytics,
  onResetCounter,
  cameraActive,
  activeTaskTitle
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-md text-white">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-blue-200 bg-clip-text text-transparent">
                Hand Capture Calculator
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                AI Vision
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Finger Gesture Counter & Deep Work Session Logger
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs font-medium">
          <button
            onClick={() => setMode('accumulator')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              currentMode === 'accumulator'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gesture Tally</span>
          </button>
          <button
            onClick={() => setMode('calculator')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              currentMode === 'calculator'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Math Mode</span>
          </button>
          <button
            onClick={() => setMode('productivity')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              currentMode === 'productivity'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListCheck className="w-3.5 h-3.5" />
            <span>Deep Work Tasks</span>
          </button>
          <button
            onClick={() => setMode('game')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              currentMode === 'game'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🎯 Challenge</span>
          </button>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-2">
          {/* Active Task Badge if present */}
          {activeTaskTitle && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate max-w-[120px] font-medium">{activeTaskTitle}</span>
            </div>
          )}

          {/* Session Total Tally Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total</span>
            <span className="text-base font-extrabold text-blue-400 font-mono">{totalCount}</span>
          </div>

          {/* Controls */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Disable Audio FX' : 'Enable Audio FX'}
            className={`p-2 rounded-lg border transition-all ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700'
                : 'bg-slate-800/50 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            title={voiceEnabled ? 'Disable Voice Speech' : 'Enable Voice Speech'}
            className={`p-2 rounded-lg border transition-all ${
              voiceEnabled
                ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-700'
                : 'bg-slate-800/50 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenAnalytics}
            title="View Analytics & Charts"
            className="p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-lg transition-all"
          >
            <BarChart2 className="w-4 h-4" />
          </button>

          <button
            onClick={onResetCounter}
            title="Reset Counter"
            className="p-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
