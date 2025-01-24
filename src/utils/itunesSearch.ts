export const searchItunes = async (query: string) => {
    const encodedQuery = encodeURIComponent(query); // Encode spaces and special characters
    const url = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&entity=song&limit=1`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      return {
        previewUrl: data.results?.[0]?.previewUrl,
        debug: {
          url,
          status: response.status,
          resultCount: data.results?.length,
          firstResult: data.results?.[0]
        }
      };
    } catch (error: any) {
      throw {
        message: error?.message || 'Unknown error',
        debug: {
          url,
          error: error?.message,
          stack: error?.stack
        }
      };
    }
};