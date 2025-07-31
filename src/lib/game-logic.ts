


export const calculateScore = (moves: number, time: number) => {
    if (time === 0) return 0;
    const timePenalty = Math.floor(time / 10) * 2;
    const movePenalty = moves * 5;
    const score = 10000 - timePenalty - movePenalty;
    return Math.max(0, score);
  };

    