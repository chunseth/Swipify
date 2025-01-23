import React from "react";
import { useSwipeable } from "react-swipeable";

const SongComparison = ({ song1, song2, onSwipe }: { song1: any; song2: any; onSwipe: (direction: "left" | "right") => void }) => {
  const handlers = useSwipeable({
    onSwipedLeft: () => onSwipe("left"),
    onSwipedRight: () => onSwipe("right"),
  });

  return (
    <div {...handlers}>
      <div>
        <img src={song1.albumCover} alt={song1.name} />
        <p>{song1.name}</p>
      </div>
      <div>
        <img src={song2.albumCover} alt={song2.name} />
        <p>{song2.name}</p>
      </div>
    </div>
  );
};

export default SongComparison;