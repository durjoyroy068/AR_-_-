import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CursorFeedbackState, Point2D } from '../types';
import { toBengaliNumber, toEnglishNumber } from '../utils/numberConverter';
import { sound } from '../utils/sound';
import { PlayerProfile, saveGameScore } from '../utils/storage';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle, 
  Award, 
  Target, 
  Puzzle, 
  Brain,
  Crosshair,
  Zap,
  X,
  Trophy,
  AlertTriangle,
  Star
} from 'lucide-react';

interface Game1Props {
  cursorPos: Point2D;
  isPinching: boolean;
  isHandPresent: boolean;
  setCursorFeedback: (state: CursorFeedbackState) => void;
  currentPlayer: PlayerProfile | null;
  onOpenDashboard: () => void;
}

interface DraggableCard {
  id: string;
  value: string;
  displayVal: string;
  x: number;
  y: number;
  initialX: number;
  initialY: number;
  isPlaced: boolean;
  placedSlot: number | null;
  color: string;
}

interface TargetItem {
  id: string;
  value: number;
  displayVal: string;
  isCorrect: boolean;
  color: string;
  x: number;
  y: number;
  floatOffset: number;
  isPopping?: boolean;
}

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
  currentPlayer,
  onOpenDashboard,
}) => {
  const [gameState, setGameState] = useState<'start' | 'instructions' | 'playing' | 'victory'>('start');
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [mistakesCount, setMistakesCount] = useState<number>(0);

  // LEVEL 01 State
  const [l1Cards, setL1Cards] = useState<DraggableCard[]>([]);
  const [l1Slots, setL1Slots] = useState<(DraggableCard | null)[]>([null, null, null, null, null]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hoveredSlotIdx, setHoveredSlotIdx] = useState<number | null>(null);

  // LEVEL 02 State
  const [l2SubRound, setL2SubRound] = useState<number>(0);
  const [l2Cards, setL2Cards] = useState<DraggableCard[]>([]);
  const [l2PlacedCard, setL2PlacedCard] = useState<DraggableCard | null>(null);
  const [isHoveringL2Slot, setIsHoveringL2Slot] = useState<boolean>(false);

  // LEVEL 03 State
  const [l3Round, setL3Round] = useState<number>(0);
  const [l3Targets, setL3Targets] = useState<TargetItem[]>([]);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  // Feedback State
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const draggedCardIdRef = useRef<string | null>(null);
  const [isErrorState, setIsErrorState] = useState<boolean>(false);
  const [isSuccessState, setIsSuccessState] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);
  const instructionBtnRef = useRef<HTMLButtonElement | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);
  const l2SlotRef = useRef<HTMLDivElement | null>(null);

  const lastFeedbackRef = useRef<CursorFeedbackState>('normal');
  const updateCursorFeedback = useCallback((state: CursorFeedbackState) => {
    if (lastFeedbackRef.current !== state) {
      lastFeedbackRef.current = state;
      setCursorFeedback(state);
    }
  }, [setCursorFeedback]);

  // LEVEL 01 Config
  const initLevel1 = () => {
    const rawCards = ['13', '=', '5', '+', '8'];
    const cards: DraggableCard[] = rawCards.map((val, idx) => {
      const posX = 16 + (idx % 5) * 17;
      const posY = 32;
      return {
        id: `l1-card-${idx}-${val}`,
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

    setL1Cards(cards);
    setL1Slots([null, null, null, null, null]);
    setSelectedCardId(null);
    setDraggedCardId(null);
    setHoveredSlotIdx(null);
    setIsErrorState(false);
    setIsSuccessState(false);
  };

  // LEVEL 02 Config
  const L2_ROUNDS = [
    {
      id: 1,
      equationTemplate: ['9', '+', '?', '=', '15'],
      missingIndex: 2,
      correctVal: '6',
      hint: '৯ এর সাথে কত যোগ করলে ১৫ হবে?',
      options: ['4', '6', '8', '5'],
    },
    {
      id: 2,
      equationTemplate: ['20', '-', '?', '=', '12'],
      missingIndex: 2,
      correctVal: '8',
      hint: '২০ থেকে কত বিয়োগ করলে ১২ হবে?',
      options: ['7', '9', '8', '6'],
    },
  ];

  const initLevel2 = (roundIdx: number) => {
    const roundData = L2_ROUNDS[roundIdx];
    const cards: DraggableCard[] = roundData.options.map((val, idx) => {
      const posX = 20 + idx * 20;
      const posY = 30;
      return {
        id: `l2-card-${roundIdx}-${idx}-${val}`,
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

    setL2Cards(cards);
    setL2PlacedCard(null);
    setDraggedCardId(null);
    setIsHoveringL2Slot(false);
    setIsErrorState(false);
    setIsSuccessState(false);
  };

  // LEVEL 03 Config
  const L3_ROUNDS = [
    {
      id: 1,
      questionText: '৬ × ৭ = কত?',
      correctVal: 42,
      targets: [
        { val: 42, isCorrect: true, color: 'from-pink-500 to-rose-600', x: 22, y: 35 },
        { val: 36, isCorrect: false, color: 'from-blue-500 to-cyan-600', x: 42, y: 48 },
        { val: 48, isCorrect: false, color: 'from-amber-500 to-orange-600', x: 62, y: 34 },
        { val: 40, isCorrect: false, color: 'from-purple-500 to-indigo-600', x: 78, y: 49 },
      ],
    },
    {
      id: 2,
      questionText: '৩৬ ÷ ৪ = কত?',
      correctVal: 9,
      targets: [
        { val: 8, isCorrect: false, color: 'from-blue-500 to-cyan-600', x: 20, y: 46 },
        { val: 9, isCorrect: true, color: 'from-emerald-500 to-teal-600', x: 40, y: 32 },
        { val: 7, isCorrect: false, color: 'from-pink-500 to-rose-600', x: 60, y: 48 },
        { val: 6, isCorrect: false, color: 'from-amber-500 to-orange-600', x: 80, y: 34 },
      ],
    },
    {
      id: 3,
      questionText: '২৫ + ১৯ = কত?',
      correctVal: 44,
      targets: [
        { val: 44, isCorrect: true, color: 'from-purple-500 to-indigo-600', x: 25, y: 35 },
        { val: 42, isCorrect: false, color: 'from-rose-500 to-red-600', x: 45, y: 50 },
        { val: 45, isCorrect: false, color: 'from-cyan-500 to-blue-600', x: 65, y: 33 },
        { val: 54, isCorrect: false, color: 'from-amber-500 to-yellow-600', x: 82, y: 47 },
      ],
    },
  ];

  const initLevel3 = (roundIdx: number) => {
    const roundData = L3_ROUNDS[roundIdx];
    const targets: TargetItem[] = roundData.targets.map((t, idx) => ({
      id: `l3-target-${roundIdx}-${idx}-${t.val}`,
      value: t.val,
      displayVal: toBengaliNumber(t.val),
      isCorrect: t.isCorrect,
      color: t.color,
      x: t.x,
      y: t.y,
      floatOffset: idx * 1.5,
      isPopping: false,
    }));

    setL3Targets(targets);
    setHoveredTargetId(null);
    setIsErrorState(false);
    setIsSuccessState(false);
  };

  useEffect(() => {
    if (currentLevelIdx === 0) {
      initLevel1();
    } else if (currentLevelIdx === 1) {
      setL2SubRound(0);
      initLevel2(0);
    } else if (currentLevelIdx === 2) {
      setL3Round(0);
      initLevel3(0);
    }
  }, [currentLevelIdx]);

  // Level 3 animation
  useEffect(() => {
    if (gameState !== 'playing' || currentLevelIdx !== 2) return;
    let animId: number;
    let startTime = performance.now();

    const loop = (currentTime: number) => {
      const elapsed = (currentTime - startTime) / 1000;
      setL3Targets((prev) =>
        prev.map((t) => {
          const dy = Math.sin(elapsed * 2 + t.floatOffset) * 0.15;
          return {
            ...t,
            y: Math.max(20, Math.min(65, t.y + dy)),
          };
        })
      );
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, currentLevelIdx]);

  // Place card cleanly
  const placeCardInSlot = (cardToPlace: DraggableCard, targetSlotIdx: number) => {
    sound.playRelease();
    const existingCardInSlot = l1Slots[targetSlotIdx];

    setL1Slots((prev) => {
      const next = [...prev];
      next[targetSlotIdx] = cardToPlace;
      return next;
    });

    setL1Cards((prev) =>
      prev.map((c) => {
        if (c.id === cardToPlace.id) {
          return { ...c, isPlaced: true, placedSlot: targetSlotIdx };
        }
        if (existingCardInSlot && c.id === existingCardInSlot.id) {
          return { ...c, isPlaced: false, placedSlot: null, x: c.initialX, y: c.initialY };
        }
        return c;
      })
    );

    setSelectedCardId(null);
    setDraggedCardId(null);
    setHoveredSlotIdx(null);
  };

  // Remove card
  const handleRemoveCardFromSlot = (slotIdx: number) => {
    sound.playRelease();
    const cardInSlot = l1Slots[slotIdx];
    if (!cardInSlot) return;

    setL1Slots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });

    setL1Cards((prev) =>
      prev.map((c) =>
        c.id === cardInSlot.id
          ? { ...c, isPlaced: false, placedSlot: null, x: c.initialX, y: c.initialY }
          : c
      )
    );

    setSelectedCardId(null);
  };

  const handleCardClick = (card: DraggableCard) => {
    if (card.isPlaced) return;
    sound.playPinch();

    const firstEmptyIdx = l1Slots.findIndex((s) => s === null);
    if (selectedCardId === card.id && firstEmptyIdx !== -1) {
      placeCardInSlot(card, firstEmptyIdx);
      return;
    }
    setSelectedCardId((prev) => (prev === card.id ? null : card.id));
  };

  const handleSlotClick = (slotIdx: number) => {
    const placedCard = l1Slots[slotIdx];
    if (placedCard) {
      handleRemoveCardFromSlot(slotIdx);
      return;
    }
    if (selectedCardId) {
      const cardToPlace = l1Cards.find((c) => c.id === selectedCardId);
      if (cardToPlace) {
        placeCardInSlot(cardToPlace, slotIdx);
        return;
      }
    }
    const availableCard = l1Cards.find((c) => !c.isPlaced);
    if (availableCard) {
      placeCardInSlot(availableCard, slotIdx);
    }
  };

  // AR & Mouse Interaction Engine
  useEffect(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const curX = cursorPos.x;
    const curY = cursorPos.y;

    if (gameState === 'start') {
      if (startBtnRef.current) {
        const btnRect = startBtnRef.current.getBoundingClientRect();
        const relX = curX + containerRect.left;
        const relY = curY + containerRect.top;
        const isHover =
          relX >= btnRect.left && relX <= btnRect.right && relY >= btnRect.top && relY <= btnRect.bottom;

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
        const relX = curX + containerRect.left;
        const relY = curY + containerRect.top;
        const isHover =
          relX >= btnRect.left && relX <= btnRect.right && relY >= btnRect.top && relY <= btnRect.bottom;

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

    // ==========================================
    // LEVEL 01: Equation Builder
    // ==========================================
    if (currentLevelIdx === 0) {
      // 1. DRAGGING CARD (Zero-latency instant tracking)
      const currentDraggedId = draggedCardIdRef.current || draggedCardId;

      if (currentDraggedId && isPinching) {
        updateCursorFeedback('success');
        setL1Cards((prev) =>
          prev.map((c) => (c.id === currentDraggedId ? { ...c, x: cXPercent, y: cYPercent } : c))
        );

        // Find closest slot during dragging for real-time magnetic highlight
        const cursorClientX = containerRect.left + curX;
        const cursorClientY = containerRect.top + curY;
        let closestSlot: number | null = null;
        let minSlotDist = Infinity;

        for (let i = 0; i < 5; i++) {
          const slotEl = slotRefs.current[i];
          if (slotEl) {
            const rect = slotEl.getBoundingClientRect();
            const slotCenterX = rect.left + rect.width / 2;
            const slotCenterY = rect.top + rect.height / 2;
            const dist = Math.hypot(cursorClientX - slotCenterX, cursorClientY - slotCenterY);
            // Generous vertical capture zone: 100px above slot down to 70px below
            const inPadded =
              cursorClientX >= rect.left - 45 &&
              cursorClientX <= rect.right + 45 &&
              cursorClientY >= rect.top - 100 &&
              cursorClientY <= rect.bottom + 70;

            if ((inPadded || dist < 170) && dist < minSlotDist) {
              minSlotDist = dist;
              closestSlot = i;
            }
          }
        }
        setHoveredSlotIdx(closestSlot);
        return;
      }

      // 2. DROPPING CARD (RELEASE)
      if (currentDraggedId && !isPinching) {
        draggedCardIdRef.current = null;
        const cardToDrop = l1Cards.find((c) => c.id === currentDraggedId);
        let droppedSlotIdx = -1;

        if (cardToDrop) {
          const cursorClientX = containerRect.left + curX;
          const cursorClientY = containerRect.top + curY;
          let bestSlotIdx = -1;
          let minDropDist = Infinity;

          for (let i = 0; i < 5; i++) {
            const slotEl = slotRefs.current[i];
            if (slotEl) {
              const rect = slotEl.getBoundingClientRect();
              const slotCenterX = rect.left + rect.width / 2;
              const slotCenterY = rect.top + rect.height / 2;
              const dist = Math.hypot(cursorClientX - slotCenterX, cursorClientY - slotCenterY);
              const inPadded =
                cursorClientX >= rect.left - 50 &&
                cursorClientX <= rect.right + 50 &&
                cursorClientY >= rect.top - 110 &&
                cursorClientY <= rect.bottom + 80;

              // Find closest target slot
              if ((inPadded || dist < 185) && dist < minDropDist) {
                minDropDist = dist;
                bestSlotIdx = i;
              }
            }
          }

          if (bestSlotIdx !== -1) {
            droppedSlotIdx = bestSlotIdx;
          }

          if (droppedSlotIdx !== -1) {
            placeCardInSlot(cardToDrop, droppedSlotIdx);
          } else {
            setL1Cards((prev) =>
              prev.map((c) =>
                c.id === cardToDrop.id ? { ...c, x: c.initialX, y: c.initialY } : c
              )
            );
          }
        }

        setDraggedCardId(null);
        setHoveredSlotIdx(null);
        updateCursorFeedback('normal');
        return;
      }

      // 3. FAST HOVER & PINCH PICKUP (Uses accurate 100px pixel circular hitbox!)
      let hoveredCard: DraggableCard | null = null;
      let minCardDist = Infinity;

      l1Cards.forEach((card) => {
        if (!card.isPlaced) {
          const cardPixelX = (card.x / 100) * containerRect.width;
          const cardPixelY = (card.y / 100) * containerRect.height;
          const distPx = Math.hypot(curX - cardPixelX, curY - cardPixelY);

          // 100px generous circular hitbox around the card center
          if (distPx < 100 && distPx < minCardDist) {
            minCardDist = distPx;
            hoveredCard = card;
          }
        }
      });

      if (hoveredCard) {
        if (isPinching) {
          draggedCardIdRef.current = (hoveredCard as DraggableCard).id;
          setDraggedCardId((hoveredCard as DraggableCard).id);
          setSelectedCardId((hoveredCard as DraggableCard).id);
          // Instant position update on current frame
          setL1Cards((prev) =>
            prev.map((c) => (c.id === (hoveredCard as DraggableCard).id ? { ...c, x: cXPercent, y: cYPercent } : c))
          );
          updateCursorFeedback('success');
        } else {
          updateCursorFeedback('hover');
        }
      } else {
        updateCursorFeedback(isPinching ? 'miss' : 'normal');
      }
      return;
    }

    // ==========================================
    // LEVEL 02: Missing Number Challenge
    // ==========================================
    if (currentLevelIdx === 1) {
      const currentDraggedId = draggedCardIdRef.current || draggedCardId;

      if (currentDraggedId && isPinching) {
        updateCursorFeedback('success');
        setL2Cards((prev) =>
          prev.map((c) => (c.id === currentDraggedId ? { ...c, x: cXPercent, y: cYPercent } : c))
        );

        if (l2SlotRef.current) {
          const slotRect = l2SlotRef.current.getBoundingClientRect();
          const cursorClientX = containerRect.left + curX;
          const cursorClientY = containerRect.top + curY;
          const dist = Math.hypot(
            cursorClientX - (slotRect.left + slotRect.width / 2),
            cursorClientY - (slotRect.top + slotRect.height / 2)
          );
          const inPadded =
            cursorClientX >= slotRect.left - 50 &&
            cursorClientX <= slotRect.right + 50 &&
            cursorClientY >= slotRect.top - 100 &&
            cursorClientY <= slotRect.bottom + 80;
          setIsHoveringL2Slot(dist < 185 || inPadded);
        }
        return;
      }

      if (currentDraggedId && !isPinching) {
        draggedCardIdRef.current = null;
        const cardToDrop = l2Cards.find((c) => c.id === currentDraggedId);
        let droppedInSlot = false;

        if (cardToDrop && l2SlotRef.current) {
          const slotRect = l2SlotRef.current.getBoundingClientRect();
          const cursorClientX = containerRect.left + curX;
          const cursorClientY = containerRect.top + curY;
          const dist = Math.hypot(
            cursorClientX - (slotRect.left + slotRect.width / 2),
            cursorClientY - (slotRect.top + slotRect.height / 2)
          );
          const inPadded =
            cursorClientX >= slotRect.left - 50 &&
            cursorClientX <= slotRect.right + 50 &&
            cursorClientY >= slotRect.top - 100 &&
            cursorClientY <= slotRect.bottom + 80;

          if (dist < 185 || inPadded) {
            droppedInSlot = true;
          }
        }

        if (droppedInSlot && cardToDrop) {
          handleDropMissingNumber(cardToDrop);
        } else if (cardToDrop) {
          setL2Cards((prev) =>
            prev.map((c) =>
              c.id === cardToDrop.id ? { ...c, isPlaced: false, x: c.initialX, y: c.initialY } : c
            )
          );
        }

        setDraggedCardId(null);
        setIsHoveringL2Slot(false);
        updateCursorFeedback('normal');
        return;
      }

      let hoveredCard: DraggableCard | null = null;
      let minCardDist = Infinity;
      l2Cards.forEach((card) => {
        if (!card.isPlaced) {
          const cardPixelX = (card.x / 100) * containerRect.width;
          const cardPixelY = (card.y / 100) * containerRect.height;
          const distPx = Math.hypot(curX - cardPixelX, curY - cardPixelY);

          if (distPx < 100 && distPx < minCardDist) {
            minCardDist = distPx;
            hoveredCard = card;
          }
        }
      });

      if (hoveredCard) {
        if (isPinching) {
          draggedCardIdRef.current = (hoveredCard as DraggableCard).id;
          setDraggedCardId((hoveredCard as DraggableCard).id);
          setL2Cards((prev) =>
            prev.map((c) => (c.id === (hoveredCard as DraggableCard).id ? { ...c, x: cXPercent, y: cYPercent } : c))
          );
          updateCursorFeedback('success');
        } else {
          updateCursorFeedback('hover');
        }
      } else {
        updateCursorFeedback(isPinching ? 'miss' : 'normal');
      }
      return;
    }

    // ==========================================
    // LEVEL 03: Math Target Hunter
    // ==========================================
    if (currentLevelIdx === 2) {
      let hoveredTarget: TargetItem | null = null;
      let minDist = Infinity;

      l3Targets.forEach((target) => {
        if (!target.isPopping) {
          const targetPixelX = (target.x / 100) * containerRect.width;
          const targetPixelY = (target.y / 100) * containerRect.height;
          const distPx = Math.hypot(curX - targetPixelX, curY - targetPixelY);

          if (distPx < 85 && distPx < minDist) {
            minDist = distPx;
            hoveredTarget = target;
          }
        }
      });

      if (hoveredTarget) {
        setHoveredTargetId((hoveredTarget as TargetItem).id);
        if (isPinching) {
          updateCursorFeedback('success');
          handlePopTarget(hoveredTarget as TargetItem);
        } else {
          updateCursorFeedback('hover');
        }
      } else {
        setHoveredTargetId(null);
        updateCursorFeedback(isPinching ? 'miss' : 'normal');
      }
    }
  }, [cursorPos.x, cursorPos.y, isPinching, gameState, currentLevelIdx, draggedCardId, l1Cards, l2Cards, l3Targets]);

  // Validation Level 01
  useEffect(() => {
    if (gameState !== 'playing' || currentLevelIdx !== 0 || isSuccessState || isErrorState) return;
    const isFull = l1Slots.every((s) => s !== null && s !== undefined);
    if (!isFull) return;

    let isValid = false;

    const s0 = toEnglishNumber(l1Slots[0]?.value).trim();
    const s1 = l1Slots[1]?.value?.trim() || '';
    const s2 = toEnglishNumber(l1Slots[2]?.value).trim();
    const s3 = l1Slots[3]?.value?.trim() || '';
    const s4 = toEnglishNumber(l1Slots[4]?.value).trim();

    if (s3 === '=') {
      const numA = Number(s0);
      const op = s1;
      const numB = Number(s2);
      const numResult = Number(s4);

      if (!isNaN(numA) && !isNaN(numB) && !isNaN(numResult)) {
        if (op === '+' && numA + numB === numResult) isValid = true;
        if (op === '-' && numA - numB === numResult) isValid = true;
        if ((op === '×' || op === '*') && numA * numB === numResult) isValid = true;
        if ((op === '÷' || op === '/') && numB !== 0 && numA / numB === numResult) isValid = true;
      }
    }

    if (s1 === '=') {
      const numResult = Number(s0);
      const numA = Number(s2);
      const op = s3;
      const numB = Number(s4);

      if (!isNaN(numA) && !isNaN(numB) && !isNaN(numResult)) {
        if (op === '+' && numA + numB === numResult) isValid = true;
        if (op === '-' && numA - numB === numResult) isValid = true;
        if ((op === '×' || op === '*') && numA * numB === numResult) isValid = true;
        if ((op === '÷' || op === '/') && numB !== 0 && numA / numB === numResult) isValid = true;
      }
    }

    if (isValid) {
      setIsSuccessState(true);
      setSuccessMessage('দারুণ! সমীকরণ সফলভাবে তৈরি হয়েছে!');
      sound.playSuccess();
      updateCursorFeedback('success');
      setScore((s) => s + 100);

      setTimeout(() => {
        setCurrentLevelIdx(1);
      }, 1600);
    } else {
      setIsErrorState(true);
      sound.playWrong();
      updateCursorFeedback('wrong');
      setMistakesCount((m) => m + 1);

      setTimeout(() => {
        setIsErrorState(false);
        setL1Slots([null, null, null, null, null]);
        setL1Cards((prev) =>
          prev.map((c) => ({
            ...c,
            isPlaced: false,
            placedSlot: null,
            x: c.initialX,
            y: c.initialY,
          }))
        );
        setSelectedCardId(null);
      }, 1200);
    }
  }, [l1Slots, gameState, currentLevelIdx, isSuccessState, isErrorState, updateCursorFeedback]);

  // Validation Level 02
  const handleDropMissingNumber = (card: DraggableCard) => {
    const currentRoundData = L2_ROUNDS[l2SubRound];
    if (toEnglishNumber(card.value) === toEnglishNumber(currentRoundData.correctVal)) {
      setL2PlacedCard(card);
      setIsSuccessState(true);
      setSuccessMessage(`সঠিক! হারানো সংখ্যাটি হলো ${toBengaliNumber(card.value)}`);
      sound.playSuccess();
      updateCursorFeedback('success');
      setScore((s) => s + 50);

      setTimeout(() => {
        if (l2SubRound + 1 < L2_ROUNDS.length) {
          setL2SubRound((r) => r + 1);
          initLevel2(l2SubRound + 1);
        } else {
          setCurrentLevelIdx(2);
        }
      }, 1500);
    } else {
      setIsErrorState(true);
      sound.playWrong();
      updateCursorFeedback('wrong');
      setMistakesCount((m) => m + 1);

      setTimeout(() => {
        setIsErrorState(false);
        setL2Cards((prev) =>
          prev.map((c) =>
            c.id === card.id ? { ...c, isPlaced: false, x: c.initialX, y: c.initialY } : c
          )
        );
      }, 1000);
    }
  };

  // Validation Level 03
  const handlePopTarget = (target: TargetItem) => {
    if (target.isPopping || isSuccessState) return;

    if (target.isCorrect) {
      sound.playPop();
      setL3Targets((prev) =>
        prev.map((t) => (t.id === target.id ? { ...t, isPopping: true } : t))
      );
      setIsSuccessState(true);
      setSuccessMessage(`সঠিক উত্তর! +৫০ পয়েন্ট`);
      const finalScore = score + 50;
      setScore(finalScore);

      setTimeout(() => {
        if (l3Round + 1 < L3_ROUNDS.length) {
          setL3Round((r) => r + 1);
          initLevel3(l3Round + 1);
        } else {
          sound.playVictory();
          if (currentPlayer) {
            saveGameScore({
              player: currentPlayer,
              gameType: 'equation',
              gameTitle: 'গেম ১: সমীকরণ সাজাও',
              score: finalScore,
              mistakes: mistakesCount,
            });
          }
          setGameState('victory');
        }
      }, 1200);
    } else {
      sound.playWrong();
      setIsErrorState(true);
      setMistakesCount((m) => m + 1);
      setTimeout(() => setIsErrorState(false), 800);
    }
  };

  const handleResetCurrentLevel = () => {
    sound.playRelease();
    if (currentLevelIdx === 0) {
      initLevel1();
    } else if (currentLevelIdx === 1) {
      initLevel2(l2SubRound);
    } else if (currentLevelIdx === 2) {
      initLevel3(l3Round);
    }
  };

  const accuracyPercent = Math.max(0, Math.min(100, Math.round(100 - mistakesCount * 10)));

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col justify-between p-4 md:p-6 select-none overflow-hidden font-['Hind_Siliguri',sans-serif]">
      {/* 1. START SCREEN */}
      {gameState === 'start' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-2xl w-full bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-400 p-0.5 mx-auto shadow-lg shadow-blue-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">গেম ১: AR গণিত অ্যাডভেঞ্চার</h2>
              <p className="text-sm md:text-base text-slate-300 mt-2">
                তিনটি চমৎকার লেভেলে সমীকরণ তৈরি, হারানো সংখ্যা ও টার্গেট শিকারের রোমাঞ্চকর অভিজ্ঞতা!
              </p>
              {currentPlayer && (
                <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                  <span>খেলোয়াড়: {currentPlayer.avatar} {currentPlayer.name}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-1">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                  <Puzzle className="w-4 h-4" />
                  <span>লেভেল ০১</span>
                </div>
                <div className="text-sm font-bold text-slate-100">সমীকরণ তৈরি করো</div>
                <p className="text-xs text-slate-400">এলোমেলো কার্ড সাজিয়ে সঠিক সমীকরণ গঠন।</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                  <Brain className="w-4 h-4" />
                  <span>লেভেল ০২</span>
                </div>
                <div className="text-sm font-bold text-slate-100">হারানো সংখ্যা খুঁজো</div>
                <p className="text-xs text-slate-400">অসম্পূর্ণ সমীকরণে ফাঁকা ঘরের সংখ্যা নির্ণয়।</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Target className="w-4 h-4" />
                  <span>লেভেল ০৩</span>
                </div>
                <div className="text-sm font-bold text-slate-100">টার্গেট হান্টার</div>
                <p className="text-xs text-slate-400">ভাসমান সঠিক উত্তরটিতে চিমটি কেটে শিকার।</p>
              </div>
            </div>

            <button
              ref={startBtnRef}
              onClick={() => {
                sound.playPinch();
                setGameState('instructions');
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-lg shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>গেমে প্রবেশ করুন (Start)</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. INSTRUCTIONS SCREEN */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-xl">
          <div className="max-w-xl w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <HelpCircle className="w-4 h-4" />
              <span>খেলার নির্দেশিকা</span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-slate-100">কীভাবে খেলবেন?</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-sm text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/50 space-y-2">
                <div className="font-bold text-cyan-300 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>১. দ্রুত ও নির্ভুল Pinch</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  বুড়ো আঙুল ও তর্জনী একসাথে মেলালে তাৎক্ষণিকভাবে কার্ডটি ধরবে। কার্ড টেনে নিচে আনলে স্লটটি সবুজ আভায় স্ন্যাপ হবে।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/50 space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <Crosshair className="w-4 h-4" />
                  <span>২. মাউস ও ক্লিক বিকল্প</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ক্যামেরা ছাড়াও মাউস দিয়ে কার্ডে ক্লিক করে নিচের যেকোনো ঘরে ক্লিক করলেই মুহূর্তেই বসে যাবে!
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

      {/* 3. GAMEPLAY HEADER */}
      {gameState === 'playing' && (
        <div className="flex items-center justify-between gap-4 z-10 bg-slate-900/70 backdrop-blur-md p-3 md:p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            {currentLevelIdx === 0 && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5">
                  <Puzzle className="w-3.5 h-3.5" />
                  লেভেল ০১
                </span>
                <span className="text-xs md:text-sm font-semibold text-slate-200">
                  সমীকরণ তৈরি করো (Equation Builder)
                </span>
              </div>
            )}
            {currentLevelIdx === 1 && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  লেভেল ০২
                </span>
                <span className="text-xs md:text-sm font-semibold text-slate-200">
                  হারানো সংখ্যা খুঁজে বের করো (Missing Number)
                </span>
              </div>
            )}
            {currentLevelIdx === 2 && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  লেভেল ০৩
                </span>
                <span className="text-xs md:text-sm font-semibold text-slate-200">
                  সঠিক উত্তরকে লক্ষ্য করো (Target Hunter)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="text-xs md:text-sm font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              স্কোর: <span className="text-amber-400 font-bold text-sm md:text-base">{toBengaliNumber(score)}</span>
            </div>

            <div className="text-xs md:text-sm font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1">
              <span>ভুল:</span>
              <span className={`font-bold ${mistakesCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {toBengaliNumber(mistakesCount)}
              </span>
            </div>

            <button
              onClick={handleResetCurrentLevel}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all"
              title="রিসেট"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">রিসেট</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. ACTIVE PLAYING CANVAS */}
      {gameState === 'playing' && (
        <div className="relative w-full flex-1 my-2">
          {/* TOAST MESSAGE */}
          {(isSuccessState || isErrorState) && (
            <div
              className={`absolute top-2 left-1/2 transform -translate-x-1/2 z-40 px-6 py-2.5 rounded-2xl text-sm font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all ${
                isSuccessState
                  ? 'bg-emerald-500/90 text-white border border-emerald-300 animate-bounce'
                  : 'bg-rose-500/90 text-white border border-rose-300 animate-pulse'
              }`}
            >
              {isSuccessState ? <CheckCircle2 className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
              <span>{isSuccessState ? successMessage : 'ভুল হয়েছে! সমীকরণটি মেলেনি, আবার চেষ্টা করো'}</span>
            </div>
          )}

          {/* LEVEL 01 CANVAS */}
          {currentLevelIdx === 0 && (
            <>
              <div className="text-center mt-2 flex flex-col items-center gap-1.5">
                <span className="inline-block px-4 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs md:text-sm text-cyan-300 font-medium">
                  🎯 মিশন: নিচের কার্ডগুলো সাজিয়ে সমীকরণ তৈরি করো (যেমন: ৮ + ৫ = ১৩ বা ৫ + ৮ = ১৩)
                </span>
                <span className="text-[11px] text-slate-400">
                  💡 কার্ডে আঙ্গুল দিয়ে চিমটি কেটে (Pinch) ধরুন এবং নিচের উজ্জ্বল ঘরে এনে ছেড়ে দিন।
                </span>
              </div>

              {/* FLOATING NUMBER CARDS */}
              {l1Cards.map((card) => {
                if (card.isPlaced) {
                  return (
                    <div
                      key={`placeholder-${card.id}`}
                      style={{
                        left: `${card.initialX}%`,
                        top: `${card.initialY}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="absolute w-16 h-20 md:w-20 md:h-24 rounded-2xl border-2 border-dashed border-slate-700/50 bg-slate-900/30 flex items-center justify-center opacity-40 pointer-events-none"
                    >
                      <span className="text-xl font-bold text-slate-600">{card.displayVal}</span>
                    </div>
                  );
                }

                const isSelected = selectedCardId === card.id;
                const isDragged = draggedCardId === card.id;

                return (
                  <div
                    key={card.id}
                    style={{
                      left: `${card.x}%`,
                      top: `${card.y}%`,
                      transform: 'translate(-50%, -50%)',
                      transition: isDragged ? 'none' : 'all 150ms ease-out',
                    }}
                    onMouseDown={() => {
                      setDraggedCardId(card.id);
                    }}
                    onClick={() => handleCardClick(card)}
                    className={`absolute cursor-pointer z-30 w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-gradient-to-br ${card.color} p-0.5 shadow-xl ${
                      isDragged
                        ? 'scale-115 shadow-2xl ring-4 ring-cyan-300'
                        : isSelected
                        ? 'scale-115 shadow-2xl ring-4 ring-cyan-300 -translate-y-2'
                        : 'hover:scale-105 hover:-translate-y-1'
                    }`}
                  >
                    <div className="relative w-full h-full bg-slate-900/90 backdrop-blur-md rounded-[14px] flex flex-col items-center justify-center border border-white/20">
                      <span className="text-2xl md:text-3xl font-black text-white drop-shadow-md">
                        {card.displayVal}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] text-cyan-300 font-bold mt-0.5 animate-pulse">
                          নির্বাচিত
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 5 BOTTOM SLOTS WITH MAGNETIC SNAP HIGHLIGHT */}
              <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center items-center gap-3 md:gap-5 px-4">
                {[0, 1, 2, 3, 4].map((slotIdx) => {
                  const placedCard = l1Slots[slotIdx];
                  const isHoveredTarget = hoveredSlotIdx === slotIdx;

                  return (
                    <div
                      key={`slot-${slotIdx}`}
                      ref={(el) => {
                        slotRefs.current[slotIdx] = el;
                      }}
                      onClick={() => handleSlotClick(slotIdx)}
                      className={`relative w-16 h-20 md:w-20 md:h-24 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                        placedCard
                          ? `bg-gradient-to-br ${placedCard.color} p-0.5 shadow-xl`
                          : isHoveredTarget
                          ? 'border-2 border-dashed border-cyan-300 bg-cyan-500/30 ring-4 ring-cyan-400 shadow-xl shadow-cyan-500/30 scale-108 animate-pulse'
                          : isSuccessState
                          ? 'border-2 border-dashed border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20'
                          : isErrorState
                          ? 'border-2 border-dashed border-rose-500 bg-rose-500/20 animate-bounce'
                          : selectedCardId
                          ? 'border-2 border-dashed border-cyan-400 bg-cyan-500/15 ring-2 ring-cyan-400/40 animate-pulse hover:bg-cyan-500/25'
                          : 'border-2 border-dashed border-slate-700 bg-slate-900/70 backdrop-blur-sm hover:border-slate-500 hover:bg-slate-800/50'
                      }`}
                    >
                      {placedCard ? (
                        <div className="relative w-full h-full bg-slate-900/90 backdrop-blur-md rounded-[14px] flex flex-col items-center justify-center border border-white/20 group">
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 shadow-md transition-opacity">
                            <X className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className="text-2xl md:text-3xl font-black text-white">
                            {placedCard.displayVal}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5 group-hover:text-rose-300">
                            সরান
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-xs text-slate-500 font-bold">ঘর {toBengaliNumber(slotIdx + 1)}</span>
                          {isHoveredTarget ? (
                            <span className="text-[10px] text-cyan-300 font-extrabold mt-0.5 animate-bounce">ছাড়ুন!</span>
                          ) : selectedCardId ? (
                            <span className="text-[10px] text-cyan-300 font-semibold mt-0.5">এখানে রাখুন</span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* LEVEL 02 CANVAS */}
          {currentLevelIdx === 1 && (
            <>
              <div className="text-center mt-2 flex flex-col items-center gap-1">
                <span className="inline-block px-4 py-1.5 rounded-full bg-slate-800/80 border border-purple-500/30 text-xs md:text-sm text-purple-300 font-medium">
                  🔍 প্রশ্ন: {L2_ROUNDS[l2SubRound].hint}
                </span>
                <span className="text-[11px] text-slate-400">
                  💡 সঠিক সংখ্যাটিতে চিমটি (Pinch) কেটে ধরুন এবং নিচের [ ? ] ঘরে এনে ছাড়ুন।
                </span>
              </div>

              {l2Cards.map((card) => (
                <div
                  key={card.id}
                  style={{
                    left: `${card.x}%`,
                    top: `${card.y}%`,
                    transform: 'translate(-50%, -50%)',
                    transition: draggedCardId === card.id ? 'none' : 'all 150ms ease-out',
                  }}
                  onMouseDown={() => setDraggedCardId(card.id)}
                  onClick={() => handleDropMissingNumber(card)}
                  className={`absolute cursor-pointer z-20 w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-gradient-to-br ${card.color} p-0.5 shadow-xl ${
                    draggedCardId === card.id
                      ? 'scale-115 shadow-2xl ring-4 ring-purple-300'
                      : 'hover:scale-105 hover:-translate-y-1'
                  }`}
                >
                  <div className="w-full h-full bg-slate-900/90 backdrop-blur-md rounded-[14px] flex items-center justify-center border border-white/20">
                    <span className="text-2xl md:text-3xl font-black text-white drop-shadow-md">
                      {card.displayVal}
                    </span>
                  </div>
                </div>
              ))}

              <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center items-center gap-3 md:gap-5 px-4">
                {L2_ROUNDS[l2SubRound].equationTemplate.map((item, idx) => {
                  const isMissing = idx === L2_ROUNDS[l2SubRound].missingIndex;

                  if (isMissing) {
                    return (
                      <div
                        key={`l2-missing-slot-${idx}`}
                        ref={l2SlotRef}
                        className={`w-16 h-20 md:w-20 md:h-24 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all ${
                          l2PlacedCard
                            ? 'border-emerald-400 bg-emerald-500/20'
                            : isHoveringL2Slot
                            ? 'border-cyan-300 bg-cyan-500/30 ring-4 ring-cyan-400 scale-110 shadow-xl shadow-cyan-500/30'
                            : isErrorState
                            ? 'border-rose-500 bg-rose-500/20 animate-bounce'
                            : 'border-purple-400 bg-purple-500/10 ring-4 ring-purple-500/20 animate-pulse'
                        }`}
                      >
                        {l2PlacedCard ? (
                          <span className="text-2xl md:text-3xl font-extrabold text-emerald-400">
                            {l2PlacedCard.displayVal}
                          </span>
                        ) : isHoveringL2Slot ? (
                          <span className="text-xs font-black text-cyan-300 animate-bounce">ছাড়ুন!</span>
                        ) : (
                          <span className="text-xl md:text-2xl font-black text-purple-400">?</span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`l2-fixed-${idx}`}
                      className="w-14 h-18 md:w-18 md:h-22 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-lg"
                    >
                      <span className="text-2xl md:text-3xl font-extrabold text-slate-100">
                        {toBengaliNumber(item)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* LEVEL 03 CANVAS */}
          {currentLevelIdx === 2 && (
            <>
              <div className="text-center mt-2">
                <div className="inline-block px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border border-amber-400/40 shadow-lg">
                  <div className="text-xs text-amber-300 font-semibold">সঠিক টার্গেটে চিমটি (Pinch) বা ক্লিক করো:</div>
                  <div className="text-xl md:text-2xl font-black text-white mt-0.5">
                    {L3_ROUNDS[l3Round].questionText}
                  </div>
                </div>
              </div>

              {l3Targets.map((target) => (
                <div
                  key={target.id}
                  style={{
                    left: `${target.x}%`,
                    top: `${target.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => handlePopTarget(target)}
                  className={`absolute cursor-pointer z-20 w-20 h-24 md:w-24 md:h-28 rounded-3xl bg-gradient-to-tr ${target.color} p-0.5 shadow-2xl transition-all duration-300 ${
                    target.isPopping ? 'scale-150 opacity-0' : hoveredTargetId === target.id ? 'scale-125 ring-4 ring-amber-300 shadow-amber-500/30' : 'hover:scale-110'
                  }`}
                >
                  <div className="relative w-full h-full bg-slate-900/85 backdrop-blur-md rounded-[22px] flex flex-col items-center justify-center border border-white/20">
                    {hoveredTargetId === target.id && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Crosshair className="w-14 h-14 text-amber-400 animate-spin" />
                      </div>
                    )}
                    <span className="text-3xl md:text-4xl font-black text-white drop-shadow-md">
                      {target.displayVal}
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold tracking-widest mt-1 uppercase">
                      টার্গেট
                    </span>
                  </div>
                </div>
              ))}

              <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-2">
                {L3_ROUNDS.map((_, idx) => (
                  <div
                    key={`round-dot-${idx}`}
                    className={`h-2 rounded-full transition-all ${
                      idx === l3Round ? 'w-8 bg-amber-400' : idx < l3Round ? 'w-4 bg-emerald-400' : 'w-4 bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 5. VICTORY SCREEN WITH PERFORMANCE REPORT */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
          <div className="max-w-lg w-full bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 mx-auto shadow-2xl shadow-emerald-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
                <Award className="w-10 h-10 text-emerald-400 animate-bounce" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-black text-emerald-400">অভিনন্দন! গেম সম্পন্ন</h2>
              <p className="text-slate-300 text-xs md:text-sm">
                {currentPlayer?.name ? `${currentPlayer.name}, আপনার গেম রিপোর্ট প্রস্তুত:` : 'আপনার গেমের ফলাফল:'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-amber-400">
              <Star className="w-6 h-6 fill-current animate-pulse" />
              <Star className={`w-6 h-6 ${mistakesCount <= 2 ? 'fill-current animate-pulse' : 'text-slate-600'}`} />
              <Star className={`w-6 h-6 ${mistakesCount === 0 ? 'fill-current animate-pulse' : 'text-slate-600'}`} />
            </div>

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
                <span>আবার খেলুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
