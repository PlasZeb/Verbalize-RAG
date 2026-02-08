export const config = {
  get apiKey() {
    return process.env.API_KEY || '';
  },
  
  // A backend végpontod, ami a Pinecone lekérdezéseket kezeli
  get searchApiEndpoint() {
    return process.env.SEARCH_API_ENDPOINT || '/api/search';
  },

  get isValid() {
    return !!process.env.API_KEY && process.env.API_KEY.length > 0;
  }
};