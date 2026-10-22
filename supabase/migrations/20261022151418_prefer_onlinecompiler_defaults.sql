BEGIN;

-- OnlineCompiler should be used for each language it supports. Keep Wandbox
-- available for languages without an OnlineCompiler mapping.
UPDATE public.executor
SET name = 'OnlineCompiler.io',
	priority = 1,
	enabled = true
WHERE code = 'onlinecompiler';

UPDATE public.executor
SET priority = 2
WHERE code = 'wandbox';

UPDATE public.executor_language AS online
SET enabled = true,
	is_default = true
FROM public.executor AS e
WHERE online.executor_id = e.id
	AND e.code = 'onlinecompiler';

-- JavaScript was present in TutorGrader but did not yet have an
-- OnlineCompiler compiler mapping.
INSERT INTO public.executor_language (
	executor_id,
	language_id,
	compiler_id,
	enabled,
	runtime_version,
	is_default
)
SELECT e.id, l.id, 'nodejs-24', true, '24', true
FROM public.executor AS e
CROSS JOIN public.language AS l
WHERE e.code = 'onlinecompiler'
	AND lower(trim(l.name)) = 'javascript'
ON CONFLICT (executor_id, language_id, compiler_id) DO UPDATE
SET enabled = true,
	runtime_version = EXCLUDED.runtime_version,
	is_default = true;

-- Leave Wandbox enabled as the fallback for languages that OnlineCompiler
-- does not support, such as the current Lua language entry.
UPDATE public.executor_language AS wandbox
SET is_default = false
FROM public.executor AS e
WHERE wandbox.executor_id = e.id
	AND e.code = 'wandbox'
	AND EXISTS (
		SELECT 1
		FROM public.executor_language AS online
		JOIN public.executor AS online_executor
			ON online_executor.id = online.executor_id
		WHERE online_executor.code = 'onlinecompiler'
			AND online.enabled = true
			AND online.is_default = true
			AND online.language_id = wandbox.language_id
	);

COMMIT;
