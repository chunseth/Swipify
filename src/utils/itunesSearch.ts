export const searchItunes = async (query: string) => {
    const encodedQuery = encodeURIComponent(query);
    
    // Try using https specifically and adding more query parameters
    const url = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&entity=song&limit=1&country=US&explicit=yes`;
  
    try {
      // Add more comprehensive CORS and security headers
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'application/json',
          'Origin': window.location.origin,
          'User-Agent': navigator.userAgent,
        },
        referrerPolicy: 'no-referrer-when-downgrade'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.results?.length) {
        throw new Error('No results found');
      }
      
      return {
        previewUrl: data.results[0].previewUrl,
        debug: {
          url,
          status: response.status,
          resultCount: data.results.length,
          firstResult: data.results[0],
          headers: Object.fromEntries(response.headers),
          origin: window.location.origin,
          userAgent: navigator.userAgent
        }
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      throw {
        message: `iTunes search failed: ${errorMessage}`,
        debug: {
          url,
          originalError: errorMessage,
          type: error.type || 'unknown',
          name: error.name || 'unknown',
          origin: window.location.origin,
          userAgent: navigator.userAgent
        }
      };
    }
};