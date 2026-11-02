import React, { useState, useEffect, useRef } from 'react';
import { Balloon, CursorFeedbackState, Point2D, QuickMathQuestion } from '../types';
import { toBengaliNumber } from '../utils/numberConverter';
import { sound } from '../utils/sound';
import { PlayerProfile, saveGameScore } from '../utils/storage';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle, 
  Clock, 
  Award, 
  AlertCircle, 
  Trophy, 
  AlertTriangle,
  Star 
} from 'lucide-react';

interface Game3Props {
  cursorPos: Point2D;
  isPinching: boolean;
  isHandPresent: boolean;
  setCursorFeedback: (state: CursorFeedbackState) => void;
  currentPlayer: PlayerProfile | null;
  onOpenDashboard: () => void;
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
      { label: '৬', value: 6, isCorrect: false },
      { label: '৭', value: 7, isCorrect: false },
    ],
  },
  {
    id: 5,
    questionText: '৯ + ৯ = ?',
    correctValue: 18,
    options: [
      { label: '১৭', value: 17, isCorrect: false },
      { label: '১৯', value: 19, isCorrect: false },
      { label: '১৮', value: 18, isCorrect: true },
      { label: '১৬', value: 16, isCorrect: false },
    ],
  },
  {
    id: 6,
    questionText: '৫০ - ২৫ = ?',
    correctValue: 25,
    options: [
      { label: '২০', value: 20, isCorrect: false },
      { label: '২৫', value: 25, isCorrect: true },
      { label: '৩০', value: 30, isCorrect: false },
      { label: '৩৫', value: 35, isCorrect: false },
    ],
  },
  {
    id: 7,
    questionText: '৭ × ৮ = ?',
    correctValue: 56,
    options: [
      { label: '৫৬', value: 56, isCorrect: true },
      { label: '৪৮', value: 48, isCorrect: false },
      { label: '৫৪', value: 54, isCorrect: false },
      { label: '৬২', value: 62, isCorrect: false },
    ],
  },
  {
    id: 8,
    questionText: '৮১ ÷ ৯ = ?',
    correctValue: 9,
    options: [
      { label: '৭', value: 7, isCorrect: false },
      { label: '৮', value: 8, isCorrect: false },
      { label: '৯', value: 9, isCorrect: true },
      { label: '১০', value: 10, isCorrect: false },
    ],
  },
  {
    id: 9,
    questionText: '১২ + ১৩ = ?',
    correctValue: 25,
    options: [
      { label: '২৪', value: 24, isCorrect: false },
      { label: '২৬', value: 26, isCorrect: false },
      { label: '২৩', value: 23, isCorrect: false },
      { label: '২৫', value: 25, isCorrect: true },
    ],
  },
  {
    id: 10,
    questionText: '১০০ - ৩৪ = ?',
    correctValue: 66,
    options: [
      { label: '৬৬', value: 66, isCorrect: true },
      { label: '৭৬', value: 76, isCorrect: false },
      { label: '৬৪', value: 64, isCorrect: false },
      { label: '৫৬', value: 56, isCorrect: false },
    ],
  },
];

export const Game3QuickMath: React.FC<Game3Props> = ({
  cursorPos,
  isPinching,
  isHandPresent,
  setCursorFeedback,
  currentPlayer,
  onOpenDashboard,
}) => {
  const [gameState, setGameState] = useState<'start' | 'instructions' | 'playing' | 'victory'>('start');
  const [questionIdx, setQuestionIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [wrongAttempts, setWrongAttempts] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [showWrongBanner, setShowWrongBanner] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);
  const instructionBtnRef = useRef<HTMLButtonElement | null>(null);

  const balloonsRef = useRef(balloons);
  balloonsRef.current = balloons;

  const isProcessingPickRef = useRef(false);

  const lastFeedbackRef = useRef<CursorFeedbackState>('normal');
  const updateCursorFeedback = (state: CursorFeedbackState) => {
    if (lastFeedbackRef.current !== state) {
      lastFeedbackRef.current = state;
      setCursorFeedback(state);
    }
  };

  // Initialize Balloons for each question
  const initBalloons = (qIdx: number) => {
    const q = QUESTIONS_DATA[qIdx];
    const positions = [
      { x: 22, y: 35 },
      { x: 42, y: 55 },
      { x: 62, y: 35 },
      { x: 80, y: 55 },
    ];

    const newBalloons: Balloon[] = q.options.map((opt, idx) => ({
      id: `balloon-${qIdx}-${idx}-${opt.value}`,
      label: opt.label,
      value: opt.value,
      isCorrect: opt.isCorrect,
      x: positions[idx % 4].x,
      y: positions[idx % 4].y,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      color: BALLOON_COLORS[idx % BALLOON_COLORS.length],
      isPopping: false,
    }));

    setBalloons(newBalloons);
    setTimeLeft(20);
    setShowWrongBanner(false);
    isProcessingPickRef.current = false;
  };

  useEffect(() => {
    initBalloons(questionIdx);
  }, [questionIdx]);

  // Floating physics animation
  useEffect(() => {
    if (gameState !== 'playing') return;

    let animId: number;
    const updatePhysics = () => {
      setBalloons((prev) =>
        prev.map((b) => {
          if (b.isPopping) return b;
          let nx = b.x + b.vx;
          let ny = b.y + b.vy;
          let nvx = b.vx;
          let nvy = b.vy;

          if (nx < 15 || nx > 85) nvx *= -1;
          if (ny < 22 || ny > 75) nvy *= -1;

          return { ...b, x: nx, y: ny, vx: nvx, vy: nvy };
        })
      );
      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  // Question Timer Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          sound.playWrong();
          setWrongAttempts((w) => w + 1);
          setShowWrongBanner(true);
          initBalloons(questionIdx);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, questionIdx]);

  // Pick Balloon (works via click or AR pinch)
  const handlePickBalloon = (picked: Balloon) => {
    if (picked.isPopping || isProcessingPickRef.current) return;
    isProcessingPickRef.current = true;

    if (picked.isCorrect) {
      sound.playSuccess();
      updateCursorFeedback('success');
      const nextScore = score + 10;
      setScore(nextScore);

      setTimeout(() => {
        if (questionIdx < QUESTIONS_DATA.length - 1) {
          setQuestionIdx((q) => q + 1);
        } else {
          // Finished all 10 questions!
          sound.playVictory();
          if (currentPlayer) {
            saveGameScore({
              player: currentPlayer,
              gameType: 'quickmath',
              gameTitle: 'গেম ৩: দ্রুত গণনা',
              score: nextScore,
              mistakes: wrongAttempts,
            });
          }
          setGameState('victory');
        }
      }, 700);
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
      isProcessingPickRef.current = false;
    }
  };

  // Pinch / Gesture Detection Loop
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
    let minBalloonDist = Infinity;
    const currentBalloons = balloonsRef.current;

    currentBalloons.forEach((b) => {
      if (b.isPopping) return;
      const bPixelX = (b.x / 100) * containerRect.width;
      const bPixelY = (b.y / 100) * containerRect.height;
      const distPx = Math.hypot(curX - bPixelX, curY - bPixelY);
      if (distPx < 85 && distPx < minBalloonDist) {
        minBalloonDist = distPx;
        hoveredBalloon = b;
      }
    });

    if (hoveredBalloon) {
      if (isPinching && !isProcessingPickRef.current) {
        handlePickBalloon(hoveredBalloon as Balloon);
      } else {
        updateCursorFeedback('hover');
      }
    } else {
      updateCursorFeedback(isPinching ? 'miss' : 'normal');
    }
  }, [cursorPos.x, cursorPos.y, isPinching, gameState, questionIdx, score, wrongAttempts, currentPlayer]);

  const currentQ = QUESTIONS_DATA[questionIdx];
  const accuracyPercent = Math.max(0, Math.min(100, Math.round(100 - wrongAttempts * 10)));

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col justify-between p-4 md:p-6 font-['Hind_Siliguri',sans-serif] select-none overflow-hidden">
      {/* START SCREEN */}
      {gameState === 'start' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-lg w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 p-0.5 mx-auto shadow-lg shadow-amber-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-black text-white">গেম ৩: AR দ্রুত গণনা</h2>
              <p className="text-sm text-slate-300">
                ১০টি দ্রুত গণিতের প্রশ্নের সঠিক ভাসমান বেলুনটি Pinch বা ক্লিক করে বেছে নিন!
              </p>
              {currentPlayer && (
                <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                  <span>খেলোয়াড়: {currentPlayer.avatar} {currentPlayer.name}</span>
                </div>
              )}
            </div>

            <button
              ref={startBtnRef}
              onClick={() => {
                sound.playPinch();
                setGameState('instructions');
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-500 hover:opacity-95 text-white font-bold text-lg shadow-xl shadow-amber-500/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>গেমে প্রবেশ করুন (Start)</span>
            </button>
          </div>
        </div>
      )}

      {/* INSTRUCTION SCREEN */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-xl">
          <div className="max-w-xl w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <HelpCircle className="w-4 h-4" />
              <span>নিয়মাবলী</span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-slate-100">দ্রুত গণনা গেম নির্দেশাবলী</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-sm text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="font-bold text-amber-300">১. বেলুন ফাটানো/বাছাই</div>
                <p className="text-xs text-slate-400">
                  ভাসমান ৪টি বেলুনের মধ্যে সঠিক উত্তরের বেলুনটিতে ক্লিক করুন অথবা হাত দিয়ে Pinch করুন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="font-bold text-rose-300">২. পয়েন্ট ও নির্ভুলতা</div>
                <p className="text-xs text-slate-400">
                  প্রতি সঠিক উত্তরে +১০ পয়েন্ট পাবেন। ভুল উত্তর দিলে ভুল সংখ্যা গণনা হবে এবং লিডারবোর্ডে স্কোর যুক্ত হবে।
                </p>
              </div>
            </div>

            <button
              ref={instructionBtnRef}
              onClick={() => {
                sound.playPinch();
                setGameState('playing');
              }}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-lg shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] border border-emerald-300/40"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>গেম শুরু করুন!</span>
            </button>
          </div>
        </div>
      )}

      {/* TOP STATUS HEADER */}
      {gameState === 'playing' && (
        <div className="flex items-center justify-between gap-4 z-10 bg-slate-900/70 backdrop-blur-md p-3 md:p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
              প্রশ্ন {toBengaliNumber(questionIdx + 1)} / {toBengaliNumber(10)}
            </span>
            <div className="text-base md:text-xl font-bold text-slate-100">
              <span className="text-amber-300">{currentQ.questionText}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs md:text-sm font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>সময়: <span className="text-amber-400 font-bold">{toBengaliNumber(timeLeft)}সে</span></span>
            </div>

            <div className="text-xs md:text-sm font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              স্কোর: <span className="text-amber-400 font-bold">{toBengaliNumber(score)}</span>
            </div>

            <div className="text-xs md:text-sm font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              ভুল: <span className={`font-bold ${wrongAttempts === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{toBengaliNumber(wrongAttempts)}</span>
            </div>
          </div>
        </div>
      )}

      {/* WRONG ANSWER BANNER */}
      {gameState === 'playing' && showWrongBanner && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-6 py-2 rounded-2xl bg-rose-500/30 border border-rose-500/50 text-rose-200 backdrop-blur-md shadow-xl text-sm font-bold flex items-center gap-2 animate-bounce">
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
                  <div className="w-16 h-16 rounded-full bg-rose-500 animate-ping opacity-75" />
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
                onClick={() => handlePickBalloon(b)}
                className={`absolute z-20 w-20 h-28 md:w-24 md:h-32 rounded-[50%_50%_50%_50%/40%_40%_60%_60%] bg-gradient-to-tr ${b.color} shadow-2xl p-1 flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-transform`}
              >
                <div className="relative w-full h-full rounded-[50%] flex items-center justify-center border border-white/30">
                  <span className="text-2xl md:text-3xl font-black text-white drop-shadow-md">
                    {toBengaliNumber(b.label)}
                  </span>
                </div>
                <div className="w-2 h-3 bg-amber-700/60 rounded-sm -mt-0.5"></div>
              </div>
            );
          })}
        </div>
      )}

      {/* VICTORY FINISH SCREEN WITH PERFORMANCE REPORT */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
          <div className="max-w-lg w-full bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-400 p-0.5 mx-auto shadow-2xl shadow-amber-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
                <Award className="w-10 h-10 text-amber-400 animate-bounce" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-black text-amber-400">অভিনন্দন! গেম সম্পন্ন</h2>
              <p className="text-slate-300 text-xs md:text-sm">
                {currentPlayer?.name ? `${currentPlayer.name}, আপনার ফলাফল নিচে দেওয়া হলো:` : 'আপনার গেমের ফলাফল:'}
              </p>
            </div>

            {/* Stars rating */}
            <div className="flex items-center justify-center gap-1.5 text-amber-400">
              <Star className="w-6 h-6 fill-current animate-pulse" />
              <Star className={`w-6 h-6 ${wrongAttempts <= 3 ? 'fill-current animate-pulse' : 'text-slate-600'}`} />
              <Star className={`w-6 h-6 ${wrongAttempts === 0 ? 'fill-current animate-pulse' : 'text-slate-600'}`} />
            </div>

            {/* Performance Report */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>চূড়ান্ত স্কোর</span>
                </div>
                <div className="text-2xl font-black text-amber-400 mt-1">{toBengaliNumber(score)}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>ভুলের সংখ্যা</span>
                </div>
                <div className={`text-2xl font-black mt-1 ${wrongAttempts === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {toBengaliNumber(wrongAttempts)} বার
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>নির্ভুলতার হার</span>
                </div>
                <div className="text-xl font-extrabold text-emerald-400 mt-1">
                  {toBengaliNumber(accuracyPercent)}%
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>খেলোয়াড়</span>
                </div>
                <div className="text-base font-bold text-slate-200 mt-1 truncate flex items-center gap-1.5">
                  <span>{currentPlayer?.avatar || '🚀'}</span>
                  <span className="truncate">{currentPlayer?.name || 'শিক্ষার্থী'}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5 bg-emerald-500/10 py-1.5 px-3 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              <span>আপনার ফলাফল ড্যাশবোর্ড ও র‍্যাংকিংয়ে সংরক্ষণ করা হয়েছে!</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={() => {
                  sound.playPinch();
                  onOpenDashboard();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01]"
              >
                <Trophy className="w-4 h-4" />
                <span>ড্যাশবোর্ড ও র‍্যাংকিং দেখুন</span>
              </button>

              <button
                onClick={() => {
                  sound.playPinch();
                  setQuestionIdx(0);
                  setScore(0);
                  setWrongAttempts(0);
                  setGameState('playing');
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>পুনরায় চেষ্টা করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
