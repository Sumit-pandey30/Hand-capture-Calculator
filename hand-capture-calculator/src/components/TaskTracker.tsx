import React, { useState } from 'react';
import { ListCheck, Plus, Trash2, CheckCircle, Target, Sparkles, Clock, Layers } from 'lucide-react';
import { ProductivityTask } from '../types';

interface TaskTrackerProps {
  tasks: ProductivityTask[];
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
  onCreateTask: (title: string, targetCount: number) => void;
  onDeleteTask: (id: string) => void;
}

export const TaskTracker: React.FC<TaskTrackerProps> = ({
  tasks,
  activeTaskId,
  setActiveTaskId,
  onCreateTask,
  onDeleteTask
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('10');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateTask(newTitle.trim(), parseInt(newTarget, 10) || 10);
    setNewTitle('');
    setNewTarget('10');
    setShowForm(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <ListCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Deep Work Tasks</h2>
            <p className="text-xs text-slate-400">Link hand gesture counts to productivity goals</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* New Task Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Task Title</label>
            <input
              type="text"
              placeholder="e.g. Write Documentation / 5 Deep Blocks"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-300 block mb-1">Target Count</label>
              <input
                type="number"
                min="1"
                max="100"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                Create Task
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No productivity tasks created yet. Click "New Task" to track a goal!
          </div>
        ) : (
          tasks.map((task) => {
            const isActive = activeTaskId === task.id;
            const pct = Math.min(100, Math.round((task.currentCount / task.targetCount) * 100));

            return (
              <div
                key={task.id}
                onClick={() => setActiveTaskId(task.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                  isActive
                    ? 'bg-slate-800/90 border-blue-500/60 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Active Indicator Strip */}
                {isActive && <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500" />}

                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTaskId(isActive ? null : task.id);
                      }}
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : isActive
                          ? 'border-blue-400 bg-blue-500/20'
                          : 'border-slate-600'
                      }`}
                    >
                      {task.completed && <CheckCircle className="w-3.5 h-3.5 fill-current" />}
                    </button>
                    <span className={`text-xs font-bold ${task.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono text-slate-300 font-semibold">
                      {task.currentCount} / {task.targetCount}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(task.id);
                      }}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      task.completed ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
