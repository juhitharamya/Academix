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
