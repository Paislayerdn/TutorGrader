# TutorGrader Phase 0 baseline

This is a current-state baseline extracted from the live Supabase project on 2026-10-19.

Included:
- TutorGrader-owned PostgreSQL enums, tables, constraints, indexes, functions, triggers, views, RLS policies, grants.
- The canonical-content GC Edge Function source.
- A note for the `problem-files` private Storage bucket and the judge pg_cron job.

Not included:
- Application data.
- Supabase-managed schemas/tables.
- Secrets.
- Historical migrations.
- The temporary Phase 0 export tables/migrations.

Deployment prerequisites:
- Supabase/PostgreSQL with the required platform facilities available.
- `tutorgrader_backend` must be provisioned separately.
- The `problem-files` private Storage bucket must be provisioned.
- The `tutorgrader_judge_worker_secret` Vault secret and judge cron job must be configured for the target environment.
