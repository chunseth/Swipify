import { useEffect } from 'react';
import { auth } from '../services/firebase';

const REFRESH_INTERVAL = 45 * 60 * 1000; // Refresh 45 minutes (to be safe)

export const useTokenRefresh = () => {
  useEffect(() => {
    const refreshToken = async () => {
      try {
        const response = await fetch('/api/refresh-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: auth.currentUser?.uid,
          }),
        });
        
        const data = await response.json();
        if (data.access_token) {
          localStorage.setItem('spotifyAccessToken', data.access_token);
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
      }
    };

    const intervalId = setInterval(refreshToken, REFRESH_INTERVAL);
    
    // Initial refresh
    refreshToken();

    return () => clearInterval(intervalId);
  }, []);
}; 