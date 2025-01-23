import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, get, update, set } from "firebase/database";
import { db, auth } from "../services/firebase";
import { calculateElo } from "../utils/eloCalculator";
import { searchItunes } from "../utils/itunesSearch";
import { useNavigate } from "react-router-dom";

interface Song {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumCover: string;
  elo: number;
  previewUrl?: string;
}

const Finals = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const [finalists, setFinalists] = useState<Song[]>([]);
  const [currentPair, setCurrentPair] = useState<[Song | null, Song | null]>([null, null]);
  const [matchups, setMatchups] = useState<{ [key: string]: boolean }>({});
  const [progress, setProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [previews, setPreviews] = useState<{ song1: string | null; song2: string | null }>({
    song1: null,
    song2: null,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const initializeFinals = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId || !playlistId) return;

      // Get finalists
      const finalistsRef = ref(db, `users/${userId}/playlists/${playlistId}/finalists`);
      const snapshot = await get(finalistsRef);
      
      if (snapshot.exists()) {
        const loadedFinalists = Object.values(snapshot.val()) as Song[];
        setFinalists(loadedFinalists);

        // Generate and save matchups
        const newMatchups: { [key: string]: boolean } = {};
        for (let i = 0; i < loadedFinalists.length; i++) {
          for (let j = i + 1; j < loadedFinalists.length; j++) {
            const key = `${loadedFinalists[i].id}_${loadedFinalists[j].id}`;
            newMatchups[key] = false;
          }
        }

        // Save matchups to Firebase
        const matchupsRef = ref(db, `users/${userId}/playlists/${playlistId}/finalMatchups`);
        await set(matchupsRef, newMatchups);
        setMatchups(newMatchups);

        // Get first pair
        const firstPair = await getNextPair(newMatchups, loadedFinalists);
        if (firstPair[0]) {
          setCurrentPair(firstPair as [Song, Song]);
        }

        // Set initial progress
        const total = Object.keys(newMatchups).length;
        setProgress({ completed: 0, total });
      }
    };

    initializeFinals();
  }, [playlistId]);

  useEffect(() => {
    if (currentPair[0] && currentPair[1]) {
      if (!currentPair[0].previewUrl) {
        fetchItunesPreview(currentPair[0], 'song1');
      }
      if (!currentPair[1].previewUrl) {
        fetchItunesPreview(currentPair[1], 'song2');
      }
    }
  }, [currentPair]);

  const getNextPair = async (currentMatchups: { [key: string]: boolean }, songs: Song[]) => {
    const remainingMatchups = Object.entries(currentMatchups).filter(([_, compared]) => !compared);
    
    if (remainingMatchups.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingMatchups.length);
      const [key] = remainingMatchups[randomIndex];
      const [songId1, songId2] = key.split("_");

      const song1 = songs.find(song => song.id === songId1);
      const song2 = songs.find(song => song.id === songId2);
      
      if (song1 && song2) {
        return [song1, song2];
      }
    }

    return [null, null];
  };

  const handleSwipe = async (direction: "left" | "right") => {
    const [song1, song2] = currentPair;
    const userId = auth.currentUser?.uid;
    
    if (userId && playlistId && song1 && song2) {
      const song1Elo = song1.elo || 1000;
      const song2Elo = song2.elo || 1000;

      const { newWinnerElo, newLoserElo } = calculateElo(
        direction === "left" ? song1Elo : song2Elo,
        direction === "left" ? song2Elo : song1Elo
      );

      // Update Elo scores in finalists array
      const updatedFinalists = finalists.map(song => {
        if (song.id === song1.id) {
          return { ...song, elo: direction === "left" ? newWinnerElo : newLoserElo };
        }
        if (song.id === song2.id) {
          return { ...song, elo: direction === "left" ? newLoserElo : newWinnerElo };
        }
        return song;
      });

      // Update matchup status
      const matchupKey = `${song1.id}_${song2.id}`;
      const updatedMatchups = {
        ...matchups,
        [matchupKey]: true
      };

      // Update Firebase
      const updates: { [key: string]: any } = {};
      updates[`users/${userId}/playlists/${playlistId}/finalists`] = updatedFinalists;
      updates[`users/${userId}/playlists/${playlistId}/finalMatchups`] = updatedMatchups;

      try {
        await update(ref(db), updates);
        setFinalists(updatedFinalists);
        setMatchups(updatedMatchups);

        // Update progress
        const completed = Object.values(updatedMatchups).filter(Boolean).length;
        setProgress({ completed, total: progress.total });

        // Get next pair
        const nextPair = await getNextPair(updatedMatchups, updatedFinalists);
        if (!nextPair[0]) {
          // Competition is complete
          navigate(`/results/${playlistId}`);
        } else {
          setCurrentPair(nextPair as [Song, Song]);
        }
      } catch (error) {
        console.error("Error updating finals:", error);
      }
    }
  };

  const fetchItunesPreview = async (song: any, side: 'song1' | 'song2') => {
    try {
      const query = `${song.name} ${song.artist}`;
      const itunesResult = await searchItunes(query);
      if (itunesResult?.previewUrl) {
        setPreviews(prev => ({
          ...prev,
          [side]: itunesResult.previewUrl
        }));
      }
    } catch (error) {
      console.error('Failed to fetch iTunes preview:', error);
    }
  };

  if (!currentPair[0] || !currentPair[1]) {
    return <div>Loading finals...</div>;
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 gap-4">
      {/* Hidden audio elements */}
      <audio id="song1-preview" src={previews.song1 || ''} />
      <audio id="song2-preview" src={previews.song2 || ''} />

      {/* Progress indicator */}
      <div className="w-full max-w-md mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">Finals Progress: </span>
          <span className="text-sm text-gray-600">{progress.completed} of {progress.total} comparisons</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Song comparison */}
      <div className="flex gap-8 items-center justify-center">
        <div onClick={() => handleSwipe("left")} className="cursor-pointer hover:opacity-75 transition-opacity">
          <img 
            src={currentPair[0].albumCover} 
            alt={currentPair[0].name}
            className="w-32 h-32 rounded-lg shadow-lg object-cover" 
            style={{ maxWidth: '16rem', maxHeight: '16rem' }} 
          />
          <p className="mt-2 text-center">{currentPair[0].name}</p>
          <p className="text-sm text-gray-600 text-center">{currentPair[0].artist}</p>
        </div>
        <div className="text-xl font-bold">VS</div>
        <div onClick={() => handleSwipe("right")} className="cursor-pointer hover:opacity-75 transition-opacity">
          <img 
            src={currentPair[1].albumCover} 
            alt={currentPair[1].name}
            className="w-32 h-32 rounded-lg shadow-lg object-cover" 
            style={{ maxWidth: '16rem', maxHeight: '16rem' }} 
          />
          <p className="mt-2 text-center">{currentPair[1].name}</p>
          <p className="text-sm text-gray-600 text-center">{currentPair[1].artist}</p>
        </div>
      </div>
    </div>
  );
};

export default Finals; 