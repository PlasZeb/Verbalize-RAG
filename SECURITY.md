# Security & API Key Best Practices

This application uses the **Gemini Multimodal Live API** via WebSockets for ultra-low latency audio conversations. 

Because of the real-time nature of the audio connection, the application currently connects **directly from the client (browser/phone) to Google's servers**. This means your API Key is technically exposed to the client application.

**To prevent theft and unauthorized usage, you MUST restrict your API Key in the Google Cloud Console.**

## How to Secure Your API Key

Do not rely on "hiding" the key in the code. Instead, tell Google to **only accept requests from your specific app**.

### 1. Go to Google Cloud Console
Navigate to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials).

### 2. Locate your API Key
Select the API Key you are using for this project.

### 3. Apply Application Restrictions

#### For Web Deployment (Vercel)
1. Under "Application restrictions", select **Websites**.
2. Add your Vercel domain under "Website restrictions".
   - Example: `https://your-app-name.vercel.app/*`
   - Example: `https://your-custom-domain.com/*`
   - **Crucial:** Also add `http://localhost:5173/*` (or your local port) if you want to test locally, but remove it for production if you are paranoid about security.

#### For iOS/Android App (Capacitor)
1. **Create a separate API Key** for the mobile app version.
2. Under "Application restrictions", select **iOS apps**.
3. Add your **Bundle ID**.
   - You define this in `capacitor.config.ts` (e.g., `com.verbalize.app`).
4. Repeat for **Android apps** using the package name and SHA-1 certificate fingerprint.

### 4. Apply API Restrictions
1. Under "API restrictions", select **Restrict key**.
2. In the dropdown, select **only** the APIs this key needs:
   - `Generative Language API` (Gemini)
3. Save changes.

---

## Why not use a Backend Proxy?

For text chat, a backend proxy is standard. However, for **Real-time Audio (WebRTC)**:
1. Proxying WebSocket audio adds significant **latency**, destroying the "live" conversational feel.
2. Serverless functions (Vercel) have timeout limits (usually 10-60s), making them unsuitable for maintaining long conversation sessions.

Therefore, the industry standard for client-side low-latency AI is **Client-Side Key + Strict Console Restrictions**.
