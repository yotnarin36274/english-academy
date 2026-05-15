# English Academy — Placement Test App

A web application for a Thai English tutoring academy. Students visit on their phones, select their grade group, enter their name, and complete a placement test. The teacher watches a live dashboard where each submission appears instantly with full diagnostic feedback, skill breakdowns, and one-tap scripts for parent conversations and LINE reports.

---

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the student home page.
Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for the teacher dashboard.

---

## Environment Variables

Create a `.env.local` file in the project root (already present as a template):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never commit `.env.local` — it is already listed in `.gitignore`.

---

## Supabase Setup

### 1. Create the `submissions` table

Run this SQL in your Supabase project's SQL editor:

```sql
create table submissions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  session_date date not null,
  group_key text not null,
  nickname text not null,
  full_name text,
  grade text not null,
  answers jsonb not null,
  score integer not null,
  total integer not null,
  level text not null,
  wrong_questions integer[] not null
);
```

### 2. Enable Realtime

In the Supabase dashboard: **Database → Replication → Tables** → enable the `submissions` table.

---

## Deploying to Vercel

1. Push this repository to GitHub.
2. Connect the repo in [Vercel](https://vercel.com/new).
3. Add the two environment variables in **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Vercel will auto-deploy on every push to `main`.

---

## URLs

| URL | Who uses it |
|---|---|
| `/` | Students — group selection and name entry |
| `/test/[group]` | Students — the actual test |
| `/done` | Students — thank you screen |
| `/dashboard` | Teacher — live results (keep this URL private) |

---

## Adding a New Test Group

All test content lives in `src/lib/testData.ts`. To add a group:

1. Add a new `GroupKey` to the `GroupKey` union type.
2. Add a new entry to the `GROUPS` object following the same structure: `label`, `grades`, `totalQuestions`, `timeMinutes`, `questions`, `answerKey`, `levelCutoffs`, `skills`, and `skillFeedback`.
3. Add a style entry for the new group key in `GROUP_STYLES` inside `src/app/page.tsx`.
