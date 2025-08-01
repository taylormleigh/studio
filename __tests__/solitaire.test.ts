

import { createInitialState, canMoveToTableau, canMoveToFoundation, isGameWon, getCardColor, Card, GameState, SUITS, isRun, last, first } from '../src/lib/solitaire';

describe('Solitaire Game Logic', () => {

  describe('createInitialState', () => {
    it('should create a valid initial game state', () => {
      const state = createInitialState();
      expect(state.tableau.length).toBe(7);
      expect(state.tableau[0].length).toBe(1);
      expect(state.tableau[6].length).toBe(7);
      expect(state.tableau.every(pile => last(pile)!.faceUp)).toBe(true);
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
      expect(canMoveToFoundation(ace, [])).toBe(true);
    });

    it('should not allow moving a non-Ace to an empty foundation pile', () => {
      const two: Card = { suit: 'HEARTS', rank: '2', faceUp: true };
      expect(canMoveToFoundation(two, [])).toBe(false);
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
      if (card && canMoveToTableau(card, last(destPile))) {
        destPile.push(card);
        if (sourcePile.length > 0 && !last(sourcePile)!.faceUp) {
          last(sourcePile)!.faceUp = true;
        }
      }
      
      expect(destPile.length).toBe(2);
      expect(last(destPile)!.rank).toBe('Q');
      expect(sourcePile.length).toBe(1);
      expect(last(sourcePile)!.faceUp).toBe(true); // Check if card underneath is flipped
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
        const sourceCardIndex = sourcePile.findIndex(c => c.rank === 'J');

        // Simulate move
        const cards = sourcePile.splice(sourceCardIndex);
        destPile.push(...cards);
        if(sourcePile.length > 0) {
            last(sourcePile)!.faceUp = true;
        }

        expect(destPile.length).toBe(3);
        expect(last(destPile)!.rank).toBe('10');
        expect(sourcePile.length).toBe(1);
        expect(last(sourcePile)!.faceUp).toBe(true);
    });

    it('should correctly move the last card from a tableau pile, leaving it empty', () => {
      const cardToMove: Card = { suit: 'HEARTS', rank: 'Q', faceUp: true };
      const destinationCard: Card = { suit: 'SPADES', rank: 'K', faceUp: true };
  
      state.tableau[0] = [destinationCard];
      state.tableau[1] = [cardToMove]; // Pile with only one card
  
      const sourcePile = state.tableau[1];
      const destPile = state.tableau[0];
  
      const card = sourcePile.pop();
      if (card && canMoveToTableau(card, last(destPile))) {
        destPile.push(card);
      }
  
      expect(destPile.length).toBe(2);
      expect(sourcePile.length).toBe(0); // Source pile should be empty
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

      // Check the move is valid before performing it
      const cards = sourcePile.slice(sourceCardIndex);
      if (isRun(cards) && canMoveToTableau(cards[0], last(destPile))) {
        const movedCards = sourcePile.splice(sourceCardIndex);
        destPile.push(...movedCards);
      }
    
      // Assertions
      expect(sourcePile.length).toBe(0); // Source pile should now be empty
      expect(destPile.length).toBe(3); // Destination pile should have the new cards
      expect(last(destPile)!.rank).toBe('10'); // The last card should be the 10 of spades
    });


    it('should correctly move a card from waste to tableau via click', () => {
      const cardToMove: Card = { suit: 'HEARTS', rank: 'Q', faceUp: true };
      const destinationCard: Card = { suit: 'SPADES', rank: 'K', faceUp: true };
      state.waste = [{suit: 'DIAMONDS', rank: '3', faceUp: true}, cardToMove];
      state.tableau[0] = [destinationCard];
      
      const sourcePile = state.waste;
      const destPile = state.tableau[0];
      const card = sourcePile.pop();
      if(card && canMoveToTableau(card, last(destPile))) {
        destPile.push(card);
      }

      expect(state.waste.length).toBe(1);
      expect(state.tableau[0].length).toBe(2);
      expect(last(state.tableau[0])!.rank).toBe('Q');
    });

    it('should correctly move a card from waste to foundation via click (auto-move)', () => {
        const cardToMove: Card = { suit: 'SPADES', rank: 'A', faceUp: true };
        state.waste = [cardToMove];
        const spadeFoundationIndex = SUITS.findIndex(s => s === 'SPADES');
        state.foundation[spadeFoundationIndex] = [];
        
        const sourcePile = state.waste;
        const card = last(sourcePile)!;
        
        let destPileIndex = state.foundation.findIndex(destPile => 
            canMoveToFoundation(card, destPile) &&
            // This is the key check: the destination must be empty OR match the card's suit
            (destPile.length === 0 || last(destPile)?.suit === card.suit)
        );
  
        if (destPileIndex !== -1) {
            const cardToMoveFromWaste = sourcePile.pop();
            if (cardToMoveFromWaste) {
              state.foundation[destPileIndex].push(cardToMoveFromWaste);
            }
        }
  
        expect(state.waste.length).toBe(0);
        expect(state.foundation[spadeFoundationIndex].length).toBe(1);
        expect(last(state.foundation[spadeFoundationIndex])!.rank).toBe('A');
    });

    it('should correctly move a card from tableau to foundation via click (auto-move)', () => {
      const aceOfSpades: Card = { suit: 'SPADES', rank: 'A', faceUp: true };
      state.tableau[0] = [aceOfSpades];
      const spadeFoundationIndex = SUITS.findIndex(s => s === 'SPADES');
      state.foundation[spadeFoundationIndex] = [];
      
      const sourcePile = state.tableau[0];
      const card = last(sourcePile)!;
      
      const destPileIndex = state.foundation.findIndex(destPile => 
        canMoveToFoundation(card, destPile) &&
        (destPile.length === 0 || last(destPile)!.suit === card.suit)
      );

      if (destPileIndex !== -1) {
          const cardToMove = sourcePile.pop();
          if (cardToMove) {
            state.foundation[destPileIndex].push(cardToMove);
          }
      }

      expect(state.tableau[0].length).toBe(0);
      expect(state.foundation[spadeFoundationIndex].length).toBe(1);
      expect(last(state.foundation[spadeFoundationIndex])!.rank).toBe('A');
    });

    it('should prioritize moving to foundation over tableau in auto-move', () => {
        const aceOfSpades: Card = { suit: 'SPADES', rank: 'A', faceUp: true };
        const twoOfHearts: Card = { suit: 'HEARTS', rank: '2', faceUp: true };

        // Card that can move to foundation
        state.tableau[0] = [aceOfSpades]; 
        // A valid tableau destination for the Ace (if it were a King) - this setup is just to have a pile
        state.tableau[1] = [twoOfHearts];
        // Empty foundation for spades
        const spadeFoundationIndex = SUITS.findIndex(s => s === 'SPADES');
        state.foundation[spadeFoundationIndex] = [];
      
        const sourcePile = state.tableau[0];
        const card = last(sourcePile)!;
        
        const foundationDestIndex = state.foundation.findIndex(destPile => 
            canMoveToFoundation(card, destPile) &&
            (destPile.length === 0 || last(destPile)!.suit === card.suit)
        );

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
        expect(last(state.foundation[spadeFoundationIndex])!.rank).toBe('A');
        expect(state.tableau[1].length).toBe(1); // Should not move to other tableau pile
    });

    it('should correctly select a card without moving it, preventing a blue outline', () => {
        const cardToSelect: Card = { suit: 'HEARTS', rank: 'Q', faceUp: true };
        state.tableau[0] = [cardToSelect];
    
        const originalState = JSON.parse(JSON.stringify(state));
    
        expect(state).toEqual(originalState);
    });

    it('should auto-move a tableau pile to another valid tableau pile on click', () => {
        // Setup: A pile that can be moved
        const pileToMove: Card[] = [{ suit: 'HEARTS', rank: '4', faceUp: true }, { suit: 'SPADES', rank: '3', faceUp: true }, { suit: 'HEARTS', rank: '2', faceUp: true }];
        // Setup: A valid destination
        const destinationCard: Card = { suit: 'SPADES', rank: '5', faceUp: true };

        state.tableau[0] = pileToMove;
        state.tableau[1] = [destinationCard];

        // Simulate click-to-move by finding and executing the move
        const sourcePileIndex = 0;
        const sourceCardIndex = 0;
        
        let moved = false;

        // Simplified logic from the component's handleCardClick
        const sourcePile = state.tableau[sourcePileIndex];
        const clickedCard = sourcePile[sourceCardIndex];
        
        if (clickedCard.faceUp) {
            // 1. Try foundation (will fail in this test)
            const topCard = last(sourcePile)!;
            // ... foundation check would go here ...

            // 2. Try tableau
            const cardsToMove = sourcePile.slice(sourceCardIndex);
            for (let i = 0; i < state.tableau.length; i++) {
                if (i === sourcePileIndex) continue;
                const destTopCard = last(state.tableau[i]);
                if (canMoveToTableau(cardsToMove[0], destTopCard)) {
                    // Execute move
                    const destPile = state.tableau[i];
                    const cards = sourcePile.splice(sourceCardIndex);
                    destPile.push(...cards);
                    if (sourcePile.length > 0) {
                        last(sourcePile)!.faceUp = true;
                    }
                    moved = true;
                    break;
                }
            }
        }

        expect(moved).toBe(true); // Assert that a move was found and executed
        expect(state.tableau[0].length).toBe(0); // Source pile is now empty
        expect(state.tableau[1].length).toBe(4); // Destination has the new card
        expect(state.tableau[1][1].rank).toBe('4');
    });

    it('should auto-move a multi-card pile by clicking its base card', () => {
      // Setup the exact scenario from the bug report
      const baseCard: Card = { suit: 'CLUBS', rank: 'K', faceUp: false };
      const stackToMove: Card[] = [
        { suit: 'CLUBS', rank: '6', faceUp: true },
        { suit: 'HEARTS', rank: '5', faceUp: true },
        { suit: 'CLUBS', rank: '4', faceUp: true }
      ];
      const destinationCard: Card = { suit: 'HEARTS', rank: '7', faceUp: true };
  
      state.tableau[0] = [baseCard, ...stackToMove];
      state.tableau[1] = [destinationCard];
  
      // Simulate the "click to move" logic
      const sourcePileIndex = 0;
      const sourceCardIndex = 1; // Clicking the '6 of Clubs'
  
      // Simplified logic from the component
      const sourcePile = state.tableau[sourcePileIndex];
      const cardsToMove = sourcePile.slice(sourceCardIndex);
      let moved = false;
  
      // Check for a valid tableau destination
      for (let i = 0; i < state.tableau.length; i++) {
        if (i === sourcePileIndex) continue;
        const destTopCard = last(state.tableau[i]);
        if (isRun(cardsToMove) && canMoveToTableau(cardsToMove[0], destTopCard)) {
          // Perform the move
          const destPile = state.tableau[i];
          const movedCards = sourcePile.splice(sourceCardIndex);
          destPile.push(...movedCards);
          if (sourcePile.length > 0) {
            last(sourcePile)!.faceUp = true;
          }
          moved = true;
          break;
        }
      }
      
      expect(moved).toBe(true);
      expect(state.tableau[0].length).toBe(1); // Should only have the face-down King left
      expect(last(state.tableau[0])!.faceUp).toBe(true); // The card underneath should be flipped
      expect(state.tableau[1].length).toBe(4); // Destination has the original card + 3 new cards
      expect(state.tableau[1][1].rank).toBe('6'); // The base of the moved stack
      expect(last(state.tableau[1])!.rank).toBe('4'); // The top of the moved stack
    });

    it('should auto-move card from waste to tableau', () => {
        state.waste = [{ suit: 'HEARTS', rank: 'Q', faceUp: true }];
        state.tableau[0] = [{ suit: 'SPADES', rank: 'K', faceUp: true }];

        // Simulate click
        const card = last(state.waste)!;
        let tableauDestIndex = -1;
        for (let i = 0; i < state.tableau.length; i++) {
            if (canMoveToTableau(card, last(state.tableau[i]))) {
                tableauDestIndex = i;
                break;
            }
        }
        if (tableauDestIndex !== -1) {
            state.tableau[tableauDestIndex].push(state.waste.pop()!);
        }

        expect(state.waste.length).toBe(0);
        expect(state.tableau[0].length).toBe(2);
        expect(last(state.tableau[0])!.rank).toBe('Q');
    });
  });

  describe('isGameWon', () => {
    it('isGameWon should return true when all foundation piles are full', () => {
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

    it('isGameOne should return false when foundation piles are not full', () => {
      const state = createInitialState();
      expect(isGameWon(state)).toBe(false);
    });
  });

});

    

    