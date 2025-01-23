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

interface Song {
    id: string;
    name: string;
    artist: string;
    album: string;
    albumCover: string;
    previewUrl: string | null;
    elo: number;
}

const Compare = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const [songs, setSongs] = useState<Song[]>([]);
  const [groups, setGroups] = useState<Song[][]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentGroup, setCurrentGroup] = useState<Song[]>([]);
  const [currentPair, setCurrentPair] = useState<[Song | null, Song | null]>([null, null]);
  const [groupMatchups, setGroupMatchups] = useState<{ [groupIndex: number]: { [key: string]: boolean } }>({});
  const [finalists, setFinalists] = useState<Song[]>([]);
  const [previews, setPreviews] = useState<{ song1: string | null; song2: string | null }>({
    song1: null,
    song2: null,
  });
  const [progress, setProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [showGroupCompletion, setShowGroupCompletion] = useState(false);

  const fetchAndSaveSongs = async (playlistId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const playlistRef = ref(db, `users/${userId}/playlists/${playlistId}/songs`);
    const snapshot = await get(playlistRef);
    const existingSongs = snapshot.exists() ? snapshot.val() : {};

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
                    const existingSong = existingSongs[item.track.id];
                    return {
                        id: item.track.id,
                        name: item.track.name,
                        artist: item.track.artists[0].name,
                        album: item.track.album.name,
                        albumCover: item.track.album.images[0].url,
                        previewUrl: item.track.preview_url,
                        elo: existingSong ? existingSong.elo : 1000,
                    };
                }
                return null;
            })
            .filter(Boolean) as Song[];

        const updates: { [key: string]: Song } = {};
        tracks.forEach((track: Song) => {
            updates[track.id] = track;
        });
        await set(playlistRef, updates);
        
        return tracks;
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
  };

  const getNextPair = async (
    matchups: { [groupIndex: number]: { [key: string]: boolean } }, 
    groupIndex: number,
    group: Song[] = currentGroup
  ) => {
    if (!group || group.length === 0) {
        console.error("Group is empty or undefined!");
        return [null, null];
    }

    const currentMatchups = matchups[groupIndex] || {};
    return getNextPairFromGroup(currentMatchups, group);
  };

  const getNextPairFromGroup = async (
    groupMatchups: { [key: string]: boolean },
    group: Song[]
  ) => {
    const remainingMatchups = Object.entries(groupMatchups)
        .filter(([_, compared]) => compared === false);
    
    console.log("Remaining matchups:", {
        total: Object.keys(groupMatchups).length,
        remaining: remainingMatchups.length,
        completed: Object.values(groupMatchups).filter(Boolean).length
    });

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
        const { newWinnerElo, newLoserElo } = calculateElo(
            direction === "left" ? song1.elo : song2.elo,
            direction === "left" ? song2.elo : song1.elo
        );

        const updatedGroup = currentGroup.map(song => {
            if (song.id === song1.id) {
                return { ...song, elo: direction === "left" ? newWinnerElo : newLoserElo };
            }
            if (song.id === song2.id) {
                return { ...song, elo: direction === "left" ? newLoserElo : newWinnerElo };
            }
            return song;
        });

        console.log(song1.name, " elo: ", song1.elo, song2.name, " elo: ", song2.elo);
        
        const updates: { [key: string]: any } = {};
        updates[`users/${userId}/playlists/${playlistId}/songs/${song1.id}/elo`] = 
            direction === "left" ? newWinnerElo : newLoserElo;
        updates[`users/${userId}/playlists/${playlistId}/songs/${song2.id}/elo`] = 
            direction === "left" ? newLoserElo : newWinnerElo;
        updates[`users/${userId}/playlists/${playlistId}/matchups/${currentGroupIndex}/${song1.id}_${song2.id}`] = true;

        try {
            await update(ref(db), updates);
            setCurrentGroup(updatedGroup);
            
            setGroupMatchups(prev => ({
                ...prev,
                [currentGroupIndex]: {
                    ...prev[currentGroupIndex],
                    [`${song1.id}_${song2.id}`]: true
                }
            }));
            
            setProgress(prev => ({
                ...prev,
                completed: prev.completed + 1
            }));
            
            const nextPair = await getNextPairFromGroup(
                {
                    ...groupMatchups[currentGroupIndex],
                    [`${song1.id}_${song2.id}`]: true
                },
                updatedGroup
            );

            if (nextPair[0]) {
                setCurrentPair(nextPair as [Song, Song]);
            } else {
                // Current group is complete, show completion screen
                const topSongs = updatedGroup
                    .sort((a, b) => b.elo - a.elo)
                    .slice(0, 2);
                setFinalists(prev => [...prev, ...topSongs]);
                setShowGroupCompletion(true);
                setCurrentPair([null, null]);
            }
        } catch (error) {
            console.error("Error updating comparison:", error);
        }
    }
  };

  const fetchItunesPreview = async (song: Song, side: 'song1' | 'song2') => {
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

  useEffect(() => {
    if (groupMatchups[currentGroupIndex]) {
      const currentGroupMatchups = groupMatchups[currentGroupIndex];
      const total = Object.keys(currentGroupMatchups).length;
      const completed = Object.values(currentGroupMatchups).filter(Boolean).length;
      setProgress({ completed, total });
    }
  }, [groupMatchups, currentGroupIndex]);

  useEffect(() => {
    const initializePlaylist = async () => {
        if (!playlistId) return;
        const songs = await fetchAndSaveSongs(playlistId);
        const groups = [];
        for (let i = 0; i < songs.length; i += 6) {
            groups.push(songs.slice(i, i + 6));
        }
        const matchups = await generateMatchups(groups, auth.currentUser?.uid || '', playlistId);
        setSongs(songs);
        setGroups(groups);
        setCurrentGroup(groups[0]);
        setGroupMatchups(matchups);
        
        // Get first pair
        const firstPair = await getNextPair(matchups, 0, groups[0]);
        if (firstPair[0]) setCurrentPair(firstPair as [Song, Song]);
        
        setLoading(false);
    };

    initializePlaylist();
  }, [playlistId]);

  if (loading) {
    return <div>Loading playlist data...</div>;
  }

  if (!songs || songs.length < 2) {
    return <div>Not enough songs in this playlist to compare.</div>;
  }

  if (!currentPair[0] || !currentPair[1]) {
    if (showGroupCompletion && currentGroupIndex < groups.length) {
        const updatedGroup = songs.filter(song => 
            currentGroup.some(groupSong => groupSong.id === song.id)
        );
        const topSongs = updatedGroup
            .sort((a, b) => b.elo - a.elo)
            .slice(0, 2);

        return <GroupCompletion
            qualifiers={topSongs}
            allGroupSongs={updatedGroup.sort((a, b) => b.elo - a.elo)}
            onContinue={async () => {
                if (currentGroupIndex < groups.length - 1) {
                    const nextGroupIndex = currentGroupIndex + 1;
                    setCurrentGroupIndex(nextGroupIndex);
                    setCurrentGroup(groups[nextGroupIndex]);
                    setShowGroupCompletion(false);
                    
                    // Get the first pair for the next group
                    const nextGroupPair = await getNextPair(groupMatchups, nextGroupIndex, groups[nextGroupIndex]);
                    if (nextGroupPair[0]) {
                        setCurrentPair(nextGroupPair as [Song, Song]);
                    }
                } else {
                    // Save finalists to Firebase before navigating
                    const userId = auth.currentUser?.uid;
                    if (userId && playlistId) {
                        const finalistsRef = ref(db, `users/${userId}/playlists/${playlistId}/finalists`);
                        await set(finalistsRef, finalists);
                    }
                    navigate(`/finals/${playlistId}`);
                }
            }}
            isLastGroup={currentGroupIndex === groups.length - 1}
        />;
    }
    
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

    return <div>No more matchups to compare!</div>;
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 gap-4">
      <div className="w-full max-w-md mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">Group {currentGroupIndex + 1}: </span>
          <span className="text-sm text-gray-600">{progress.completed + 1} of {progress.total} comparisons</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
          ></div>
        </div>
      </div>

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

      <div className="text-2xl font-bold text-gray-400 my-2">VS</div>

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