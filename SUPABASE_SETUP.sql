-- ============================================================
-- ENG SPARK — Homework & Progress Tracking System
-- Run this in Supabase SQL Editor
-- ============================================================

-- Students table
create table if not exists students (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  student_code text unique not null,
  nickname text not null,
  full_name text,
  grade text not null,
  group_key text not null,
  parent_line_notify_token text,
  parent_token uuid default gen_random_uuid() unique not null,
  notes text,
  is_active boolean default true
);

-- Assignments table
create table if not exists assignments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  title text not null,
  description text,
  due_date date,
  target_groups text[] default '{}',
  max_score integer default 100,
  is_active boolean default true
);

-- Homework submissions table
create table if not exists homework_submissions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  student_id uuid references students(id) on delete cascade not null,
  assignment_id uuid references assignments(id) on delete cascade not null,
  image_urls text[] not null default '{}',
  note text,
  status text not null default 'pending',
  submitted_at timestamptz default now(),
  unique(student_id, assignment_id)
);

-- Feedback table
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  submission_id uuid references homework_submissions(id) on delete cascade not null unique,
  student_id uuid references students(id) on delete cascade not null,
  assignment_id uuid references assignments(id) on delete cascade not null,
  score integer,
  max_score integer not null default 100,
  comment text,
  reviewed_at timestamptz default now()
);

-- Enable Realtime on new tables
-- Go to Supabase Dashboard → Database → Replication → enable for:
-- homework_submissions, feedback

-- ============================================================
-- Storage: Create bucket "homework-images"
-- Go to Storage → New Bucket → Name: homework-images → Public: ON
-- ============================================================

-- RLS: Allow all (teacher URL is kept private — same pattern as /dashboard)
alter table students enable row level security;
alter table assignments enable row level security;
alter table homework_submissions enable row level security;
alter table feedback enable row level security;

create policy "public read students" on students for select using (true);
create policy "public insert students" on students for insert with check (true);
create policy "public update students" on students for update using (true);

create policy "public read assignments" on assignments for select using (true);
create policy "public insert assignments" on assignments for insert with check (true);
create policy "public update assignments" on assignments for update using (true);
create policy "public delete assignments" on assignments for delete using (true);

create policy "public read submissions" on homework_submissions for select using (true);
create policy "public insert submissions" on homework_submissions for insert with check (true);
create policy "public update submissions" on homework_submissions for update using (true);

create policy "public read feedback" on feedback for select using (true);
create policy "public insert feedback" on feedback for insert with check (true);
create policy "public update feedback" on feedback for update using (true);

-- Storage policy (allow public upload/read)
-- Run in SQL editor:
create policy "public read homework images"
  on storage.objects for select
  using (bucket_id = 'homework-images');

create policy "public upload homework images"
  on storage.objects for insert
  with check (bucket_id = 'homework-images');
