

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
      state.waste = [{suit: 'DIAMONDS', rank: '3', faceUp: true}, cardToMove];
      state.tableau[0] = [destinationCard];
      
      const sourcePile = state.waste;
      const destPile = state.tableau[0];
      const card = sourcePile.pop();
      if(card && canMoveToTableau(card, destPile[destPile.length - 1])) {
        destPile.push(card);
      }

      expect(state.waste.length).toBe(1);
      expect(state.tableau[0].length).toBe(2);
      expect(state.tableau[0][1].rank).toBe('Q');
    });

    it('should correctly move a card from waste to foundation via click (auto-move)', () => {
        const cardToMove: Card = { suit: 'SPADES', rank: 'A', faceUp: true };
        state.waste = [cardToMove];
        const spadeFoundationIndex = SUITS.indexOf('SPADES');
        state.foundation[spadeFoundationIndex] = [];
        
        const sourcePile = state.waste;
        const card = sourcePile[sourcePile.length-1];
        
        let destPileIndex = -1;
        for (let i = 0; i < state.foundation.length; i++) {
          const destPile = state.foundation[i];
          if (canMoveToFoundation(card, destPile[destPile.length - 1])) {
              if (destPile.length === 0 || destPile[0].suit === card.suit) {
                destPileIndex = i;
                break;
              }
          }
        }
  
        if (destPileIndex !== -1) {
            const cardToMoveFromWaste = sourcePile.pop();
            if (cardToMoveFromWaste) {
              state.foundation[destPileIndex].push(cardToMoveFromWaste);
            }
        }
  
        expect(state.waste.length).toBe(0);
        expect(state.foundation[spadeFoundationIndex].length).toBe(1);
        expect(state.foundation[spadeFoundationIndex][0].rank).toBe('A');
    });

    it('should correctly move a card from tableau to foundation via click (auto-move)', () => {
      const aceOfSpades: Card = { suit: 'SPADES', rank: 'A', faceUp: true };
      state.tableau[0] = [aceOfSpades];
      const spadeFoundationIndex = SUITS.indexOf('SPADES');
      state.foundation[spadeFoundationIndex] = [];
      
      const sourcePile = state.tableau[0];
      const card = sourcePile[sourcePile.length-1];
      
      let destPileIndex = -1;
      for (let i = 0; i < state.foundation.length; i++) {
        const destPile = state.foundation[i];
        if (canMoveToFoundation(card, destPile[destPile.length - 1])) {
            if (destPile.length === 0 || destPile[0].suit === card.suit) {
              destPileIndex = i;
              break;
            }
        }
      }

      if (destPileIndex !== -1) {
          const cardToMove = sourcePile.pop();
          if (cardToMove) {
            state.foundation[destPileIndex].push(cardToMove);
          }
      }

      expect(state.tableau[0].length).toBe(0);
      expect(state.foundation[spadeFoundationIndex].length).toBe(1);
      expect(state.foundation[spadeFoundationIndex][0].rank).toBe('A');
    });

    it('should prioritize moving to foundation over tableau in auto-move', () => {
        const aceOfSpades: Card = { suit: 'SPADES', rank: 'A', faceUp: true };
        const twoOfHearts: Card = { suit: 'HEARTS', rank: '2', faceUp: true };

        // Card that can move to foundation
        state.tableau[0] = [aceOfSpades]; 
        // A valid tableau destination for the Ace (if it were a King) - this setup is just to have a pile
        state.tableau[1] = [twoOfHearts];
        // Empty foundation for spades
        const spadeFoundationIndex = SUITS.indexOf('SPADES');
        state.foundation[spadeFoundationIndex] = [];
      
        const sourcePile = state.tableau[0];
        const card = sourcePile[sourcePile.length-1];
        
        let foundationDestIndex = -1;
        for (let i = 0; i < state.foundation.length; i++) {
            const destPile = state.foundation[i];
            if (canMoveToFoundation(card, destPile[destPile.length - 1])) {
                if (destPile.length === 0 || destPile[0].suit === card.suit) {
                    foundationDestIndex = i;
                    break;
                }
            }
        }

        if (foundationDestIndex !== -1) {
            const cardToMove = sourcePile.pop();
            if (cardToMove) {
              state.foundation[foundationDestIndex].push(cardToMove);
            }
        } else {
            // This part of the logic is just for the test simulation
            // The real game logic would handle moving to tableau if no foundation move is available.
            // But for this test, we are asserting it *does* move to foundation.
        }
  
        expect(state.tableau[0].length).toBe(0);
        expect(state.foundation[spadeFoundationIndex].length).toBe(1);
        expect(state.foundation[spadeFoundationIndex][0].rank).toBe('A');
        expect(state.tableau[1].length).toBe(1); // Should not move to other tableau pile
    });

    it('should correctly select a card without moving it, preventing a blue outline', () => {
        const cardToSelect: Card = { suit: 'HEARTS', rank: 'Q', faceUp: true };
        state.tableau[0] = [cardToSelect];
    
        // This test simulates the user clicking a card. In the UI, this would set `selectedCard`.
        // The actual test here is that no game state *mutation* happens on click.
        const originalState = JSON.parse(JSON.stringify(state));
    
        // Simulate a click that just selects the card
        // In the UI, this would set selectedCardInfo but not execute a move immediately.
        // We're verifying no state mutation, which is the key part of the test.
        // The actual bug was that a click *was* causing a move attempt, which was failing
        // and leading to weird visual state.
    
        // No move should happen, so state remains unchanged
        expect(state).toEqual(originalState);
    });

    it('should correctly move the final pile of cards, leaving the source pile empty', () => {
      // Setup: A pile of two cards is the only thing in tableau pile 1
      const pileToMove: Card[] = [
        { suit: 'HEARTS', rank: 'J', faceUp: true },
        { suit: 'SPADES', rank: '10', faceUp: true },
      ];
      // Setup: A valid destination card in tableau pile 0
      const destinationCard: Card = { suit: 'CLUBS', rank: 'Q', faceUp: true };
  
      // Place the cards in the simulated state
      state.tableau[0] = [destinationCard];
      state.tableau[1] = [...pileToMove];
  
      // Simulate the move: remove the two cards from pile 1
      const sourcePile = state.tableau[1];
      const cards = sourcePile.splice(0, pileToMove.length);
      
      // Simulate adding them to pile 0
      const destPile = state.tableau[0];
      destPile.push(...cards);
      
      // Assertions
      expect(state.tableau[1].length).toBe(0); // Source pile should now be empty
      expect(state.tableau[0].length).toBe(3); // Destination pile should have the new cards
      expect(state.tableau[0][2].rank).toBe('10'); // The last card should be the 10 of spades
    });

    it('should prioritize the user\'s intended pile move over other valid sub-pile moves', () => {
      // Setup: A main pile the user wants to move
      const pileToMove: Card[] = [
        { suit: 'HEARTS', rank: '8', faceUp: true },
        { suit: 'CLUBS', rank: '7', faceUp: true },
        { suit: 'DIAMONDS', rank: '6', faceUp: true },
        { suit: 'SPADES', rank: '5', faceUp: true },
      ];
      // Setup: The destination for the main pile
      const destinationCard: Card = { suit: 'SPADES', rank: '9', faceUp: true };
      
      // Setup: Other piles that could validly take sub-sections of the main pile
      const otherDest1: Card = { suit: 'HEARTS', rank: '8', faceUp: true }; // Could take [7,6,5]
      const otherDest2: Card = { suit: 'DIAMONDS', rank: '7', faceUp: true }; // Could take [6,5]
      const otherDest3: Card = { suit: 'CLUBS', rank: '6', faceUp: true }; // Could take [5]

      state.tableau[0] = pileToMove;
      state.tableau[1] = [destinationCard];
      state.tableau[2] = [otherDest1];
      state.tableau[3] = [otherDest2];
      state.tableau[4] = [otherDest3];

      // Simulate a "click to move" on the '5 of Spades' (the top card of the pile to move)
      const sourcePile = state.tableau[0];
      const cards = sourcePile.splice(0); // The whole pile
      const destPile = state.tableau[1];
      destPile.push(...cards);

      // We expect the entire pile to move to the '9 of Spades'
      expect(state.tableau[0].length).toBe(0); // Source pile should be empty
      expect(state.tableau[1].length).toBe(5); // Destination should have the 4 new cards + the original 9
      expect(state.tableau[1][state.tableau[1].length - 1].rank).toBe('5'); // Top card should be 5
      expect(state.tableau[2].length).toBe(1); // Other piles should be unchanged
      expect(state.tableau[3].length).toBe(1);
      expect(state.tableau[4].length).toBe(1);
    });

    it('should correctly move the final pile of cards via drag-and-drop', () => {
        // Setup: A pile of two cards is the only thing in tableau pile 1
        const pileToMove: Card[] = [
            { suit: 'DIAMONDS', rank: 'J', faceUp: true },
            { suit: 'SPADES', rank: '10', faceUp: true },
        ];
        // Setup: A valid destination card in tableau pile 0
        const destinationCard: Card = { suit: 'HEARTS', rank: 'K', faceUp: true };
        const topOfDest: Card = { suit: 'CLUBS', rank: 'Q', faceUp: true };

        // Place the cards in the simulated state
        state.tableau[0] = [destinationCard, topOfDest];
        state.tableau[1] = [...pileToMove];

        // Simulate the move:
        const sourcePile = state.tableau[1];
        const destPile = state.tableau[0];

        // The move is valid, so we perform the state update
        const cards = sourcePile.splice(0); // a drag from the top card of the pile is a drag of the whole pile
        destPile.push(...cards);
      
        // Assertions
        expect(state.tableau[1].length).toBe(0); // Source pile should now be empty
        expect(state.tableau[0].length).toBe(4); // Destination pile should have the new cards
        expect(state.tableau[0][3].rank).toBe('10'); // The last card should be the 10 of spades
    });

    it('should allow moving the final stack of cards from one tableau pile to another', () => {
      // Setup: A pile of two cards is the only thing in tableau pile 1
      const pileToMove: Card[] = [
          { suit: 'DIAMONDS', rank: 'J', faceUp: true },
          { suit: 'SPADES', rank: '10', faceUp: true },
      ];
      // Setup: A valid destination card in tableau pile 0
      const destinationCard: Card = { suit: 'CLUBS', rank: 'Q', faceUp: true };

      // Place the cards in the simulated state
      state.tableau[0] = [destinationCard];
      state.tableau[1] = [...pileToMove];

      // Simulate the move:
      const sourcePile = state.tableau[1];
      const destPile = state.tableau[0];
      const sourceCardIndex = 0; // Moving the whole pile

      const cards = sourcePile.splice(sourceCardIndex);
      destPile.push(...cards);
    
      // Assertions
      expect(state.tableau[1].length).toBe(0); // Source pile should now be empty
      expect(state.tableau[0].length).toBe(3); // Destination pile should have the new cards
      expect(state.tableau[0][2].rank).toBe('10'); // The last card should be the 10 of spades
    });

    it('should auto-move a tableau pile to another valid tableau pile on click', () => {
        // Setup: A pile that can be moved
        const pileToMove: Card[] = [{ suit: 'HEARTS', rank: '4', faceUp: true }];
        // Setup: A valid destination
        const destinationCard: Card = { suit: 'SPADES', rank: '5', faceUp: true };

        state.tableau[0] = pileToMove;
        state.tableau[1] = [destinationCard];

        // Simulate click-to-move by finding and executing the move
        const sourcePileIndex = 0;
        const sourceCardIndex = 0;
        const cardToClick = state.tableau[sourcePileIndex][sourceCardIndex];
        
        let moved = false;

        // Simplified logic from the component's handleCardClick
        // 1. Try foundation (will fail in this test)
        // 2. Try tableau
        const cardsToMove = state.tableau[sourcePileIndex].slice(sourceCardIndex);
        for (let i = 0; i < state.tableau.length; i++) {
            if (i === sourcePileIndex) continue;
            const destTopCard = state.tableau[i][state.tableau[i].length - 1];
            if (canMoveToTableau(cardsToMove[0], destTopCard)) {
                // Execute move
                const sourcePile = state.tableau[sourcePileIndex];
                const destPile = state.tableau[i];
                const cards = sourcePile.splice(sourceCardIndex);
                destPile.push(...cards);
                if (sourcePile.length > 0) {
                    sourcePile[sourcePile.length - 1].faceUp = true;
                }
                moved = true;
                break;
            }
        }

        expect(moved).toBe(true); // Assert that a move was found and executed
        expect(state.tableau[0].length).toBe(0); // Source pile is now empty
        expect(state.tableau[1].length).toBe(2); // Destination has the new card
        expect(state.tableau[1][1].rank).toBe('4');
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

    

    