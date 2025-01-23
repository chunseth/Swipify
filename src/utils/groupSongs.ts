export const groupSongs = (songs: any[]) => {
    const totalSongs = songs.length;
    let groupSize;
  
    if (totalSongs <= 8) {
      // If there are 8 or fewer songs, use a single group
      return [songs];
    }
  
    // Determine the closest group size (6, 7, or 8)
    const remainder6 = totalSongs % 6;
    const remainder7 = totalSongs % 7;
    const remainder8 = totalSongs % 8;
  
    if (remainder6 <= remainder7 && remainder6 <= remainder8) {
      groupSize = 6;
    } else if (remainder7 <= remainder6 && remainder7 <= remainder8) {
      groupSize = 7;
    } else {
      groupSize = 8;
    }
  
    // Split songs into groups
    const groups = [];
    for (let i = 0; i < totalSongs; i += groupSize) {
      groups.push(songs.slice(i, i + groupSize));
    }
  
    return groups;
  };