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
import { GameState as SolitaireGameState, Card as CardType, isRun as isSolitaireRun, canMoveToFoundation as canMoveToFoundationSolitaire, canMoveToTableau as canMoveToTableauSolitaire, isGameWon as isSolitaireGameWon, findAutoMoveForSolitaire } from './solitaire';
import { GameState as FreecellGameState, canMoveToFoundation as canMoveToFoundationFreecell, canMoveToTableau as canMoveToTableauFreecell, getMovableCardCount, isGameWon as isFreecellGameWon, findAutoMoveForFreecell } from './freecell';
import { GameState as SpiderGameState, isRun as isSpiderRun, canMoveToTableau as canMoveToTableauSpider, checkForCompletedSet as checkForSpiderCompletedSet, isGameWon as isSpiderGameWon, findAutoMoveForSpider } from './spider';

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
        Solitaire: isSolitaireGameWon,
        Freecell: isFreecellGameWon,
        Spider: isSpiderGameWon,
    };
    return dispatch[state.gameType](state as any);
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
    return dispatch[gs.gameType](gs as any, source);
};

/**
 * Dispatches to the correct game-specific move validation function.
 * This validates a move against the rules of the current game.
 */
const isValidMove = (gs: GameState, move: GameMove, tst: ReturnType<typeof useToast>['toast']): boolean => {
    const cards = getCardsToMove(gs, move.source);
    if (cards.length === 0) return false;
    const cardToMove = cards[0];

    const dispatch = {
        Solitaire: (g: SolitaireGameState) => {
            if (move.destination.type === 'foundation') return canMoveToFoundationSolitaire(cardToMove, g.foundation[move.destination.pileIndex]);
            if (move.destination.type === 'tableau') return canMoveToTableauSolitaire(cardToMove, last(g.tableau[move.destination.pileIndex]));
            return false;
        },
        Freecell: (g: FreecellGameState) => {
            if (move.destination.type === 'tableau') {
                const isDestEmpty = g.tableau[move.destination.pileIndex].length === 0;
                const maxMove = getMovableCardCount(g, isDestEmpty);
                if (cards.length > maxMove) {
                    if (tst) tst({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${cards.length} cards. Only ${maxMove} are movable.` });
                    return false;
                }
                return canMoveToTableauFreecell(cardToMove, last(g.tableau[move.destination.pileIndex]));
            }
            if (move.destination.type === 'foundation') return cards.length === 1 && canMoveToFoundationFreecell(cardToMove, g.foundation[move.destination.pileIndex]);
            if (move.destination.type === 'freecell') return cards.length === 1 && g.freecells[move.destination.pileIndex] === null;
            return false;
        },
        Spider: (g: SpiderGameState) => {
            if (move.destination.type === 'tableau') return canMoveToTableauSpider(cards, last(g.tableau[move.destination.pileIndex]));
            return false;
        },
    };
    
    return dispatch[gs.gameType](gs as any);
};

/**
 * Executes a validated game move by creating a new game state.
 * This function modifies the game state based on a valid move.
 */
const executeMove = (gs: GameState, move: GameMove): GameState => {
    let newState = JSON.parse(JSON.stringify(gs)) as GameState;
    const cards = getCardsToMove(newState, move.source);

    // 1. Remove cards from the source pile.
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
            Solitaire: isSolitaireRun,
            Freecell: isSpiderRun, // Freecell uses spider's isRun logic for validation
            Spider: isSpiderRun,
        };
        return dispatch[gs.gameType](stack);
    }
    return true; 
};


/**
 * Handles the logic when auto-move is ON. Finds the best valid move and executes it.
 * This function encapsulates the "auto-move" game flow.
 */
const handleAutoMove = (gs: GameState, clickInfo: ClickSource): ProcessResult => {
    let sourceCardInfo: SelectedCardInfo | undefined;

    if (clickInfo.type === 'tableau') {
        sourceCardInfo = clickInfo;
    } else if (clickInfo.type === 'waste' && gs.gameType === 'Solitaire') {
        const wastePile = (gs as SolitaireGameState).waste;
        if (wastePile.length > 0) {
            sourceCardInfo = { type: 'waste', pileIndex: 0, cardIndex: wastePile.length - 1 };
        }
    } else if (clickInfo.type === 'freecell' && gs.gameType === 'Freecell') {
        if ((gs as FreecellGameState).freecells[clickInfo.pileIndex]) {
            sourceCardInfo = clickInfo;
        }
    }
    
    if (!sourceCardInfo) {
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }
    
    const move = findAutoMove(gs, sourceCardInfo);

    if (move) {
        return { newState: executeMove(gs, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
    }
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
};

/**
 * Handles the logic for the second click when auto-move is OFF.
 * This function completes a two-step move: select card, then select destination.
 */
const handleTwoClickMove = (params: ProcessClickParams): ProcessResult => {
    const { gameState, selectedCard, clickSource, toast } = params;

    // If the same card is clicked again, deselect it.
    if (selectedCard && selectedCard.type === clickSource.type && selectedCard.pileIndex === clickSource.pileIndex && selectedCard.cardIndex === clickSource.cardIndex) {
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }
    
    // Determine the type of destination pile. This assumes all clickable non-card areas are valid drop targets.
    const destinationType = clickSource.type as 'tableau' | 'foundation' | 'freecell';
    const move: GameMove = { source: selectedCard!, destination: { type: destinationType, pileIndex: clickSource.pileIndex } };
    
    // If the attempted move is valid, execute it and clear the selection.
    if (isValidMove(gameState, move, toast)) {
        return { newState: executeMove(gameState, move), newSelectedCard: null, highlightedPile: move.destination, saveHistory: true };
    }
    
    // If the move is invalid, check if the new click is on another movable card.
    // If so, switch the selection to the new card.
    if (isClickSourceMovable(gameState, clickSource)) {
        return { newState: null, newSelectedCard: clickSource, highlightedPile: null, saveHistory: false };
    }

    // If the move is invalid and the new click is not on a movable card, just clear the selection.
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
}


/**
 * Handles the logic for the first click of a potential move.
 * This function determines whether to initiate an auto-move or just select a card.
 */
const handleInitialClick = (params: ProcessClickParams): ProcessResult => {
    const { gameState, clickSource, settings } = params;
    
    if (!isClickSourceMovable(gameState, clickSource)) {
        // Specific logic for flipping a face-down card in Solitaire.
        const clickedCard = getClickedCard(gameState, clickSource);
        if (gameState.gameType === 'Solitaire' && clickSource.type === 'tableau' && clickedCard && !clickedCard.faceUp && clickSource.cardIndex === gameState.tableau[clickSource.pileIndex].length - 1) {
             let newState = JSON.parse(JSON.stringify(gameState)) as SolitaireGameState;
             newState.tableau[clickSource.pileIndex][clickSource.cardIndex].faceUp = true;
             newState.moves++;
             return { newState, newSelectedCard: null, highlightedPile: null, saveHistory: true };
        }
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }

    if (settings.autoMove) {
        return handleAutoMove(gameState, clickSource);
    } 
    
    // If auto-move is off, the first click simply selects the card.
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
    // If a card is already selected, this is the second click (destination).
    if (params.selectedCard) {
        return handleTwoClickMove(params);
    }
    // If no card is selected, this is the first click (source).
    return handleInitialClick(params);
};
