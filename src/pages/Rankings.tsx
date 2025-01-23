import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db, auth } from "../services/firebase";

const Rankings = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const [rankedSongs, setRankedSongs] = useState<any[]>([]);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId || !playlistId) return;

    const playlistRef = ref(db, `users/${userId}/playlists/${playlistId}/songs`);
    get(playlistRef).then((snapshot) => {
      if (snapshot.exists()) {
        const songs = Object.values(snapshot.val());
        // Sort songs by Elo score (highest first)
        const sortedSongs = songs.sort((a: any, b: any) => b.elo - a.elo);
        setRankedSongs(sortedSongs);
      }
    });
  }, [playlistId]);

  return (
    <div>
      <h1>Rankings</h1>
      <h2>Playlist: {playlistId}</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Song</th>
            <th>Artist</th>
            <th>Album</th>
            <th>Elo</th>
          </tr>
        </thead>
        <tbody>
          {rankedSongs.map((song, index) => (
            <tr key={song.id}>
              <td>{index + 1}</td> {/* Rank (1st, 2nd, 3rd, etc.) */}
              <td>{song.name}</td>
              <td>{song.artist}</td>
              <td>{song.album}</td>
              <td>{song.elo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Rankings;