import { useSwipeable } from "react-swipeable";
import { useState } from "react";

const SongComparison = ({ song1, song2, onSwipe }: { song1: any; song2: any; onSwipe: (direction: "left" | "right") => void }) => {
  const [playing1, setPlaying1] = useState(false);
  const [playing2, setPlaying2] = useState(false);

  const handlers = useSwipeable({
    onSwipedLeft: () => onSwipe("left"),
    onSwipedRight: () => onSwipe("right"),
  });

  const playPreview = (audioUrl: string, setPlaying: (playing: boolean) => void) => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.play().then(() => {
      setPlaying(true);
      audio.onended = () => setPlaying(false);
    }).catch(error => {
      console.log("Playback failed:", error);
    });
  };

  return (
    <div {...handlers} className="flex gap-8 items-center justify-center">
      <div className="text-center">
        <img src={song1.albumCover} alt={song1.name} className="w-48 h-48 rounded-lg" />
        <p className="mt-2">{song1.name}</p>
        {song1.previewUrl && (
          <button 
            onClick={() => playPreview(song1.previewUrl, setPlaying1)}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
          >
            {playing1 ? "Playing..." : "Play Preview"}
          </button>
        )}
      </div>
      <div className="text-center">
        <img src={song2.albumCover} alt={song2.name} className="w-48 h-48 rounded-lg" />
        <p className="mt-2">{song2.name}</p>
        {song2.previewUrl && (
          <button 
            onClick={() => playPreview(song2.previewUrl, setPlaying2)}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
          >
            {playing2 ? "Playing..." : "Play Preview"}
          </button>
        )}
      </div>
    </div>
  );
};

export default SongComparison;