/**
 * @fileoverview This file contains the core game logic for card interactions,
 * acting as a central controller that dispatches actions to game-specific
 * rule implementations.
 */

import { GameSettings } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';
import { SelectedCardInfo, HighlightedPile } from '@/components/game/game-board';

// Game-specific logic imports
import { 
    GameState as SolitaireGameState, 
    Card as CardType,
    isRun as isSolitaireRun, 
    canMoveToTableau as canMoveSolitaireToTableau, 
    canMoveToFoundation as canMoveSolitaireToFoundation 
} from './solitaire';
import { 
    GameState as FreecellGameState, 
    isRun as isFreecellRun, 
    getMovableCardCount,
    canMoveToTableau as canMoveFreecellToTableau, 
    canMoveToFoundation as canMoveFreecellToFoundation 
} from './freecell';
import { 
    GameState as SpiderGameState, 
    isRun as isSpiderRun, 
    canMoveToTableau as canMoveSpiderToTableau,
    checkForCompletedSet as checkForSpiderCompletedSet
} from './spider';
import { isGameWon as isSolitaireWon } from './solitaire';
import { isGameWon as isFreecellWon } from './freecell';
import { isGameWon as isSpiderWon } from './spider';

// ================================================================================================
// Type Definitions
// ================================================================================================

export type GameState = SolitaireGameState | FreecellGameState | SpiderGameState;
export type GameMove = {
  source: SelectedCardInfo;
  destination: {
    type: 'tableau' | 'foundation' | 'freecell';
    pileIndex: number;
  };
};

// ================================================================================================
// Utility Functions
// ================================================================================================

/** Safely gets the last card of a pile. */
export const last = (pile: CardType[]): CardType | undefined => {
    return pile?.length > 0 ? pile[pile.length - 1] : undefined;
};

/** Checks for and processes completed sets in Spider Solitaire. */
export const checkForCompletedSet = (state: GameState): GameState => {
  if (state.gameType !== 'Spider') return state;
  
  let newState = JSON.parse(JSON.stringify(state));
  let setsCompletedThisMove = 0;
  let scoreBonus = 0;

  (newState as SpiderGameState).tableau.forEach((pile, index) => {
    const result = checkForSpiderCompletedSet(pile);
    if (result.setsCompleted > 0 && result.completedSet) {
      (newState as SpiderGameState).foundation.push(result.completedSet);
      (newState as SpiderGameState).tableau[index] = result.updatedPile;
      setsCompletedThisMove++;
      scoreBonus += 100;
      // Flip the new top card if it's face down
      const newTopCard = last((newState as SpiderGameState).tableau[index]);
      if (newTopCard && !newTopCard.faceUp) {
        newTopCard.faceUp = true;
      }
    }
  });

  if (setsCompletedThisMove > 0) {
    newState.completedSets += setsCompletedThisMove;
    newState.score += scoreBonus;
  }

  return newState;
}

/** Checks if the game has been won based on its type. */
export function isGameWon(state: GameState): boolean {
    if (state.gameType === 'Solitaire') return isSolitaireWon(state);
    if (state.gameType === 'Freecell') return isFreecellWon(state);
    if (state.gameType === 'Spider') return isSpiderWon(state);
    return false;
}

/**
 * Retrieves the specific card(s) from the game state based on the source info.
 * For tableau/waste/foundation, it gets the stack from the card index onwards.
 * For freecell, it gets the single card.
 * @returns An array of cards to be moved.
 */
const getCardsToMove = (gameState: GameState, source: SelectedCardInfo): CardType[] => {
    switch (source.type) {
        case 'tableau':
            return gameState.tableau[source.pileIndex].slice(source.cardIndex);
        case 'waste':
            return gameState.gameType === 'Solitaire' ? [(gameState as SolitaireGameState).waste.slice(-1)[0]] : [];
        case 'foundation':
            // Can only move single cards from foundation in Solitaire
            if (gameState.gameType === 'Solitaire') {
              const pile = gameState.foundation[source.pileIndex];
              return pile.length > 0 ? [pile[pile.length-1]] : [];
            }
            return [];
        case 'freecell':
            const card = gameState.gameType === 'Freecell' ? (gameState as FreecellGameState).freecells[source.pileIndex] : null;
            return card ? [card] : [];
        default:
            return [];
    }
};

/**
 * Retrieves the card that was directly clicked by the user.
 * @returns The clicked card object, or undefined if not found.
 */
const getClickedCard = (gameState: GameState, clickInfo: { sourceType: string, pileIndex: number, cardIndex: number }): CardType | undefined => {
    const { sourceType, pileIndex, cardIndex } = clickInfo;
    switch (sourceType) {
        case 'tableau':    return gameState.tableau[pileIndex]?.[cardIndex];
        case 'waste':      return gameState.gameType === 'Solitaire' ? last((gameState as SolitaireGameState).waste) : undefined;
        case 'foundation': return last(gameState.foundation[pileIndex]);
        case 'freecell':   return gameState.gameType === 'Freecell' ? (gameState as FreecellGameState).freecells[pileIndex] : undefined;
        default:           return undefined;
    }
}

// ================================================================================================
// Move Validation Logic
// ================================================================================================

const isValidSolitaireMove = (gameState: SolitaireGameState, move: GameMove): boolean => {
    const cardsToMove = getCardsToMove(gameState, move.source);
    if (cardsToMove.length === 0) return false;
    const cardToMove = cardsToMove[0];
    
    // The stack being moved must be a valid run.
    if (move.source.type === 'tableau' && !isSolitaireRun(cardsToMove)) return false;

    if (move.destination.type === 'foundation') {
        return cardsToMove.length === 1 && canMoveSolitaireToFoundation(cardToMove, gameState.foundation[move.destination.pileIndex]);
    }
    if (move.destination.type === 'tableau') {
        return canMoveSolitaireToTableau(cardToMove, last(gameState.tableau[move.destination.pileIndex]));
    }
    return false;
};

const isValidFreecellMove = (gameState: FreecellGameState, move: GameMove, toast?: ReturnType<typeof useToast>['toast']): boolean => {
    const cardsToMove = getCardsToMove(gameState, move.source);
    if (cardsToMove.length === 0) return false;
    const cardToMove = cardsToMove[0];
    
    // Check if the number of cards being moved is allowed
    const isDestinationEmpty = move.destination.type === 'tableau' && gameState.tableau[move.destination.pileIndex].length === 0;
    const movableCount = getMovableCardCount(gameState, isDestinationEmpty);
    if (cardsToMove.length > movableCount) {
        if (toast) toast({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${cardsToMove.length} cards. Only ${movableCount} are movable.` });
        return false;
    }
    if (move.source.type === 'tableau' && !isFreecellRun(cardsToMove)) return false;


    if (move.destination.type === 'foundation') {
        return cardsToMove.length === 1 && canMoveFreecellToFoundation(cardToMove, gameState.foundation[move.destination.pileIndex]);
    }
    if (move.destination.type === 'tableau') {
        return canMoveFreecellToTableau(cardToMove, last(gameState.tableau[move.destination.pileIndex]));
    }
    if (move.destination.type === 'freecell') {
        return cardsToMove.length === 1 && gameState.freecells[move.destination.pileIndex] === null;
    }
    return false;
};

const isValidSpiderMove = (gameState: SpiderGameState, move: GameMove): boolean => {
    const cardsToMove = getCardsToMove(gameState, move.source);
    if (cardsToMove.length === 0 || !isSpiderRun(cardsToMove)) return false;
    
    if (move.destination.type === 'tableau') {
        return canMoveSpiderToTableau(cardsToMove, last(gameState.tableau[move.destination.pileIndex]));
    }
    return false;
};

/** Dispatches to the correct game-specific validation function. */
const isValidMove = (gameState: GameState, move: GameMove, toast?: ReturnType<typeof useToast>['toast']): boolean => {
    switch (gameState.gameType) {
        case 'Solitaire': return isValidSolitaireMove(gameState, move);
        case 'Freecell':  return isValidFreecellMove(gameState, move, toast);
        case 'Spider':    return isValidSpiderMove(gameState, move);
        default:          return false;
    }
};

// ================================================================================================
// Auto-Move Logic
// ================================================================================================

/** Finds a valid auto-move for a Solitaire card. Prioritizes foundation, then tableau. */
const findSolitaireAutoMove = (gameState: SolitaireGameState, source: SelectedCardInfo): GameMove | null => {
    const cardsToMove = getCardsToMove(gameState, source);
    if (cardsToMove.length === 0) return null;

    // Priority 1: Move a single card to any valid foundation pile.
    if (cardsToMove.length === 1) {
        for (let i = 0; i < gameState.foundation.length; i++) {
            if (isValidSolitaireMove(gameState, { source, destination: { type: 'foundation', pileIndex: i } })) {
                return { source, destination: { type: 'foundation', pileIndex: i } };
            }
        }
    }
    
    // Priority 2: Move a stack to any valid tableau pile.
    if (source.type === 'tableau' && isSolitaireRun(cardsToMove)) {
        for (let i = 0; i < gameState.tableau.length; i++) {
            if (source.pileIndex === i) continue; // Don't move to the same pile
            if (isValidSolitaireMove(gameState, { source, destination: { type: 'tableau', pileIndex: i } })) {
                return { source, destination: { type: 'tableau', pileIndex: i } };
            }
        }
    }
    
    // Priority 3: Move a single card from the waste pile to the tableau
    if (source.type === 'waste' && cardsToMove.length === 1) {
        for (let i = 0; i < gameState.tableau.length; i++) {
            if (isValidSolitaireMove(gameState, { source, destination: { type: 'tableau', pileIndex: i } })) {
                return { source, destination: { type: 'tableau', pileIndex: i } };
            }
        }
    }

    return null;
};

/** Finds a valid auto-move for a Freecell card. Prioritizes foundation, then tableau, then freecells. */
const findFreecellAutoMove = (gameState: FreecellGameState, source: SelectedCardInfo): GameMove | null => {
    const cardsToMove = getCardsToMove(gameState, source);
    if (cardsToMove.length !== 1) return null; // Can only auto-move single cards in Freecell

    // Priority 1: Move to any valid foundation pile.
    for (let i = 0; i < gameState.foundation.length; i++) {
        if (isValidFreecellMove(gameState, { source, destination: { type: 'foundation', pileIndex: i } })) {
            return { source, destination: { type: 'foundation', pileIndex: i } };
        }
    }
    
    // Priority 2: Move to any empty tableau pile.
    const emptyTableauIndex = gameState.tableau.findIndex(pile => pile.length === 0);
    if (emptyTableauIndex !== -1 && source.pileIndex !== emptyTableauIndex) {
        if (isValidFreecellMove(gameState, { source, destination: { type: 'tableau', pileIndex: emptyTableauIndex } })) {
            return { source, destination: { type: 'tableau', pileIndex: emptyTableauIndex } };
        }
    }
    
    // Priority 3: Move to an empty freecell.
    if (source.type !== 'freecell') { // Don't move from one freecell to another automatically
      const emptyCellIndex = gameState.freecells.findIndex(cell => cell === null);
      if (emptyCellIndex !== -1) {
           if (isValidFreecellMove(gameState, { source, destination: { type: 'freecell', pileIndex: emptyCellIndex } })) {
              return { source, destination: { type: 'freecell', pileIndex: emptyCellIndex } };
          }
      }
    }


    return null;
};

/** Finds a valid auto-move for a Spider card stack. */
const findSpiderAutoMove = (gameState: SpiderGameState, source: SelectedCardInfo): GameMove | null => {
    const cardsToMove = getCardsToMove(gameState, source);
    if (cardsToMove.length === 0 || !isSpiderRun(cardsToMove)) return null;

    for (let i = 0; i < gameState.tableau.length; i++) {
        if (source.pileIndex === i) continue;
        if (isValidSpiderMove(gameState, { source, destination: { type: 'tableau', pileIndex: i } })) {
            return { source, destination: { type: 'tableau', pileIndex: i } };
        }
    }
    
    return null;
};

/** Dispatches to the correct game-specific auto-move finder function. */
const attemptAutoMove = (gameState: GameState, source: SelectedCardInfo): GameMove | null => {
    switch (gameState.gameType) {
        case 'Solitaire': return findSolitaireAutoMove(gameState, source);
        case 'Freecell':  return findFreecellAutoMove(gameState, source);
        case 'Spider':    return findSpiderAutoMove(gameState, source);
        default:          return null;
    }
}

// ================================================================================================
// Move Execution
// ================================================================================================

/**
 * Creates a deep copy of the game state, executes a validated move, and returns the new state.
 * @returns The new game state after the move.
 */
const executeMove = (gameState: GameState, move: GameMove): GameState => {
    let newState = JSON.parse(JSON.stringify(gameState));
    const { source, destination } = move;

    // This is a re-fetch because newState is a deep copy
    const cardsToMove = getCardsToMove(newState, source);

    // Remove cards from source
    switch (source.type) {
        case 'tableau':
            newState.tableau[source.pileIndex].splice(source.cardIndex);
            // Flip card underneath if it was a tableau move in Solitaire or Spider
            if (newState.gameType !== 'Freecell') {
                const sourcePile = newState.tableau[source.pileIndex];
                if (sourcePile.length > 0) {
                    const topCard = last(sourcePile)!;
                    if (!topCard.faceUp) topCard.faceUp = true;
                }
            }
            break;
        case 'waste':
            (newState as SolitaireGameState).waste.pop();
            break;
        case 'foundation':
            newState.foundation[source.pileIndex].pop();
            break;
        case 'freecell':
            (newState as FreecellGameState).freecells[source.pileIndex] = null;
            break;
    }

    // Add cards to destination
    switch (destination.type) {
        case 'tableau':
            newState.tableau[destination.pileIndex].push(...cardsToMove);
            break;
        case 'foundation':
            newState.foundation[destination.pileIndex].push(...cardsToMove);
            break;
        case 'freecell':
            (newState as FreecellGameState).freecells[destination.pileIndex] = cardsToMove[0];
            break;
    }

    newState.moves++;
    if (newState.gameType === 'Spider' && source.type === 'tableau' && destination.type === 'tableau') {
        newState.score--;
    } else if (newState.gameType === 'Solitaire' || newState.gameType === 'Freecell') {
        if (destination.type === 'foundation') newState.score += 10;
        if (source.type === 'foundation') newState.score -=10;
    }
    
    return newState;
};


// ================================================================================================
// Main Click Handler Logic
// ================================================================================================

/**
 * Handles the logic when a card is clicked but no card is currently selected.
 * It will either attempt an auto-move or select the clicked card.
 */
const handleInitialClick = (
    gameState: GameState,
    clickInfo: { sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell', pileIndex: number, cardIndex: number },
    settings: GameSettings,
    toast: ReturnType<typeof useToast>['toast']
): { newState: GameState | null, newSelectedCard: SelectedCardInfo | null, highlightedPile: HighlightedPile, saveHistory: boolean } => {
    
    const clickedCard = getClickedCard(gameState, clickInfo);
    
    // If an empty pile was clicked, do nothing.
    if (!clickedCard) {
      return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }

    // In Solitaire, if a face-down tableau card is clicked, flip it if it's the top card.
    if (gameState.gameType === 'Solitaire' && clickInfo.sourceType === 'tableau' && !clickedCard.faceUp && clickInfo.cardIndex === gameState.tableau[clickInfo.pileIndex].length - 1) {
        let newState = JSON.parse(JSON.stringify(gameState));
        newState.tableau[clickInfo.pileIndex][clickInfo.cardIndex].faceUp = true;
        newState.moves++;
        return { newState, newSelectedCard: null, highlightedPile: null, saveHistory: true };
    }

    // If the clicked card is not valid for interaction, do nothing.
    if (!clickedCard.faceUp) {
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }

    // If auto-move is enabled, try to find and execute a move.
    if (settings.autoMove) {
        const autoMove = attemptAutoMove(gameState, clickInfo);
        if (autoMove) {
            const newState = executeMove(gameState, autoMove);
            return { newState, newSelectedCard: null, highlightedPile: { type: autoMove.destination.type, pileIndex: autoMove.destination.pileIndex }, saveHistory: true };
        }
    }

    // If no auto-move is found or enabled, select the card for a manual move.
    return { newState: null, newSelectedCard: clickInfo, highlightedPile: null, saveHistory: false };
}

/**
 * Handles the logic when a card is already selected and another pile is clicked.
 * It attempts to move the selected card(s) to the destination pile.
 */
const handleMoveWithSelectedCard = (
    gameState: GameState,
    selectedCard: SelectedCardInfo,
    clickInfo: { sourceType: string, pileIndex: number, cardIndex: number },
    toast: ReturnType<typeof useToast>['toast']
): { newState: GameState | null, newSelectedCard: SelectedCardInfo | null, highlightedPile: HighlightedPile, saveHistory: boolean } => {
    
    // If the same card/pile is clicked again, deselect it.
    if (selectedCard.type === clickInfo.sourceType && selectedCard.pileIndex === clickInfo.pileIndex && selectedCard.cardIndex === clickInfo.cardIndex) {
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }
    
    const move: GameMove = {
        source: selectedCard,
        destination: { type: clickInfo.sourceType as any, pileIndex: clickInfo.pileIndex }
    };

    if (isValidMove(gameState, move, toast)) {
        const newState = executeMove(gameState, move);
        return { newState, newSelectedCard: null, highlightedPile: { type: move.destination.type, pileIndex: move.destination.pileIndex }, saveHistory: true };
    } else {
         // If the move is invalid, just deselect the card.
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }
};

/**
 * Main entry point for processing any card click action.
 * It determines whether to select, deselect, or move a card based on the current game state.
 * @returns An object describing the result of the click action.
 */
export const processCardClick = (
    gameState: GameState,
    selectedCard: SelectedCardInfo | null,
    settings: GameSettings,
    clickInfo: { sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell', pileIndex: number, cardIndex: number },
    toast: ReturnType<typeof useToast>['toast']
): { newState: GameState | null, newSelectedCard: SelectedCardInfo | null, highlightedPile: HighlightedPile, saveHistory: boolean } => {
    
    if (selectedCard) {
        return handleMoveWithSelectedCard(gameState, selectedCard, clickInfo, toast);
    } else {
        return handleInitialClick(gameState, clickInfo, settings, toast);
    }
};
