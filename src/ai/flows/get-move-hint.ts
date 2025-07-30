'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing move hints in a solitaire game.
 *
 * The flow takes the current game state as input and returns a hint for the next best move.
 * - getMoveHint - A function that takes the game state and returns a move hint.
 * - GetMoveHintInput - The input type for the getMoveHint function.
 * - GetMoveHintOutput - The output type for the getMoveHint function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetMoveHintInputSchema = z.object({
  gameState: z
    .string()
    .describe('The current state of the solitaire game as a string.'),
  gameType: z.enum(['Klondike', 'Freecell', 'Spider', 'Pyramid']).describe('The type of solitaire game being played.'),
  drawType: z.enum(['DrawOne', 'DrawThree']).describe('The draw type of the Klondike solitaire game being played. Only relevant to Klondike.'),
});
export type GetMoveHintInput = z.infer<typeof GetMoveHintInputSchema>;

const GetMoveHintOutputSchema = z.object({
  hint: z
    .string()
    .describe(
      'A description of the suggested move, or a message indicating no moves are available.'
    ),
});
export type GetMoveHintOutput = z.infer<typeof GetMoveHintOutputSchema>;

export async function getMoveHint(input: GetMoveHintInput): Promise<GetMoveHintOutput> {
  return getMoveHintFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getMoveHintPrompt',
  input: {schema: GetMoveHintInputSchema},
  output: {schema: GetMoveHintOutputSchema},
  prompt: `You are an expert Solitaire player providing hints to users for a specific game type.

  Analyze the current game state and provide a single, clear hint for the next best move.
  Specify the game type in the hint.
  If there are no moves available, indicate that there are no moves possible.

  For Klondike games, consider the draw type (DrawOne or DrawThree) when providing hints.

  Game Type: {{gameType}}
  Draw Type: {{drawType}}
  Current Game State:
  {{gameState}}`,
});

const getMoveHintFlow = ai.defineFlow(
  {
    name: 'getMoveHintFlow',
    inputSchema: GetMoveHintInputSchema,
    outputSchema: GetMoveHintOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
