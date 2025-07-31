

"use client";

import { useState, useEffect, useCallback, DragEvent } from 'react';
import { GameState as SolitaireGameState, createInitialState as createSolitaireInitialState, Card as CardType, canMoveToTableau as canMoveSolitaireToTableau, canMoveToFoundation as canMoveSolitaireToFoundation, isGameWon as isSolitaireGameWon, SUITS, isRun as isSolitaireRun } from '@/lib/solitaire';
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

type SelectedCardInfo = {
  type: 'tableau' | 'waste' | 'foundation' | 'freecell';
  pileIndex: number;
  cardIndex: number;
};

type DraggingCardInfo = SelectedCardInfo;

type HighlightedPile = {
  type: 'tableau' | 'foundation' | 'freecell';
  pileIndex: number;
} | null;


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
  const { stats, updateStats } = useStats();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedCard, setSelectedCard] = useState<SelectedCardInfo | null>(null);
  const [highlightedPile, setHighlightedPile] = useState<HighlightedPile | null>(null);
  
  const bestScore = gameState ? (stats[gameState.gameType]?.bestScore ?? 0) : 0;

  useEffect(() => {
    if (highlightedPile) {
      const timer = setTimeout(() => setHighlightedPile(null), 500);
      return () => clearTimeout(timer);
    }
  }, [highlightedPile]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const updateState = useCallback((newState: GameState | ((prevState: GameState) => GameState), saveHistory = true) => {
    if (saveHistory && gameState) {
        setHistory(prev => [gameState, ...prev].slice(0, UNDO_LIMIT));
    }

    const updateAndCheckWin = (stateToUpdate: GameState) => {
        let gameWon = false;
        let finalScore = 0;

        if (stateToUpdate.gameType === 'Solitaire') {
            gameWon = isSolitaireGameWon(stateToUpdate as SolitaireGameState);
            if(gameWon) finalScore = calculateScore(stateToUpdate.moves, time);
        } else if (stateToUpdate.gameType === 'Freecell') {
            gameWon = isFreecellGameWon(stateToUpdate as FreecellGameState);
            if(gameWon) finalScore = calculateScore(stateToUpdate.moves, time);
        } else if (stateToUpdate.gameType === 'Spider') {
            const newSpiderState = stateToUpdate as SpiderGameState;
            let setsCompletedThisMove = 0;
            newSpiderState.tableau.forEach((pile, index) => {
                const result = checkForSpiderCompletedSet(pile);
                if(result.setsCompleted > 0 && result.completedSet) {
                    newSpiderState.foundation.push(result.completedSet);
                    newSpiderState.tableau[index] = result.updatedPile;
                    setsCompletedThisMove++;
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
        }
        
        if(gameWon) {
            if(finalScore > 0) stateToUpdate.score = finalScore;
            setIsRunning(false);
            setIsWon(true);
            updateStats({
                gameType: stateToUpdate.gameType as any,
                stats: {
                    wins: 1,
                    bestScore: stateToUpdate.score,
                    bestTime: time,
                }
            });
        }
        return stateToUpdate;
    }

    if (typeof newState === 'function') {
        setGameState(prev => {
            if (!prev) return prev;
            const nextState = newState(prev);
            return updateAndCheckWin(nextState);
        });
    } else {
        setGameState(updateAndCheckWin(newState));
    }
  }, [gameState, time, updateStats]);

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
                    sourcePile.splice(sourceCardIndex);
                    if (sourcePile.length > 0 && !sourcePile[sourcePile.length - 1].faceUp) {
                        sourcePile[sourcePile.length - 1].faceUp = true;
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
    
  const handleDragStart = (e: DragEvent, info: DraggingCardInfo) => {
    e.dataTransfer.setData('application/json', JSON.stringify(info));
    e.dataTransfer.effectAllowed = 'move';
    setSelectedCard(null);
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

  const handleFoundationClick = (pileIndex: number) => {
    if (selectedCard) {
      moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, 'foundation', pileIndex);
    }
  }

  const handleFreecellClick = (pileIndex: number) => {
    if (selectedCard) {
        moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, 'freecell', pileIndex);
    } else if (gameState?.gameType === 'Freecell') {
        const card = (gameState as FreecellGameState).freecells[pileIndex];
        if (card) {
            handleCardClick('freecell', pileIndex, 0);
        }
    }
  }
  
  const handleTableauClick = (pileIndex: number) => {
    if (selectedCard) {
      if(selectedCard.type === 'tableau' && selectedCard.pileIndex === pileIndex) {
        setSelectedCard(null); // Deselect if clicking same pile
      } else {
        moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, 'tableau', pileIndex);
      }
    }
  };

  const handleCardClick = (sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell', pileIndex: number, cardIndex: number) => {
    if (!gameState) return;
  
    const card = sourceType === 'tableau' ? gameState.tableau[pileIndex][cardIndex] : null;
  
    // Turn over a face-down card if it's the last in a tableau pile
    if (gameState.gameType === 'Solitaire' && sourceType === 'tableau') {
      const sourcePile = (gameState as SolitaireGameState).tableau[pileIndex];
      const clickedCard = sourcePile?.[cardIndex];
      if (clickedCard && !clickedCard.faceUp && cardIndex === sourcePile.length - 1) {
        updateState(prev => {
          const newGameState = JSON.parse(JSON.stringify(prev as SolitaireGameState));
          newGameState.tableau[pileIndex][cardIndex].faceUp = true;
          newGameState.moves++;
          return newGameState;
        });
        setSelectedCard(null);
        return;
      }
    }
  
    if (selectedCard) {
      // If a card is already selected, this click is the destination
      moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, sourceType as 'tableau' | 'foundation' | 'freecell', pileIndex);
      setSelectedCard(null);
      return;
    }
  
    // If autoMove is off, or if the clicked card is not face-up, just select it.
    if (!settings.autoMove || (card && !card.faceUp)) {
      if (card?.faceUp) {
        setSelectedCard({ type: sourceType, pileIndex, cardIndex });
      }
      return;
    }
  
    // --- Auto-move logic ---
    if (gameState.gameType === 'Solitaire' && sourceType === 'tableau') {
      const sourcePile = gameState.tableau[pileIndex];
      const clickedCard = sourcePile?.[cardIndex];
      if (!clickedCard || !clickedCard.faceUp) return;
  
      // If the user clicks the top card of a pile, the intent is to move a single card.
      if (cardIndex === sourcePile.length - 1) {
        // 1. Try to move the single card to any foundation
        for (let i = 0; i < gameState.foundation.length; i++) {
          const destPile = gameState.foundation[i];
          const topDestCard = destPile.length > 0 ? destPile[destPile.length - 1] : undefined;
          if (canMoveSolitaireToFoundation(clickedCard, topDestCard) && (!topDestCard || topDestCard.suit === clickedCard.suit)) {
            moveCards(sourceType, pileIndex, cardIndex, 'foundation', i);
            return;
          }
        }
        // 2. If no foundation move, try to move the single card to any other tableau pile
        for (let i = 0; i < gameState.tableau.length; i++) {
          if (i === pileIndex) continue;
          const destTopCard = gameState.tableau[i][gameState.tableau[i].length - 1];
          if (canMoveSolitaireToTableau(clickedCard, destTopCard)) {
            moveCards(sourceType, pileIndex, cardIndex, 'tableau', i);
            return;
          }
        }
      } else {
        // If the user clicks a card within a stack, the intent is to move the whole stack.
        const cardsToMove = sourcePile.slice(cardIndex);
        if (!isSolitaireRun(cardsToMove)) return; // Not a valid stack to move
  
        // 1. Try to move the entire stack to another tableau pile
        for (let i = 0; i < gameState.tableau.length; i++) {
          if (i === pileIndex) continue;
          const destTopCard = gameState.tableau[i][gameState.tableau[i].length - 1];
          if (canMoveSolitaireToTableau(cardsToMove[0], destTopCard)) {
            moveCards(sourceType, pileIndex, cardIndex, 'tableau', i);
            return;
          }
        }
      }
      // If no auto-move is found, do nothing.
      return;
    }
  
    // Default manual selection logic if no auto-move was executed
    if (selectedCard?.type === sourceType && selectedCard?.pileIndex === pileIndex && selectedCard?.cardIndex === cardIndex) {
      setSelectedCard(null); // Deselect if clicking the same card
    } else if (card?.faceUp) {
      setSelectedCard({ type: sourceType, pileIndex, cardIndex });
    }
  };
  
  const Confetti = () => {
    const confettiCount = 50;
    const colors = ['#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab', '#1e88e5', '#039be5', '#00acc1', '#00897b', '#43a047', '#7cb342', '#c0ca33', '#fdd835', '#ffb300', '#fb8c00', '#f4511e'];
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: confettiCount }).map((_, i) => (
                <div
                    key={i}
                    className="confetti"
                    style={{
                        left: `${Math.random() * 100}vw`,
                        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                        animationDelay: `${Math.random() * 5}s`,
                    }}
                />
            ))}
        </div>
    );
};

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
                isSelected={selectedCard?.type === 'waste'}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, {type: 'waste', pileIndex: 0, cardIndex: gs.waste.length-1})}
                onClick={() => handleCardClick('waste', 0, gs.waste.length - 1)}
              /> : <Card onClick={handleDraw}/>
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
                card={pile.length > 0 ? pile[pile.length - 1] : undefined}
                isHighlighted={highlightedPile?.type === 'foundation' && highlightedPile?.pileIndex === i}
                draggable={pile.length > 0}
                onDragStart={(e) => pile.length > 0 && handleDragStart(e, {type: 'foundation', pileIndex: i, cardIndex: pile.length-1})}
                onClick={(e) => {
                    e.stopPropagation();
                     if (selectedCard) {
                        handleFoundationClick(i);
                     } else if (pile.length > 0) {
                        handleCardClick('foundation', i, pile.length - 1);
                    } else {
                         handleFoundationClick(i);
                    }
                }}
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
              onClick={() => pile.length === 0 && handleTableauClick(pileIndex)}
            >
              <div className="absolute top-0 left-0 w-full h-full">
                {pile.length === 0 ? (
                  <Card isHighlighted={highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}/>
                ) : (
                  pile.map((card, cardIndex) => {
                    const isTopCard = cardIndex === pile.length - 1;
                    const isSelected = selectedCard?.type === 'tableau' && selectedCard?.pileIndex === pileIndex && selectedCard?.cardIndex <= cardIndex;
                    const draggable = card.faceUp && isSolitaireRun(pile.slice(cardIndex));
                    
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
                            isSelected={isSelected}
                            isHighlighted={isTopCard && highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}
                            draggable={draggable}
                            isStacked={card.faceUp && !isTopCard}
                            onDragStart={(e) => draggable && handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick('tableau', pileIndex, cardIndex);
                            }}
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
               onClick={() => handleFreecellClick(i)}
            >
              <Card 
                card={card || undefined} 
                isHighlighted={highlightedPile?.type === 'freecell' && highlightedPile?.pileIndex === i}
                isSelected={selectedCard?.type === 'freecell' && selectedCard?.pileIndex === i}
                draggable={!!card}
                onDragStart={(e) => card && handleDragStart(e, {type: 'freecell', pileIndex: i, cardIndex: 0})}
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
                isHighlighted={highlightedPile?.type === 'foundation' && highlightedPile?.pileIndex === i}
                isSelected={selectedCard?.type === 'foundation' && selectedCard?.pileIndex === i}
                draggable={pile.length > 0}
                onDragStart={(e) => pile.length > 0 && handleDragStart(e, {type: 'foundation', pileIndex: i, cardIndex: pile.length-1})}
                 onClick={(e) => {
                    e.stopPropagation();
                    if (selectedCard) {
                        handleFoundationClick(i);
                    } else if (pile.length > 0) {
                        handleCardClick('foundation', i, pile.length-1);
                    } else {
                        handleFoundationClick(i);
                    }
                }}
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
              onClick={() => pile.length === 0 && handleTableauClick(pileIndex)}
            >
              <div className="absolute top-0 left-0 w-full h-full">
                {pile.length === 0 ? (
                  <Card isHighlighted={highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}/>
                ) : (
                  pile.map((card, cardIndex) => {
                    const isTopCard = cardIndex === pile.length - 1;
                    const movableCards = getMovableCardCount(gs);
                    const canDrag = pile.length - cardIndex <= movableCards;

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
                            isSelected={selectedCard?.type === 'tableau' && selectedCard?.pileIndex === pileIndex && selectedCard?.cardIndex <= cardIndex}
                            isHighlighted={isTopCard && highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}
                            draggable={canDrag}
                            isStacked={!isTopCard}
                            onDragStart={(e) => canDrag && handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick('tableau', pileIndex, cardIndex);
                            }}
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
              onClick={() => pile.length === 0 && handleTableauClick(pileIndex)}
            >
              <div className="absolute top-0 left-0 w-full h-full">
                {pile.length === 0 ? (
                  <Card isHighlighted={highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}/>
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
                            isSelected={selectedCard?.type === 'tableau' && selectedCard?.pileIndex === pileIndex && selectedCard?.cardIndex <= cardIndex}
                            isHighlighted={isTopCard && highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}
                            draggable={card.faceUp}
                            isStacked={card.faceUp && !isTopCard}
                            onDragStart={(e) => card.faceUp && handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick('tableau', pileIndex, cardIndex);
                            }}
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
         {isWon && <Confetti />}
          <AlertDialogHeader>
            <AlertDialogTitle>Congratulations! You Won!</AlertDialogTitle>
            <AlertDialogDescription className='space-y-2'>
              <div>Your final score is {gameState.score} in {gameState.moves} moves. Time: {new Date(time * 1000).toISOString().substr(14, 5)}.</div>
              {bestScore > 0 && <div>Your best score is {bestScore}.</div>}
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

    

    
