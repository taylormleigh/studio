
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
import type { SelectedCardInfo, HighlightedPile } from '@/components/game/game-board';

// Game-specific type and function imports
import { GameState as SolitaireGameState, Card as CardType, findAutoMoveForSolitaire } from './solitaire';
import { GameState as FreecellGameState, getMovableCardCount, findAutoMove as findAutoMoveForFreecell } from './freecell';
import { GameState as SpiderGameState, checkForCompletedSet as checkForSpiderCompletedSet, findAutoMove as findAutoMoveForSpider } from './spider';


// ================================================================================================
// Type Definitions
// ================================================================================================

export type GameState = SolitaireGameState | FreecellGameState | SpiderGameState;

// Represents the source of a user's click action.
export type ClickSource = {
  type: 'tableau' | 'waste' | 'foundation' | 'freecell' | 'stock';
  pileIndex: number;
  cardIndex: number; // A value of -1 signifies a click on an empty pile.
};

// Represents a potential or validated move from a source to a destination.
export type GameMove = {
  source: SelectedCardInfo;
  destination: {
    type: 'tableau' | 'foundation' | 'freecell';
    pileIndex: number;
  };
};

// Represents all the necessary data for processing a click event.
type ProcessClickParams = {
    gameState: GameState;
    selectedCard: SelectedCardInfo | null;
    clickSource: ClickSource;
    settings: GameSettings;
    toast: ReturnType<typeof useToast>['toast'];
};

// Represents the outcome of processing a click, including the new state and UI hints.
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
 * This is a general utility function for working with card piles.
 */
const last = (pile: CardType[]): CardType | undefined => pile[pile.length - 1];

/**
 * Returns the card object that was clicked from the game state based on the click source information.
 * Handles all possible click source types.
 */
const getClickedCard = (gs: GameState, click: ClickSource): CardType | undefined => {
    // A cardIndex of -1 signifies a click on an empty pile, so no card is returned.
    if (click.cardIndex === -1) return undefined;

    switch (click.type) {
        case 'tableau':    return gs.tableau[click.pileIndex]?.[click.cardIndex];
        case 'waste':      return gs.gameType === 'Solitaire' ? last((gs as SolitaireGameState).waste) : undefined;
        case 'foundation': return last(gs.foundation[click.pileIndex]);
        case 'freecell':   return gs.gameType === 'Freecell' ? (gs as FreecellGameState).freecells[click.pileIndex] || undefined : undefined;
        default:           return undefined;
    }
};

/**
 * Returns an array of one or more cards that would be part of a move from a given source.
 * This is used to validate and execute moves involving stacks of cards.
 */
const getCardsToMove = (gs: GameState, src: SelectedCardInfo): CardType[] => {
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
// Move Execution & Validation
// ================================================================================================

/**
 * Dispatches to the appropriate game-specific win condition function.
 * This function acts as a dispatcher based on the gameType.
 */
export const isGameWon = (state: GameState): boolean => {
    const dispatch = {
        Solitaire: (s: GameState) => (s as SolitaireGameState).foundation.every(p => p.length === 13),
        Freecell: (s: GameState) => (s as FreecellGameState).foundation.every(p => p.length === 13),
        Spider: (s: GameState) => (s as SpiderGameState).completedSets === 8,
    };
    return dispatch[state.gameType](state);
};

/**
 * Dispatches to the correct game-specific auto-move finding function.
 * This acts as a router to the specialized logic in each game's file.
 */
const findAutoMove = (gs: GameState, source: SelectedCardInfo): GameMove | null => {
    const dispatch = {
        Solitaire: findAutoMoveForSolitaire,
        Freecell: findAutoMoveForFreecell,
        Spider: findAutoMoveForSpider,
    };
    // The `as any` is used here because TypeScript cannot infer the correct GameState subtype for each dispatched function.
    return dispatch[gs.gameType](gs as any, source);
};

/**
 * Dispatches to the correct game-specific move validation function.
 * This validates a move against the rules of the current game.
 */
const isValidMove = (gs: GameState, move: GameMove, tst: ReturnType<typeof useToast>['toast']): boolean => {
    const cards = getCardsToMove(gs, move.source);
    if (cards.length === 0) return false;

    // This is a dispatch table that calls the appropriate validation logic based on game type.
    const dispatch = {
        Solitaire: (g: SolitaireGameState) => {
            if (move.destination.type === 'foundation') return cards.length === 1 && g.canMoveToFoundation(cards[0], g.foundation[move.destination.pileIndex]);
            if (move.destination.type === 'tableau') return g.canMoveToTableau(cards[0], last(g.tableau[move.destination.pileIndex]));
            return false;
        },
        Freecell: (g: FreecellGameState) => {
            const isDestEmpty = move.destination.type === 'tableau' && g.tableau[move.destination.pileIndex].length === 0;
            const maxMove = getMovableCardCount(g, isDestEmpty);
            if (cards.length > maxMove) {
                if (tst) tst({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${cards.length} cards. Only ${maxMove} are movable.` });
                return false;
            }
            if (move.destination.type === 'foundation') return cards.length === 1 && g.canMoveToFoundation(cards[0], g.foundation[move.destination.pileIndex]);
            if (move.destination.type === 'tableau') return g.canMoveToTableau(cards[0], last(g.tableau[move.destination.pileIndex]));
            if (move.destination.type === 'freecell') return cards.length === 1 && g.freecells[move.destination.pileIndex] === null;
            return false;
        },
        Spider: (g: SpiderGameState) => {
            if (move.destination.type === 'tableau') return g.canMoveToTableau(cards, last(g.tableau[move.destination.pileIndex]));
            return false;
        },
    };
    
    // The validation functions in each game file are bound to the GameState prototype.
    // So, we create a temporary prototype chain to call them.
    const tempGameState = Object.create(gs);
    return dispatch[gs.gameType](tempGameState);
};

/**
 * Executes a validated game move by creating a new game state.
 * This function modifies the game state based on a valid move.
 */
const executeMove = (gs: GameState, move: GameMove): GameState => {
    // Creates a deep copy of the game state to ensure immutability.
    let newState = JSON.parse(JSON.stringify(gs)) as GameState;
    const cards = getCardsToMove(newState, move.source);

    // 1. Remove cards from the source pile.
    switch (move.source.type) {
        case 'tableau':
            const srcPile = newState.tableau[move.source.pileIndex];
            srcPile.splice(move.source.cardIndex);
            // Flip the new top card in Solitaire/Spider.
            if (newState.gameType !== 'Freecell' && srcPile.length > 0) last(srcPile)!.faceUp = true;
            break;
        case 'waste':      (newState as SolitaireGameState).waste.pop(); break;
        case 'foundation': newState.foundation[move.source.pileIndex].pop(); break;
        case 'freecell':   (newState as FreecellGameState).freecells[move.source.pileIndex] = null; break;
    }

    // 2. Add cards to the destination pile.
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

    // 4. After the move, check for completed sets in Spider.
    if (newState.gameType === 'Spider') {
        return checkForSpiderCompletedSet(newState);
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
const isClickSourceMovable = (gs: GameState, clickInfo: ClickSource): boolean => {
    const card = getClickedCard(gs, clickInfo);
    if (!card || !card.faceUp) return false;

    // For tableau clicks, the stack being moved must be a valid run.
    if (clickInfo.type === 'tableau') {
        const stack = getCardsToMove(gs, {type: 'tableau', pileIndex: clickInfo.pileIndex, cardIndex: clickInfo.cardIndex });
        const dispatch = {
            Solitaire: (s: GameState) => (Object.create(s) as SolitaireGameState).isRun(stack),
            Freecell: (s: GameState) => (Object.create(s) as FreecellGameState).isRun(stack),
            Spider: (s: GameState) => (Object.create(s) as SpiderGameState).isRun(stack),
        };
        return dispatch[gs.gameType](gs);
    }
    // Cards from Waste, Foundation, or Freecells are always individually movable if face-up.
    return true; 
};


/**
 * Handles the logic when auto-move is ON. Finds the best valid move and executes it.
 * This function encapsulates the "auto-move" game flow.
 */
const handleAutoMove = (gs: GameState, clickInfo: ClickSource): ProcessResult => {
    let sourceCardInfo: SelectedCardInfo;
    if (gs.gameType === 'Solitaire' && clickInfo.type === 'waste') {
        const wastePile = (gs as SolitaireGameState).waste;
        if (wastePile.length === 0) return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
        sourceCardInfo = { type: 'waste', pileIndex: 0, cardIndex: wastePile.length - 1 };
    } else {
        sourceCardInfo = clickInfo;
    }

    // Find the highest-priority move for the selected card.
    const move = findAutoMove(gs, sourceCardInfo);

    if (move) {
        // If a valid move is found, execute it and highlight the destination.
        return { newState: executeMove(gs, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
    }
    // If no move is found, do nothing.
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
};

/**
 * Handles the logic for the second click when auto-move is OFF.
 * This function completes a two-step move: select card, then select destination.
 */
const handleSubsequentClick = (params: ProcessClickParams): ProcessResult => {
    const { gameState, selectedCard, clickSource, toast } = params;

    // If the user re-clicks the same card, deselect it.
    if (selectedCard && selectedCard.type === clickSource.type && selectedCard.pileIndex === clickSource.pileIndex && selectedCard.cardIndex === clickSource.cardIndex) {
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }
    
    const destinationCard = getClickedCard(gameState, clickSource);
    const destinationType = clickSource.type as 'tableau' | 'foundation' | 'freecell'; // Cast because 'stock' and 'waste' are not valid destinations.
    const move: GameMove = { source: selectedCard!, destination: { type: destinationType, pileIndex: clickSource.pileIndex } };
    
    // If the attempted move is valid, execute it and clear selection.
    if (isValidMove(gameState, move, toast)) {
        return { newState: executeMove(gameState, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
    }
    
    // If the move is invalid, but the user clicked on another movable card, switch the selection.
    if (isClickSourceMovable(gameState, clickSource)) {
        return { newState: null, newSelectedCard: clickSource, highlightedPile: null, saveHistory: false };
    }

    // If the second click was on an invalid and unselectable spot, clear the selection.
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
}


/**
 * Handles the logic for the first click of a potential move.
 * This function determines whether to initiate an auto-move or just select a card.
 */
const handleInitialClick = (params: ProcessClickParams): ProcessResult => {
    const { gameState, clickSource, settings } = params;
    
    // First, check if the clicked card or stack can be moved at all.
    if (!isClickSourceMovable(gameState, clickSource)) {
        // Special case for flipping face-down cards in Solitaire.
        const clickedCard = getClickedCard(gameState, clickSource);
        if (gameState.gameType === 'Solitaire' && clickSource.type === 'tableau' && clickedCard && !clickedCard.faceUp && clickSource.cardIndex === gameState.tableau[clickSource.pileIndex].length - 1) {
             let newState = JSON.parse(JSON.stringify(gameState)) as SolitaireGameState;
             newState.tableau[clickSource.pileIndex][clickSource.cardIndex].faceUp = true;
             newState.moves++;
             return { newState, newSelectedCard: null, highlightedPile: null, saveHistory: true };
        }
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }

    // Branch based on the auto-move setting.
    if (settings.autoMove) {
        return handleAutoMove(gameState, clickSource);
    } 
    
    // If auto-move is off, this first click just selects the card.
    return { newState: null, newSelectedCard: clickSource, highlightedPile: null, saveHistory: false };
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
    // If a card is already selected, this is the second click of a two-click move.
    if (params.selectedCard) {
        return handleSubsequentClick(params);
    }
    // Otherwise, this is the initial click of a potential move.
    return handleInitialClick(params);
};
