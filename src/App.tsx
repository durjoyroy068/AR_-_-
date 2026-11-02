import React, { useState, useCallback, useEffect } from 'react';
import { CursorFeedbackState, GameType, Point2D } from './types';
import { sound } from './utils/sound';
import { getCurrentPlayer, PlayerProfile } from './utils/storage';
import { Navbar } from './components/Navbar';
import { MediaPipeCanvas } from './components/MediaPipeCanvas';
import { Game1EquationArrangement } from './components/Game1EquationArrangement';
import { Game2IntegerClassification } from './components/Game2IntegerClassification';
import { Game3QuickMath } from './components/Game3QuickMath';
import { RegistrationModal } from './components/RegistrationModal';
import { DashboardModal } from './components/DashboardModal';

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType>('equation');
  const [cursorPos, setCursorPos] = useState<Point2D>({ x: -100, y: -100 });
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [isHandPresent, setIsHandPresent] = useState<boolean>(false);
  const [cursorFeedback, setCursorFeedback] = useState<CursorFeedbackState>('normal');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [totalScore, setTotalScore] = useState<number>(0);

  // User Profile & Registration State
  const [currentPlayer, setCurrentPlayer] = useState<PlayerProfile | null>(() => getCurrentPlayer());
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean>(() => !getCurrentPlayer());
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);

  // If no player is registered, prompt registration
  useEffect(() => {
    if (!currentPlayer) {
      setIsRegistrationOpen(true);
    }
  }, [currentPlayer]);

  const handleSelectGame = (game: GameType) => {
    setActiveGame(game);
    setCursorFeedback('normal');
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sound.isMuted = nextMute;
  };

  const handleCursorMove = useCallback((pos: Point2D, pinching: boolean, handPresent: boolean) => {
    setCursorPos((prev) => (prev.x === pos.x && prev.y === pos.y ? prev : pos));
    setIsPinching((prev) => (prev === pinching ? prev : pinching));
    setIsHandPresent((prev) => (prev === handPresent ? prev : handPresent));
  }, []);

  const handleSetCursorFeedback = useCallback((feedback: CursorFeedbackState) => {
    setCursorFeedback((prev) => (prev === feedback ? prev : feedback));
  }, []);

  const handleRegistered = (player: PlayerProfile) => {
    setCurrentPlayer(player);
    setIsRegistrationOpen(false);
  };

  const getGameTitle = () => {
    switch (activeGame) {
      case 'equation':
        return 'গেম ১: AR সমীকরণ ও লক্ষ্য';
      case 'classification':
        return 'গেম ২: AR পূর্ণসংখ্যা শ্রেণিবিন্যাস';
      case 'quickmath':
        return 'গেম ৩: AR দ্রুত গণনা';
      default:
        return 'AR গণিত গেম';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Hind_Siliguri',sans-serif]">
      {/* Global Header Navigation */}
      <Navbar
        activeGame={activeGame}
        onSelectGame={handleSelectGame}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        totalScore={totalScore}
        currentPlayer={currentPlayer}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onOpenProfile={() => setIsRegistrationOpen(true)}
      />

      {/* MediaPipe AR Canvas Wrapper */}
      <main className="flex-1 relative overflow-hidden">
        <MediaPipeCanvas
          gameType={activeGame}
          cursorFeedback={cursorFeedback}
          onCursorMove={handleCursorMove}
          activeGameTitle={getGameTitle()}
        >
          {activeGame === 'equation' && (
            <Game1EquationArrangement
              cursorPos={cursorPos}
              isPinching={isPinching}
              isHandPresent={isHandPresent}
              setCursorFeedback={handleSetCursorFeedback}
              currentPlayer={currentPlayer}
              onOpenDashboard={() => setIsDashboardOpen(true)}
            />
          )}

          {activeGame === 'classification' && (
            <Game2IntegerClassification
              cursorPos={cursorPos}
              isPinching={isPinching}
              isHandPresent={isHandPresent}
              setCursorFeedback={handleSetCursorFeedback}
              currentPlayer={currentPlayer}
              onOpenDashboard={() => setIsDashboardOpen(true)}
            />
          )}

          {activeGame === 'quickmath' && (
            <Game3QuickMath
              cursorPos={cursorPos}
              isPinching={isPinching}
              isHandPresent={isHandPresent}
              setCursorFeedback={handleSetCursorFeedback}
              currentPlayer={currentPlayer}
              onOpenDashboard={() => setIsDashboardOpen(true)}
            />
          )}
        </MediaPipeCanvas>
      </main>

      {/* Mandatory Registration Modal on first visit / Profile Edit */}
      <RegistrationModal
        isOpen={isRegistrationOpen}
        currentPlayer={currentPlayer}
        onRegistered={handleRegistered}
        onClose={currentPlayer ? () => setIsRegistrationOpen(false) : undefined}
      />

      {/* Full Leaderboard & Analytics Dashboard Modal */}
      <DashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        currentPlayer={currentPlayer}
        onPlayGame={(game) => {
          setIsDashboardOpen(false);
          setActiveGame(game);
        }}
      />
    </div>
  );
}
