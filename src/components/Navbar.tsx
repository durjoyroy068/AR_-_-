import React from 'react';
import { GameType } from '../types';
import { PlayerProfile } from '../utils/storage';
import { sound } from '../utils/sound';
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Binary, 
  Calculator, 
  Hash, 
  Trophy, 
  UserCircle2 
} from 'lucide-react';

interface NavbarProps {
  activeGame: GameType;
  onSelectGame: (game: GameType) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  totalScore: number;
  currentPlayer: PlayerProfile | null;
  onOpenDashboard: () => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeGame,
  onSelectGame,
  isMuted,
  onToggleMute,
  totalScore,
  currentPlayer,
  onOpenDashboard,
  onOpenProfile,
}) => {
  return (
    <header className="h-[80px] bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-3 md:px-8 flex items-center justify-between z-40 relative font-['Hind_Siliguri',sans-serif]">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 p-0.5 shadow-lg shadow-indigo-500/20">
          <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="hidden sm:block">
          <h1 className="text-base md:text-lg font-extrabold bg-gradient-to-r from-cyan-300 via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
            AR গণিত গেমস
          </h1>
          <p className="text-[11px] text-slate-400">
            স্মার্ট হ্যান্ড-ট্র্যাকিং শিক্ষা
          </p>
        </div>
      </div>

      {/* Game Selection Tabs */}
      <nav className="flex items-center bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
        <button
          onClick={() => onSelectGame('equation')}
          className={`px-2.5 md:px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-all ${
            activeGame === 'equation'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Binary className="w-3.5 h-3.5 text-cyan-300" />
          <span className="hidden md:inline">গেম ১:</span>
          <span>সমীকরণ</span>
        </button>

        <button
          onClick={() => onSelectGame('classification')}
          className={`px-2.5 md:px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-all ${
            activeGame === 'classification'
              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Hash className="w-3.5 h-3.5 text-pink-300" />
          <span className="hidden md:inline">গেম ২:</span>
          <span>পূর্ণসংখ্যা</span>
        </button>

        <button
          onClick={() => onSelectGame('quickmath')}
          className={`px-2.5 md:px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-all ${
            activeGame === 'quickmath'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden md:inline">গেম ৩:</span>
          <span>দ্রুত গণনা</span>
        </button>
      </nav>

      {/* Right Actions: Leaderboard / Dashboard + Player Profile + Audio */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Dashboard Button */}
        <button
          onClick={() => {
            sound.playPinch();
            onOpenDashboard();
          }}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs md:text-sm flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-all hover:scale-105"
          title="র‍্যাংকিং ও ড্যাশবোর্ড"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">ড্যাশবোর্ড</span>
        </button>

        {/* Player Profile Chip */}
        {currentPlayer ? (
          <button
            onClick={() => {
              sound.playPinch();
              onOpenProfile();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 text-xs md:text-sm font-semibold transition-all shadow-md group"
            title="প্রোফাইল পরিবর্তন"
          >
            <span className="text-base">{currentPlayer.avatar}</span>
            <span className="max-w-[70px] md:max-w-[100px] truncate group-hover:text-cyan-300">
              {currentPlayer.name}
            </span>
          </button>
        ) : (
          <button
            onClick={() => {
              sound.playPinch();
              onOpenProfile();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all"
          >
            <UserCircle2 className="w-4 h-4" />
            <span>রেজিস্ট্রেশন</span>
          </button>
        )}

        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'শব্দ চালু করুন' : 'শব্দ বন্ধ করুন'}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all shadow-md"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>
    </header>
  );
};
