# Changelog

## [1.2.2] - 2024-05-20

### Fixed
- **Session Restart Bug:** Fixed a critical issue where restarting the session caused silent audio output. This was due to the audio scheduling cursor (`nextStartTime`) not being reset, causing new audio chunks to be scheduled for a future time relative to the old session's duration.
- **Session Cleanup:** Implemented explicit `session.close()` in the disconnect logic to ensure the backend connection is properly terminated.

## [1.2.1] - 2024-05-20

### Fixed
- **Transcript Duplication:** Fixed a bug where final `turnComplete` events from the API caused transcript messages to be duplicated in the UI. The logic now correctly identifies and updates pending messages from the same sender, even if they are not the most recent message in the list.

## [1.2.0] - 2024-05-20

### Added
- **Language Selector:** Users can now explicitly select between English and Hungarian. The AI's system instruction is dynamically updated to enforce the selected language.
- **Live Transcription:** Added a real-time chat interface displaying the conversation history using `inputAudioTranscription` and `outputAudioTranscription` from the Gemini Live API.
- Refined UI layout to accommodate the transcript panel.

## [1.1.0] - 2024-05-20

### Added
- **PDF Support:** Integrated `pdfjs-dist` to extract text from uploaded PDF files directly in the browser. Users can now discuss the content of PDF documents.
- Added loading state indicator during file processing.

## [1.0.0] - 2024-05-20

### Added
- Initial project structure with React + TypeScript.
- Integrated `@google/genai` SDK for Gemini Live API access.
- Implemented `LiveClient` service for handling WebRTC audio streaming (Input/Output).
- Created `AudioUtils` for PCM/Base64 conversion and AudioBuffer management.
- Added `Visualizer` component using HTML5 Canvas for real-time audio feedback.
- Added `FileUploader` component handling text-based file parsing.
- Implemented Context Injection strategy to simulate RAG behavior within the system instruction.
- styled the application with Tailwind CSS (Dark Mode/Glassmorphism).
- Added Bilingual support (English/Hungarian) in system prompts.