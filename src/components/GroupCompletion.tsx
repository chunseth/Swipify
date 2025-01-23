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
    <div className="flex flex-col items-center gap-6 p-4">
      <h2 className="text-2xl font-bold">Group Complete!</h2>
      
      {/* Qualified Songs */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-green-600 mb-4">Advancing to Finals</h3>
        <div className="flex gap-8">
          {qualifiers.map(song => (
            <div key={song.id} className="text-center">
              <img 
                src={song.albumCover} 
                alt={song.name}
                className="w-32 h-32 rounded-lg shadow-lg object-cover border-4 border-green-500" 
              />
              <h4 className="font-bold mt-2">{song.name}</h4>
              <p className="text-gray-600">{song.artist}</p>
            </div>
          ))}
        </div>
      </div>

      {/* All Group Songs */}
      <div>
        <h3 className="text-xl font-bold text-gray-600 mb-4">Group Results</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {allGroupSongs.map(song => {
            const isQualifier = qualifiers.some(q => q.id === song.id);
            return (
              <div 
                key={song.id} 
                className={`text-center ${isQualifier ? 'opacity-100' : 'opacity-50'}`}
              >
                <img 
                  src={song.albumCover} 
                  alt={song.name}
                  className={`w-24 h-24 rounded-lg shadow-lg object-cover 
                    ${isQualifier ? 'border-4 border-green-500' : ''}`} 
                />
                <h4 className="font-bold mt-2">{song.name}</h4>
                <p className="text-gray-600">{song.artist}</p>
                <p className="text-sm text-gray-500">Elo: {song.elo}</p>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onContinue}
        className="mt-8 px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        {isLastGroup ? "Start Finals" : "Next Group"}
      </button>
    </div>
  );
};

export default GroupCompletion; 