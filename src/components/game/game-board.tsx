
"use client";

import { useState, useEffect, useCallback, MouseEvent, TouchEvent } from 'react';
import { GameState as SolitaireGameState, createInitialState as createSolitaireInitialState, Card as CardType } from '@/lib/solitaire';
import { GameState as FreecellGameState, createInitialState as createFreecellInitialState } from '@/lib/freecell';
import { GameState as SpiderGameState, createInitialState as createSpiderInitialState } from '@/lib/spider';
import { processCardClick, ClickSource, isGameWon, GameState } from '@/lib/game-logic';

import GameHeader from './game-header';
import SolitaireBoard from './solitaire-board';
import FreecellBoard from './freecell-board';
import SpiderBoard from './spider-board';
import GameFooter from './game-footer';
import VictoryDialog from './victory-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsDialog } from './settings-dialog';
import { GameDialog } from './game-dialog';
import { Card } from './card';
import { UndoButton } from './undo-button';

import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { useStats } from '@/hooks/use-stats';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { cn } from '@/lib/utils';

export type SelectedCardInfo = {
  type: 'tableau' | 'waste' | 'foundation' | 'freecell';
  pileIndex: number;
  cardIndex: number;
};

export type HighlightedPile = {
  type: 'tableau' | 'foundation' | 'freecell';
  pileIndex: number;
} | null;

type DraggedCardInfo = SelectedCardInfo & {
    cards: CardType[];
};


const UNDO_LIMIT = 100;

const DraggedCard = ({ cardInfo, position }: { cardInfo: DraggedCardInfo, position: { x: number, y: number } }) => {
    if (!cardInfo) return null;

    return (
        <div 
            className="absolute pointer-events-none"
            style={{
                left: position.x,
                top: position.y,
                zIndex: 9999,
            }}
        >
            <div className="relative">
                {cardInfo.cards.map((card, index) => (
                    <div
                        key={`${card.suit}-${card.rank}`}
                        className="absolute"
                        style={{ top: `${index * 24}px`}}
                    >
                         <Card card={card} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function GameBoard() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const { stats, updateStats } = useStats();
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [time, setTime] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedCard, setSelectedCard] = useState<SelectedCardInfo | null>(null);
  const [highlightedPile, setHighlightedPile] = useState<HighlightedPile | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCardInfo, setDraggedCardInfo] = useState<DraggedCardInfo | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  
  const handleNewGame = useCallback(() => {
    let newState: GameState;
    const debugStateJSON = localStorage.getItem('deck-of-cards-debug-state');
    if (debugStateJSON) {
        try {
            const parsedDebugState = JSON.parse(debugStateJSON);
            if (parsedDebugState.gameType === settings.gameType) {
              newState = parsedDebugState;
              localStorage.removeItem('deck-of-cards-debug-state'); 
            } else {
              if (settings.gameType === 'Solitaire') newState = createSolitaireInitialState(settings.solitaireDrawCount);
              else if (settings.gameType === 'Freecell') newState = createFreecellInitialState();
              else newState = createSpiderInitialState(settings.spiderSuits);
            }
        } catch (e) {
            console.error("Failed to parse debug state:", e);
            if (settings.gameType === 'Solitaire') newState = createSolitaireInitialState(settings.solitaireDrawCount);
            else if (settings.gameType === 'Freecell') newState = createFreecellInitialState();
            else newState = createSpiderInitialState(settings.spiderSuits);
        }
    } else {
        if (settings.gameType === 'Solitaire') newState = createSolitaireInitialState(settings.solitaireDrawCount);
        else if (settings.gameType === 'Freecell') newState = createFreecellInitialState();
        else newState = createSpiderInitialState(settings.spiderSuits);
    }

    setGameState(newState);
    setHistory([]);
    setTime(0);
    setIsRunning(true);
    setIsWon(false);
    setSelectedCard(null);
  }, [settings.gameType, settings.solitaireDrawCount, settings.spiderSuits]);
  
  
  useEffect(() => {
    if (isClient) {
      handleNewGame();
    }
  }, [isClient, handleNewGame]);

  useEffect(() => {
    if (highlightedPile) {
      const timer = setTimeout(() => setHighlightedPile(null), 500);
      return () => clearTimeout(timer);
    }
  }, [highlightedPile]);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isWon && gameState && isClient) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isWon, gameState, isClient]);

  const checkWinCondition = useCallback((state: GameState) => {
    if (isGameWon(state)) {
      setIsRunning(false);
      setIsWon(true);
      updateStats({
        gameType: state.gameType,
        stats: { wins: 1, bestScore: state.score, bestTime: time }
      });
    }
  }, [time, updateStats]);


  const updateState = useCallback((newState: GameState, saveHistory = true) => {
    if (saveHistory && gameState) {
      setHistory(h => [gameState, ...h].slice(0, UNDO_LIMIT));
    }
    checkWinCondition(newState);
    setGameState(newState);
    setSelectedCard(null); // Always clear selection after an update
  }, [gameState, checkWinCondition]);

  const handleUndo = useCallback(() => {
    if (history.length > 0) {
      const [lastState, ...rest] = history;
      setGameState(lastState);
      setHistory(rest);
      setSelectedCard(null);
    }
  }, [history]);
  
  const handleDraw = useCallback(() => {
    setSelectedCard(null);
    if (!gameState) return;

    let newState = JSON.parse(JSON.stringify(gameState));
    
    if (newState.gameType === 'Solitaire') {
      if (newState.stock.length > 0) {
        const numToDraw = Math.min(newState.drawCount, newState.stock.length);
        const drawnCards = [];
        for (let i = 0; i < numToDraw; i++) {
          const card = newState.stock.pop()!;
          card.faceUp = true;
          drawnCards.push(card);
        }
        newState.waste.push(...drawnCards.reverse());
      } else if (newState.waste.length > 0) {
        newState.stock = newState.waste.reverse().map((c: CardType) => ({...c, faceUp: false}));
        newState.waste = [];
      }
      newState.moves++;
    } 
    else if (newState.gameType === 'Spider') {
      if (newState.stock.length > 0) {
        const hasEmptyPile = newState.tableau.some((pile: CardType[]) => pile.length === 0);
        if (hasEmptyPile) {
            toast({
                variant: "destructive",
                title: "Invalid Move",
                description: "You cannot deal new cards while there is an empty tableau pile.",
            });
            return;
        }
        const dealCount = newState.tableau.length;
        if(newState.stock.length >= dealCount) {
          for(let i = 0; i < dealCount; i++) {
            const card = newState.stock.pop()!;
            card.faceUp = true;
            newState.tableau[i].push(card);
          }
          newState.moves++;
        }
      }
    }
    updateState(newState);
  }, [gameState, toast, updateState]);

  const handleCardClick = (
    type: ClickSource['type'],
    pileIndex: number,
    cardIndex: number
  ) => {
    if (!gameState || isDragging) return;
  
    const clickInfo: ClickSource = { type, pileIndex, cardIndex };
    
    const result = processCardClick({
        gameState,
        selectedCard,
        clickSource: clickInfo,
        settings,
        toast,
    });
  
    if (result.newState) {
      updateState(result.newState, result.saveHistory);
    } else {
      setSelectedCard(result.newSelectedCard);
    }
  
    if (result.highlightedPile) {
      setHighlightedPile(result.highlightedPile);
    }
  };

  useKeyboardShortcuts({
    onNewGame: handleNewGame,
    onUndo: handleUndo,
    onDraw: handleDraw,
    onOpenSettings: () => setIsSettingsOpen(true)
  });
  
  const startDrag = (clientX: number, clientY: number, info: SelectedCardInfo) => {
    if (!gameState) return;
    setIsDragging(true);
    setSelectedCard(null);
  
    let cards: CardType[];
    switch (info.type) {
        case 'tableau': cards = gameState.tableau[info.pileIndex].slice(info.cardIndex); break;
        case 'waste': cards = (gameState.gameType === 'Solitaire') ? [(gameState as SolitaireGameState).waste.slice(-1)[0]] : []; break;
        case 'foundation': cards = (gameState.gameType === 'Solitaire') ? [gameState.foundation[info.pileIndex].slice(-1)[0]] : []; break;
        case 'freecell': cards = (gameState.gameType === 'Freecell') ? [(gameState as FreecellGameState).freecells[info.pileIndex]!] : []; break;
        default: cards = [];
    }
    
    const targetElement = document.querySelector(`[data-testid*="${cards[0].suit}-${cards[0].rank}"]`) as HTMLElement;
    const rect = targetElement ? targetElement.getBoundingClientRect() : { left: clientX, top: clientY };

    setDragOffset({ x: clientX - rect.left, y: clientY - rect.top });
    setDragPosition({ x: rect.left, y: rect.top });
    setDraggedCardInfo({ ...info, cards });
};
    
const handleMouseDown = (e: MouseEvent, info: SelectedCardInfo) => {
    e.stopPropagation();
    startDrag(e.clientX, e.clientY, info);
};

const handleTouchStart = (e: TouchEvent, info: SelectedCardInfo) => {
    e.stopPropagation();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY, info);
};
  
  const handleDragMove = (clientX: number, clientY: number) => {
    if (isDragging) {
      setDragPosition({
        x: clientX - dragOffset.x,
        y: clientY - dragOffset.y,
      });
    }
  };
  
  const handleDrop = (clientX: number, clientY: number) => {
    if (!isDragging || !draggedCardInfo || !gameState) return;

    // Temporarily hide the dragged cards to find the element underneath
    const draggedElements = document.querySelectorAll('.absolute.pointer-events-none');
    draggedElements.forEach(el => (el as HTMLElement).style.display = 'none');
    const dropTarget = document.elementFromPoint(clientX, clientY);
    draggedElements.forEach(el => (el as HTMLElement).style.display = ''); // Restore visibility

    if (dropTarget) {
        let targetType: 'tableau' | 'foundation' | 'freecell' | null = null;
        let targetPileIndex: number | null = null;
        let targetCardIndex = -1; // Default for empty piles or whole pile targets

        let currentEl: HTMLElement | null = dropTarget as HTMLElement;
        while (currentEl) {
            const testId = currentEl.dataset.testid;
            if (testId) {
                const parts = testId.split('-');
                if (parts[0] === 'card' && parts[1] !== 'stock' && parts[1] !== 'waste-empty') {
                    const type = parts[1] as any;
                    if (testId.includes('pile')) {
                        targetType = type;
                        targetPileIndex = parseInt(parts[3], 10);
                        break;
                    } else if (testId.includes('empty')) {
                        targetType = type;
                        targetPileIndex = parseInt(parts[3], 10);
                        break;
                    }
                } else if (testId.includes('-pile-')) {
                   const type = testId.split('-')[0] as any;
                   const index = parseInt(testId.split('-')[2]);
                   if (['tableau', 'foundation', 'freecell'].includes(type) && !isNaN(index)) {
                       targetType = type;
                       targetPileIndex = index;
                       break;
                   }
                }
            }
            currentEl = currentEl.parentElement;
        }
        
        if (targetType && targetPileIndex !== null) {
            const clickInfo: ClickSource = { type: targetType, pileIndex: targetPileIndex, cardIndex: targetCardIndex };
            const result = processCardClick({ gameState, selectedCard: draggedCardInfo, clickSource: clickInfo, settings, toast });
            if (result.newState) {
                updateState(result.newState, result.saveHistory);
            }
        }
    }
    
    setIsDragging(false);
    setDraggedCardInfo(null);
  };
  
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
    handleDraw
  };

  return (
    <div 
      className="flex flex-col min-h-screen"
      data-testid="game-board"
      onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
      onMouseUp={(e) => handleDrop(e.clientX, e.clientY)}
      onTouchMove={(e) => e.touches[0] && handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={(e) => e.changedTouches[0] && handleDrop(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
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

      {isDragging && draggedCardInfo && <DraggedCard cardInfo={draggedCardInfo} position={dragPosition} />}

      <UndoButton onUndo={handleUndo} canUndo={history.length > 0} />
      
      <GameFooter 
        moves={gameState.moves}
        time={time}
        score={isWon ? gameState.score : undefined}
      />

      <VictoryDialog
        isOpen={isWon}
        onNewGame={handleNewGame}
        score={gameState.score}
        moves={gameState.moves}
        time={time}
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
    </div>
  );
}
