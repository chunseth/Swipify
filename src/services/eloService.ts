import { ref, set } from "firebase/database";
import { db } from "./firebase";
import { calculateElo } from "../utils/eloCalculator";

const updateElo = async (winnerId: string, loserId: string, userId: string) => {
  const winnerRef = ref(db, `users/${userId}/songs/${winnerId}`);
  const loserRef = ref(db, `users/${userId}/songs/${loserId}`);

  const winnerElo = 1000; // Fetch current Elo from Firebase
  const loserElo = 1000; // Fetch current Elo from Firebase

  const { newWinnerElo, newLoserElo } = calculateElo(winnerElo, loserElo);

  set(winnerRef, { elo: newWinnerElo });
  set(loserRef, { elo: newLoserElo });
};

export default updateElo;