export const searchItunes = async (query: string) => {
    const encodedQuery = encodeURIComponent(query); // Encode spaces and special characters
    const url = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&entity=song&limit=1`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return data.results[0]; // Return the closest matching result
      }
      return null; // No results found
    } catch (error) {
      console.error("Error searching iTunes:", error);
      return null;
    }
  };