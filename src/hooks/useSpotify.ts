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
      // Get user's profile first to get their ID
      const me = await spotifyApi.getMe();
      console.log("User ID:", me.id);

      // Get both owned and followed playlists
      const [ownedPlaylists, followedPlaylists] = await Promise.all([
        spotifyApi.getUserPlaylists(me.id, { limit: 50 }),  // User's own playlists
        spotifyApi.getMySavedTracks({ limit: 50 })          // Liked/saved tracks
      ]);

      console.log("Owned playlists:", ownedPlaylists.items.length);
      console.log("Followed playlists:", followedPlaylists.items.length);

      // Combine all playlists
      const allPlaylists = [
        ...ownedPlaylists.items,
        // Create a "Liked Songs" playlist if they have any saved tracks
        followedPlaylists.items.length > 0 ? {
          id: 'liked_songs',
          name: 'Liked Songs',
          images: [{ url: 'https://misc.scdn.co/liked-songs/liked-songs-640.png' }],
          tracks: followedPlaylists.items
        } : null
      ].filter(Boolean);

      console.log("Total playlists:", allPlaylists.length);
      setPlaylists(allPlaylists);
      
    } catch (error: any) {
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