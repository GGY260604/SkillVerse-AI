-- =============================================================================
-- SkillVerse AI: Automated Signal Collection Cron Jobs (02_cron_jobs.sql)
-- Activates pg_cron and pg_net to periodically refresh labor market signals
-- from open registries (ArXiv cs.AI and RemoteOK).
-- =============================================================================

-- 1. Enable pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Schedule Nightly Labor Market Trend Sync
-- Invokes the FastAPI /api/v1/sync-trends endpoint every night at 00:00 UTC
-- Replace the URL with your deployed RunPod / production URL or environment secret.
select cron.schedule(
    'sync_market_trends_nightly',
    '0 0 * * *',
    $$
    select net.http_post(
        url := coalesce(current_setting('app.settings.fastapi_url', true), 'https://your-runpod-pod-id.runpod.net/api/v1/sync-trends'),
        headers := '{"Content-Type": "application/json"}'::jsonb
    );
    $$
);
