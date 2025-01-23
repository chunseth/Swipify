// Compare.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, get, update, set } from "firebase/database";
import { db, auth } from "../services/firebase";
import SpotifyWebApi from "spotify-web-api-js";
import GroupCompletion from "../components/GroupCompletion";
import { generateMatchups } from "../utils/generateMatchups";
import { calculateElo } from "../utils/eloCalculator";
import { searchItunes } from "../utils/itunesSearch";
import { useNavigate } from "react-router-dom";

const spotifyApi = new SpotifyWebApi();

const Compare = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const [songs, setSongs] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[][]>([]);
  const navigate = useNavigate();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentGroup, setCurrentGroup] = useState<any[]>([]);
  const [currentPair, setCurrentPair] = useState<[any, any]>([null, null]);
  const [groupMatchups, setGroupMatchups] = useState<{ [groupIndex: number]: { [key: string]: boolean } }>({});
  const [finalists, setFinalists] = useState<any[]>([]);
  const [previews, setPreviews] = useState<{ song1: string | null; song2: string | null }>({
    song1: null,
    song2: null,
  });
  const [progress, setProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [showGroupCompletion, setShowGroupCompletion] = useState(false);

  // Fetch songs from Spotify and save to Firebase
  const fetchAndSaveSongs = async (playlistId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    // Check for existing songs first
    const playlistRef = ref(db, `users/${userId}/playlists/${playlistId}/songs`);
    const snapshot = await get(playlistRef);
    if (snapshot.exists()) {
      return Object.values(snapshot.val());
    }

    // If no existing songs, fetch from Spotify
    const accessToken = localStorage.getItem("spotifyAccessToken");
    if (!accessToken) {
      console.error("No Spotify access token found.");
      return [];
    }

    spotifyApi.setAccessToken(accessToken);
    try {
      const response = await spotifyApi.getPlaylistTracks(playlistId);
      const tracks = response.items
        .map((item) => {
          if ('artists' in item.track) {
            return {
              id: item.track.id,
              name: item.track.name,
              artist: item.track.artists[0].name,
              album: item.track.album.name,
              albumCover: item.track.album.images[0].url,
              previewUrl: item.track.preview_url,
              elo: 1000,
            };
          }
          return null;
        })
        .filter(Boolean);

      // Only save to Firebase if we didn't find existing songs
      await set(playlistRef, tracks);
      return tracks;
    } catch (error) {
      console.error("Error:", error);
      return [];
    }
  };

  useEffect(() => {
    const initializePlaylist = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId || !playlistId) return;

      // Check existing data in Firebase
      const playlistRef = ref(db, `users/${userId}/playlists/${playlistId}`);
      const snapshot = await get(playlistRef);
      
      if (snapshot.exists()) {
        const existingData = snapshot.val();
        const matchups = existingData.matchups || {};
        
        // Find the first group that has remaining matchups
        let nextGroupIndex = 0;
        for (let i = 0; i < Object.keys(matchups).length; i++) {
          const groupMatchups = matchups[i];
          const hasUncompletedMatchups = Object.values(groupMatchups).some(value => value === false);
          if (hasUncompletedMatchups) {
            nextGroupIndex = i;
            break;
          }
        }
        
        console.log("Found next group with remaining matchups:", nextGroupIndex);
        
        setSongs(Object.values(existingData.songs || {}));
        setGroups(existingData.groups || []);
        setGroupMatchups(matchups);
        setCurrentGroupIndex(nextGroupIndex);
        setCurrentGroup(existingData.groups?.[nextGroupIndex] || []);
        
        if (matchups[nextGroupIndex]) {
          const firstPair = await getNextPair(matchups, nextGroupIndex, existingData.groups[nextGroupIndex]);
          if (firstPair[0]) {
            setCurrentPair(firstPair as [any, any]);
            return;
          }
        }
      }

      // If no existing data, initialize new playlist
      const freshSongs = await fetchAndSaveSongs(playlistId);
      if (freshSongs.length < 2) return;

      const groups = [];
      for (let i = 0; i < freshSongs.length; i += 6) {
        groups.push(freshSongs.slice(i, i + 6));
      }
      
      const matchups = await generateMatchups(groups, userId, playlistId);
      
      // Get first pair using local variables instead of state
      const firstGroup = groups[0];
      const firstPair = await getNextPairFromGroup(matchups[0], firstGroup);
      
      setSongs(freshSongs);
      setGroups(groups);
      setCurrentGroup(groups[0]);
      setGroupMatchups(matchups);
      if (firstPair[0]) setCurrentPair(firstPair as [any, any]);
    };

    initializePlaylist();
  }, [playlistId]);

  useEffect(() => {
    if (groups.length > 0) {
      const loadOrGenerateMatchups = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId || !playlistId) return;

        const matchupsRef = ref(db, `users/${userId}/playlists/${playlistId}/matchups`);
        const snapshot = await get(matchupsRef);
        
        console.log("Loading matchups for group:", currentGroupIndex);
        console.log("Current Group:", currentGroup);
        console.log("Firebase Matchups:", snapshot.val());
        
        let currentMatchups;
        if (snapshot.exists()) {
          currentMatchups = snapshot.val();
        } else {
          currentMatchups = await generateMatchups(groups, userId, playlistId);
        }
        
        setGroupMatchups(currentMatchups);
        
        if (!showGroupCompletion) {
          const nextPair = await getNextPair(currentMatchups, currentGroupIndex, currentGroup);
          console.log("Next Pair:", nextPair);
          
          if (!nextPair[0]) {
            console.log("No next pair found - showing group completion");
            const updatedGroup = songs.filter(song => 
              currentGroup.some(groupSong => groupSong.id === song.id)
            );
            const topSongs = updatedGroup
              .sort((a, b) => b.elo - a.elo)
              .slice(0, 2);
            setFinalists(prev => [...prev, ...topSongs]);
            setShowGroupCompletion(true);
            setCurrentPair([null, null]);
          } else {
            setCurrentPair(nextPair as [any, any]);
            setPreviews({ song1: null, song2: null });
            setShowGroupCompletion(false);
          }
        }
      };

      loadOrGenerateMatchups();
    }
  }, [currentGroupIndex]);

  const getNextPair = async (
    matchups: { [groupIndex: number]: { [key: string]: boolean } }, 
    groupIndex: number,
    group: any[] = currentGroup // Use currentGroup as fallback
  ) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !playlistId) return [null, null];

    // Debug group parameter
    console.log("Group passed to getNextPair:", group);
    if (!group || group.length === 0) {
      console.error("Group is empty or undefined!");
      return [null, null];
    }

    // Get fresh matchups from Firebase
    const matchupsRef = ref(db, `users/${userId}/playlists/${playlistId}/matchups/${groupIndex}`);
    const snapshot = await get(matchupsRef);
    const currentMatchups = snapshot.exists() ? snapshot.val() : matchups[groupIndex];

    const remainingMatchups = Object.entries(currentMatchups)
      .filter(([_, compared]) => compared === false);

    console.log("Remaining matchups count:", remainingMatchups.length);

    if (remainingMatchups.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingMatchups.length);
      const [key] = remainingMatchups[randomIndex];
      const [songId1, songId2] = key.split("_");

      const song1 = group.find(song => song.id === songId1);
      const song2 = group.find(song => song.id === songId2);
      
      if (song1 && song2) {
        return [song1, song2];
      }
    }

    return [null, null];
  };

  const getNextPairFromGroup = async (
    groupMatchups: { [key: string]: boolean },
    group: any[]
  ) => {
    const remainingMatchups = Object.entries(groupMatchups)
      .filter(([_, compared]) => compared === false);

    if (remainingMatchups.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingMatchups.length);
      const [key] = remainingMatchups[randomIndex];
      const [songId1, songId2] = key.split("_");

      const song1 = group.find(song => song.id === songId1);
      const song2 = group.find(song => song.id === songId2);
      
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

      // Create updates object
      const updates: { [key: string]: any } = {};
      
      // Update songs with new Elo scores
      updates[`users/${userId}/playlists/${playlistId}/songs/${song1.id}/elo`] = 
        direction === "left" ? newWinnerElo : newLoserElo;
      updates[`users/${userId}/playlists/${playlistId}/songs/${song2.id}/elo`] = 
        direction === "left" ? newLoserElo : newWinnerElo;

      // Update matchup status
      const matchupKey = `${song1.id}_${song2.id}`;
      updates[`users/${userId}/playlists/${playlistId}/matchups/${currentGroupIndex}/${matchupKey}`] = true;

      try {
        // Wait for Firebase update to complete
        await update(ref(db), updates);

        // Update local state to reflect the changes
        setSongs(prevSongs => {
          // If it's an object, convert to array
          const songsArray = Array.isArray(prevSongs) 
            ? prevSongs 
            : Object.values(prevSongs || {});

          return songsArray.map(song => {
            if (song.id === song1.id) {
              return { ...song, elo: direction === "left" ? newWinnerElo : newLoserElo };
            }
            if (song.id === song2.id) {
              return { ...song, elo: direction === "left" ? newLoserElo : newWinnerElo };
            }
            return song;
          });
        });

        // Update matchups in local state
        setGroupMatchups(prev => ({
          ...prev,
          [currentGroupIndex]: {
            ...prev[currentGroupIndex],
            [matchupKey]: true
          }
        }));

        // Get and set next pair
        const nextPair = await getNextPair({
          ...groupMatchups,
          [currentGroupIndex]: {
            ...groupMatchups[currentGroupIndex],
            [matchupKey]: true
          }
        }, currentGroupIndex, currentGroup);

        if (!nextPair[0]) {
          console.log("No next pair - showing group completion");
          const updatedGroup = songs.filter(song => 
            currentGroup.some(groupSong => groupSong.id === song.id)
          );
          const topSongs = updatedGroup
            .sort((a, b) => b.elo - a.elo)
            .slice(0, 2);

          // Save top songs to Firebase finalists
          const finalistsRef = ref(db, `users/${userId}/playlists/${playlistId}/finalists`);
          const existingFinalistsSnapshot = await get(finalistsRef);
          const existingFinalists = existingFinalistsSnapshot.exists() 
            ? Object.values(existingFinalistsSnapshot.val()) 
            : [];
          
          await set(finalistsRef, [...existingFinalists, ...topSongs]);
          
          setFinalists(prev => [...prev, ...topSongs]);
          setShowGroupCompletion(true);
          setCurrentPair([null, null]);
        } else {
          setCurrentPair(nextPair as [any, any]);
          setPreviews({ song1: null, song2: null });
          setShowGroupCompletion(false);
        }
      } catch (error) {
        console.error("Error updating comparison:", error);
      }
    }
  };

  // Add this function to fetch iTunes preview
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

  // Add this useEffect to fetch previews when currentPair changes
  useEffect(() => {
    if (currentPair[0] && currentPair[1]) {
      // Try to fetch iTunes previews if Spotify previews aren't available
      if (!currentPair[0].previewUrl) {
        fetchItunesPreview(currentPair[0], 'song1');
      }
      if (!currentPair[1].previewUrl) {
        fetchItunesPreview(currentPair[1], 'song2');
      }
    }
  }, [currentPair]);

  // Add this useEffect to calculate progress whenever matchups change
  useEffect(() => {
    if (groupMatchups[currentGroupIndex]) {
      const currentGroupMatchups = groupMatchups[currentGroupIndex];
      const total = Object.keys(currentGroupMatchups).length;
      const completed = Object.values(currentGroupMatchups).filter(Boolean).length;
      setProgress({ completed, total });
    }
  }, [groupMatchups, currentGroupIndex]);

  if (songs.length < 2) {
    return <div>Not enough songs in this playlist to compare.</div>;
  }

  if (!currentPair[0] || !currentPair[1]) {
    console.log("Render check - no current pair");
    console.log("showGroupCompletion:", showGroupCompletion);
    console.log("currentGroup length:", currentGroup.length);
    console.log("currentGroupIndex:", currentGroupIndex);
    console.log("groups length:", groups.length);

    // Check if we should show group completion
    if (showGroupCompletion && currentGroupIndex < groups.length) {  // Added bounds check
      console.log("Showing group completion screen");
      const updatedGroup = songs.filter(song => 
        currentGroup.some(groupSong => groupSong.id === song.id)
      );
      const topSongs = updatedGroup
        .sort((a, b) => b.elo - a.elo)
        .slice(0, 2);

      return <GroupCompletion
        qualifiers={topSongs}
        allGroupSongs={updatedGroup.sort((a, b) => b.elo - a.elo)}
        onContinue={() => {
          console.log("Continue clicked");
          if (currentGroupIndex < groups.length - 1) {
            const nextGroupIndex = currentGroupIndex + 1;
            setCurrentGroupIndex(nextGroupIndex);
            setCurrentGroup(groups[nextGroupIndex]);
            setShowGroupCompletion(false);
            setCurrentPair([null, null]); // Reset current pair
          } else {
            // Start finals
            navigate(`/finals/${playlistId}`);
          }
        }}
        isLastGroup={currentGroupIndex === groups.length - 1}
      />;
    }
    
    // If we're at the end of all groups, show final rankings
    if (currentGroupIndex >= groups.length && finalists.length > 0) {
      return (
        <div>
          <h1>Final Rankings</h1>
          <ul>
            {finalists
              .sort((a, b) => b.elo - a.elo)
              .map((song, index) => (
                <li key={song.id}>
                  {index + 1}. {song.name} (Elo: {Math.round(song.elo)})
                </li>
              ))}
          </ul>
        </div>
      );
    }

    if (showGroupCompletion) {
      console.log("Should be showing group completion but reached fallback");
    }

    return <div>No more matchups to compare!</div>;
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 gap-4">
      {/* Progress indicator */}
      <div className="w-full max-w-md mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">Group {currentGroupIndex + 1}: </span>
          <span className="text-sm text-gray-600">{progress.completed} of {progress.total} comparisons</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* First Song */}
      <div onClick={() => handleSwipe("left")} className="cursor-pointer hover:opacity-75 transition-opacity">
        <img 
          src={currentPair[0].albumCover} 
          alt={currentPair[0].name}
          className="w-32 h-32 rounded-lg shadow-lg object-cover" 
          style={{ maxWidth: '16rem', maxHeight: '16rem' }} 
        />
      </div>
      {(currentPair[0].previewUrl || previews.song1) && (
        <audio 
          controls 
          src={currentPair[0].previewUrl || previews.song1 || ''} 
          className="w-32"
        />
      )}
      <h2 className="text-xl font-bold">{currentPair[0].name}</h2>
      <p className="text-gray-600">{currentPair[0].artist} - {currentPair[0].album}</p>

      {/* VS Divider */}
      <div className="text-2xl font-bold text-gray-400 my-2">VS</div>

      {/* Second Song */}
      <h2 className="text-xl font-bold">{currentPair[1].name}</h2>
      <p className="text-gray-600">{currentPair[1].artist} - {currentPair[1].album}</p>
      {(currentPair[1].previewUrl || previews.song2) && (
        <audio 
          controls 
          src={currentPair[1].previewUrl || previews.song2 || ''} 
          className="w-32"
        />
      )}
      <div onClick={() => handleSwipe("right")} className="cursor-pointer hover:opacity-75 transition-opacity">
        <img 
          src={currentPair[1].albumCover} 
          alt={currentPair[1].name}
          className="w-32 h-32 rounded-lg shadow-lg object-cover" 
          style={{ maxWidth: '16rem', maxHeight: '16rem' }} 
        />
      </div>
    </div>
  );
};

export default Compare;