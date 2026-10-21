-- =============================================================================
-- SkillVerse AI: Automated Signal Collection Cron Jobs (02_cron_jobs.sql)
-- Activates pg_cron and pg_net to periodically refresh labor market signals
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule Nightly Labor Market Trend Sync
-- Invokes the FastAPI /api/v1/sync-trends endpoint every night at 00:00 UTC
SELECT cron.schedule(
    'sync_market_trends_nightly',
    '0 0 * * *',
    $$
    SELECT net.http_post(
        url := coalesce(current_setting('app.settings.fastapi_url', true), 'https://your-runpod-pod-id.runpod.net/api/v1/sync-trends'),
        headers := '{"Content-Type": "application/json"}'::jsonb
    );
    $$
);
