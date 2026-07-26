-- Migration: 20260726000000_ai_rate_limits.sql
-- Description: Per-user rate limiting for the Azure Foundry-backed edge functions.
--
-- Edge functions run across many short-lived isolates that share no memory, so an
-- in-process counter cannot bound spend. The counters therefore live in Postgres
-- and are incremented atomically through consume_ai_rate_limit().

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  user_id UUID NOT NULL,
  bucket TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket)
);

-- Only the service role (which bypasses RLS) and the SECURITY DEFINER RPC below
-- touch this table. Enabling RLS with no policies denies every anon/authenticated
-- client by default, so a user cannot read or reset their own counter.
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomically record one request against (_user_id, _bucket) and report whether it
-- is within budget. The window is a simple fixed window: once it expires, the
-- counter resets to 1 on the next call.
CREATE OR REPLACE FUNCTION public.consume_ai_rate_limit(
  _user_id UUID,
  _bucket TEXT,
  _limit INT,
  _window_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now TIMESTAMPTZ := now();
  _win_start TIMESTAMPTZ;
  _count INT;
BEGIN
  INSERT INTO public.ai_rate_limits AS rl (user_id, bucket, window_start, request_count)
  VALUES (_user_id, _bucket, _now, 1)
  ON CONFLICT (user_id, bucket) DO UPDATE
  SET
    -- In a DO UPDATE, the table alias refers to the pre-existing row, so both
    -- expressions below test the same (old) window_start.
    window_start = CASE
      WHEN rl.window_start < _now - make_interval(secs => _window_seconds)
      THEN _now
      ELSE rl.window_start
    END,
    request_count = CASE
      WHEN rl.window_start < _now - make_interval(secs => _window_seconds)
      THEN 1
      ELSE rl.request_count + 1
    END
  RETURNING rl.window_start, rl.request_count INTO _win_start, _count;

  RETURN jsonb_build_object(
    'allowed', _count <= _limit,
    'count', _count,
    'limit', _limit,
    'retry_after_seconds',
      GREATEST(0, _window_seconds - EXTRACT(EPOCH FROM (_now - _win_start))::INT)
  );
END;
$$;

-- The RPC is invoked with the service-role key from edge functions only.
REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(UUID, TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(UUID, TEXT, INT, INT) FROM anon;
REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(UUID, TEXT, INT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_rate_limit(UUID, TEXT, INT, INT) TO service_role;
