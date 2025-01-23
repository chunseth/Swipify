import React from 'react';

interface GroupCompletionProps {
  qualifiers: any[];
  allGroupSongs: any[];
  onContinue: () => void;
  isLastGroup: boolean;
}

const GroupCompletion: React.FC<GroupCompletionProps> = ({
  qualifiers,
  allGroupSongs,
  onContinue,
  isLastGroup
}) => {
  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-2xl font-bold mb-4">Group Complete!</h2>
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">Advancing to Next Round:</h3>
        {qualifiers.map((song, index) => (
          <div key={song.id} className="mb-2">
            <p className="font-bold">{index + 1}. {song.name}</p>
            <p className="text-gray-600">{song.artist}</p>
            <p className="text-gray-500">Elo: {Math.round(song.elo)}</p>
          </div>
        ))}
      </div>
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">Final Group Rankings:</h3>
        {allGroupSongs.map((song, index) => (
          <div key={song.id} className="mb-1">
            <p>{index + 1}. {song.name} - {Math.round(song.elo)}</p>
          </div>
        ))}
      </div>
      <button
        onClick={onContinue}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        {isLastGroup ? "View Final Results" : "Continue to Next Group"}
      </button>
    </div>
  );
};

export default GroupCompletion; 