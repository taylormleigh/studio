

import { canMoveToFoundation as canMoveToFoundationFreecell } from './freecell';

export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type Pile = Card[];

export interface GameState {
  gameType: 'Solitaire';
  tableau: Pile[];
  foundation: Pile[];
  stock: Pile;
  waste: Pile;
  drawCount: 1 | 3;
  score: number;
  moves: number;
}

export const SUITS: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Map card ranks to numerical values for comparison.
const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

/**
 * Creates a standard 52-card deck.
 * @returns An array of Card objects.
 */
export function createDeck(): Card[] {
  return SUITS.flatMap(suit =>
    RANKS.map(rank => ({ suit, rank, faceUp: false }))
  );
}

/**
 * Shuffles an array of cards using the Fisher-Yates algorithm.
 * @param array The array of cards to shuffle.
 * @returns The shuffled array.
 */
export function shuffleDeck(array: any[]) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
}

/**
 * Creates the initial game state for a new game of Klondike Solitaire.
 * @param drawCount The number of cards to draw from the stock at a time (1 or 3).
 * @returns A new GameState object.
 */
export function createInitialState(drawCount: 1 | 3 = 1): GameState {
  const deck = shuffleDeck(createDeck());
  const tableau: Pile[] = Array.from({ length: 7 }, () => []);
  
  // Deal cards to the tableau piles according to Solitaire rules.
  for (let i = 0; i < 7; i++) {
    for (let j = i; j < 7; j++) {
      tableau[j].push(deck.pop()!);
    }
  }

  // Flip the top card of each tableau pile face-up.
  tableau.forEach(pile => {
    if (last(pile)) {
      last(pile)!.faceUp = true;
    }
  });

  return {
    gameType: 'Solitaire',
    tableau,
    foundation: [[], [], [], []],
    stock: deck,
    waste: [],
    drawCount,
    score: 0,
    moves: 0,
  };
}

/**
 * Determines the color of a card.
 * @param card The card to check.
 * @returns 'red' or 'black'.
 */
export function getCardColor(card: Card): 'red' | 'black' {
  return card.suit === 'HEARTS' || card.suit === 'DIAMONDS' ? 'red' : 'black';
}

/**
 * Checks if a card can be legally moved to a tableau pile.
 * @param cardToMove The card being moved.
 * @param destinationCard The top card of the destination pile, or undefined if the pile is empty.
 * @returns True if the move is valid, false otherwise.
 */
export function canMoveToTableau(cardToMove: Card, destinationCard: Card | undefined): boolean {
  // Rule for moving to an empty tableau pile: only a King can be moved.
  if (!destinationCard) {
    return cardToMove.rank === 'K';
  }

  // Rule for moving to a non-empty pile.
  if (!destinationCard.faceUp) {
    return false; // Cannot move onto a face-down card.
  }
  // Cards must be of alternating colors.
  const colorsMatch = getCardColor(cardToMove) === getCardColor(destinationCard);
  // Ranks must be in descending order.
  const ranksCorrect = RANK_VALUES[destinationCard.rank] === RANK_VALUES[cardToMove.rank] + 1;
  
  return !colorsMatch && ranksCorrect;
}


/**
 * Re-exports the canMoveToFoundation logic from Freecell as it's identical.
 */
export const canMoveToFoundation = canMoveToFoundationFreecell;


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
 * Safely gets the first card of a pile.
 * @param pile The pile to get the card from.
 * @returns The first card, or undefined if the pile is empty.
 */
export function first(pile: Pile): Card | undefined {
    return pile.length > 0 ? pile[0] : undefined;
}

/**
 * Safely gets the last card of a pile.
 * @param pile The pile to get the card from.
 * @returns The last card, or undefined if the pile is empty.
 */
export function last(pile: Pile): Card | undefined {
    return pile.length > 0 ? pile[pile.length - 1] : undefined;
}
    
