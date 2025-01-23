import SpotifyWebApi from "spotify-web-api-js";

const spotifyApi = new SpotifyWebApi();

export const fetchPlaylists = async (accessToken: string) => {
  spotifyApi.setAccessToken(accessToken);
  const playlists = await spotifyApi.getUserPlaylists();
  return playlists.items;
};

export const fetchPlaylistSongs = async (playlistId: string) => {
  const playlistTracks = await spotifyApi.getPlaylistTracks(playlistId);
  return playlistTracks.items
    .map((item) => {
      if ('artists' in item.track) {  // Type guard for music tracks
        return {
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists[0].name,
          album: item.track.album.name,
          albumCover: item.track.album.images[0].url,
        };
      }
      return null;
    })
    .filter(Boolean);  // Remove any null values
};