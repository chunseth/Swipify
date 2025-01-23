// Compare.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, get, update, set } from "firebase/database";
import { db, auth } from "../services/firebase";
import SpotifyWebApi from "spotify-web-api-js";
import GroupCompletion from "../components/GroupCompletion";
import { generateMatchups } from "../utils/generateMatchups";
import { groupSongs } from "../utils/groupSongs";
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
    const accessToken = localStorage.getItem("spotifyAccessToken");
    if (!accessToken) {
      console.error("No Spotify access token found.");
      return [];
    }

    spotifyApi.setAccessToken(accessToken);
    try {
      const response = await spotifyApi.getPlaylistTracks(playlistId);
      console.log("Spotify API Response:", response);
      const tracks = response.items.map((item) => {
        if ('artists' in item.track) {  // Type guard for music tracks
          return {
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists[0].name,
            album: item.track.album.name,
            albumCover: item.track.album.images[0].url,
            previewUrl: item.track.preview_url,
            elo: 1000, // Initialize Elo score
          };
        }
        return null;
      }).filter(Boolean);  // Remove any null values

      console.log("Fetched Tracks:", tracks);

      // Save songs to Firebase
      const userId = auth.currentUser?.uid;
      if (userId) {
        const playlistRef = ref(db, `users/${userId}/playlists/${playlistId}/songs`);
        await set(playlistRef, tracks);
        console.log("Songs saved to Firebase.");
        setSongs(tracks); // Update local state
      }
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

      // Reset state
      setSongs([]);
      setGroups([]);
      setCurrentGroupIndex(0);
      setCurrentGroup([]);
      setCurrentPair([null, null]);
      setGroupMatchups({});
      setFinalists([]);
      setPreviews({ song1: null, song2: null });

      const playlistRef = ref(db, `users/${userId}/playlists/${playlistId}`);
      const snapshot = await get(playlistRef);

      if (snapshot.exists() && snapshot.val().songs && snapshot.val().groups && snapshot.val().matchups) {
        // Everything exists, load from Firebase
        const songs = Object.values(snapshot.val().songs);
        const groups = snapshot.val().groups;
        const matchups = snapshot.val().matchups;
        setSongs(songs);
        setGroups(groups);
        setCurrentGroup(groups[0]); // Set initial group
        setGroupMatchups(matchups);
      } else {
        // First time initialization
        const songs = await fetchAndSaveSongs(playlistId);
        const groups = groupSongs(songs);
        const matchups = await generateMatchups(groups, userId, playlistId);
        
        // Save everything to Firebase in one update
        const updates = {
          [`users/${userId}/playlists/${playlistId}/songs`]: songs,
          [`users/${userId}/playlists/${playlistId}/groups`]: groups,
          [`users/${userId}/playlists/${playlistId}/matchups`]: matchups
        };
        await update(ref(db), updates);
        
        setSongs(songs);
        setGroups(groups);
        setCurrentGroup(groups[0]); // Set initial group
        setGroupMatchups(matchups);
      }
    };

    initializePlaylist();
  }, [playlistId]);

  useEffect(() => {
    if (songs.length > 0) {
      const groups = groupSongs(songs);
      setGroups(groups);
      setCurrentGroupIndex(0);
    }
  }, [songs]);

  useEffect(() => {
    if (groups.length > 0) {
      const loadOrGenerateMatchups = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId || !playlistId) return;

        const matchupsRef = ref(db, `users/${userId}/playlists/${playlistId}/matchups`);
        const snapshot = await get(matchupsRef);
        
        console.log("Current Group Index:", currentGroupIndex);
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
          const nextPair = await getNextPair(currentMatchups);
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
            setShowGroupCompletion(false);
          }
        }
      };

      loadOrGenerateMatchups();
    }
  }, [groups, currentGroupIndex, currentGroup]);

  const getNextPair = async (matchups: { [groupIndex: number]: { [key: string]: boolean } }) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !playlistId) return [null, null];

    const currentMatchups = matchups[currentGroupIndex];
    if (!currentMatchups) return [null, null];

    const remainingMatchups = Object.entries(currentMatchups).filter(([_, compared]) => !compared);
    console.log("Remaining Matchups for group", currentGroupIndex, ":", remainingMatchups);

    if (remainingMatchups.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingMatchups.length);
      const [key] = remainingMatchups[randomIndex];
      const [songId1, songId2] = key.split("_");

      const songsRef = ref(db, `users/${userId}/playlists/${playlistId}/songs`);
      const snapshot = await get(songsRef);
      
      if (snapshot.exists()) {
        const allSongs = Object.values(snapshot.val());
        const song1 = allSongs.find((song: any) => song.id === songId1);
        const song2 = allSongs.find((song: any) => song.id === songId2);
        
        console.log("Found Songs for group", currentGroupIndex, ":", song1, song2);
        if (song1 && song2) {
          return [song1, song2];
        }
      }
    }

    // If we get here, the current group is complete
    if (currentGroupIndex < groups.length - 1) {
      // Move to next group
      setCurrentGroupIndex(prev => prev + 1);
      setCurrentGroup(groups[currentGroupIndex + 1]);
      
      // Check for matchups in the next group
      const nextGroupMatchups = matchups[currentGroupIndex + 1];
      if (nextGroupMatchups) {
        const nextGroupRemaining = Object.entries(nextGroupMatchups).filter(([_, compared]) => !compared);
        if (nextGroupRemaining.length > 0) {
          // Recursively get next pair from new group
          return getNextPair(matchups);
        }
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
        setSongs(prevSongs => 
          prevSongs.map(song => {
            if (song.id === song1.id) {
              return { ...song, elo: direction === "left" ? newWinnerElo : newLoserElo };
            }
            if (song.id === song2.id) {
              return { ...song, elo: direction === "left" ? newLoserElo : newWinnerElo };
            }
            return song;
          })
        );

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
        });

        if (!nextPair[0]) {
          console.log("No next pair after swipe - showing group completion");
          const updatedGroup = songs.filter(song => 
            currentGroup.some(groupSong => groupSong.id === song.id)
          );
          const topSongs = updatedGroup
            .sort((a, b) => b.elo - a.elo)
            .slice(0, 2);
          setFinalists(prev => [...prev, ...topSongs]);
          setShowGroupCompletion(true);
          setCurrentPair([null, null]); // Reset current pair
        } else {
          setCurrentPair(nextPair as [any, any]);
          setPreviews({ song1: null, song2: null });
          setShowGroupCompletion(false); // Reset group completion state for next group
        }
      } catch (error) {
        console.error("Error updating comparison:", error);
        // Optionally add error handling UI feedback here
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
    if (showGroupCompletion) {
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
            setCurrentGroupIndex(prev => prev + 1);
            setCurrentGroup(groups[currentGroupIndex + 1]);
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
    if (currentGroupIndex === groups.length && finalists.length > 0) {
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