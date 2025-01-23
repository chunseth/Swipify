import { useEffect, useState } from "react";
import SpotifyWebApi from "spotify-web-api-js";
import { refreshAccessToken } from "../components/refreshToken";

const spotifyApi = new SpotifyWebApi();

const useSpotify = () => {
  const [playlists, setPlaylists] = useState<any[]>([]);

  const fetchPlaylists = async () => {
    const accessToken = localStorage.getItem("spotifyAccessToken");
    console.log("Access Token in useSpotify:", accessToken); // Log access token

    if (!accessToken) {
      console.error("No Spotify access token found.");
      return;
    }

    spotifyApi.setAccessToken(accessToken);
    try {
      const response = await spotifyApi.getUserPlaylists();
      setPlaylists(response.items);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
        console.error("Access token expired or invalid.");
        // Attempt to refresh the token
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          console.log("New Access Token:", newAccessToken);
          spotifyApi.setAccessToken(newAccessToken);
          const response = await spotifyApi.getUserPlaylists();
          setPlaylists(response.items);
        } else {
          console.error("Failed to refresh access token.");
        }
      }
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  return playlists;
};

export default useSpotify;