
/**
 * @fileoverview This file contains the core game logic for card interactions.
 * It is structured with a primary controller function, `processCardClick`, which
 * delegates tasks to smaller, single-responsibility helper functions. This ensures
 * a clear and maintainable separation of concerns.
 *
 * The logic adheres to the following flow:
 * 1. An interaction (click, drag) occurs in a UI component (e.g., `game-board.tsx`).
 * 2. The UI component calls `processCardClick` with the game state and click details.
 * 3. `processCardClick` validates the initial click and determines the user's intent.
 * 4. Based on the `autoMove` setting, it dispatches to either `handleAutoMove` or
 *    `handleTwoClickMove`.
 * 5. These functions find and validate potential moves by calling game-specific
 *    rule functions (e.g., `canMoveSolitaireToTableau`).
 * 6. If a valid move is found, `executeMove` is called to produce the new game state.
 * 7. A `ProcessResult` object is returned to the UI, which then updates its state.
 */

import type { GameSettings } from '@/hooks/use-settings';
import type { useToast } from '@/hooks/use-toast';
import type { SelectedCardInfo, HighlightedPile } from '@/components/game/game-board';

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
type GameMove = {
  source: SelectedCardInfo;
  destination: {
    type: 'tableau' | 'foundation' | 'freecell';
    pileIndex: number;
  };
};
type ProcessClickParams = {
    gameState: GameState,
    selectedCard: SelectedCardInfo | null,
    clickSource: ClickSource,
    settings: GameSettings,
    toast: ReturnType<typeof useToast>['toast']
}
export type ProcessResult = {
    newState: GameState | null;
    newSelectedCard: SelectedCardInfo | null;
    highlightedPile: HighlightedPile | null;
    saveHistory: boolean;
};

// ================================================================================================
// Utility Functions
// ================================================================================================

/** Returns the last card in a pile, or undefined if the pile is empty. */
const last = (pile: CardType[]): CardType | undefined => pile[pile.length - 1];

/** Returns the clicked card object from the game state based on click source information. */
const getClickedCard = (gs: GameState, click: ClickSource): CardType | undefined => {
    if (click.cardIndex === -1) return undefined;
    switch (click.type) {
        case 'tableau': return gs.tableau[click.pileIndex]?.[click.cardIndex];
        case 'waste': return gs.gameType === 'Solitaire' ? last((gs as SolitaireGameState).waste) : undefined;
        case 'foundation': return last(gs.foundation[click.pileIndex]);
        case 'freecell': return gs.gameType === 'Freecell' ? (gs as FreecellGameState).freecells[click.pileIndex] || undefined : undefined;
        default: return undefined;
    }
};

/** Returns an array of cards that would be part of a move from a given source. */
const getCardsToMove = (gs: GameState, src: SelectedCardInfo): CardType[] => {
    switch (src.type) {
        case 'tableau': return gs.tableau[src.pileIndex].slice(src.cardIndex);
        case 'waste': return gs.gameType === 'Solitaire' ? [last((gs as SolitaireGameState).waste)!] : [];
        case 'foundation': return (gs.gameType === 'Solitaire' && gs.foundation[src.pileIndex].length > 0) ? [last(gs.foundation[src.pileIndex])!] : [];
        case 'freecell': return (gs.gameType === 'Freecell' && (gs as FreecellGameState).freecells[src.pileIndex]) ? [(gs as FreecellGameState).freecells[src.pileIndex]!] : [];
        default: return [];
    }
};

// ================================================================================================
// Move Execution & Validation
// ================================================================================================

/** Dispatches to the correct game-specific win condition function. */
export const isGameWon = (state: GameState): boolean => {
    if (state.gameType === 'Spider') {
        const newState = checkAndCompleteSpiderSets(state as SpiderGameState);
        return isSpiderWon(newState);
    }
    const isGameWonDispatch = { Solitaire: isSolitaireWon, Freecell: isFreecellWon, Spider: isSpiderWon };
    return isGameWonDispatch[state.gameType](state as any);
}

/** Checks a Spider game for completed sets and moves them to the foundation. */
const checkAndCompleteSpiderSets = (state: SpiderGameState): SpiderGameState => {
    let newState = state;
    let setsFoundInIteration: boolean;
    do {
        setsFoundInIteration = false;
        let tempState = JSON.parse(JSON.stringify(newState)) as SpiderGameState;
        for (let i = 0; i < tempState.tableau.length; i++) {
            const { updatedPile, setsCompleted, completedSet } = checkForSpiderCompletedSet(tempState.tableau[i]);
            if (setsCompleted > 0) {
                setsFoundInIteration = true;
                tempState.tableau[i] = updatedPile;
                if (completedSet) tempState.foundation.push(completedSet);
                tempState.completedSets += setsCompleted;
                tempState.score += setsCompleted * 100;
                if (tempState.tableau[i].length > 0) {
                    last(tempState.tableau[i])!.faceUp = true;
                }
            }
        }
        if (setsFoundInIteration) newState = tempState;
    } while (setsFoundInIteration);
    return newState;
}

/** Executes a validated game move by modifying the game state. */
const executeMove = (gs: GameState, move: GameMove): GameState => {
    let newState = JSON.parse(JSON.stringify(gs));
    const cards = getCardsToMove(newState, move.source);
    
    // Remove cards from source
    switch (move.source.type) {
        case 'tableau':
            const srcPile = newState.tableau[move.source.pileIndex];
            srcPile.splice(move.source.cardIndex);
            if (newState.gameType !== 'Freecell' && srcPile.length > 0) last(srcPile)!.faceUp = true;
            break;
        case 'waste': (newState as SolitaireGameState).waste.pop(); break;
        case 'foundation': newState.foundation[move.source.pileIndex].pop(); break;
        case 'freecell': (newState as FreecellGameState).freecells[move.source.pileIndex] = null; break;
    }

    // Add cards to destination
    switch (move.destination.type) {
        case 'tableau': newState.tableau[move.destination.pileIndex].push(...cards); break;
        case 'foundation': newState.foundation[move.destination.pileIndex].push(...cards); break;
        case 'freecell': (newState as FreecellGameState).freecells[move.destination.pileIndex] = cards[0]; break;
    }

    // Update stats
    newState.moves++;
    if (move.destination.type === 'foundation') newState.score += 10;
    if (move.source.type === 'foundation') newState.score -= 10;
    if (newState.gameType === 'Spider') newState.score--;
    
    return newState;
};

/** Dispatches to the correct game-specific move validation function. */
const isValidMove = (gs: GameState, move: GameMove, tst: ReturnType<typeof useToast>['toast']): boolean => {
    const cards = getCardsToMove(gs, move.source);
    if (cards.length === 0) return false;

    // Game-specific validation logic
    if (gs.gameType === 'Solitaire') {
        if (move.source.type === 'tableau' && !isSolitaireRun(cards)) return false;
        if (move.destination.type === 'foundation') return cards.length === 1 && canMoveSolitaireToFoundation(cards[0], gs.foundation[move.destination.pileIndex]);
        if (move.destination.type === 'tableau') return canMoveSolitaireToTableau(cards[0], last(gs.tableau[move.destination.pileIndex]));
    }
    if (gs.gameType === 'Freecell') {
        const isDestEmpty = move.destination.type === 'tableau' && gs.tableau[move.destination.pileIndex].length === 0;
        const maxMove = getMovableCardCount(gs, isDestEmpty);
        if (cards.length > maxMove) {
            if (tst) tst({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${cards.length} cards. Only ${maxMove} are movable.` });
            return false;
        }
        if (move.source.type === 'tableau' && !isFreecellRun(cards)) return false;
        if (move.destination.type === 'foundation') return cards.length === 1 && canMoveFreecellToFoundation(cards[0], gs.foundation[move.destination.pileIndex]);
        if (move.destination.type === 'tableau') return canMoveFreecellToTableau(cards[0], last(gs.tableau[move.destination.pileIndex]));
        if (move.destination.type === 'freecell') return cards.length === 1 && (gs as FreecellGameState).freecells[move.destination.pileIndex] === null;
    }
    if (gs.gameType === 'Spider') {
        if (!isSpiderRun(cards)) return false;
        if (move.destination.type === 'tableau') return canMoveSpiderToTableau(cards, last(gs.tableau[move.destination.pileIndex]));
    }
    return false;
}

// ================================================================================================
// Click Handling Logic
// ================================================================================================

/** Determines if the initially clicked card or stack is movable. */
const isClickSourceMovable = (gs: GameState, clickInfo: ClickSource): boolean => {
    const card = getClickedCard(gs, clickInfo);
    if (!card || !card.faceUp) return false;

    if (clickInfo.type === 'tableau') {
        const stack = getCardsToMove(gs, clickInfo);
        const isRunDispatch = { Solitaire: isSolitaireRun, Freecell: isFreecellRun, Spider: isSpiderRun };
        return isRunDispatch[gs.gameType](stack);
    }
    return true; // Waste, Foundation, Freecell cards are always movable if face up
}

/** Handles the logic for auto-move enabled clicks. */
const handleAutoMove = (gs: GameState, clickInfo: ClickSource): ProcessResult => {
    const cardsToMove = getCardsToMove(gs, clickInfo);
    
    // Priority 1: Try to move to any foundation pile.
    if (cardsToMove.length === 1) {
        for (let i = 0; i < gs.foundation.length; i++) {
            const move: GameMove = { source: clickInfo, destination: { type: 'foundation', pileIndex: i } };
            if (isValidMove(gs, move, () => {})) {
                return { newState: executeMove(gs, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
            }
        }
    }
    
    // Priority 2: Try to move to any tableau pile.
    for (let i = 0; i < gs.tableau.length; i++) {
        if (clickInfo.type === 'tableau' && clickInfo.pileIndex === i) continue;
        const move: GameMove = { source: clickInfo, destination: { type: 'tableau', pileIndex: i } };
        if (isValidMove(gs, move, () => {})) {
            return { newState: executeMove(gs, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
        }
    }

    // Priority 3: (Freecell only) Try to move to a freecell.
    if (gs.gameType === 'Freecell' && cardsToMove.length === 1) {
        const emptyCellIndex = (gs as FreecellGameState).freecells.findIndex(cell => cell === null);
        if (emptyCellIndex !== -1) {
            const move: GameMove = { source: clickInfo, destination: { type: 'freecell', pileIndex: emptyCellIndex } };
            if (isValidMove(gs, move, () => {})) {
                 return { newState: executeMove(gs, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
            }
        }
    }
    
    // If no auto-move found, just select the card.
    return { newState: null, newSelectedCard: clickInfo, highlightedPile: null, saveHistory: false };
}

/** Handles the logic for a two-click move (auto-move disabled). */
const handleTwoClickMove = (gs: GameState, selectedCard: SelectedCardInfo, clickInfo: ClickSource, tst: ReturnType<typeof useToast>['toast']): ProcessResult => {
    // This function handles the second click when a card is already selected.
    
    const destinationType = clickInfo.type as 'tableau' | 'foundation' | 'freecell';
    const move: GameMove = { source: selectedCard, destination: { type: destinationType, pileIndex: clickInfo.pileIndex } };
    
    // If the attempted move is valid, execute it.
    if (isValidMove(gs, move, tst)) {
        return { newState: executeMove(gs, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
    }
    
    // If the move is invalid, check if the user clicked on another movable card.
    // If so, switch the selection to the new card.
    if (isClickSourceMovable(gs, clickInfo)) {
        return { newState: null, newSelectedCard: clickInfo, highlightedPile: null, saveHistory: false };
    }

    // If the move was invalid and the click was not on a movable card, clear the selection.
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
}

// ================================================================================================
// Main Exported Controller
// ================================================================================================

/** Processes a click on a card or pile, determining the correct action based on the current game state and settings. */
export const processCardClick = ({ gameState, selectedCard, clickSource, settings, toast }: ProcessClickParams): ProcessResult => {
    // Case 1: A card is already selected (this is the second click).
    if (selectedCard) {
        return handleTwoClickMove(gameState, selectedCard, clickSource, toast);
    }
    
    // Case 2: No card is selected (this is the first click).
    const clickedCard = getClickedCard(gameState, clickSource);

    // If the click is on an empty pile or a non-movable card (face-down), do nothing,
    // unless it's a Solitaire face-down card at the top of a tableau pile.
    if (!isClickSourceMovable(gameState, clickSource)) {
        if (gameState.gameType === 'Solitaire' && clickSource.type === 'tableau' && clickedCard && !clickedCard.faceUp && clickSource.cardIndex === gameState.tableau[clickSource.pileIndex].length - 1) {
             let newState = JSON.parse(JSON.stringify(gameState));
             newState.tableau[clickSource.pileIndex][clickSource.cardIndex].faceUp = true;
             newState.moves++;
             return { newState, newSelectedCard: null, highlightedPile: null, saveHistory: true };
        }
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }

    // If the source is movable, decide what to do based on the autoMove setting.
    if (settings.autoMove) {
        return handleAutoMove(gameState, clickSource);
    } else {
        // If auto-move is off, the first click always selects the card.
        return { newState: null, newSelectedCard: clickSource, highlightedPile: null, saveHistory: false };
    }
};