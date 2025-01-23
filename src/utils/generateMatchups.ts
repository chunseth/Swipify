import { ref, set } from "firebase/database";
import { db } from "../services/firebase";

export const generateMatchups = async (groups: any[][], userId: string, playlistId: string) => {
  const matchups: { [groupIndex: number]: { [key: string]: boolean } } = {};
  
  // Generate matchups for each group separately
  groups.forEach((group, groupIndex) => {
    matchups[groupIndex] = {};
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const key = `${group[i].id}_${group[j].id}`;
        matchups[groupIndex][key] = false;
      }
    }
  });

  // Save matchups to Firebase
  const matchupsRef = ref(db, `users/${userId}/playlists/${playlistId}/matchups`);
  await set(matchupsRef, matchups);
  
  return matchups;
};