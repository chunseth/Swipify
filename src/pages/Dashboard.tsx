import useSpotify from "../hooks/useSpotify";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { playlists, error } = useSpotify();
  const navigate = useNavigate();

  const handlePlaylistSelect = (playlistId: string) => {
    navigate(`/compare/${playlistId}`);
  };

  const handleViewRankings = (playlistId: string) => {
    navigate(`/rankings/${playlistId}`);
  };

  return (
    <div style={{ padding: '20px' }}>
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
                <div 
                  key={playlist.id} 
                  style={{ 
                    cursor: "pointer", 
                    textAlign: "center",
                    width: "125px"
                  }}
                >
                  <img
                    src={playlist.images?.[0]?.url || '/default-playlist.png'}
                    alt={playlist.name}
                    style={{ 
                      width: "125px", 
                      height: "125px", 
                      borderRadius: "8px" 
                    }}
                    onClick={() => handlePlaylistSelect(playlist.id)}
                  />
                  <p style={{ 
                    marginTop: "8px", 
                    fontWeight: "bold",
                    width: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {playlist.name}
                  </p>
                  <button 
                    onClick={() => handleViewRankings(playlist.id)}
                    style={{
                      fontSize: "12px",
                      padding: "4px 8px",
                      width: "100%",
                      whiteSpace: "nowrap",
                      marginBottom: "30px"
                    }}
                  >
                    View Rankings
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;