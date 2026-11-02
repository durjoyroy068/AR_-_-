import React, { useState, useEffect, useRef } from 'react';
import { CursorFeedbackState, IntegerCategory, Point2D } from '../types';
import { toBengaliNumber, formatTime } from '../utils/numberConverter';
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
  Trophy, 
  AlertTriangle,
  Star 
} from 'lucide-react';

interface Game2Props {
  cursorPos: Point2D;
  isPinching: boolean;
  isHandPresent: boolean;
  setCursorFeedback: (state: CursorFeedbackState) => void;
  currentPlayer: PlayerProfile | null;
  onOpenDashboard: () => void;
}

interface ItemCard {
  id: string;
  label: string;
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
    title: 'শূন্য (০)',
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
  currentPlayer,
  onOpenDashboard,
}) => {
  const [gameState, setGameState] = useState<'start' | 'instructions' | 'playing' | 'victory'>('start');
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [mistakesCount, setMistakesCount] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);

  const [cards, setCards] = useState<ItemCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const draggedCardIdRef = useRef<string | null>(null);
  const [activeSlotHover, setActiveSlotHover] = useState<IntegerCategory | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);
  const instructionBtnRef = useRef<HTMLButtonElement | null>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

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
      const posX = 16 + (idx % 5) * 17;
      const posY = 28;
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
    setSelectedCardId(null);
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
          setMistakesCount((m) => m + 1);
          initLevel(currentLevelIdx);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, currentLevelIdx]);

  // Handle direct placement when card or category is clicked
  const handlePlaceCardIntoCategory = (card: ItemCard, targetCategory: IntegerCategory) => {
    if (card.category === targetCategory) {
      sound.playSuccess();
      updateCursorFeedback('success');
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? { ...c, isPlaced: true, placedSlot: targetCategory }
            : c
        )
      );
      setSelectedCardId(null);
    } else {
      sound.playWrong();
      updateCursorFeedback('wrong');
      setMistakesCount((m) => m + 1);
      setSelectedCardId(null);
    }
  };

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
    const currentDraggedId = draggedCardIdRef.current || draggedCardId;

    // DRAGGING (Zero-latency instant tracking)
    if (currentDraggedId && isPinching) {
      updateCursorFeedback('success');
      setCards((prevCards) => {
        return prevCards.map((card) => {
          if (card.id === currentDraggedId) {
            return { ...card, x: cXPercent, y: cYPercent };
          }
          return card;
        });
      });

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

            // Generous vertical capture zone: 100px above slot down to 80px below
            const inPadded =
              cursorClientX >= slotRect.left - 50 &&
              cursorClientX <= slotRect.right + 50 &&
              cursorClientY >= slotRect.top - 100 &&
              cursorClientY <= slotRect.bottom + 80;

            if ((inPadded || distPx < 200) && distPx < minHoverDist) {
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
    if (currentDraggedId && !isPinching) {
      draggedCardIdRef.current = null;
      const cardToDrop = currentCards.find((c) => c.id === currentDraggedId);
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
              cursorClientX >= slotRect.left - 50 &&
              cursorClientX <= slotRect.right + 50 &&
              cursorClientY >= slotRect.top - 100 &&
              cursorClientY <= slotRect.bottom + 80;

            if ((inPadded || distPx < 220) && distPx < minDropDist) {
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
                ? { ...c, isPlaced: true, placedSlot: droppedSlot }
                : c
            )
          );
        } else if (droppedSlot) {
          // Wrong category drop
          sound.playWrong();
          updateCursorFeedback('wrong');
          setMistakesCount((m) => m + 1);

          setCards((prev) =>
            prev.map((c) =>
              c.id === cardToDrop.id
                ? { ...c, x: c.initialX, y: c.initialY }
                : c
            )
          );
        } else {
          setCards((prev) =>
            prev.map((c) =>
              c.id === cardToDrop.id
                ? { ...c, x: c.initialX, y: c.initialY }
                : c
            )
          );
        }
      }

      setDraggedCardId(null);
      setActiveSlotHover(null);
      updateCursorFeedback('normal');
      return;
    }

    // CHECK HOVER OVER UNPLACED CARDS (100px generous circular hitbox)
    let hoveringCard: ItemCard | null = null;
    let minCardDist = Infinity;

    currentCards.forEach((card) => {
      if (card.isPlaced) return;
      const cardPixelX = (card.x / 100) * containerRect.width;
      const cardPixelY = (card.y / 100) * containerRect.height;
      const distPx = Math.hypot(curX - cardPixelX, curY - cardPixelY);

      if (distPx < 100 && distPx < minCardDist) {
        minCardDist = distPx;
        hoveringCard = card;
      }
    });

    if (hoveringCard) {
      if (isPinching) {
        draggedCardIdRef.current = (hoveringCard as ItemCard).id;
        setDraggedCardId((hoveringCard as ItemCard).id);
        setSelectedCardId((hoveringCard as ItemCard).id);
        setCards((prev) =>
          prev.map((c) =>
            c.id === (hoveringCard as ItemCard).id ? { ...c, x: cXPercent, y: cYPercent } : c
          )
        );
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
      const nextScore = score + levelBonus;
      setScore(nextScore);
      sound.playVictory();

      setTimeout(() => {
        if (currentLevelIdx < LEVEL_DATA.length - 1) {
          setCurrentLevelIdx((prev) => prev + 1);
        } else {
          // All levels done! Save score to leaderboard
          if (currentPlayer) {
            saveGameScore({
              player: currentPlayer,
              gameType: 'classification',
              gameTitle: 'গেম ২: পূর্ণসংখ্যা শ্রেণিবিন্যাস',
              score: nextScore,
              mistakes: mistakesCount,
            });
          }
          setGameState('victory');
        }
      }, 1200);
    }
  }, [cards, gameState, currentLevelIdx, timeLeft, score, mistakesCount, currentPlayer]);

  const accuracyPercent = Math.max(0, Math.min(100, Math.round(100 - mistakesCount * 10)));

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col justify-between p-4 md:p-6 font-['Hind_Siliguri',sans-serif] select-none overflow-hidden">
      {/* START SCREEN */}
      {gameState === 'start' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-lg w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 p-0.5 mx-auto shadow-lg shadow-pink-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-pink-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-black text-white">গেম ২: পূর্ণসংখ্যা শ্রেণিবিন্যাস</h2>
              <p className="text-sm text-slate-300">
                ভাসমান সংখ্যা তুলে ঋণাত্মক, শূন্য এবং ধনাত্মক ঘরের মধ্যে সঠিক স্থানে সাজান!
              </p>
              {currentPlayer && (
                <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-xl bg-pink-500/20 text-pink-300 text-xs font-bold border border-pink-500/30">
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
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 hover:opacity-95 text-white font-bold text-lg shadow-xl shadow-pink-600/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01]"
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-300 text-xs font-semibold">
              <HelpCircle className="w-4 h-4" />
              <span>শ্রেণিবিন্যাস নির্দেশিকা</span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-slate-100">কীভাবে খেলবেন?</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-sm text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="font-bold text-pink-300">১. ৩টি বাক্স</div>
                <p className="text-xs text-slate-400">
                  নিচে ৩টি বক্স রয়েছে: ঋণাত্মক পূর্ণসংখ্যা (&lt;০), শূন্য (০) এবং ধনাত্মক পূর্ণসংখ্যা (&gt;০)।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="font-bold text-cyan-300">২. স্পর্শ বা চিমটি</div>
                <p className="text-xs text-slate-400">
                  কার্ডে ক্লিক করে বাক্সে ক্লিক করুন অথবা হাত দিয়ে চিমটি (Pinch) দিয়ে টেনে এনে ফেলুন।
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
            <span className="px-3 py-1 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-bold">
              {LEVEL_DATA[currentLevelIdx].title}
            </span>
            <div className="text-xs md:text-sm font-semibold text-slate-200 hidden sm:block">
              সংখ্যাটি চিনুন এবং সঠিক বাক্সে রাখুন
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs md:text-sm font-semibold">
              <Clock className="w-3.5 h-3.5 text-pink-400" />
              <span>সময়: <span className="text-pink-400 font-bold">{formatTime(timeLeft)}</span></span>
            </div>

            <div className="text-xs md:text-sm font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              স্কোর: <span className="text-amber-400 font-bold">{toBengaliNumber(score)}</span>
            </div>

            <div className="text-xs md:text-sm font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              ভুল: <span className={`font-bold ${mistakesCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{toBengaliNumber(mistakesCount)}</span>
            </div>

            <button
              onClick={() => {
                sound.playRelease();
                initLevel(currentLevelIdx);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all"
              title="পুনরায় সাজান"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* PLAYING CANVAS AREA */}
      {gameState === 'playing' && (
        <div className="relative w-full flex-1 my-2">
          {/* Instruction helper */}
          <div className="text-center mt-1">
            <span className="text-xs text-slate-400 bg-slate-800/80 px-4 py-1 rounded-full border border-slate-700">
              💡 কার্ড সিলেক্ট করে নিচের বক্সে ক্লিক করুন অথবা টেনে বাক্সে ফেলুন
            </span>
          </div>

          {/* FLOATING CARDS */}
          {cards.map((card) => {
            if (card.isPlaced) return null;
            const isSelected = selectedCardId === card.id;

            return (
              <div
                key={card.id}
                style={{
                  left: `${card.x}%`,
                  top: `${card.y}%`,
                  transform: 'translate(-50%, -50%)',
                  transition: draggedCardId === card.id ? 'none' : 'all 150ms ease-out',
                }}
                onMouseDown={() => setDraggedCardId(card.id)}
                onClick={() => setSelectedCardId((prev) => (prev === card.id ? null : card.id))}
                className={`absolute cursor-pointer z-20 w-16 h-20 md:w-22 md:h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 p-0.5 shadow-xl ${
                  draggedCardId === card.id
                    ? 'border-pink-400 scale-115 ring-4 ring-pink-400 shadow-2xl'
                    : isSelected
                    ? 'border-pink-400 scale-115 ring-4 ring-pink-400 shadow-2xl -translate-y-2'
                    : 'border-pink-500/40 hover:scale-105'
                }`}
              >
                <div className="w-full h-full bg-slate-900/90 backdrop-blur-md rounded-[14px] flex flex-col items-center justify-center">
                  <span className="text-xl md:text-2xl font-black text-pink-200">
                    {card.displayLabel}
                  </span>
                  {isSelected && (
                    <span className="text-[9px] text-pink-300 font-bold mt-0.5 animate-pulse">
                      নির্বাচিত
                    </span>
                  )}
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
                  onClick={() => {
                    if (selectedCardId) {
                      const card = cards.find((c) => c.id === selectedCardId);
                      if (card) handlePlaceCardIntoCategory(card, slot.id);
                    }
                  }}
                  className={`h-36 md:h-44 rounded-3xl border-2 bg-gradient-to-b p-3 md:p-4 flex flex-col justify-between transition-all backdrop-blur-md shadow-xl cursor-pointer ${
                    isHovered
                      ? slot.hoverBorder
                      : selectedCardId
                      ? 'border-dashed border-cyan-400 hover:scale-102'
                      : slot.color
                  }`}
                >
                  <div className="text-center font-bold text-xs md:text-base border-b border-white/10 pb-2">
                    {slot.title}
                  </div>

                  {/* Placed cards display chips */}
                  <div className="flex flex-wrap gap-1.5 justify-center items-center overflow-y-auto max-h-24 py-1">
                    {placedItemsInSlot.map((item) => (
                      <span
                        key={item.id}
                        className="px-2.5 py-0.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs md:text-sm font-extrabold shadow-sm"
                      >
                        {item.displayLabel} ✔️
                      </span>
                    ))}
                    {placedItemsInSlot.length === 0 && (
                      <span className="text-[11px] text-slate-500 italic">
                        {selectedCardId ? 'এখানে ক্লিক করুন' : 'খালি'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VICTORY FINISH SCREEN WITH PERFORMANCE REPORT */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
          <div className="max-w-lg w-full bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500 to-rose-400 p-0.5 mx-auto shadow-2xl shadow-pink-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
                <Award className="w-10 h-10 text-pink-400 animate-bounce" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-black text-pink-400">অভিনন্দন! গেম সম্পন্ন</h2>
              <p className="text-slate-300 text-xs md:text-sm">
                {currentPlayer?.name ? `${currentPlayer.name}, আপনার গেম রিপোর্ট প্রস্তুত:` : 'আপনার ফলাফল:'}
              </p>
            </div>

            {/* Stars rating */}
            <div className="flex items-center justify-center gap-1.5 text-amber-400">
              <Star className="w-6 h-6 fill-current animate-pulse" />
              <Star className={`w-6 h-6 ${mistakesCount <= 2 ? 'fill-current animate-pulse' : 'text-slate-600'}`} />
              <Star className={`w-6 h-6 ${mistakesCount === 0 ? 'fill-current animate-pulse' : 'text-slate-600'}`} />
            </div>

            {/* Comprehensive Output Report Box */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>চূড়ান্ত স্কোর</span>
                </div>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {toBengaliNumber(score)}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>ভুলের সংখ্যা</span>
                </div>
                <div className={`text-2xl font-black mt-1 ${mistakesCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {toBengaliNumber(mistakesCount)} বার
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
                  setCurrentLevelIdx(0);
                  setScore(0);
                  setMistakesCount(0);
                  setGameState('playing');
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>পুনরায় শুরু করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
