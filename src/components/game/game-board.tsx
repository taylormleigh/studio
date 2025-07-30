"use client";

import { useState, useEffect, useCallback, useTransition } from 'react';
import { GameState, createInitialState, Pile, Card as CardType, canMoveToTableau, canMoveToFoundation, isGameWon, serializeGameStateForAI } from '@/lib/solitaire';
import { Card } from './card';
import GameHeader from './game-header';
import { useToast } from '@/hooks/use-toast';
import { getHintAction } from '@/app/actions';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSettings } from '@/hooks/use-settings';
import { SettingsDialog } from './settings-dialog';
import { cn } from '@/lib/utils';

type SelectedPile = {
  type: 'tableau' | 'waste' | 'foundation';
  pileIndex: number;
  cardIndex?: number;
};

const UNDO_LIMIT = 15;

export default function GameBoard() {
  const { settings } = useSettings();
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(settings.klondikeDrawCount));
  const [history, setHistory] = useState<GameState[]>([]);
  const [selectedPile, setSelectedPile] = useState<SelectedPile | null>(null);
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
    // For now, only Klondike is supported
    // In future, we would use settings.gameType to call different initial state functions
    setGameState(createInitialState(settings.klondikeDrawCount));
    setHistory([]);
    setSelectedPile(null);
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
      setSelectedPile(null);
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
    sourcePile: Pile,
    destPile: Pile,
    cardIndex: number,
    scoreChange: number
  ) => {
    const newGameState = JSON.parse(JSON.stringify(gameState));
    const newSourcePile = sourcePile === newGameState.waste ? newGameState.waste : sourcePile.length > 0 ? newGameState.tableau.find((p: Pile) => p[0] && p[0].rank === sourcePile[0].rank && p[0].suit === sourcePile[0].suit) : newGameState.tableau.find((p:Pile) => p.length === 0);
    const newDestPile = destPile === newGameState.foundation[0] ? newGameState.foundation[0] : destPile === newGameState.foundation[1] ? newGameState.foundation[1] : destPile === newGameState.foundation[2] ? newGameState.foundation[2] : destPile === newGameState.foundation[3] ? newGameState.foundation[3] : newGameState.tableau.find((p: Pile) => destPile.length > 0 && p[0] && p[0].rank === destPile[0].rank && p[0].suit === destPile[0].suit);


    const cardsToMove = newSourcePile.splice(cardIndex);
    newDestPile.push(...cardsToMove);

    if (newSourcePile.length > 0) {
      newSourcePile[newSourcePile.length - 1].faceUp = true;
    }
    newGameState.moves += 1;
    newGameState.score += scoreChange;
    updateState(newGameState);
  }, [gameState, updateState]);

  const handlePileClick = (type: 'tableau' | 'waste' | 'foundation', pileIndex: number, cardIndex?: number) => {
    if (!selectedPile) {
      const pile = type === 'tableau' ? gameState.tableau[pileIndex] : type === 'foundation' ? gameState.foundation[pileIndex] : gameState.waste;
      const card = cardIndex !== undefined ? pile[cardIndex] : pile[pile.length - 1];
      if (card?.faceUp) {
        setSelectedPile({ type, pileIndex, cardIndex });
      }
      return;
    }

    const sourcePile = selectedPile.type === 'tableau' ? gameState.tableau[selectedPile.pileIndex] : selectedPile.type === 'foundation' ? gameState.foundation[selectedPile.pileIndex] : gameState.waste;
    const cardToMove = selectedPile.cardIndex !== undefined ? sourcePile[selectedPile.cardIndex] : sourcePile[sourcePile.length - 1];
    
    if (type === selectedPile.type && pileIndex === selectedPile.pileIndex && cardIndex === selectedPile.cardIndex) {
        setSelectedPile(null);
        return;
    }

    if (type === 'tableau') {
      const destPile = gameState.tableau[pileIndex];
      const destTopCard = destPile[destPile.length - 1];
      if (canMoveToTableau(cardToMove, destTopCard)) {
        moveCards(sourcePile, destPile, selectedPile.cardIndex ?? sourcePile.length - 1, 5);
      }
    } else if (type === 'foundation') {
      const destPile = gameState.foundation[pileIndex];
      if ((selectedPile.type === 'waste' && sourcePile.length -1 === (selectedPile.cardIndex ?? sourcePile.length - 1)) || (selectedPile.type === 'tableau' && sourcePile.length -1 === selectedPile.cardIndex)) {
        if (canMoveToFoundation(cardToMove, destPile)) {
          moveCards(sourcePile, destPile, sourcePile.length - 1, 10);
        }
      }
    }
    
    setSelectedPile(null);
  };

  const handleDraw = () => {
    const newGameState = { ...gameState };
    if (newGameState.stock.length > 0) {
      const numToDraw = Math.min(newGameState.drawCount, newGameState.stock.length);
      const drawnCards = [];
      for (let i = 0; i < numToDraw; i++) {
        const card = newGameState.stock.pop()!;
        card.faceUp = true;
        drawnCards.push(card);
      }
      newGameState.waste.push(...drawnCards);
    } else if (newGameState.waste.length > 0) {
      newGameState.stock = newGameState.waste.reverse().map(c => ({...c, faceUp: false}));
      newGameState.waste = [];
      newGameState.score = Math.max(0, newGameState.score - 100);
    }
    updateState(newGameState);
  };
  
  const isSelected = (type: 'tableau' | 'waste' | 'foundation', pileIndex: number, cardIndex: number) => {
    return selectedPile?.type === type && selectedPile.pileIndex === pileIndex && selectedPile.cardIndex === cardIndex;
  };
  
  useEffect(() => {
    if (!settings.autoMove || selectedPile || isWon) return;

    const findAutoMove = () => {
        const wasteCard = gameState.waste[gameState.waste.length - 1];
        if (wasteCard) {
            for (let i = 0; i < gameState.foundation.length; i++) {
                if (canMoveToFoundation(wasteCard, gameState.foundation[i])) {
                    return { sourcePile: gameState.waste, destPile: gameState.foundation[i], cardIndex: gameState.waste.length - 1, scoreChange: 10 };
                }
            }
        }

        for (const tableauPile of gameState.tableau) {
            const topCard = tableauPile[tableauPile.length - 1];
            if (topCard?.faceUp) {
                for (let i = 0; i < gameState.foundation.length; i++) {
                    if (canMoveToFoundation(topCard, gameState.foundation[i])) {
                        return { sourcePile: tableauPile, destPile: gameState.foundation[i], cardIndex: tableauPile.length - 1, scoreChange: 10 };
                    }
                }
            }
        }
        return null;
    };
    
    const move = findAutoMove();
    if (move) {
        setTimeout(() => moveCards(move.sourcePile, move.destPile, move.cardIndex, move.scoreChange), 300);
    }
  }, [gameState, settings.autoMove, selectedPile, isWon, moveCards]);


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
            <div onClick={() => gameState.waste.length > 0 && handlePileClick('waste', 0, gameState.waste.length-1)}>
                <Card card={gameState.waste[gameState.waste.length - 1]} isSelected={selectedPile?.type === 'waste'} />
            </div>
          </div>
          <div className="flex gap-4">
            {gameState.foundation.map((pile, i) => (
              <div key={i} onClick={() => handlePileClick('foundation', i)}>
                <Card card={pile[pile.length - 1]} isSelected={selectedPile?.type === 'foundation' && selectedPile.pileIndex === i} />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-4 min-h-[28rem]">
          {gameState.tableau.map((pile, pileIndex) => (
            <div key={pileIndex} className="relative">
              {pile.length === 0 ? (
                 <div onClick={() => handlePileClick('tableau', pileIndex)}>
                    <Card />
                 </div>
              ) : (
                pile.map((card, cardIndex) => (
                  <div key={`${card.suit}-${card.rank}-${cardIndex}`} className="absolute" style={{ top: `${cardIndex * 2}rem` }}>
                     <div onClick={() => card.faceUp && handlePileClick('tableau', pileIndex, cardIndex)}>
                        <Card
                          card={card}
                          isSelected={isSelected('tableau', pileIndex, cardIndex)}
                        />
                     </div>
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
