# Verbalize RAG

Verbalize RAG is a modern, audio-first Retrieval-Augmented Generation (RAG) application. It allows users to have real-time, low-latency voice conversations about their uploaded documents, leveraging the power of Gemini's Multimodal Live API and Pinecone's vector storage.

## Features

*   **Real-time Voice Interface:** Talk naturally to your data using the Gemini Multimodal Live API via WebRTC.
*   **Persistent Knowledge Base:** Documents are processed, embedded, and stored in a **Pinecone** vector database for efficient semantic retrieval.
*   **Multimodal Interaction:** Supports text-based document uploads (PDF, TXT, etc.) and voice-based querying.
*   **Hybrid Architecture:** A React frontend for the user interface and a FastAPI backend for document processing and vector search.
*   **Bilingual Support:** Seamlessly handles English and Hungarian conversations.
*   **Mobile-Ready UI:** Optimized for mobile browsers with safe-area support, touch gesture refinement, and Wake Lock API.

## Project Structure

*   **Frontend:** React + Vite + Tailwind CSS. Handles the WebRTC connection to Gemini and the UI.
*   **Backend:** FastAPI (Python). Manages document indexing, embeddings (Gemini Embedding-001), and Pinecone integration.

## Technologies

*   **AI/ML:** Gemini 2.0 Flash (Multimodal Live API), Google Generative AI Embeddings.
*   **Vector Database:** Pinecone.
*   **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons.
*   **Backend:** Python 3.x, FastAPI, Uvicorn, LangChain / Pinecone SDK.
*   **Communication:** WebRTC for audio streaming.

## Getting Started

### Prerequisites
- Node.js & npm
- Python 3.9+
- Gemini API Key
- Pinecone API Key & Environment

### Backend Setup
1. Navigate to `backend/`
2. Create a virtual environment: `python -m venv .venv`
3. Activate it: `.venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Create a `.env` file with:
   ```env
   PINECONE_API_KEY=your_key
   PINECONE_ENVIRONMENT=your_env
   PINECONE_INDEX_NAME=verbalize-rag
   GOOGLE_API_KEY=your_key
   ```
6. Start the server: `python main.py` (Runs on http://localhost:8000)

### Frontend Setup
1. From the root directory, install dependencies: `npm install`
2. Create a `.env` file in the root with:
   ```env
   VITE_GEMINI_API_KEY=your_key
   ```
3. Start the dev server: `npm run dev` (Runs on http://localhost:3000)

## Development Roadmap

1.  **Phase 1: Hybrid RAG Implementation (In Progress)**
    *   [x] FastAPI backend with Pinecone integration.
    *   [x] Frontend WebRTC tool-call integration for semantic search.
    *   [x] PDF processing and indexing.
2.  **Phase 2: Authentication & Multi-tenancy**
    *   [ ] User accounts (Clerk or Firebase).
    *   [ ] Namespace isolation in Pinecone per user.
3.  **Phase 3: Native Deployment**
    *   [ ] Capacitor integration for iOS/Android.
    *   [ ] Native microphone and background audio support.