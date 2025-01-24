export const searchItunes = async (query: string) => {
    const encodedQuery = encodeURIComponent(query);
    const itunesUrl = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&entity=song&limit=1`;
    const corsProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(itunesUrl)}`;
  
    try {
      const response = await fetch(corsProxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const itunesData = JSON.parse(data.contents);
      
      if (!itunesData.results?.length) {
        throw new Error('No results found');
      }
      
      return {
        previewUrl: itunesData.results[0].previewUrl,
        debug: {
          url: itunesUrl,
          proxyUrl: corsProxyUrl,
          status: response.status,
          resultCount: itunesData.results.length,
          firstResult: itunesData.results[0]
        }
      };
    } catch (error: any) {
      throw {
        message: `iTunes search failed: ${error.message || 'Unknown error'}`,
        debug: {
          url: itunesUrl,
          proxyUrl: corsProxyUrl,
          error: error.message,
          type: error.type || 'unknown',
          name: error.name || 'unknown'
        }
      };
    }
};