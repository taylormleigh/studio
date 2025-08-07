
/**
 * @fileoverview This file acts as the central controller for all card game interactions.
 * It is designed as a dispatcher, delegating game-specific rule validation and
 * execution to the appropriate files (`solitaire.ts`, `freecell.ts`, `spider.ts`).
 * This ensures a clean separation of concerns, where this file manages the "how"
 * of user interaction flows (like auto-move vs. two-click), while the game-specific
 * files manage the "what" (the rules of each game).
 */

import type { GameSettings } from '@/hooks/use-settings';
import type { useToast } from '@/hooks/use-toast';
import type { HighlightedPile } from '@/components/game/game-board';

// Game-specific type and function imports
import { GameState as SolitaireGameState, Card as CardType, isRun as isSolitaireRun, canMoveToFoundation as canMoveToFoundationSolitaire, canMoveToTableau as canMoveToTableauSolitaire, isGameWon as isSolitaireGameWon, findAutoMoveForSolitaire } from './solitaire';
import { GameState as FreecellGameState, canMoveToFoundation as canMoveToFoundationFreecell, canMoveToTableau as canMoveToTableauFreecell, getMovableCardCount, isGameWon as isFreecellGameWon, findAutoMoveForFreecell } from './freecell';
import { GameState as SpiderGameState, isRun as isSpiderRun, canMoveToTableau as canMoveToTableauSpider, checkForCompletedSet as checkForSpiderCompletedSet, isGameWon as isSpiderGameWon, findAutoMoveForSpider } from './spider';

// ================================================================================================
// Type Definitions
// ================================================================================================

export type GameState = SolitaireGameState | FreecellGameState | SpiderGameState;

export type CardLocation = {
    type: 'tableau' | 'waste' | 'foundation' | 'freecell' | 'stock';
    pileIndex: number;
    cardIndex: number;
};

export type LocatedCard = CardType & {
    location: CardLocation;
};

// Represents the source of a user's click action.
export type ClickSource = CardLocation;

// Represents a potential or validated move from a source to a destination.
export type GameMove = {
  source: CardLocation;
  destination: {
    type: 'tableau' | 'foundation' | 'freecell';
    pileIndex: number;
  };
};

// Represents all the necessary data for processing a click event.
type ProcessClickParams = {
    gameState: GameState;
    selectedCard: LocatedCard | null;
    clickSource: ClickSource;
    clickedCard: CardType | undefined;
    settings: GameSettings;
    toast: ReturnType<typeof useToast>['toast'];
};

// Represents the outcome of processing a click, including the new state and UI hints.
export type ProcessResult = {
    newState: GameState | null;
    newSelectedCard: LocatedCard | null;
    highlightedPile: HighlightedPile | null;
    saveHistory: boolean;
};

// ================================================================================================
// Utility Functions
// ================================================================================================

/**
 * Returns the last card in a pile, or undefined if the pile is empty.
 * This is a general utility function for working with card piles.
 */
const last = (pile: CardType[]): CardType | undefined => pile[pile.length - 1];

/**
 * Returns an array of one or more cards that would be part of a move from a given source.
 * This is used to validate and execute moves involving stacks of cards.
 */
const getCardsToMove = (gs: GameState, src: CardLocation): CardType[] => {
    console.log(`[${new Date().toISOString()}] game-logic.ts: getCardsToMove called`, { src });
    switch (src.type) {
        case 'tableau':    
            // Ensure the pile exists before trying to slice.
            return gs.tableau[src.pileIndex] ? gs.tableau[src.pileIndex].slice(src.cardIndex) : [];
        case 'waste':      
            return gs.gameType === 'Solitaire' && (gs as SolitaireGameState).waste.length > 0 ? [last((gs as SolitaireGameState).waste)!] : [];
        case 'foundation': 
            return (gs.gameType === 'Solitaire' || gs.gameType === 'Freecell') && gs.foundation[src.pileIndex].length > 0 ? [last(gs.foundation[src.pileIndex])!] : [];
        case 'freecell':   
            return (gs.gameType === 'Freecell' && (gs as FreecellGameState).freecells[src.pileIndex]) ? [(gs as FreecellGameState).freecells[src.pileIndex]!] : [];
        default:           
            return [];
    }
};


// ================================================================================================
// Move Execution & Validation (Dispatchers)
// ================================================================================================

/**
 * Dispatches to the appropriate game-specific win condition function.
 * This function acts as a dispatcher based on the gameType.
 */
export const isGameWon = (state: GameState): boolean => {
    console.log(`[${new Date().toISOString()}] game-logic.ts: isGameWon called for gameType: ${state.gameType}`);
    const dispatch: {[key in GameState['gameType']]: (s: GameState) => boolean} = {
        Solitaire: (s: GameState) => isSolitaireGameWon(s as SolitaireGameState),
        Freecell:  (s: GameState) => isFreecellGameWon(s as FreecellGameState),
        Spider:    (s: GameState) => isSpiderGameWon(s as SpiderGameState),
    };
    return dispatch[state.gameType](state);
};

/**
 * Dispatches to the correct game-specific auto-move finding function.
 * This acts as a router to the specialized logic in each game's file.
 */
const findAutoMove = (gs: GameState, source: LocatedCard): GameMove | null => {
    console.log(`[${new Date().toISOString()}] game-logic.ts: findAutoMove called for gameType: ${gs.gameType}`);
    switch (gs.gameType) {
        case 'Solitaire': return findAutoMoveForSolitaire(gs as SolitaireGameState, source);
        case 'Freecell':  return findAutoMoveForFreecell(gs as FreecellGameState, source);
        case 'Spider':    return findAutoMoveForSpider(gs as SpiderGameState, source);
    }
};

/**
 * Dispatches to the correct game-specific move validation function.
 * This validates a move against the rules of the current game.
 */
const isValidMove = (gs: GameState, move: GameMove, tst: ReturnType<typeof useToast>['toast']): boolean => {
    console.log(`[${new Date().toISOString()}] game-logic.ts: isValidMove called`, { move });
    const cards = getCardsToMove(gs, move.source);
    if (cards.length === 0) {
        console.log(`[${new Date().toISOString()}] game-logic.ts: isValidMove - no cards to move, invalid`);
        return false;
    }
    const cardToMove = cards[0];

    const dispatch: {[key in GameState['gameType']]: (g: GameState) => boolean} = {
        Solitaire: (g: GameState) => {
            const solGs = g as SolitaireGameState;
            if (move.destination.type === 'foundation') return canMoveToFoundationSolitaire(cardToMove, solGs.foundation[move.destination.pileIndex]);
            if (move.destination.type === 'tableau') return canMoveToTableauSolitaire(cardToMove, last(solGs.tableau[move.destination.pileIndex]));
            return false;
        },
        Freecell: (g: GameState) => {
            const freeGs = g as FreecellGameState;
            if (move.destination.type === 'tableau') {
                const isDestEmpty = freeGs.tableau[move.destination.pileIndex].length === 0;
                const maxMove = getMovableCardCount(freeGs, isDestEmpty);
                if (cards.length > maxMove) {
                    if (tst) tst({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${cards.length} cards. Only ${maxMove} are movable.` });
                    return false;
                }
                return canMoveToTableauFreecell(cardToMove, last(freeGs.tableau[move.destination.pileIndex]));
            }
            if (move.destination.type === 'foundation') return cards.length === 1 && canMoveToFoundationFreecell(cardToMove, freeGs.foundation[move.destination.pileIndex]);
            if (move.destination.type === 'freecell') return cards.length === 1 && freeGs.freecells[move.destination.pileIndex] === null;
            return false;
        },
        Spider: (g: GameState) => {
            const spiderGs = g as SpiderGameState;
            if (move.destination.type === 'tableau') return canMoveToTableauSpider(cards, last(spiderGs.tableau[move.destination.pileIndex]));
            return false;
        },
    };
    
    const result = dispatch[gs.gameType](gs);
    console.log(`[${new Date().toISOString()}] game-logic.ts: isValidMove - result: ${result}`);
    return result;
};

/**
 * Executes a validated game move by creating a new game state.
 * This function modifies the game state based on a valid move.
 */
const executeMove = (gs: GameState, move: GameMove): GameState => {
    console.log(`[${new Date().toISOString()}] game-logic.ts: executeMove called`, { move });
    let newState = { ...gs, tableau: gs.tableau.map(p => [...p]), foundation: gs.foundation.map(p => [...p]) };
    if (newState.gameType === 'Solitaire') {
        newState = { ...newState, waste: [...(newState as SolitaireGameState).waste] } as SolitaireGameState;
    }
    if (newState.gameType === 'Freecell') {
        newState = { ...newState, freecells: [...(newState as FreecellGameState).freecells] } as FreecellGameState;
    }

    const cards = getCardsToMove(newState, move.source);

    // 1. Remove cards from the source pile.
    console.log(`[${new Date().toISOString()}] game-logic.ts: executeMove - removing cards from source`);
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

    // 2. Add cards to the destination pile.
    console.log(`[${new Date().toISOString()}] game-logic.ts: executeMove - adding cards to destination`);
    switch (move.destination.type) {
        case 'tableau':    newState.tableau[move.destination.pileIndex].push(...cards); break;
        case 'foundation': newState.foundation[move.destination.pileIndex].push(...cards); break;
        case 'freecell':   (newState as FreecellGameState).freecells[move.destination.pileIndex] = cards[0]; break;
    }

    // 3. Update game statistics.
    newState.moves++;
    if (move.destination.type === 'foundation') newState.score += 10;
    if (move.source.type === 'foundation') newState.score -= 10;
    if (newState.gameType === 'Spider') newState.score--;
    console.log(`[${new Date().toISOString()}] game-logic.ts: executeMove - move complete, new score:`, newState.score);

    // 4. After the move, check for completed sets in Spider.
    if (newState.gameType === 'Spider') {
        console.log(`[${new Date().toISOString()}] game-logic.ts: executeMove - checking for completed Spider set`);
        return checkForSpiderCompletedSet(newState as SpiderGameState);
    }
    
    return newState;
};


// ================================================================================================
// Click Handling Logic
// ================================================================================================

/**
 * Determines if the initially clicked card or stack can be moved based on game rules.
 * A card must be face-up, and if in a stack, must form a valid run.
 */
const isClickSourceMovable = (gs: GameState, clickedCard: CardType | undefined, clickInfo: ClickSource): boolean => {
    console.log(`[${new Date().toISOString()}] game-logic.ts: isClickSourceMovable called`, { clickedCard, clickInfo });
    if (!clickedCard || !clickedCard.faceUp) {
        console.log(`[${new Date().toISOString()}] game-logic.ts: isClickSourceMovable - card not movable (face down or undefined)`);
        return false;
    }

    if (clickInfo.type === 'tableau') {
        const stack = getCardsToMove(gs, {type: 'tableau', pileIndex: clickInfo.pileIndex, cardIndex: clickInfo.cardIndex });
        switch(gs.gameType) {
            case 'Solitaire': return isSolitaireRun(stack);
            case 'Freecell':  return isSpiderRun(stack); // Freecell uses spider's isRun logic for validation
            case 'Spider':    return isSpiderRun(stack);
        }
    }
    console.log(`[${new Date().toISOString()}] game-logic.ts: isClickSourceMovable - card is movable`);
    return true; 
};


/**
 * Handles the logic when auto-move is ON. Finds the best valid move and executes it.
 * This function encapsulates the "auto-move" game flow.
 * @param {GameState} gs The current game state.
 * @param {LocatedCard} locatedCard The card and its location that was clicked.
 * @returns {ProcessResult} The result of the auto-move attempt.
 */
const handleAutoMove = (gs: GameState, locatedCard: LocatedCard): ProcessResult => {
    console.log(`[${new Date().toISOString()}] game-logic.ts: handleAutoMove called`);
    const move = findAutoMove(gs, locatedCard);
    
    if (move) {
        console.log(`[${new Date().toISOString()}] game-logic.ts: handleAutoMove - auto-move found, executing`);
        return { newState: executeMove(gs, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
    }

    console.log(`[${new Date().toISOString()}] game-logic.ts: handleAutoMove - no auto-move found`);
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
};

/**
 * Handles the logic for the second click when auto-move is OFF.
 * This function completes a two-step move: select card, then select destination.
 * @param {ProcessClickParams} params The parameters for the click event.
 * @returns {ProcessResult} The result of the two-click move attempt.
 */
const handleTwoClickMove = (params: ProcessClickParams): ProcessResult => {
    console.log(`[${new Date().toISOString()}] game-logic.ts: handleTwoClickMove called`);
    const { gameState, selectedCard, clickSource, clickedCard, toast } = params;

    // If the same card is clicked again, deselect it.
    if (clickedCard && selectedCard && selectedCard.rank === clickedCard.rank && selectedCard.suit === clickedCard.suit) {
        console.log(`[${new Date().toISOString()}] game-logic.ts: handleTwoClickMove - same card clicked, deselecting`);
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }
    
    const destinationType = clickSource.type as 'tableau' | 'foundation' | 'freecell';
    const move: GameMove = { source: selectedCard!.location, destination: { type: destinationType, pileIndex: clickSource.pileIndex } };
    
    // If the attempted move is valid, execute it and clear the selection.
    if (isValidMove(gameState, move, toast)) {
        console.log(`[${new Date().toISOString()}] game-logic.ts: handleTwoClickMove - valid move, executing`);
        return { newState: executeMove(gameState, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
    }
    
    // If the move is invalid, check if the new click is on another movable card.
    // If so, switch the selection to the new card.
    if (clickedCard && isClickSourceMovable(gameState, clickedCard, clickSource)) {
        console.log(`[${new Date().toISOString()}] game-logic.ts: handleTwoClickMove - invalid move, but new selection is movable`);
        return { newState: null, newSelectedCard: { ...clickedCard, location: clickSource }, highlightedPile: null, saveHistory: false };
    }

    // If the move is invalid and the new click is not on a movable card, just clear the selection.
    console.log(`[${new Date().toISOString()}] game-logic.ts: handleTwoClickMove - invalid move, clearing selection`);
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
}


/**
 * Handles the logic for the first click of a potential move.
 * This function determines whether to initiate an auto-move or just select a card.
 * @param {ProcessClickParams} params The parameters for the click event.
 * @returns {ProcessResult} The result of the initial click.
 */
const handleInitialClick = (params: ProcessClickParams): ProcessResult => {
    console.log(`[${new Date().toISOString()}] game-logic.ts: handleInitialClick called`);
    const { gameState, clickSource, clickedCard, settings } = params;
    
    if (!clickedCard || !isClickSourceMovable(gameState, clickedCard, clickSource)) {
        console.log(`[${new Date().toISOString()}] game-logic.ts: handleInitialClick - clicked card is not movable`);
        return flipOverFaceDownCardInSolitaire(params);
    }

    const locatedCard: LocatedCard = { ...clickedCard, location: clickSource };

    if (settings.autoMove) {
        console.log(`[${new Date().toISOString()}] game-logic.ts: handleInitialClick - autoMove is on, handling auto-move`);
        return handleAutoMove(gameState, locatedCard);
    } 
    
    // If auto-move is off, the first click simply selects the card.
    console.log(`[${new Date().toISOString()}] game-logic.ts: handleInitialClick - autoMove is off, selecting card`);
    return { newState: null, newSelectedCard: locatedCard, highlightedPile: null, saveHistory: false };
};

const flipOverFaceDownCardInSolitaire = (params: ProcessClickParams): ProcessResult => {
    console.log(`[${new Date().toISOString()}] game-logic.ts: flipOverFaceDownCardInSolitaire called`);
    const { gameState, clickSource, clickedCard, settings } = params;

    // Specific logic for flipping a face-down card in Solitaire.
    if (gameState.gameType === 'Solitaire' && clickSource.type === 'tableau' && clickedCard && !clickedCard.faceUp && clickSource.cardIndex === gameState.tableau[clickSource.pileIndex].length - 1) {
        console.log(`[${new Date().toISOString()}] game-logic.ts: flipOverFaceDownCardInSolitaire - flipping card`);
        const newState = { ...gameState, tableau: gameState.tableau.map(p => [...p]) };
        (newState as SolitaireGameState).tableau[clickSource.pileIndex][clickSource.cardIndex].faceUp = true;
        newState.moves++;
        return { newState, newSelectedCard: null, highlightedPile: null, saveHistory: true };
   }
   console.log(`[${new Date().toISOString()}] game-logic.ts: flipOverFaceDownCardInSolitaire - conditions not met to flip card`);
   return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
};


// ================================================================================================
// Main Controller
// ================================================================================================

/**
 * Processes a click on a card or pile, acting as the main entry point for game interactions.
 * It determines whether it's an initial click or a subsequent one and dispatches accordingly.
 * @param {ProcessClickParams} params The parameters for the click event.
 * @returns {ProcessResult} The result of the operation, including any state changes and UI hints.
 */
export const processCardClick = (params: ProcessClickParams): ProcessResult => {
    console.log(`[${new Date().toISOString()}] game-logic.ts: processCardClick called`, { selectedCard: params.selectedCard, autoMove: params.settings.autoMove });
    // If a card is already selected, this is the second click (destination).
    if (params.selectedCard && !params.settings.autoMove) {
        return handleTwoClickMove(params);
    }
    // If no card is selected, this is the first click (source).
    return handleInitialClick(params);
};
