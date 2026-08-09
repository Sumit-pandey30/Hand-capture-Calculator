import React from 'react';
import { BarChart2, X, Activity, PieChart, Layers, CheckCircle2 } from 'lucide-react';
import { GestureEntry, ProductivityTask } from '../types';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: GestureEntry[];
  totalCount: number;
  tasks: ProductivityTask[];
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  history,
  totalCount,
  tasks
}) => {
  if (!isOpen) return null;

  // Calculate Finger Frequency (1 to 5)
  const freqMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let rightHandCount = 0;
  let leftHandCount = 0;

  history.forEach((entry) => {
    if (freqMap[entry.fingerCount] !== undefined) {
      freqMap[entry.fingerCount]++;
    }
    if (entry.handType === 'Right') rightHandCount++;
    if (entry.handType === 'Left') leftHandCount++;
  });

  const maxFreq = Math.max(...Object.values(freqMap), 1);
  const completedTasks = tasks.filter((t) => t.completed).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Capture Analytics & Statistics</h2>
              <p className="text-xs text-slate-400">Insights from recorded hand gestures & sessions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total Tally</span>
            <span className="text-2xl font-extrabold font-mono text-blue-400">{totalCount}</span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Gestures Logged</span>
            <span className="text-2xl font-extrabold font-mono text-indigo-400">{history.length}</span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Tasks Done</span>
            <span className="text-2xl font-extrabold font-mono text-emerald-400">
              {completedTasks} / {tasks.length}
            </span>
          </div>
        </div>

        {/* Finger Frequency Distribution Bar Chart */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-400" /> Finger Gesture Frequency Distribution
          </span>

          <div className="space-y-2.5 pt-2">
            {[1, 2, 3, 4, 5].map((num) => {
              const count = freqMap[num];
              const pct = Math.round((count / maxFreq) * 100);

              return (
                <div key={num} className="flex items-center gap-3 text-xs">
                  <span className="w-16 font-semibold text-slate-300 flex items-center gap-1">
                    {num === 1 ? '☝️ 1 Finger' : num === 2 ? '✌️ 2 Fingers' : num === 3 ? '🤟 3 Fingers' : num === 4 ? '🖖 4 Fingers' : '🖐️ 5 Fingers'}
                  </span>
                  <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 font-mono text-slate-400 text-right font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Handedness breakdown */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="font-semibold text-slate-400 block mb-1">Right Hand Captures</span>
            <span className="text-lg font-bold font-mono text-slate-200">{rightHandCount}</span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="font-semibold text-slate-400 block mb-1">Left Hand Captures</span>
            <span className="text-lg font-bold font-mono text-slate-200">{leftHandCount}</span>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
