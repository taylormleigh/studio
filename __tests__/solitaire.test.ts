import { createInitialState, canMoveToTableau, canMoveToFoundation, isGameWon, getCardColor, Card, GameState, SUITS } from '../src/lib/solitaire';

describe('Solitaire Game Logic', () => {

  describe('createInitialState', () => {
    it('should create a valid initial game state', () => {
      const state = createInitialState();
      expect(state.tableau.length).toBe(7);
      expect(state.tableau[0].length).toBe(1);
      expect(state.tableau[6].length).toBe(7);
      expect(state.tableau.every(pile => pile[pile.length - 1].faceUp)).toBe(true);
      expect(state.stock.length).toBe(52 - 28);
      expect(state.foundation.length).toBe(4);
      expect(state.waste.length).toBe(0);
    });
  });

  describe('canMoveToTableau', () => {
    it('should allow moving a King to an empty tableau pile', () => {
      const king: Card = { suit: 'SPADES', rank: 'K', faceUp: true };
      expect(canMoveToTableau(king, undefined)).toBe(true);
    });

    it('should not allow moving a non-King to an empty tableau pile', () => {
      const queen: Card = { suit: 'SPADES', rank: 'Q', faceUp: true };
      expect(canMoveToTableau(queen, undefined)).toBe(false);
    });

    it('should allow moving a card of opposite color and one rank lower', () => {
      const redTen: Card = { suit: 'HEARTS', rank: '10', faceUp: true };
      const blackJack: Card = { suit: 'CLUBS', rank: 'J', faceUp: true };
      expect(canMoveToTableau(redTen, blackJack)).toBe(true);
    });

    it('should not allow moving a card of the same color', () => {
      const blackTen: Card = { suit: 'SPADES', rank: '10', faceUp: true };
      const blackJack: Card = { suit: 'CLUBS', rank: 'J', faceUp: true };
      expect(canMoveToTableau(blackTen, blackJack)).toBe(false);
    });

    it('should not allow moving a card of the same rank', () => {
      const redJack: Card = { suit: 'HEARTS', rank: 'J', faceUp: true };
      const blackJack: Card = { suit: 'CLUBS', rank: 'J', faceUp: true };
      expect(canMoveToTableau(redJack, blackJack)).toBe(false);
    });
  });

  describe('canMoveToFoundation', () => {
    it('should allow moving an Ace to an empty foundation pile', () => {
      const ace: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      expect(canMoveToFoundation(ace, undefined)).toBe(true);
    });

    it('should not allow moving a non-Ace to an empty foundation pile', () => {
      const two: Card = { suit: 'HEARTS', rank: '2', faceUp: true };
      expect(canMoveToFoundation(two, undefined)).toBe(false);
    });

    it('should allow moving a card of the same suit and one rank higher', () => {
      const twoOfHearts: Card = { suit: 'HEARTS', rank: '2', faceUp: true };
      const aceOfHearts: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      expect(canMoveToFoundation(twoOfHearts, aceOfHearts)).toBe(true);
    });

    it('should not allow moving a card of a different suit', () => {
      const twoOfSpades: Card = { suit: 'SPADES', rank: '2', faceUp: true };
      const aceOfHearts: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      expect(canMoveToFoundation(twoOfSpades, aceOfHearts)).toBe(false);
    });

    it('should not allow moving a card of a non-sequential rank', () => {
      const threeOfHearts: Card = { suit: 'HEARTS', rank: '3', faceUp: true };
      const aceOfHearts: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      expect(canMoveToFoundation(threeOfHearts, aceOfHearts)).toBe(false);
    });
  });

  describe('isGameWon', () => {
    it('should return true when all foundation piles are full', () => {
      const state = createInitialState();
      // To win, all cards must be in the foundation
      state.tableau = Array.from({ length: 7 }, () => []);
      state.stock = [];
      state.waste = [];

      state.foundation = SUITS.map(suit => 
        ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].map(rank => ({
          suit: suit,
          rank: rank as any,
          faceUp: true
        }))
      );
      
      expect(isGameWon(state)).toBe(true);
    });

    it('should return false when foundation piles are not full', () => {
      const state = createInitialState();
      expect(isGameWon(state)).toBe(false);
    });
  });

});
