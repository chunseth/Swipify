const SpotifyAuth = () => {
  const handleAuthClick = () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    
    if (!clientId) {
      console.error("Missing Spotify Client ID");
      return;
    }

    // Detect Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    console.log("Is Safari:", isSafari);

    const redirectUri = window.location.hostname === "localhost"
      ? "http://localhost:3000/callback"
      : "https://swipifys.netlify.app/callback";

    const scopes = [
      "user-read-private",
      "user-read-email",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-library-read"
    ].join(' ');

    const state = Math.random().toString(36).substring(7);

    // Standard approach for other browsers
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'token',
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
      show_dialog: 'true',
      prompt: 'consent'
    });

    if (isSafari) {
      // Safari-specific approach: Use a traditional link
      const a = document.createElement('a');
      a.href = 'https://accounts.spotify.com/authorize?' + params.toString();
      a.rel = 'noopener noreferrer';
      a.click();
    } else {
      window.location.href = 'https://accounts.spotify.com/authorize?' + params.toString();
    }
  };

  return (
    <div style={{ marginLeft: '64px', padding: '20px' }}>
      <h2>Connect to Spotify</h2>
      <button 
        onClick={handleAuthClick}
        style={{
          padding: '12px 24px',
          backgroundColor: '#1DB954',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        Connect with Spotify
      </button>
      <p>Click the button above to connect your Spotify account.</p>
    </div>
  );
};

export default SpotifyAuth;