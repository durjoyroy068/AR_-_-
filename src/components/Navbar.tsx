import React from 'react';
import { GameType } from '../types';
import { sound } from '../utils/sound';
import { Volume2, VolumeX, Sparkles, Binary, Calculator, Hash } from 'lucide-react';

interface NavbarProps {
  activeGame: GameType;
  onSelectGame: (game: GameType) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  totalScore: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeGame,
  onSelectGame,
  isMuted,
  onToggleMute,
  totalScore,
}) => {
  return (
    <header className="h-[80px] bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 md:px-8 flex items-center justify-between z-40 relative">
      {/* Brand / Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 p-0.5 shadow-lg shadow-indigo-500/20">
          <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-cyan-300 via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
            AR গণিত গেমস
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">
            স্মার্ট হাত ও অগমেন্টেড রিয়্যালিটি শিক্ষা
          </p>
        </div>
      </div>

      {/* Game Tabs */}
      <nav className="flex items-center bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
        <button
          onClick={() => onSelectGame('equation')}
          className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium flex items-center gap-2 transition-all ${
            activeGame === 'equation'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Binary className="w-4 h-4 text-cyan-300" />
          <span className="hidden sm:inline">গেম ১:</span>
          <span>সমীকরণ সাজাও</span>
        </button>

        <button
          onClick={() => onSelectGame('classification')}
          className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium flex items-center gap-2 transition-all ${
            activeGame === 'classification'
              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Hash className="w-4 h-4 text-pink-300" />
          <span className="hidden sm:inline">গেম ২:</span>
          <span>পূর্ণসংখ্যা শ্রেণিবিন্যাস</span>
        </button>

        <button
          onClick={() => onSelectGame('quickmath')}
          className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium flex items-center gap-2 transition-all ${
            activeGame === 'quickmath'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-300" />
          <span className="hidden sm:inline">গেম ৩:</span>
          <span>দ্রুত গণনা</span>
        </button>
      </nav>

      {/* Right Actions: Mute sound */}
      <div className="flex items-center gap-3">
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
