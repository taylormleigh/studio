
"use client";

import { useState, useEffect, useCallback, DragEvent } from 'react';
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

import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { useStats } from '@/hooks/use-stats';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { cn } from '@/lib/utils';
import { useSwipeGestures } from '@/hooks/use-swipe-gestures';


type GameState = SolitaireGameState | FreecellGameState | SpiderGameState;

/**
 * Represents the currently selected card or stack of cards.
 * `type` indicates the source area (e.g., 'tableau', 'waste').
 * `pileIndex` is the index of the pile within that area.
 * `cardIndex` is the index of the specific card within the pile that was clicked/dragged.
 */
export type SelectedCardInfo = {
  type: 'tableau' | 'waste' | 'foundation' | 'freecell';
  pileIndex: number;
  cardIndex: number;
};

/**
 * Represents a pile that should be visually highlighted, typically after a move.
 * `type` indicates the area of the pile.
 * `pileIndex` is the index of the pile to highlight.
 */
export type HighlightedPile = {
  type: 'tableau' | 'foundation' | 'freecell';
  pileIndex: number;
} | null;


// The maximum number of moves that can be undone.
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

  
  // Effect to confirm component has mounted on the client, preventing SSR issues.
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Effect to initialize a new game once the client has mounted, and when settings change.
  useEffect(() => {
    if (isClient) {
      handleNewGame();
    }
  }, [isClient, settings.gameType, settings.solitaireDrawCount, settings.spiderSuits]);

  // Effect to automatically clear the highlighted pile after a short delay.
  useEffect(() => {
    if (highlightedPile) {
      const timer = setTimeout(() => setHighlightedPile(null), 500);
      return () => clearTimeout(timer);
    }
  }, [highlightedPile]);
  
  // Effect to manage the game timer. It runs when the game is active and not won.
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isWon && gameState && isClient) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isWon, gameState, isClient]);

  /**
   * Checks if the current game state meets the win condition for the active game type.
   * If the game is won, it stops the timer, updates stats, and sets the win state.
   * @param state The current game state to check.
   * @returns The updated game state.
   */
  const checkWinCondition = useCallback((state: GameState) => {
    let gameWon = false;
    let finalScore = state.score;
    let finalTime = time;

    // Determine if the game is won based on its type.
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
    
    // If the game is won, update the application state accordingly.
    if (gameWon) {
        setIsRunning(false);
        setIsWon(true);
        updateStats({
            gameType: state.gameType,
            stats: { wins: 1, bestScore: finalScore, bestTime: finalTime, }
        });
        return { ...state, score: finalScore };
    }
    return state;
  }, [time, updateStats]);

  /**
   * Main function to update the game state.
   * It saves the previous state to history for the undo functionality.
   * It also includes special logic for Spider to check for and handle completed sets.
   * @param newState The new state or a function that returns the new state.
   * @param saveHistory Whether to save the previous state to the undo history.
   */
  const updateState = useCallback((newState: GameState | ((prevState: GameState) => GameState), saveHistory = true) => {
    setGameState(prev => {
        if (!prev) return null;
        
        // Save the current state to history before updating.
        if (saveHistory) {
            setHistory(h => [prev, ...h].slice(0, UNDO_LIMIT));
        }

        const nextStateRaw = typeof newState === 'function' ? newState(prev) : newState;

        // Spider-specific logic: Check for completed sets after every move.
        if (nextStateRaw.gameType === 'Spider') {
            let setsCompletedThisMove = 0;
            (nextStateRaw as SpiderGameState).tableau.forEach((pile, index) => {
                const result = checkForSpiderCompletedSet(pile);
                if(result.setsCompleted > 0 && result.completedSet) {
                    // A set was completed. Move it to the foundation.
                    (nextStateRaw as SpiderGameState).foundation.push(result.completedSet);
                    (nextStateRaw as SpiderGameState).tableau[index] = result.updatedPile;
                    setsCompletedThisMove++;
                    // Flip the new top card of the pile if it's face-down.
                    if ((nextStateRaw as SpiderGameState).tableau[index].length > 0 && !(last((nextStateRaw as SpiderGameState).tableau[index])!.faceUp)) {
                        last((nextStateRaw as SpiderGameState).tableau[index])!.faceUp = true;
                    }
                }
            });
            if (setsCompletedThisMove > 0) {
                (nextStateRaw as SpiderGameState).completedSets += setsCompletedThisMove;
                (nextStateRaw as SpiderGameState).score += (setsCompletedThisMove * 100);
            }
        }
        
        // After any state update, check if the game has been won.
        const finalState = checkWinCondition(nextStateRaw);
        return finalState;
    });
  }, [checkWinCondition]);

  /**
   * Starts a new game based on the current settings.
   * Resets all game-related state variables.
   */
  const handleNewGame = useCallback(() => {
    let newState: GameState;
    // Check for a debug state in localStorage for testing purposes.
    const debugStateJSON = localStorage.getItem('deck-of-cards-debug-state');
    if (debugStateJSON) {
        try {
            newState = JSON.parse(debugStateJSON);
            localStorage.removeItem('deck-of-cards-debug-state'); // Use it only once.
        } catch (e) {
            console.error("Failed to parse debug state:", e);
            // Fallback to normal initialization
            if (settings.gameType === 'Solitaire') {
              newState = createSolitaireInitialState(settings.solitaireDrawCount);
            } else if (settings.gameType === 'Freecell') { 
              newState = createFreecellInitialState();
            } else { // Spider
              newState = createSpiderInitialState(settings.spiderSuits);
            }
        }
    } else {
        if (settings.gameType === 'Solitaire') {
          newState = createSolitaireInitialState(settings.solitaireDrawCount);
        } else if (settings.gameType === 'Freecell') { 
          newState = createFreecellInitialState();
        } else { // Spider
          newState = createSpiderInitialState(settings.spiderSuits);
        }
    }

    setGameState(newState);
    setHistory([]);
    setTime(0);
    setIsRunning(true);
    setIsWon(false);
    setSelectedCard(null);
  }, [settings.gameType, settings.solitaireDrawCount, settings.spiderSuits]);

  /**
   * Reverts the game to the previous state from the history stack.
   */
  const handleUndo = useCallback(() => {
    if (history.length > 0) {
      const [lastState, ...rest] = history;
      setGameState(lastState);
      setHistory(rest);
      setSelectedCard(null);
    }
  }, [history]);
  
    /**
   * Handles drawing new cards from the stock pile.
   */
  const handleDraw = useCallback(() => {
    setSelectedCard(null);
    updateState(prev => {
        if(!prev) return prev;
        const newGameState = JSON.parse(JSON.stringify(prev));

        // Solitaire draw logic
        if (newGameState.gameType === 'Solitaire') {
          if (newGameState.stock.length > 0) {
            // Draw cards from stock to waste.
            const numToDraw = Math.min(newGameState.drawCount, newGameState.stock.length);
            const drawnCards = [];
            for (let i = 0; i < numToDraw; i++) {
              const card = newGameState.stock.pop()!;
              card.faceUp = true;
              drawnCards.push(card);
            }
            newGameState.waste.push(...drawnCards.reverse());
          } else if (newGameState.waste.length > 0) {
            // Reset stock from waste if stock is empty.
            newGameState.stock = newGameState.waste.reverse().map((c: CardType) => ({...c, faceUp: false}));
            newGameState.waste = [];
          }
          newGameState.moves += 1;
        } 
        // Spider draw logic
        else if (newGameState.gameType === 'Spider') {
          if (newGameState.stock.length > 0) {
            // Cannot deal with an empty tableau pile.
            const hasEmptyPile = newGameState.tableau.some((pile: CardType[]) => pile.length === 0);
            if (hasEmptyPile) {
                toast({
                    variant: "destructive",
                    title: "Invalid Move",
                    description: "You cannot deal new cards while there is an empty tableau pile.",
                });
                return prev;
            }
            // Deal one card to each tableau pile.
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

  const swipeHandlers = useSwipeGestures({ onSwipeRight: handleUndo });

  useKeyboardShortcuts({
    onNewGame: handleNewGame,
    onUndo: handleUndo,
    onDraw: handleDraw,
    onOpenSettings: () => setIsSettingsOpen(true)
  });

  /**
   * Handles the logic for moving cards between different piles and areas.
   * This function contains the core rules for each game type.
   */
  const moveCards = useCallback((
    sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell',
    sourcePileIndex: number,
    sourceCardIndex: number,
    destType: 'tableau' | 'foundation' | 'freecell',
    destPileIndex: number,
  ) => {
    let moveMade = false;
     updateState(prev => {
        if (!prev) return prev;
        const newGameState = JSON.parse(JSON.stringify(prev));
        
        // --- Solitaire Move Logic ---
        if (newGameState.gameType === 'Solitaire' && (destType === 'tableau' || destType === 'foundation')) {
            let cardsToMove: CardType[];
            
            // Determine which card(s) are being moved.
            if (sourceType === 'waste') {
                if (newGameState.waste.length === 0) return prev;
                cardsToMove = [newGameState.waste[newGameState.waste.length - 1]];
            } else if (sourceType === 'foundation') {
                if (newGameState.foundation[sourcePileIndex].length === 0) return prev;
                cardsToMove = [newGameState.foundation[sourcePileIndex][newGameState.foundation[sourcePileIndex].length - 1]];
            } else { // 'tableau'
                const sourcePile = newGameState.tableau[sourcePileIndex];
                if (sourcePile.length === 0 || !sourcePile[sourceCardIndex]?.faceUp) {
                  return prev; // Cannot move from an empty pile or a face-down card.
                }
                cardsToMove = sourcePile.slice(sourceCardIndex);
            }

            if (cardsToMove.length === 0 || !cardsToMove[0].faceUp) return prev;

            let moveSuccessful = false;
            const cardToMove = cardsToMove[0];

            // Check if the move is valid based on the destination type.
            if (destType === 'tableau') {
                const destPile = newGameState.tableau[destPileIndex];
                const topDestCard = last(destPile);
                if (canMoveSolitaireToTableau(cardToMove, topDestCard)) {
                    destPile.push(...cardsToMove);
                    moveSuccessful = true;
                }
            } else if (destType === 'foundation') {
                if (cardsToMove.length === 1) { // Only single cards can move to foundation.
                    const destPile = newGameState.foundation[destPileIndex];
                    if (canMoveSolitaireToFoundation(cardToMove, destPile)) {
                        destPile.push(cardToMove);
                        moveSuccessful = true;
                    }
                }
            }

            if (moveSuccessful) {
                // Remove card(s) from the source pile.
                if (sourceType === 'waste') {
                    newGameState.waste.pop();
                } else if (sourceType === 'foundation') {
                    newGameState.foundation[sourcePileIndex].pop();
                } else { // 'tableau'
                    const sourcePile = newGameState.tableau[sourcePileIndex];
                    sourcePile.splice(sourceCardIndex);
                    // Flip the new top card if it's face-down.
                    if (sourcePile.length > 0 && !last(sourcePile)!.faceUp) {
                        last(sourcePile)!.faceUp = true;
                    }
                }
                newGameState.moves++;
                setHighlightedPile({ type: destType, pileIndex: destPileIndex });
                moveMade = true;
                return newGameState;
            }
            return prev; // Return original state if move was invalid.
        }

        // --- Freecell Move Logic ---
        if (newGameState.gameType === 'Freecell') {
          let cardsToMove: CardType[];

          // Determine the cards to move from the source.
          if (sourceType === 'tableau') {
            cardsToMove = newGameState.tableau[sourcePileIndex].slice(sourceCardIndex);
          } else if (sourceType === 'freecell') {
            const card = newGameState.freecells[sourcePileIndex];
            if(!card) return prev;
            cardsToMove = [card];
          } else { // Cannot move from foundation
            return prev;
          }

          if (cardsToMove.length === 0) return prev;
          const cardToMove = cardsToMove[0];

          // Check if the stack to move is a valid run.
          if (!isFreecellRun(cardsToMove)) {
            toast({ variant: "destructive", title: "Invalid Move", description: "You can only move cards that are in sequence (descending rank, alternating colors)." });
            return prev;
          }

          // Check if the number of cards being moved is allowed.
          const isDestinationEmpty = destType === 'tableau' && newGameState.tableau[destPileIndex].length === 0;
          const movableCount = getMovableCardCount(newGameState, isDestinationEmpty);
          if(cardsToMove.length > movableCount) {
            toast({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${cardsToMove.length} cards. Only ${movableCount} are movable.` });
            return prev;
          }

          let moveSuccessful = false;
          // Check if the move is valid based on the destination type.
          if (destType === 'tableau') {
            const destPile = newGameState.tableau[destPileIndex];
            if (canMoveFreecellToTableau(cardToMove, last(destPile))) {
              destPile.push(...cardsToMove);
              moveSuccessful = true;
            }
          } else if (destType === 'foundation') {
            if(cardsToMove.length === 1) { // Only single cards to foundation.
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
             // Remove card(s) from the source.
             if (sourceType === 'tableau') {
                newGameState.tableau[sourcePileIndex].splice(sourceCardIndex);
              } else { // 'freecell'
                newGameState.freecells[sourcePileIndex] = null;
              }
            newGameState.moves++;
            setHighlightedPile({ type: destType, pileIndex: destPileIndex });
            moveMade = true;
            return newGameState;
          }
          return prev;
        }

        // --- Spider Move Logic ---
        if (newGameState.gameType === 'Spider' && sourceType === 'tableau' && destType === 'tableau') {
          const sourcePile = newGameState.tableau[sourcePileIndex];
          const cardsToMove = sourcePile.slice(sourceCardIndex);

          if (cardsToMove.length === 0) return prev;

          const destPile = newGameState.tableau[destPileIndex];
          const destTopCard = last(destPile);
          
          if (canMoveSpiderToTableau(cardsToMove, destTopCard)) {
            // Perform the move.
            sourcePile.splice(sourceCardIndex);
            destPile.push(...cardsToMove);

            // Flip the new top card if it's face-down.
            if (sourcePile.length > 0 && !last(sourcePile)!.faceUp) {
              last(sourcePile)!.faceUp = true;
            }

            newGameState.moves++;
            newGameState.score--; // Spider score decreases with moves.
            setHighlightedPile({ type: destType, pileIndex: destPileIndex });
            moveMade = true;
            return newGameState;
          }
        }
        
        // If no logic matches, return the previous state.
        return prev;
     }, true);
     return moveMade;
  }, [updateState, toast]);
    
  /**
   * Handles the start of a drag operation.
   * @param e The drag event.
   * @param info Information about the card being dragged.
   */
  const handleDragStart = (e: DragEvent, info: SelectedCardInfo) => {
    e.dataTransfer.setData('application/json', JSON.stringify(info));
    e.dataTransfer.effectAllowed = 'move';
    setSelectedCard(null); // Clear selection on drag start
  };
  
  /**
   * Handles the drop event to complete a move.
   * @param e The drop event.
   * @param destType The type of the destination area.
   * @param destPileIndex The index of the destination pile.
   */
  const handleDrop = (e: DragEvent, destType: 'tableau' | 'foundation' | 'freecell', destPileIndex: number) => {
    e.preventDefault();
    const infoJSON = e.dataTransfer.getData('application/json');
    if (!infoJSON) return;

    const info: SelectedCardInfo = JSON.parse(infoJSON);
    moveCards(info.type, info.pileIndex, info.cardIndex, destType, destPileIndex);
  };
  
  /**
   * Handles all card click events, routing to selection, deselection, or auto-move logic.
   * @param sourceType The area of the clicked card.
   * @param pileIndex The pile index of the clicked card.
   * @param cardIndex The card index of the clicked card.
   */
  const handleCardClick = (sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell', pileIndex: number, cardIndex: number) => {
    if (!gameState) return;
  
    const sourceCardInfo = { type: sourceType, pileIndex, cardIndex };
  
    // Logic for flipping a face-down card in Solitaire/Spider.
    if (gameState.gameType !== 'Freecell' && sourceType === 'tableau') {
      const sourcePile = gameState.tableau[pileIndex];
      const clickedCard = sourcePile?.[cardIndex];
      if (clickedCard && !clickedCard.faceUp && cardIndex === sourcePile.length - 1) {
        updateState(prev => {
          const newGameState = JSON.parse(JSON.stringify(prev!));
          newGameState.tableau[pileIndex][cardIndex].faceUp = true;
          newGameState.moves++;
          return newGameState;
        }, true);
        setSelectedCard(null); // Clear selection after flipping
        return; 
      }
    }
  
    // --- Move Logic (handles both auto-move and second click of a selection) ---
    if (selectedCard) {
      if (selectedCard.type === sourceType && selectedCard.pileIndex === pileIndex && selectedCard.cardIndex === cardIndex) {
        setSelectedCard(null); // Deselect if clicking the same card again.
      } else {
        moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, sourceType as any, pileIndex);
        setSelectedCard(null); // Clear selection after attempting a move.
      }
      return; 
    }
  
    // --- Auto-Move or Select Logic (for the first click) ---
    const clickedCard = 
      (sourceType === 'waste' && gameState.gameType === 'Solitaire') ? last((gameState as SolitaireGameState).waste) :
      (sourceType === 'tableau') ? gameState.tableau[pileIndex]?.[cardIndex] :
      (sourceType === 'foundation' && (gameState.gameType === 'Solitaire')) ? last(gameState.foundation[pileIndex]) :
      (sourceType === 'freecell' && gameState.gameType === 'Freecell') ? (gameState as FreecellGameState).freecells[pileIndex] :
      undefined;
  
    // Only proceed if a valid, face-up card was clicked.
    if (!clickedCard || !(clickedCard as CardType).faceUp) {
      setSelectedCard(null); // Ensure no selection is kept
      return;
    }
  
    if (settings.autoMove) {
      const tryAutoMove = (): boolean => {
        if (gameState.gameType === 'Solitaire' || gameState.gameType === 'Freecell') {
          const g = gameState as SolitaireGameState | FreecellGameState;
          const isSolitaire = g.gameType === 'Solitaire';
          const cardToMove = clickedCard as CardType;

          // 1. Try foundation
          for (let i = 0; i < g.foundation.length; i++) {
            const canMoveFn = isSolitaire ? canMoveSolitaireToFoundation : canMoveFreecellToFoundation;
            if (canMoveFn(cardToMove, g.foundation[i])) {
              return moveCards(sourceType, pileIndex, cardIndex, 'foundation', i);
            }
          }

          // 2. Try tableau
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
          
           // 3. Try freecell (Freecell only)
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
        return false; // No move found
      };

      tryAutoMove();
      setSelectedCard(null); // Always clear selection after an auto-move attempt.
      return;
    }
  
    // If not auto-moving, just set the card as selected.
    setSelectedCard(sourceCardInfo);
  };
  
  
  /**
   * Renders a skeleton loader while the game is initializing.
   */
  const renderLoader = () => (
    <div className="flex flex-col min-h-screen">
    <GameHeader 
        onNewGame={() => {}} 
        onUndo={() => {}} 
        onSettings={() => setIsSettingsOpen(true)}
        onGameMenuOpen={() => setIsGameMenuOpen(true)}
        canUndo={false}
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

  // Show loader until the component has mounted and game state is initialized.
  if (!isClient || !gameState) {
    return renderLoader();
  }
  
  // Adjust container width based on game type for optimal layout.
  const mainContainerMaxWidth = gameState.gameType === 'Spider' 
  ? 'md:max-w-[480px]' 
  : (gameState.gameType === 'Freecell' ? 'md:max-w-[420px]' : 'md:max-w-[420px]');

  const boardProps = {
    gameState: gameState as any, // Cast to any to satisfy specific board props
    selectedCard,
    highlightedPile,
    handleCardClick,
    handleDragStart,
    handleDrop,
    handleDraw,
  };

  return (
    <div 
      className="flex flex-col min-h-screen"
      data-testid="game-board"
    >
      <GameHeader 
        onNewGame={handleNewGame} 
        onUndo={handleUndo} 
        onSettings={() => setIsSettingsOpen(true)}
        onGameMenuOpen={() => setIsGameMenuOpen(true)}
        canUndo={history.length > 0}
      />
      <main className={cn("flex-grow p-2 w-full md:mx-auto", mainContainerMaxWidth)}>
        {gameState.gameType === 'Solitaire' && <SolitaireBoard {...boardProps} moveCards={moveCards} />}
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
