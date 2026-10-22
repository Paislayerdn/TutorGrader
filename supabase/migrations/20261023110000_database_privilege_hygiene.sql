BEGIN;

REVOKE REFERENCES, TRIGGER, TRUNCATE ON TABLE public.submission_compile_error
	FROM anon, authenticated;
REVOKE REFERENCES, TRIGGER, TRUNCATE ON TABLE public.problem_list_view
	FROM anon, authenticated;

ALTER VIEW public.app_user_view SET (security_invoker = true);

COMMIT;
