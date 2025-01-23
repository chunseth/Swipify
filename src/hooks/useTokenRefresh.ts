import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes

export const useTokenRefresh = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToSpotifyAuth = () => {
      // Clear existing tokens
      localStorage.removeItem('spotifyAccessToken');
      
      // Redirect to Spotify auth
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      const redirectUri = import.meta.env.PROD 
        ? "https://swipifys.netlify.app/callback"
        : "http://localhost:3000/callback";
      const scopes = "user-read-private user-read-email playlist-read-private";
      const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=token`;
      
      window.location.href = authUrl;
    };

    // Initial auth if no token exists
    if (!localStorage.getItem('spotifyAccessToken')) {
      redirectToSpotifyAuth();
      return;
    }

    // Set up periodic refresh
    const intervalId = setInterval(redirectToSpotifyAuth, REFRESH_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [navigate]);
};