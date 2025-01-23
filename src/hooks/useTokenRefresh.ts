import { useEffect } from 'react';
import { refreshAccessToken } from '../components/refreshToken';

const REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes

export const useTokenRefresh = () => {
  useEffect(() => {
    const refreshToken = async () => {
      try {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          localStorage.setItem('spotifyAccessToken', newAccessToken);
        } else {
          // If refresh failed and we have no valid tokens, redirect to auth
          window.location.href = '/auth';
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
      }
    };

    const intervalId = setInterval(refreshToken, REFRESH_INTERVAL);
    
    // Initial refresh check
    refreshToken();

    return () => clearInterval(intervalId);
  }, []);
};