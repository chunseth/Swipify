import React, { useEffect, useState } from "react";
import SpotifyWebApi from "spotify-web-api-js";
import { ref, set } from "firebase/database";
import { db, auth } from "../services/firebase";

const spotifyApi = new SpotifyWebApi();

const Playlists = () => {
  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    const accessToken = localStorage.getItem("spotifyAccessToken");
    if (accessToken) {
      spotifyApi.setAccessToken(accessToken);
      spotifyApi.getUserPlaylists().then((response) => {
        setPlaylists(response.items);
      });
    }
  }, []);

  const savePlaylistSongs = async (playlistId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const playlistTracks = await spotifyApi.getPlaylistTracks(playlistId);
    const songs = playlistTracks.items.map((item) => {
      if ('artists' in item.track) {  // Type guard to check if it's a music track
        return {
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists[0].name,
          album: item.track.album.name,
          albumCover: item.track.album.images[0].url,
        };
      }
      return null;
    }).filter(Boolean);  // Remove any null values

    const playlistRef = ref(db, `users/${userId}/playlists/${playlistId}`);
    set(playlistRef, songs);
  };

  return (
    <div>
      {playlists.map((playlist) => (
        <div key={playlist.id} onClick={() => savePlaylistSongs(playlist.id)}>
          {playlist.name}
        </div>
      ))}
    </div>
  );
};

export default Playlists;