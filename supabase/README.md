# Supabase database

Apply every SQL file in 'migrations/' in filename order to a new project. The first migration is the TutorGrader baseline schema; later migrations add executor priority, submission status semantics and queue behavior, and exhausted-job finalization.

Deployment prerequisites:

- Provision the 'tutorgrader_backend' database role and private 'problem-files' Storage bucket.
- Configure the 'tutorgrader_judge_worker_secret' Vault secret and the judge 'pg_cron' job for the target environment.
- Review the baseline migration's cron example before use: its example command contains a production URL that must be replaced with the target deployment URL.

The application connects through the Supabase service role and relies on server-side authorization checks. Never expose the service-role key in client code.
