

import { Card, Suit, Rank, SUITS, RANKS, shuffleDeck, createDeck } from './solitaire';

export type { Card, Suit, Rank };

export type SpiderSuitCount = 1 | 2 | 4;

export interface GameState {
  gameType: 'Spider';
  tableau: Card[][];
  foundation: Card[][]; // Stores completed sets of cards (K-A)
  stock: Card[];
  completedSets: number;
  suitCount: SpiderSuitCount;
  moves: number;
  score: number;
}

// Map card ranks to numerical values for comparison.
const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

/**
 * Creates a deck for Spider Solitaire based on the number of suits.
 * Spider uses two standard 52-card decks (104 cards total).
 * 1 Suit: 8 sets of Spades.
 * 2 Suits: 4 sets of Spades, 4 sets of Hearts.
 * 4 Suits: 2 sets of each of the 4 suits.
 * @param suitCount The number of suits to play with.
 * @returns An array of 104 Card objects.
 */
function createSpiderDeck(suitCount: SpiderSuitCount): Card[] {
    const selectedSuits = 
        suitCount === 1 ? ['SPADES', 'SPADES', 'SPADES', 'SPADES', 'SPADES', 'SPADES', 'SPADES', 'SPADES'] as Suit[] :
        suitCount === 2 ? ['SPADES', 'SPADES', 'SPADES', 'SPADES', 'HEARTS', 'HEARTS', 'HEARTS', 'HEARTS'] as Suit[] :
        [...SUITS, ...SUITS];

    let deck: Card[] = [];
    selectedSuits.forEach(suit => {
        deck.push(...RANKS.map(rank => ({ suit, rank, faceUp: false })));
    });

    return deck;
}

/**
 * Creates the initial game state for a new game of Spider Solitaire.
 * @param suitCount The number of suits to use (1, 2, or 4).
 * @returns A new GameState object.
 */
export function createInitialState(suitCount: SpiderSuitCount): GameState {
  const deck = shuffleDeck(createSpiderDeck(suitCount));
  const tableau: Card[][] = Array.from({ length: 10 }, () => []);
  
  // Deal 54 cards to the 10 tableau piles.
  for (let i = 0; i < 54; i++) {
    tableau[i % 10].push(deck.pop()!);
  }

  // Flip the top card of each tableau pile face-up.
  tableau.forEach(pile => {
    if (pile.length > 0) {
      pile[pile.length - 1].faceUp = true;
    }
  });

  return {
    gameType: 'Spider',
    tableau,
    foundation: [],
    stock: deck, // Remaining 50 cards are in the stock.
    completedSets: 0,
    suitCount,
    moves: 0,
    score: 500, // Starting score, decreases with moves.
  };
}

/**
 * Checks if a stack of cards forms a valid run for moving.
 * In Spider, a movable run must be of the same suit and in descending rank order.
 * @param cards The stack of cards to check.
 * @returns True if the stack is a valid run, false otherwise.
 */
function isRun(cards: Card[]): boolean {
    if (cards.length < 1) return false;
    if (cards.length === 1) return true; // A single card is always a valid run.
    const firstSuit = cards[0].suit;
    for (let i = 0; i < cards.length - 1; i++) {
        // All cards in the run must be of the same suit.
        if (cards[i].suit !== firstSuit) return false;
        // Cards must be in descending rank order.
        if (RANK_VALUES[cards[i].rank] !== RANK_VALUES[cards[i+1].rank] + 1) return false;
    }
    return true;
}

/**
 * Checks if a stack of cards can be legally moved to a tableau pile.
 * @param cardsToMove The stack of cards being moved.
 * @param destinationCard The top card of the destination pile, or undefined if the pile is empty.
 * @returns True if the move is valid, false otherwise.
 */
export function canMoveToTableau(cardsToMove: Card[], destinationCard: Card | undefined, isDragCheck = false): boolean {
  // The stack being moved must be a valid run (same suit, descending order).
  if (isDragCheck && !isRun(cardsToMove)) {
    return false;
  }
  
  const cardToMove = cardsToMove[0];

  // Any valid run can move to an empty tableau pile.
  if (!destinationCard) {
    return true;
  }

  // The top card of the run can be placed on a card of one higher rank, regardless of suit.
  const ranksCorrect = RANK_VALUES[destinationCard.rank] === RANK_VALUES[cardToMove.rank] + 1;
  return ranksCorrect;
}

/**
 * Checks a tableau pile for a completed set (King to Ace of the same suit).
 * If a set is found, it's removed from the pile.
 * @param tableauPile The tableau pile to check.
 * @returns An object containing the updated pile, the number of sets completed, and the completed set itself.
 */
export function checkForCompletedSet(tableauPile: Card[]): { updatedPile: Card[], setsCompleted: number, completedSet: Card[] | null } {
    if (tableauPile.length < 13) {
      return { updatedPile: tableauPile, setsCompleted: 0, completedSet: null };
    }
  
    // Check the last 13 cards for a complete set.
    const topThirteen = tableauPile.slice(tableauPile.length - 13);
    const topCard = topThirteen[0];
  
    // A completed set starts with a King and must be a valid run.
    if (topCard.rank === 'K' && isRun(topThirteen)) {
      // A full run from K to A of the same suit has been found.
      return {
        updatedPile: tableauPile.slice(0, tableauPile.length - 13),
        setsCompleted: 1,
        completedSet: topThirteen,
      };
    }
  
    return { updatedPile: tableauPile, setsCompleted: 0, completedSet: null };
}
  
/**
 * Checks if the game has been won.
 * In Spider, the game is won when 8 sets are completed.
 * @param state The current game state.
 * @returns True if the game is won, false otherwise.
 */
export function isGameWon(state: GameState): boolean {
  return state.completedSets === 8;
}
    
