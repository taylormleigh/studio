"use client";

import { useState, useEffect, useCallback, useTransition, DragEvent } from 'react';
import { GameState, createInitialState, Pile, Card as CardType, canMoveToTableau, canMoveToFoundation, isGameWon } from '@/lib/solitaire';
import { Card } from './card';
import GameHeader from './game-header';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSettings } from '@/hooks/use-settings';
import { SettingsDialog } from './settings-dialog';
import { cn } from '@/lib/utils';
import { getMoveHint } from '@/ai/flows/get-move-hint';

type DraggingCardInfo = {
  type: 'tableau' | 'waste' | 'foundation';
  pileIndex: number;
  cardIndex: number;
};

const UNDO_LIMIT = 15;

export default function GameBoard() {
  const { settings } = useSettings();
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(settings.klondikeDrawCount));
  const [history, setHistory] = useState<GameState[]>([]);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isWon, setIsWon] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isWon) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isWon]);
  
  const updateState = useCallback((newState: GameState, saveHistory = true) => {
    if (saveHistory) {
      setHistory(prev => [gameState, ...prev].slice(0, UNDO_LIMIT));
    }
    setGameState(newState);
    if (isGameWon(newState)) {
      setIsRunning(false);
      setIsWon(true);
    }
  }, [gameState]);
  
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
    const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    let sourcePile: Pile;
    let scoreChange = 0;

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
            scoreChange = 5;
            if(sourceType === 'foundation') scoreChange = -15;
        } else return;
    } else { // destType === 'foundation'
        const destPile = newGameState.foundation[destPileIndex];
        const topCard = destPile[destPile.length - 1];
        if (sourceCardIndex === sourcePile.length - 1 && canMoveToFoundation(cardToMove, topCard)) {
            const cardsToMove = sourcePile.splice(sourceCardIndex);
            destPile.push(...cardsToMove);
            scoreChange = 10;
        } else if (sourceCardIndex === sourcePile.length - 1 && cardToMove.rank === 'A' && !topCard) {
            // Find an empty foundation pile for the Ace
            let moved = false;
            for(let i=0; i<newGameState.foundation.length; i++) {
                if (newGameState.foundation[i].length === 0) {
                    const cardsToMove = sourcePile.splice(sourceCardIndex);
                    newGameState.foundation[i].push(...cardsToMove);
                    scoreChange = 10;
                    moved = true;
                    break;
                }
            }
            if(!moved) return;

        } else return;
    }
    
    if (sourceType === 'tableau' && sourcePile.length > 0 && !sourcePile[sourcePile.length-1].faceUp) {
      sourcePile[sourcePile.length - 1].faceUp = true;
      scoreChange += 5;
    }
    
    newGameState.moves += 1;
    newGameState.score += scoreChange;
    updateState(newGameState);

  }, [gameState, updateState]);
  
  const handleDraw = useCallback(() => {
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
      newGameState.score = Math.max(0, newGameState.score - 100);
    }
    updateState(newGameState);
  }, [gameState, updateState]);
    
  const findHint = useCallback(async () => {
    try {
      const hint = await getMoveHint(gameState);

      if (hint.from) {
        if (hint.from.type === 'draw') {
          return () => handleDraw();
        }

        if (hint.from.type === 'reveal') {
           return () => {
              const newGameState = JSON.parse(JSON.stringify(gameState));
              const pile = newGameState.tableau[hint.from.pileIndex!];
              if(pile && pile.length > 0 && !pile[pile.length - 1].faceUp) {
                  pile[pile.length - 1].faceUp = true;
                  newGameState.moves++;
                  newGameState.score += 5;
                  updateState(newGameState);
              }
           }
        }
        
        if (hint.to) {
          return () => moveCards(
            hint.from.type as 'tableau' | 'waste' | 'foundation',
            hint.from.pileIndex!,
            hint.from.cardIndex!,
            hint.to.type as 'tableau' | 'foundation',
            hint.to.pileIndex!
          );
        }
      }
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Hint Error',
        description: 'Could not get hint from AI.',
      });
    }

    return null;
  }, [gameState, moveCards, handleDraw, updateState, toast]);

  const handleHint = async () => {
    startTransition(async () => {
      const hintMove = await findHint();
      if (hintMove) {
        hintMove();
        toast({
          title: "💡 Hint Used",
          description: "A move was made for you.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "No Moves Found",
          description: "There are no available moves.",
        });
      }
    });
  };

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
            newGameState.score += 5;
            updateState(newGameState);
        }
        return;
    }
    
    if (sourceType === 'tableau' && cardIndex !== gameState.tableau[pileIndex].length - 1) {
        // If not the top card, do nothing on click, unless it's to start a drag stack
        return;
    }

    if (!settings.autoMove) return;

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
  }, [settings.autoMove, gameState, moveCards, updateState]);


  return (
    <div className="flex flex-col min-h-screen">
      <GameHeader 
        score={gameState.score} 
        moves={gameState.moves} 
        time={time}
        onNewGame={handleNewGame} 
        onUndo={handleUndo} 
        onHint={handleHint}
        onSettings={() => setIsSettingsOpen(true)}
        canUndo={history.length > 0}
        isHintPending={isPending}
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
    </div>
  );
}
