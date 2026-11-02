import React, { useState } from 'react';
import { AVATAR_OPTIONS, PlayerProfile, saveCurrentPlayer } from '../utils/storage';
import { sound } from '../utils/sound';
import { Sparkles, User, ArrowRight, ShieldCheck, X } from 'lucide-react';

interface RegistrationModalProps {
  isOpen: boolean;
  currentPlayer: PlayerProfile | null;
  onRegistered: (player: PlayerProfile) => void;
  onClose?: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  currentPlayer,
  onRegistered,
  onClose,
}) => {
  const [name, setName] = useState<string>(currentPlayer?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentPlayer?.avatar || '🚀');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('অনুগ্রহ করে আপনার নাম লিখুন!');
      sound.playWrong();
      return;
    }
    if (trimmed.length < 2) {
      setError('নাম অন্তত ২টি অক্ষরের হতে হবে!');
      sound.playWrong();
      return;
    }

    sound.playSuccess();
    const player = saveCurrentPlayer(trimmed, selectedAvatar);
    onRegistered(player);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in font-['Hind_Siliguri',sans-serif]">
      <div className="relative max-w-md w-full bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-6">
        {/* Close button if user already registered and just editing */}
        {currentPlayer && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
            title="বাতিল"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 p-0.5 mx-auto shadow-lg shadow-indigo-500/30">
          <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-3xl">
            {selectedAvatar}
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-300 via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
            {currentPlayer ? 'প্রোফাইল পরিবর্তন করুন' : 'AR গণিত গেমসে স্বাগতম!'}
          </h2>
          <p className="text-xs md:text-sm text-slate-300">
            {currentPlayer
              ? 'আপনার নাম বা পছন্দের প্রতীক পরিবর্তন করে শুরু করুন'
              : 'খেলা শুরু করতে ও র‍্যাংকিংয়ে নাম তুলতে প্রথমে রেজিস্ট্রেশন করুন:'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          {/* Avatar selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              পছন্দের চরিত্র (Avatar) বেছে নিন:
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {AVATAR_OPTIONS.map((avatar) => {
                const isSelected = selectedAvatar === avatar;
                return (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(avatar);
                      sound.playPinch();
                    }}
                    className={`h-12 rounded-2xl text-2xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 scale-105 ring-2 ring-cyan-300 shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {avatar}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>আপনার নাম:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="যেমন: আরিয়ান / আনিকা / সাকিব"
                maxLength={25}
                autoFocus
                className="w-full px-4 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-slate-100 placeholder-slate-500 text-sm md:text-base outline-none transition-all"
              />
            </div>
            {error && <p className="text-xs text-rose-400 font-semibold mt-1.5">{error}</p>}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-base shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01]"
            >
              <span>{currentPlayer ? 'সংরক্ষণ করুন' : 'রেজিস্ট্রেশন করুন ও খেলুন'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>আপনার স্কোর ও ফলাফল স্বয়ংক্রিয়ভাবে লিডারবোর্ডে যুক্ত হবে</span>
        </div>
      </div>
    </div>
  );
};
