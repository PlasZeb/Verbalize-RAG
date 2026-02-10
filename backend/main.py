import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pinecone import Pinecone
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Configure CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Clients
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "verbalize-rag")

if not PINECONE_API_KEY or not GOOGLE_API_KEY:
    print("WARNING: PINECONE_API_KEY or GOOGLE_API_KEY is missing from environment variables.")

pc = Pinecone(api_key=PINECONE_API_KEY)

# Create index if it doesn't exist
existing_indexes = [index_info["name"] for index_info in pc.list_indexes()]
if PINECONE_INDEX_NAME not in existing_indexes:
    print(f"Creating index: {PINECONE_INDEX_NAME}")
    from pinecone import ServerlessSpec
    pc.create_index(
        name=PINECONE_INDEX_NAME,
        dimension=768, # Dimension for models/embedding-001
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )

index = pc.Index(PINECONE_INDEX_NAME)
genai.configure(api_key=GOOGLE_API_KEY)

class SearchRequest(BaseModel):
    query: str

class SearchResponse(BaseModel):
    text: str

@app.post("/api/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    try:
        # 1. Generate embedding for the query
        result = genai.embed_content(
            model="models/embedding-001",
            content=request.query,
            task_type="retrieval_query"
        )
        query_embedding = result['embedding']

        # 2. Query Pinecone
        query_response = index.query(
            vector=query_embedding,
            top_k=3,
            include_metadata=True
        )

        # 3. Consolidate results
        if not query_response['matches']:
            return SearchResponse(text="Nincs találat a dokumentumban.")

        # Combine the top results into a single context string
        context_parts = []
        for match in query_response['matches']:
            if 'text' in match['metadata']:
                context_parts.append(match['metadata']['text'])
        
        combined_text = "\n\n".join(context_parts)
        return SearchResponse(text=combined_text)

    except Exception as e:
        print(f"Error during search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/session-config")
async def get_session_config():
    # In the future, add user authentication check here
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="Google API Key not configured on server")
    
    return {
        "apiKey": GOOGLE_API_KEY,
        "model": "gemini-2.0-flash-exp", # Ensure this matches your frontend
        "voice": "Puck" # Optional: default voice
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
