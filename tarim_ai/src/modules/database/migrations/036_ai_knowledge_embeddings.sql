-- 036_ai_knowledge_embeddings

CREATE TABLE IF NOT EXISTS ai_knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL, -- e.g. 'crop', 'soil', 'weather'
    source_id VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- Assuming OpenAI text-embedding-ada-002 dimensions
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an HNSW index for fast nearest-neighbor search
CREATE INDEX IF NOT EXISTS ai_knowledge_embeddings_idx ON ai_knowledge_embeddings USING hnsw (embedding vector_cosine_ops);
