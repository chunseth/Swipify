import { useEffect, useState } from "react";
import SpotifyWebApi from "spotify-web-api-js";

const spotifyApi = new SpotifyWebApi();

const useSpotify = () => {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);

  const fetchPlaylists = async () => {
    const accessToken = localStorage.getItem("spotifyAccessToken");
    
    if (!accessToken) {
      setError("No access token found");
      return;
    }

    spotifyApi.setAccessToken(accessToken);
    try {
      // Fetch both playlists and liked songs
      const [playlistResponse, likedSongsResponse] = await Promise.all([
        spotifyApi.getUserPlaylists(),
        spotifyApi.getMySavedTracks()
      ]);

      // Create a "Liked Songs" playlist object
      const likedSongsPlaylist = {
        id: 'liked_songs',
        name: 'Liked Songs',
        images: [{ url: 'https://misc.scdn.co/liked-songs/liked-songs-640.png' }],
        tracks: { total: likedSongsResponse.total }
      };

      // Combine regular playlists with Liked Songs
      setPlaylists([likedSongsPlaylist, ...playlistResponse.items]);
      
    } catch (error) {
      console.error("Error fetching playlists:", error);
      setError(error);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  return { playlists, error, refetch: fetchPlaylists };
};

export default useSpotify;