BEGIN;

LOCK TABLE public.submission IN ACCESS EXCLUSIVE MODE;

CREATE TYPE public.submission_status_v2 AS ENUM (
	'QUEUING',
	'EVALUATING',
	'COMPLETED',
	'INCOMPLETE',
	'ERROR'
);

ALTER TABLE public.submission
	ADD COLUMN status_v2 public.submission_status_v2;

UPDATE public.submission AS s
SET status_v2 = CASE s.status::text
	WHEN 'PENDING' THEN 'QUEUING'::public.submission_status_v2
	WHEN 'COMPILING' THEN 'EVALUATING'::public.submission_status_v2
	WHEN 'TESTING' THEN 'EVALUATING'::public.submission_status_v2
	WHEN 'COMPLETED' THEN CASE
		WHEN EXISTS (
			SELECT 1
			FROM public.test_result AS tr
			WHERE tr.submission_id = s.id
				AND tr.status IN ('COMPILE_ERROR', 'PROVIDER_ERROR', 'RUNTIME_ERROR')
		) THEN 'ERROR'::public.submission_status_v2
		WHEN EXISTS (
			SELECT 1
			FROM public.test_result AS tr
			WHERE tr.submission_id = s.id
				AND tr.status IN ('TIME_LIMIT', 'MEMORY_LIMIT')
		) THEN 'INCOMPLETE'::public.submission_status_v2
		ELSE 'COMPLETED'::public.submission_status_v2
	END
	ELSE 'ERROR'::public.submission_status_v2
END;

ALTER TABLE public.submission
	ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.submission
	DROP COLUMN status;

ALTER TABLE public.submission
	RENAME COLUMN status_v2 TO status;

ALTER TABLE public.submission
	ALTER COLUMN status SET NOT NULL,
	ALTER COLUMN status SET DEFAULT 'QUEUING';

DROP TYPE public.submission_status;
ALTER TYPE public.submission_status_v2 RENAME TO submission_status;

CREATE UNIQUE INDEX submission_one_in_progress_per_user_problem_idx
	ON public.submission (user_id, problem_id)
	WHERE status IN ('QUEUING', 'EVALUATING');

CREATE OR REPLACE FUNCTION public.claim_submission_judge_jobs(
	p_worker_id text,
	p_batch_size integer DEFAULT 1
)
RETURNS TABLE(id bigint, submission_id uuid, attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
	IF p_worker_id IS NULL OR length(trim(p_worker_id)) = 0 THEN
		RAISE EXCEPTION 'Worker ID is required';
	END IF;

	IF p_batch_size < 1 OR p_batch_size > 5 THEN
		RAISE EXCEPTION 'Batch size must be between 1 and 5';
	END IF;

	WITH exhausted AS (
		UPDATE public.submission_judge_queue AS q
		SET status = 'FAILED',
			locked_until = NULL,
			locked_by = NULL,
			last_error = COALESCE(
				q.last_error,
				'Worker lease expired after the retry limit.'
			),
			finished_at = now(),
			updated_at = now()
		WHERE q.status = 'RUNNING'
			AND q.locked_until < now()
			AND q.attempts >= 5
		RETURNING q.submission_id, q.last_error
	)
	UPDATE public.submission AS s
	SET status = 'ERROR',
		diagnostic = LEFT(exhausted.last_error, 12000)
	FROM exhausted
	WHERE s.id = exhausted.submission_id
		AND s.status IN ('QUEUING', 'EVALUATING');

	RETURN QUERY
	WITH candidates AS (
		SELECT q.id
		FROM public.submission_judge_queue AS q
		WHERE (
			(q.status = 'QUEUED' AND q.available_at <= now())
			OR (q.status = 'RUNNING' AND q.locked_until < now())
		)
		AND q.attempts < 5
		ORDER BY q.available_at, q.id
		FOR UPDATE SKIP LOCKED
		LIMIT p_batch_size
	),
	claimed AS (
		UPDATE public.submission_judge_queue AS q
		SET status = 'RUNNING',
			attempts = q.attempts + 1,
			locked_until = now() + interval '10 minutes',
			locked_by = p_worker_id,
			updated_at = now(),
			last_error = NULL
		FROM candidates AS c
		WHERE q.id = c.id
		RETURNING q.id, q.submission_id, q.attempts
	)
	SELECT claimed.id, claimed.submission_id, claimed.attempts
	FROM claimed;
END;
$function$;

COMMIT;
