import React, { useState, useEffect, useRef } from 'react';
import { CursorFeedbackState, Point2D } from '../types';
import { toBengaliNumber } from '../utils/numberConverter';
import { sound } from '../utils/sound';
import { Play, RotateCcw, CheckCircle2, Sparkles, HelpCircle, ArrowRight, Award } from 'lucide-react';

interface Game1Props {
  cursorPos: Point2D;
  isPinching: boolean;
  isHandPresent: boolean;
  setCursorFeedback: (state: CursorFeedbackState) => void;
}

interface EquationCard {
  id: string;
  value: string; // "1", "+", "1", "=", "2"
  displayVal: string; // "১", "+", "১", "=", "২"
  x: number; // percentage or px
  y: number;
  initialX: number;
  initialY: number;
  isPlaced: boolean;
  placedSlot: number | null; // 0 to 4
  color: string;
}

const LEVEL_DATA = [
  {
    id: 1,
    title: 'লেভেল ১',
    questionText: '১ + ১ = ২',
    cards: ['1', '+', '1', '=', '2'],
    expected: ['1', '+', '1', '=', '2'],
  },
  {
    id: 2,
    title: 'লেভেল ২',
    questionText: '৯ + ১১ = ২০',
    cards: ['20', '=', '11', '+', '9'],
    expected: ['9', '+', '11', '=', '20'],
  },
  {
    id: 3,
    title: 'লেভেল ৩',
    questionText: '১২ - ৫ = ৭',
    cards: ['5', '12', '=', '7', '-'],
    expected: ['12', '-', '5', '=', '7'],
  },
];

const CARD_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-indigo-500',
  'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-emerald-500 to-teal-500',
];

export const Game1EquationArrangement: React.FC<Game1Props> = ({
  cursorPos,
  isPinching,
  isHandPresent,
  setCursorFeedback,
}) => {
  const [gameState, setGameState] = useState<'start' | 'instructions' | 'playing' | 'level_complete' | 'victory'>('start');
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);

  const [cards, setCards] = useState<EquationCard[]>([]);
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  
  const [isErrorState, setIsErrorState] = useState<boolean>(false);
  const [isSuccessState, setIsSuccessState] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);
  const instructionBtnRef = useRef<HTMLButtonElement | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);

  // Sync cards state with ref to avoid dependency loop in useEffect
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  // Deduplicate cursor feedback state updates to parent
  const lastFeedbackRef = useRef<CursorFeedbackState>('normal');
  const updateCursorFeedback = (state: CursorFeedbackState) => {
    if (lastFeedbackRef.current !== state) {
      lastFeedbackRef.current = state;
      setCursorFeedback(state);
    }
  };

  // Initialize level
  const initLevel = (levelIdx: number) => {
    const level = LEVEL_DATA[levelIdx];
    const initialCards: EquationCard[] = level.cards.map((val, idx) => {
      // Calculate layout positions
      const posX = 15 + (idx % 5) * 18; // percent
      const posY = 32; // percent
      return {
        id: `card-${levelIdx}-${idx}-${val}`,
        value: val,
        displayVal: toBengaliNumber(val),
        x: posX,
        y: posY,
        initialX: posX,
        initialY: posY,
        isPlaced: false,
        placedSlot: null,
        color: CARD_COLORS[idx % CARD_COLORS.length],
      };
    });

    setCards(initialCards);
    setSlots([null, null, null, null, null]);
    setIsErrorState(false);
    setIsSuccessState(false);
    setDraggedCardId(null);
  };

  useEffect(() => {
    initLevel(currentLevelIdx);
  }, [currentLevelIdx]);

  // Handle Pinch interactions and Dragging in game canvas
  useEffect(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const curX = cursorPos.x;
    const curY = cursorPos.y;

    // Check Start Button hover / pinch
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

    // Check Instruction Screen Green Button hover / pinch
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

    // Convert cursor coords to percentages of container
    const cXPercent = (curX / containerRect.width) * 100;
    const cYPercent = (curY / containerRect.height) * 100;

    const currentCards = cardsRef.current;

    // IF DRAGGING
    if (draggedCardId && isPinching) {
      updateCursorFeedback('success');
      setCards((prevCards) => {
        const target = prevCards.find((c) => c.id === draggedCardId);
        if (target && Math.abs(target.x - cXPercent) < 0.01 && Math.abs(target.y - cYPercent) < 0.01) {
          return prevCards;
        }
        return prevCards.map((card) => {
          if (card.id === draggedCardId) {
            return {
              ...card,
              x: cXPercent,
              y: cYPercent,
            };
          }
          return card;
        });
      });
      return;
    }

    // RELEASED DRAGGED CARD
    if (draggedCardId && !isPinching) {
      const cardToDrop = currentCards.find((c) => c.id === draggedCardId);
      let droppedInSlot = -1;
      let targetSlotXPercent = 0;
      let targetSlotYPercent = 0;

      if (cardToDrop && containerRef.current) {
        const cursorClientX = containerRect.left + curX;
        const cursorClientY = containerRect.top + curY;

        let bestSlotIdx = -1;
        let minDistPx = Infinity;

        for (let i = 0; i < 5; i++) {
          const slotEl = slotRefs.current[i];
          if (slotEl) {
            const slotRect = slotEl.getBoundingClientRect();
            const slotCenterX = slotRect.left + slotRect.width / 2;
            const slotCenterY = slotRect.top + slotRect.height / 2;

            const slotXPercent = ((slotCenterX - containerRect.left) / containerRect.width) * 100;
            const slotYPercent = ((slotCenterY - containerRect.top) / containerRect.height) * 100;

            const distPx = Math.hypot(cursorClientX - slotCenterX, cursorClientY - slotCenterY);

            const inBoundingBoxPadded =
              cursorClientX >= slotRect.left - 25 &&
              cursorClientX <= slotRect.right + 25 &&
              cursorClientY >= slotRect.top - 25 &&
              cursorClientY <= slotRect.bottom + 25;

            if ((inBoundingBoxPadded || distPx < 100) && distPx < minDistPx) {
              minDistPx = distPx;
              bestSlotIdx = i;
              targetSlotXPercent = slotXPercent;
              targetSlotYPercent = slotYPercent;
            }
          }
        }

        if (bestSlotIdx !== -1) {
          droppedInSlot = bestSlotIdx;
        }

        if (droppedInSlot !== -1) {
          sound.playRelease();
          const existingCard = currentCards.find((c) => c.placedSlot === droppedInSlot && c.id !== cardToDrop.id);

          setSlots((prevSlots) => {
            const nextSlots = [...prevSlots];
            nextSlots[droppedInSlot] = cardToDrop.value;
            return nextSlots;
          });

          setCards((prevCards) =>
            prevCards.map((c) => {
              if (c.id === cardToDrop.id) {
                return {
                  ...c,
                  isPlaced: true,
                  placedSlot: droppedInSlot,
                  x: targetSlotXPercent,
                  y: targetSlotYPercent,
                };
              }
              if (existingCard && c.id === existingCard.id) {
                return { ...c, isPlaced: false, placedSlot: null, x: c.initialX, y: c.initialY };
              }
              return c;
            })
          );
        } else {
          setCards((prevCards) =>
            prevCards.map((c) =>
              c.id === cardToDrop.id
                ? {
                    ...c,
                    isPlaced: false,
                    placedSlot: null,
                    x: c.initialX,
                    y: c.initialY,
                  }
                : c
            )
          );
        }
      }

      setDraggedCardId(null);
      updateCursorFeedback('normal');
      return;
    }

    // CHECK HOVER OVER CARDS
    let hoveringCard: EquationCard | null = null;
    let minCardDist = Infinity;

    currentCards.forEach((card) => {
      const dist = Math.hypot(cXPercent - card.x, cYPercent - card.y);
      if (dist < 12 && dist < minCardDist) {
        minCardDist = dist;
        hoveringCard = card;
      }
    });

    if (hoveringCard) {
      if (isPinching) {
        const cardObj = hoveringCard as EquationCard;
        setDraggedCardId(cardObj.id);
        if (cardObj.placedSlot !== null) {
          setSlots((prev) => {
            const copy = [...prev];
            copy[cardObj.placedSlot!] = null;
            return copy;
          });
        }
        updateCursorFeedback('success');
      } else {
        updateCursorFeedback('hover');
      }
    } else {
      updateCursorFeedback(isPinching ? 'miss' : 'normal');
    }
  }, [cursorPos.x, cursorPos.y, isPinching, gameState, draggedCardId]);

  // Check equation validation when all 5 slots are populated
  useEffect(() => {
    if (gameState !== 'playing' || isSuccessState || isErrorState) return;

    const isFull = slots.every((s) => s !== null);
    if (!isFull) return;

    let isValid = false;
    const expr = `${slots[0]} ${slots[1]} ${slots[2]}`;
    try {
      if (slots[3] === '=') {
        const leftSide = eval(expr.replace(/×/g, '*').replace(/÷/g, '/'));
        const rightSide = eval(slots[4]!);
        if (leftSide === rightSide) {
          isValid = true;
        }
      }
    } catch (e) {
      isValid = false;
    }

    if (isValid) {
      setIsSuccessState(true);
      sound.playSuccess();
      updateCursorFeedback('success');
      setScore((s) => s + 100);

      setTimeout(() => {
        if (currentLevelIdx < LEVEL_DATA.length - 1) {
          setCurrentLevelIdx((idx) => idx + 1);
        } else {
          setGameState('victory');
          sound.playVictory();
        }
      }, 1500);
    } else {
      setIsErrorState(true);
      sound.playWrong();
      updateCursorFeedback('miss');

      setTimeout(() => {
        setIsErrorState(false);
        setSlots([null, null, null, null, null]);
        setCards((prev) =>
          prev.map((c) => ({
            ...c,
            isPlaced: false,
            placedSlot: null,
            x: c.initialX,
            y: c.initialY,
          }))
        );
      }, 1200);
    }
  }, [slots, gameState, isSuccessState, isErrorState, currentLevelIdx]);

  // Manual Reset Handler
  const handleReset = () => {
    sound.playRelease();
    setSlots([null, null, null, null, null]);
    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        isPlaced: false,
        placedSlot: null,
        x: c.initialX,
        y: c.initialY,
      }))
    );
  };

  const currentLevel = LEVEL_DATA[currentLevelIdx];

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col justify-between p-6">
      {/* START SCREEN */}
      {gameState === 'start' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl">
          <div className="max-w-lg w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 p-0.5 mx-auto shadow-lg shadow-blue-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">গেম ১: AR সমীকরণ সাজাও</h2>
              <p className="text-sm text-slate-300">
                ভাসমান সংখ্যা ও চিহ্ন ধরে সঠিক সমীকরণ তৈরি করার মজার গণিত চ্যালেঞ্জ!
              </p>
            </div>

            <button
              ref={startBtnRef}
              onClick={() => {
                sound.playPinch();
                setGameState('instructions');
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-lg shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>গেমে প্রবেশ করুন (Start)</span>
            </button>
          </div>
        </div>
      )}

      {/* INSTRUCTION SCREEN WITH FLOATING GREEN BUTTON */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-xl w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <HelpCircle className="w-4 h-4" />
              <span>কীভাবে খেলবেন?</span>
            </div>

            <h2 className="text-xl font-bold text-slate-100">গেমের নির্দেশাবলী</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-sm text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="font-bold text-cyan-300 flex items-center gap-2">
                  <span>১. AR হাত স্পর্শ (Pinch)</span>
                </div>
                <p className="text-xs text-slate-400">
                  বুড়ো আঙুল ও তর্জনী একসাথে চিমটি (Pinch) দিয়ে কার্ডটি ধরুন এবং নিচে Slot-এ এনে ছেড়ে দিন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <span>২. মাউস / টাচ অপশন</span>
                </div>
                <p className="text-xs text-slate-400">
                  ক্যামেরা না থাকলে মাউস ক্লিক বা টাচ দিয়ে টেনে (Drag & Drop) কার্ডগুলো বসান।
                </p>
              </div>
            </div>

            {/* FLOATING GREEN BUTTON AS SPECIFIED */}
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

      {/* TOP HEADER: BANGLA QUESTION & SCORE */}
      {gameState === 'playing' && (
        <div className="flex items-center justify-between gap-4 z-10 bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
              {currentLevel.title}
            </span>
            <div className="text-sm md:text-base font-medium text-slate-200">
              প্রশ্ন: <span className="font-bold text-cyan-300 text-lg">{currentLevel.questionText}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm font-semibold text-slate-300 bg-slate-800/80 px-4 py-1.5 rounded-xl border border-slate-700">
              স্কোর: <span className="text-amber-400 font-bold text-base">{toBengaliNumber(score)}</span>
            </div>

            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all"
              title="পুনরায় সাজান"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">রিসেট</span>
            </button>
          </div>
        </div>
      )}

      {/* PLAYING CANVAS AREA WITH FLOATING NUMBER CARDS AND 5 SLOTS */}
      {gameState === 'playing' && (
        <div className="relative w-full flex-1 my-2">
          {/* FLOATING 2D NUMBER CARDS */}
          {cards.map((card) => (
            <div
              key={card.id}
              style={{
                left: `${card.x}%`,
                top: `${card.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute cursor-grab active:cursor-grabbing z-20 w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-gradient-to-br ${card.color} p-0.5 shadow-xl transition-transform ${
                draggedCardId === card.id ? 'scale-110 shadow-2xl ring-4 ring-cyan-300' : 'hover:scale-105'
              }`}
            >
              <div className="w-full h-full bg-slate-900/90 backdrop-blur-md rounded-[14px] flex items-center justify-center border border-white/20">
                <span className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-md">
                  {card.displayVal}
                </span>
              </div>
            </div>
          ))}

          {/* 5 BOTTOM SLOTS FOR EQUATION ARRANGEMENT */}
          <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center items-center gap-3 md:gap-5 px-4">
            {[0, 1, 2, 3, 4].map((slotIdx) => {
              const placedVal = slots[slotIdx];
              return (
                <div
                  key={`slot-${slotIdx}`}
                  ref={(el) => {
                    slotRefs.current[slotIdx] = el;
                  }}
                  className={`w-16 h-20 md:w-20 md:h-24 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all ${
                    isSuccessState
                      ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20'
                      : isErrorState
                      ? 'border-rose-500 bg-rose-500/20 animate-bounce'
                      : placedVal
                      ? 'border-blue-400 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-900/60 backdrop-blur-sm'
                  }`}
                >
                  {placedVal ? (
                    <span className="text-2xl md:text-3xl font-extrabold text-slate-100">
                      {toBengaliNumber(placedVal)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600 font-bold">ঘর {toBengaliNumber(slotIdx + 1)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VICTORY FINISH SCREEN */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-xl">
          <div className="max-w-md w-full bg-slate-900/95 border border-slate-700/80 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 mx-auto shadow-2xl shadow-emerald-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
                <Award className="w-10 h-10 text-emerald-400 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-emerald-400">সফল!</h2>
              <p className="text-slate-300 text-sm">
                অভিনন্দন! আপনি সমীকরণ সাজানোর সবকটি লেভেল সফলভাবে সম্পন্ন করেছেন।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60">
              <div className="text-xs text-slate-400">সর্বমোট অর্জিত স্কোর</div>
              <div className="text-3xl font-extrabold text-amber-400 mt-1">{toBengaliNumber(score)}</div>
            </div>

            <button
              onClick={() => {
                setCurrentLevelIdx(0);
                setScore(0);
                setGameState('playing');
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-lg shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              <span>আবার খেলুন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
