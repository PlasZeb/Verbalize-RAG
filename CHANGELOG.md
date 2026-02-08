# Changelog

## [1.5.0] - 2024-05-22
### Added
- **Function Calling RAG**: Implemented Gemini Live Tool Use for document retrieval.
- **Search Feedback UI**: Visual indicators for when the AI is querying the knowledge base.
- **Pinecone Architecture**: Structured `liveClient.ts` to handle external vector database lookups via tools.
### Refined
- Replaced direct context injection with on-demand retrieval for better scalability.
- Improved session stability during tool execution.

## [1.4.0] - 2024-05-21
- Initial Gemini Live API RAG release.