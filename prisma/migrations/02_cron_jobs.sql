-- =============================================================================
-- SkillVerse AI: Automated Signal Collection Cron Jobs (02_cron_jobs.sql)
-- Activates pg_cron and pg_net to periodically refresh labor market signals
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule Nightly Labor Market Trend Sync
-- Invokes the Render FastAPI /api/v1/sync-trends endpoint every midnight at 12:00 AM Malaysia Time (16:00 UTC)
-- Configured with 180,000ms (3 minutes) timeout to accommodate Render cold sleep wakeups
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync_market_trends_nightly') THEN
        PERFORM cron.unschedule('sync_market_trends_nightly');
    END IF;
END $$;

SELECT cron.schedule(
    'sync_market_trends_nightly',
    '0 16 * * *',
    $$
    SELECT net.http_post(
        url := 'https://sdc-hackathon-2026.onrender.com/api/v1/sync-trends',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 180000
    );
    $$
);
