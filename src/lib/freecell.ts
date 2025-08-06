

import { Card, Suit, Rank, SUITS, RANKS, shuffleDeck, createDeck, getCardColor, last } from './solitaire';
import { GameMove, LocatedCard } from './game-logic';

export type { Card, Suit, Rank };

export interface GameState {
  gameType: 'Freecell';
  tableau: Card[][];
  foundation: Card[][];
  freecells: (Card | null)[];
  moves: number;
  score: number;
}

// Map card ranks to numerical values for comparison.
const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

/**
 * Creates the initial game state for a new game of Freecell.
 * All 52 cards are dealt face-up into the 8 tableau piles.
 * @returns A new GameState object.
 */
export function createInitialState(): GameState {
  const deck = shuffleDeck(createDeck()).map(c => ({ ...c, faceUp: true }));
  const tableau: Card[][] = Array.from({ length: 8 }, () => []);
  
  // Deal all cards to the tableau.
  deck.forEach((card, index) => {
    tableau[index % 8].push(card);
  });

  return {
    gameType: 'Freecell',
    tableau,
    foundation: [[], [], [], []],
    freecells: [null, null, null, null],
    moves: 0,
    score: 0,
  };
}

/**
 * Checks if a card can be legally moved to a tableau pile.
 */
export function canMoveToTableau(cardToMove: Card, destinationCard: Card | undefined): boolean {
  if (!destinationCard) {
    return true; 
  }
  const colorsMatch = getCardColor(cardToMove) === getCardColor(destinationCard);
  const ranksCorrect = RANK_VALUES[destinationCard.rank] === RANK_VALUES[cardToMove.rank] + 1;
  return !colorsMatch && ranksCorrect;
}

/**
 * Checks if a card can be legally moved to a foundation pile.
 */
export function canMoveToFoundation(cardToMove: Card, foundationPile: Card[]): boolean {
  const topCard = last(foundationPile);
  if (!topCard) {
    return cardToMove.rank === 'A';
  }
  const suitsMatch = cardToMove.suit === topCard.suit;
  const ranksCorrect = RANK_VALUES[cardToMove.rank] === RANK_VALUES[topCard.rank] + 1;
  return suitsMatch && ranksCorrect;
}

/**
 * Checks if the game has been won (all cards are in the foundation piles).
 */
export function isGameWon(state: GameState): boolean {
  return state.foundation.every(pile => pile.length === 13);
}

/**
 * Checks if a stack of cards forms a valid run (alternating colors, descending rank).
 */
export function isRun(cards: Card[]): boolean {
  if (cards.length <= 1) return true;
  for (let i = 0; i < cards.length - 1; i++) {
    if (getCardColor(cards[i]) === getCardColor(cards[i+1])) return false;
    if (RANK_VALUES[cards[i].rank] !== RANK_VALUES[cards[i+1].rank] + 1) return false;
  }
  return true;
}


/**
 * Calculates how many cards can be moved at once based on the number of available
 * empty freecells and empty tableau piles.
 */
export function getMovableCardCount(state: GameState, isDestinationEmpty: boolean): number {
    const emptyFreecells = state.freecells.filter(c => c === null).length;
    let emptyTableauPiles = state.tableau.filter(p => p.length === 0).length;
    if (isDestinationEmpty && emptyTableauPiles > 0) {
        emptyTableauPiles--;
    }
    return (1 + emptyFreecells) * (2 ** emptyTableauPiles);
};

/**
 * Finds the highest-priority valid auto-move for a given card/stack in Freecell.
 * Priority: Foundation -> Tableau -> Freecell.
 */
export function findAutoMoveForFreecell(gs: GameState, selectedCard: LocatedCard): GameMove | null {
    const cardsToMove = getCardsToMoveFromSource(gs, selectedCard.location);
    if (cardsToMove.length === 0) return null;
    const cardToMove = cardsToMove[0];

    // Priority 1: Try to move a single card to any foundation pile.
    if (cardsToMove.length === 1) {
        for (let i = 0; i < gs.foundation.length; i++) {
            if (canMoveToFoundation(cardToMove, gs.foundation[i])) {
                return { source: selectedCard.location, destination: { type: 'foundation', pileIndex: i } };
            }
        }
    }

    // Priority 2: Try to move the stack to any other tableau pile.
    for (let i = 0; i < gs.tableau.length; i++) {
        if (selectedCard.location.type === 'tableau' && selectedCard.location.pileIndex === i) continue;
        if (canMoveToTableau(cardToMove, last(gs.tableau[i]))) {
            const isDestEmpty = gs.tableau[i].length === 0;
            const maxMove = getMovableCardCount(gs, isDestEmpty);
            if(cardsToMove.length <= maxMove) {
                return { source: selectedCard.location, destination: { type: 'tableau', pileIndex: i } };
            }
        }
    }

    // Priority 3: Try to move a single card to an empty freecell.
    if (cardsToMove.length === 1) {
        const emptyCellIndex = gs.freecells.findIndex(cell => cell === null);
        if (emptyCellIndex !== -1) {
            return { source: selectedCard.location, destination: { type: 'freecell', pileIndex: emptyCellIndex } };
        }
    }

    return null;
}

function getCardsToMoveFromSource(gs: GameState, source: LocatedCard['location']): Card[] {
    if (source.type === 'tableau') {
        return gs.tableau[source.pileIndex]?.slice(source.cardIndex) || [];
    }
    if (source.type === 'freecell') {
        const card = gs.freecells[source.pileIndex];
        return card ? [card] : [];
    }
    return [];
}
