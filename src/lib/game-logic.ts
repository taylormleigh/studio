
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
    canMoveToTableau as canMoveSolitaireToTableau,
    canMoveToFoundation as canMoveSolitaireToFoundation,
    isRun as isSolitaireRun,
    isGameWon as isSolitaireWon,
} from './solitaire';
import {
    GameState as FreecellGameState,
    canMoveToTableau as canMoveFreecellToTableau,
    canMoveToFoundation as canMoveFreecellToFoundation,
    isRun as isFreecellRun,
    getMovableCardCount,
    isGameWon as isFreecellWon,
} from './freecell';
import {
    GameState as SpiderGameState,
    canMoveToTableau as canMoveSpiderToTableau,
    isRun as isSpiderRun,
    checkForCompletedSet as checkForSpiderCompletedSet,
    isGameWon as isSpiderWon,
} from './spider';


// ================================================================================================
// Type Definitions
// ================================================================================================

export type GameState = SolitaireGameState | FreecellGameState | SpiderGameState;
export type ClickSource = {
  type: 'tableau' | 'waste' | 'foundation' | 'freecell' | 'stock';
  pileIndex: number;
  cardIndex: number;
}
export type GameMove = {
  source: SelectedCardInfo;
  destination: {
    type: 'tableau' | 'foundation' | 'freecell';
    pileIndex: number;
  };
};
type ProcessResult = {
    newState: GameState | null;
    newSelectedCard: SelectedCardInfo | null;
    highlightedPile: HighlightedPile | null;
    saveHistory: boolean;
};

// ================================================================================================
// Utility Functions
// ================================================================================================

export const last = (pile: CardType[]): CardType | undefined => pile.length > 0 ? pile[pile.length - 1] : undefined;

const getCardsToMove = (gameState: GameState, source: SelectedCardInfo): CardType[] => {
    switch (source.type) {
        case 'tableau':    return gameState.tableau[source.pileIndex].slice(source.cardIndex);
        case 'waste':      return gameState.gameType === 'Solitaire' ? [last((gameState as SolitaireGameState).waste)!] : [];
        case 'foundation': return gameState.gameType === 'Solitaire' ? [last(gameState.foundation[source.pileIndex])!] : [];
        case 'freecell':   return (gameState as FreecellGameState).freecells[source.pileIndex] ? [(gameState as FreecellGameState).freecells[source.pileIndex]!] : [];
    }
};

const getClickedCard = (gameState: GameState, clickInfo: ClickSource): CardType | undefined => {
    switch (clickInfo.type) {
        case 'tableau':    return gameState.tableau[clickInfo.pileIndex]?.[clickInfo.cardIndex];
        case 'waste':      return gameState.gameType === 'Solitaire' ? last((gameState as SolitaireGameState).waste) : undefined;
        case 'foundation': return last(gameState.foundation[clickInfo.pileIndex]);
        case 'freecell':   return gameState.gameType === 'Freecell' ? (gameState as FreecellGameState).freecells[clickInfo.pileIndex] || undefined : undefined;
        default:           return undefined;
    }
};

// ================================================================================================
// Game Win/Completion Checks
// ================================================================================================

const isGameWonDispatch = {
    Solitaire: isSolitaireWon,
    Freecell: isFreecellWon,
    Spider: isSpiderWon,
};

export function isGameWon(state: GameState): boolean {
    return isGameWonDispatch[state.gameType](state as any);
}

export function checkForCompletedSet(state: GameState): GameState {
    if (state.gameType !== 'Spider') return state;

    let newState = JSON.parse(JSON.stringify(state)) as SpiderGameState;
    let setsFoundInMove = false;

    for (let i = 0; i < newState.tableau.length; i++) {
        const result = checkForSpiderCompletedSet(newState.tableau[i]);
        if (result.setsCompleted > 0) {
            setsFoundInMove = true;
            newState.tableau[i] = result.updatedPile;
            if (result.completedSet) {
                newState.foundation.push(result.completedSet);
            }
            newState.completedSets += result.setsCompleted;
            newState.score += result.setsCompleted * 100;
            // Flip the new top card if the pile is not empty
            if (newState.tableau[i].length > 0) {
                last(newState.tableau[i])!.faceUp = true;
            }
        }
    }
    return setsFoundInMove ? newState : state;
}

// ================================================================================================
// Move Validation Logic
// ================================================================================================

const isValidSolitaireMove = (gameState: SolitaireGameState, move: GameMove): boolean => {
    const cardsToMove = getCardsToMove(gameState, move.source);
    if (!cardsToMove.length) return false;
    const cardToMove = cardsToMove[0];

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
    if (!cardsToMove.length) return false;
    const cardToMove = cardsToMove[0];

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
    if (!cardsToMove.length || !isSpiderRun(cardsToMove)) return false;

    if (move.destination.type === 'tableau') {
        return canMoveSpiderToTableau(cardsToMove, last(gameState.tableau[move.destination.pileIndex]));
    }
    return false;
};

const isValidMoveDispatch = {
    Solitaire: isValidSolitaireMove,
    Freecell: isValidFreecellMove,
    Spider: isValidSpiderMove,
};

const isValidMove = (gameState: GameState, move: GameMove, toast?: ReturnType<typeof useToast>['toast']): boolean => {
    return isValidMoveDispatch[gameState.gameType](gameState as any, move, toast);
};


// ================================================================================================
// Auto-Move Logic
// ================================================================================================

const findSolitaireAutoMove = (gameState: SolitaireGameState, source: SelectedCardInfo): GameMove | null => {
    const cardsToMove = getCardsToMove(gameState, source);
    if (!cardsToMove.length) return null;
    
    // Priority 1: Move single card to Foundation
    if (cardsToMove.length === 1) {
        for (let i = 0; i < gameState.foundation.length; i++) {
            if (isValidSolitaireMove(gameState, { source, destination: { type: 'foundation', pileIndex: i } })) {
                return { source, destination: { type: 'foundation', pileIndex: i } };
            }
        }
    }
    
    // Priority 2: Move stack to another Tableau pile
    if (source.type === 'tableau') {
      for (let i = 0; i < gameState.tableau.length; i++) {
        if (source.pileIndex === i) continue;
        if (isValidSolitaireMove(gameState, { source, destination: { type: 'tableau', pileIndex: i } })) {
            return { source, destination: { type: 'tableau', pileIndex: i } };
        }
      }
    }

    return null;
};

const findFreecellAutoMove = (gameState: FreecellGameState, source: SelectedCardInfo): GameMove | null => {
    const cardsToMove = getCardsToMove(gameState, source);
    if (cardsToMove.length !== 1) return null; 

    // Priority 1: Move to Foundation
    for (let i = 0; i < gameState.foundation.length; i++) {
        if (isValidFreecellMove(gameState, { source, destination: { type: 'foundation', pileIndex: i } })) {
            return { source, destination: { type: 'foundation', pileIndex: i } };
        }
    }
    
    // Priority 2: Move to Tableau
    for (let i = 0; i < gameState.tableau.length; i++) {
        if (source.type === 'tableau' && source.pileIndex === i) continue;
        if (isValidFreecellMove(gameState, { source, destination: { type: 'tableau', pileIndex: i } })) {
            return { source, destination: { type: 'tableau', pileIndex: i } };
        }
    }
    
    // Priority 3: Move to an empty Freecell
    if (source.type !== 'freecell') {
        const emptyCellIndex = gameState.freecells.findIndex(cell => cell === null);
        if (emptyCellIndex !== -1) {
            if (isValidFreecellMove(gameState, { source, destination: { type: 'freecell', pileIndex: emptyCellIndex } })) {
                return { source, destination: { type: 'freecell', pileIndex: emptyCellIndex } };
            }
        }
    }

    return null;
};

const findSpiderAutoMove = (gameState: SpiderGameState, source: SelectedCardInfo): GameMove | null => {
    const cardsToMove = getCardsToMove(gameState, source);
    if (!cardsToMove.length || !isSpiderRun(cardsToMove)) return null;

    for (let i = 0; i < gameState.tableau.length; i++) {
        if (source.pileIndex === i) continue;
        if (isValidSpiderMove(gameState, { source, destination: { type: 'tableau', pileIndex: i } })) {
            return { source, destination: { type: 'tableau', pileIndex: i } };
        }
    }
    return null;
};

const autoMoveDispatch = {
    Solitaire: findSolitaireAutoMove,
    Freecell: findFreecellAutoMove,
    Spider: findSpiderAutoMove,
};

const attemptAutoMove = (gameState: GameState, source: SelectedCardInfo): GameMove | null => {
    return autoMoveDispatch[gameState.gameType](gameState as any, source);
}


// ================================================================================================
// Move Execution
// ================================================================================================

const executeMove = (gameState: GameState, move: GameMove): GameState => {
    let newState = JSON.parse(JSON.stringify(gameState));
    const cardsToMove = getCardsToMove(newState, move.source);
    
    // Remove cards from source
    switch (move.source.type) {
        case 'tableau':
            const sourcePile = newState.tableau[move.source.pileIndex];
            sourcePile.splice(move.source.cardIndex);
            if (newState.gameType !== 'Freecell' && sourcePile.length > 0) {
                last(sourcePile)!.faceUp = true;
            }
            break;
        case 'waste':      (newState as SolitaireGameState).waste.pop(); break;
        case 'foundation': newState.foundation[move.source.pileIndex].pop(); break;
        case 'freecell':   (newState as FreecellGameState).freecells[move.source.pileIndex] = null; break;
    }

    // Add cards to destination
    switch (move.destination.type) {
        case 'tableau':    newState.tableau[move.destination.pileIndex].push(...cardsToMove); break;
        case 'foundation': newState.foundation[move.destination.pileIndex].push(...cardsToMove); break;
        case 'freecell':   (newState as FreecellGameState).freecells[move.destination.pileIndex] = cardsToMove[0]; break;
    }

    // Update game stats
    newState.moves++;
    if (move.destination.type === 'foundation') newState.score += 10;
    if (move.source.type === 'foundation') newState.score -= 10;
    if (gameState.gameType === 'Spider' && move.source.type === 'tableau' && move.destination.type === 'tableau') newState.score--;
    
    return newState;
};


// ================================================================================================
// Main Click Handler Logic
// ================================================================================================

/** Handles a click when no card is currently selected. */
const handleInitialClick = (
    gameState: GameState,
    clickInfo: ClickSource,
    settings: GameSettings,
): ProcessResult => {
    const clickedCard = getClickedCard(gameState, clickInfo);
    if (!clickedCard) return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };

    // Flip face-down card in Solitaire
    if (gameState.gameType === 'Solitaire' && clickInfo.type === 'tableau' && !clickedCard.faceUp && clickInfo.cardIndex === gameState.tableau[clickInfo.pileIndex].length - 1) {
        let newState = JSON.parse(JSON.stringify(gameState));
        newState.tableau[clickInfo.pileIndex][clickInfo.cardIndex].faceUp = true;
        newState.moves++;
        return { newState, newSelectedCard: null, highlightedPile: null, saveHistory: true };
    }
    
    if (!clickedCard.faceUp) return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };

    if (settings.autoMove) {
        const autoMove = attemptAutoMove(gameState, clickInfo);
        if (autoMove) {
            const newState = executeMove(gameState, autoMove);
            return { newState, newSelectedCard: null, highlightedPile: { type: autoMove.destination.type, pileIndex: autoMove.destination.pileIndex }, saveHistory: true };
        }
    }
    
    return { newState: null, newSelectedCard: clickInfo, highlightedPile: null, saveHistory: false };
};


/** Handles a click when a card is already selected. */
const handleMoveWithSelectedCard = (
    gameState: GameState,
    selectedCard: SelectedCardInfo,
    clickInfo: ClickSource,
    toast: ReturnType<typeof useToast>['toast']
): ProcessResult => {
    // Deselect if clicking the same card
    if (selectedCard.type === clickInfo.type && selectedCard.pileIndex === clickInfo.pileIndex && selectedCard.cardIndex === clickInfo.cardIndex) {
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }
    
    const move: GameMove = {
        source: selectedCard,
        destination: { type: clickInfo.type as any, pileIndex: clickInfo.pileIndex }
    };

    if (isValidMove(gameState, move, toast)) {
        const newState = executeMove(gameState, move);
        return { newState, newSelectedCard: null, highlightedPile: { type: move.destination.type, pileIndex: move.destination.pileIndex }, saveHistory: true };
    } else {
        // If move is invalid, deselect the card. A new card might be selected if the user clicked a valid new source.
        const clickedCard = getClickedCard(gameState, clickInfo);
        const newSelected = clickedCard && clickedCard.faceUp ? clickInfo : null;
        return { newState: null, newSelectedCard: newSelected, highlightedPile: null, saveHistory: false };
    }
};


/** Main entry point for processing any card click action. */
export const processCardClick = (
    gameState: GameState,
    selectedCard: SelectedCardInfo | null,
    settings: GameSettings,
    clickInfo: ClickSource,
    toast: ReturnType<typeof useToast>['toast']
): ProcessResult => {
    if (selectedCard) {
        return handleMoveWithSelectedCard(gameState, selectedCard, clickInfo, toast);
    } else {
        return handleInitialClick(gameState, clickInfo, settings);
    }
};
