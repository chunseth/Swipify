import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SpotifyAuth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    
    if (!clientId) {
      console.error("Missing Spotify Client ID");
      return;
    }

    // Detect iOS/Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    console.log("Is Safari:", isSafari); // Debug log

    const redirectUri = window.location.hostname === "localhost"
      ? "http://localhost:3000/callback"
      : "https://swipifys.netlify.app/callback";

    // Generate and store state parameter for CSRF protection
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('spotify_auth_state', state);
      
    const scopes = [
      "user-read-private",
      "user-read-email",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-library-read"
    ].join(' ');

    // Use URLSearchParams for proper encoding
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'token',
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
      show_dialog: 'true'
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

    if (isSafari) {
      // For Safari, use a form submission instead of direct redirect
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = 'https://accounts.spotify.com/authorize';
      
      for (const [key, value] of params.entries()) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } else {
      window.location.href = authUrl;
    }
  }, [navigate]);

  return (
    <div style={{ marginLeft: '64px', padding: '20px' }}>
      <h2>Connecting to Spotify...</h2>
      <p>If you're not redirected automatically, please check your pop-up blocker.</p>
    </div>
  );
};

export default SpotifyAuth;