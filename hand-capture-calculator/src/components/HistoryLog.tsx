import React, { useState } from 'react';
import { History, Trash2, Search, Download, Clock, Hand, Layers } from 'lucide-react';
import { GestureEntry } from '../types';

interface HistoryLogProps {
  history: GestureEntry[];
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ history, onDeleteItem, onClearHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = history.filter(
    (item) =>
      item.gestureName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.taskName && item.taskName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `finger_counter_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Capture History Log</h2>
            <p className="text-xs text-slate-400">Chronological history of recorded hand gestures & counts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportJSON}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={onClearHistory}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition-all"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {history.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search gesture or task..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {/* History Items Table / List */}
      <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            {history.length === 0 ? 'No hand captures recorded yet. Show your hand to the camera!' : 'No entries found.'}
          </div>
        ) : (
          filtered.map((item) => {
            const dateStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div
                key={item.id}
                className="p-3 bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-mono font-extrabold text-base">
                    +{item.fingerCount}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{item.gestureName}</span>
                      {item.handType && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                          {item.handType} Hand
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {dateStr}
                      </span>
                      <span>•</span>
                      <span className="text-blue-400 font-semibold font-mono">Running Total: {item.totalCount}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                  title="Remove entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
