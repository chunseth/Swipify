import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const navbarRef = useRef<HTMLDivElement>(null);

  const handleSignOut = () => {
    localStorage.removeItem('spotifyAccessToken');
    navigate('/auth');
  };

  const handleSpotifyAuth = () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = import.meta.env.PROD 
      ? "https://swipifys.netlify.app/callback"
      : "http://localhost:3000/callback";
    const scopes = "user-read-private user-read-email playlist-read-private";
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=token`;
    window.location.href = authUrl;
  };

  const handleSpotifySignOut = () => {
    localStorage.removeItem('spotifyAccessToken');
    localStorage.removeItem('spotifyRefreshToken');
    // Optionally refresh the page or navigate
    window.location.reload();
  };

  const isSpotifyConnected = !!localStorage.getItem('spotifyAccessToken');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={navbarRef} className={`navbar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div 
        className="hamburger-menu"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
      </div>

      <div className="navbar-content">
        <div className="navbar-brand">
          Swipify
        </div>

        <div className="nav-links">
          <Link to="/dashboard" className="nav-link">
            <span>Dashboard</span>
          </Link>

          <div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`settings-button ${showSettings ? 'active' : ''}`}
            >
              <span>Settings</span>
              <span>▼</span>
            </button>

            {showSettings && (
              <div className="settings-dropdown">
                <button onClick={handleSignOut}>
                  Sign Out
                </button>
                {isSpotifyConnected ? (
                  <button onClick={handleSpotifySignOut}>
                    Disconnect Spotify
                  </button>
                ) : (
                  <button onClick={handleSpotifyAuth}>
                    Connect Spotify
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;