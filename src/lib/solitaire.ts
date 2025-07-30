export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type Pile = Card[];

export interface GameState {
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

const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

export function createDeck(): Card[] {
  return SUITS.flatMap(suit =>
    RANKS.map(rank => ({ suit, rank, faceUp: false }))
  );
}

export function shuffleDeck(deck: Card[]): Card[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

export function createInitialState(drawCount: 1 | 3 = 1): GameState {
  const deck = shuffleDeck(createDeck());
  const tableau: Pile[] = Array.from({ length: 7 }, () => []);
  
  for (let i = 0; i < 7; i++) {
    for (let j = i; j < 7; j++) {
      tableau[j].push(deck.pop()!);
    }
  }

  tableau.forEach(pile => {
    if (pile.length > 0) {
      pile[pile.length - 1].faceUp = true;
    }
  });

  return {
    tableau,
    foundation: [[], [], [], []],
    stock: deck,
    waste: [],
    drawCount,
    score: 0,
    moves: 0,
  };
}

export function getCardColor(card: Card): 'red' | 'black' {
  return card.suit === 'HEARTS' || card.suit === 'DIAMONDS' ? 'red' : 'black';
}

export function canMoveToTableau(cardToMove: Card, destinationCard: Card | undefined): boolean {
  if (!destinationCard) {
    return cardToMove.rank === 'K';
  }
  if (!destinationCard.faceUp) return false;
  const colorsMatch = getCardColor(cardToMove) === getCardColor(destinationCard);
  const ranksCorrect = RANK_VALUES[destinationCard.rank] === RANK_VALUES[cardToMove.rank] + 1;
  return !colorsMatch && ranksCorrect;
}

export function canMoveToFoundation(cardToMove: Card, topCard: Card | undefined): boolean {
  if (!topCard) {
    return cardToMove.rank === 'A';
  }
  const suitsMatch = cardToMove.suit === topCard.suit;
  const ranksCorrect = RANK_VALUES[cardToMove.rank] === RANK_VALUES[topCard.rank] + 1;
  return suitsMatch && ranksCorrect;
}

export function isGameWon(state: GameState): boolean {
  return state.foundation.every(pile => pile.length === 13);
}
