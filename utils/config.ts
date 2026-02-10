export const config = {
  get apiKey() {
    return (import.meta as any).env.VITE_API_KEY || '';
  },
  
  // A backend végpontod, ami a Pinecone lekérdezéseket kezeli
  get searchApiEndpoint() {
    return (import.meta as any).env.VITE_SEARCH_API_ENDPOINT || 'http://localhost:8000/api/search';
  },

  get isValid() {
    const key = (import.meta as any).env.VITE_API_KEY;
    return !!key && key.length > 0;
  }
};