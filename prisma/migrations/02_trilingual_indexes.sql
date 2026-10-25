-- =============================================================================
-- SkillVerse AI: Trilingual Database Optimization & Indexes (02_trilingual_indexes.sql)
-- Adds B-Tree and GIN indexes across English, Malay (ms), and Simplified Chinese (zh)
-- =============================================================================

-- 1. Ensure trilingual columns exist on esco_roles
ALTER TABLE esco_roles 
ADD COLUMN IF NOT EXISTS required_skills_ms text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS required_skills_zh text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS required_skills_localized jsonb DEFAULT '{}'::jsonb;

-- 2. B-Tree Indexes for Role Titles across all three languages
CREATE INDEX IF NOT EXISTS idx_esco_roles_title_en ON esco_roles (title);
CREATE INDEX IF NOT EXISTS idx_esco_roles_title_ms ON esco_roles (title_ms);
CREATE INDEX IF NOT EXISTS idx_esco_roles_title_zh ON esco_roles (title_zh);

-- 3. GIN (Generalized Inverted Index) for ultra-fast array matching on Required Skills
CREATE INDEX IF NOT EXISTS idx_esco_roles_skills_en ON esco_roles USING GIN (required_skills);
CREATE INDEX IF NOT EXISTS idx_esco_roles_skills_ms ON esco_roles USING GIN (required_skills_ms);
CREATE INDEX IF NOT EXISTS idx_esco_roles_skills_zh ON esco_roles USING GIN (required_skills_zh);

-- 4. B-Tree Index for Trend Signals fast-path lookup
CREATE INDEX IF NOT EXISTS idx_trend_signals_skill_name ON trend_signals ("skillName");
