import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Calculator, Plus, Minus, X, Equal, RotateCcw, Award, CheckCircle2, AlertCircle, ArrowRight, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FingerState, StateMachineStage, AppMode, GameChallenge, ProductivityTask } from '../types';
import { playHandDetectedSound, playCountAddedSound, playTargetReachedSound, speakText } from '../utils/soundEffects';

interface HandCalculatorProps {
  currentFingerState: FingerState;
  handedness: 'Left' | 'Right';
  totalCount: number;
  setTotalCount: React.Dispatch<React.SetStateAction<number>>;
  mode: AppMode;
  voiceEnabled: boolean;
  soundEnabled: boolean;
  activeTask: ProductivityTask | null;
  onCommitCount: (count: number, gestureName: string, handType: string) => void;
}

export const HandCalculator: React.FC<HandCalculatorProps> = ({
  currentFingerState,
  handedness,
  totalCount,
  setTotalCount,
  mode,
  voiceEnabled,
  soundEnabled,
  activeTask,
  onCommitCount
}) => {
  // State Machine Stage
  const [stage, setStage] = useState<StateMachineStage>('NO_HAND');
  const [stableCount, setStableCount] = useState<number>(0);
  const [holdProgress, setHoldProgress] = useState<number>(0);

  // Math Calculator Mode state
  const [calcOperandA, setCalcOperandA] = useState<number | null>(null);
  const [calcOperator, setCalcOperator] = useState<'+' | '-' | '*' | '/' | null>('+');
  const [calcDisplay, setCalcDisplay] = useState<string>('0');
  const [calcHistoryExpr, setCalcHistoryExpr] = useState<string>('');

  // Challenge Game State
  const [game, setGame] = useState<GameChallenge>({
    targetFingers: 3,
    score: 0,
    streak: 0,
    timeLeft: 30,
    active: false,
  });

  const lastFingerCountRef = useRef<number>(0);
  const stableTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sound triggers helper
  const triggerAudio = useCallback((type: 'detect' | 'add' | 'target') => {
    if (!soundEnabled) return;
    if (type === 'detect') playHandDetectedSound();
    if (type === 'add') playCountAddedSound(stableCount);
    if (type === 'target') playTargetReachedSound();
  }, [soundEnabled, stableCount]);

  // Voice speech helper
  const triggerVoice = useCallback((msg: string) => {
    if (voiceEnabled) {
      speakText(msg);
    }
  }, [voiceEnabled]);

  // Execute Math Calculation
  const executeMathOperation = useCallback((op: '+' | '-' | '*' | '/', operandA: number, operandB: number) => {
    let result = operandA;
    let opSymbol = '+';
    let opWord = 'plus';

    if (op === '+') {
      result = operandA + operandB;
      opSymbol = '+';
      opWord = 'plus';
    } else if (op === '-') {
      result = operandA - operandB;
      opSymbol = '-';
      opWord = 'minus';
    } else if (op === '*') {
      result = operandA * operandB;
      opSymbol = '×';
      opWord = 'times';
    } else if (op === '/') {
      result = operandB !== 0 ? Math.floor(operandA / operandB) : operandA;
      opSymbol = '÷';
      opWord = 'divided by';
    }

    const expr = `${operandA} ${opSymbol} ${operandB} = ${result}`;
    setCalcHistoryExpr(expr);
    setCalcDisplay(result.toString());
    setTotalCount(result);

    triggerAudio('add');
    triggerVoice(`${operandA} ${opWord} ${operandB} equals ${result}`);
    onCommitCount(result - operandA, `Math: ${expr}`, handedness);

    setCalcOperandA(result);
    return result;
  }, [handedness, onCommitCount, setTotalCount, triggerAudio, triggerVoice]);

  // State Machine Transitions
  useEffect(() => {
    const rawCount = currentFingerState.count;

    if (rawCount === 0) {
      if (stage === 'WAITING_FOR_REMOVAL') {
        // Hand removed! Commit or Calculate!
        if (mode === 'calculator' && calcOperator) {
          const currentBase = calcOperandA !== null ? calcOperandA : totalCount;
          executeMathOperation(calcOperator, currentBase, stableCount);
        } else {
          triggerAudio('add');
          triggerVoice(`Added ${stableCount}! Total is now ${totalCount + stableCount}`);
          onCommitCount(stableCount, `${stableCount} Fingers`, handedness);
        }

        // Check if in game mode
        if (mode === 'game' && game.active) {
          if (stableCount === game.targetFingers) {
            triggerAudio('target');
            triggerVoice('Correct target!');
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
            setGame((prev) => ({
              ...prev,
              score: prev.score + 10,
              streak: prev.streak + 1,
              targetFingers: Math.floor(Math.random() * 5) + 1,
            }));
          }
        }

        setStage('NO_HAND');
        setHoldProgress(0);
      } else if (stage !== 'NO_HAND') {
        setStage('NO_HAND');
        setHoldProgress(0);
      }
      lastFingerCountRef.current = 0;
      return;
    }

    // Hand detected with fingers > 0
    if (stage === 'NO_HAND') {
      setStage('HAND_DETECTED');
      triggerAudio('detect');
      setStableCount(rawCount);
      lastFingerCountRef.current = rawCount;
      setHoldProgress(0);
    } else if (stage === 'HAND_DETECTED' || stage === 'COUNTING_FINGERS') {
      if (rawCount === lastFingerCountRef.current) {
        // Finger count is stable! Hold progress fill
        setHoldProgress((prev) => {
          if (prev >= 100) {
            setStage('WAITING_FOR_REMOVAL');
            triggerVoice(`Captured ${rawCount}! Remove hand to perform operation.`);
            return 100;
          }
          return prev + 25; // 4 ticks (~400ms) to lock
        });
      } else {
        // Count changed, reset progress
        lastFingerCountRef.current = rawCount;
        setStableCount(rawCount);
        setHoldProgress(0);
      }
    }
  }, [currentFingerState.count, stage, stableCount, totalCount, mode, calcOperator, calcOperandA, executeMathOperation, game.active, game.targetFingers, handedness, onCommitCount, triggerAudio, triggerVoice]);

  // Game timer countdown
  useEffect(() => {
    if (mode === 'game' && game.active) {
      const timer = setInterval(() => {
        setGame((prev) => {
          if (prev.timeLeft <= 1) {
            clearInterval(timer);
            return { ...prev, timeLeft: 0, active: false };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode, game.active]);

  // Calculator Math Operations
  const handleSetOperator = (op: '+' | '-' | '*') => {
    setCalcOperandA(parseInt(calcDisplay, 10) || totalCount);
    setCalcOperator(op);
    setCalcDisplay('0');
  };

  const handleCalculateResult = () => {
    if (calcOperandA === null || calcOperator === null) return;
    const currentVal = currentFingerState.count > 0 ? currentFingerState.count : parseInt(calcDisplay, 10) || 0;
    let res = 0;
    if (calcOperator === '+') res = calcOperandA + currentVal;
    if (calcOperator === '-') res = calcOperandA - currentVal;
    if (calcOperator === '*') res = calcOperandA * currentVal;

    setCalcDisplay(res.toString());
    setTotalCount(res);
    setCalcOperandA(null);
    setCalcOperator(null);
    triggerAudio('add');
    triggerVoice(`Result is ${res}`);
  };

  return (
    <div className="flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* State Machine Status Header */}
      <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
            Gesture State Machine
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                stage === 'NO_HAND'
                  ? 'bg-slate-500'
                  : stage === 'HAND_DETECTED' || stage === 'COUNTING_FINGERS'
                  ? 'bg-blue-400 animate-pulse'
                  : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span className="text-sm font-bold text-white tracking-wide">
              {stage === 'NO_HAND' && 'NO HAND DETECTED'}
              {stage === 'HAND_DETECTED' && 'HAND DETECTED'}
              {stage === 'COUNTING_FINGERS' && `COUNTING (${currentFingerState.count})`}
              {stage === 'WAITING_FOR_REMOVAL' && 'READY! REMOVE HAND TO COMMIT'}
            </span>
          </div>
        </div>

        {/* Current Active Finger Count Display Badge */}
        <div className="text-right">
          <span className="text-xs text-slate-400 block font-medium">Captured</span>
          <div className="text-3xl font-extrabold font-mono text-blue-400 flex items-center gap-1 justify-end">
            <span>{currentFingerState.count}</span>
            <span className="text-xs font-sans text-slate-400 font-normal">fingers</span>
          </div>
        </div>
      </div>

      {/* Hold Progress Bar for State Lock */}
      {holdProgress > 0 && holdProgress < 100 && (
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 transition-all duration-150"
            style={{ width: `${holdProgress}%` }}
          />
        </div>
      )}

      {/* Individual Finger Status Pills */}
      <div className="grid grid-cols-5 gap-2 text-center text-xs">
        <div className={`p-2 rounded-xl border font-semibold transition-all ${currentFingerState.thumb ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
          <span>Thumb</span>
          <span className="block text-[10px] mt-0.5 opacity-80">{currentFingerState.thumb ? 'OPEN' : 'CLOSED'}</span>
        </div>
        <div className={`p-2 rounded-xl border font-semibold transition-all ${currentFingerState.index ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
          <span>Index</span>
          <span className="block text-[10px] mt-0.5 opacity-80">{currentFingerState.index ? 'OPEN' : 'CLOSED'}</span>
        </div>
        <div className={`p-2 rounded-xl border font-semibold transition-all ${currentFingerState.middle ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
          <span>Middle</span>
          <span className="block text-[10px] mt-0.5 opacity-80">{currentFingerState.middle ? 'OPEN' : 'CLOSED'}</span>
        </div>
        <div className={`p-2 rounded-xl border font-semibold transition-all ${currentFingerState.ring ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
          <span>Ring</span>
          <span className="block text-[10px] mt-0.5 opacity-80">{currentFingerState.ring ? 'OPEN' : 'CLOSED'}</span>
        </div>
        <div className={`p-2 rounded-xl border font-semibold transition-all ${currentFingerState.pinky ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
          <span>Pinky</span>
          <span className="block text-[10px] mt-0.5 opacity-80">{currentFingerState.pinky ? 'OPEN' : 'CLOSED'}</span>
        </div>
      </div>

      {/* MODE SPECIFIC INTERACTIVE PANELS */}

      {/* 1. Calculator Operations Mode */}
      {mode === 'calculator' && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Gesture Math Engine
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Select operation & raise fingers to calculate!
            </span>
          </div>

          {/* Real-time Math Formula Preview Display */}
          <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Expression</span>
              <div className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                <span>{calcOperandA !== null ? calcOperandA : totalCount}</span>
                <span className="text-blue-400 font-extrabold">{calcOperator || '+'}</span>
                <span className="text-emerald-400">{currentFingerState.count} fingers</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Projected Result</span>
              <div className="text-2xl font-extrabold text-blue-400">
                {(() => {
                  const base = calcOperandA !== null ? calcOperandA : totalCount;
                  const count = currentFingerState.count;
                  if (calcOperator === '+') return base + count;
                  if (calcOperator === '-') return base - count;
                  if (calcOperator === '*') return base * count;
                  if (calcOperator === '/') return count !== 0 ? Math.floor(base / count) : base;
                  return base + count;
                })()}
              </div>
            </div>
          </div>

          {calcHistoryExpr && (
            <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center justify-between">
              <span>Last Calc: {calcHistoryExpr}</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Operation Selector Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => {
                setCalcOperator('+');
                triggerAudio('detect');
              }}
              className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                calcOperator === '+'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Plus className="w-4 h-4 text-blue-300" />
              <span>Addition (+)</span>
            </button>

            <button
              onClick={() => {
                setCalcOperator('-');
                triggerAudio('detect');
              }}
              className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                calcOperator === '-'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Minus className="w-4 h-4 text-purple-300" />
              <span>Subtract (-)</span>
            </button>

            <button
              onClick={() => {
                setCalcOperator('*');
                triggerAudio('detect');
              }}
              className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                calcOperator === '*'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <X className="w-4 h-4 text-emerald-300" />
              <span>Multiply (×)</span>
            </button>

            <button
              onClick={() => {
                if (calcOperator) {
                  const base = calcOperandA !== null ? calcOperandA : totalCount;
                  executeMathOperation(calcOperator, base, currentFingerState.count > 0 ? currentFingerState.count : 1);
                }
              }}
              className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl border border-emerald-400 flex items-center justify-center gap-1.5 shadow-md transition-all"
            >
              <Equal className="w-4 h-4" />
              <span>Equals (=)</span>
            </button>
          </div>

          {/* Quick Arithmetic Shortcut Row */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400 font-medium">Quick Arithmetic:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => executeMathOperation('+', totalCount, 5)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg font-mono font-semibold"
              >
                +5
              </button>
              <button
                onClick={() => executeMathOperation('-', totalCount, 2)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg font-mono font-semibold"
              >
                -2
              </button>
              <button
                onClick={() => executeMathOperation('*', totalCount, 2)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg font-mono font-semibold"
              >
                ×2
              </button>
              <button
                onClick={() => executeMathOperation('*', totalCount, 3)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg font-mono font-semibold"
              >
                ×3
              </button>
              <button
                onClick={() => {
                  setCalcOperandA(null);
                  setCalcHistoryExpr('');
                }}
                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg font-semibold"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Challenge / Target Game Mode */}
      {mode === 'game' && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-bold text-slate-200">Finger Target Challenge</span>
            </div>
            <div className="text-xs font-mono font-bold text-slate-400">Time: {game.timeLeft}s</div>
          </div>

          {game.active ? (
            <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl border border-amber-500/30 text-center">
              <span className="text-xs text-amber-400 uppercase tracking-widest font-bold mb-1">TARGET TO SHOW</span>
              <div className="text-4xl font-extrabold text-white font-mono my-2 animate-bounce">
                {game.targetFingers} FINGERS
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 mt-1">
                <span>Score: <strong className="text-amber-300 font-mono text-sm">{game.score}</strong></span>
                <span>Streak: <strong className="text-emerald-400 font-mono text-sm">{game.streak}</strong></span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-300">
                Show target finger count to earn points before time runs out!
              </div>
              <button
                onClick={() =>
                  setGame({
                    targetFingers: Math.floor(Math.random() * 5) + 1,
                    score: 0,
                    streak: 0,
                    timeLeft: 30,
                    active: true,
                  })
                }
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md transition-all"
              >
                Start Challenge
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual Add / Override Buttons for Convenience */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
        <span className="text-slate-400">Manual Quick Add:</span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              onClick={() => {
                triggerAudio('add');
                onCommitCount(num, `Manual +${num}`, handedness);
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-mono font-semibold transition-all"
            >
              +{num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
