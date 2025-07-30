import { createInitialState, canMoveToTableau, checkForCompletedSet, isGameWon, Card, GameState } from '../src/lib/spider';

describe('Spider Solitaire Game Logic', () => {

  describe('createInitialState', () => {
    it('should create a valid initial game state for 1 suit', () => {
      const state = createInitialState(1);
      expect(state.tableau.length).toBe(10);
      const cardCount = state.tableau.reduce((sum, pile) => sum + pile.length, 0);
      expect(cardCount).toBe(54);
      expect(state.stock.length).toBe(104 - 54);
      expect(state.suitCount).toBe(1);
    });

    it('should create a valid initial game state for 2 suits', () => {
        const state = createInitialState(2);
        expect(state.suitCount).toBe(2);
    });
  });

  describe('canMoveToTableau', () => {
    it('should allow moving a valid run to an empty pile', () => {
      const run: Card[] = [
        { suit: 'SPADES', rank: '5', faceUp: true },
        { suit: 'SPADES', rank: '4', faceUp: true },
      ];
      expect(canMoveToTableau(run, undefined)).toBe(true);
    });

    it('should allow moving a valid run to a card of one higher rank', () => {
      const run: Card[] = [
        { suit: 'SPADES', rank: '5', faceUp: true },
        { suit: 'SPADES', rank: '4', faceUp: true },
      ];
      const destinationCard: Card = { suit: 'HEARTS', rank: '6', faceUp: true };
      expect(canMoveToTableau(run, destinationCard)).toBe(true);
    });

    it('should not allow moving an invalid run', () => {
        const run: Card[] = [
            { suit: 'SPADES', rank: '5', faceUp: true },
            { suit: 'HEARTS', rank: '4', faceUp: true }, // Different suits
        ];
        const destinationCard: Card = { suit: 'DIAMONDS', rank: '6', faceUp: true };
        expect(canMoveToTableau(run, destinationCard)).toBe(false);
    });

    it('should not allow moving to a card of incorrect rank', () => {
        const run: Card[] = [
            { suit: 'SPADES', rank: '5', faceUp: true },
            { suit: 'SPADES', rank: '4', faceUp: true },
        ];
        const destinationCard: Card = { suit: 'HEARTS', rank: '7', faceUp: true };
        expect(canMoveToTableau(run, destinationCard)).toBe(false);
    });
  });

  describe('checkForCompletedSet', () => {
    it('should identify and remove a completed set', () => {
      const pile: Card[] = [
        { suit: 'CLUBS', rank: '2', faceUp: true },
        // Completed set from K to A
        ...['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'A'].map(r => ({
          suit: 'SPADES', rank: r, faceUp: true
        } as Card))
      ];
      
      const result = checkForCompletedSet(pile);
      expect(result.setsCompleted).toBe(1);
      expect(result.updatedPile.length).toBe(1);
      expect(result.updatedPile[0].rank).toBe('2');
      expect(result.completedSet?.length).toBe(13);
      expect(result.completedSet?.[0].rank).toBe('K');
    });

    it('should do nothing if no completed set is found', () => {
        const pile: Card[] = [
            { suit: 'CLUBS', rank: '2', faceUp: true },
            { suit: 'SPADES', rank: 'K', faceUp: true },
            { suit: 'SPADES', rank: 'Q', faceUp: true },
        ];
        const result = checkForCompletedSet(pile);
        expect(result.setsCompleted).toBe(0);
        expect(result.updatedPile.length).toBe(3);
        expect(result.completedSet).toBe(null);
    });
  });

  describe('isGameWon', () => {
    it('should return true when 8 sets are completed', () => {
        const state = createInitialState(1);
        state.completedSets = 8;
        expect(isGameWon(state)).toBe(true);
    });

    it('should return false when fewer than 8 sets are completed', () => {
        const state = createInitialState(1);
        state.completedSets = 7;
        expect(isGameWon(state)).toBe(false);
    });
  });

});
