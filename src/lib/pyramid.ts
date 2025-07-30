
import { Card, Suit, Rank, SUITS, RANKS, shuffleDeck, createDeck, getCardColor } from './solitaire';

export type { Card, Suit, Rank };

export interface GameState {
  gameType: 'Pyramid';
  pyramid: (Card | null)[]; // 28 cards in a pyramid, null if removed
  stock: Card[];
  waste: Card[];
  moves: number;
  score: number;
  recycles: number; // Number of times stock can be recycled
}

export const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

export function createInitialState(): GameState {
  const deck = shuffleDeck(createDeck());
  const pyramid: Card[] = [];
  
  // Deal 28 cards to the pyramid
  for (let i = 0; i < 28; i++) {
    const card = deck.pop()!;
    card.faceUp = true;
    pyramid.push(card);
  }

  // The rest of the deck is the stock
  const stock = deck.map(c => ({ ...c, faceUp: false }));

  return {
    gameType: 'Pyramid',
    pyramid,
    stock,
    waste: [],
    moves: 0,
    score: 0,
    recycles: 2, // Standard Pyramid allows 2 recycles
  };
}

export function canRemovePair(card1: Card, card2: Card): boolean {
    return RANK_VALUES[card1.rank] + RANK_VALUES[card2.rank] === 13;
}

export function isGameWon(state: GameState): boolean {
  // Game is won if the pyramid is empty
  return state.pyramid.every(card => card === null);
}
