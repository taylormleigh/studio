"use client";

import { useState, useEffect, useCallback, useTransition, DragEvent } from 'react';
import { GameState, createInitialState, Pile, Card as CardType, canMoveToTableau, canMoveToFoundation, isGameWon, serializeGameStateForAI } from '@/lib/solitaire';
import { Card } from './card';
import GameHeader from './game-header';
import { useToast } from '@/hooks/use-toast';
import { getHintAction } from '@/app/actions';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSettings } from '@/hooks/use-settings';
import { SettingsDialog } from './settings-dialog';
import { cn } from '@/lib/utils';

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
  }, [settings.klondikeDrawCount, settings.gameType]);

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

  const handleHint = async () => {
      startTransition(async () => {
        try {
            const serializedState = serializeGameStateForAI(gameState);
            const result = await getHintAction({ 
                gameState: serializedState,
                gameType: 'Klondike', // Hardcoded for now, expandable for other game types
                drawType: settings.klondikeDrawCount === 1 ? 'DrawOne' : 'DrawThree'
             });
            if (result.hint) {
                toast({
                    title: "💡 AI Hint",
                    description: result.hint,
                });
            } else {
                 toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Could not get a hint from the AI.",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "An error occurred while getting a hint.",
            });
        }
      });
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
        if (sourceCardIndex === sourcePile.length - 1 && canMoveToFoundation(cardToMove, destPile)) {
            const cardsToMove = sourcePile.splice(sourceCardIndex);
            destPile.push(...cardsToMove);
            scoreChange = 10;
        } else return;
    }
    
    if (sourceType === 'tableau' && sourcePile.length > 0) {
      sourcePile[sourcePile.length - 1].faceUp = true;
    }
    
    newGameState.moves += 1;
    newGameState.score += scoreChange;
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
  
  const handleDraw = () => {
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
  };

  const handleCardClick = useCallback((sourceType: 'tableau' | 'waste', pileIndex: number, cardIndex: number) => {
    if (!settings.autoMove) return;

    let card: CardType | undefined;
    let sourcePile: Pile;

    if (sourceType === 'waste') {
      sourcePile = gameState.waste;
      card = sourcePile[sourcePile.length - 1];
    } else { // tableau
      sourcePile = gameState.tableau[pileIndex];
      card = sourcePile[sourcePile.length - 1];
    }

    if (!card || !card.faceUp) return;

    for (let i = 0; i < gameState.foundation.length; i++) {
      if (canMoveToFoundation(card, gameState.foundation[i])) {
        moveCards(sourceType, pileIndex, sourcePile.length - 1, 'foundation', i);
        return;
      }
    }
  }, [settings.autoMove, gameState, moveCards]);


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
      />
      <main className="flex-grow space-y-8">
        <div className={cn("flex justify-between", settings.leftHandMode && "flex-row-reverse")}>
          <div className="flex gap-4">
            <div onClick={handleDraw} className="cursor-pointer">
              <Card card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} />
            </div>
            <div>
              {gameState.waste.length > 0 &&
                <Card 
                  card={gameState.waste[gameState.waste.length - 1]} 
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, {type: 'waste', pileIndex: 0, cardIndex: gameState.waste.length-1})}
                  onClick={() => handleCardClick('waste', 0, gameState.waste.length - 1)}
                />
              }
            </div>
          </div>
          <div className="flex gap-4">
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
                />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-4 min-h-[28rem]">
          {gameState.tableau.map((pile, pileIndex) => (
            <div 
              key={pileIndex} 
              className="relative"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'tableau', pileIndex)}
            >
              {pile.length === 0 ? (
                 <Card />
              ) : (
                pile.map((card, cardIndex) => (
                  <div 
                    key={`${card.suit}-${card.rank}-${cardIndex}`} 
                    className="absolute" 
                    style={{ top: `${cardIndex * 2}rem` }}
                  >
                    <Card
                      card={card}
                      draggable={card.faceUp}
                      onDragStart={(e) => handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
                      onClick={() => card.faceUp && cardIndex === pile.length - 1 && handleCardClick('tableau', pileIndex, cardIndex)}
                    />
                  </div>
                ))
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
