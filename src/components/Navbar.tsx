import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

const Navbar = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const navbarRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('spotifyAccessToken');
      localStorage.removeItem('spotifyRefreshToken');
      navigate('/auth');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSpotifyRefresh = () => {
    localStorage.removeItem('spotifyAccessToken');
    navigate('/spotify-auth');
  };

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
              <div className="settings-dropdown" style={{ width: '84.5%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <button 
                    onClick={handleSignOut}
                    style={{
                      padding: '8px 16px',
                      width: '100%',
                      backgroundColor: '#282828',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      textAlign: 'left'
                    }}
                  >
                    Sign Out
                  </button>
                </div>
                <div>
                  <button 
                    onClick={handleSpotifyRefresh}
                    style={{
                      padding: '8px 16px',
                      width: '100%',
                      backgroundColor: '#282828',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      textAlign: 'left'
                    }}
                  >
                    Refresh Spotify
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;