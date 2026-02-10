// Dynamic configuration that can be updated from the backend
let dynamicApiKey = (import.meta as any).env.VITE_API_KEY || '';

export const config = {
  get apiKey() {
    return dynamicApiKey || (import.meta as any).env.VITE_API_KEY || '';
  },
  
  set apiKey(value: string) {
    dynamicApiKey = value;
  },
  
  get searchApiEndpoint() {
    return (import.meta as any).env.VITE_SEARCH_API_ENDPOINT || 'http://localhost:8000/api/search';
  },

  get sessionConfigEndpoint() {
    return (import.meta as any).env.VITE_SESSION_CONFIG_ENDPOINT || 'http://localhost:8000/api/session-config';
  },

  get isValid() {
    return !!this.apiKey && this.apiKey.length > 0;
  }
};
