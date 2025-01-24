import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes

export const useTokenRefresh = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToSpotifyAuth = () => {
      // Clear existing tokens
      localStorage.removeItem('spotifyAccessToken');
      navigate('/auth'); // Navigate to auth instead of direct Spotify redirect
    };

    // Set up periodic refresh only if we have a token
    if (localStorage.getItem('spotifyAccessToken')) {
      const intervalId = setInterval(redirectToSpotifyAuth, REFRESH_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [navigate]);
};