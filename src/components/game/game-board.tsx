
"use client";

import { useState, useEffect, useCallback, MouseEvent, TouchEvent, memo } from 'react';
import { GameState as SolitaireGameState, createInitialState as createSolitaireInitialState, Card as CardType } from '@/lib/solitaire';
import { GameState as FreecellGameState, createInitialState as createFreecellInitialState } from '@/lib/freecell';
import { GameState as SpiderGameState, createInitialState as createSpiderInitialState } from '@/lib/spider';
import { processCardClick, isGameWon, GameState, LocatedCard, CardLocation } from '@/lib/game-logic';
import { log } from '@/lib/utils';

import GameHeader from './game-header';
import SolitaireBoard from './solitaire-board';
import FreecellBoard from './freecell-board';
import SpiderBoard from './spider-board';
import GameFooter from './game-footer';
import VictoryDialog from './victory-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsDialog } from './settings-dialog';
import { GameDialog } from './game-dialog';
import { UndoButton } from './undo-button';

import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { useStats } from '@/hooks/use-stats';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { cn } from '@/lib/utils';

export type HighlightedPile = {
  type: 'tableau' | 'foundation' | 'freecell';
  pileIndex: number;
} | null;

const UNDO_LIMIT = 100;


// ================================================================================================
// GameUI Component
// This component is memoized to prevent re-renders caused by the timer in the footer.
// ================================================================================================
interface GameUIProps {
  gameState: GameState;
  isWon: boolean;
  selectedCard: LocatedCard | null;
  highlightedPile: HighlightedPile | null;
  historyLength: number;
  handleNewGame: () => void;
  handleUndo: () => void;
  handleDraw: () => void;
  handleCardClick: (card: CardType | undefined, location: CardLocation) => void;
  handleMouseDown: (e: MouseEvent, card: CardType, location: CardLocation) => void;
  handleTouchStart: (e: TouchEvent, card: CardType, location: CardLocation) => void;
  handleDrop: (location: CardLocation) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsGameMenuOpen: (isOpen: boolean) => void;
}

const GameUI = memo(({
  gameState,
  isWon,
  selectedCard,
  highlightedPile,
  historyLength,
  handleNewGame,
  handleUndo,
  handleDraw,
  handleCardClick,
  handleMouseDown,
  handleTouchStart,
  handleDrop,
  setIsSettingsOpen,
  setIsGameMenuOpen
}: GameUIProps) => {
  log('GameUI: render');
  const mainContainerMaxWidth = gameState.gameType === 'Spider' 
  ? 'md:max-w-[480px]' 
  : (gameState.gameType === 'Freecell' ? 'md:max-w-[480px]' : 'md:max-w-[480px]');

  const boardProps = {
    gameState: gameState as any,
    selectedCard,
    highlightedPile,
    handleCardClick,
    handleMouseDown,
    handleTouchStart,
    handleDrop,
    handleDraw
  };

  return (
    <div 
      className="flex flex-col min-h-screen"
      data-testid="game-board"
    >
      <GameHeader 
        onNewGame={handleNewGame} 
        onSettings={() => setIsSettingsOpen(true)}
        onGameMenuOpen={() => setIsGameMenuOpen(true)}
      />
      <main className={cn("flex-grow p-2 w-full md:mx-auto", mainContainerMaxWidth)}>
        {gameState.gameType === 'Solitaire' && <SolitaireBoard {...boardProps} />}
        {gameState.gameType === 'Freecell' && <FreecellBoard {...boardProps} />}
        {gameState.gameType === 'Spider' && <SpiderBoard {...boardProps} />}
      </main>

      <UndoButton onUndo={handleUndo} canUndo={historyLength > 0} />
      
      <GameFooter 
        moves={gameState.moves}
        isWon={isWon}
        score={isWon ? gameState.score : undefined}
      />
    </div>
  );
});
GameUI.displayName = 'GameUI';


// ================================================================================================
// GameBoard Component (Main State Controller)
// ================================================================================================
export default function GameBoard() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const { stats, updateStats } = useStats();
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [isWon, setIsWon] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedCard, setSelectedCard] = useState<LocatedCard | null>(null);
  const [highlightedPile, setHighlightedPile] = useState<HighlightedPile | null>(null);

  useEffect(() => {
    log('GameBoard: useEffect - Setting isClient to true');
    setIsClient(true);
  }, []);
  
  
  const handleNewGame = useCallback(() => {
    log('GameBoard: handleNewGame called');
    let newState: GameState;
    const debugStateJSON = localStorage.getItem('deck-of-cards-debug-state');
    if (debugStateJSON) {
        log('GameBoard: handleNewGame - Found debug state in localStorage');
        try {
            const parsedDebugState = JSON.parse(debugStateJSON);
            if (parsedDebugState.gameType === settings.gameType) {
              log('GameBoard: handleNewGame - Using debug state for new game');
              newState = parsedDebugState;
              localStorage.removeItem('deck-of-cards-debug-state'); 
            } else {
              log('GameBoard: handleNewGame - Debug state is for a different game, creating new state');
              if (settings.gameType === 'Solitaire') newState = createSolitaireInitialState(settings.solitaireDrawCount);
              else if (settings.gameType === 'Freecell') newState = createFreecellInitialState();
              else newState = createSpiderInitialState(settings.spiderSuits);
            }
        } catch (e) {
            log('GameBoard: handleNewGame - Failed to parse debug state:', e);
            if (settings.gameType === 'Solitaire') newState = createSolitaireInitialState(settings.solitaireDrawCount);
            else if (settings.gameType === 'Freecell') newState = createFreecellInitialState();
            else newState = createSpiderInitialState(settings.spiderSuits);
        }
    } else {
        log(`GameBoard: handleNewGame - No debug state, creating new ${settings.gameType} game`);
        if (settings.gameType === 'Solitaire') newState = createSolitaireInitialState(settings.solitaireDrawCount);
        else if (settings.gameType === 'Freecell') newState = createFreecellInitialState();
        else newState = createSpiderInitialState(settings.spiderSuits);
    }

    setGameState(newState);
    setHistory([]);
    setGameStartTime(Date.now());
    setIsWon(false);
    setSelectedCard(null);
  }, [settings.gameType, settings.solitaireDrawCount, settings.spiderSuits]);
  
  
  useEffect(() => {
    if (isClient) {
      log('GameBoard: useEffect[isClient, handleNewGame] - Calling handleNewGame');
      handleNewGame();
    }
  }, [isClient, handleNewGame]);

  useEffect(() => {
    if (highlightedPile) {
      log('GameBoard: useEffect[highlightedPile] - Setting timer to clear highlight');
      const timer = setTimeout(() => setHighlightedPile(null), 500);
      return () => clearTimeout(timer);
    }
  }, [highlightedPile]);
  
  const checkWinCondition = useCallback((state: GameState) => {
    log('GameBoard: checkWinCondition called');
    if (isGameWon(state)) {
      log('GameBoard: checkWinCondition - Game is won');
      const endTime = Date.now();
      const timeTaken = gameStartTime ? Math.round((endTime - gameStartTime) / 1000) : 0;
      setIsWon(true);
      updateStats({
        gameType: state.gameType,
        stats: { wins: 1, bestScore: state.score, bestTime: timeTaken }
      });
    }
  }, [gameStartTime, updateStats]);


  const updateState = useCallback((newState: GameState, saveHistory = true) => {
    log('GameBoard: updateState called.', { saveHistory });
    if (saveHistory && gameState) {
      log('GameBoard: updateState - Saving current state to history');
      setHistory(h => [gameState, ...h].slice(0, UNDO_LIMIT));
    }
    setGameState(newState);
    // Check win condition after state update
    checkWinCondition(newState);
  }, [gameState, checkWinCondition]);

  const handleUndo = useCallback(() => {
    log('GameBoard: handleUndo called');
    if (history.length > 0) {
      log('GameBoard: handleUndo - History found, undoing move');
      const [lastState, ...rest] = history;
      setGameState(lastState);
      setHistory(rest);
      setSelectedCard(null);
    } else {
      log('GameBoard: handleUndo - No history, cannot undo');
    }
  }, [history]);
  
  const handleDraw = useCallback(() => {
    log('GameBoard: handleDraw called');
    setSelectedCard(null);
    if (!gameState) {
        log('GameBoard: handleDraw - No game state, returning');
        return;
    }

    const newState = { ...gameState };
    
    if (newState.gameType === 'Solitaire') {
      log('GameBoard: handleDraw - Solitaire game');
      const solState = newState as SolitaireGameState;
      if (solState.stock.length > 0) {
        log('GameBoard: handleDraw - Drawing from stock');
        const numToDraw = Math.min(solState.drawCount, solState.stock.length);
        const drawnCards = [];
        for (let i = 0; i < numToDraw; i++) {
          const card = solState.stock.pop()!;
          card.faceUp = true;
          drawnCards.push(card);
        }
        solState.waste.push(...drawnCards.reverse());
      } else if (solState.waste.length > 0) {
        log('GameBoard: handleDraw - Recycling waste to stock');
        solState.stock = solState.waste.reverse().map((c: CardType) => ({...c, faceUp: false}));
        solState.waste = [];
      }
      solState.moves++;
    } 
    else if (newState.gameType === 'Spider') {
      log('GameBoard: handleDraw - Spider game');
      const spiderState = newState as SpiderGameState;
      if (spiderState.stock.length > 0) {
        const hasEmptyPile = spiderState.tableau.some((pile: CardType[]) => pile.length === 0);
        if (hasEmptyPile) {
            log('GameBoard: handleDraw - Cannot deal with empty tableau pile');
            toast({
                variant: "destructive",
                title: "Invalid Move",
                description: "You cannot deal new cards while there is an empty tableau pile.",
            });
            return;
        }
        const dealCount = spiderState.tableau.length;
        if(spiderState.stock.length >= dealCount) {
          log('GameBoard: handleDraw - Dealing cards to tableau');
          for(let i = 0; i < dealCount; i++) {
            const card = spiderState.stock.pop()!;
            card.faceUp = true;
            spiderState.tableau[i].push(card);
          }
          spiderState.moves++;
        }
      }
    }
    updateState(newState);
  }, [gameState, toast, updateState]);

  const handleCardClick = useCallback((card: CardType | undefined, location: CardLocation) => {
    log('GameBoard: handleCardClick called', { card, location });
    if (!gameState) {
        log('GameBoard: handleCardClick - No game state, returning');
        return;
    }
  
    const result = processCardClick({
        gameState,
        selectedCard,
        clickSource: location,
        clickedCard: card,
        settings,
        toast,
    });

    if (result.newState) {
        log('GameBoard: handleCardClick - Updating state');
        updateState(result.newState, result.saveHistory);
    }

    setSelectedCard(result.newSelectedCard);
    setHighlightedPile(result.highlightedPile);
  }, [gameState, selectedCard, settings, toast, updateState]);
    
  const handleMouseDown = useCallback((e: MouseEvent, card: CardType, location: CardLocation) => {
    log('GameBoard: handleMouseDown called', { card, location });
    e.stopPropagation();
    // This is the start of a drag, just select the card.
    setSelectedCard({ ...card, location });
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent, card: CardType, location: CardLocation) => {
      log('GameBoard: handleTouchStart called', { card, location });
      e.stopPropagation();
      // This is the start of a drag, just select the card.
      setSelectedCard({ ...card, location });
  }, []);

  const handleDrop = useCallback((location: CardLocation) => {
      log('GameBoard: handleDrop called', { location });
      if (!selectedCard) return;
      // This is the end of a drag, so we treat it like the second click in a two-click move.
      handleCardClick(undefined, location);
  }, [selectedCard, handleCardClick]);


  useKeyboardShortcuts({
    onNewGame: handleNewGame,
    onUndo: handleUndo,
    onDraw: handleDraw,
    onOpenSettings: () => setIsSettingsOpen(true)
  });
  
  const renderLoader = () => (
    <div className="flex flex-col min-h-screen">
    <GameHeader 
        onNewGame={() => {}} 
        onSettings={() => setIsSettingsOpen(true)}
        onGameMenuOpen={() => setIsGameMenuOpen(true)}
      />
      <main className="flex-grow p-3">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 lg:gap-4 mb-4">
            {Array.from({length: 7}).map((_, i) => <Skeleton key={i} className="w-full aspect-[7/10] rounded-md"/>)}
        </div>
         <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 lg:gap-4 min-h-[28rem]">
            {Array.from({length: 7}).map((_, i) => <Skeleton key={i} className="w-full h-36 rounded-md"/>)}
         </div>
      </main>
    </div>
  );

  
  if (!isClient || !gameState) {
    return renderLoader();
  }

  return (
    <>
      <GameUI
        gameState={gameState}
        isWon={isWon}
        selectedCard={selectedCard}
        highlightedPile={highlightedPile}
        historyLength={history.length}
        handleNewGame={handleNewGame}
        handleUndo={handleUndo}
        handleDraw={handleDraw}
        handleCardClick={handleCardClick}
        handleMouseDown={handleMouseDown}
        handleTouchStart={handleTouchStart}
        handleDrop={handleDrop}
        setIsSettingsOpen={setIsSettingsOpen}
        setIsGameMenuOpen={setIsGameMenuOpen}
      />

      <VictoryDialog
        isOpen={isWon}
        onNewGame={handleNewGame}
        score={gameState.score}
        moves={gameState.moves}
        time={gameStartTime ? Math.round((Date.now() - gameStartTime) / 1000) : 0}
        bestScore={stats[gameState.gameType]?.bestScore}
        bestTime={stats[gameState.gameType]?.bestTime}
      />

      <SettingsDialog 
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />

      <GameDialog
        open={isGameMenuOpen}
        onOpenChange={setIsGameMenuOpen}
        onNewGame={handleNewGame}
      />
    </>
  );
}
 