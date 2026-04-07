-- Supabase / Postgres schema for Academix
-- Run this in the Supabase SQL Editor (or via migrations).

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;

-- 1) USERS
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('Admin', 'Faculty', 'HOD', 'ExamBranch')),
  faculty_id text not null unique,
  department text not null,
  email text,
  password text not null,
  status text not null default 'Active' check (status in ('Active', 'Disabled')),
  created_at timestamptz not null default now()
);

-- 2) STUDENTS
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  roll_number text not null,
  student_name text not null,
  department text not null,
  regulation text not null,
  year text not null,
  semester text not null default '',
  section text not null,
  created_at timestamptz not null default now(),
  uploaded_by text,
  uploaded_at timestamptz not null default now(),
  branch text not null default ''
);

create index if not exists students_lookup_idx
  on public.students (department, branch, regulation, year, section);

-- 3) QUESTION_PAPERS
create table if not exists public.question_papers (
  id uuid primary key default gen_random_uuid(),
  faculty_id text not null,
  department text not null,
  regulation text not null,
  year text not null,
  semester text not null,
  mid_type text not null check (mid_type in ('Mid1', 'Mid2', 'Mid I', 'Mid II')),
  subject_name text not null,
  subject_code text not null,
  status text not null default 'Draft' check (
    status in ('Draft', 'Pending HOD Approval', 'Pending Approval', 'Approved', 'Rejected')
  ),
  hod_comments text,
  branch text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists question_papers_filter_idx
  on public.question_papers (department, branch, regulation, year, semester, mid_type, status, created_at desc);

-- 4) QUESTIONS
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.question_papers(id) on delete cascade,
  question_type text not null check (question_type in ('subjective', 'mcq', 'fill_blank')),
  question_text text not null,
  co_number text,
  marks integer not null default 0,
  -- Optional fields used by the current Academix UI
  set_type text,
  btl_level text,
  options jsonb,
  correct_answer text
);

create index if not exists questions_paper_idx on public.questions (paper_id);

-- 5) EVALUATIONS
create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  faculty_id text not null,
  department text not null,
  regulation text not null,
  year text not null,
  semester text not null default '',
  section text not null,
  mid_type text not null check (mid_type in ('Mid1', 'Mid2', 'Mid I', 'Mid II')),
  subject_name text not null,
  subject_code text not null,
  branch text not null default '',
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists evaluations_unique_idx
  on public.evaluations (department, branch, regulation, year, semester, section, mid_type, subject_code);

-- 6) STUDENT_MARKS
create table if not exists public.student_marks (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  roll_number text not null,
  student_name text,
  q1 numeric, q2 numeric, q3 numeric, q4 numeric, q5 numeric, q6 numeric,
  mcq1 numeric, mcq2 numeric, mcq3 numeric, mcq4 numeric, mcq5 numeric,
  mcq6 numeric, mcq7 numeric, mcq8 numeric, mcq9 numeric, mcq10 numeric,
  fb1 numeric, fb2 numeric, fb3 numeric, fb4 numeric, fb5 numeric,
  fb6 numeric, fb7 numeric, fb8 numeric, fb9 numeric, fb10 numeric,
  assignment_marks jsonb not null default '{}'::jsonb,
  assignment_total numeric not null default 0,
  assignment_co_map jsonb not null default '{}'::jsonb,
  grand_total numeric not null default 0,
  total_marks numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.student_marks
  add column if not exists assignment_marks jsonb not null default '{}'::jsonb;

alter table if exists public.student_marks
  add column if not exists assignment_total numeric not null default 0;

alter table if exists public.student_marks
  add column if not exists assignment_co_map jsonb not null default '{}'::jsonb;

alter table if exists public.student_marks
  add column if not exists grand_total numeric not null default 0;

create unique index if not exists student_marks_unique_idx
  on public.student_marks (evaluation_id, roll_number);

-- 6A) EVALUATION_FINAL_MARKS (Mid I + Mid II + PPT consolidated)
create table if not exists public.evaluation_final_marks (
  id uuid primary key default gen_random_uuid(),
  faculty_id text not null,
  department text not null,
  branch text not null default '',
  regulation text not null,
  year text not null,
  semester text not null,
  section text not null,
  subject_name text not null,
  subject_code text not null,
  roll_number text not null,
  student_name text,
  mid1_total numeric not null default 0,
  mid2_total numeric not null default 0,
  ppt_marks numeric not null default 0,
  ppt_max_marks numeric not null default 5,
  final_total numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evaluation_final_marks_filter_idx
  on public.evaluation_final_marks (department, branch, regulation, year, semester, section, subject_code, status);

create unique index if not exists evaluation_final_marks_unique_idx
  on public.evaluation_final_marks (department, branch, regulation, year, semester, section, subject_code, roll_number);

-- 6A) SUBJECT_MASTER (central academic subject catalog)
create table if not exists public.subject_master (
  id uuid primary key default gen_random_uuid(),
  regulation text not null,
  department text not null check (department in ('H&S', 'CSM', 'CSD', 'CSE', 'ECE')),
  branch text not null check (branch in ('CSM', 'CSD', 'CSE', 'ECE')),
  year text not null check (year in ('I', 'II', 'III', 'IV')),
  semester text not null check (semester in ('I', 'II')),
  subject_name text not null,
  subject_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subject_master_hs_year_chk check (
    (department = 'H&S' and year = 'I')
    or (department <> 'H&S' and year in ('II', 'III', 'IV'))
  ),
  constraint subject_master_branch_department_chk check (
    (department = 'H&S' and branch in ('CSM', 'CSD', 'CSE', 'ECE'))
    or (department <> 'H&S' and branch = department)
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subject_master_set_updated_at on public.subject_master;
create trigger subject_master_set_updated_at
before update on public.subject_master
for each row
execute function public.set_updated_at();

create index if not exists subject_master_filter_idx
  on public.subject_master (regulation, department, branch, year, semester, is_active);

create index if not exists subject_master_code_idx
  on public.subject_master (subject_code);

create index if not exists subject_master_name_trgm_idx
  on public.subject_master using gin (subject_name gin_trgm_ops);

create index if not exists subject_master_code_trgm_idx
  on public.subject_master using gin (subject_code gin_trgm_ops);

create unique index if not exists subject_master_unique_idx
  on public.subject_master (regulation, department, branch, year, semester, subject_code);

-- Legacy SUBJECTS table kept for backward compatibility / migration.
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  regulation text not null,
  department text not null,
  branch text not null default '',
  year text,
  semester text not null,
  subject_name text not null,
  subject_code text not null
);

create index if not exists subjects_filter_idx
  on public.subjects (regulation, department, branch, year, semester);

create unique index if not exists subjects_unique_idx
  on public.subjects (regulation, department, branch, year, semester, subject_code);

-- 7) FACULTY_SUBJECTS (Admin assigns subjects to faculty)
create table if not exists public.faculty_subjects (
  id uuid primary key default gen_random_uuid(),
  faculty_id text not null,
  faculty_name text not null,
  department text not null,
  branch text not null default '',
  subject_master_id uuid references public.subject_master(id) on delete set null,
  regulation text not null,
  year text not null,
  semester text not null,
  subject_name text not null,
  subject_code text not null,
  created_at timestamptz not null default now()
);

-- Backfill/migrate safely if the table already exists.
alter table if exists public.faculty_subjects
  add column if not exists branch text not null default '';

alter table if exists public.faculty_subjects
  add column if not exists subject_master_id uuid references public.subject_master(id) on delete set null;

create index if not exists faculty_subjects_faculty_idx
  on public.faculty_subjects (faculty_id, created_at desc);

create index if not exists faculty_subjects_filter_idx
  on public.faculty_subjects (department, branch, regulation, year, semester, subject_code);

-- Prevent duplicate assignments for the same faculty+offering.
create unique index if not exists faculty_subjects_unique_idx
  on public.faculty_subjects (faculty_id, branch, regulation, year, semester, subject_code);
