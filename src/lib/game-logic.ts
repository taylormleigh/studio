
/**
 * @fileoverview This file contains the core game logic for card interactions,
 * acting as a central controller that dispatches actions to game-specific
 * rule implementations. It is designed to be highly modular, with each
 * function having a single, clear responsibility.
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
    if (clickInfo.cardIndex === -1) return undefined;
    
    switch (clickInfo.type) {
        case 'tableau':    return gameState.tableau[clickInfo.pileIndex]?.[clickInfo.cardIndex];
        case 'waste':      return gameState.gameType === 'Solitaire' ? last((gameState as SolitaireGameState).waste) : undefined;
        case 'foundation': return last(gameState.foundation[clickInfo.pileIndex]);
        case 'freecell':   return gameState.gameType === 'Freecell' ? (gameState as FreecellGameState).freecells[clickInfo.pileIndex] || undefined : undefined;
        default:           return undefined;
    }
};

// ================================================================================================
// Game Win/Completion Checks (Dispatchers)
// ================================================================================================

const isGameWonDispatch = { Solitaire: isSolitaireWon, Freecell: isFreecellWon, Spider: isSpiderWon };
export const isGameWon = (state: GameState): boolean => isGameWonDispatch[state.gameType](state as any);

export const checkForCompletedSet = (state: GameState): GameState => {
    if (state.gameType !== 'Spider') return state;
    let newState = JSON.parse(JSON.stringify(state)) as SpiderGameState;
    let setsFoundInMove = false;
    for (let i = 0; i < newState.tableau.length; i++) {
        const result = checkForSpiderCompletedSet(newState.tableau[i]);
        if (result.setsCompleted > 0) {
            setsFoundInMove = true;
            newState.tableau[i] = result.updatedPile;
            if (result.completedSet) newState.foundation.push(result.completedSet);
            newState.completedSets += result.setsCompleted;
            newState.score += result.setsCompleted * 100;
            if (newState.tableau[i].length > 0) last(newState.tableau[i])!.faceUp = true;
        }
    }
    return setsFoundInMove ? newState : state;
}

// ================================================================================================
// Move Validation Logic (Game Specific Implementations & Dispatcher)
// ================================================================================================

const isValidSolitaireMove = (gs: SolitaireGameState, move: GameMove, toast: ReturnType<typeof useToast>['toast']): boolean => {
    const cards = getCardsToMove(gs, move.source);
    if (!cards.length) return false;
    if (move.source.type === 'tableau' && !isSolitaireRun(cards)) return false;

    if (move.destination.type === 'foundation') return cards.length === 1 && canMoveSolitaireToFoundation(cards[0], gs.foundation[move.destination.pileIndex]);
    if (move.destination.type === 'tableau') return canMoveSolitaireToTableau(cards[0], last(gs.tableau[move.destination.pileIndex]));
    return false;
};

const isValidFreecellMove = (gs: FreecellGameState, move: GameMove, toast: ReturnType<typeof useToast>['toast']): boolean => {
    const cards = getCardsToMove(gs, move.source);
    if (!cards.length) return false;
    
    const isDestEmpty = move.destination.type === 'tableau' && gs.tableau[move.destination.pileIndex].length === 0;
    const maxMove = getMovableCardCount(gs, isDestEmpty);
    if (cards.length > maxMove) {
        if (toast) toast({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${cards.length} cards. Only ${maxMove} are movable.` });
        return false;
    }
    if (move.source.type === 'tableau' && !isFreecellRun(cards)) return false;
    
    if (move.destination.type === 'foundation') return cards.length === 1 && canMoveFreecellToFoundation(cards[0], gs.foundation[move.destination.pileIndex]);
    if (move.destination.type === 'tableau') return canMoveFreecellToTableau(cards[0], last(gs.tableau[move.destination.pileIndex]));
    if (move.destination.type === 'freecell') return cards.length === 1 && gs.freecells[move.destination.pileIndex] === null;
    return false;
};

const isValidSpiderMove = (gs: SpiderGameState, move: GameMove, toast: ReturnType<typeof useToast>['toast']): boolean => {
    const cards = getCardsToMove(gs, move.source);
    if (!cards.length || !isSpiderRun(cards)) return false;
    if (move.destination.type === 'tableau') return canMoveSpiderToTableau(cards, last(gs.tableau[move.destination.pileIndex]));
    return false;
};

const isValidMoveDispatch = { Solitaire: isValidSolitaireMove, Freecell: isValidFreecellMove, Spider: isValidSpiderMove };
const isValidMove = (gs: GameState, move: GameMove, toast: ReturnType<typeof useToast>['toast']): boolean => isValidMoveDispatch[gs.gameType](gs as any, move, toast);

// ================================================================================================
// Auto-Move Logic: Finders (Game Specific Implementations & Dispatcher)
// ================================================================================================

const findSolitaireAutoMove = (gs: SolitaireGameState, src: SelectedCardInfo): GameMove | null => {
    const toFoundation = findSolitaireAutoMoveToFoundation(gs, src);
    if (toFoundation) return toFoundation;
    return findSolitaireAutoMoveToTableau(gs, src);
}
const findSolitaireAutoMoveToFoundation = (gs: SolitaireGameState, src: SelectedCardInfo): GameMove | null => {
    const cards = getCardsToMove(gs, src);
    if (cards.length !== 1) return null;
    for (let i = 0; i < gs.foundation.length; i++) if (isValidMove(gs, { source: src, destination: { type: 'foundation', pileIndex: i } }, () => {})) return { source: src, destination: { type: 'foundation', pileIndex: i } };
    return null;
}
const findSolitaireAutoMoveToTableau = (gs: SolitaireGameState, src: SelectedCardInfo): GameMove | null => {
    if (src.type !== 'tableau' && src.type !== 'waste') return null;
    for (let i = 0; i < gs.tableau.length; i++) {
        if (src.type === 'tableau' && src.pileIndex === i) continue;
        if (isValidMove(gs, { source: src, destination: { type: 'tableau', pileIndex: i } }, () => {})) return { source: src, destination: { type: 'tableau', pileIndex: i } };
    }
    return null;
};

const findFreecellAutoMoveFromTableau = (gs: FreecellGameState, src: SelectedCardInfo): GameMove | null => findFreecellAutoMoveToFoundation(gs, src) || findFreecellAutoMoveToFreecell(gs, src) || findFreecellAutoMoveToTableau(gs, src);
const findFreecellAutoMoveFromFreecell = (gs: FreecellGameState, src: SelectedCardInfo): GameMove | null => findFreecellAutoMoveToFoundation(gs, src) || findFreecellAutoMoveToTableau(gs, src);
const findFreecellAutoMove = (gs: FreecellGameState, src: SelectedCardInfo): GameMove | null => {
    if (src.type === 'tableau') return findFreecellAutoMoveFromTableau(gs, src);
    if (src.type === 'freecell') return findFreecellAutoMoveFromFreecell(gs, src);
    return null;
};
const findFreecellAutoMoveToFoundation = (gs: FreecellGameState, src: SelectedCardInfo): GameMove | null => {
    if (getCardsToMove(gs, src).length !== 1) return null;
    for (let i = 0; i < gs.foundation.length; i++) if (isValidMove(gs, { source: src, destination: { type: 'foundation', pileIndex: i } }, () => {})) return { source: src, destination: { type: 'foundation', pileIndex: i } };
    return null;
}
const findFreecellAutoMoveToTableau = (gs: FreecellGameState, src: SelectedCardInfo): GameMove | null => {
    for (let i = 0; i < gs.tableau.length; i++) {
        if (src.type === 'tableau' && src.pileIndex === i) continue;
        if (isValidMove(gs, { source: src, destination: { type: 'tableau', pileIndex: i } }, () => {})) return { source: src, destination: { type: 'tableau', pileIndex: i } };
    }
    return null;
}
const findFreecellAutoMoveToFreecell = (gs: FreecellGameState, src: SelectedCardInfo): GameMove | null => {
    if (getCardsToMove(gs, src).length !== 1) return null;
    const emptyCellIdx = gs.freecells.findIndex(cell => cell === null);
    if (emptyCellIdx !== -1) {
        const move: GameMove = { source: src, destination: { type: 'freecell', pileIndex: emptyCellIdx } };
        if (isValidMove(gs, move, () => {})) return move;
    }
    return null;
}

const findSpiderAutoMove = (gs: SpiderGameState, src: SelectedCardInfo): GameMove | null => {
    if (!isSpiderRun(getCardsToMove(gs, src))) return null;
    for (let i = 0; i < gs.tableau.length; i++) {
        if (src.pileIndex === i) continue;
        if (isValidMove(gs, { source: src, destination: { type: 'tableau', pileIndex: i } }, () => {})) return { source: src, destination: { type: 'tableau', pileIndex: i } };
    }
    return null;
};

const autoMoveDispatch = { Solitaire: findSolitaireAutoMove, Freecell: findFreecellAutoMove, Spider: findSpiderAutoMove };
const attemptAutoMove = (gs: GameState, src: SelectedCardInfo): GameMove | null => autoMoveDispatch[gs.gameType](gs as any, src);

// ================================================================================================
// Move Execution
// ================================================================================================

const executeMove = (gs: GameState, move: GameMove): GameState => {
    let newState = JSON.parse(JSON.stringify(gs));
    const cards = getCardsToMove(newState, move.source);
    
    switch (move.source.type) {
        case 'tableau':
            const srcPile = newState.tableau[move.source.pileIndex];
            srcPile.splice(move.source.cardIndex);
            if (newState.gameType !== 'Freecell' && srcPile.length > 0) last(srcPile)!.faceUp = true;
            break;
        case 'waste':      (newState as SolitaireGameState).waste.pop(); break;
        case 'foundation': newState.foundation[move.source.pileIndex].pop(); break;
        case 'freecell':   (newState as FreecellGameState).freecells[move.source.pileIndex] = null; break;
    }

    switch (move.destination.type) {
        case 'tableau':    newState.tableau[move.destination.pileIndex].push(...cards); break;
        case 'foundation': newState.foundation[move.destination.pileIndex].push(...cards); break;
        case 'freecell':   (newState as FreecellGameState).freecells[move.destination.pileIndex] = cards[0]; break;
    }

    newState.moves++;
    if (move.destination.type === 'foundation') newState.score += 10;
    if (move.source.type === 'foundation') newState.score -= 10;
    if (gs.gameType === 'Spider' && move.source.type === 'tableau' && move.destination.type === 'tableau') newState.score--;
    
    return newState;
};

// ================================================================================================
// Main Click Handler Logic: Sub-functions for clarity
// ================================================================================================

/** Handles flipping a face-down card in Solitaire. */
const handleSolitaireTableauFlip = (gs: SolitaireGameState, clickInfo: ClickSource): ProcessResult => {
    let newState = JSON.parse(JSON.stringify(gs));
    newState.tableau[clickInfo.pileIndex][clickInfo.cardIndex].faceUp = true;
    newState.moves++;
    return { newState, newSelectedCard: null, highlightedPile: null, saveHistory: true };
}

const handleInitialClickWithAutoMove = (gs: GameState, clickInfo: ClickSource): ProcessResult => {
    const autoMove = attemptAutoMove(gs, clickInfo);
    if (autoMove) {
        const newState = executeMove(gs, autoMove);
        const highlightedPile = { type: autoMove.destination.type, pileIndex: autoMove.destination.pileIndex };
        return { newState, newSelectedCard: null, highlightedPile, saveHistory: true };
    }
    // If no auto-move found, just select the card
    return { newState: null, newSelectedCard: clickInfo, highlightedPile: null, saveHistory: false };
}

const handleInitialClickWithoutAutoMove = (clickInfo: ClickSource): ProcessResult => {
    return { newState: null, newSelectedCard: clickInfo, highlightedPile: null, saveHistory: false };
}

/** Handles a click when no card is currently selected. */
const handleInitialClick = (gs: GameState, clickInfo: ClickSource, settings: GameSettings): ProcessResult => {
    const clickedCard = getClickedCard(gs, clickInfo);
    if (!clickedCard) return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };

    if (!clickedCard.faceUp) {
        if (gs.gameType === 'Solitaire' && clickInfo.type === 'tableau' && clickInfo.cardIndex === gs.tableau[clickInfo.pileIndex].length - 1) {
            return handleSolitaireTableauFlip(gs as SolitaireGameState, clickInfo);
        }
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }
    
    return settings.autoMove ? handleInitialClickWithAutoMove(gs, clickInfo) : handleInitialClickWithoutAutoMove(clickInfo);
};

/** Handles a click when a card is already selected. */
const handleMoveWithSelectedCard = (gs: GameState, sel: SelectedCardInfo, click: ClickSource, tst: ReturnType<typeof useToast>['toast']): ProcessResult => {
    const clickedCard = getClickedCard(gs, click);
    const destinationType = click.type as 'tableau' | 'foundation' | 'freecell';
    const move: GameMove = { source: sel, destination: { type: destinationType, pileIndex: click.pileIndex } };

    // This is the crucial change: always check if the attempted move is valid first.
    // This correctly handles moves to empty tableau piles, where `clickedCard` would be undefined.
    if (isValidMove(gs, move, tst)) {
        const newState = executeMove(gs, move);
        const highlightedPile = { type: move.destination.type, pileIndex: move.destination.pileIndex };
        return { newState, newSelectedCard: null, highlightedPile, saveHistory: true };
    } 
    
    // If move is invalid, THEN check if we should change selection to the newly clicked card.
    if (clickedCard && clickedCard.faceUp) {
        return { newState: null, newSelectedCard: click, highlightedPile: null, saveHistory: false };
    }

    // Otherwise, the move is invalid and the click was not on a selectable card, so deselect.
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
};


// ================================================================================================
// Main Exported Controller
// ================================================================================================

export const processCardClick = (gs: GameState, sel: SelectedCardInfo | null, set: GameSettings, click: ClickSource, tst: ReturnType<typeof useToast>['toast']): ProcessResult => {
    // If a card is already selected, try to move it or change selection.
    if (sel) {
        // Deselect if clicking the same card again
        if (sel.type === click.type && sel.pileIndex === click.pileIndex && sel.cardIndex === click.cardIndex) {
            return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
        }
        return handleMoveWithSelectedCard(gs, sel, click, tst);
    } 
    // If no card is selected, handle the first click.
    else {
        return handleInitialClick(gs, click, set);
    }
};

    