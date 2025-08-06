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
import { GameState as SolitaireGameState, Card as CardType, findAutoMove as findAutoMoveForSolitaire } from './solitaire';
import { GameState as FreecellGameState, findAutoMove as findAutoMoveForFreecell } from './freecell';
import { GameState as SpiderGameState, findAutoMove as findAutoMoveForSpider, checkForCompletedSet as checkForSpiderCompletedSet } from './spider';

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

// Returns the last card in a pile, or undefined if the pile is empty.
const last = (pile: CardType[]): CardType | undefined => pile[pile.length - 1];

// Returns the card object that was clicked from the game state.
const getClickedCard = (gs: GameState, click: ClickSource): CardType | undefined => {
    // A cardIndex of -1 means an empty pile was clicked.
    if (click.cardIndex === -1) return undefined;

    switch (click.type) {
        case 'tableau':    return gs.tableau[click.pileIndex]?.[click.cardIndex];
        case 'waste':      return gs.gameType === 'Solitaire' ? last((gs as SolitaireGameState).waste) : undefined;
        case 'foundation': return last(gs.foundation[click.pileIndex]);
        case 'freecell':   return gs.gameType === 'Freecell' ? (gs as FreecellGameState).freecells[click.pileIndex] || undefined : undefined;
        default:           return undefined;
    }
};

// Returns an array of one or more cards that would be part of a move from a given source.
const getCardsToMove = (gs: GameState, src: SelectedCardInfo): CardType[] => {
    switch (src.type) {
        case 'tableau':    return gs.tableau[src.pileIndex].slice(src.cardIndex);
        case 'waste':      return gs.gameType === 'Solitaire' ? [last((gs as SolitaireGameState).waste)!] : [];
        case 'foundation': return (gs.gameType === 'Solitaire' || gs.gameType === 'Freecell') && gs.foundation[src.pileIndex].length > 0 ? [last(gs.foundation[src.pileIndex])!] : [];
        case 'freecell':   return (gs.gameType === 'Freecell' && (gs as FreecellGameState).freecells[src.pileIndex]) ? [(gs as FreecellGameState).freecells[src.pileIndex]!] : [];
        default:           return [];
    }
};

// ================================================================================================
// Move Execution & Validation
// ================================================================================================

// This is a dispatch table that calls the appropriate win condition function based on game type.
export const isGameWon = (state: GameState): boolean => {
    const dispatch = {
        Solitaire: (s: GameState) => (s as SolitaireGameState).foundation.every(p => p.length === 13),
        Freecell: (s: GameState) => (s as FreecellGameState).foundation.every(p => p.length === 13),
        Spider: (s: GameState) => (s as SpiderGameState).completedSets === 8,
    };
    return dispatch[state.gameType](state);
};

// Dispatches to the correct game-specific auto-move finding function.
const findAutoMove = (gs: GameState, source: SelectedCardInfo): GameMove | null => {
    const dispatch = {
        Solitaire: findAutoMoveForSolitaire,
        Freecell: findAutoMoveForFreecell,
        Spider: findAutoMoveForSpider,
    };
    return dispatch[gs.gameType](gs as any, source);
};

// Dispatches to the correct game-specific move validation function.
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

// Executes a validated game move by creating a new game state.
const executeMove = (gs: GameState, move: GameMove): GameState => {
    let newState = JSON.parse(JSON.stringify(gs)) as GameState;
    const cards = getCardsToMove(newState, move.source);

    // 1. Remove cards from source.
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

    // 2. Add cards to destination.
    switch (move.destination.type) {
        case 'tableau':    newState.tableau[move.destination.pileIndex].push(...cards); break;
        case 'foundation': newState.foundation[move.destination.pileIndex].push(...cards); break;
        case 'freecell':   (newState as FreecellGameState).freecells[move.destination.pileIndex] = cards[0]; break;
    }

    // 3. Update stats.
    newState.moves++;
    if (move.destination.type === 'foundation') newState.score += 10;
    if (move.source.type === 'foundation') newState.score -= 10;
    if (newState.gameType === 'Spider') newState.score--;

    // 4. Check for completed sets in Spider.
    if (newState.gameType === 'Spider') {
        return checkForSpiderCompletedSet(newState);
    }
    
    return newState;
};


// ================================================================================================
// Click Handling Logic
// ================================================================================================

// Determines if the initially clicked card or stack can be moved.
const isClickSourceMovable = (gs: GameState, clickInfo: ClickSource): boolean => {
    const card = getClickedCard(gs, clickInfo);
    if (!card || !card.faceUp) return false;

    if (clickInfo.type === 'tableau') {
        const stack = getCardsToMove(gs, clickInfo);
        const dispatch = {
            Solitaire: (s: GameState) => (Object.create(s) as SolitaireGameState).isRun(stack),
            Freecell: (s: GameState) => (Object.create(s) as FreecellGameState).isRun(stack),
            Spider: (s: GameState) => (Object.create(s) as SpiderGameState).isRun(stack),
        };
        return dispatch[gs.gameType](gs);
    }
    return true; // Cards from Waste, Foundation, Freecells are always individually movable if face-up.
};


// Handles the flow when auto-move is ON.
const handleAutoMove = (gs: GameState, clickInfo: ClickSource): ProcessResult => {
    const move = findAutoMove(gs, clickInfo);
    if (move) {
        return { newState: executeMove(gs, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
    }
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
};

// Handles the logic for the second click when auto-move is OFF.
const handleTwoClickMove = (params: ProcessClickParams): ProcessResult => {
    const { gameState, selectedCard, clickSource, toast } = params;

    // If the user re-clicks the same card, deselect it.
    if (selectedCard && selectedCard.type === clickSource.type && selectedCard.pileIndex === clickSource.pileIndex && selectedCard.cardIndex === clickSource.cardIndex) {
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }

    const destinationType = clickSource.type as 'tableau' | 'foundation' | 'freecell';
    const move: GameMove = { source: selectedCard!, destination: { type: destinationType, pileIndex: clickSource.pileIndex } };
    
    // If the move is valid, execute it.
    if (isValidMove(gameState, move, toast)) {
        return { newState: executeMove(gameState, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
    }
    
    // If invalid, check if the click was on another movable card, and if so, switch selection.
    if (isClickSourceMovable(gameState, clickSource)) {
        return { newState: null, newSelectedCard: clickSource, highlightedPile: null, saveHistory: false };
    }

    // Otherwise, the second click was invalid, so clear the selection.
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
}

// Handles the logic for the first click.
const handleInitialClick = (params: ProcessClickParams): ProcessResult => {
    const { gameState, clickSource, settings } = params;
    
    // First, check if the clicked card/stack can be moved at all.
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
 * Processes a click on a card or pile, delegating to the appropriate handler.
 * @param {ProcessClickParams} params The parameters for the click event.
 * @returns {ProcessResult} The result of the operation.
 */
export const processCardClick = (params: ProcessClickParams): ProcessResult => {
    // If a card is already selected, this is the second click of a two-click move.
    if (params.selectedCard) {
        return handleTwoClickMove(params);
    }
    // Otherwise, this is the initial click of a potential move.
    return handleInitialClick(params);
};
