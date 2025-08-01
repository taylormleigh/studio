
import { createInitialState, canMoveToTableau, canMoveToFoundation, isGameWon, isRun, getMovableCardCount, GameState, Card } from '../src/lib/freecell';
import { last } from '../src/lib/solitaire';

describe('Freecell Game Logic', () => {

  describe('createInitialState', () => {
    it('should create a valid initial game state', () => {
      const state = createInitialState();
      expect(state.tableau.length).toBe(8);
      expect(state.tableau[0].length).toBe(7); // 52 cards / 8 piles = 6.5 -> 4 piles with 7, 4 with 6
      expect(state.tableau[4].length).toBe(6);
      expect(state.tableau.every(pile => pile.every(card => card.faceUp))).toBe(true);
      expect(state.foundation.length).toBe(4);
      expect(state.freecells.length).toBe(4);
      expect(state.freecells.every(cell => cell === null)).toBe(true);
      const totalCards = state.tableau.reduce((sum, pile) => sum + pile.length, 0);
      expect(totalCards).toBe(52);
    });
  });

  describe('canMoveToTableau', () => {
    it('should allow moving any card to an empty tableau pile', () => {
      const king: Card = { suit: 'SPADES', rank: 'K', faceUp: true };
      const queen: Card = { suit: 'HEARTS', rank: 'Q', faceUp: true };
      expect(canMoveToTableau(king, undefined)).toBe(true);
      expect(canMoveToTableau(queen, undefined)).toBe(true);
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

    it('should not allow moving a card of non-sequential rank', () => {
      const redNine: Card = { suit: 'HEARTS', rank: '9', faceUp: true };
      const blackJack: Card = { suit: 'CLUBS', rank: 'J', faceUp: true };
      expect(canMoveToTableau(redNine, blackJack)).toBe(false);
    });
  });

  describe('canMoveToFoundation', () => {
    it('should allow moving an Ace to an empty foundation pile', () => {
      const aceOfHearts: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      expect(canMoveToFoundation(aceOfHearts, [])).toBe(true);
    });

    it('should not allow moving a non-Ace to an empty foundation pile', () => {
      const twoOfHearts: Card = { suit: 'HEARTS', rank: '2', faceUp: true };
      expect(canMoveToFoundation(twoOfHearts, [])).toBe(false);
    });

    it('should allow moving a card of the same suit and one rank higher', () => {
      const twoOfHearts: Card = { suit: 'HEARTS', rank: '2', faceUp: true };
      const aceOfHearts: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      expect(canMoveToFoundation(twoOfHearts, [aceOfHearts])).toBe(true);
    });

    it('should not allow moving a card of a different suit', () => {
      const twoOfSpades: Card = { suit: 'SPADES', rank: '2', faceUp: true };
      const aceOfHearts: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      expect(canMoveToFoundation(twoOfSpades, [aceOfHearts])).toBe(false);
    });

    it('should not allow moving a card of a non-sequential rank', () => {
      const threeOfHearts: Card = { suit: 'HEARTS', rank: '3', faceUp: true };
      const aceOfHearts: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      expect(canMoveToFoundation(threeOfHearts, [aceOfHearts])).toBe(false);
    });
  });

  describe('isGameWon', () => {
    it('should return true when all foundation piles are full', () => {
      const state: GameState = createInitialState();
      state.foundation = [
        [...Array(13)].map((_, i) => ({ suit: 'HEARTS', rank: 'A', faceUp: true })),
        [...Array(13)].map((_, i) => ({ suit: 'DIAMONDS', rank: 'A', faceUp: true })),
        [...Array(13)].map((_, i) => ({ suit: 'CLUBS', rank: 'A', faceUp: true })),
        [...Array(13)].map((_, i) => ({ suit: 'SPADES', rank: 'A', faceUp: true })),
      ];
      expect(isGameWon(state)).toBe(true);
    });

    it('should return false when foundation piles are not full', () => {
      const state = createInitialState();
      expect(isGameWon(state)).toBe(false);
    });
  });

  describe('isRun', () => {
    it('should return true for a valid run', () => {
        const run: Card[] = [
            { suit: 'CLUBS', rank: 'J', faceUp: true },
            { suit: 'HEARTS', rank: '10', faceUp: true },
            { suit: 'SPADES', rank: '9', faceUp: true },
        ];
        expect(isRun(run)).toBe(true);
    });

    it('should return false for a run with same-color cards', () => {
        const run: Card[] = [
            { suit: 'CLUBS', rank: 'J', faceUp: true },
            { suit: 'SPADES', rank: '10', faceUp: true }, // Invalid
            { suit: 'HEARTS', rank: '9', faceUp: true },
        ];
        expect(isRun(run)).toBe(false);
    });

    it('should return false for a run with non-sequential ranks', () => {
        const run: Card[] = [
            { suit: 'CLUBS', rank: 'J', faceUp: true },
            { suit: 'HEARTS', rank: '9', faceUp: true }, // Invalid
            { suit: 'SPADES', rank: '8', faceUp: true },
        ];
        expect(isRun(run)).toBe(false);
    });

    it('should return true for a single card', () => {
        expect(isRun([{ suit: 'CLUBS', rank: 'J', faceUp: true }])).toBe(true);
    });
  });

  describe('getMovableCardCount', () => {
    let state: GameState;

    beforeEach(() => {
        state = createInitialState();
    });

    it('should allow moving 1 card with all freecells full', () => {
        state.freecells = [
            { suit: 'HEARTS', rank: 'A', faceUp: true },
            { suit: 'DIAMONDS', rank: 'A', faceUp: true },
            { suit: 'CLUBS', rank: 'A', faceUp: true },
            { suit: 'SPADES', rank: 'A', faceUp: true },
        ];
        // Ensure no empty tableau piles for this specific test
        state.tableau = state.tableau.map(p => p.length > 0 ? p : [{ suit: 'HEARTS', rank: '2', faceUp: true }]);
        expect(getMovableCardCount(state)).toBe(1);
    });

    it('should allow moving 2 cards with 1 empty freecell', () => {
        state.freecells = [null, { suit: 'DIAMONDS', rank: 'A', faceUp: true }, { suit: 'CLUBS', rank: 'A', faceUp: true }, { suit: 'SPADES', rank: 'A', faceUp: true }];
        state.tableau = state.tableau.map(p => p.length > 0 ? p : [{ suit: 'HEARTS', rank: '2', faceUp: true }]);
        expect(getMovableCardCount(state)).toBe(2);
    });
    
    it('should allow moving 3 cards with 2 empty freecells', () => {
        state.freecells = [null, null, { suit: 'CLUBS', rank: 'A', faceUp: true }, { suit: 'SPADES', rank: 'A', faceUp: true }];
        state.tableau = state.tableau.map(p => p.length > 0 ? p : [{ suit: 'HEARTS', rank: '2', faceUp: true }]);
        expect(getMovableCardCount(state)).toBe(3);
    });

    it('should allow moving 4 cards with 3 empty freecells', () => {
        state.freecells = [null, null, null, { suit: 'SPADES', rank: 'A', faceUp: true }];
        state.tableau = state.tableau.map(p => p.length > 0 ? p : [{ suit: 'HEARTS', rank: '2', faceUp: true }]);
        expect(getMovableCardCount(state)).toBe(4);
    });

    it('should allow moving 5 cards with 4 empty freecells', () => {
        state.freecells = [null, null, null, null];
        state.tableau = state.tableau.map(p => p.length > 0 ? p : [{ suit: 'HEARTS', rank: '2', faceUp: true }]);
        expect(getMovableCardCount(state)).toBe(5);
    });
    
    it('should allow moving 10 cards with 4 empty freecells and 1 empty tableau', () => {
        state.freecells = [null, null, null, null];
        // Ensure all other piles are NOT empty before setting one to empty
        state.tableau = state.tableau.map((p, i) => i !== 0 ? [{ suit: 'HEARTS', rank: '2', faceUp: true }] : []);
        state.tableau[0] = []; // One empty tableau pile
        expect(getMovableCardCount(state)).toBe(10);
    });

    it('should allow moving 20 cards with 4 empty freecells and 2 empty tableaus', () => {
        state.freecells = [null, null, null, null];
        state.tableau = state.tableau.map(p => [{ suit: 'HEARTS', rank: '2', faceUp: true }]);
        state.tableau[0] = [];
        state.tableau[1] = [];
        expect(getMovableCardCount(state)).toBe(20);
    });

    it('should calculate correctly with a mix of empty cells and piles', () => {
      state.freecells = [null, null, { suit: 'CLUBS', rank: 'A', faceUp: true }, { suit: 'SPADES', rank: 'A', faceUp: true }]; // 2 empty cells
      state.tableau = state.tableau.map(p => [{ suit: 'HEARTS', rank: '2', faceUp: true }]);
      state.tableau[0] = [];
      state.tableau[1] = []; // 2 empty piles
      // (1 + 2) * 2^2 = 3 * 4 = 12
      expect(getMovableCardCount(state)).toBe(12);
    });
  });

  describe('Card Movement Simulation', () => {
    let state: GameState;
  
    beforeEach(() => {
      state = createInitialState();
    });
  
    it('should correctly move a single card from tableau to an empty freecell', () => {
      // Setup: ensure tableau pile 0 has a card
      if (state.tableau[0].length === 0) {
        state.tableau[0].push({ suit: 'HEARTS', rank: 'K', faceUp: true });
      }
      const cardToMove = last(state.tableau[0])!;
      
      // Simulate move
      state.tableau[0].pop();
      state.freecells[0] = cardToMove;

      expect(state.freecells[0]).toEqual(cardToMove);
      expect(state.tableau[0].length).toBe(6);
    });

    it('should correctly move a single card from tableau to foundation', () => {
      // Find or place an Ace at the top of a tableau pile
      const ace: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      state.tableau[0].push(ace);
      
      // Simulate move
      const card = state.tableau[0].pop()!;
      const foundationIndex = 0;
      if (canMoveToFoundation(card, state.foundation[foundationIndex])) {
        state.foundation[foundationIndex].push(card);
      }

      expect(last(state.foundation[foundationIndex])).toEqual(ace);
    });

    it('should move a valid stack of cards between tableau piles', () => {
        // Setup a valid stack to move
        const cardsToMove: Card[] = [
          { suit: 'SPADES', rank: '5', faceUp: true },
          { suit: 'HEARTS', rank: '4', faceUp: true },
        ];
        state.tableau[0] = [
            ...state.tableau[0],
            ...cardsToMove
        ];
        // Setup a valid destination
        state.tableau[1] = [{ suit: 'CLUBS', rank: '6', faceUp: true }];
        // Ensure enough movable card capacity
        state.freecells = [null, null, null, null]; // Allows moving up to 5 cards

        const sourceCardIndex = state.tableau[0].length - cardsToMove.length;
        const destCard = last(state.tableau[1]);

        if(isRun(cardsToMove) && canMoveToTableau(cardsToMove[0], destCard) && cardsToMove.length <= getMovableCardCount(state)) {
            const moved = state.tableau[0].splice(sourceCardIndex);
            state.tableau[1].push(...moved);
        }

        expect(state.tableau[0].length).toBe(7); // It started with 7
        expect(state.tableau[1].length).toBe(3);
        expect(last(state.tableau[1])!.rank).toBe('4');
    });

    it('should not move a stack of cards larger than the movable limit', () => {
      // Setup a stack of 3 cards
      state.tableau[0] = [
        { suit: 'SPADES', rank: '5', faceUp: true },
        { suit: 'HEARTS', rank: '4', faceUp: true },
        { suit: 'CLUBS', rank: '3', faceUp: true },
      ];
       // Setup a valid destination
      state.tableau[1] = [{ suit: 'CLUBS', rank: '6', faceUp: true }];
      // Set freecells to be full, allowing only 1 card to be moved
      state.freecells[0] = { suit: 'DIAMONDS', rank: 'K', faceUp: true };
      state.freecells[1] = { suit: 'DIAMONDS', rank: 'Q', faceUp: true };
      state.freecells[2] = { suit: 'DIAMONDS', rank: 'J', faceUp: true };
      state.freecells[3] = { suit: 'DIAMONDS', rank: '10', faceUp: true };
      // Ensure no empty tableau piles
      state.tableau = state.tableau.map(p => p.length > 0 ? p : [{suit: 'SPADES', rank: 'A', faceUp: true}])

      const movableCount = getMovableCardCount(state);
      const stackSize = state.tableau[0].length;
      expect(movableCount).toBe(1);
      
      let moved = false;
      if (stackSize <= movableCount) {
         // This block should not be executed
         moved = true;
      }
      
      expect(moved).toBe(false);
      expect(state.tableau[0].length).toBe(3);
      expect(state.tableau[1].length).toBe(1);
    });

  });
});

    