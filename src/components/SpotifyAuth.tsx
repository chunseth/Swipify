import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SpotifyAuth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = import.meta.env.PROD 
      ? "https://swipifys.netlify.app/callback"
      : "http://localhost:3000/callback";
    const scopes = "user-read-private user-read-email playlist-read-private";

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=token`;

    // Redirect to Spotify Auth
    window.location.href = authUrl;
  }, [navigate]);

  return <div>Redirecting to Spotify...</div>;
};

export default SpotifyAuth;