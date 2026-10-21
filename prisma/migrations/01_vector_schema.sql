-- =============================================================================
-- SkillVerse AI: Supabase pgvector Schema Migration (01_vector_schema.sql)
-- Enables vector extension, creates ESCO roles, SDG targets, and stored procedure
-- =============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. ESCO / Future-Resilient Roles Table
CREATE TABLE IF NOT EXISTS esco_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id text UNIQUE NOT NULL,
    title text NOT NULL,
    title_ms text NOT NULL,
    title_zh text NOT NULL,
    industry text NOT NULL,
    required_skills text[] NOT NULL DEFAULT '{}',
    sdg_alignments jsonb NOT NULL DEFAULT '[]'::jsonb,
    scenario_multipliers jsonb NOT NULL DEFAULT '{"moderate": 1.0, "accelerated_ai": 1.0, "green_economy": 1.0}'::jsonb,
    radar_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1024),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Fast Approximate Nearest Neighbor (ANN) Index using HNSW on role embeddings
CREATE INDEX IF NOT EXISTS esco_roles_embedding_hnsw_idx 
ON esco_roles USING hnsw (embedding vector_cosine_ops);

-- 3. UN Sustainable Development Goals (SDG) 169 Target Vectors Table
CREATE TABLE IF NOT EXISTS sdg_targets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_code text UNIQUE NOT NULL,
    goal_number integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    embedding vector(1024),
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sdg_targets_embedding_hnsw_idx 
ON sdg_targets USING hnsw (embedding vector_cosine_ops);

-- 4. Trend Signals Table
CREATE TABLE IF NOT EXISTS trend_signals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "skillName" text UNIQUE NOT NULL,
    category text NOT NULL,
    "currentWindowC" double precision NOT NULL DEFAULT 0.0,
    "pastWindowC" double precision NOT NULL DEFAULT 0.0,
    "velocityVs" double precision NOT NULL DEFAULT 0.0,
    status text NOT NULL,
    sources jsonb NOT NULL DEFAULT '[]'::jsonb,
    "updatedAt" timestamp with time zone DEFAULT now()
);

-- 5. Stored Procedure: match_roles via HNSW Cosine Similarity
CREATE OR REPLACE FUNCTION match_roles (
    query_embedding vector(1024),
    match_threshold float DEFAULT 0.20,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    role_id text,
    title text,
    title_ms text,
    title_zh text,
    industry text,
    required_skills text[],
    sdg_alignments jsonb,
    scenario_multipliers jsonb,
    radar_requirements jsonb,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        esco_roles.role_id,
        esco_roles.title,
        esco_roles.title_ms,
        esco_roles.title_zh,
        esco_roles.industry,
        esco_roles.required_skills,
        esco_roles.sdg_alignments,
        esco_roles.scenario_multipliers,
        esco_roles.radar_requirements,
        round((1 - (esco_roles.embedding <=> query_embedding))::numeric, 4)::float AS similarity
    FROM esco_roles
    WHERE esco_roles.embedding IS NOT NULL
      AND 1 - (esco_roles.embedding <=> query_embedding) > match_threshold
    ORDER BY esco_roles.embedding <=> query_embedding ASC
    LIMIT match_count;
$$;
