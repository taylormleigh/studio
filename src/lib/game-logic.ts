/**
 * @fileoverview This file contains the core game logic for card interactions,
 * acting as a central controller that dispatches actions to game-specific
 * rule implementations. It is designed to be highly modular, with each
 * function having a single, clear responsibility.
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
type ProcessResult = {
    newState: GameState | null;
    newSelectedCard: SelectedCardInfo | null;
    highlightedPile: HighlightedPile | null;
    saveHistory: boolean;
};

// ================================================================================================
// Utility Functions
// ================================================================================================

/** Returns the last card in a pile, or undefined if the pile is empty. */
export const last = (pile: CardType[]): CardType | undefined => pile[pile.length - 1];

/** Returns the clicked card object from the game state based on click source information. */
const getClickedCard = (gs: GameState, click: ClickSource): CardType | undefined => {
    // A click on an empty pile has no card.
    if (click.cardIndex === -1) return undefined;

    // Dispatches to the correct function based on the pile type.
    const getCardDispatch = {
        tableau: (gs: GameState, c: ClickSource) => gs.tableau[c.pileIndex]?.[c.cardIndex],
        waste: (gs: GameState, c: ClickSource) => gs.gameType === 'Solitaire' ? last((gs as SolitaireGameState).waste) : undefined,
        foundation: (gs: GameState, c: ClickSource) => last(gs.foundation[c.pileIndex]),
        freecell: (gs: GameState, c: ClickSource) => gs.gameType === 'Freecell' ? (gs as FreecellGameState).freecells[c.pileIndex] || undefined : undefined,
        stock: () => undefined // Stock clicks are handled by the draw action, they don't have a specific card.
    };

    return getCardDispatch[click.type](gs, click);
};

// ================================================================================================
// Game Win/Completion Checks (Dispatchers)
// ================================================================================================

/** Checks a Spider game for completed sets and moves them to the foundation. */
const checkAndCompleteSpiderSets = (state: SpiderGameState): SpiderGameState => {
    let newState = state;
    let setsFoundInIteration: boolean;

    // Continuously check for sets until no more can be completed in a single pass.
    do {
        setsFoundInIteration = false;
        let tempState = JSON.parse(JSON.stringify(newState)) as SpiderGameState;
        
        for (let i = 0; i < tempState.tableau.length; i++) {
            const { updatedPile, setsCompleted, completedSet } = checkForSpiderCompletedSet(tempState.tableau[i]);
            
            // If a set was found, update the state.
            if (setsCompleted > 0) {
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
        
        if (setsFoundInIteration) {
            newState = tempState;
        }
    } while (setsFoundInIteration);

    return newState;
}

/** Dispatches to the correct game-specific win condition function. */
export const isGameWon = (state: GameState): boolean => {
    // Before checking the final win condition, first check for completed sets in Spider.
    if (state.gameType === 'Spider') {
        const newState = checkAndCompleteSpiderSets(state as SpiderGameState);
        return isSpiderWon(newState);
    }
    
    // Dispatch to the appropriate win check function for Solitaire or Freecell.
    const isGameWonDispatch = { Solitaire: isSolitaireWon, Freecell: isFreecellWon, Spider: isSpiderWon };
    return isGameWonDispatch[state.gameType](state as any);
}


// ================================================================================================
// Card Stack Logic (Source)
// ================================================================================================

/** Gets the cards to be moved from a tableau pile. */
const getTableauCardsToMove = (gs: GameState, src: SelectedCardInfo) => gs.tableau[src.pileIndex].slice(src.cardIndex);
/** Gets the card to be moved from the waste pile in Solitaire. */
const getWasteCardToMove = (gs: SolitaireGameState) => [last(gs.waste)!];
/** Gets the card to be moved from a foundation pile in Solitaire. */
const getFoundationCardToMove = (gs: SolitaireGameState, src: SelectedCardInfo) => [last(gs.foundation[src.pileIndex])!];
/** Gets the card to be moved from a freecell. */
const getFreecellCardToMove = (gs: FreecellGameState, src: SelectedCardInfo) => gs.freecells[src.pileIndex] ? [gs.freecells[src.pileIndex]!] : [];

/** Returns an array of cards that would be part of a move from a given source. */
const getCardsToMove = (gameState: GameState, source: SelectedCardInfo): CardType[] => {
    // Dispatcher object to call the correct function based on the source type.
    const getCardsDispatch = {
        tableau: getTableauCardsToMove,
        waste: (gs: GameState, src: SelectedCardInfo) => gs.gameType === 'Solitaire' ? getWasteCardToMove(gs as SolitaireGameState) : [],
        foundation: (gs: GameState, src: SelectedCardInfo) => gs.gameType === 'Solitaire' ? getFoundationCardToMove(gs as SolitaireGameState, src) : [],
        freecell: (gs: GameState, src: SelectedCardInfo) => gs.gameType === 'Freecell' ? getFreecellCardToMove(gs as FreecellGameState, src) : []
    };
    return getCardsDispatch[source.type](gameState, source);
};


// ================================================================================================
// Move Execution Logic
// ================================================================================================

/** Removes the moved cards from a tableau pile. */
const removeCardsFromTableau = (newState: GameState, source: SelectedCardInfo) => {
    const srcPile = newState.tableau[source.pileIndex];
    srcPile.splice(source.cardIndex);
    // After removing cards, if the new top card is face-down, flip it. This does not apply to Freecell.
    if (newState.gameType !== 'Freecell' && srcPile.length > 0) {
        last(srcPile)!.faceUp = true;
    }
};

/** Removes the moved card from the waste pile. */
const removeCardFromWaste = (newState: GameState) => { (newState as SolitaireGameState).waste.pop(); };
/** Removes the moved card from a foundation pile. */
const removeCardFromFoundation = (newState: GameState, source: SelectedCardInfo) => { newState.foundation[source.pileIndex].pop(); };
/** Removes the moved card from a freecell. */
const removeCardFromFreecell = (newState: GameState, source: SelectedCardInfo) => { (newState as FreecellGameState).freecells[source.pileIndex] = null; };

/** Places the moved cards onto a tableau pile. */
const addCardsToTableau = (newState: GameState, destPileIndex: number, cards: CardType[]) => { newState.tableau[destPileIndex].push(...cards); };
/** Places the moved card onto a foundation pile. */
const addCardToFoundation = (newState: GameState, destPileIndex: number, cards: CardType[]) => { newState.foundation[destPileIndex].push(...cards); };
/** Places the moved card into a freecell. */
const addCardToFreecell = (newState: GameState, destPileIndex: number, cards: CardType[]) => { (newState as FreecellGameState).freecells[destPileIndex] = cards[0]; };

/** Updates the score after a move is executed. */
const updateScore = (newState: GameState, move: GameMove) => {
    // Moving to foundation increases score.
    if (move.destination.type === 'foundation') newState.score += 10;
    // Moving from foundation decreases score.
    if (move.source.type === 'foundation') newState.score -= 10;
    // Each move in Spider decreases the score.
    if (newState.gameType === 'Spider') newState.score--;
};

/** Executes a validated game move by modifying the game state. */
const executeMove = (gs: GameState, move: GameMove): GameState => {
    // Create a deep copy to ensure immutability.
    let newState = JSON.parse(JSON.stringify(gs));
    const cards = getCardsToMove(newState, move.source);
    
    // Dispatchers for removing cards from the source and adding to the destination.
    const removeCardsDispatch = {
        tableau: removeCardsFromTableau,
        waste: removeCardFromWaste,
        foundation: removeCardFromFoundation,
        freecell: removeCardFromFreecell
    };
    const addCardsDispatch = {
        tableau: addCardsToTableau,
        foundation: addCardToFoundation,
        freecell: addCardToFreecell
    };

    // Execute the removal and addition.
    removeCardsDispatch[move.source.type](newState, move.source);
    addCardsDispatch[move.destination.type](newState, move.destination.pileIndex, cards);

    // Update score and move count.
    newState.moves++;
    updateScore(newState, move);
    
    return newState;
};


// ================================================================================================
// Move Validation Logic (Game Specific Implementations & Dispatcher)
// ================================================================================================

/** Checks if a move is valid for Solitaire. */
const isValidSolitaireMove = (gs: SolitaireGameState, move: GameMove): boolean => {
    const cards = getCardsToMove(gs, move.source);
    // A move is invalid if there are no cards to move or if a multi-card stack from the tableau is not a valid run.
    if (cards.length === 0 || (move.source.type === 'tableau' && !isSolitaireRun(cards))) return false;

    // Check against destination rules.
    if (move.destination.type === 'foundation') return cards.length === 1 && canMoveSolitaireToFoundation(cards[0], gs.foundation[move.destination.pileIndex]);
    if (move.destination.type === 'tableau') return canMoveSolitaireToTableau(cards[0], last(gs.tableau[move.destination.pileIndex]));
    return false;
};

/** Checks if a move is valid for Freecell. */
const isValidFreecellMove = (gs: FreecellGameState, move: GameMove, tst: ReturnType<typeof useToast>['toast']): boolean => {
    const cards = getCardsToMove(gs, move.source);
    if (cards.length === 0) return false;
    
    // Check if the number of cards being moved is allowed.
    const isDestEmpty = move.destination.type === 'tableau' && gs.tableau[move.destination.pileIndex].length === 0;
    const maxMoveCount = getMovableCardCount(gs, isDestEmpty);
    if (cards.length > maxMoveCount) {
        if (tst) tst({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${cards.length} cards. Only ${maxMoveCount} are movable.` });
        return false;
    }
    // A multi-card move must be a valid run.
    if (move.source.type === 'tableau' && !isFreecellRun(cards)) return false;
    
    // Check against destination rules.
    if (move.destination.type === 'foundation') return cards.length === 1 && canMoveFreecellToFoundation(cards[0], gs.foundation[move.destination.pileIndex]);
    if (move.destination.type === 'tableau') return canMoveFreecellToTableau(cards[0], last(gs.tableau[move.destination.pileIndex]));
    if (move.destination.type === 'freecell') return cards.length === 1 && gs.freecells[move.destination.pileIndex] === null;
    return false;
};

/** Checks if a move is valid for Spider. */
const isValidSpiderMove = (gs: SpiderGameState, move: GameMove): boolean => {
    const cards = getCardsToMove(gs, move.source);
    // A move is invalid if there are no cards or it's not a valid run.
    if (cards.length === 0 || !isSpiderRun(cards)) return false;
    // Spider only allows moves between tableau piles.
    if (move.destination.type === 'tableau') return canMoveSpiderToTableau(cards, last(gs.tableau[move.destination.pileIndex]));
    return false;
};

/** Dispatches to the correct game-specific move validation function. */
const isValidMove = (gs: GameState, move: GameMove, tst: ReturnType<typeof useToast>['toast']): boolean => {
    const isValidMoveDispatch = { Solitaire: isValidSolitaireMove, Freecell: isValidFreecellMove, Spider: isValidSpiderMove };
    return isValidMoveDispatch[gs.gameType](gs as any, move, tst);
}


// ================================================================================================
// Auto-Move Logic: Finders (Game Specific Implementations & Dispatcher)
// ================================================================================================

/** Finds the best possible auto-move for a Solitaire card, prioritizing foundation moves. */
const findSolitaireAutoMove = (gs: SolitaireGameState, src: SelectedCardInfo): GameMove | null => {
    const cardsToMove = getCardsToMove(gs, src);
    if (cardsToMove.length !== 1) return null; // Can only auto-move single cards.
    
    // 1. Try to move to any foundation pile.
    for (let i = 0; i < gs.foundation.length; i++) {
        if (isValidMove(gs, { source: src, destination: { type: 'foundation', pileIndex: i } }, () => {})) {
            return { source: src, destination: { type: 'foundation', pileIndex: i } };
        }
    }
    
    // 2. If no foundation move, try to move to any tableau pile.
    if (src.type === 'tableau' || src.type === 'waste') {
        for (let i = 0; i < gs.tableau.length; i++) {
            if (src.type === 'tableau' && src.pileIndex === i) continue; // Don't move to the same pile.
            if (isValidMove(gs, { source: src, destination: { type: 'tableau', pileIndex: i } }, () => {})) {
                return { source: src, destination: { type: 'tableau', pileIndex: i } };
            }
        }
    }
    return null;
}

/** Finds the best auto-move for a card from a Freecell tableau pile. */
const findFreecellAutoMoveFromTableau = (gs: FreecellGameState, src: SelectedCardInfo): GameMove | null => {
    // Priority: Foundation > Freecell > Tableau
    const toFoundation = findFreecellAutoMoveToFoundation(gs, src);
    if (toFoundation) return toFoundation;
    
    const toFreecell = findFreecellAutoMoveToFreecell(gs, src);
    if (toFreecell) return toFreecell;
    
    return findFreecellAutoMoveToTableau(gs, src);
}

/** Finds the best auto-move for a card from a freecell. */
const findFreecellAutoMoveFromFreecell = (gs: FreecellGameState, src: SelectedCardInfo): GameMove | null => {
    // Priority: Foundation > Tableau
    const toFoundation = findFreecellAutoMoveToFoundation(gs, src);
    if (toFoundation) return toFoundation;
    
    return findFreecellAutoMoveToTableau(gs, src);
}

/** Finds a valid move to a foundation pile in Freecell. */
const findFreecellAutoMoveToFoundation = (gs: FreecellGameState, src: SelectedCardInfo): GameMove | null => {
    if (getCardsToMove(gs, src).length !== 1) return null;
    for (let i = 0; i < gs.foundation.length; i++) {
        if (isValidMove(gs, { source: src, destination: { type: 'foundation', pileIndex: i } }, () => {})) {
            return { source: src, destination: { type: 'foundation', pileIndex: i } };
        }
    }
    return null;
};

/** Finds a valid move to another tableau pile in Freecell. */
const findFreecellAutoMoveToTableau = (gs: FreecellGameState, src: SelectedCardInfo): GameMove | null => {
    for (let i = 0; i < gs.tableau.length; i++) {
        if (src.type === 'tableau' && src.pileIndex === i) continue;
        if (isValidMove(gs, { source: src, destination: { type: 'tableau', pileIndex: i } }, () => {})) {
            return { source: src, destination: { type: 'tableau', pileIndex: i } };
        }
    }
    return null;
};

/** Finds a valid move to an empty freecell. */
const findFreecellAutoMoveToFreecell = (gs: FreecellGameState, src: SelectedCardInfo): GameMove | null => {
    if (getCardsToMove(gs, src).length !== 1) return null;
    const emptyCellIndex = gs.freecells.findIndex(cell => cell === null);
    if (emptyCellIndex !== -1) {
        const move: GameMove = { source: src, destination: { type: 'freecell', pileIndex: emptyCellIndex } };
        if (isValidMove(gs, move, () => {})) return move;
    }
    return null;
};

/** Dispatches to the correct Freecell auto-move function based on the source. */
const findFreecellAutoMove = (gs: FreecellGameState, src: SelectedCardInfo): GameMove | null => {
    if (src.type === 'tableau') return findFreecellAutoMoveFromTableau(gs, src);
    if (src.type === 'freecell') return findFreecellAutoMoveFromFreecell(gs, src);
    return null;
};

/** Finds the best possible auto-move for a Spider card (only to another tableau pile). */
const findSpiderAutoMove = (gs: SpiderGameState, src: SelectedCardInfo): GameMove | null => {
    if (!isSpiderRun(getCardsToMove(gs, src))) return null;
    for (let i = 0; i < gs.tableau.length; i++) {
        if (src.pileIndex === i) continue;
        if (isValidMove(gs, { source: src, destination: { type: 'tableau', pileIndex: i } }, () => {})) {
            return { source: src, destination: { type: 'tableau', pileIndex: i } };
        }
    }
    return null;
};

/** Dispatches to the correct game-specific auto-move finding function. */
const attemptAutoMove = (gs: GameState, src: SelectedCardInfo): GameMove | null => {
    const autoMoveDispatch = { Solitaire: findSolitaireAutoMove, Freecell: findFreecellAutoMove, Spider: findSpiderAutoMove };
    return autoMoveDispatch[gs.gameType](gs as any, src);
}


// ================================================================================================
// Click Handler Sub-functions
// ================================================================================================

/** Handles flipping a face-down card in Solitaire upon being clicked. */
const handleSolitaireTableauFlip = (gs: SolitaireGameState, clickInfo: ClickSource): ProcessResult => {
    let newState = JSON.parse(JSON.stringify(gs));
    newState.tableau[clickInfo.pileIndex][clickInfo.cardIndex].faceUp = true;
    newState.moves++;
    return { newState, newSelectedCard: null, highlightedPile: null, saveHistory: true };
}

/** Handles the first click when auto-move is enabled, attempting to move the card immediately. */
const handleInitialClickWithAutoMove = (gs: GameState, clickInfo: ClickSource): ProcessResult => {
    const autoMove = attemptAutoMove(gs, clickInfo);
    // If a valid auto-move is found, execute it.
    if (autoMove) {
        const newState = executeMove(gs, autoMove);
        const highlightedPile: HighlightedPile = { type: autoMove.destination.type, pileIndex: autoMove.destination.pileIndex };
        return { newState, newSelectedCard: null, highlightedPile, saveHistory: true };
    }
    // If no auto-move is possible, just select the card.
    return { newState: null, newSelectedCard: clickInfo, highlightedPile: null, saveHistory: false };
}

/** Handles the first click when auto-move is disabled, which always selects the card. */
const handleInitialClickManual = (clickInfo: ClickSource): ProcessResult => {
    return { newState: null, newSelectedCard: clickInfo, highlightedPile: null, saveHistory: false };
}

/** Determines the action for the first click on a card based on game state and settings. */
const handleInitialClick = (gs: GameState, clickInfo: ClickSource, settings: GameSettings): ProcessResult => {
    const clickedCard = getClickedCard(gs, clickInfo);
    // Ignore clicks on empty areas or invalid cards.
    if (!clickedCard) return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };

    // If a face-down card is clicked in Solitaire, flip it.
    if (!clickedCard.faceUp) {
        const isTopTableau = gs.gameType === 'Solitaire' && clickInfo.type === 'tableau' && clickInfo.cardIndex === gs.tableau[clickInfo.pileIndex].length - 1;
        if (isTopTableau) return handleSolitaireTableauFlip(gs as SolitaireGameState, clickInfo);
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }
    
    // Dispatch to the appropriate handler based on the auto-move setting.
    return settings.autoMove ? handleInitialClickWithAutoMove(gs, clickInfo) : handleInitialClickManual(clickInfo);
};

/** Handles a click when a card is already selected (i.e., the second click of a move). */
const handleMoveWithSelectedCard = (gs: GameState, sel: SelectedCardInfo, click: ClickSource, tst: ReturnType<typeof useToast>['toast']): ProcessResult => {
    const destinationType = click.type as 'tableau' | 'foundation' | 'freecell';
    const move: GameMove = { source: sel, destination: { type: destinationType, pileIndex: click.pileIndex } };
    
    // 1. Check if the proposed move is valid.
    if (isValidMove(gs, move, tst)) {
        const newState = executeMove(gs, move);
        const highlightedPile = { type: move.destination.type, pileIndex: move.destination.pileIndex };
        return { newState, newSelectedCard: null, highlightedPile, saveHistory: true };
    }

    // 2. If the move is invalid, check if the user clicked on a different selectable card.
    const newlyClickedCard = getClickedCard(gs, click);
    if (newlyClickedCard && newlyClickedCard.faceUp) {
        // Change the selection to the new card.
        return { newState: null, newSelectedCard: click, highlightedPile: null, saveHistory: false };
    }

    // 3. If the move is invalid and the click was not on a valid new card, deselect the current card.
    return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
};


// ================================================================================================
// Main Exported Controller
// ================================================================================================

/** Processes a click on a card or pile, determining the correct action based on the current game state. */
export const processCardClick = ({ gameState, selectedCard, clickSource, settings, toast }: ProcessClickParams): ProcessResult => {
    // If a card is already selected, this is the second click (a move attempt).
    if (selectedCard) {
        // If the same card is clicked again, deselect it.
        const isSameCard = selectedCard.type === clickSource.type && selectedCard.pileIndex === clickSource.pileIndex && selectedCard.cardIndex === clickSource.cardIndex;
        if (isSameCard) {
            return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
        }
        return handleMoveWithSelectedCard(gameState, selectedCard, clickSource, toast);
    } 
    // If no card is selected, this is the first click.
    else {
        return handleInitialClick(gameState, clickSource, settings);
    }
};
