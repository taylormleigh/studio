

import { canMoveToFoundation as canMoveToFoundationFreecell } from './freecell';
import type { GameMove } from './game-logic';
import type { SelectedCardInfo } from '@/components/game/game-board';

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
  // Add methods to the prototype
  canMoveToTableau(cardToMove: Card, destinationCard: Card | undefined): boolean;
  canMoveToFoundation(cardToMove: Card, foundationPile: Pile): boolean;
  isGameWon(): boolean;
  isRun(cards: Card[]): boolean;
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
export function createInitialState(drawCount: 1 | 3 = 1): SolitaireGameState {
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

  const gameState: Omit<SolitaireGameState, 'canMoveToTableau' | 'canMoveToFoundation' | 'isGameWon' | 'isRun'> = {
    gameType: 'Solitaire',
    tableau,
    foundation: [[], [], [], []],
    stock: deck,
    waste: [],
    drawCount,
    score: 0,
    moves: 0,
  };
  
  // We can't assign methods directly in the object literal if we want to use `this`
  // so we create an object and then assign the methods to its prototype.
  const stateWithMethods = Object.create(gameState) as SolitaireGameState;
  stateWithMethods.canMoveToTableau = canMoveToTableau;
  stateWithMethods.canMoveToFoundation = canMoveToFoundation;
  stateWithMethods.isGameWon = isGameWon;
  stateWithMethods.isRun = isRun;

  return stateWithMethods;
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
 * This function is bound to the GameState prototype.
 */
export function canMoveToTableau(this: SolitaireGameState, cardToMove: Card, destinationCard: Card | undefined): boolean {
  if (!destinationCard) {
    return cardToMove.rank === 'K';
  }
  if (!destinationCard.faceUp) {
    return false;
  }
  const colorsMatch = getCardColor(cardToMove) === getCardColor(destinationCard);
  const ranksCorrect = RANK_VALUES[destinationCard.rank] === RANK_VALUES[cardToMove.rank] + 1;
  return !colorsMatch && ranksCorrect;
}


/**
 * Checks if a card can be legally moved to a foundation pile.
 * This function is bound to the GameState prototype.
 */
export function canMoveToFoundation(this: SolitaireGameState, cardToMove: Card, foundationPile: Card[]): boolean {
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
 * This function is bound to the GameState prototype.
 */
export function isGameWon(this: SolitaireGameState): boolean {
  return this.foundation.every(pile => pile.length === 13);
}

/**
 * Checks if a stack of cards forms a valid run (alternating colors, descending rank).
 * This function is bound to the GameState prototype.
 */
export function isRun(this: SolitaireGameState, cards: Card[]): boolean {
  if (cards.length <= 1) return true;
  for (let i = 0; i < cards.length - 1; i++) {
    if (getCardColor(cards[i]) === getCardColor(cards[i+1])) return false;
    if (RANK_VALUES[cards[i].rank] !== RANK_VALUES[cards[i+1].rank] + 1) return false;
  }
  return true;
}

/**
 * Finds the highest-priority valid auto-move for a given card/stack in Solitaire.
 * Priority: Foundation -> Tableau.
 */
export function findAutoMove(gs: SolitaireGameState, source: SelectedCardInfo): GameMove | null {
    let cardToMove: Card | undefined;
    let cardsToMove: Card[] = [];

    // Correctly get the card(s) to move based on the source type.
    if (source.type === 'tableau') {
        cardsToMove = (gs.tableau[source.pileIndex] || []).slice(source.cardIndex);
    } else if (source.type === 'waste') {
        cardsToMove = gs.waste.length > 0 ? [last(gs.waste)!] : [];
    }
    
    // If there's no card to move, exit.
    if (cardsToMove.length === 0) return null;
    cardToMove = cardsToMove[0];
    
    // Priority 1: Try to move a single card to any foundation pile.
    if (cardsToMove.length === 1) {
        for (let i = 0; i < gs.foundation.length; i++) {
            if (gs.canMoveToFoundation(cardToMove, gs.foundation[i])) {
                return { source, destination: { type: 'foundation', pileIndex: i } };
            }
        }
    }

    // Priority 2: Try to move the stack to any other tableau pile.
    // This check is only relevant for tableau sources.
    if (source.type === 'tableau') {
        for (let i = 0; i < gs.tableau.length; i++) {
            if (source.pileIndex === i) continue;
            if (gs.canMoveToTableau(cardToMove, last(gs.tableau[i]))) {
                return { source, destination: { type: 'tableau', pileIndex: i } };
            }
        }
    } else if (source.type === 'waste') {
         for (let i = 0; i < gs.tableau.length; i++) {
            if (gs.canMoveToTableau(cardToMove, last(gs.tableau[i]))) {
                return { source, destination: { type: 'tableau', pileIndex: i } };
            }
        }
    }
    
    return null;
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
    

