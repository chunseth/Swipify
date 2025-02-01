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

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    console.log("Is iOS:", isIOS); // Debug log

    const redirectUri = isIOS
      ? "https://swipifys.netlify.app/callback"  // Fixed domain
      : window.location.hostname === "localhost"
        ? "http://localhost:3000/callback"
        : "https://swipifys.netlify.app/callback";  // Fixed domain
      
    const scopes = [
      "user-read-private",
      "user-read-email",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-library-read"
    ].join(' ');

    console.log("Redirect URI:", redirectUri); // Debug log

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=token&show_dialog=true`;

    // For iOS, open in new tab to avoid Safari issues
    if (isIOS) {
      window.open(authUrl, '_blank');
    } else {
      window.location.href = authUrl;
    }
  }, [navigate]);

  return <div>Redirecting to Spotify...</div>;
};

export default SpotifyAuth;