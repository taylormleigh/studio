
"use client";

import { useState, useEffect, useCallback, DragEvent } from 'react';
import { GameState as SolitaireGameState, createInitialState as createSolitaireInitialState, Pile as SolitairePile, Card as CardType, canMoveToTableau as canMoveSolitaireToTableau, canMoveToFoundation as canMoveSolitaireToFoundation, isGameWon as isSolitaireGameWon } from '@/lib/solitaire';
import { GameState as FreecellGameState, createInitialState as createFreecellInitialState, canMoveToTableau as canMoveFreecellToTableau, canMoveToFoundation as canMoveFreecellToFoundation, isGameWon as isFreecellGameWon, getMovableCardCount } from '@/lib/freecell';
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

type GameState = SolitaireGameState | FreecellGameState;

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
    } else { // Freecell
      newState = createFreecellInitialState();
    }
    setGameState(newState);
    setHistory([]);
    setTime(0);
    setIsRunning(true);
    setIsWon(false);
  }, [settings.gameType, settings.solitaireDrawCount]);
  
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

    const gameWon = settings.gameType === 'Solitaire' 
      ? isSolitaireGameWon(newState as SolitaireGameState)
      : isFreecellGameWon(newState as FreecellGameState);

    if(gameWon) {
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

      if (sourceType === 'tableau') sourcePile = newGameState.tableau[sourcePileIndex];
      else if (sourceType === 'waste') sourcePile = newGameState.waste;
      else sourcePile = newGameState.foundation[sourcePileIndex];

      const cardToMove = sourcePile[sourceCardIndex];
      if (!cardToMove) return;

      if (destType === 'tableau') {
          const destPile = newGameState.tableau[destPileIndex];
          const destTopCard = destPile[destPile.length - 1];
          if (canMoveSolitaireToTableau(cardToMove, destTopCard)) {
              const cardsToMove = sourcePile.splice(sourceCardIndex);
              destPile.push(...cardsToMove);
          } else return;
      } else { // destType === 'foundation'
          const destPile = newGameState.foundation[destPileIndex];
          const topCard = destPile[destPile.length - 1];
          if (sourceCardIndex === sourcePile.length - 1 && canMoveSolitaireToFoundation(cardToMove, topCard, destPile)) {
              const cardsToMove = sourcePile.splice(sourceCardIndex);
              destPile.push(...cardsToMove);
          } else return;
      }
      
      if (sourceType === 'tableau' && sourcePile.length > 0 && !sourcePile[sourcePile.length-1].faceUp) {
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
        console.log(`Cannot move ${movingCount} cards, only ${movableCount} are movable.`);
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
    }

  }, [gameState, updateState, settings.gameType]);
  
  const handleDraw = useCallback(() => {
    if (!gameState || settings.gameType !== 'Solitaire' || gameState.gameType !== 'Solitaire') return;

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
  }, [gameState, updateState, settings.gameType]);
    
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
        if (sourceType === 'tableau') {
          for (let i = 0; i < gs.freecells.length; i++) {
            if (gs.freecells[i] === null) {
              moveCards(sourceType, pileIndex, cardIndex, 'freecell', i);
              return;
            }
          }
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
                    const topPosition = pile.slice(0, cardIndex).reduce((total, c) => total + (c.faceUp ? 1.6 : 0.5), 0);
                    return (
                      <div 
                        key={`${card.suit}-${card.rank}-${cardIndex}`} 
                        className="absolute w-full" 
                        style={{ top: `${topPosition}rem` }}
                      >
                        <Card
                          card={card}
                          draggable={card.faceUp}
                          isStacked={card.faceUp && !isTopCard}
                          onDragStart={(e) => handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
                          onClick={() => handleCardClick('tableau', pileIndex, cardIndex)}
                        />
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
                        style={{ top: `${cardIndex * 1.6}rem` }}
                      >
                        <Card
                          card={card}
                          draggable={true}
                          isStacked={!isTopCard}
                          onDragStart={(e) => handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
                          onClick={() => handleCardClick('tableau', pileIndex, cardIndex)}
                        />
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
