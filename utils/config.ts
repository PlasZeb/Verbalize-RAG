export const config = {
  get apiKey() {
    const key = process.env.API_KEY;
    // In production, we might fetch this from a secure endpoint if using a token exchange pattern,
    // but for low-latency WebSocket connections, we often use a restricted client-side key.
    return key || '';
  },
  
  // Validation helper
  get isValid() {
    return !!process.env.API_KEY && process.env.API_KEY.length > 0;
  }
};