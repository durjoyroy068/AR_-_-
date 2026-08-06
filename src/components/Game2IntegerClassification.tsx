import React, { useState, useEffect, useRef } from 'react';
import { CursorFeedbackState, IntegerCategory, Point2D } from '../types';
import { toBengaliNumber, formatTime } from '../utils/numberConverter';
import { sound } from '../utils/sound';
import { Play, RotateCcw, CheckCircle2, Sparkles, HelpCircle, Clock, Award } from 'lucide-react';

interface Game2Props {
  cursorPos: Point2D;
  isPinching: boolean;
  isHandPresent: boolean;
  setCursorFeedback: (state: CursorFeedbackState) => void;
}

interface ItemCard {
  id: string;
  label: string; // e.g., "2/2", "|-100|"
  displayLabel: string;
  category: IntegerCategory;
  x: number;
  y: number;
  initialX: number;
  initialY: number;
  isPlaced: boolean;
  placedSlot: IntegerCategory | null;
}

const LEVEL_DATA = [
  {
    id: 1,
    title: 'লেভেল ১',
    items: [
      { label: '1', numericVal: 1, category: 'positive' as IntegerCategory },
      { label: '-2', numericVal: -2, category: 'negative' as IntegerCategory },
      { label: '0', numericVal: 0, category: 'zero' as IntegerCategory },
      { label: '4', numericVal: 4, category: 'positive' as IntegerCategory },
      { label: '-7', numericVal: -7, category: 'negative' as IntegerCategory },
    ],
  },
  {
    id: 2,
    title: 'লেভেল ২',
    items: [
      { label: '2/2', numericVal: 1, category: 'positive' as IntegerCategory },
      { label: '-10/5', numericVal: -2, category: 'negative' as IntegerCategory },
      { label: '0.0', numericVal: 0, category: 'zero' as IntegerCategory },
      { label: '19', numericVal: 19, category: 'positive' as IntegerCategory },
      { label: '-108', numericVal: -108, category: 'negative' as IntegerCategory },
    ],
  },
  {
    id: 3,
    title: 'লেভেল ৩',
    items: [
      { label: '-19.0', numericVal: -19, category: 'negative' as IntegerCategory },
      { label: '20/2', numericVal: 10, category: 'positive' as IntegerCategory },
      { label: '0/1', numericVal: 0, category: 'zero' as IntegerCategory },
      { label: '|-100|', numericVal: 100, category: 'positive' as IntegerCategory },
      { label: '-45', numericVal: -45, category: 'negative' as IntegerCategory },
    ],
  },
];

const SLOT_CONFIG = [
  {
    id: 'negative' as IntegerCategory,
    title: 'ঋণাত্মক পূর্ণসংখ্যা',
    color: 'from-rose-500/20 to-pink-500/10 border-rose-500/40 text-rose-300',
    hoverBorder: 'border-rose-400 bg-rose-500/30',
  },
  {
    id: 'zero' as IntegerCategory,
    title: 'শূন্য',
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/40 text-amber-300',
    hoverBorder: 'border-amber-400 bg-amber-500/30',
  },
  {
    id: 'positive' as IntegerCategory,
    title: 'ধনাত্মক পূর্ণসংখ্যা',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300',
    hoverBorder: 'border-emerald-400 bg-emerald-500/30',
  },
];

export const Game2IntegerClassification: React.FC<Game2Props> = ({
  cursorPos,
  isPinching,
  isHandPresent,
  setCursorFeedback,
}) => {
  const [gameState, setGameState] = useState<'start' | 'instructions' | 'playing' | 'victory'>('start');
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);

  const [cards, setCards] = useState<ItemCard[]>([]);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [activeSlotHover, setActiveSlotHover] = useState<IntegerCategory | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);
  const instructionBtnRef = useRef<HTMLButtonElement | null>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const isLevelClearingRef = useRef(false);

  // Initialize level
  const initLevel = (levelIdx: number) => {
    const level = LEVEL_DATA[levelIdx];
    const initialCards: ItemCard[] = level.items.map((item, idx) => {
      const posX = 15 + (idx % 5) * 18;
      const posY = 30;
      return {
        id: `card-g2-${levelIdx}-${idx}-${item.label}`,
        label: item.label,
        displayLabel: toBengaliNumber(item.label),
        category: item.category,
        x: posX,
        y: posY,
        initialX: posX,
        initialY: posY,
        isPlaced: false,
        placedSlot: null,
      };
    });

    setCards(initialCards);
    setTimeLeft(60);
    setDraggedCardId(null);
    setActiveSlotHover(null);
    isLevelClearingRef.current = false;
  };

  useEffect(() => {
    initLevel(currentLevelIdx);
  }, [currentLevelIdx]);

  // Timer loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          sound.playWrong();
          initLevel(currentLevelIdx);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, currentLevelIdx]);

  // Handle Pinch and Drag interactions
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

      // Check slot hover (Bottom 3 slots)
      let currentSlot: IntegerCategory | null = null;
      if (containerRef.current) {
        const cursorClientX = containerRect.left + curX;
        const cursorClientY = containerRect.top + curY;
        let minHoverDist = Infinity;

        SLOT_CONFIG.forEach((slotConfig) => {
          const slotEl = slotRefs.current[slotConfig.id];
          if (slotEl) {
            const slotRect = slotEl.getBoundingClientRect();
            const slotCenterX = slotRect.left + slotRect.width / 2;
            const slotCenterY = slotRect.top + slotRect.height / 2;
            const distPx = Math.hypot(cursorClientX - slotCenterX, cursorClientY - slotCenterY);

            const inPadded =
              cursorClientX >= slotRect.left - 25 &&
              cursorClientX <= slotRect.right + 25 &&
              cursorClientY >= slotRect.top - 25 &&
              cursorClientY <= slotRect.bottom + 25;

            if ((inPadded || distPx < 140) && distPx < minHoverDist) {
              minHoverDist = distPx;
              currentSlot = slotConfig.id;
            }
          }
        });
      }

      setActiveSlotHover(currentSlot);
      return;
    }

    // RELEASED CARD
    if (draggedCardId && !isPinching) {
      const cardToDrop = currentCards.find((c) => c.id === draggedCardId);
      if (cardToDrop && containerRef.current) {
        const cursorClientX = containerRect.left + curX;
        const cursorClientY = containerRect.top + curY;
        let droppedSlot: IntegerCategory | null = null;
        let minDropDist = Infinity;

        SLOT_CONFIG.forEach((slotConfig) => {
          const slotEl = slotRefs.current[slotConfig.id];
          if (slotEl) {
            const slotRect = slotEl.getBoundingClientRect();
            const slotCenterX = slotRect.left + slotRect.width / 2;
            const slotCenterY = slotRect.top + slotRect.height / 2;
            const distPx = Math.hypot(cursorClientX - slotCenterX, cursorClientY - slotCenterY);

            const inPadded =
              cursorClientX >= slotRect.left - 30 &&
              cursorClientX <= slotRect.right + 30 &&
              cursorClientY >= slotRect.top - 30 &&
              cursorClientY <= slotRect.bottom + 30;

            if ((inPadded || distPx < 150) && distPx < minDropDist) {
              minDropDist = distPx;
              droppedSlot = slotConfig.id;
            }
          }
        });

        if (droppedSlot && droppedSlot === cardToDrop.category) {
          sound.playSuccess();
          updateCursorFeedback('success');

          setCards((prev) =>
            prev.map((c) =>
              c.id === cardToDrop.id
                ? {
                    ...c,
                    isPlaced: true,
                    placedSlot: droppedSlot,
                  }
                : c
            )
          );
        } else if (droppedSlot) {
          sound.playWrong();
          updateCursorFeedback('wrong');

          setCards((prev) =>
            prev.map((c) =>
              c.id === cardToDrop.id
                ? {
                    ...c,
                    x: c.initialX,
                    y: c.initialY,
                  }
                : c
            )
          );
        } else {
          setCards((prev) =>
            prev.map((c) =>
              c.id === cardToDrop.id
                ? {
                    ...c,
                    x: c.initialX,
                    y: c.initialY,
                  }
                : c
            )
          );
        }
      }

      setDraggedCardId(null);
      setActiveSlotHover(null);
      return;
    }

    // CHECK HOVER OVER CARDS
    let hoveringCard: ItemCard | null = null;

    currentCards.forEach((card) => {
      if (card.isPlaced) return;
      if (Math.abs(cXPercent - card.x) < 7 && Math.abs(cYPercent - card.y) < 9) {
        hoveringCard = card;
      }
    });

    if (hoveringCard) {
      if (isPinching) {
        setDraggedCardId((hoveringCard as ItemCard).id);
        updateCursorFeedback('success');
      } else {
        updateCursorFeedback('hover');
      }
    } else {
      updateCursorFeedback(isPinching ? 'miss' : 'normal');
    }
  }, [cursorPos.x, cursorPos.y, isPinching, gameState, draggedCardId]);

  // Check if all cards in current level are correctly classified
  useEffect(() => {
    if (gameState !== 'playing' || isLevelClearingRef.current) return;

    const unplacedCards = cards.filter((c) => !c.isPlaced);
    if (unplacedCards.length === 0 && cards.length > 0) {
      isLevelClearingRef.current = true;
      const levelBonus = 100 + timeLeft * 5;
      setScore((prev) => prev + levelBonus);
      sound.playVictory();

      setTimeout(() => {
        if (currentLevelIdx < LEVEL_DATA.length - 1) {
          setCurrentLevelIdx((prev) => prev + 1);
        } else {
          setGameState('victory');
        }
      }, 1200);
    }
  }, [cards, gameState, currentLevelIdx]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col justify-between p-6">
      {/* START SCREEN */}
      {gameState === 'start' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl">
          <div className="max-w-lg w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 p-0.5 mx-auto shadow-lg shadow-pink-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-pink-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">গেম ২: পূর্ণসংখ্যা শ্রেণিবিন্যাস</h2>
              <p className="text-sm text-slate-300">
                ভাসমান সংখ্যা তুলে ঋণাত্মক, শূন্য এবং ধনাত্মক ঘরের মধ্যে সঠিক স্থানে সাজান!
              </p>
            </div>

            <button
              ref={startBtnRef}
              onClick={() => {
                sound.playPinch();
                setGameState('instructions');
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 hover:opacity-95 text-white font-bold text-lg shadow-xl shadow-pink-600/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]"
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-300 text-xs font-semibold">
              <HelpCircle className="w-4 h-4" />
              <span>নিয়মাবলী</span>
            </div>

            <h2 className="text-xl font-bold text-slate-100">শ্রেণিবিন্যাস নির্দেশাবলী</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-sm text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="font-bold text-pink-300">১. সঠিক ঘরে রাখুন</div>
                <p className="text-xs text-slate-400">
                  সংখ্যাগুলো টেনে এনে <span className="text-rose-400 font-bold">ঋণাত্মক</span>, <span className="text-amber-400 font-bold">শূন্য</span>, অথবা <span className="text-emerald-400 font-bold">ধনাত্মক</span> বক্সে রাখুন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="font-bold text-amber-300">২. সময় ও বোনাস</div>
                <p className="text-xs text-slate-400">
                  প্রতি লেভেলে ৬০ সেকেন্ড সময় থাকবে। দ্রুত শেষ করলে অতিরিক্ত সময় বোনাস পয়েন্ট পাবেন!
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

      {/* TOP HEADER STATUS */}
      {gameState === 'playing' && (
        <div className="flex items-center justify-between gap-4 z-10 bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-bold">
              {LEVEL_DATA[currentLevelIdx].title}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-sm font-semibold">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>সময়: <span className="text-amber-400 font-bold">{toBengaliNumber(timeLeft)} সেকেন্ড</span></span>
            </div>

            <div className="text-sm font-semibold text-slate-300 bg-slate-800/80 px-4 py-1.5 rounded-xl border border-slate-700">
              স্কোর: <span className="text-amber-400 font-bold">{toBengaliNumber(score)}</span>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING CARDS & 3 CATEGORY SLOTS */}
      {gameState === 'playing' && (
        <div className="relative w-full flex-1 my-2">
          {/* FLOATING NUMBER CARDS */}
          {cards.map((card) => {
            if (card.isPlaced) return null;
            return (
              <div
                key={card.id}
                style={{
                  left: `${card.x}%`,
                  top: `${card.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute cursor-grab z-20 w-16 h-20 md:w-22 md:h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-pink-500/40 p-0.5 shadow-xl transition-transform ${
                  draggedCardId === card.id ? 'scale-110 ring-4 ring-pink-400 shadow-2xl' : 'hover:scale-105'
                }`}
              >
                <div className="w-full h-full bg-slate-900/90 backdrop-blur-md rounded-[14px] flex items-center justify-center">
                  <span className="text-xl md:text-2xl font-extrabold text-pink-200">
                    {card.displayLabel}
                  </span>
                </div>
              </div>
            );
          })}

          {/* 3 LARGE SLOTS AT BOTTOM */}
          <div className="absolute bottom-4 left-0 right-0 z-10 grid grid-cols-3 gap-3 md:gap-6 px-2 md:px-6">
            {SLOT_CONFIG.map((slot) => {
              const placedItemsInSlot = cards.filter((c) => c.isPlaced && c.placedSlot === slot.id);
              const isHovered = activeSlotHover === slot.id;

              return (
                <div
                  key={slot.id}
                  ref={(el) => {
                    slotRefs.current[slot.id] = el;
                  }}
                  className={`h-36 md:h-44 rounded-3xl border-2 bg-gradient-to-b p-4 flex flex-col justify-between transition-all backdrop-blur-md shadow-xl ${
                    isHovered ? slot.hoverBorder : slot.color
                  }`}
                >
                  <div className="text-center font-bold text-xs md:text-base border-b border-white/10 pb-2">
                    {slot.title}
                  </div>

                  {/* Placed cards display chips */}
                  <div className="flex flex-wrap gap-2 justify-center items-center overflow-y-auto max-h-24 py-1">
                    {placedItemsInSlot.map((item) => (
                      <span
                        key={item.id}
                        className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs md:text-sm font-extrabold shadow-sm"
                      >
                        {item.displayLabel} ✔️
                      </span>
                    ))}
                  </div>
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
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500 to-rose-400 p-0.5 mx-auto shadow-2xl shadow-pink-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
                <Award className="w-10 h-10 text-pink-400 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-pink-400">সফল!</h2>
              <p className="text-slate-300 text-sm">
                অভিনন্দন! আপনি সকল পূর্ণসংখ্যা সঠিক বক্সে শ্রেণিবিন্যাস করেছেন।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60">
              <div className="text-xs text-slate-400">সময়-ভিত্তিক মোট অর্জিত নম্বর</div>
              <div className="text-3xl font-extrabold text-amber-400 mt-1">{toBengaliNumber(score)}</div>
            </div>

            <button
              onClick={() => {
                setCurrentLevelIdx(0);
                setScore(0);
                setGameState('playing');
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-95 text-white font-bold text-lg shadow-xl shadow-pink-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              <span>পুনরায় শুরু করুন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
