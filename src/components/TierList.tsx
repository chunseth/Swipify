import React from "react";

interface TierListProps {
  songs: { name: string; tier: string }[];
}

const TierList: React.FC<TierListProps> = ({ songs }) => {
  const tiers = ["S", "A", "B", "C", "D", "F"];

  return (
    <div>
      {tiers.map((tier) => (
        <div key={tier}>
          <h2>Tier {tier}</h2>
          <ul>
            {songs
              .filter((song) => song.tier === tier)
              .map((song) => (
                <li key={song.name}>{song.name}</li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default TierList;