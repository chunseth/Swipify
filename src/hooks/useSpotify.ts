import { useEffect, useState } from "react";
import SpotifyWebApi from "spotify-web-api-js";
import { refreshAccessToken } from "../components/refreshToken";

const spotifyApi = new SpotifyWebApi();

const useSpotify = () => {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);

  const fetchPlaylists = async () => {
    const accessToken = localStorage.getItem("spotifyAccessToken");
    console.log("Access Token in useSpotify:", accessToken?.substring(0, 10) + "..."); 

    if (!accessToken) {
      setError("No Spotify access token found");
      console.error("No Spotify access token found.");
      return;
    }

    spotifyApi.setAccessToken(accessToken);
    try {
      console.log("Fetching playlists...");
      const response = await spotifyApi.getUserPlaylists();
      console.log("Playlists response:", response);
      setPlaylists(response.items);
    } catch (error: any) {
      console.error("Error fetching playlists:", error);
      setError(error);
      
      if (error?.status === 401) {
        console.log("Token expired, attempting refresh...");
        try {
          const newAccessToken = await refreshAccessToken();
          if (newAccessToken) {
            console.log("New token obtained:", newAccessToken.substring(0, 10) + "...");
            localStorage.setItem("spotifyAccessToken", newAccessToken);
            spotifyApi.setAccessToken(newAccessToken);
            const response = await spotifyApi.getUserPlaylists();
            console.log("Playlists fetched with new token:", response);
            setPlaylists(response.items);
          } else {
            setError("Failed to refresh token");
          }
        } catch (refreshError) {
          console.error("Error during token refresh:", refreshError);
          setError(refreshError);
        }
      }
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  return { playlists, error };  // Return both playlists and error
};

export default useSpotify;