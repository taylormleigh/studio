
import { Card, Suit, Rank, SUITS, RANKS, shuffleDeck, createDeck, getCardColor, last } from './solitaire';

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
 * @param cardToMove The card being moved.
 * @param destinationCard The top card of the destination pile, or undefined if the pile is empty.
 * @returns True if the move is valid, false otherwise.
 */
export function canMoveToTableau(cardToMove: Card, destinationCard: Card | undefined): boolean {
  // Any card can move to an empty tableau pile.
  if (!destinationCard) {
    return true; 
  }
  // Cards must be of alternating colors.
  const colorsMatch = getCardColor(cardToMove) === getCardColor(destinationCard);
  // Ranks must be in descending order.
  const ranksCorrect = RANK_VALUES[destinationCard.rank] === RANK_VALUES[cardToMove.rank] + 1;
  return !colorsMatch && ranksCorrect;
}

/**
 * Checks if a card can be legally moved to a foundation pile.
 * @param cardToMove The card being moved.
 * @param foundationPile The destination foundation pile.
 * @returns True if the move is valid, false otherwise.
 */
export function canMoveToFoundation(cardToMove: Card, foundationPile: Card[]): boolean {
  const topCard = last(foundationPile);
  // An Ace can be moved to an empty foundation pile.
  if (!topCard) {
    return cardToMove.rank === 'A';
  }
  // Subsequent cards must be of the same suit and one rank higher.
  const suitsMatch = cardToMove.suit === topCard.suit;
  const ranksCorrect = RANK_VALUES[cardToMove.rank] === RANK_VALUES[topCard.rank] + 1;
  return suitsMatch && ranksCorrect;
}

/**
 * Checks if the game has been won (all cards are in the foundation piles).
 * @param state The current game state.
 * @returns True if the game is won, false otherwise.
 */
export function isGameWon(state: GameState): boolean {
  return state.foundation.every(pile => pile.length === 13);
}

/**
 * Checks if a stack of cards forms a valid run (alternating colors, descending rank).
 * This is used to validate moving multiple cards at once in the tableau.
 * @param cards The stack of cards to check.
 * @returns True if the stack is a valid run, false otherwise.
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
 * The formula is: (1 + empty_freecells) * 2^(empty_tableau_piles)
 * @param state The current game state.
 * @param isDestinationEmpty If true, the destination tableau pile is empty, which reduces the multiplier.
 * @returns The maximum number of cards that can be moved in a single stack.
 */
export function getMovableCardCount(state: GameState, isDestinationEmpty: boolean = false): number {
    const emptyFreecells = state.freecells.filter(c => c === null).length;
    let emptyTableauPiles = state.tableau.filter(p => p.length === 0).length;

    // If moving to an empty tableau pile, that destination pile doesn't contribute
    // to the number of empty piles that multiply the movable count.
    if (isDestinationEmpty && emptyTableauPiles > 0) {
        emptyTableauPiles--;
    }
    
    return (1 + emptyFreecells) * (2 ** emptyTableauPiles);
};

    