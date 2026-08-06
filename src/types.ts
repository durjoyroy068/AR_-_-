export type GameType = 'equation' | 'classification' | 'quickmath';

export type CursorFeedbackState = 'normal' | 'hover' | 'miss' | 'success' | 'wrong';

export interface Point2D {
  x: number; // Normalized [0, 1] or Pixel
  y: number;
}

export interface CardItem {
  id: string;
  value: string;
  displayValue: string;
  x: number; // Percent 0-100 or canvas coords
  y: number;
  width?: number;
  height?: number;
  isDragging?: boolean;
  isPlaced?: boolean;
  placedSlotIndex?: number | null;
  category?: 'negative' | 'zero' | 'positive'; // for Game 2
  numericVal?: number; // evaluation value
}

export interface EquationLevel {
  id: number;
  question: string;
  cards: string[];
  expectedSolution: string[]; // e.g. ["1", "+", "1", "=", "2"]
}

export type IntegerCategory = 'negative' | 'zero' | 'positive';

export interface ClassificationCard {
  id: string;
  label: string; // e.g., "2/2", "-10/5", "|-100|"
  numericVal: number;
  category: IntegerCategory;
  x: number;
  y: number;
  isPlaced?: boolean;
  placedSlotIndex?: IntegerCategory | null;
}

export interface ClassificationLevel {
  id: number;
  title: string;
  items: { label: string; numericVal: number; category: IntegerCategory }[];
}

export interface QuickMathQuestion {
  id: number;
  questionText: string;
  options: { label: string; value: number; isCorrect: boolean }[];
  correctValue: number;
}

export interface Balloon {
  id: string;
  label: string;
  value: number;
  isCorrect: boolean;
  x: number; // relative % 10-90
  y: number; // relative % 10-90
  vx: number;
  vy: number;
  color: string;
  isPopping?: boolean;
}

declare global {
  interface Window {
    Hands?: any;
    Camera?: any;
    drawLandmarks?: any;
    drawConnectors?: any;
    HAND_CONNECTIONS?: any;
  }
}
