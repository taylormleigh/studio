
"use client";

import { useState, useEffect, useCallback, MouseEvent, TouchEvent } from 'react';
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

type DraggedCardInfo = SelectedCardInfo & {
    cards: CardType[];
    initialX: number;
    initialY: number;
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
                         <Card card={card} className="w-24"/>
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
  const [isRunning, setIsRunning] = useState(false);
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
    
    const targetElement = document.querySelector(`[data-testid="card-${cards[0].suit}-${cards[0].rank}"]`) as HTMLElement;
    const rect = targetElement ? targetElement.getBoundingClientRect() : { left: 0, top: 0 };
    
    setDragOffset({ x: clientX - rect.left, y: clientY - rect.top });
    setDragPosition({ x: clientX - (clientX - rect.left), y: clientY - (clientY - rect.top) });
    setDraggedCardInfo({ ...info, cards, initialX: clientX, initialY: clientY });
  };
    
  const handleMouseDown = (e: MouseEvent, info: SelectedCardInfo) => {
    startDrag(e.clientX, e.clientY, info);
  };
  
  const handleTouchStart = (e: TouchEvent, info: SelectedCardInfo) => {
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
  
  const handleDragEnd = (clientX: number, clientY: number) => {
    if (isDragging && draggedCardInfo) {
      const draggedEl = document.elementFromPoint(draggedCardInfo.initialX, draggedCardInfo.initialY);
      if (draggedEl) {
        (draggedEl as HTMLElement).style.display = 'none';
      }
  
      const dropTarget = document.elementFromPoint(clientX, clientY);
      
      if (draggedEl) {
        (draggedEl as HTMLElement).style.display = '';
      }
  
      if (dropTarget) {
        let targetType: 'tableau' | 'foundation' | 'freecell' | null = null;
        let targetPileIndex: number | null = null;
  
        let currentEl: HTMLElement | null = dropTarget as HTMLElement;
        while (currentEl) {
          const testId = currentEl.dataset.testid;
          if (testId) {
            if (testId.startsWith('tableau-pile-') || testId.startsWith('card-tableau-empty-')) {
              targetType = 'tableau';
              targetPileIndex = parseInt(testId.replace(/tableau-pile-|card-tableau-empty-/, ''), 10);
              break;
            }
            if (testId.startsWith('foundation-pile-') || testId.startsWith('card-foundation-empty-')) {
              targetType = 'foundation';
              targetPileIndex = parseInt(testId.replace(/foundation-pile-|card-foundation-empty-/, ''), 10);
              break;
            }
            if (testId.startsWith('freecell-pile-') || testId.startsWith('card-freecell-empty-')) {
              targetType = 'freecell';
              targetPileIndex = parseInt(testId.replace(/freecell-pile-|card-freecell-empty-/, ''), 10);
              break;
            }
          }
          currentEl = currentEl.parentElement;
        }
        if (targetType && targetPileIndex !== null) {
          moveCards(draggedCardInfo.type, draggedCardInfo.pileIndex, draggedCardInfo.cardIndex, targetType, targetPileIndex);
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
    handleDrop: () => {}, // No-op for HTML5 dnd
    handleDraw,
    moveCards
  };

  return (
    <div 
      className="flex flex-col min-h-screen"
      data-testid="game-board"
      onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
      onMouseUp={(e) => handleDragEnd(e.clientX, e.clientY)}
      onTouchMove={(e) => e.touches[0] && handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={(e) => e.changedTouches[0] && handleDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
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
