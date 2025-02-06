import { useEffect, useState, useRef } from "react";
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
  const [playlistName, setPlaylistName] = useState<string>("");
  const [progress, setProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [previews, setPreviews] = useState<{ song1: string | null; song2: string | null }>({
    song1: null,
    song2: null,
  });
  const navigate = useNavigate();

  // Add audioRef states
  const audioRef1 = useRef<HTMLAudioElement>(null);
  const audioRef2 = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const initializeFinals = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId || !playlistId) return;

      console.log("Initializing Finals...");

      // Get playlist name and finalists
      const playlistRef = ref(db, `users/${userId}/playlists/${playlistId}`);
      const playlistSnapshot = await get(playlistRef);
      if (playlistSnapshot.exists()) {
        const playlistData = playlistSnapshot.val();
        setPlaylistName(playlistData.name || "Finals");
        
        // Get finalists
        const finalistsRef = ref(db, `users/${userId}/playlists/${playlistId}/finalists`);
        const finalistsSnapshot = await get(finalistsRef);
        
        if (finalistsSnapshot.exists()) {
          const loadedFinalists = Object.values(finalistsSnapshot.val()) as Song[];
          console.log("Loaded finalists:", loadedFinalists);
          setFinalists(loadedFinalists);

          // Get existing matchups or generate new ones
          const finalMatchupsRef = ref(db, `users/${userId}/playlists/${playlistId}/finalMatchups`);
          const matchupsSnapshot = await get(finalMatchupsRef);
          
          let currentMatchups: { [key: string]: boolean };
          if (matchupsSnapshot.exists()) {
            // Resume from existing matchups
            currentMatchups = matchupsSnapshot.val();
            console.log("Loaded existing matchups:", currentMatchups);
          } else {
            // Generate new matchups
            currentMatchups = {};
            for (let i = 0; i < loadedFinalists.length; i++) {
              for (let j = i + 1; j < loadedFinalists.length; j++) {
                const matchupKey = createMatchupKey(loadedFinalists[i], loadedFinalists[j]);
                currentMatchups[matchupKey] = false;
              }
            }
            console.log("Generated new matchups:", currentMatchups);
            // Save new matchups to Firebase
            await set(finalMatchupsRef, currentMatchups);
          }
          
          setMatchups(currentMatchups);

          // Set initial progress
          const total = Object.keys(currentMatchups).length;
          const completed = Object.values(currentMatchups).filter(Boolean).length;
          setProgress({ completed, total });

          console.log("Getting next pair...");
          // Get next unfinished pair
          const nextPair = await getNextPair(currentMatchups, loadedFinalists);
          console.log("Next pair result:", nextPair);
          if (nextPair[0]) {
            setCurrentPair(nextPair as [Song, Song]);
          } else {
            console.log("No next pair found. Current matchups:", currentMatchups);
            console.log("Finalists:", loadedFinalists);
          }
        }
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
    console.log("Getting next pair from matchups:", {
      matchups: currentMatchups,
      songCount: songs.length,
      songIds: songs.map(s => s.id)
    });

    const remainingMatchups = Object.entries(currentMatchups).filter(([_, compared]) => {
      return !compared;
    });
    
    console.log("Remaining matchups:", remainingMatchups);

    if (remainingMatchups.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingMatchups.length);
      const [key] = remainingMatchups[randomIndex];
      const [songId1, songId2] = key.split("_");

      console.log("Selected matchup:", {
        key,
        songId1,
        songId2
      });

      const song1 = songs.find(song => song.id === songId1);
      const song2 = songs.find(song => song.id === songId2);
      
      if (song1 && song2) {
        return [song1, song2];
      } else {
        console.log("Failed to find songs for matchup:", {
          foundSong1: !!song1,
          foundSong2: !!song2,
          availableSongs: songs.map(s => ({ id: s.id, name: s.name }))
        });
      }
    }

    return [null, null];
  };

  const createMatchupKey = (song1: Song, song2: Song) => {
    // Always create the key with the smaller ID first to ensure consistency
    const [smallerId, largerId] = [song1.id, song2.id].sort();
    return `${smallerId}_${largerId}`;
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

      // Use consistent matchup key generation
      const matchupKey = createMatchupKey(song1, song2);
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
      <h1 className="text-2xl font-bold mb-4">{playlistName}</h1>
      
      {/* Progress indicator */}
      <div>
        <div>
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

      {/* Updated song comparison layout */}
      <div className="comparison-container">
        {/* Song 1 */}
        <div className="song-card song-card-first">
          <div onClick={() => handleSwipe("left")} className="album-cover">
            <img src={currentPair[0].albumCover} alt={currentPair[0].name} />
          </div>
          
          {(currentPair[0].previewUrl || previews.song1) && (
            <div className="audio-container">
              <audio 
                ref={audioRef1}
                controls
                playsInline
                preload="metadata"
                src={currentPair[0].previewUrl || previews.song1 || ''} 
                onPlay={() => {
                  if (audioRef2.current) {
                    audioRef2.current.pause();
                  }
                }}
              />
            </div>
          )}
          
          <div className="song-info">
            <h3 className="song-title">{currentPair[0].name}</h3>
            <p className="song-details">{currentPair[0].artist}</p>
          </div>
        </div>

        <div className="vs-divider">VS</div>

        {/* Song 2 */}
        <div className="song-card song-card-second">
          <div onClick={() => handleSwipe("right")} className="album-cover">
            <img src={currentPair[1].albumCover} alt={currentPair[1].name} />
          </div>
          
          {(currentPair[1].previewUrl || previews.song2) && (
            <div className="audio-container">
              <audio 
                ref={audioRef2}
                controls
                playsInline
                preload="metadata"
                src={currentPair[1].previewUrl || previews.song2 || ''} 
                onPlay={() => {
                  if (audioRef1.current) {
                    audioRef1.current.pause();
                  }
                }}
              />
            </div>
          )}
          
          <div className="song-info">
            <h3 className="song-title">{currentPair[1].name}</h3>
            <p className="song-details">{currentPair[1].artist}</p>
          </div>
        </div>
      </div>

      {/* Add matching styles */}
      <style>
        {`
          .comparison-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 3rem;
            padding: 2rem;
          }

          .song-card {
            flex: 1;
            max-width: 400px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }

          .vs-divider {
            font-size: 2rem;
            font-weight: bold;
            padding: 2rem;
            flex-shrink: 0;
            margin: 2rem 0;
          }

          @media (max-width: 768px) {
            .comparison-container {
              flex-direction: column;
            }

            .vs-divider {
              font-size: 1.5rem;
              padding: 0;
              margin: 0rem 0;
            }

            .song-card {
              width: 100%;
              max-width: none;
            }

            .song-card-first .album-cover {
              order: 0;
            }
            .song-card-first .audio-container {
              order: 1;
            }
            .song-card-first .song-info {
              order: 2;
            }

            .song-card-second .song-info {
              margin-top: 2rem;
              order: 0;
            }
            .song-card-second .audio-container {
              order: 1;
            }
            .song-card-second .album-cover {
              order: 2;
            }
          }

          .album-cover {
            cursor: pointer;
            transition: transform 0.2s;
            width: 100%;
            max-width: 300px;
          }

          .album-cover:hover {
            transform: scale(1.05);
          }

          .album-cover img {
            width: 100%;
            height: auto;
            border-radius: 8px;
          }

          .audio-container {
            width: 100%;
            max-width: 300px;
            margin: 0.5rem 0;
          }

          .audio-container audio {
            width: 100%;
          }

          .song-info {
            width: 100%;
            text-align: center;
            padding: 0.5rem;
          }

          .song-title {
            font-size: 1.1rem;
            font-weight: bold;
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .song-details {
            font-size: 0.9rem;
            margin: 0.25rem 0 0 0;
            color: #666;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}
      </style>
    </div>
  );
};

export default Finals; 