"use server";

import { getMoveHint, GetMoveHintInput, GetMoveHintOutput } from "@/ai/flows/get-move-hint";

export async function getHintAction(input: GetMoveHintInput): Promise<GetMoveHintOutput> {
  try {
    const result = await getMoveHint(input);
    return result;
  } catch (error) {
    console.error("Error in getHintAction:", error);
    return { hint: "Sorry, I couldn't come up with a hint right now." };
  }
}
