export const calculateElo = (winnerElo: number, loserElo: number, K = 32) => {
    const expectedWinner = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + 10 ** ((winnerElo - loserElo) / 400));
  
    const newWinnerElo = winnerElo + K * (1 - expectedWinner);
    const newLoserElo = loserElo + K * (0 - expectedLoser);
  
    return { newWinnerElo, newLoserElo };
  };