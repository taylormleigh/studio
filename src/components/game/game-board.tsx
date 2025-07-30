
"use client";

import { useState, useEffect, useCallback, DragEvent } from 'react';
import { GameState as SolitaireGameState, createInitialState as createSolitaireInitialState, Pile as SolitairePile, Card as CardType, canMoveToTableau as canMoveSolitaireToTableau, canMoveToFoundation as canMoveSolitaireToFoundation, isGameWon as isSolitaireGameWon } from '@/lib/solitaire';
import { GameState as FreecellGameState, createInitialState as createFreecellInitialState, canMoveToTableau as canMoveFreecellToTableau, canMoveToFoundation as canMoveFreecellToFoundation, isGameWon as isFreecellGameWon, getMovableCardCount } from '@/lib/freecell';
import { GameState as SpiderGameState, createInitialState as createSpiderInitialState, canMoveToTableau as canMoveSpiderToTableau, isGameWon as isSpiderGameWon, checkForCompletedSet as checkForSpiderCompletedSet } from '@/lib/spider';
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

type GameState = SolitaireGameState | FreecellGameState | SpiderGameState;

type DraggingCardInfo = {
  type: 'tableau' | 'waste' | 'foundation' | 'freecell';
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
  const { toast } = useToast();
  const { updateStats } = useStats();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
  }, [settings.gameType, settings.solitaireDrawCount, settings.spiderSuits]);
  
  useEffect(() => {
    if (isClient) {
      handleNewGame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.gameType, isClient]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isWon && gameState && isClient) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isWon, gameState, isClient]);
  
  const updateState = useCallback((newState: GameState, saveHistory = true) => {
    if (saveHistory && gameState) {
      setHistory(prev => [gameState, ...prev].slice(0, UNDO_LIMIT));
    }

    let gameWon = false;
    let finalScore = 0;

    if (settings.gameType === 'Solitaire' && newState.gameType === 'Solitaire') {
      gameWon = isSolitaireGameWon(newState);
      if(gameWon) finalScore = calculateScore(newState.moves, time);
    } else if (settings.gameType === 'Freecell' && newState.gameType === 'Freecell') {
      gameWon = isFreecellGameWon(newState);
      if(gameWon) finalScore = calculateScore(newState.moves, time);
    } else if (settings.gameType === 'Spider' && newState.gameType === 'Spider') {
      // Check for completed sets after every move
      const newSpiderState = newState as SpiderGameState;
      let setsCompletedThisMove = 0;
      newSpiderState.tableau.forEach((pile, index) => {
        const result = checkForSpiderCompletedSet(pile);
        if(result.setsCompleted > 0 && result.completedSet) {
            newSpiderState.tableau[index] = result.updatedPile;
            newSpiderState.foundation.push(result.completedSet);
            setsCompletedThisMove++;
            newSpiderState.score += 100; // Bonus for completing a set
             if (newSpiderState.tableau[index].length > 0 && !newSpiderState.tableau[index][newSpiderState.tableau[index].length - 1].faceUp) {
                newSpiderState.tableau[index][newSpiderState.tableau[index].length - 1].faceUp = true;
             }
        }
      });
      if(setsCompletedThisMove > 0) {
        newSpiderState.completedSets += setsCompletedThisMove;
      }
      
      gameWon = isSpiderGameWon(newSpiderState);
      if(gameWon) finalScore = newSpiderState.score; // Spider score is calculated differently
      newState = newSpiderState;
    }
    
    if(gameWon) {
        if(finalScore > 0) newState.score = finalScore;
        setIsRunning(false);
        setIsWon(true);
        updateStats({
          gameType: settings.gameType,
          stats: {
            wins: 1,
            bestScore: newState.score,
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
    sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell',
    sourcePileIndex: number,
    sourceCardIndex: number,
    destType: 'tableau' | 'foundation' | 'freecell',
    destPileIndex: number,
  ) => {
    if (!gameState) return;
    
    if (settings.gameType === 'Solitaire' && gameState.gameType === 'Solitaire') {
      const newGameState = JSON.parse(JSON.stringify(gameState)) as SolitaireGameState;
      
      let sourcePile: SolitairePile;
      let cardsToMove: CardType[];

      if (sourceType === 'tableau') {
          sourcePile = newGameState.tableau[sourcePileIndex];
          cardsToMove = sourcePile.slice(sourceCardIndex);
      } else if (sourceType === 'waste') {
          sourcePile = newGameState.waste;
          cardsToMove = [sourcePile[sourceCardIndex]];
      } else if (sourceType === 'foundation') {
          sourcePile = newGameState.foundation[sourcePileIndex];
          cardsToMove = [sourcePile[sourceCardIndex]];
      } else {
        return;
      }

      if (cardsToMove.length === 0) return;
      const cardToMove = cardsToMove[0];

      if (destType === 'tableau') {
          const destPile = newGameState.tableau[destPileIndex];
          const destTopCard = destPile.length > 0 ? destPile[destPile.length - 1] : undefined;
          
          if (canMoveSolitaireToTableau(cardToMove, destTopCard)) {
              sourcePile.splice(sourceCardIndex);
              destPile.push(...cardsToMove);
          } else {
              return;
          }
      } else if (destType === 'foundation') {
          // Can only move one card at a time to foundation
          if (cardsToMove.length > 1) return;

          const destPile = newGameState.foundation[destPileIndex];
          const destTopCard = destPile.length > 0 ? destPile[destPile.length - 1] : undefined;
          
          if (canMoveSolitaireToFoundation(cardToMove, destTopCard, destPile)) {
              sourcePile.splice(sourceCardIndex);
              destPile.push(cardToMove);
          } else {
              return;
          }
      } else {
        return;
      }
      
      // Flip the new top card of the source pile if it was a tableau pile
      if (sourceType === 'tableau' && sourcePile.length > 0 && !sourcePile[sourcePile.length - 1].faceUp) {
        sourcePile[sourcePile.length - 1].faceUp = true;
      }
      
      newGameState.moves += 1;
      updateState(newGameState);

    } else if (settings.gameType === 'Freecell' && gameState.gameType === 'Freecell') {
      const newGameState = JSON.parse(JSON.stringify(gameState)) as FreecellGameState;
      let cardToMove: CardType;
      let cardsToMove: CardType[];

      let sourcePile: CardType[] | (CardType | null)[]
      if (sourceType === 'tableau') sourcePile = newGameState.tableau[sourcePileIndex];
      else if (sourceType === 'freecell') sourcePile = newGameState.freecells;
      else sourcePile = newGameState.foundation[sourcePileIndex];
      
      const movableCount = getMovableCardCount(newGameState);
      const movingCount = sourceType === 'tableau' ? newGameState.tableau[sourcePileIndex].length - sourceCardIndex : 1;
      if(movingCount > movableCount) {
        toast({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${movingCount} cards, only ${movableCount} are movable.` });
        return;
      }

      if (sourceType === 'tableau') {
        cardsToMove = newGameState.tableau[sourcePileIndex].slice(sourceCardIndex);
        cardToMove = cardsToMove[0];
      } else if (sourceType === 'freecell') {
        const card = newGameState.freecells[sourcePileIndex];
        if(!card) return;
        cardToMove = card;
        cardsToMove = [card];
      } else {
        return;
      }
      if(!cardToMove) return;

      if (destType === 'tableau') {
        const destPile = newGameState.tableau[destPileIndex];
        const destTopCard = destPile[destPile.length - 1];
        if (canMoveFreecellToTableau(cardToMove, destTopCard)) {
          if (sourceType === 'tableau') {
            newGameState.tableau[sourcePileIndex].splice(sourceCardIndex);
          } else { // freecell
            newGameState.freecells[sourcePileIndex] = null;
          }
          destPile.push(...cardsToMove);
        } else return;
      } else if (destType === 'foundation') {
        if(cardsToMove.length > 1) return;
        const destPile = newGameState.foundation[destPileIndex];
        if(canMoveFreecellToFoundation(cardToMove, destPile)) {
           if (sourceType === 'tableau') {
            newGameState.tableau[sourcePileIndex].splice(sourceCardIndex);
          } else { // freecell
            newGameState.freecells[sourcePileIndex] = null;
          }
          destPile.push(cardToMove);
        } else return;
      } else if (destType === 'freecell') {
        if(cardsToMove.length > 1) return;
        if(newGameState.freecells[destPileIndex] === null) {
          if (sourceType === 'tableau') {
            newGameState.tableau[sourcePileIndex].splice(sourceCardIndex);
          } else { // from another freecell
            newGameState.freecells[sourcePileIndex] = null;
          }
          newGameState.freecells[destPileIndex] = cardToMove;
        } else return;
      } else return;

      newGameState.moves++;
      updateState(newGameState);
    } else if (settings.gameType === 'Spider' && gameState.gameType === 'Spider') {
      const newGameState = JSON.parse(JSON.stringify(gameState)) as SpiderGameState;
      
      if (sourceType !== 'tableau' || destType !== 'tableau') return;

      const sourcePile = newGameState.tableau[sourcePileIndex];
      const cardsToMove = sourcePile.slice(sourceCardIndex);

      if (cardsToMove.length === 0) return;

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
        updateState(newGameState);
      }
    }


  }, [gameState, updateState, settings.gameType, toast]);
  
  const handleDraw = useCallback(() => {
    if (!gameState) return;

    if (settings.gameType === 'Solitaire' && gameState.gameType === 'Solitaire') {
      const newGameState: SolitaireGameState = JSON.parse(JSON.stringify(gameState as SolitaireGameState));
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
    } else if (settings.gameType === 'Spider' && gameState.gameType === 'Spider') {
      const newGameState = JSON.parse(JSON.stringify(gameState)) as SpiderGameState;
      // In Spider, you deal one card to each tableau pile
      if (newGameState.stock.length > 0) {
         // Check if any tableau pile is empty
        const hasEmptyPile = newGameState.tableau.some(pile => pile.length === 0);
        if (hasEmptyPile) {
            toast({
                variant: "destructive",
                title: "Invalid Move",
                description: "You cannot deal new cards while there is an empty tableau pile.",
            });
            return;
        }
        const dealCount = newGameState.tableau.length;
        if(newGameState.stock.length >= dealCount) {
          for(let i = 0; i < dealCount; i++) {
            const card = newGameState.stock.pop()!;
            card.faceUp = true;
            newGameState.tableau[i].push(card);
          }
          newGameState.moves++;
          updateState(newGameState);
        }
      }
    }
  }, [gameState, updateState, settings.gameType, toast]);
    
  const handleDragStart = (e: DragEvent, info: DraggingCardInfo) => {
    e.dataTransfer.setData('application/json', JSON.stringify(info));
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e: DragEvent, destType: 'tableau' | 'foundation' | 'freecell', destPileIndex: number) => {
    e.preventDefault();
    const infoJSON = e.dataTransfer.getData('application/json');
    if (!infoJSON) return;

    const info: DraggingCardInfo = JSON.parse(infoJSON);
    moveCards(info.type, info.pileIndex, info.cardIndex, destType, destPileIndex);
  };

  const handleCardClick = useCallback((sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell', pileIndex: number, cardIndex: number) => {
    if (!gameState) return;

    if (settings.gameType === 'Solitaire' && gameState.gameType === 'Solitaire') {
      const gs = gameState as SolitaireGameState;
      const sourcePile = sourceType === 'waste' 
        ? gs.waste
        : sourceType === 'foundation'
        ? gs.foundation[pileIndex]
        : gs.tableau[pileIndex];

      const card = sourcePile[cardIndex];

      if (!card || (!card.faceUp && sourceType !== 'foundation')) {
          if(sourceType === 'tableau' && cardIndex === gs.tableau[pileIndex].length - 1){
              const newGameState = JSON.parse(JSON.stringify(gs));
              newGameState.tableau[pileIndex][cardIndex].faceUp = true;
              newGameState.moves++;
              updateState(newGameState);
          }
          return;
      }
      
      if (settings.autoMove) {
          // Priority 1: Try moving to foundation
          if(sourcePile.length - 1 === cardIndex) {
            for (let i = 0; i < gs.foundation.length; i++) {
              if (canMoveSolitaireToFoundation(card, gs.foundation[i][gs.foundation[i].length-1], gs.foundation[i])) {
                  moveCards(sourceType as any, pileIndex, cardIndex, 'foundation', i);
                  return;
              }
            }
          }
          
          // Priority 2: Try moving to longest valid tableau pile
          if (sourceType !== 'foundation') {
            const validMoves: { pileIndex: number; pileLength: number }[] = [];
            gs.tableau.forEach((destPile, i) => {
                if (i === pileIndex && sourceType === 'tableau') return;
                const destTopCard = destPile[destPile.length - 1];
                if (canMoveSolitaireToTableau(card, destTopCard)) {
                    validMoves.push({ pileIndex: i, pileLength: destPile.length });
                }
            });

            if (validMoves.length > 0) {
                validMoves.sort((a, b) => b.pileLength - a.pileLength || a.pileIndex - b.pileIndex);
                const bestMove = validMoves[0];
                moveCards(sourceType as any, pileIndex, cardIndex, 'tableau', bestMove.pileIndex);
                return;
            }
          }
      }
    } else if (settings.gameType === 'Freecell' && gameState.gameType === 'Freecell') {
      const gs = gameState as FreecellGameState;
      
      const card = sourceType === 'tableau'
        ? gs.tableau[pileIndex][cardIndex]
        : sourceType === 'freecell'
        ? gs.freecells[pileIndex]
        : null;

      if(!card) return;

      if(settings.autoMove) {
        // Priority 1: Try moving to foundation
        if(cardIndex === gs.tableau[pileIndex]?.length - 1 || sourceType === 'freecell') {
            for (let i = 0; i < gs.foundation.length; i++) {
                if (canMoveFreecellToFoundation(card, gs.foundation[i])) {
                    moveCards(sourceType, pileIndex, cardIndex, 'foundation', i);
                    return;
                }
            }
        }
        
        // Priority 2: Try moving to longest valid tableau pile
        const validTableauMoves: { pileIndex: number; pileLength: number }[] = [];
        gs.tableau.forEach((destPile, i) => {
            if (i === pileIndex && sourceType === 'tableau') return;
            const destTopCard = destPile[destPile.length - 1];
            if (canMoveFreecellToTableau(card, destTopCard)) {
                validTableauMoves.push({ pileIndex: i, pileLength: destPile.length });
            }
        });
        
        if (validTableauMoves.length > 0) {
            validTableauMoves.sort((a, b) => b.pileLength - a.pileLength || a.pileIndex - b.pileIndex);
            const bestMove = validTableauMoves[0];
            moveCards(sourceType, pileIndex, cardIndex, 'tableau', bestMove.pileIndex);
            return;
        }

        // Priority 3: Try moving to an empty freecell
        if (sourceType === 'tableau' && cardIndex === gs.tableau[pileIndex].length - 1) {
          for (let i = 0; i < gs.freecells.length; i++) {
            if (gs.freecells[i] === null) {
              moveCards(sourceType, pileIndex, cardIndex, 'freecell', i);
              return;
            }
          }
        }
      }

    } else if (settings.gameType === 'Spider' && gameState.gameType === 'Spider') {
      const gs = gameState as SpiderGameState;
      
      if (sourceType !== 'tableau') return;
      const sourcePile = gs.tableau[pileIndex];
      const card = sourcePile[cardIndex];

      if(!card || !card.faceUp) {
        if(cardIndex === sourcePile.length -1) {
          const newGameState = JSON.parse(JSON.stringify(gs));
          newGameState.tableau[pileIndex][cardIndex].faceUp = true;
          newGameState.moves++;
          updateState(newGameState);
        }
        return;
      };

      if(settings.autoMove) {
        const validMoves: { pileIndex: number; pileLength: number }[] = [];
        const cardsToMove = sourcePile.slice(cardIndex);

        gs.tableau.forEach((destPile, i) => {
            if (i === pileIndex) return;
            const destTopCard = destPile[destPile.length - 1];
            if (canMoveSpiderToTableau(cardsToMove, destTopCard)) {
                validMoves.push({ pileIndex: i, pileLength: destPile.length });
            }
        });

        if (validMoves.length > 0) {
            validMoves.sort((a, b) => b.pileLength - a.pileLength || a.pileIndex - b.pileIndex);
            const bestMove = validMoves[0];
            moveCards('tableau', pileIndex, cardIndex, 'tableau', bestMove.pileIndex);
            return;
        }
      }
    }
  }, [settings.autoMove, gameState, moveCards, updateState, settings.gameType]);

  const renderLoader = () => (
    <>
      <div className="flex flex-col min-h-screen">
      <GameHeader 
          onNewGame={() => {}} 
          onUndo={() => {}} 
          onSettings={() => setIsSettingsOpen(true)}
          onStats={() => setIsStatsOpen(true)}
          canUndo={false}
        />
        <main className="flex-grow p-2 md:p-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 lg:gap-4 mb-4">
              <Skeleton className="w-full aspect-[7/10] rounded-md" />
              <Skeleton className="w-full aspect-[7/10] rounded-md" />
              <Skeleton className="w-full aspect-[7/10] rounded-md" />
              <Skeleton className="w-full aspect-[7/10] rounded-md" />
              <Skeleton className="w-full aspect-[7/10] rounded-md" />
              <Skeleton className="w-full aspect-[7/10] rounded-md" />
              <Skeleton className="w-full aspect-[7/10] rounded-md" />
          </div>
           <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 lg:gap-4 min-h-[28rem]">
              {Array.from({length: 7}).map((_, i) => <Skeleton key={i} className="w-full h-36 rounded-md"/>)}
           </div>
        </main>
      </div>
    </>
  );

  if (!isClient || !gameState) {
    return renderLoader();
  }

  const renderSolitaire = () => {
    if (gameState.gameType !== 'Solitaire') return null;
    const gs = gameState as SolitaireGameState;
    const gridCols = 'grid-cols-7';
    return (
      <>
        <div className={`grid ${gridCols} gap-x-[clamp(2px,1.5vw,12px)] mb-4`}>
          <div onClick={handleDraw} className="cursor-pointer">
            <Card card={gs.stock.length > 0 ? { ...gs.stock[0], faceUp: false } : undefined} />
          </div>
          <div>
            {gs.waste.length > 0 ?
              <Card 
                card={gs.waste[gs.waste.length - 1]} 
                draggable={true}
                onDragStart={(e) => handleDragStart(e, {type: 'waste', pileIndex: 0, cardIndex: gs.waste.length-1})}
                onClick={() => handleCardClick('waste', 0, gs.waste.length - 1)}
              /> : <Card />
            }
          </div>
          <div className="col-span-1" />
          {gs.foundation.map((pile, i) => (
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
        <div className={`grid ${gridCols} gap-x-[clamp(2px,1.5vw,12px)] min-h-[28rem]`}>
          {gs.tableau.map((pile, pileIndex) => (
            <div 
              key={pileIndex} 
              className="relative"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'tableau', pileIndex)}
            >
              <div className="absolute top-0 left-0 w-full h-full">
                {pile.length === 0 ? (
                  <Card />
                ) : (
                  pile.map((card, cardIndex) => {
                    const isTopCard = cardIndex === pile.length - 1;
                    return (
                      <div 
                        key={`${card.suit}-${card.rank}-${cardIndex}`} 
                        className="absolute w-full" 
                        style={{ top: 0 }}
                      >
                        <div className={cn(
                          "relative w-full",
                           card.faceUp ? "h-8 sm:h-9 md:h-10" : "h-3"
                          )}
                          style={{
                             transform: `translateY(${pile.slice(0, cardIndex).reduce((total, c) => total + (c.faceUp ? (window.innerWidth < 640 ? 32 : window.innerWidth < 768 ? 36 : 40) : 12), 0)}px)`
                          }}
                        >
                          <Card
                            card={card}
                            draggable={card.faceUp}
                            isStacked={card.faceUp && !isTopCard}
                            onDragStart={(e) => handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
                            onClick={() => handleCardClick('tableau', pileIndex, cardIndex)}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderFreecell = () => {
    if (gameState.gameType !== 'Freecell') return null;
    const gs = gameState as FreecellGameState;
    const gridCols = 'grid-cols-8';
    return (
      <>
         <div className={`grid ${gridCols} gap-x-[clamp(2px,1.5vw,12px)] mb-4`}>
          {/* Freecells */}
          {gs.freecells.map((card, i) => (
            <div 
              key={`freecell-${i}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'freecell', i)}
            >
              <Card 
                card={card || undefined} 
                draggable={!!card}
                onDragStart={(e) => card && handleDragStart(e, {type: 'freecell', pileIndex: i, cardIndex: 0})}
                onClick={() => card && handleCardClick('freecell', i, 0)}
              />
            </div>
          ))}

          {/* Foundations */}
          {gs.foundation.map((pile, i) => (
            <div 
              key={`foundation-${i}`} 
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
        <div className={`grid ${gridCols} gap-x-[clamp(2px,1.5vw,12px)] min-h-[28rem]`}>
          {gs.tableau.map((pile, pileIndex) => (
            <div 
              key={pileIndex} 
              className="relative"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'tableau', pileIndex)}
            >
              <div className="absolute top-0 left-0 w-full h-full">
                {pile.length === 0 ? (
                  <Card />
                ) : (
                  pile.map((card, cardIndex) => {
                    const isTopCard = cardIndex === pile.length - 1;
                    return(
                      <div 
                        key={`${card.suit}-${card.rank}-${cardIndex}`} 
                        className="absolute w-full"
                      >
                         <div className="relative w-full h-8 sm:h-9 md:h-10"
                            style={{
                              transform: `translateY(${cardIndex * (window.innerWidth < 640 ? 32 : window.innerWidth < 768 ? 36 : 40)}px)`
                            }}
                         >
                          <Card
                            card={card}
                            draggable={true}
                            isStacked={!isTopCard}
                            onDragStart={(e) => handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
                            onClick={() => handleCardClick('tableau', pileIndex, cardIndex)}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };
  
  const renderSpider = () => {
    if (gameState.gameType !== 'Spider') return null;
    const gs = gameState as SpiderGameState;
    const gridCols = 'grid-cols-10'; // Spider has 10 tableau piles
    return (
      <>
        <div className={`grid ${gridCols} mb-4 gap-x-0`}>
          {/* Stock pile */}
          <div onClick={handleDraw} className="cursor-pointer">
            <Card card={gs.stock.length > 0 ? { ...gs.stock[0], faceUp: false } : undefined} />
          </div>
          <div className="col-span-1" />
           {/* Foundation Piles */}
           <div className="col-span-8 grid grid-cols-8 gap-x-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`foundation-${i}`}>
                <Card card={gs.foundation[i] ? gs.foundation[i][gs.foundation[i].length -1] : undefined} />
              </div>
            ))}
          </div>
        </div>
        <div className={`grid ${gridCols} gap-x-0 min-h-[28rem]`}>
          {gs.tableau.map((pile, pileIndex) => (
            <div 
              key={pileIndex} 
              className="relative"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'tableau', pileIndex)}
            >
              <div className="absolute top-0 left-0 w-full h-full">
                {pile.length === 0 ? (
                  <Card />
                ) : (
                  pile.map((card, cardIndex) => {
                    const isTopCard = cardIndex === pile.length - 1;
                    return (
                      <div 
                        key={`${card.suit}-${card.rank}-${cardIndex}`} 
                        className="absolute w-full" 
                        style={{ top: 0 }}
                      >
                        <div className={cn(
                          "relative w-full",
                           card.faceUp ? "h-8 sm:h-9 md:h-10" : "h-3"
                          )}
                          style={{
                             transform: `translateY(${pile.slice(0, cardIndex).reduce((total, c) => total + (c.faceUp ? (window.innerWidth < 640 ? 32 : window.innerWidth < 768 ? 36 : 40) : 12), 0)}px)`
                          }}
                        >
                          <Card
                            card={card}
                            draggable={card.faceUp}
                            isStacked={card.faceUp && !isTopCard}
                            onDragStart={(e) => handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
                            onClick={() => handleCardClick('tableau', pileIndex, cardIndex)}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    );
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
      <main className="flex-grow p-2 md:p-4">
        {settings.gameType === 'Solitaire' && gameState.gameType === 'Solitaire' && renderSolitaire()}
        {settings.gameType === 'Freecell' && gameState.gameType === 'Freecell' && renderFreecell()}
        {settings.gameType === 'Spider' && gameState.gameType === 'Spider' && renderSpider()}
      </main>
       <div className="flex justify-center items-center text-sm text-muted-foreground p-2">
          <span>{`Moves: ${gameState.moves} | Time: ${new Date(time * 1000).toISOString().substr(14, 5)} | Score: ${isWon || gameState.gameType === 'Spider' ? gameState.score : 'N/A'}`}</span>
        </div>
      <AlertDialog open={isWon}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Congratulations! You Won!</AlertDialogTitle>
            <AlertDialogDescription>
              Your final score is {gameState.score} in {gameState.moves} moves. Time: {new Date(time * 1000).toISOString().substr(14, 5)}.
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

    

    
