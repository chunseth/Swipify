import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db, auth } from "../services/firebase";

const Rankings = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const [rankedSongs, setRankedSongs] = useState<any[]>([]);
  const [playlistName, setPlaylistName] = useState<string>("");

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId || !playlistId) return;

    // Get playlist name
    const playlistRef = ref(db, `users/${userId}/playlists/${playlistId}`);
    get(playlistRef).then((snapshot) => {
      if (snapshot.exists()) {
        setPlaylistName(snapshot.val().name || "Playlist");
        const songs = snapshot.val().songs;
        if (songs) {
          const sortedSongs = Object.values(songs).sort((a: any, b: any) => b.elo - a.elo);
          setRankedSongs(sortedSongs);
        }
      }
    });
  }, [playlistId]);

  return (
    <div>
      <h1>Rankings</h1>
      <h2>{playlistName}</h2>
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
              <td>{index + 1}</td>
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