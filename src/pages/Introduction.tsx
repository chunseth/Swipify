import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { ref, get, set } from "firebase/database";

interface ITunesSong {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
}

const Introduction: React.FC = () => {
  const navigate = useNavigate();
  const [demoSongs, setDemoSongs] = useState<ITunesSong[] | null>(null);
  const audioRef1 = useRef<HTMLAudioElement>(null);
  const audioRef2 = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Check if user has seen intro
    const checkIntroStatus = async () => {
      if (auth.currentUser) {
        const introRef = ref(db, `users/${auth.currentUser.uid}/introShown`);
        const snapshot = await get(introRef);
        if (snapshot.exists() && snapshot.val() === true) {
          navigate("/dashboard");
        }
      }
    };
    checkIntroStatus();

    // Fetch demo songs
    Promise.all([
      fetch(`https://itunes.apple.com/search?media=music&entity=song&limit=1&term=${encodeURIComponent("apt by rose")}`)
        .then(response => response.json()),
      fetch(`https://itunes.apple.com/search?media=music&entity=song&limit=1&term=${encodeURIComponent("another love by tom odell")}`)
        .then(response => response.json())
    ])
      .then(([data1, data2]) => {
        const track1 = data1.results && data1.results.length > 0 ? data1.results[0] : null;
        const track2 = data2.results && data2.results.length > 0 ? data2.results[0] : null;
        if (track1 && track2) {
          setDemoSongs([track1, track2] as ITunesSong[]);
        }
      })
      .catch(error => {
        console.error("Failed to fetch iTunes songs:", error);
      });
  }, [navigate]);

  const handleGetStarted = async () => {
    if (auth.currentUser) {
      // Save intro completion status to Firebase
      const introRef = ref(db, `users/${auth.currentUser.uid}/introShown`);
      await set(introRef, true);
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>Welcome to the Playlist Comparison App!</h1>
      <p>
        Explore your Spotify playlists, listen to short previews of songs, and compare tracks to create your personal rankings.
      </p>

      {/* Demo Comparison Section */}
      <div style={{ marginTop: "40px", padding: "20px", border: "2px dashed #1DB954", borderRadius: "10px" }}>
        <h3>Demo Comparison</h3>
        <p>Tap the album cover to choose which song you prefer. Use the play button to listen to a short preview.</p>
        {demoSongs ? (
          <div className="demo-songs">
            {/* Song 1 */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{ cursor: "pointer", border: "2px solid transparent", padding: "5px" }}
                onClick={() => console.log(`Selected ${demoSongs[0].trackName}`)}
              >
                <img
                  src={demoSongs[0].artworkUrl100}
                  alt={demoSongs[0].trackName}
                  style={{ width: "200px", height: "200px", borderRadius: "8px" }}
                />
              </div>
              {demoSongs[0].previewUrl && (
                <div style={{ marginTop: "10px" }}>
                  <audio
                    ref={audioRef1}
                    controls
                    onPlay={() => {
                      if (audioRef2.current) {
                        audioRef2.current.pause();
                      }
                    }}
                    style={{ outline: "2px solid #1DB954" }}
                    src={demoSongs[0].previewUrl}
                  />
                </div>
              )}
              <>
                <h4>{demoSongs[0].trackName}</h4>
                <p>{demoSongs[0].artistName}</p>
              </>
            </div>

            <div style={{ fontSize: "24px", fontWeight: "bold" }}>VS</div>

            {/* Song 2 */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{ cursor: "pointer", border: "2px solid transparent", padding: "5px" }}
                onClick={() => console.log(`Selected ${demoSongs[1].trackName}`)}
              >
                <img
                  src={demoSongs[1].artworkUrl100}
                  alt={demoSongs[1].trackName}
                  style={{ width: "200px", height: "200px", borderRadius: "8px" }}
                />
              </div>
              {demoSongs[1].previewUrl && (
                <div style={{ marginTop: "10px" }}>
                  <audio
                    ref={audioRef2}
                    controls
                    onPlay={() => {
                      if (audioRef1.current) {
                        audioRef1.current.pause();
                      }
                    }}
                    style={{ outline: "2px solid #1DB954" }}
                    src={demoSongs[1].previewUrl}
                  />
                </div>
              )}
              <>
                <h4>{demoSongs[1].trackName}</h4>
                <p>{demoSongs[1].artistName}</p>
              </>
            </div>
          </div>
        ) : (
          <p>Loading selected songs from iTunes…</p>
        )}
      </div>
      {/* End Demo Section */}

      <button
        onClick={handleGetStarted}
        style={{
          marginTop: "30px",
          padding: "10px 20px",
          fontSize: "16px",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Get Started
      </button>
    </div>
  );
};

export default Introduction; 