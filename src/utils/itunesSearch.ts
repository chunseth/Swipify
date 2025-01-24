export const searchItunes = async (query: string) => {
    const encodedQuery = encodeURIComponent(query); // Encode spaces and special characters
    const url = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&entity=song&limit=1`;
  
    try {
      const response = await fetch(url, {
        mode: 'cors',  // Explicitly set CORS mode
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        previewUrl: data.results?.[0]?.previewUrl,
        debug: {
          url,
          status: response.status,
          resultCount: data.results?.length,
          firstResult: data.results?.[0],
          headers: Object.fromEntries(response.headers)
        }
      };
    } catch (error: any) {
      throw {
        message: `Load failed: ${error?.message || 'Unknown error'}`,
        debug: {
          url,
          error: error?.message,
          type: error?.type,
          name: error?.name
        }
      };
    }
};