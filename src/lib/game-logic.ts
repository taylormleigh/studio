/**
 * @fileoverview This file contains the core game logic for all card interactions,
 * structured with a primary controller function, `processCardClick`, which delegates
 * tasks to smaller, single-responsibility helper functions. This ensures a clear
 * and maintainable separation of concerns.
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
  cardIndex: number; // -1 signifies a click on an empty pile/area
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

/**
 * Returns the last card in a pile, or undefined if the pile is empty.
 * @param {CardType[]} pile The pile to get the last card from.
 * @returns {CardType | undefined} The last card or undefined.
 */
const last = (pile: CardType[]): CardType | undefined => pile[pile.length - 1];

/**
 * Returns the card object that was clicked from the game state.
 * @param {GameState} gs The current game state.
 * @param {ClickSource} click The information about the click event.
 * @returns {CardType | undefined} The card that was clicked, or undefined.
 */
const getClickedCard = (gs: GameState, click: ClickSource): CardType | undefined => {
    // A cardIndex of -1 means an empty pile was clicked, so there is no card.
    if (click.cardIndex === -1) return undefined;

    switch (click.type) {
        case 'tableau':
            // Returns the specific card from the specified tableau pile.
            return gs.tableau[click.pileIndex]?.[click.cardIndex];
        case 'waste':
            // In Solitaire, the waste pile is a single stack, so it returns the top card.
            return gs.gameType === 'Solitaire' ? last((gs as SolitaireGameState).waste) : undefined;
        case 'foundation':
            // A foundation pile is a single stack, so it returns the top card.
            return last(gs.foundation[click.pileIndex]);
        case 'freecell':
            // In Freecell, it returns the card from the specified freecell slot.
            return gs.gameType === 'Freecell' ? (gs as FreecellGameState).freecells[click.pileIndex] || undefined : undefined;
        default:
            // Other click types like 'stock' have no card to return.
            return undefined;
    }
};

/**
 * Returns an array of one or more cards that would be part of a move from a given source.
 * @param {GameState} gs The current game state.
 * @param {SelectedCardInfo} src The source of the move.
 * @returns {CardType[]} An array of cards to be moved.
 */
const getCardsToMove = (gs: GameState, src: SelectedCardInfo): CardType[] => {
    switch (src.type) {
        case 'tableau':
            // For a tableau, it's the clicked card and all cards on top of it.
            return gs.tableau[src.pileIndex].slice(src.cardIndex);
        case 'waste':
            // For Solitaire's waste, it's only the top card.
            return gs.gameType === 'Solitaire' ? [last((gs as SolitaireGameState).waste)!] : [];
        case 'foundation':
            // From a foundation, you can only move the top card.
            return (gs.gameType === 'Solitaire' || gs.gameType === 'Freecell') && gs.foundation[src.pileIndex].length > 0 ? [last(gs.foundation[src.pileIndex])!] : [];
        case 'freecell':
             // From a freecell, it's the single card in the slot.
            return (gs.gameType === 'Freecell' && (gs as FreecellGameState).freecells[src.pileIndex]) ? [(gs as FreecellGameState).freecells[src.pileIndex]!] : [];
        default:
            // No cards can be moved from other locations like the stock.
            return [];
    }
};

// ================================================================================================
// Move Execution & Validation
// ================================================================================================

/**
 * Checks a Spider game for completed K-A sets and moves them to the foundation.
 * This is a side-effect that happens after a successful move.
 * @param {GameState} state The game state *after* a move has been made.
 * @returns {GameState} The new game state, potentially with completed sets moved.
 */
const checkAndCompleteSpiderSets = (state: GameState): GameState => {
    // This function only applies to Spider Solitaire.
    if (state.gameType !== 'Spider') return state;

    let newState = state;
    let setsFoundInIteration: boolean;
    do {
        // This loop continues as long as completing one set might reveal another.
        setsFoundInIteration = false;
        let tempState = JSON.parse(JSON.stringify(newState)) as SpiderGameState;

        for (let i = 0; i < tempState.tableau.length; i++) {
            // Checks each tableau pile for a completed set.
            const { updatedPile, setsCompleted, completedSet } = checkForSpiderCompletedSet(tempState.tableau[i]);
            if (setsCompleted > 0) {
                // A set was found and removed from the pile.
                setsFoundInIteration = true;
                tempState.tableau[i] = updatedPile;
                if (completedSet) tempState.foundation.push(completedSet);
                tempState.completedSets += setsCompleted;
                tempState.score += setsCompleted * 100;

                // Flip the new top card of the pile face-up.
                if (tempState.tableau[i].length > 0) {
                    last(tempState.tableau[i])!.faceUp = true;
                }
            }
        }
        if (setsFoundInIteration) newState = tempState;
    } while (setsFoundInIteration);
    return newState;
}

/**
 * Dispatches to the correct game-specific win condition function.
 * @param {GameState} state The current game state.
 * @returns {boolean} True if the game is won, false otherwise.
 */
export const isGameWon = (state: GameState): boolean => {
    // This is a dispatch table that calls the appropriate win condition function based on game type.
    const isGameWonDispatch = { Solitaire: isSolitaireWon, Freecell: isFreecellWon, Spider: isSpiderWon };
    return isGameWonDispatch[state.gameType](state as any);
}

/**
 * Executes a validated game move by creating a new game state with the cards moved.
 * @param {GameState} gs The current game state.
 * @param {GameMove} move The move to be executed.
 * @returns {GameState} The new game state after the move.
 */
const executeMove = (gs: GameState, move: GameMove): GameState => {
    // This function operates on a deep copy to ensure immutability.
    let newState = JSON.parse(JSON.stringify(gs));
    const cards = getCardsToMove(newState, move.source);
    
    // Step 1: Remove cards from their original source pile.
    switch (move.source.type) {
        case 'tableau':
            const srcPile = newState.tableau[move.source.pileIndex];
            srcPile.splice(move.source.cardIndex);
            // After removing cards, if the new top card is face-down, flip it up (except in Freecell).
            if (newState.gameType !== 'Freecell' && srcPile.length > 0) last(srcPile)!.faceUp = true;
            break;
        case 'waste': (newState as SolitaireGameState).waste.pop(); break;
        case 'foundation': newState.foundation[move.source.pileIndex].pop(); break;
        case 'freecell': (newState as FreecellGameState).freecells[move.source.pileIndex] = null; break;
    }

    // Step 2: Add the cards to their new destination pile.
    switch (move.destination.type) {
        case 'tableau': newState.tableau[move.destination.pileIndex].push(...cards); break;
        case 'foundation': newState.foundation[move.destination.pileIndex].push(...cards); break;
        case 'freecell': (newState as FreecellGameState).freecells[move.destination.pileIndex] = cards[0]; break;
    }

    // Step 3: Update game statistics like moves and score.
    newState.moves++;
    if (move.destination.type === 'foundation') newState.score += 10;
    if (move.source.type === 'foundation') newState.score -= 10;
    if (newState.gameType === 'Spider') newState.score--;
    
    // Step 4: After a move, check for completed sets in Spider.
    return checkAndCompleteSpiderSets(newState);
};

/**
 * Dispatches to the correct game-specific move validation function.
 * @param {GameState} gs The current game state.
 * @param {GameMove} move The potential move to validate.
 * @param {function} tst The toast function for showing error messages.
 * @returns {boolean} True if the move is valid, false otherwise.
 */
const isValidMove = (gs: GameState, move: GameMove, tst: ReturnType<typeof useToast>['toast']): boolean => {
    const cards = getCardsToMove(gs, move.source);
    if (cards.length === 0) return false;

    // --- Game-specific validation logic ---

    if (gs.gameType === 'Solitaire') {
        // A stack moved within the tableau must be a valid run.
        if (move.source.type === 'tableau' && !isSolitaireRun(cards)) return false;
        // Only single cards can move to the foundation.
        if (move.destination.type === 'foundation') return cards.length === 1 && canMoveSolitaireToFoundation(cards[0], gs.foundation[move.destination.pileIndex]);
        // Validate move to a tableau pile (empty or otherwise).
        if (move.destination.type === 'tableau') return canMoveSolitaireToTableau(cards[0], last(gs.tableau[move.destination.pileIndex]));
    }
    if (gs.gameType === 'Freecell') {
        // Check if the number of cards being moved is allowed.
        const isDestEmpty = move.destination.type === 'tableau' && gs.tableau[move.destination.pileIndex].length === 0;
        const maxMove = getMovableCardCount(gs, isDestEmpty);
        if (cards.length > maxMove) {
            // Provide a user-friendly error message if the move is too large.
            if (tst) tst({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${cards.length} cards. Only ${maxMove} are movable.` });
            return false;
        }
        if (move.source.type === 'tableau' && !isFreecellRun(cards)) return false;
        if (move.destination.type === 'foundation') return cards.length === 1 && canMoveFreecellToFoundation(cards[0], gs.foundation[move.destination.pileIndex]);
        if (move.destination.type === 'tableau') return canMoveFreecellToTableau(cards[0], last(gs.tableau[move.destination.pileIndex]));
        // You can only move a single card to an empty freecell.
        if (move.destination.type === 'freecell') return cards.length === 1 && (gs as FreecellGameState).freecells[move.destination.pileIndex] === null;
    }
    if (gs.gameType === 'Spider') {
        // The stack must be a valid run (same suit).
        if (!isSpiderRun(cards)) return false;
        if (move.destination.type === 'tableau') return canMoveSpiderToTableau(cards, last(gs.tableau[move.destination.pileIndex]));
    }
    return false;
}

// ================================================================================================
// Click Handling Logic
// ================================================================================================

/**
 * Determines if the initially clicked card or stack can be moved.
 * @param {GameState} gs The current game state.
 * @param {ClickSource} clickInfo Information about the clicked card.
 * @returns {boolean} True if the source is movable, false otherwise.
 */
const isClickSourceMovable = (gs: GameState, clickInfo: ClickSource): boolean => {
    const card = getClickedCard(gs, clickInfo);
    // A card must exist and be face-up to be movable.
    if (!card || !card.faceUp) return false;

    if (clickInfo.type === 'tableau') {
        // For tableau clicks, the entire stack being moved must form a valid run.
        const stack = getCardsToMove(gs, clickInfo);
        const isRunDispatch = { Solitaire: isSolitaireRun, Freecell: isFreecellRun, Spider: isSpiderRun };
        return isRunDispatch[gs.gameType](stack);
    }
    // Cards from Waste, Foundation, or Freecells are always movable individually if face-up.
    return true;
}

/**
 * Finds the highest-priority valid auto-move for a given card based on game rules.
 * Priority: Foundation > Tableau > Freecell (Freecell only)
 * @param {GameState} gs The current game state.
 * @param {SelectedCardInfo} source The card/stack to be moved.
 * @returns {GameMove | null} A valid move object, or null if no move is found.
 */
const findAutoMove = (gs: GameState, source: SelectedCardInfo): GameMove | null => {
    const cardsToMove = getCardsToMove(gs, source);
    
    // Priority 1: Try to move to any foundation pile.
    if (cardsToMove.length === 1) {
        for (let i = 0; i < gs.foundation.length; i++) {
            const move: GameMove = { source, destination: { type: 'foundation', pileIndex: i } };
            if (isValidMove(gs, move, () => {})) return move;
        }
    }
    
    // Priority 2: Try to move to any tableau pile.
    for (let i = 0; i < gs.tableau.length; i++) {
        // Prevents trying to move a pile onto itself.
        if (source.type === 'tableau' && source.pileIndex === i) continue;
        const move: GameMove = { source, destination: { type: 'tableau', pileIndex: i } };
        if (isValidMove(gs, move, () => {})) return move;
    }

    // Priority 3: (Freecell only) Try to move a single card to a freecell.
    if (gs.gameType === 'Freecell' && cardsToMove.length === 1) {
        const emptyCellIndex = (gs as FreecellGameState).freecells.findIndex(cell => cell === null);
        if (emptyCellIndex !== -1) {
            const move: GameMove = { source, destination: { type: 'freecell', pileIndex: emptyCellIndex } };
            if (isValidMove(gs, move, () => {})) return move;
        }
    }
    
    // Returns null if no valid auto-move was found.
    return null;
}


/**
 * Handles the logic when the user's first click is on a movable card and auto-move is enabled.
 * @param {GameState} gs The current game state.
 * @param {ClickSource} clickInfo The source of the user's click.
 * @returns {ProcessResult} The result of the operation.
 */
const handleAutoMove = (gs: GameState, clickInfo: ClickSource): ProcessResult => {
    // Finds the best possible move for the clicked card.
    const move = findAutoMove(gs, clickInfo);
    if (move) {
        // If a move is found, execute it and highlight the destination.
        return { newState: executeMove(gs, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
    }
    // If no move is found, do nothing.
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
};


/**
 * Handles the logic for a two-click move sequence when auto-move is disabled.
 * @param {ProcessClickParams} params The parameters for processing the click.
 * @returns {ProcessResult} The result of the operation.
 */
const handleTwoClickMove = ({ gameState, selectedCard, clickSource, toast }: ProcessClickParams): ProcessResult => {
    // This function is called on the second click, when a card is already selected.
    
    // If the user clicks the same card again, deselect it.
    if (selectedCard && selectedCard.type === clickSource.type && selectedCard.pileIndex === clickSource.pileIndex && selectedCard.cardIndex === clickSource.cardIndex) {
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }

    // A click on an empty pile has a cardIndex of -1.
    const isPileClick = clickSource.cardIndex === -1;
    const destinationType = clickSource.type as 'tableau' | 'foundation' | 'freecell';
    const move: GameMove = { source: selectedCard!, destination: { type: destinationType, pileIndex: clickSource.pileIndex } };
    
    // If the attempted move is valid, execute it.
    if (isValidMove(gameState, move, toast)) {
        return { newState: executeMove(gameState, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
    }
    
    // If the move is invalid, check if the user clicked on another movable card.
    // If so, switch the selection to the new card. This makes two-click feel intuitive.
    if (!isPileClick && isClickSourceMovable(gameState, clickSource)) {
        return { newState: null, newSelectedCard: clickSource, highlightedPile: null, saveHistory: false };
    }

    // If the move was invalid and the click was not on another movable card, clear the selection.
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
}


/**
 * Handles the logic for the user's initial click in a move sequence.
 * @param {ProcessClickParams} params The parameters for processing the click.
 * @returns {ProcessResult} The result of the operation.
 */
const handleInitialClick = (params: ProcessClickParams): ProcessResult => {
    // First, check if the clicked source is a valid starting point for a move.
    if (!isClickSourceMovable(params.gameState, params.clickSource)) {
        // Special case: In Solitaire, clicking a face-down top card flips it.
        const { gameState, clickSource } = params;
        const clickedCard = getClickedCard(gameState, clickSource);
        if (gameState.gameType === 'Solitaire' && clickSource.type === 'tableau' && clickedCard && !clickedCard.faceUp && clickSource.cardIndex === gameState.tableau[clickSource.pileIndex].length - 1) {
             let newState = JSON.parse(JSON.stringify(gameState));
             newState.tableau[clickSource.pileIndex][clickSource.cardIndex].faceUp = true;
             newState.moves++;
             return { newState, newSelectedCard: null, highlightedPile: null, saveHistory: true };
        }
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }

    // If auto-move is on, find and execute the best move.
    if (params.settings.autoMove) {
        return handleAutoMove(params.gameState, params.clickSource);
    } 
    
    // If auto-move is off, this first click simply selects the card.
    return { newState: null, newSelectedCard: params.clickSource, highlightedPile: null, saveHistory: false };
};


// ================================================================================================
// Main Exported Controller
// ================================================================================================

/**
 * Processes a click on a card or pile, determining the correct action based on the current game state and settings.
 * @param {ProcessClickParams} params The comprehensive set of parameters for the click event.
 * @returns {ProcessResult} An object containing the new state and UI updates.
 */
export const processCardClick = (params: ProcessClickParams): ProcessResult => {
    // This is the main entry point for all game interaction logic.
    
    // If a card is already selected, this is the second click of a two-click move.
    if (params.selectedCard) {
        return handleTwoClickMove(params);
    }
    
    // Otherwise, this is the initial click of a potential move.
    return handleInitialClick(params);
};
