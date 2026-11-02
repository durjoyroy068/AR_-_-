import React, { useState, useEffect } from 'react';
import { GameType } from '../types';
import { 
  getLeaderboard, 
  getPlayerLifetimeStats, 
  LeaderboardEntry, 
  PlayerProfile,
  mergeCloudLeaderboard
} from '../utils/storage';
import { subscribeCloudLeaderboard } from '../utils/firebase';
import { toBengaliNumber } from '../utils/numberConverter';
import { sound } from '../utils/sound';
import { 
  Trophy, 
  X, 
  Medal, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  BarChart3, 
  Clock, 
  Sparkles,
  Binary,
  Hash,
  Calculator,
  Cloud
} from 'lucide-react';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlayer: PlayerProfile | null;
  onPlayGame?: (game: GameType) => void;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({
  isOpen,
  onClose,
  currentPlayer,
  onPlayGame,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | GameType>('all');
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>(() => getLeaderboard());
  const [isCloudLive, setIsCloudLive] = useState<boolean>(true);

  // Real-time synchronization with Firebase Firestore Cloud Database
  useEffect(() => {
    if (!isOpen) return;

    // Load initial cached records
    setAllEntries(getLeaderboard());

    // Listen for live updates whenever any student anywhere saves a score
    const unsubscribe = subscribeCloudLeaderboard((cloudEntries) => {
      const merged = mergeCloudLeaderboard(cloudEntries);
      setAllEntries(merged);
      setIsCloudLive(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter entries based on active tab
  const filteredEntries = (activeTab === 'all'
    ? allEntries
    : allEntries.filter((e) => e.gameType === activeTab)
  ).sort((a, b) => {
    // Sort primarily by score descending, then by mistakes ascending
    if (b.score !== a.score) return b.score - a.score;
    return a.mistakes - b.mistakes;
  });

  const playerStats = currentPlayer ? getPlayerLifetimeStats(currentPlayer.id) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-xl animate-fade-in font-['Hind_Siliguri',sans-serif]">
      <div className="relative max-w-4xl w-full max-h-[92vh] bg-slate-900/95 border border-slate-700/80 rounded-3xl p-5 md:p-8 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                <span>গণিত ড্যাশবোর্ড ও র‍্যাংকিং</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold">
                  শীর্ষ তালিকা
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ক্লাউড লাইভ (Firebase)</span>
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                সকল শিক্ষার্থীর অর্জিত স্কোর, ভুলের সংখ্যা ও নির্ভুলতার পরিসংখ্যান (রিয়েল-টাইম সিঙ্ক)
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playRelease();
              onClose();
            }}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all shadow-md"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-5 custom-scrollbar">
          {/* Current Player Personal Stats Card */}
          {currentPlayer && playerStats && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-indigo-950/60 border border-blue-500/30 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-white/20 flex items-center justify-center text-3xl shadow-inner">
                    {currentPlayer.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">{currentPlayer.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                        আপনার প্রোফাইল
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      মোট সম্পন্ন খেলা: <span className="font-bold text-slate-200">{toBengaliNumber(playerStats.totalGames)} টি</span>
                    </p>
                  </div>
                </div>

                {/* Micro Stat Badges */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700">
                    <div className="text-[11px] text-slate-400">মোট স্কোর</div>
                    <div className="text-base font-extrabold text-amber-400 mt-0.5">
                      {toBengaliNumber(playerStats.totalScore)}
                    </div>
                  </div>

                  <div className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700">
                    <div className="text-[11px] text-slate-400">ভুলের সংখ্যা</div>
                    <div className="text-base font-extrabold text-rose-400 mt-0.5">
                      {toBengaliNumber(playerStats.totalMistakes)}
                    </div>
                  </div>

                  <div className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700">
                    <div className="text-[11px] text-slate-400">নির্ভুলতা</div>
                    <div className="text-base font-extrabold text-emerald-400 mt-0.5">
                      {toBengaliNumber(playerStats.avgAccuracy)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => {
                setActiveTab('all');
                sound.playPinch();
              }}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>সামগ্রিক র‍্যাংকিং</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('equation');
                sound.playPinch();
              }}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'equation'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <Binary className="w-4 h-4 text-cyan-300" />
              <span>গেম ১: সমীকরণ</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('classification');
                sound.playPinch();
              }}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'classification'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <Hash className="w-4 h-4 text-pink-300" />
              <span>গেম ২: পূর্ণসংখ্যা</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('quickmath');
                sound.playPinch();
              }}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'quickmath'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <Calculator className="w-4 h-4 text-amber-300" />
              <span>গেম ৩: দ্রুত গণনা</span>
            </button>
          </div>

          {/* Top 3 Podium Highlights (if available) */}
          {filteredEntries.length >= 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* #2 Rank */}
              <div className="order-2 sm:order-1 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col items-center text-center relative">
                <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center shadow-md -mt-2">
                  ২
                </div>
                <div className="text-2xl mt-1">{filteredEntries[1].playerAvatar}</div>
                <div className="font-bold text-sm text-slate-200 mt-1 truncate max-w-[150px]">
                  {filteredEntries[1].playerName}
                </div>
                <div className="text-xs text-amber-400 font-extrabold mt-0.5">
                  স্কোর: {toBengaliNumber(filteredEntries[1].score)}
                </div>
                <div className="text-[11px] text-rose-300 font-medium">
                  ভুল: {toBengaliNumber(filteredEntries[1].mistakes)} বার
                </div>
              </div>

              {/* #1 Rank (Gold) */}
              <div className="order-1 sm:order-2 p-4 rounded-2xl bg-gradient-to-b from-amber-500/20 to-slate-900/90 border border-amber-400/50 flex flex-col items-center text-center relative shadow-lg shadow-amber-500/10 scale-105">
                <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg -mt-3 ring-2 ring-amber-300">
                  🥇 ১
                </div>
                <div className="text-3xl mt-1">{filteredEntries[0].playerAvatar}</div>
                <div className="font-black text-base text-white mt-1 truncate max-w-[180px]">
                  {filteredEntries[0].playerName}
                </div>
                <div className="text-sm text-amber-400 font-black mt-0.5">
                  স্কোর: {toBengaliNumber(filteredEntries[0].score)}
                </div>
                <div className="text-xs text-emerald-300 font-bold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>নির্ভুলতা: {toBengaliNumber(filteredEntries[0].accuracy)}%</span>
                </div>
              </div>

              {/* #3 Rank */}
              <div className="order-3 sm:order-3 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col items-center text-center relative">
                <div className="w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-md -mt-2">
                  ৩
                </div>
                <div className="text-2xl mt-1">{filteredEntries[2].playerAvatar}</div>
                <div className="font-bold text-sm text-slate-200 mt-1 truncate max-w-[150px]">
                  {filteredEntries[2].playerName}
                </div>
                <div className="text-xs text-amber-400 font-extrabold mt-0.5">
                  স্কোর: {toBengaliNumber(filteredEntries[2].score)}
                </div>
                <div className="text-[11px] text-rose-300 font-medium">
                  ভুল: {toBengaliNumber(filteredEntries[2].mistakes)} বার
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50">
            <div className="grid grid-cols-12 gap-2 p-3 bg-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <div className="col-span-1 text-center">র‍্যাংক</div>
              <div className="col-span-4">শিক্ষার্থী</div>
              <div className="col-span-3">গেম</div>
              <div className="col-span-2 text-center">স্কোর</div>
              <div className="col-span-2 text-center">ভুল সংখ্যা</div>
            </div>

            <div className="divide-y divide-slate-800/60">
              {filteredEntries.map((entry, idx) => {
                const isCurrent = currentPlayer && entry.playerId === currentPlayer.id;

                return (
                  <div
                    key={entry.id}
                    className={`grid grid-cols-12 gap-2 p-3 items-center text-xs md:text-sm transition-colors ${
                      isCurrent
                        ? 'bg-blue-500/10 hover:bg-blue-500/20'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Rank position */}
                    <div className="col-span-1 text-center font-black">
                      {idx === 0 ? (
                        <span className="text-amber-400 font-black">🥇 ১</span>
                      ) : idx === 1 ? (
                        <span className="text-slate-300 font-black">🥈 ২</span>
                      ) : idx === 2 ? (
                        <span className="text-amber-600 font-black">🥉 ৩</span>
                      ) : (
                        <span className="text-slate-400">{toBengaliNumber(idx + 1)}</span>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="col-span-4 flex items-center gap-2 truncate">
                      <span className="text-lg">{entry.playerAvatar}</span>
                      <div className="truncate">
                        <div className="font-bold text-slate-100 truncate flex items-center gap-1.5">
                          <span>{entry.playerName}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              আপনি
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{entry.formattedDate}</div>
                      </div>
                    </div>

                    {/* Game Name */}
                    <div className="col-span-3 text-xs text-slate-300 truncate">
                      {entry.gameTitle}
                    </div>

                    {/* Score */}
                    <div className="col-span-2 text-center font-black text-amber-400">
                      {toBengaliNumber(entry.score)}
                    </div>

                    {/* Mistakes */}
                    <div className="col-span-2 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                          entry.mistakes === 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {toBengaliNumber(entry.mistakes)} বার
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredEntries.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">
                  কোনো রেকর্ড পাওয়া যায়নি। এখনই গেম খেলে স্কোর যোগ করুন!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400 hidden sm:block">
            💡 যত কম ভুলে বেশি পয়েন্ট অর্জন করবেন, তত ওপরে আপনার র‍্যাংক থাকবে!
          </div>

          <button
            onClick={() => {
              sound.playPinch();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all ml-auto"
          >
            গেমে ফিরে যান
          </button>
        </div>
      </div>
    </div>
  );
};
