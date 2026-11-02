import { GameType } from '../types';
import { toBengaliNumber } from './numberConverter';

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  createdAt: number;
}

export interface LeaderboardEntry {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  gameType: GameType;
  gameTitle: string;
  score: number;
  mistakes: number;
  accuracy: number; // Percentage (e.g. 95)
  timestamp: number;
  formattedDate: string;
}

const PLAYER_STORAGE_KEY = 'ar_math_current_player';
const LEADERBOARD_STORAGE_KEY = 'ar_math_leaderboard_data';

export const AVATAR_OPTIONS = ['🚀', '🦁', '🌟', '🎓', '🤖', '⚡', '🦉', '🎨'];

// Initial mock records to make the leaderboard engaging from day one
const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'lead-1',
    playerId: 'p-sajib',
    playerName: 'সাকিব আহমেদ',
    playerAvatar: '🚀',
    gameType: 'equation',
    gameTitle: 'গেম ১: সমীকরণ সাজাও',
    score: 300,
    mistakes: 0,
    accuracy: 100,
    timestamp: Date.now() - 3600000 * 2,
    formattedDate: 'আজ, দুপুর ২:৩০',
  },
  {
    id: 'lead-2',
    playerId: 'p-anika',
    playerName: 'আনিকা তাবাসসুম',
    playerAvatar: '🌟',
    gameType: 'classification',
    gameTitle: 'গেম ২: পূর্ণসংখ্যা শ্রেণিবিন্যাস',
    score: 320,
    mistakes: 1,
    accuracy: 94,
    timestamp: Date.now() - 3600000 * 5,
    formattedDate: 'আজ, সকাল ১১:১৫',
  },
  {
    id: 'lead-3',
    playerId: 'p-aryan',
    playerName: 'আরিয়ান রহমান',
    playerAvatar: '🦁',
    gameType: 'quickmath',
    gameTitle: 'গেম ৩: দ্রুত গণনা',
    score: 310,
    mistakes: 1,
    accuracy: 91,
    timestamp: Date.now() - 3600000 * 8,
    formattedDate: 'গতকাল, সন্ধ্যা ৭:৪৫',
  },
  {
    id: 'lead-4',
    playerId: 'p-tasnim',
    playerName: 'তাসনিম জাহান',
    playerAvatar: '🎓',
    gameType: 'equation',
    gameTitle: 'গেম ১: সমীকরণ সাজাও',
    score: 250,
    mistakes: 2,
    accuracy: 85,
    timestamp: Date.now() - 3600000 * 12,
    formattedDate: 'গতকাল, বিকেল ৪:১০',
  },
  {
    id: 'lead-5',
    playerId: 'p-rafsan',
    playerName: 'রাফসান কবির',
    playerAvatar: '⚡',
    gameType: 'quickmath',
    gameTitle: 'গেম ৩: দ্রুত গণনা',
    score: 270,
    mistakes: 2,
    accuracy: 86,
    timestamp: Date.now() - 3600000 * 20,
    formattedDate: '২ দিন আগে',
  },
];

export function getCurrentPlayer(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return null;
  }
}

export function saveCurrentPlayer(name: string, avatar: string): PlayerProfile {
  const existing = getCurrentPlayer();
  const player: PlayerProfile = {
    id: existing?.id || `player-${Date.now()}`,
    name: name.trim(),
    avatar: avatar || '🚀',
    createdAt: existing?.createdAt || Date.now(),
  };
  try {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  } catch (e) {
    console.error('Failed to save player in localStorage', e);
  }
  return player;
}

export function clearCurrentPlayer(): void {
  try {
    localStorage.removeItem(PLAYER_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear player from localStorage', e);
  }
}

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) {
      // Seed with initial records
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(INITIAL_LEADERBOARD));
      return INITIAL_LEADERBOARD;
    }
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return INITIAL_LEADERBOARD;
  }
}

export function saveGameScore(entry: {
  player: PlayerProfile;
  gameType: GameType;
  gameTitle: string;
  score: number;
  mistakes: number;
}): LeaderboardEntry {
  const allEntries = getLeaderboard();
  
  // Calculate accuracy: perfect is 100%, each mistake deducts proportionally
  const accuracy = Math.max(0, Math.min(100, Math.round(100 - entry.mistakes * 10)));
  
  const now = new Date();
  const timeStr = `${toBengaliNumber(now.getHours() % 12 || 12)}:${toBengaliNumber(
    now.getMinutes().toString().padStart(2, '0')
  )} ${now.getHours() >= 12 ? 'বিকাল' : 'সকাল'}`;

  const newEntry: LeaderboardEntry = {
    id: `entry-${Date.now()}`,
    playerId: entry.player.id,
    playerName: entry.player.name,
    playerAvatar: entry.player.avatar,
    gameType: entry.gameType,
    gameTitle: entry.gameTitle,
    score: entry.score,
    mistakes: entry.mistakes,
    accuracy,
    timestamp: Date.now(),
    formattedDate: `আজ, ${timeStr}`,
  };

  const updated = [newEntry, ...allEntries];
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save score to leaderboard', e);
  }

  return newEntry;
}

export function getPlayerLifetimeStats(playerId: string) {
  const all = getLeaderboard().filter((e) => e.playerId === playerId);
  const totalGames = all.length;
  const totalScore = all.reduce((sum, e) => sum + e.score, 0);
  const totalMistakes = all.reduce((sum, e) => sum + e.mistakes, 0);
  const bestScore = all.reduce((max, e) => Math.max(max, e.score), 0);
  const avgAccuracy = totalGames > 0 ? Math.round(all.reduce((sum, e) => sum + e.accuracy, 0) / totalGames) : 100;

  return {
    totalGames,
    totalScore,
    totalMistakes,
    bestScore,
    avgAccuracy,
  };
}
