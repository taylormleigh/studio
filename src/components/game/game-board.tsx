
"use client";

import { useState, useEffect, useCallback, DragEvent, TouchEvent } from 'react';
import { GameState as SolitaireGameState, createInitialState as createSolitaireInitialState, Card as CardType, canMoveToTableau as canMoveSolitaireToTableau, canMoveToFoundation as canMoveSolitaireToFoundation, isGameWon as isSolitaireGameWon, isRun as isSolitaireRun, last } from '@/lib/solitaire';
import { GameState as FreecellGameState, createInitialState as createFreecellInitialState, canMoveToTableau as canMoveFreecellToTableau, canMoveToFoundation as canMoveFreecellToFoundation, isGameWon as isFreecellGameWon, getMovableCardCount, isRun as isFreecellRun } from '@/lib/freecell';
import { GameState as SpiderGameState, createInitialState as createSpiderInitialState, canMoveToTableau as canMoveSpiderToTableau, isGameWon as isSpiderGameWon, checkForCompletedSet as checkForSpiderCompletedSet } from '@/lib/spider';
import { calculateScore } from '@/lib/game-logic';

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
import { useSwipeGestures } from '@/hooks/use-swipe-gestures';


type GameState = SolitaireGameState | FreecellGameState | SpiderGameState;

export type SelectedCardInfo = {
  type: 'tableau' | 'waste' | 'foundation' | 'freecell';
  pileIndex: number;
  cardIndex: number;
};

export type HighlightedPile = {
  type: 'tableau' | 'foundation' | 'freecell';
  pileIndex: number;
} | null;


const UNDO_LIMIT = 100;

export default function GameBoard() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const { stats, updateStats } = useStats();
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [time, setTime] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedCard, setSelectedCard] = useState<SelectedCardInfo | null>(null);
  const [highlightedPile, setHighlightedPile] = useState<HighlightedPile | null>(null);
  const [draggedCardInfo, setDraggedCardInfo] = useState<SelectedCardInfo | null>(null);

  
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
    let gameWon = false;
    let finalScore = state.score;
    let finalTime = time;

    if (state.gameType === 'Solitaire') {
      gameWon = isSolitaireGameWon(state as SolitaireGameState);
      if (gameWon) finalScore = calculateScore(state.moves, finalTime);
    } else if (state.gameType === 'Freecell') {
      gameWon = isFreecellGameWon(state as FreecellGameState);
      if (gameWon) finalScore = calculateScore(state.moves, finalTime);
    } else if (state.gameType === 'Spider') {
        gameWon = isSpiderGameWon(state as SpiderGameState);
        if (gameWon) finalScore = state.score;
    }
    
    if (gameWon && !isWon) {
        setIsRunning(false);
        setIsWon(true);
        updateStats({
            gameType: state.gameType,
            stats: { wins: 1, bestScore: finalScore, bestTime: finalTime, }
        });
        return { ...state, score: finalScore };
    }
    return state;
  }, [time, updateStats, isWon]);

  const updateState = useCallback((newStateFn: (prevState: GameState) => GameState, saveHistory = true) => {
    setGameState(prev => {
        if (!prev) return null;
        
        if (saveHistory) {
            setHistory(h => [prev, ...h].slice(0, UNDO_LIMIT));
        }

        let nextState = newStateFn(prev);

        if (nextState.gameType === 'Spider') {
            let setsCompletedThisMove = 0;
            (nextState as SpiderGameState).tableau.forEach((pile, index) => {
                const result = checkForSpiderCompletedSet(pile);
                if(result.setsCompleted > 0 && result.completedSet) {
                    (nextState as SpiderGameState).foundation.push(result.completedSet);
                    (nextState as SpiderGameState).tableau[index] = result.updatedPile;
                    setsCompletedThisMove++;
                    if ((nextState as SpiderGameState).tableau[index].length > 0 && !(last((nextState as SpiderGameState).tableau[index])!.faceUp)) {
                        last((nextState as SpiderGameState).tableau[index])!.faceUp = true;
                    }
                }
            });
            if (setsCompletedThisMove > 0) {
                (nextState as SpiderGameState).completedSets += setsCompletedThisMove;
                (nextState as SpiderGameState).score += (setsCompletedThisMove * 100);
            }
        }
        
        return checkWinCondition(nextState);
    });
}, [checkWinCondition]);

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
    updateState(prev => {
        const newGameState = JSON.parse(JSON.stringify(prev));

        if (newGameState.gameType === 'Solitaire') {
          if (newGameState.stock.length > 0) {
            const numToDraw = Math.min(newGameState.drawCount, newGameState.stock.length);
            const drawnCards = [];
            for (let i = 0; i < numToDraw; i++) {
              const card = newGameState.stock.pop()!;
              card.faceUp = true;
              drawnCards.push(card);
            }
            newGameState.waste.push(...drawnCards.reverse());
          } else if (newGameState.waste.length > 0) {
            newGameState.stock = newGameState.waste.reverse().map((c: CardType) => ({...c, faceUp: false}));
            newGameState.waste = [];
          }
          newGameState.moves += 1;
        } 
        else if (newGameState.gameType === 'Spider') {
          if (newGameState.stock.length > 0) {
            const hasEmptyPile = newGameState.tableau.some((pile: CardType[]) => pile.length === 0);
            if (hasEmptyPile) {
                toast({
                    variant: "destructive",
                    title: "Invalid Move",
                    description: "You cannot deal new cards while there is an empty tableau pile.",
                });
                return prev;
            }
            const dealCount = newGameState.tableau.length;
            if(newGameState.stock.length >= dealCount) {
              for(let i = 0; i < dealCount; i++) {
                const card = newGameState.stock.pop()!;
                card.faceUp = true;
                newGameState.tableau[i].push(card);
              }
              newGameState.moves++;
            }
          }
        }
        return newGameState;
    });
  }, [updateState, toast]);

  const swipeHandlers = useSwipeGestures();

  useKeyboardShortcuts({
    onNewGame: handleNewGame,
    onUndo: handleUndo,
    onDraw: handleDraw,
    onOpenSettings: () => setIsSettingsOpen(true)
  });

  const moveCards = useCallback((
    sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell',
    sourcePileIndex: number,
    sourceCardIndex: number,
    destType: 'tableau' | 'foundation' | 'freecell',
    destPileIndex: number,
  ): boolean => {
    let moveMade = false;
     updateState(prev => {
        if (!prev) {
            moveMade = false;
            return prev;
        }
        
        let newGameState = JSON.parse(JSON.stringify(prev));
        let moveSuccessful = false;
        
        if (newGameState.gameType === 'Solitaire' && (destType === 'tableau' || destType === 'foundation')) {
            let cardsToMove: CardType[];
            if (sourceType === 'waste') {
                if (newGameState.waste.length === 0) { moveMade = false; return prev; }
                cardsToMove = [newGameState.waste[newGameState.waste.length - 1]];
            } else if (sourceType === 'foundation') {
                if (newGameState.foundation[sourcePileIndex].length === 0) { moveMade = false; return prev; }
                cardsToMove = [newGameState.foundation[sourcePileIndex][newGameState.foundation[sourcePileIndex].length - 1]];
            } else { 
                const sourcePile = newGameState.tableau[sourcePileIndex];
                if (sourcePile.length === 0 || !sourcePile[sourceCardIndex]?.faceUp) { moveMade = false; return prev; }
                cardsToMove = sourcePile.slice(sourceCardIndex);
            }

            if (cardsToMove.length === 0 || !cardsToMove[0].faceUp) { moveMade = false; return prev; }

            const cardToMove = cardsToMove[0];
            if (destType === 'tableau') {
                const destPile = newGameState.tableau[destPileIndex];
                const topDestCard = last(destPile);
                if (canMoveSolitaireToTableau(cardToMove, topDestCard)) {
                    destPile.push(...cardsToMove);
                    moveSuccessful = true;
                }
            } else if (destType === 'foundation') {
                if (cardsToMove.length === 1) {
                    const destPile = newGameState.foundation[destPileIndex];
                    if (canMoveSolitaireToFoundation(cardToMove, destPile)) {
                        destPile.push(cardToMove);
                        moveSuccessful = true;
                    }
                }
            }

            if (moveSuccessful) {
                if (sourceType === 'waste') newGameState.waste.pop();
                else if (sourceType === 'foundation') newGameState.foundation[sourcePileIndex].pop();
                else {
                    const sourcePile = newGameState.tableau[sourcePileIndex];
                    sourcePile.splice(sourceCardIndex);
                    if (sourcePile.length > 0 && !last(sourcePile)!.faceUp) {
                        last(sourcePile)!.faceUp = true;
                    }
                }
                newGameState.moves++;
                setHighlightedPile({ type: destType, pileIndex: destPileIndex });
            }
        }
        else if (newGameState.gameType === 'Freecell') {
          let cardsToMove: CardType[];
          if (sourceType === 'tableau') cardsToMove = newGameState.tableau[sourcePileIndex].slice(sourceCardIndex);
          else if (sourceType === 'freecell') {
            const card = newGameState.freecells[sourcePileIndex];
            if(!card) { moveMade = false; return prev; }
            cardsToMove = [card];
          } else { moveMade = false; return prev; }

          if (cardsToMove.length === 0) { moveMade = false; return prev; }
          const cardToMove = cardsToMove[0];

          if (!isFreecellRun(cardsToMove)) {
            toast({ variant: "destructive", title: "Invalid Move", description: "You can only move cards that are in sequence (descending rank, alternating colors)." });
            moveMade = false;
            return prev;
          }

          const isDestinationEmpty = destType === 'tableau' && newGameState.tableau[destPileIndex].length === 0;
          const movableCount = getMovableCardCount(newGameState, isDestinationEmpty);
          if(cardsToMove.length > movableCount) {
            toast({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${cardsToMove.length} cards. Only ${movableCount} are movable.` });
            moveMade = false;
            return prev;
          }

          if (destType === 'tableau') {
            const destPile = newGameState.tableau[destPileIndex];
            if (canMoveFreecellToTableau(cardToMove, last(destPile))) {
              destPile.push(...cardsToMove);
              moveSuccessful = true;
            }
          } else if (destType === 'foundation') {
            if(cardsToMove.length === 1) {
                const destPile = newGameState.foundation[destPileIndex];
                if(canMoveFreecellToFoundation(cardToMove, destPile)) {
                    destPile.push(cardToMove);
                    moveSuccessful = true;
                }
            }
          } else if (destType === 'freecell') {
            if(cardsToMove.length === 1 && newGameState.freecells[destPileIndex] === null) {
              newGameState.freecells[destPileIndex] = cardToMove;
              moveSuccessful = true;
            }
          }

          if(moveSuccessful) {
             if (sourceType === 'tableau') newGameState.tableau[sourcePileIndex].splice(sourceCardIndex);
             else newGameState.freecells[sourcePileIndex] = null;
             newGameState.moves++;
             setHighlightedPile({ type: destType, pileIndex: destPileIndex });
          }
        }
        else if (newGameState.gameType === 'Spider' && sourceType === 'tableau' && destType === 'tableau') {
          const sourcePile = newGameState.tableau[sourcePileIndex];
          const cardsToMove = sourcePile.slice(sourceCardIndex);
          if (cardsToMove.length === 0) { moveMade = false; return prev; }
          const destPile = newGameState.tableau[destPileIndex];
          const destTopCard = last(destPile);
          if (canMoveSpiderToTableau(cardsToMove, destTopCard)) {
            sourcePile.splice(sourceCardIndex);
            destPile.push(...cardsToMove);
            if (sourcePile.length > 0 && !last(sourcePile)!.faceUp) last(sourcePile)!.faceUp = true;
            newGameState.moves++;
            newGameState.score--;
            setHighlightedPile({ type: destType, pileIndex: destPileIndex });
            moveSuccessful = true;
          }
        }
        
        moveMade = moveSuccessful;
        return moveSuccessful ? newGameState : prev;
     }, true);
     return moveMade;
  }, [updateState, toast]);
    
  const handleDragStart = (e: DragEvent, info: SelectedCardInfo) => {
    e.dataTransfer.setData('application/json', JSON.stringify(info));
    e.dataTransfer.effectAllowed = 'move';
    setSelectedCard(null); 
    setDraggedCardInfo(info);
  };
  
  const handleDrop = (e: DragEvent, destType: 'tableau' | 'foundation' | 'freecell', destPileIndex: number) => {
    e.preventDefault();
    setDraggedCardInfo(null);
    const infoJSON = e.dataTransfer.getData('application/json');
    if (!infoJSON) return;

    const info: SelectedCardInfo = JSON.parse(infoJSON);
    moveCards(info.type, info.pileIndex, info.cardIndex, destType, destPileIndex);
  };
  
  const handleTouchStart = (e: TouchEvent, info: SelectedCardInfo) => {
    e.stopPropagation();
    setDraggedCardInfo(info);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (draggedCardInfo) {
      const touch = e.changedTouches[0];
      const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);

      if (dropTarget) {
          let destType: 'tableau' | 'foundation' | 'freecell' | null = null;
          let destPileIndex: number | null = null;
          
          const findPile = (type: string) => {
              const pileElement = dropTarget.closest(`[data-testid^="${type}-pile-"]`);
              if (pileElement) {
                  destType = type as any;
                  destPileIndex = parseInt(pileElement.getAttribute('data-testid')!.split('-')[2], 10);
                  return true;
              }
              const emptyPileElement = dropTarget.closest(`[data-testid^="card-tableau-empty-"]`) || dropTarget.closest(`[data-testid^="card-foundation-empty-"]`) || dropTarget.closest(`[data-testid^="card-freecell-empty-"]`);
               if (emptyPileElement) {
                  const parts = emptyPileElement.getAttribute('data-testid')!.split('-');
                  destType = parts[1] as any;
                  destPileIndex = parseInt(parts[3], 10);
                  return true;
              }
              const cardElement = dropTarget.closest('[data-testid^="card-"]');
              if (cardElement) {
                  const parentPile = cardElement.closest(`[data-testid^="${type}-pile-"]`);
                  if (parentPile) {
                      destType = type as any;
                      destPileIndex = parseInt(parentPile.getAttribute('data-testid')!.split('-')[2], 10);
                      return true;
                  }
              }
              return false;
          };

          findPile('tableau') || findPile('foundation') || findPile('freecell');
          
          if (destType && destPileIndex !== null) {
              moveCards(draggedCardInfo.type, draggedCardInfo.pileIndex, draggedCardInfo.cardIndex, destType, destPileIndex);
          }
      }

      setDraggedCardInfo(null);
    }
  };

  const handleCardClick = (sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell', pileIndex: number, cardIndex: number) => {
    if (!gameState) return;
  
    if (gameState.gameType !== 'Freecell' && sourceType === 'tableau') {
      const sourcePile = gameState.tableau[pileIndex];
      const clickedCard = sourcePile?.[cardIndex];
      if (clickedCard && !clickedCard.faceUp && cardIndex === sourcePile.length - 1) {
        updateState(prev => {
          const newGameState = JSON.parse(JSON.stringify(prev!));
          newGameState.tableau[pileIndex][cardIndex].faceUp = true;
          newGameState.moves++;
          return newGameState;
        });
        setSelectedCard(null);
        return; 
      }
    }
  
    if (selectedCard) {
      const isDifferentCard = !(selectedCard.type === sourceType && selectedCard.pileIndex === pileIndex && selectedCard.cardIndex === cardIndex);
      if (isDifferentCard) {
        moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, sourceType as any, pileIndex);
      }
      setSelectedCard(null);
      return;
    }
  
    const clickedCard = 
      (sourceType === 'waste' && gameState.gameType === 'Solitaire') ? last((gameState as SolitaireGameState).waste) :
      (sourceType === 'tableau') ? gameState.tableau[pileIndex]?.[cardIndex] :
      (sourceType === 'foundation' && (gameState.gameType === 'Solitaire')) ? last(gameState.foundation[pileIndex]) :
      (sourceType === 'freecell' && gameState.gameType === 'Freecell') ? (gameState as FreecellGameState).freecells[pileIndex] :
      undefined;
  
    if (!clickedCard || !(clickedCard as CardType).faceUp) {
      setSelectedCard(null); 
      return;
    }
  
    if (settings.autoMove) {
      const tryAutoMove = (): boolean => {
        if (gameState.gameType === 'Solitaire' || gameState.gameType === 'Freecell') {
          const g = gameState as SolitaireGameState | FreecellGameState;
          const isSolitaire = g.gameType === 'Solitaire';
          const cardToMove = clickedCard as CardType;

          for (let i = 0; i < g.foundation.length; i++) {
            const canMoveFn = isSolitaire ? canMoveSolitaireToFoundation : canMoveFreecellToFoundation;
            if (canMoveFn(cardToMove, g.foundation[i])) {
              return moveCards(sourceType, pileIndex, cardIndex, 'foundation', i);
            }
          }

          if (sourceType === 'waste' || sourceType === 'tableau' || sourceType === 'freecell') {
            const canMoveToTableauFn = isSolitaire ? canMoveSolitaireToTableau : canMoveFreecellToTableau;
            for (let i = 0; i < g.tableau.length; i++) {
              if (sourceType === 'tableau' && i === pileIndex) continue;
              const sourcePile = sourceType === 'tableau' ? g.tableau[pileIndex] : [];
              const cardsToMove = sourceType === 'tableau' ? sourcePile.slice(cardIndex) : [cardToMove];
              const isRunFn = isSolitaire ? isSolitaireRun : isFreecellRun;

              if (isRunFn(cardsToMove) && canMoveToTableauFn(cardsToMove[0], last(g.tableau[i]))) {
                return moveCards(sourceType, pileIndex, cardIndex, 'tableau', i);
              }
            }
          }
          
           if (!isSolitaire && (sourceType === 'tableau')) {
            const emptyFreecellIndex = (g as FreecellGameState).freecells.findIndex(cell => cell === null);
            if (emptyFreecellIndex !== -1) {
              return moveCards(sourceType, pileIndex, cardIndex, 'freecell', emptyFreecellIndex);
            }
           }
        } else if (gameState.gameType === 'Spider') {
          const sourcePile = gameState.tableau[pileIndex];
          const cardsToMove = sourcePile.slice(cardIndex);
          for (let i = 0; i < gameState.tableau.length; i++) {
            if (i === pileIndex) continue;
            if (canMoveSpiderToTableau(cardsToMove, last(gameState.tableau[i]))) {
              return moveCards('tableau', pileIndex, cardIndex, 'tableau', i);
            }
          }
        }
        return false;
      };

      tryAutoMove();
      setSelectedCard(null); 
      return;
    }
  
    setSelectedCard({ type: sourceType, pileIndex, cardIndex });
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
    handleDragStart,
    handleDrop,
    handleDraw,
    moveCards,
    handleTouchStart,
    draggedCardInfo,
  };

  return (
    <div 
      className="flex flex-col min-h-screen"
      data-testid="game-board"
      onTouchMove={swipeHandlers.onTouchMove}
      onTouchEnd={handleTouchEnd}
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

      <UndoButton onUndo={handleUndo} canUndo={history.length > 0} />
      
      <GameFooter 
        moves={gameState.moves}
        time={time}
        score={gameState.gameType === 'Spider' || isWon ? gameState.score : undefined}
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
