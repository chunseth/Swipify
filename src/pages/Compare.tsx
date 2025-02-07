// Compare.tsx
import { useEffect, useState, useRef } from "react";
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
  const audioRef1 = useRef<HTMLAudioElement>(null);
  const audioRef2 = useRef<HTMLAudioElement>(null);

  const fetchAndSaveSongs = async (playlistId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        console.log("No user ID found");
        return [];
    }

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
        let tracks;
        if (playlistId === 'liked') {
            console.log("Fetching liked songs...");
            // Use getMySavedTracks instead of getPlaylistTracks for liked songs
            const response = await spotifyApi.getMySavedTracks({ limit: 50 });
            console.log("Liked songs response:", response);
            
            tracks = response.items.map(item => {
                console.log("Processing track:", item.track);
                return {
                    id: item.track.id,
                    name: item.track.name,
                    artist: item.track.artists[0].name,
                    album: item.track.album.name,
                    albumCover: item.track.album.images[0]?.url,
                    previewUrl: item.track.preview_url,
                    elo: existingSongs[item.track.id]?.elo || 1000,
                };
            });
        } else {
            const response = await spotifyApi.getPlaylistTracks(playlistId);
            tracks = response.items
                .map((item) => {
                    if ('track' in item && item.track && 'artists' in item.track) {
                        const existingSong = existingSongs[item.track.id];
                        return {
                            id: item.track.id,
                            name: item.track.name,
                            artist: item.track.artists[0].name,
                            album: item.track.album.name,
                            albumCover: item.track.album.images[0]?.url,
                            previewUrl: item.track.preview_url,
                            elo: existingSong ? existingSong.elo : 1000,
                        };
                    }
                    return null;
                })
                .filter(Boolean) as Song[];
        }

        console.log(`Found ${tracks.length} tracks`);

        if (!tracks || tracks.length < 2) {
            console.error("Not enough tracks found:", { 
                tracksLength: tracks?.length, 
                playlistId 
            });
            return [];
        }

        const updates: { [key: string]: Song } = {};
        tracks.forEach((track: Song) => {
            updates[track.id] = track;
        });
        await set(playlistRef, updates);
        
        return tracks;
    } catch (error) {
        console.error("Error fetching tracks:", error);
        if (error instanceof Error) {
            console.error("Error details:", {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
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
    
    console.log("Getting next pair:", {
        total: Object.keys(groupMatchups).length,
        remaining: remainingMatchups.length,
        completed: Object.values(groupMatchups).filter(Boolean).length,
        allMatchups: groupMatchups,
        remainingMatchupKeys: remainingMatchups.map(([key]) => key),
        groupSongIds: group.map(s => s.id)
    });

    if (remainingMatchups.length > 0) {
        const randomIndex = Math.floor(Math.random() * remainingMatchups.length);
        const [key] = remainingMatchups[randomIndex];
        const [songId1, songId2] = key.split("_");

        const song1 = group.find(song => song.id === songId1);
        const song2 = group.find(song => song.id === songId2);
        
        if (song1 && song2) {
            return [song1, song2];
        } else {
            console.log("Failed to find songs for pair:", {
                songId1,
                songId2,
                matchupKey: key,
                groupSongs: group.map(s => ({ id: s.id, name: s.name })),
                foundSong1: !!song1,
                foundSong2: !!song2
            });
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

        // Save all updates to Firebase
        const updates: { [key: string]: any } = {};
        updates[`users/${userId}/playlists/${playlistId}/songs/${song1.id}/elo`] = 
            direction === "left" ? newWinnerElo : newLoserElo;
        updates[`users/${userId}/playlists/${playlistId}/songs/${song2.id}/elo`] = 
            direction === "left" ? newLoserElo : newWinnerElo;
        updates[`users/${userId}/playlists/${playlistId}/matchups/${currentGroupIndex}/${song1.id}_${song2.id}`] = true;
        updates[`users/${userId}/playlists/${playlistId}/currentGroup`] = currentGroupIndex;

        try {
            await update(ref(db), updates);
            setCurrentGroup(updatedGroup);
            
            // Update local matchups state
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
            
            // Get next pair
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
                // Current group is complete
                const topSongs = updatedGroup
                    .sort((a, b) => b.elo - a.elo)
                    .slice(0, 2);
                
                // Add to finalists
                const updatedFinalists = [...finalists, ...topSongs];
                setFinalists(updatedFinalists);

                // If this was the last group, initialize finals
                if (currentGroupIndex === groups.length - 1) {
                    // Save finalists to Firebase
                    const finalistsRef = ref(db, `users/${userId}/playlists/${playlistId}/finalists`);
                    await set(finalistsRef, updatedFinalists);

                    // Generate and save initial finals matchups
                    const finalMatchups: { [key: string]: boolean } = {};
                    for (let i = 0; i < updatedFinalists.length; i++) {
                        for (let j = i + 1; j < updatedFinalists.length; j++) {
                            const [smallerId, largerId] = [
                                updatedFinalists[i].id,
                                updatedFinalists[j].id
                            ].sort();
                            finalMatchups[`${smallerId}_${largerId}`] = false;
                        }
                    }

                    // Save finals matchups to Firebase
                    const finalMatchupsRef = ref(db, `users/${userId}/playlists/${playlistId}/finalMatchups`);
                    await set(finalMatchupsRef, finalMatchups);

                    // Navigate to finals
                    navigate(`/finals/${playlistId}`);
                } else {
                    setShowGroupCompletion(true);
                    setCurrentPair([null, null]);
                }
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
    } catch (error: any) {
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

  // Add this shuffle function
  const shuffleArray = <T extends { previewUrl: string | null }>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Update the initializePlaylist function
  const initializePlaylist = async () => {
    if (!playlistId) return;
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    console.log("Initializing playlist...");
    setLoading(true);

    try {
        // Fetch songs, existing matchups, and saved song order from Firebase
        const songs = await fetchAndSaveSongs(playlistId);
        console.log("Fetched songs:", songs.length);

        if (!songs || songs.length < 2) {
            console.error("Not enough songs to compare");
            setLoading(false);
            return;
        }

        const existingData = await fetchExistingPlaylistData(userId, playlistId);
        
        let orderedSongs: Song[];
        let groups: Song[][];
        let matchups: { [groupIndex: number]: { [key: string]: boolean } };

        if (existingData?.songOrder) {
            // If we have existing data, reconstruct the original order
            orderedSongs = existingData.songOrder
            groups = [];
            for (let i = 0; i < orderedSongs.length; i += 6) {
                groups.push(orderedSongs.slice(i, i + 6));
            }
            matchups = existingData.matchups;
        } else {
            // First time setup
            orderedSongs = shuffleArray(songs);
            groups = [];
            for (let i = 0; i < orderedSongs.length; i += 6) {
                groups.push(orderedSongs.slice(i, i + 6));
            }
            matchups = await generateMatchups(groups, userId, playlistId);
            
            // Save the song order and matchups
            await savePlaylistData(userId, playlistId, {
                songOrder: orderedSongs.map(s => s.id),
                matchups
            });
        }
        
        // Find the current group index based on completed matchups
        const resumeGroupIndex = findResumePoint(matchups);
        
        setSongs(orderedSongs);
        setGroups(groups);
        setCurrentGroupIndex(resumeGroupIndex);
        setCurrentGroup(groups[resumeGroupIndex]);
        setGroupMatchups(matchups);
        
        // Get first pair for the current group
        const firstPair = await getNextPair(matchups, resumeGroupIndex, groups[resumeGroupIndex]);
        if (firstPair[0]) {
            setCurrentPair(firstPair as [Song, Song]);
        }
        
        updateProgress(matchups, resumeGroupIndex);
        setLoading(false);
    } catch (error) {
        console.error("Error initializing playlist:", error);
        setLoading(false);
    }
  };

  const fetchExistingPlaylistData = async (userId: string, playlistId: string) => {
    const playlistRef = ref(db, `users/${userId}/playlists/${playlistId}`);
    const snapshot = await get(playlistRef);
    if (!snapshot.exists()) return null;
    
    const data = snapshot.val();
    return {
        songOrder: data.songOrder || null,
        matchups: data.matchups || null
    };
  };

  const savePlaylistData = async (
    userId: string, 
    playlistId: string, 
    data: {
        songOrder: string[];
        matchups: { [groupIndex: number]: { [key: string]: boolean } };
    }
) => {
    const updates: { [key: string]: any } = {};
    updates[`users/${userId}/playlists/${playlistId}/songOrder`] = data.songOrder;
    updates[`users/${userId}/playlists/${playlistId}/matchups`] = data.matchups;
    
    await update(ref(db), updates);
};

  const findResumePoint = (matchups: { [groupIndex: number]: { [key: string]: boolean } }) => {
    console.log("Finding resume point:", {
      numberOfGroups: Object.keys(matchups).length,
      matchupsByGroup: Object.entries(matchups).map(([groupIndex, groupMatchups]) => ({
        groupIndex,
        total: Object.keys(groupMatchups).length,
        completed: Object.values(groupMatchups).filter(Boolean).length
      }))
    });

    // Find the first group that has incomplete matchups
    for (let i = 0; i < Object.keys(matchups).length; i++) {
      const groupMatchups = matchups[i];
      const hasIncomplete = Object.values(groupMatchups).some(value => value === false);
      if (hasIncomplete) {
        return i;
      }
    }
    // If all groups are complete, return the last group
    return Object.keys(matchups).length - 1;
  };

  const updateProgress = (matchups: { [groupIndex: number]: { [key: string]: boolean } }, groupIndex: number) => {
    const currentGroupMatchups = matchups[groupIndex] || {};
    const total = Object.keys(currentGroupMatchups).length;
    const completed = Object.values(currentGroupMatchups).filter(Boolean).length;
    setProgress({ completed, total });
  };

  useEffect(() => {
    initializePlaylist();
  }, [playlistId]);

  if (loading) {
    return <div style={{ marginLeft: '64px', padding: '20px' }}>Loading playlist data...</div>;
  }

  if (!songs || songs.length < 2) {
    return <div style={{ marginLeft: '64px', padding: '20px' }}>Not enough songs in this playlist to compare.</div>;
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
                    
                    const nextGroupPair = await getNextPair(groupMatchups, nextGroupIndex, groups[nextGroupIndex]);
                    if (nextGroupPair[0]) {
                        setCurrentPair(nextGroupPair as [Song, Song]);
                    }
                } else {
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
            <span className="text-sm text-gray-600">Group {currentGroupIndex + 1} of {groups.length}: </span>
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
              <p className="song-details">{currentPair[0].artist} - {currentPair[0].album}</p>
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
              <p className="song-details">{currentPair[1].artist} - {currentPair[1].album}</p>
            </div>
          </div>
        </div>

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
    </div>
  );
};

export default Compare;