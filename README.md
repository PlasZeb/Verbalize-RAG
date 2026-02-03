# Verbalize RAG

Verbalize RAG is a modern, audio-first web application that allows users to have a real-time voice conversation about their documents. By uploading a text-based file (Article, Book chapter, Code), users can interact with the content using natural language in English or Hungarian.

It leverages the **Gemini Multimodal Live API** for low-latency audio interaction and massive context caching.

## Features

*   **Real-time Audio Conversation:** Talk naturally to the AI with low latency via WebRTC.
*   **Document Context (Frontend RAG):** Upload text files (.txt, .md, .json, .csv) and the AI will reference them instantly.
*   **Bilingual Support:** Automatically detects and speaks English or Hungarian based on user input.
*   **Modern UI:** A clean, dark-mode aesthetic built with Tailwind CSS.
*   **Audio Visualizer:** Real-time feedback for audio input and output.

## Setup

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Set your API Key in environment variables or hardcode (for testing) in `services/liveClient.ts` via `process.env.API_KEY`.
4.  Run: `npm start`

## Technologies

*   React 18 + TypeScript
*   Tailwind CSS
*   @google/genai SDK (Gemini 2.5 Flash)
*   WebRTC / AudioContext API