import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { ref, set } from 'firebase/database';

const Navbar = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const [showSettings, setShowSettings] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const navbarRef = useRef<HTMLDivElement>(null);

  const isPlaylistRoute = location.pathname.includes('/compare/') || 
                         location.pathname.includes('/finals/') || 
                         location.pathname.includes('/results/');

  const handleResetConfirm = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId || !playlistId) return;

    try {
      const playlistRef = ref(db, `users/${userId}/playlists/${playlistId}`);
      const updates = {
        matchups: null,
        finalists: null,
        finalMatchups: null,
        currentGroup: null,
        songOrder: null,
      };

      await set(playlistRef, updates);
      setShowResetConfirm(false);
      setShowSettings(false);
      navigate(`/compare/${playlistId}`);
    } catch (error) {
      console.error("Error resetting playlist:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('spotifyAccessToken');
      localStorage.removeItem('spotifyRefreshToken');
      setIsExpanded(false);
      navigate('/auth');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSpotifyRefresh = () => {
    localStorage.removeItem('spotifyAccessToken');
    setIsExpanded(false);
    navigate('/spotify-auth');
  };

  const handleNavigation = (path: string) => {
    setIsExpanded(false);
    setShowSettings(false);
    navigate(path);
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
    <>
      <div ref={navbarRef} className={`navbar ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div>
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
              <div 
                onClick={() => handleNavigation('/dashboard')} 
                className="nav-link"
              >
                <span>Dashboard</span>
              </div>

              <div>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`settings-button ${showSettings ? 'active' : ''}`}
                >
                  <span>Settings</span>
                  <span>▼</span>
                </button>

                {showSettings && (
                  <div className="settings-dropdown" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    width: '84.5%'
                  }}>
                    {isPlaylistRoute && (
                      <button 
                        onClick={() => setShowResetConfirm(true)}
                        className="nav-button"
                      >
                        Reset Rankings
                      </button>
                    )}
                    <button 
                      onClick={handleSignOut}
                      className="nav-button"
                    >
                      Sign Out
                    </button>
                    <button 
                      onClick={handleSpotifyRefresh}
                      className="nav-button"
                    >
                      Refresh Spotify
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showResetConfirm && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: '#1a1a1a',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ marginBottom: '16px', color: 'white' }}>Reset Rankings?</h2>
            <p style={{ marginBottom: '24px', color: '#ccc' }}>
              This will reset all song rankings and comparisons for this playlist. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="settings-option"
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                className="settings-option"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          .nav-button {
            width: 100%;
            padding: 8px 16px;
            background-color: #2a2a2a;
            border: none;
            color: white;
            cursor: pointer;
            margin: 4px 0;
            text-align: left;
          }

          .nav-button:hover {
            background-color: #1a1a1a;
          }
        `}
      </style>
    </>
  );
};

export default Navbar;