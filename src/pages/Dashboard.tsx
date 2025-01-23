import useSpotify from "../hooks/useSpotify";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const playlists = useSpotify();
  const navigate = useNavigate();

  const handlePlaylistSelect = (playlistId: string) => {
    navigate(`/compare/${playlistId}`);
  };

  const handleViewRankings = (playlistId: string) => {
    navigate(`/rankings/${playlistId}`);
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <h2>Your Playlists</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        {playlists.map((playlist) => (
          <div key={playlist.id} style={{ cursor: "pointer", textAlign: "center" }}>
            <img
              src={playlist.images?.[0]?.url || '/default-playlist.png'}
              alt={playlist.name}
              style={{ width: "150px", height: "150px", borderRadius: "8px" }}
              onClick={() => handlePlaylistSelect(playlist.id)}
            />
            <p style={{ marginTop: "8px", fontWeight: "bold" }}>{playlist.name}</p>
            <button onClick={() => handleViewRankings(playlist.id)}>View Rankings</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;