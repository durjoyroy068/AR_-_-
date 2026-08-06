import React, { useState, useCallback } from 'react';
import { CursorFeedbackState, GameType, Point2D } from './types';
import { sound } from './utils/sound';
import { Navbar } from './components/Navbar';
import { MediaPipeCanvas } from './components/MediaPipeCanvas';
import { Game1EquationArrangement } from './components/Game1EquationArrangement';
import { Game2IntegerClassification } from './components/Game2IntegerClassification';
import { Game3QuickMath } from './components/Game3QuickMath';

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType>('equation');
  const [cursorPos, setCursorPos] = useState<Point2D>({ x: -100, y: -100 });
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [isHandPresent, setIsHandPresent] = useState<boolean>(false);
  const [cursorFeedback, setCursorFeedback] = useState<CursorFeedbackState>('normal');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [totalScore, setTotalScore] = useState<number>(0);

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

  const getGameTitle = () => {
    switch (activeGame) {
      case 'equation':
        return 'গেম ১: AR সমীকরণ সাজাও';
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
            />
          )}

          {activeGame === 'classification' && (
            <Game2IntegerClassification
              cursorPos={cursorPos}
              isPinching={isPinching}
              isHandPresent={isHandPresent}
              setCursorFeedback={handleSetCursorFeedback}
            />
          )}

          {activeGame === 'quickmath' && (
            <Game3QuickMath
              cursorPos={cursorPos}
              isPinching={isPinching}
              isHandPresent={isHandPresent}
              setCursorFeedback={handleSetCursorFeedback}
            />
          )}
        </MediaPipeCanvas>
      </main>
    </div>
  );
}
