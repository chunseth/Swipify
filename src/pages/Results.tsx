import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ref, get, set } from "firebase/database";
import { db, auth } from "../services/firebase";

interface Song {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumCover: string;
  elo: number;
}

const Results = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const [finalists, setFinalists] = useState<Song[]>([]);
  const [playlistName, setPlaylistName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId || !playlistId) return;

      try {
        // Fetch playlist name
        const playlistRef = ref(db, `users/${userId}/playlists/${playlistId}`);
        const playlistSnapshot = await get(playlistRef);
        if (playlistSnapshot.exists()) {
          setPlaylistName(playlistSnapshot.val().name || "Playlist");
        }

        // Fetch finalists
        const finalistsRef = ref(db, `users/${userId}/playlists/${playlistId}/finalists`);
        const finalistsSnapshot = await get(finalistsRef);
        
        if (finalistsSnapshot.exists()) {
          const finalistsData = Object.values(finalistsSnapshot.val()) as Song[];
          // Sort by Elo rating
          const sortedFinalists = finalistsData.sort((a, b) => b.elo - a.elo);
          setFinalists(sortedFinalists);
        }
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [playlistId]);

  const resetPlaylist = async () => {
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
      navigate(`/compare/${playlistId}`);
    } catch (error) {
      console.error("Error resetting playlist:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const getMedalEmoji = (index: number) => {
    switch (index) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Final Rankings
          </h1>
          <h2 className="text-xl text-gray-600">
            {playlistName}
          </h2>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {finalists.map((song, index) => (
              <li key={song.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-16 text-center">
                    <span className="text-2xl">
                      {getMedalEmoji(index) || `#${index + 1}`}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    <img 
                      src={song.albumCover} 
                      alt={song.album}
                      className="w-16 h-16 rounded-md shadow-sm"
                      style={{ maxWidth: '16rem', maxHeight: '16rem' }} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-medium text-gray-900 truncate">
                      {song.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {song.artist}
                    </p>
                    <p className="text-xs text-gray-400">
                      {song.album}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-gray-500">
                    Elo: {Math.round(song.elo)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex justify-center space-x-4">
          <Link
            to={`/dashboard`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Playlists
          </Link>
          <button
            onClick={resetPlaylist}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Start New Ranking
          </button>
        </div>
      </div>
    </div>
  );
};

export default Results; 