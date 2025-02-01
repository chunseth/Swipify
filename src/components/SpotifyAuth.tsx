import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SpotifyAuth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    console.log("Client ID:", clientId); // Debug log
    
    if (!clientId) {
      console.error("Missing Spotify Client ID");
      return;
    }

    // Update production redirect URI to match Spotify Dashboard setting
    const redirectUri = import.meta.env.PROD 
      ? "https://swipify-app.netlify.app/callback"  // Update this to match your Spotify Dashboard
      : "http://localhost:3000/callback";
    
    const scopes = [
      "user-read-private",
      "user-read-email",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-library-read"
    ].join(' ');

    console.log("Redirect URI:", redirectUri); // Debug log

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=token&show_dialog=true`;

    // Redirect to Spotify Auth
    window.location.href = authUrl;
  }, [navigate]);

  return <div>Redirecting to Spotify...</div>;
};

export default SpotifyAuth;