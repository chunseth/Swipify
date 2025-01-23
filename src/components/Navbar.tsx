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
              <button
                onClick={handleSignOut}
                className="settings-dropdown"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;