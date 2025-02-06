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
      // Only fetch regular playlists
      const playlistResponse = await spotifyApi.getUserPlaylists();
      setPlaylists(playlistResponse.items);
      
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