export const calculateTier = (elo: number, mean: number, stdDev: number) => {
    const zScore = (elo - mean) / stdDev;
  
    if (zScore >= 1.75) return "S";
    if (zScore >= 0.5) return "A";
    if (zScore >= -0.5) return "B";
    if (zScore >= -1.75) return "C";
    return "D";
  };