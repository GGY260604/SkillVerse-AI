-- =============================================================================
-- SkillVerse AI: Supabase pgvector Schema Migration (01_vector_schema.sql)
-- Enables vector extension and creates tables for ESCO roles, SDG targets, and user plans.
-- =============================================================================

-- 1. Enable the pgvector extension to store dense 1024-dim representations
create extension if not exists vector;

-- 2. ESCO / Future-Resilient Roles Table
create table if not exists esco_roles (
    id uuid primary key default gen_random_uuid(),
    role_id text unique not null,
    title text not null,
    title_ms text not null,
    title_zh text not null,
    industry text not null,
    required_skills text[] not null default '{}',
    sdg_alignments jsonb not null default '[]'::jsonb,
    scenario_multipliers jsonb not null default '{"moderate": 1.0, "accelerated_ai": 1.0, "green_economy": 1.0}'::jsonb,
    radar_requirements jsonb not null default '{}'::jsonb,
    embedding vector(1024),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Fast Approximate Nearest Neighbor (ANN) Index using HNSW on role embeddings
create index if not exists esco_roles_embedding_hnsw_idx 
on esco_roles using hnsw (embedding vector_cosine_ops);

-- 3. UN Sustainable Development Goals (SDG) 169 Target Vectors Table
create table if not exists sdg_targets (
    id uuid primary key default gen_random_uuid(),
    target_code text unique not null, -- e.g. "SDG 4.4", "SDG 8.2", "SDG 9.4"
    goal_number integer not null,     -- 1 to 17
    title text not null,
    description text not null,
    embedding vector(1024),
    created_at timestamp with time zone default now()
);

create index if not exists sdg_targets_embedding_hnsw_idx 
on sdg_targets using hnsw (embedding vector_cosine_ops);

-- 4. User Assessments & Saved Career Roadmaps
create table if not exists user_assessments (
    id uuid primary key default gen_random_uuid(),
    assessment_id text unique not null,
    session_id text not null,
    user_id uuid references auth.users(id) on delete set null,
    macro_scenario text not null default 'moderate',
    locale text not null default 'en',
    profile_payload jsonb not null,
    analysis_results jsonb not null,
    created_at timestamp with time zone default now()
);

create index if not exists user_assessments_session_idx on user_assessments (session_id);
create index if not exists user_assessments_user_idx on user_assessments (user_id);

-- 5. Stored Procedure: match_roles via Cosine Similarity
create or replace function match_roles (
    query_embedding vector(1024),
    match_threshold float default 0.20,
    match_count int default 5
)
returns table (
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
language sql stable
as $$
    select
        esco_roles.role_id,
        esco_roles.title,
        esco_roles.title_ms,
        esco_roles.title_zh,
        esco_roles.industry,
        esco_roles.required_skills,
        esco_roles.sdg_alignments,
        esco_roles.scenario_multipliers,
        esco_roles.radar_requirements,
        round((1 - (esco_roles.embedding <=> query_embedding))::numeric, 4)::float as similarity
    from esco_roles
    where esco_roles.embedding is not null
      and 1 - (esco_roles.embedding <=> query_embedding) > match_threshold
    order by esco_roles.embedding <=> query_embedding asc
    limit match_count;
$$;
