
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

  describe('Card Movement Simulation', () => {
    let state: GameState;
  
    beforeEach(() => {
      state = createInitialState();
    });
  
    it('should correctly move a single card from one tableau pile to another', () => {
      // Set up a valid move
      const cardToMove: Card = { suit: 'HEARTS', rank: 'Q', faceUp: true };
      const destinationCard: Card = { suit: 'SPADES', rank: 'K', faceUp: true };
  
      state.tableau[0] = [destinationCard];
      state.tableau[1] = [{ suit: 'CLUBS', rank: '5', faceUp: false }, cardToMove];
  
      const sourcePile = state.tableau[1];
      const destPile = state.tableau[0];
  
      // Simulate move
      const card = sourcePile.pop();
      if (card) {
        destPile.push(card);
        if (sourcePile.length > 0) {
          sourcePile[sourcePile.length - 1].faceUp = true;
        }
      }
      
      expect(state.tableau[0].length).toBe(2);
      expect(state.tableau[0][1].rank).toBe('Q');
      expect(state.tableau[1].length).toBe(1);
      expect(state.tableau[1][0].faceUp).toBe(true); // Check if card underneath is flipped
    });

    it('should correctly move a pile of cards from one tableau pile to another', () => {
        const pileToMove: Card[] = [
            { suit: 'HEARTS', rank: 'J', faceUp: true },
            { suit: 'SPADES', rank: '10', faceUp: true }
        ];
        const destinationCard: Card = { suit: 'CLUBS', rank: 'Q', faceUp: true };
    
        state.tableau[0] = [destinationCard];
        state.tableau[1] = [{ suit: 'DIAMONDS', rank: 'A', faceUp: false }, ...pileToMove];
    
        const sourcePile = state.tableau[1];
        const destPile = state.tableau[0];
        const cards = sourcePile.splice(1, 2);
        destPile.push(...cards);
        if(sourcePile.length > 0) {
            sourcePile[sourcePile.length - 1].faceUp = true;
        }

        expect(state.tableau[0].length).toBe(3);
        expect(state.tableau[0][2].rank).toBe('10');
        expect(state.tableau[1].length).toBe(1);
        expect(state.tableau[1][0].faceUp).toBe(true);
    });

    it('should correctly move the last card from a tableau pile, leaving it empty', () => {
      const cardToMove: Card = { suit: 'HEARTS', rank: 'Q', faceUp: true };
      const destinationCard: Card = { suit: 'SPADES', rank: 'K', faceUp: true };
  
      state.tableau[0] = [destinationCard];
      state.tableau[1] = [cardToMove]; // Pile with only one card
  
      const sourcePile = state.tableau[1];
      const destPile = state.tableau[0];
  
      const card = sourcePile.pop();
      if (card) {
        destPile.push(card);
      }
  
      expect(state.tableau[0].length).toBe(2);
      expect(state.tableau[1].length).toBe(0); // Source pile should be empty
    });

    it('should correctly move the last pile of cards from a tableau pile, leaving it empty', () => {
        const pileToMove: Card[] = [
            { suit: 'HEARTS', rank: 'J', faceUp: true },
            { suit: 'SPADES', rank: '10', faceUp: true }
        ];
        const destinationCard: Card = { suit: 'CLUBS', rank: 'Q', faceUp: true };
    
        state.tableau[0] = [destinationCard];
        state.tableau[1] = pileToMove;
    
        const sourcePile = state.tableau[1];
        const destPile = state.tableau[0];
        const cards = sourcePile.splice(0, 2);
        destPile.push(...cards);

        expect(state.tableau[0].length).toBe(3);
        expect(state.tableau[0][2].rank).toBe('10');
        expect(state.tableau[1].length).toBe(0);
    });

    it('should correctly move a card from waste to tableau via click', () => {
      const cardToMove: Card = { suit: 'HEARTS', rank: 'Q', faceUp: true };
      const destinationCard: Card = { suit: 'SPADES', rank: 'K', faceUp: true };
      state.waste = [cardToMove];
      state.tableau[0] = [destinationCard];
      
      // Simulate selecting card from waste
      // Simulate clicking tableau pile
      const sourcePile = state.waste;
      const destPile = state.tableau[0];
      const card = sourcePile.pop();
      if(card && canMoveToTableau(card, destPile[destPile.length - 1])) {
        destPile.push(card);
      }

      expect(state.waste.length).toBe(0);
      expect(state.tableau[0].length).toBe(2);
      expect(state.tableau[0][1].rank).toBe('Q');
    });

    it('should correctly move a card from tableau to foundation via click (auto-move)', () => {
      const aceOfSpades: Card = { suit: 'SPADES', rank: 'A', faceUp: true };
      state.tableau[0] = [aceOfSpades];
      
      const sourcePile = state.tableau[0];
      const destPile = state.foundation[0];
      const card = sourcePile.pop();

      if (card && canMoveToFoundation(card, destPile[destPile.length - 1])) {
        destPile.push(card);
      }

      expect(state.tableau[0].length).toBe(0);
      expect(state.foundation[0].length).toBe(1);
      expect(state.foundation[0][0].rank).toBe('A');
    });
  });

  describe('isGameWon', () => {
    it('should return true when all foundation piles are full', () => {
        const state: GameState = {
            gameType: 'Solitaire',
            tableau: [[], [], [], [], [], [], []],
            stock: [],
            waste: [],
            foundation: SUITS.map(suit => 
              ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].map(rank => ({
                suit: suit,
                rank: rank as any,
                faceUp: true
              }))
            ),
            drawCount: 1,
            moves: 99,
            score: 100
          };
      
      expect(isGameWon(state)).toBe(true);
    });

    it('should return false when foundation piles are not full', () => {
      const state = createInitialState();
      expect(isGameWon(state)).toBe(false);
    });
  });

});
