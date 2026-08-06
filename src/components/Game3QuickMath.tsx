import React, { useState, useEffect, useRef } from 'react';
import { Balloon, CursorFeedbackState, Point2D, QuickMathQuestion } from '../types';
import { toBengaliNumber } from '../utils/numberConverter';
import { sound } from '../utils/sound';
import { Play, RotateCcw, CheckCircle2, Sparkles, HelpCircle, Clock, Award, AlertCircle } from 'lucide-react';

interface Game3Props {
  cursorPos: Point2D;
  isPinching: boolean;
  isHandPresent: boolean;
  setCursorFeedback: (state: CursorFeedbackState) => void;
}

const BALLOON_COLORS = [
  'from-pink-500 to-rose-600',
  'from-blue-500 to-cyan-600',
  'from-amber-500 to-yellow-600',
  'from-purple-500 to-indigo-600',
];

const QUESTIONS_DATA: QuickMathQuestion[] = [
  {
    id: 1,
    questionText: '৫ + ৭ = ?',
    correctValue: 12,
    options: [
      { label: '১০', value: 10, isCorrect: false },
      { label: '১২', value: 12, isCorrect: true },
      { label: '১৪', value: 14, isCorrect: false },
      { label: '১১', value: 11, isCorrect: false },
    ],
  },
  {
    id: 2,
    questionText: '১৫ - ৮ = ?',
    correctValue: 7,
    options: [
      { label: '৬', value: 6, isCorrect: false },
      { label: '৯', value: 9, isCorrect: false },
      { label: '৭', value: 7, isCorrect: true },
      { label: '৮', value: 8, isCorrect: false },
    ],
  },
  {
    id: 3,
    questionText: '৬ × ৪ = ?',
    correctValue: 24,
    options: [
      { label: '২৪', value: 24, isCorrect: true },
      { label: '২০', value: 20, isCorrect: false },
      { label: '২৮', value: 28, isCorrect: false },
      { label: '২৬', value: 26, isCorrect: false },
    ],
  },
  {
    id: 4,
    questionText: '৩৬ ÷ ৪ = ?',
    correctValue: 9,
    options: [
      { label: '৮', value: 8, isCorrect: false },
      { label: '৯', value: 9, isCorrect: true },
      { label: '৭', value: 7, isCorrect: false },
      { label: '৬', value: 6, isCorrect: false },
    ],
  },
  {
    id: 5,
    questionText: '২৫ + ১৫ = ?',
    correctValue: 40,
    options: [
      { label: '৩৫', value: 35, isCorrect: false },
      { label: '৪০', value: 40, isCorrect: true },
      { label: '৪৫', value: 45, isCorrect: false },
      { label: '৫০', value: 50, isCorrect: false },
    ],
  },
  {
    id: 6,
    questionText: '৫০ - ১৮ = ?',
    correctValue: 32,
    options: [
      { label: '৩২', value: 32, isCorrect: true },
      { label: '২৮', value: 28, isCorrect: false },
      { label: '৩৪', value: 34, isCorrect: false },
      { label: '৩০', value: 30, isCorrect: false },
    ],
  },
  {
    id: 7,
    questionText: '৮ × ৭ = ?',
    correctValue: 56,
    options: [
      { label: '৫৪', value: 54, isCorrect: false },
      { label: '৫৬', value: 56, isCorrect: true },
      { label: '৬৪', value: 64, isCorrect: false },
      { label: '৪৮', value: 48, isCorrect: false },
    ],
  },
  {
    id: 8,
    questionText: '৪৮ ÷ ৬ = ?',
    correctValue: 8,
    options: [
      { label: '৭', value: 7, isCorrect: false },
      { label: '৬', value: 6, isCorrect: false },
      { label: '৮', value: 8, isCorrect: true },
      { label: '৯', value: 9, isCorrect: false },
    ],
  },
  {
    id: 9,
    questionText: '১৪ + ২৯ = ?',
    correctValue: 43,
    options: [
      { label: '৪১', value: 41, isCorrect: false },
      { label: '৪৩', value: 43, isCorrect: true },
      { label: '৪৪', value: 44, isCorrect: false },
      { label: '৪২', value: 42, isCorrect: false },
    ],
  },
  {
    id: 10,
    questionText: '১০০ - ৪৫ = ?',
    correctValue: 55,
    options: [
      { label: '৫৫', value: 55, isCorrect: true },
      { label: '৬৫', value: 65, isCorrect: false },
      { label: '৫০', value: 50, isCorrect: false },
      { label: '৪৫', value: 45, isCorrect: false },
    ],
  },
];

export const Game3QuickMath: React.FC<Game3Props> = ({
  cursorPos,
  isPinching,
  isHandPresent,
  setCursorFeedback,
}) => {
  const [gameState, setGameState] = useState<'start' | 'instructions' | 'playing' | 'victory'>('start');
  const [questionIdx, setQuestionIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [wrongAttempts, setWrongAttempts] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [showWrongBanner, setShowWrongBanner] = useState<boolean>(false);

  const [balloons, setBalloons] = useState<Balloon[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);
  const instructionBtnRef = useRef<HTMLButtonElement | null>(null);

  // Sync balloons with ref to avoid dependency loop in useEffect
  const balloonsRef = useRef(balloons);
  balloonsRef.current = balloons;

  // Deduplicate cursor feedback state updates to parent
  const lastFeedbackRef = useRef<CursorFeedbackState>('normal');
  const updateCursorFeedback = (state: CursorFeedbackState) => {
    if (lastFeedbackRef.current !== state) {
      lastFeedbackRef.current = state;
      setCursorFeedback(state);
    }
  };

  const isProcessingPickRef = useRef(false);

  useEffect(() => {
    if (!isPinching) {
      isProcessingPickRef.current = false;
    }
  }, [isPinching]);

  // Initialize Balloon Floating positions
  const initQuestion = (qIdx: number) => {
    const q = QUESTIONS_DATA[qIdx];
    const initialPositions = [
      { x: 20, y: 35, vx: 0.15, vy: -0.1 },
      { x: 70, y: 30, vx: -0.1, vy: 0.15 },
      { x: 30, y: 70, vx: 0.12, vy: -0.15 },
      { x: 75, y: 68, vx: -0.15, vy: -0.1 },
    ];

    const newBalloons: Balloon[] = q.options.map((opt, idx) => ({
      id: `balloon-${qIdx}-${idx}`,
      label: opt.label,
      value: opt.value,
      isCorrect: opt.isCorrect,
      x: initialPositions[idx].x,
      y: initialPositions[idx].y,
      vx: initialPositions[idx].vx,
      vy: initialPositions[idx].vy,
      color: BALLOON_COLORS[idx % BALLOON_COLORS.length],
      isPopping: false,
    }));

    setBalloons(newBalloons);
    setTimeLeft(20);
    setShowWrongBanner(false);
    isProcessingPickRef.current = false;
  };

  useEffect(() => {
    initQuestion(questionIdx);
  }, [questionIdx]);

  // Floating Balloon animation tick
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setBalloons((prev) =>
        prev.map((b) => {
          if (b.isPopping) return b;

          let newX = b.x + b.vx;
          let newY = b.y + b.vy;
          let newVx = b.vx;
          let newVy = b.vy;

          if (newX < 15 || newX > 85) newVx = -newVx;
          if (newY < 20 || newY > 75) newVy = -newVy;

          return {
            ...b,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
          };
        })
      );
    }, 40);

    return () => clearInterval(interval);
  }, [gameState]);

  // Question Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          sound.playWrong();
          setScore((s) => Math.max(0, s - 2));
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, questionIdx]);

  // Pinch & Balloon Pick handler
  useEffect(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const curX = cursorPos.x;
    const curY = cursorPos.y;

    if (gameState === 'start') {
      if (startBtnRef.current) {
        const btnRect = startBtnRef.current.getBoundingClientRect();
        const relativeX = curX + containerRect.left;
        const relativeY = curY + containerRect.top;

        const isHover =
          relativeX >= btnRect.left &&
          relativeX <= btnRect.right &&
          relativeY >= btnRect.top &&
          relativeY <= btnRect.bottom;

        if (isHover) {
          if (isPinching) {
            updateCursorFeedback('success');
            sound.playPinch();
            setGameState('instructions');
          } else {
            updateCursorFeedback('hover');
          }
        } else {
          updateCursorFeedback(isPinching ? 'miss' : 'normal');
        }
      }
      return;
    }

    if (gameState === 'instructions') {
      if (instructionBtnRef.current) {
        const btnRect = instructionBtnRef.current.getBoundingClientRect();
        const relativeX = curX + containerRect.left;
        const relativeY = curY + containerRect.top;

        const isHover =
          relativeX >= btnRect.left &&
          relativeX <= btnRect.right &&
          relativeY >= btnRect.top &&
          relativeY <= btnRect.bottom;

        if (isHover) {
          if (isPinching) {
            updateCursorFeedback('success');
            sound.playPinch();
            setGameState('playing');
          } else {
            updateCursorFeedback('hover');
          }
        } else {
          updateCursorFeedback(isPinching ? 'miss' : 'normal');
        }
      }
      return;
    }

    if (gameState !== 'playing') return;

    const cXPercent = (curX / containerRect.width) * 100;
    const cYPercent = (curY / containerRect.height) * 100;

    let hoveredBalloon: Balloon | null = null;
    const currentBalloons = balloonsRef.current;

    currentBalloons.forEach((b) => {
      if (b.isPopping) return;
      const dist = Math.hypot(cXPercent - b.x, cYPercent - b.y);
      if (dist < 8) {
        hoveredBalloon = b;
      }
    });

    if (hoveredBalloon) {
      if (isPinching && !isProcessingPickRef.current) {
        isProcessingPickRef.current = true;
        const picked = hoveredBalloon as Balloon;

        if (picked.isCorrect) {
          sound.playSuccess();
          updateCursorFeedback('success');
          setScore((s) => s + 10);

          setTimeout(() => {
            if (questionIdx < QUESTIONS_DATA.length - 1) {
              setQuestionIdx((q) => q + 1);
            } else {
              setGameState('victory');
              sound.playVictory();
            }
          }, 800);
        } else {
          sound.playPop();
          sound.playWrong();
          updateCursorFeedback('wrong');
          setWrongAttempts((w) => w + 1);
          setScore((s) => Math.max(0, s - 3));
          setShowWrongBanner(true);

          setBalloons((prev) =>
            prev.map((b) => (b.id === picked.id ? { ...b, isPopping: true } : b))
          );
        }
      } else {
        updateCursorFeedback('hover');
      }
    } else {
      updateCursorFeedback(isPinching ? 'miss' : 'normal');
    }
  }, [cursorPos.x, cursorPos.y, isPinching, gameState, questionIdx]);

  const currentQ = QUESTIONS_DATA[questionIdx];

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col justify-between p-6">
      {/* START SCREEN */}
      {gameState === 'start' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl">
          <div className="max-w-lg w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 p-0.5 mx-auto shadow-lg shadow-amber-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">গেম ৩: AR দ্রুত গণনা</h2>
              <p className="text-sm text-slate-300">
                ১০টি দ্রুত গণিতের প্রশ্নের সঠিক ভাসমান বেলুনটি Pinch করে বেছে নিন!
              </p>
            </div>

            <button
              ref={startBtnRef}
              onClick={() => {
                sound.playPinch();
                setGameState('instructions');
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-500 hover:opacity-95 text-white font-bold text-lg shadow-xl shadow-amber-500/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>গেমে প্রবেশ করুন (Start)</span>
            </button>
          </div>
        </div>
      )}

      {/* INSTRUCTION SCREEN */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-xl w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <HelpCircle className="w-4 h-4" />
              <span>নিয়মাবলী</span>
            </div>

            <h2 className="text-xl font-bold text-slate-100">দ্রুত গণনা গেম নির্দেশাবলী</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-sm text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="font-bold text-amber-300">১. বেলুন ফাটানো/বাছাই</div>
                <p className="text-xs text-slate-400">
                  ৪টি ভাসমান বেলুনের মধ্যে সঠিক উত্তরের বেলুনটিতে Pinch করুন। ভুল বেলুন সিলেক্ট করলে সেটি ফেটে যাবে।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="font-bold text-rose-300">২. পয়েন্ট ও সময়</div>
                <p className="text-xs text-slate-400">
                  প্রতি প্রশ্নে ২০ সেকেন্ড সময় পাবেন। ভুল উত্তর দিলে পয়েন্ট কাটা যাবে কিন্তু সঠিক না পাওয়া পর্যন্ত একই প্রশ্ন থাকবে।
                </p>
              </div>
            </div>

            {/* FLOATING GREEN BUTTON */}
            <div className="pt-2">
              <button
                ref={instructionBtnRef}
                onClick={() => {
                  sound.playPinch();
                  setGameState('playing');
                }}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-lg shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] border border-emerald-300/40"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>গেম শুরু করুন!</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP STATUS HEADER */}
      {gameState === 'playing' && (
        <div className="flex items-center justify-between gap-4 z-10 bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
              প্রশ্ন {toBengaliNumber(questionIdx + 1)} / {toBengaliNumber(10)}
            </span>
            <div className="text-lg md:text-xl font-bold text-slate-100">
              <span className="text-amber-300">{currentQ.questionText}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-sm font-semibold">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>সময়: <span className="text-amber-400 font-bold">{toBengaliNumber(timeLeft)}সে</span></span>
            </div>

            <div className="text-sm font-semibold text-slate-300 bg-slate-800/80 px-4 py-1.5 rounded-xl border border-slate-700">
              স্কোর: <span className="text-amber-400 font-bold">{toBengaliNumber(score)}</span>
            </div>
          </div>
        </div>
      )}

      {/* WRONG ANSWER BANNER */}
      {gameState === 'playing' && showWrongBanner && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 px-6 py-2 rounded-2xl bg-rose-500/30 border border-rose-500/50 text-rose-200 backdrop-blur-md shadow-xl text-sm font-bold flex items-center gap-2 animate-bounce">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>ভুল উত্তর! সঠিক উত্তরটি নির্বাচন করার চেষ্টা করুন।</span>
        </div>
      )}

      {/* FLOATING BALLOONS CANVAS AREA */}
      {gameState === 'playing' && (
        <div className="relative w-full flex-1 my-2">
          {balloons.map((b) => {
            if (b.isPopping) {
              return (
                <div
                  key={b.id}
                  style={{ left: `${b.x}%`, top: `${b.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                >
                  <div className="w-12 h-12 rounded-full bg-rose-500 animate-ping opacity-75" />
                </div>
              );
            }

            return (
              <div
                key={b.id}
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute z-20 w-20 h-28 md:w-24 md:h-32 rounded-[50%_50%_50%_50%/40%_40%_60%_60%] bg-gradient-to-tr ${b.color} shadow-2xl p-1 flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-transform animate-pulse`}
              >
                {/* Balloon shine & label */}
                <div className="relative w-full h-full rounded-[50%] flex items-center justify-center border border-white/30">
                  <span className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-md">
                    {toBengaliNumber(b.label)}
                  </span>
                </div>
                {/* Balloon string knot */}
                <div className="w-2 h-3 bg-amber-700/60 rounded-sm -mt-0.5"></div>
              </div>
            );
          })}
        </div>
      )}

      {/* VICTORY FINISH SCREEN */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-xl">
          <div className="max-w-md w-full bg-slate-900/95 border border-slate-700/80 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-400 p-0.5 mx-auto shadow-2xl shadow-amber-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
                <Award className="w-10 h-10 text-amber-400 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-amber-400">সফল!</h2>
              <p className="text-slate-300 text-sm">
                অভিনন্দন! আপনি ১০টি দ্রুত গণিতের প্রশ্নের সঠিক উত্তর দেওয়া সম্পন্ন করেছেন।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <div className="text-xs text-slate-400">চূড়ান্ত স্কোর</div>
                <div className="text-2xl font-extrabold text-amber-400 mt-0.5">{toBengaliNumber(score)}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <div className="text-xs text-slate-400">ভুলের সংখ্যা</div>
                <div className="text-2xl font-extrabold text-rose-400 mt-0.5">{toBengaliNumber(wrongAttempts)}</div>
              </div>
            </div>

            <button
              onClick={() => {
                setQuestionIdx(0);
                setScore(0);
                setWrongAttempts(0);
                setGameState('playing');
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white font-bold text-lg shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              <span>পুনরায় চেষ্টা করুন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
