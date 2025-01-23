export const formatSongName = (name: string) => {
    return name.length > 20 ? `${name.substring(0, 20)}...` : name;
  };