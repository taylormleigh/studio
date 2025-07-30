
"use client";

import { useState, useEffect, useCallback, DragEvent } from 'react';
import { GameState, createInitialState, Pile, Card as CardType, canMoveToTableau, canMoveToFoundation, isGameWon } from '@/lib/solitaire';
import { Card } from './card';
import GameHeader from './game-header';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSettings } from '@/hooks/use-settings';
import { useStats } from '@/hooks/use-stats';
import { SettingsDialog } from './settings-dialog';
import { StatsDialog } from './stats-dialog';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type DraggingCardInfo = {
  type: 'tableau' | 'waste' | 'foundation';
  pileIndex: number;
  cardIndex: number;
};

const UNDO_LIMIT = 15;

const calculateScore = (moves: number, time: number) => {
  if (time === 0) return 0;
  // Score starts at 10000, decreases with time and moves.
  const timePenalty = Math.floor(time / 10) * 2; // 2 points every 10 seconds
  const movePenalty = moves * 5;
  const score = 10000 - timePenalty - movePenalty;
  return Math.max(0, score);
};


export default function GameBoard() {
  const { settings } = useSettings();
  const { updateStats } = useStats();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isWon, setIsWon] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const handleNewGame = useCallback(() => {
    setGameState(createInitialState(settings.klondikeDrawCount));
    setHistory([]);
    setTime(0);
    setIsRunning(true);
    setIsWon(false);
  }, [settings.klondikeDrawCount]);
  
  useEffect(() => {
    handleNewGame();
  }, [settings.gameType, settings.klondikeDrawCount, handleNewGame]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isWon && gameState) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isWon, gameState]);
  
  const updateState = useCallback((newState: GameState, saveHistory = true) => {
    if (saveHistory && gameState) {
      setHistory(prev => [gameState, ...prev].slice(0, UNDO_LIMIT));
    }

    if(isGameWon(newState)) {
        const finalScore = calculateScore(newState.moves, time);
        newState.score = finalScore;
        setIsRunning(false);
        setIsWon(true);
        updateStats({
          gameType: settings.gameType,
          stats: {
            wins: 1,
            bestScore: finalScore,
            bestTime: time,
          }
        });
    }

    setGameState(newState);

  }, [gameState, settings.gameType, time, updateStats]);

  const handleUndo = () => {
    if (history.length > 0) {
      const [lastState, ...rest] = history;
      setGameState(lastState);
      setHistory(rest);
    }
  };

  const moveCards = useCallback((
    sourceType: 'tableau' | 'waste' | 'foundation',
    sourcePileIndex: number,
    sourceCardIndex: number,
    destType: 'tableau' | 'foundation',
    destPileIndex: number,
  ) => {
    if (!gameState) return;
    const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    let sourcePile: Pile;

    if (sourceType === 'tableau') sourcePile = newGameState.tableau[sourcePileIndex];
    else if (sourceType === 'waste') sourcePile = newGameState.waste;
    else sourcePile = newGameState.foundation[sourcePileIndex];

    const cardToMove = sourcePile[sourceCardIndex];
    if (!cardToMove) return;

    if (destType === 'tableau') {
        const destPile = newGameState.tableau[destPileIndex];
        const destTopCard = destPile[destPile.length - 1];
        if (canMoveToTableau(cardToMove, destTopCard)) {
            const cardsToMove = sourcePile.splice(sourceCardIndex);
            destPile.push(...cardsToMove);
        } else return;
    } else { // destType === 'foundation'
        const destPile = newGameState.foundation[destPileIndex];
        const topCard = destPile[destPile.length - 1];
        if (sourceCardIndex === sourcePile.length - 1 && canMoveToFoundation(cardToMove, topCard)) {
            const cardsToMove = sourcePile.splice(sourceCardIndex);
            destPile.push(...cardsToMove);
        } else if (sourceCardIndex === sourcePile.length - 1 && cardToMove.rank === 'A' && !topCard) {
            // Find an empty foundation pile for the Ace
            let moved = false;
            for(let i=0; i<newGameState.foundation.length; i++) {
                if (newGameState.foundation[i].length === 0) {
                    const cardsToMove = sourcePile.splice(sourceCardIndex);
                    newGameState.foundation[i].push(...cardsToMove);
                    moved = true;
                    break;
                }
            }
            if(!moved) return;

        } else return;
    }
    
    if (sourceType === 'tableau' && sourcePile.length > 0 && !sourcePile[sourcePile.length-1].faceUp) {
      sourcePile[sourcePile.length - 1].faceUp = true;
    }
    
    newGameState.moves += 1;
    updateState(newGameState);

  }, [gameState, updateState]);
  
  const handleDraw = useCallback(() => {
    if (!gameState) return;
    const newGameState: GameState = JSON.parse(JSON.stringify(gameState));
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
      newGameState.stock = newGameState.waste.reverse().map(c => ({...c, faceUp: false}));
      newGameState.waste = [];
    }
    newGameState.moves += 1;
    updateState(newGameState);
  }, [gameState, updateState]);
    
  const handleDragStart = (e: DragEvent, info: DraggingCardInfo) => {
    e.dataTransfer.setData('application/json', JSON.stringify(info));
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e: DragEvent, destType: 'tableau' | 'foundation', destPileIndex: number) => {
    e.preventDefault();
    const infoJSON = e.dataTransfer.getData('application/json');
    if (!infoJSON) return;

    const info: DraggingCardInfo = JSON.parse(infoJSON);
    moveCards(info.type, info.pileIndex, info.cardIndex, destType, destPileIndex);
  };
  
  const handleCardClick = useCallback((sourceType: 'tableau' | 'waste' | 'foundation', pileIndex: number, cardIndex: number) => {
    if (!gameState) return;

    const card = sourceType === 'waste' 
      ? gameState.waste[cardIndex]
      : sourceType === 'foundation'
      ? gameState.foundation[pileIndex][cardIndex]
      : gameState.tableau[pileIndex][cardIndex];

    if (!card || !card.faceUp) {
        // if card is face down, flip it if it's the last one in a tableau pile
        if(sourceType === 'tableau' && cardIndex === gameState.tableau[pileIndex].length - 1){
            const newGameState = JSON.parse(JSON.stringify(gameState));
            newGameState.tableau[pileIndex][cardIndex].faceUp = true;
            newGameState.moves++;
            updateState(newGameState);
        }
        return;
    }
    
    // Auto-move logic
    if (settings.autoMove) {
        // Try moving to foundation first
        for (let i = 0; i < gameState.foundation.length; i++) {
          if (canMoveToFoundation(card, gameState.foundation[i][gameState.foundation[i].length - 1])) {
            moveCards(sourceType, pileIndex, cardIndex, 'foundation', i);
            return;
          }
        }
         // Try moving to an empty foundation pile if it's an Ace
        if (card.rank === 'A') {
            for (let i = 0; i < gameState.foundation.length; i++) {
                if (gameState.foundation[i].length === 0) {
                    moveCards(sourceType, pileIndex, cardIndex, 'foundation', i);
                    return;
                }
            }
        }
        
        // if not from foundation, try moving to tableau
        if (sourceType !== 'foundation') {
            for (let i = 0; i < gameState.tableau.length; i++) {
                const destPile = gameState.tableau[i];
                const destTopCard = destPile[destPile.length - 1];
                if (canMoveToTableau(card, destTopCard)) {
                    moveCards(sourceType, pileIndex, cardIndex, 'tableau', i);
                    return;
                }
            }
        }
    }
  }, [settings.autoMove, gameState, moveCards, updateState]);

  if (!gameState) {
    return (
      <div className="flex flex-col min-h-screen">
        <GameHeader 
          onNewGame={() => {}} 
          onUndo={() => {}} 
          onSettings={() => setIsSettingsOpen(true)}
          onStats={() => setIsStatsOpen(true)}
          canUndo={false}
        />
        <main className="flex-grow space-y-2">
          <div className="flex justify-between gap-0.5">
            <div className="flex gap-2">
              <Skeleton className="w-[60px] h-[84px] sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-lg" />
              <Skeleton className="w-[60px] h-[84px] sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-lg" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-[60px] h-[84px] sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-lg" />
              <Skeleton className="w-[60px] h-[84px] sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-lg" />
              <Skeleton className="w-[60px] h-[84px] sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-lg" />
              <Skeleton className="w-[60px] h-[84px] sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-lg" />
            </div>
          </div>
           <div className="grid grid-cols-7 gap-0.5 min-h-[28rem]">
              {Array.from({length: 7}).map((_, i) => <Skeleton key={i} className="w-full h-36 rounded-lg"/>)}
           </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <GameHeader 
        onNewGame={handleNewGame} 
        onUndo={handleUndo} 
        onSettings={() => setIsSettingsOpen(true)}
        onStats={() => setIsStatsOpen(true)}
        canUndo={history.length > 0}
      />
      <main className="flex-grow space-y-2">
        <div className={cn("flex justify-between gap-0.5", settings.leftHandMode && "flex-row-reverse")}>
          <div className="flex gap-2">
            <div onClick={handleDraw} className="cursor-pointer">
              <Card card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} />
            </div>
            <div>
              {gameState.waste.length > 0 ?
                <Card 
                  card={gameState.waste[gameState.waste.length - 1]} 
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, {type: 'waste', pileIndex: 0, cardIndex: gameState.waste.length-1})}
                  onClick={() => handleCardClick('waste', 0, gameState.waste.length - 1)}
                /> : <Card />
              }
            </div>
          </div>
          <div className="flex gap-2">
            {gameState.foundation.map((pile, i) => (
              <div 
                key={i} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'foundation', i)}
              >
                <Card 
                  card={pile[pile.length - 1]} 
                  draggable={pile.length > 0}
                  onDragStart={(e) => handleDragStart(e, {type: 'foundation', pileIndex: i, cardIndex: pile.length-1})}
                   onClick={() => pile.length > 0 && handleCardClick('foundation', i, pile.length-1)}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 min-h-[28rem]">
          {gameState.tableau.map((pile, pileIndex) => (
            <div 
              key={pileIndex} 
              className="relative"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'tableau', pileIndex)}
            >
              {pile.length === 0 ? (
                 <div onDrop={(e) => handleDrop(e, 'tableau', pileIndex)} className="h-full w-full">
                    <Card />
                 </div>
              ) : (
                pile.map((card, cardIndex) => {
                  const topPosition = pile.slice(0, cardIndex).reduce((total, c) => total + (c.faceUp ? 2.25 : 0.75), 0);
                  return (
                    <div 
                      key={`${card.suit}-${card.rank}-${cardIndex}`} 
                      className="absolute" 
                      style={{ top: `${topPosition}rem` }}
                    >
                      <Card
                        card={card}
                        draggable={card.faceUp}
                        onDragStart={(e) => handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
                        onClick={() => handleCardClick('tableau', pileIndex, cardIndex)}
                      />
                    </div>
                  )
                })
              )}
            </div>
          ))}
        </div>
      </main>
       <div className="flex justify-center items-center text-sm text-muted-foreground p-2">
          <span>{`Moves: ${gameState.moves} | Time: ${new Date(time * 1000).toISOString().substr(14, 5)} | Score: ${isWon ? gameState.score : 'N/A'}`}</span>
        </div>
      <AlertDialog open={isWon}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Congratulations! You Won!</AlertDialogTitle>
            <AlertDialogDescription>
              Your final score is {gameState.score} in {gameState.moves} moves. Time: {time}s.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleNewGame}>Play Again</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

    