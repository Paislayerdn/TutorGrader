BEGIN;

CREATE OR REPLACE FUNCTION public.record_submission_judge_job_failure(
	p_job_id bigint,
	p_worker_id text,
	p_exhausted boolean,
	p_retry_delay_ms integer,
	p_error text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
	v_submission_id uuid;
	v_error text := LEFT(COALESCE(p_error, 'Unknown worker error.'), 12000);
BEGIN
	UPDATE public.submission_judge_queue AS q
	SET status = CASE WHEN p_exhausted THEN 'FAILED' ELSE 'QUEUED' END,
		available_at = CASE WHEN p_exhausted THEN q.available_at
			ELSE now() + make_interval(secs => GREATEST(p_retry_delay_ms, 0)::double precision / 1000) END,
		locked_until = NULL,
		locked_by = NULL,
		last_error = v_error,
		finished_at = CASE WHEN p_exhausted THEN now() ELSE NULL END,
		updated_at = now()
	WHERE q.id = p_job_id
		AND q.locked_by = p_worker_id
		AND q.status = 'RUNNING'
	RETURNING q.submission_id INTO v_submission_id;

	IF p_exhausted AND v_submission_id IS NOT NULL THEN
		UPDATE public.submission AS s
		SET status = 'ERROR', diagnostic = v_error
		WHERE s.id = v_submission_id
			AND s.status IN ('QUEUING', 'EVALUATING');
	END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_submission_judge_job_failure(bigint, text, boolean, integer, text)
	FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_submission_judge_job_failure(bigint, text, boolean, integer, text)
	TO service_role;

COMMIT;
