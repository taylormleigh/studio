import { createInitialState, canMoveToTableau, canMoveToFoundation, getMovableCardCount, isGameWon, isRun, GameState, Card } from '../src/lib/freecell';

describe('Freecell Game Logic', () => {

  describe('createInitialState', () => {
    it('should create a valid initial game state', () => {
      const state = createInitialState();
      expect(state.tableau.length).toBe(8);
      // 4 piles with 7 cards, 4 piles with 6 cards
      const pileLengths = state.tableau.map(p => p.length);
      expect(pileLengths.filter(l => l === 7).length).toBe(4);
      expect(pileLengths.filter(l => l === 6).length).toBe(4);
      expect(state.tableau.every(pile => pile.every(card => card.faceUp))).toBe(true);
      expect(state.freecells.length).toBe(4);
      expect(state.freecells.every(c => c === null)).toBe(true);
      expect(state.foundation.length).toBe(4);
    });
  });

  describe('canMoveToTableau', () => {
    it('should allow moving any card to an empty tableau pile', () => {
      const card: Card = { suit: 'SPADES', rank: 'K', faceUp: true };
      expect(canMoveToTableau(card, undefined)).toBe(true);
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
  });
  
  describe('canMoveToFoundation', () => {
    it('should allow moving an Ace to an empty foundation pile', () => {
        const ace: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
        expect(canMoveToFoundation(ace, [])).toBe(true);
    });
  
    it('should allow moving a card of the same suit and one rank higher', () => {
        const twoOfHearts: Card = { suit: 'HEARTS', rank: '2', faceUp: true };
        const pileWithAce: Card[] = [{ suit: 'HEARTS', rank: 'A', faceUp: true }];
        expect(canMoveToFoundation(twoOfHearts, pileWithAce)).toBe(true);
    });
  });

  describe('getMovableCardCount', () => {
    it('should calculate the correct number of movable cards', () => {
      const state = createInitialState();
      // (1 + 4 empty freecells) * 2^0 = 5
      expect(getMovableCardCount(state)).toBe(5);

      state.freecells[0] = { suit: 'SPADES', rank: 'A', faceUp: true };
      // (1 + 3 empty freecells) * 2^0 = 4
      expect(getMovableCardCount(state)).toBe(4);

      state.tableau[0] = [];
      // (1 + 3 empty freecells) * 2^1 = 8
      expect(getMovableCardCount(state)).toBe(8);
      
      state.tableau[1] = [];
       // (1 + 3 empty freecells) * 2^2 = 16
      expect(getMovableCardCount(state)).toBe(16);
    });
  });
  
  describe('isRun', () => {
    it('should identify a valid run', () => {
      const run: Card[] = [
        { suit: 'CLUBS', rank: '5', faceUp: true },
        { suit: 'HEARTS', rank: '4', faceUp: true },
        { suit: 'SPADES', rank: '3', faceUp: true },
      ];
      expect(isRun(run)).toBe(true);
    });

    it('should reject a run with same-color cards', () => {
        const run: Card[] = [
            { suit: 'CLUBS', rank: '5', faceUp: true },
            { suit: 'SPADES', rank: '4', faceUp: true },
          ];
          expect(isRun(run)).toBe(false);
    });

    it('should reject a run with non-sequential ranks', () => {
        const run: Card[] = [
            { suit: 'CLUBS', rank: '5', faceUp: true },
            { suit: 'HEARTS', rank: '3', faceUp: true },
          ];
          expect(isRun(run)).toBe(false);
    });
  });

  describe('isGameWon', () => {
    it('should return true when the game is won', () => {
        const state = createInitialState();
        state.foundation = Array.from({ length: 4 }, (_, i) => 
          ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].map(rank => ({
            suit: ['SPADES', 'HEARTS', 'CLUBS', 'DIAMONDS'][i] as any,
            rank: rank as any,
            faceUp: true
          }))
        );
        expect(isGameWon(state)).toBe(true);
    });
  });
});
