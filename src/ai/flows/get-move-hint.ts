'use server';
/**
 * @fileOverview A solitaire hint AI agent.
 *
 * - getMoveHint - A function that suggests the next best move.
 * - GetMoveHintInput - The input type for the getMoveHint function.
 * - GetMoveHintOutput - The return type for the getMoveHint function.
 */

import {ai} from '@/ai/genkit';
import { GameState } from '@/lib/solitaire';
import {z} from 'genkit';

const CardSchema = z.object({
  suit: z.enum(['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS']),
  rank: z.enum(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']),
  faceUp: z.boolean(),
});

const GameStateSchema = z.object({
  tableau: z.array(z.array(CardSchema)),
  foundation: z.array(z.array(CardSchema)),
  stock: z.array(CardSchema),
  waste: z.array(CardSchema),
  drawCount: z.union([z.literal(1), z.literal(3)]),
  score: z.number(),
  moves: z.number(),
});
export type GetMoveHintInput = z.infer<typeof GameStateSchema>;


const MoveLocationSchema = z.object({
    type: z.enum(['tableau', 'foundation', 'waste', 'stock', 'draw', 'reveal']),
    pileIndex: z.number().optional().describe('The index of the pile in the tableau or foundation.'),
    cardIndex: z.number().optional().describe('The index of the card within the pile.'),
});

const GetMoveHintOutputSchema = z.object({
  from: MoveLocationSchema.optional().describe('The source location of the card to move.'),
  to: MoveLocationSchema.optional().describe('The destination location for the card.'),
  reason: z.string().describe('An explanation for why this is the best move.'),
});

export type GetMoveHintOutput = z.infer<typeof GetMoveHintOutputSchema>;

export async function getMoveHint(input: GetMoveHintInput): Promise<GetMoveHintOutput> {
  return getMoveHintFlow(input);
}

const prompt = ai.definePrompt({
  name: 'solitaireHintPrompt',
  input: {schema: GameStateSchema},
  output: {schema: GetMoveHintOutputSchema},
  prompt: `
    You are a Klondike Solitaire expert. Your goal is to suggest the next best move to the user.
    Analyze the provided game state and determine the most strategic move.

    Game State:
    - Tableau: {{jsonStringify tableau}}
    - Foundation: {{jsonStringify foundation}}
    - Stock: {{jsonStringify stock}}
    - Waste: {{jsonStringify waste}}
    - Draw Count: {{drawCount}}

    Move priorities:
    1.  Free up cards from the tableau by moving them to the foundation. This is the highest priority.
    2.  Expose hidden cards in the tableau piles. Prefer moves that empty a tableau pile to place a King.
    3.  Move cards from the waste pile to the tableau to bring more cards into play.
    4.  If no other moves are possible, draw from the stock pile.
    5.  If the stock is empty, recycle the waste pile.
    
    Based on these priorities, determine the best move. Specify the 'from' and 'to' locations for the card.
    If the best move is to draw from the stock, set 'from.type' to 'draw'.
    If the best move is to flip a face-down card on the tableau, set 'from.type' to 'reveal' and provide the pileIndex.

    Provide a brief 'reason' for your suggestion. If no moves are possible, return an empty object.
  `,
});

const getMoveHintFlow = ai.defineFlow(
  {
    name: 'getMoveHintFlow',
    inputSchema: GameStateSchema,
    outputSchema: GetMoveHintOutputSchema,
  },
  async (gameState) => {
    const { output } = await prompt(gameState);
    return output || {};
  }
);
