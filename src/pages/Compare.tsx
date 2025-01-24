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
import { Howl } from 'howler';

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
  const [sounds, setSounds] = useState<{ [key: string]: Howl }>({});
  const [isPlaying, setIsPlaying] = useState<{ song1: boolean; song2: boolean }>({ song1: false, song2: false });
  const [showDebug, setShowDebug] = useState(false);
  const [itunesDebug, setItunesDebug] = useState<{
    query?: string,
    error?: string,
    response?: any,
    url?: string,
    status?: number
  }>({});

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

  const handleAudioPlay = (src: string, songNumber: 'song1' | 'song2') => {
    // Stop other sound if playing
    const otherSong = songNumber === 'song1' ? 'song2' : 'song1';
    if (sounds[otherSong]) {
      sounds[otherSong].stop();
      setIsPlaying(prev => ({ ...prev, [otherSong]: false }));
    }

    // Create or play sound
    if (!sounds[songNumber]) {
      const sound = new Howl({
        src: [src],
        html5: true,
        onend: () => setIsPlaying(prev => ({ ...prev, [songNumber]: false })),
      });
      setSounds(prev => ({ ...prev, [songNumber]: sound }));
      sound.play();
      setIsPlaying(prev => ({ ...prev, [songNumber]: true }));
    } else {
      if (sounds[songNumber].playing()) {
        sounds[songNumber].pause();
        setIsPlaying(prev => ({ ...prev, [songNumber]: false }));
      } else {
        sounds[songNumber].play();
        setIsPlaying(prev => ({ ...prev, [songNumber]: true }));
      }
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
      setItunesDebug(prev => ({ ...prev, query }));
      const itunesResult = await searchItunes(query);
      setItunesDebug(prev => ({ 
        ...prev, 
        response: itunesResult,
        url: itunesResult.debug?.url,
        status: itunesResult.debug?.status
      }));
      if (itunesResult?.previewUrl) {
        setPreviews(prev => ({
          ...prev,
          [side]: itunesResult.previewUrl
        }));
      }
    } catch (error: any) {
      setItunesDebug(prev => ({ 
        ...prev, 
        error: error?.message || 'Unknown error',
        url: error?.debug?.url
      }));
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

  useEffect(() => {
    return () => {
      Object.values(sounds).forEach(sound => sound.unload());
    };
  }, [sounds]);

  if (loading) {
    return <div>Loading playlist data...</div>;
  }

  if (!songs || songs.length < 2) {
    return <div>Not enough songs in this playlist to compare.</div>;
  }

  if (!currentPair[0] || !currentPair[1]) {
    if (showGroupCompletion && currentGroupIndex < groups.length) {
        return <GroupCompletion
            qualifiers={currentGroup
                .sort((a, b) => b.elo - a.elo)
                .slice(0, 2)}
            allGroupSongs={currentGroup.sort((a, b) => b.elo - a.elo)}
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
    <div className="dashboard-container">
      <div className="compare-content">
        <div className="progress-bar">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Group {currentGroupIndex + 1}: </span>
            <span className="text-sm text-gray-600">{progress.completed + 1} of {progress.total} comparisons</span>
          </div>
          <div className="progress-track">
            <div 
              className="progress-fill"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="comparison-container">
          {/* Song 1 */}
          <div className="song-card">
            <div onClick={() => handleSwipe("left")} className="album-cover">
              <img 
                src={currentPair[0].albumCover} 
                alt={currentPair[0].name}
                style={{ maxWidth: '20rem', maxHeight: '20rem' }} 
              />
            </div>
            
            {(currentPair[0].previewUrl || previews.song1) && (
              <div className="audio-container">
                <button 
                  onClick={() => handleAudioPlay(currentPair[0]?.previewUrl || previews.song1 || '', 'song1')}
                  className="play-button"
                >
                  {isPlaying.song1 ? '⏸' : '▶️'}
                </button>
                <audio 
                  id="audio-song1"
                  playsInline
                  preload="metadata"
                  data-song="song1"
                  src={currentPair[0].previewUrl || previews.song1 || ''} 
                  style={{ display: 'none' }}
                />
              </div>
            )}
            <h3>{currentPair[0].name}</h3>
            <p>{currentPair[0].artist} - {currentPair[0].album}</p>
          </div>

          <div className="vs-divider">VS</div>

          {/* Song 2 */}
          <div className="song-card">
            <h3>{currentPair[1].name}</h3>
            <p>{currentPair[1].artist} - {currentPair[1].album}</p>
            {(currentPair[1].previewUrl || previews.song2) && (
              <div className="audio-container">
                <button 
                  onClick={() => handleAudioPlay(currentPair[1]?.previewUrl || previews.song2 || '', 'song2')}
                  className="play-button"
                >
                  {isPlaying.song2 ? '⏸' : '▶️'}
                </button>
                <audio 
                  id="audio-song2"
                  playsInline
                  preload="metadata"
                  data-song="song2"
                  src={currentPair[1].previewUrl || previews.song2 || ''} 
                  style={{ display: 'none' }}
                />
              </div>
            )}
            
            <div onClick={() => handleSwipe("right")} className="album-cover">
              <img 
                src={currentPair[1].albumCover} 
                alt={currentPair[1].name}
                style={{ maxWidth: '20rem', maxHeight: '20rem' }} 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="debug-panel">
        <button 
          onClick={() => setShowDebug(!showDebug)} 
          style={{ 
            position: 'fixed', 
            bottom: '10px', 
            left: '64px',  // Match navbar width
            background: '#1DB954',
            padding: '8px',
            borderRadius: '4px',
            zIndex: 1000
          }}
        >
          Debug
        </button>
        
        {showDebug && (
          <div style={{
            position: 'fixed',
            bottom: '50px',
            left: '64px',  // Match navbar width
            background: '#282828',
            padding: '10px',
            borderRadius: '4px',
            maxWidth: '300px',
            zIndex: 1000,
            fontSize: '12px',
            color: 'white',
            marginBottom: '10px'
          }}>
            <h4>Song 1:</h4>
            <p>Spotify URL: {currentPair[0]?.previewUrl || 'none'}</p>
            <p>iTunes URL: {previews.song1 || 'none'}</p>
            <h4>Song 2:</h4>
            <p>Spotify URL: {currentPair[1]?.previewUrl || 'none'}</p>
            <p>iTunes URL: {previews.song2 || 'none'}</p>
            <h4>iTunes Debug:</h4>
            <p>Query: {itunesDebug.query || 'none'}</p>
            <p>URL: {itunesDebug.url || 'none'}</p>
            <p>Status: {itunesDebug.status || 'none'}</p>
            <p>Error: {itunesDebug.error || 'none'}</p>
            <p>Response: {itunesDebug.response ? JSON.stringify(itunesDebug.response.debug, null, 2) : 'none'}</p>
            <p>Device: {navigator.userAgent}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Compare;