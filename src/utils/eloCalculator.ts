export const calculateElo = (winnerElo: number, loserElo: number, K = 32) => {
    // Debug logs
    console.log('Initial ELOs:', { winnerElo, loserElo });
    
    const expectedWinner = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + 10 ** ((winnerElo - loserElo) / 400));
    
    console.log('Expected Scores:', { expectedWinner, expectedLoser });
    
    const newWinnerElo = winnerElo + K * (1 - expectedWinner);
    const newLoserElo = loserElo + K * (0 - expectedLoser);
    
    console.log('New ELOs:', { newWinnerElo, newLoserElo });
    
    // Round the values to avoid floating point issues
    return { 
        newWinnerElo: Math.round(newWinnerElo), 
        newLoserElo: Math.round(newLoserElo) 
    };
};