import useSpotify from "../hooks/useSpotify";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Dashboard = () => {
  const { playlists, error } = useSpotify();
  const navigate = useNavigate();
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    accessToken?: string | null;
    playlistCount?: number;
    error?: any;
    lastUpdate?: string;
    spotifyError?: any;
  }>({
    accessToken: localStorage.getItem("spotifyAccessToken"),
    playlistCount: 0,
    lastUpdate: new Date().toISOString()
  });

  const handlePlaylistSelect = (playlistId: string) => {
    navigate(`/compare/${playlistId}`);
  };

  const handleViewRankings = (playlistId: string) => {
    navigate(`/rankings/${playlistId}`);
  };

  return (
    <div style={{ marginLeft: '64px', padding: '20px' }}>
      <h1>Dashboard</h1>
      <h2 className="dashboard-title">Your Playlists</h2>
      <div className="dashboard-container">
        <div className="playlists-grid">
          {playlists.length === 0 ? (
            <div>
              <p>No playlists found. Please check your Spotify connection.</p>
              {error && <p style={{ color: 'red' }}>Error: {error.message || JSON.stringify(error)}</p>}
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {playlists.map((playlist) => (
                <div key={playlist.id} style={{ cursor: "pointer", textAlign: "center" }}>
                  <img
                    src={playlist.images?.[0]?.url || '/default-playlist.png'}
                    alt={playlist.name}
                    style={{ width: "125px", height: "125px", borderRadius: "8px" }}
                    onClick={() => handlePlaylistSelect(playlist.id)}
                  />
                  <p style={{ marginTop: "8px", fontWeight: "bold" }}>{playlist.name}</p>
                  <button onClick={() => handleViewRankings(playlist.id)}>View Rankings</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Debug Button and Panel */}
      <button 
        onClick={() => {
          setDebugInfo({
            accessToken: localStorage.getItem("spotifyAccessToken"),
            playlistCount: playlists.length,
            error: error,
            lastUpdate: new Date().toISOString(),
            spotifyError: error
          });
          setShowDebug(!showDebug);
        }} 
        style={{ 
          position: 'fixed', 
          bottom: '10px', 
          left: '128px',
          background: '#1DB954',
          padding: '8px',
          borderRadius: '4px',
          color: 'white',
          zIndex: 1000
        }}
      >
        Debug
      </button>
      
      {showDebug && (
        <div style={{
          position: 'fixed',
          bottom: '50px',
          left: '128px',
          background: '#282828',
          padding: '10px',
          borderRadius: '4px',
          maxWidth: '300px',
          zIndex: 1000,
          fontSize: '12px',
          color: 'white',
          marginBottom: '10px'
        }}>
          <h4>Spotify Debug Info:</h4>
          <p>Access Token Present: {debugInfo.accessToken ? 'Yes' : 'No'}</p>
          <p>Token Preview: {debugInfo.accessToken?.substring(0, 10)}...</p>
          <p>Playlist Count: {debugInfo.playlistCount}</p>
          <p>Last Update: {debugInfo.lastUpdate}</p>
          <p>Error: {debugInfo.error ? JSON.stringify(debugInfo.error, null, 2) : 'None'}</p>
          <p>Spotify Error: {debugInfo.spotifyError ? JSON.stringify(debugInfo.spotifyError, null, 2) : 'None'}</p>
          <p>Device: {navigator.userAgent}</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;