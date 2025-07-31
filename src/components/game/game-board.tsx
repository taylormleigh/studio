
"use client";

import { useState, useEffect, useCallback, DragEvent } from 'react';
import { GameState as SolitaireGameState, createInitialState as createSolitaireInitialState, Card as CardType, canMoveToTableau as canMoveSolitaireToTableau, canMoveToFoundation as canMoveSolitaireToFoundation, isGameWon as isSolitaireGameWon, isRun as isSolitaireRun } from '@/lib/solitaire';
import { GameState as FreecellGameState, createInitialState as createFreecellInitialState, canMoveToTableau as canMoveFreecellToTableau, canMoveToFoundation as canMoveFreecellToFoundation, isGameWon as isFreecellGameWon, getMovableCardCount } from '@/lib/freecell';
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
import { StatsDialog } from './stats-dialog';

import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { useStats } from '@/hooks/use-stats';
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
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedCard, setSelectedCard] = useState<SelectedCardInfo | null>(null);
  const [highlightedPile, setHighlightedPile] = useState<HighlightedPile | null>(null);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (isClient) {
      handleNewGame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

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
    
    if (gameWon) {
        setIsRunning(false);
        setIsWon(true);
        updateStats({
            gameType: state.gameType,
            stats: { wins: 1, bestScore: finalScore, bestTime: finalTime }
        });
        return { ...state, score: finalScore };
    }
    return state;
  }, [time, updateStats]);

  const updateState = useCallback((newState: GameState | ((prevState: GameState) => GameState), saveHistory = true) => {
    setGameState(prev => {
        if (!prev) return null;
        
        if (saveHistory) {
            setHistory(h => [prev, ...h].slice(0, UNDO_LIMIT));
        }

        const nextStateRaw = typeof newState === 'function' ? newState(prev) : newState;

        // Spider-specific logic for completing sets
        if (nextStateRaw.gameType === 'Spider') {
            let setsCompletedThisMove = 0;
            (nextStateRaw as SpiderGameState).tableau.forEach((pile, index) => {
                const result = checkForSpiderCompletedSet(pile);
                if(result.setsCompleted > 0 && result.completedSet) {
                    (nextStateRaw as SpiderGameState).foundation.push(result.completedSet);
                    (nextStateRaw as SpiderGameState).tableau[index] = result.updatedPile;
                    setsCompletedThisMove++;
                    if ((nextStateRaw as SpiderGameState).tableau[index].length > 0 && !(nextStateRaw as SpiderGameState).tableau[index][(nextStateRaw as SpiderGameState).tableau[index].length - 1].faceUp) {
                        (nextStateRaw as SpiderGameState).tableau[index][(nextStateRaw as SpiderGameState).tableau[index].length - 1].faceUp = true;
                    }
                }
            });
            if (setsCompletedThisMove > 0) {
                (nextStateRaw as SpiderGameState).completedSets += setsCompletedThisMove;
            }
        }
        
        const finalState = checkWinCondition(nextStateRaw);
        return finalState;
    });
  }, [checkWinCondition]);

  const handleNewGame = useCallback(() => {
    let newState: GameState;
    if (settings.gameType === 'Solitaire') {
      newState = createSolitaireInitialState(settings.solitaireDrawCount);
    } else if (settings.gameType === 'Freecell') { 
      newState = createFreecellInitialState();
    } else { // Spider
      newState = createSpiderInitialState(settings.spiderSuits);
    }

    setGameState(newState);
    setHistory([]);
    setTime(0);
    setIsRunning(true);
    setIsWon(false);
    setSelectedCard(null);
  }, [settings.gameType, settings.solitaireDrawCount, settings.spiderSuits]);

  const handleUndo = () => {
    if (history.length > 0) {
      const [lastState, ...rest] = history;
      setGameState(lastState);
      setHistory(rest);
      setSelectedCard(null);
    }
  };

  const moveCards = useCallback((
    sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell',
    sourcePileIndex: number,
    sourceCardIndex: number,
    destType: 'tableau' | 'foundation' | 'freecell',
    destPileIndex: number,
  ) => {
     updateState(prev => {
        if (!prev) return prev;

        // Solitaire
        if (prev.gameType === 'Solitaire' && (destType === 'tableau' || destType === 'foundation')) {
            const newGameState = JSON.parse(JSON.stringify(prev)) as SolitaireGameState;
            let cardsToMove: CardType[];
            
            if (sourceType === 'waste') {
                if (newGameState.waste.length === 0) return prev;
                cardsToMove = [newGameState.waste[newGameState.waste.length - 1]];
            } else if (sourceType === 'foundation') {
                if (newGameState.foundation[sourcePileIndex].length === 0) return prev;
                cardsToMove = [newGameState.foundation[sourcePileIndex][newGameState.foundation[sourcePileIndex].length - 1]];
            } else { // tableau
                if (newGameState.tableau[sourcePileIndex].length === 0 || sourceCardIndex >= newGameState.tableau[sourcePileIndex].length) return prev;
                 if (newGameState.tableau[sourcePileIndex][sourceCardIndex].faceUp) {
                    cardsToMove = newGameState.tableau[sourcePileIndex].slice(sourceCardIndex);
                } else {
                    return prev;
                }
            }

            if (cardsToMove.length === 0 || !cardsToMove[0].faceUp) return prev;

            let moveSuccessful = false;
            const cardToMove = cardsToMove[0];

            if (destType === 'tableau') {
                const destPile = newGameState.tableau[destPileIndex];
                const topDestCard = destPile.length > 0 ? destPile[destPile.length - 1] : undefined;
                if (canMoveSolitaireToTableau(cardToMove, topDestCard)) {
                    destPile.push(...cardsToMove);
                    moveSuccessful = true;
                }
            } else if (destType === 'foundation') {
                if (cardsToMove.length === 1) {
                    const destPile = newGameState.foundation[destPileIndex];
                    const topDestCard = destPile.length > 0 ? destPile[destPile.length - 1] : undefined;
                    if (canMoveSolitaireToFoundation(cardToMove, topDestCard)) {
                        destPile.push(cardToMove);
                        moveSuccessful = true;
                    }
                }
            }

            if (moveSuccessful) {
                if (sourceType === 'waste') {
                    newGameState.waste.pop();
                } else if (sourceType === 'foundation') {
                    newGameState.foundation[sourcePileIndex].pop();
                } else { // tableau
                    const sourcePile = newGameState.tableau[sourcePileIndex];
                    newGameState.tableau[sourcePileIndex] = sourcePile.slice(0, sourceCardIndex);
                    const updatedSourcePile = newGameState.tableau[sourcePileIndex];
                    if (updatedSourcePile.length > 0 && !updatedSourcePile[updatedSourcePile.length - 1].faceUp) {
                        updatedSourcePile[updatedSourcePile.length - 1].faceUp = true;
                    }
                }
                newGameState.moves++;
                setHighlightedPile({ type: destType, pileIndex: destPileIndex });
                setSelectedCard(null);
                return newGameState;
            }
            return prev;
        }

        // Freecell
        if (prev.gameType === 'Freecell') {
          const newGameState = JSON.parse(JSON.stringify(prev)) as FreecellGameState;
          let cardToMove: CardType;
          let cardsToMove: CardType[];

          const movableCount = getMovableCardCount(newGameState);
          const movingCount = sourceType === 'tableau' ? newGameState.tableau[sourcePileIndex].length - sourceCardIndex : 1;
          if(movingCount > movableCount) {
            toast({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${movingCount} cards, only ${movableCount} are movable.` });
            return prev;
          }

          if (sourceType === 'tableau') {
            cardsToMove = newGameState.tableau[sourcePileIndex].slice(sourceCardIndex);
            cardToMove = cardsToMove[0];
          } else if (sourceType === 'freecell') {
            const card = newGameState.freecells[sourcePileIndex];
            if(!card) return prev;
            cardToMove = card;
            cardsToMove = [card];
          } else {
            return prev;
          }
          if(!cardToMove) return prev;

          let moveSuccessful = false;
          if (destType === 'tableau') {
            const destPile = newGameState.tableau[destPileIndex];
            const destTopCard = destPile[destPile.length - 1];
            if (canMoveFreecellToTableau(cardToMove, destTopCard)) {
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
             if (sourceType === 'tableau') {
                newGameState.tableau[sourcePileIndex].splice(sourceCardIndex);
              } else { // freecell
                newGameState.freecells[sourcePileIndex] = null;
              }
            newGameState.moves++;
            setHighlightedPile({ type: destType, pileIndex: destPileIndex });
            setSelectedCard(null);
            return newGameState;
          }
          return prev;
        }

        // Spider
        if (prev.gameType === 'Spider' && sourceType === 'tableau' && destType === 'tableau') {
          const newGameState = JSON.parse(JSON.stringify(prev)) as SpiderGameState;
          const sourcePile = newGameState.tableau[sourcePileIndex];
          const cardsToMove = sourcePile.slice(sourceCardIndex);

          if (cardsToMove.length === 0) return prev;

          const destPile = newGameState.tableau[destPileIndex];
          const destTopCard = destPile[destPile.length - 1];
          
          if (canMoveSpiderToTableau(cardsToMove, destTopCard)) {
            sourcePile.splice(sourceCardIndex);
            destPile.push(...cardsToMove);

            if (sourcePile.length > 0 && !sourcePile[sourcePile.length-1].faceUp) {
              sourcePile[sourcePile.length - 1].faceUp = true;
            }

            newGameState.moves++;
            newGameState.score--;
            setHighlightedPile({ type: destType, pileIndex: destPileIndex });
            setSelectedCard(null);
            return newGameState;
          }
        }
        
        return prev;
     }, true);
  }, [updateState, toast]);
  
  const handleDraw = useCallback(() => {
    setSelectedCard(null);
    updateState(prev => {
        if(!prev) return prev;
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
        } else if (newGameState.gameType === 'Spider') {
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
    
  const handleDragStart = (e: DragEvent, info: SelectedCardInfo) => {
    e.dataTransfer.setData('application/json', JSON.stringify(info));
    e.dataTransfer.effectAllowed = 'move';
    setSelectedCard(null);
  };
  
  const handleDrop = (e: DragEvent, destType: 'tableau' | 'foundation' | 'freecell', destPileIndex: number) => {
    e.preventDefault();
    const infoJSON = e.dataTransfer.getData('application/json');
    if (!infoJSON) return;

    const info: SelectedCardInfo = JSON.parse(infoJSON);
    moveCards(info.type, info.pileIndex, info.cardIndex, destType, destPileIndex);
  };
  
  const handleCardClick = (sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell', pileIndex: number, cardIndex: number) => {
    if (!gameState) return;
  
    // Turn over a face-down card if it's the last in a tableau pile
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
        if(selectedCard.type === 'tableau' && selectedCard.pileIndex === pileIndex && selectedCard.cardIndex > cardIndex) {
            // do nothing
        } else {
            moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, sourceType as any, pileIndex);
        }
      setSelectedCard(null);
      return;
    }
  
    // --- Auto-move logic for "Click to move" mode ---
    if (settings.autoMove) {
      const gs = gameState as SolitaireGameState;
  
      const findAndExecuteAutoMove = () => {
        if (sourceType === 'waste') {
            const cardToMove = gs.waste[gs.waste.length - 1];
            if (!cardToMove) return false;
            // 1. Try foundation
            for (let i = 0; i < gs.foundation.length; i++) {
                if (canMoveSolitaireToFoundation(cardToMove, gs.foundation[i][gs.foundation[i].length - 1])) {
                    moveCards('waste', 0, gs.waste.length - 1, 'foundation', i);
                    return true;
                }
            }
            // 2. Try tableau
            for (let i = 0; i < gs.tableau.length; i++) {
                if (canMoveSolitaireToTableau(cardToMove, gs.tableau[i][gs.tableau[i].length - 1])) {
                    moveCards('waste', 0, gs.waste.length - 1, 'tableau', i);
                    return true;
                }
            }
        } else if (sourceType === 'tableau') {
            const sourcePile = gs.tableau[pileIndex];
            const clickedCard = sourcePile?.[cardIndex];
            if (!clickedCard || !clickedCard.faceUp) return false;
    
            if (cardIndex === sourcePile.length - 1) { // Top card of a pile
                for (let i = 0; i < gs.foundation.length; i++) {
                    if (canMoveSolitaireToFoundation(clickedCard, gs.foundation[i][gs.foundation[i].length - 1])) {
                        moveCards(sourceType, pileIndex, cardIndex, 'foundation', i);
                        return true;
                    }
                }
                for (let i = 0; i < gs.tableau.length; i++) {
                    if (i === pileIndex) continue;
                    if (canMoveSolitaireToTableau(clickedCard, gs.tableau[i][gs.tableau[i].length - 1])) {
                        moveCards(sourceType, pileIndex, cardIndex, 'tableau', i);
                        return true;
                    }
                }
            } else { // Card within a pile
                const cardsToMove = sourcePile.slice(cardIndex);
                if (!isSolitaireRun(cardsToMove)) {
                   return false; // Not a valid run to auto-move
                }
                for (let i = 0; i < gs.tableau.length; i++) {
                    if (i === pileIndex) continue;
                    if (canMoveSolitaireToTableau(cardsToMove[0], gs.tableau[i][gs.tableau[i].length - 1])) {
                        moveCards(sourceType, pileIndex, cardIndex, 'tableau', i);
                        return true;
                    }
                }
            }
        }
        return false;
      }
      if (findAndExecuteAutoMove()) {
        return;
      }
    }
  
    // Default manual selection (if no auto-move occurred)
    if (gameState.gameType === 'Solitaire' && sourceType === 'waste' && (gameState as SolitaireGameState).waste.length > 0) {
        setSelectedCard({ type: sourceType, pileIndex, cardIndex });
    } else if(sourceType === 'tableau' && gameState.tableau[pileIndex]?.[cardIndex]?.faceUp) {
        setSelectedCard({ type: sourceType, pileIndex, cardIndex });
    } else if (sourceType === 'freecell' && (gameState as FreecellGameState).freecells[pileIndex]) {
        setSelectedCard({ type: sourceType, pileIndex, cardIndex });
    }
  };  

  const renderLoader = () => (
    <div className="flex flex-col min-h-screen">
    <GameHeader 
        onNewGame={() => {}} 
        onUndo={() => {}} 
        onSettings={() => setIsSettingsOpen(true)}
        onStats={() => setIsStatsOpen(true)}
        canUndo={false}
      />
      <main className="flex-grow p-3 md:p-4">
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
  ? 'md:max-w-[500px]' 
  : (gameState.gameType === 'Freecell' ? 'md:max-w-[420px]' : 'md:max-w-[400px]');

  const boardProps = {
    gameState: gameState as any, // Cast to any to satisfy specific board props
    selectedCard,
    highlightedPile,
    handleCardClick,
    handleDragStart,
    handleDrop,
    handleDraw,
    moveCards,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <GameHeader 
        onNewGame={handleNewGame} 
        onUndo={handleUndo} 
        onSettings={() => setIsSettingsOpen(true)}
        onStats={() => setIsStatsOpen(true)}
        canUndo={history.length > 0}
      />
      <main className={cn("flex-grow p-2 md:p-4 w-full md:mx-auto", mainContainerMaxWidth)}>
        {gameState.gameType === 'Solitaire' && <SolitaireBoard {...boardProps} />}
        {gameState.gameType === 'Freecell' && <FreecellBoard {...boardProps} />}
        {gameState.gameType === 'Spider' && <SpiderBoard {...boardProps} />}
      </main>

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
      />

      <SettingsDialog 
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onNewGame={handleNewGame}
      />

      <StatsDialog
        open={isStatsOpen}
        onOpenChange={setIsStatsOpen}
      />
    </div>
  );
}
