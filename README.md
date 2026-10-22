
# TutorGrader

TutorGrader is a programming assignment and submission grader for course use.
Targeting private use, user-centered design, and an object-oriented architecture.

## Tech Stack

**Frontend:** [Next.js 16](https://nextjs.org/docs/app), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/docs/), [CSS Modules](https://nextjs.org/docs/app/getting-started/css)

**Backend:** [Next.js App Router](https://nextjs.org/docs/app), [Node.js](https://nodejs.org/)

**Deployment:** [Vercel](https://vercel.com/)

**Database and file storage:** [Supabase](https://supabase.com/) ([PostgreSQL](https://www.postgresql.org/) and [Storage](https://supabase.com/docs/guides/storage)), accessed through [supabase-js](https://supabase.com/docs/reference/javascript/introduction)

**Authentication and password hashing:** [jose](https://github.com/panva/jose) and [argon2](https://github.com/ranisalt/node-argon2)

**Code execution:** [OnlineCompiler](https://onlinecompiler.io/) and [Wandbox](https://wandbox.org/)

**AI:** [ChatGPT 6 Instant](https://help.openai.com/en/articles/12677804-what-is-chatgpt-faq); [Claude Sonnet 5.5](https://www.anthropic.com/claude); [Codex: 6 Luna](https://openai.com/codex/)

## Environment Variables

This project requires the following environment variables in `.env.local`:

`NEXT_PUBLIC_SUPABASE_URL`

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY`

`AUTH_SECRET`

`JUDGE_WORKER_SECRET`

`ONLINECOMPILER_API_KEY`


## Appendix

This is a coursework website for Wongsathon's KMUTNB OOP 1/69 course.

See [Documentation](https://drive.google.com/file/d/1RPJ6h8Bx2LXqqjeB6Nk2pWsYOLTH3Jtb/view?usp=drive_link) (for coursework).


## Lessons Learned

- OOP is quite useful for code reuse and easier code management.

- Website creation is difficult.

- Make best use of your limited time and plan it well.

## Acknowledgements

Special Thanks: my OOP instructor, my family, the testers/actual users, my lovely girlfriend

..and a huge credit to [myself](https://github.com/Paislayerdn), thank you.
