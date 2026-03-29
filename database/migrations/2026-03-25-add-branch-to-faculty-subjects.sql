alter table if exists public.faculty_subjects
  add column if not exists branch text not null default '';

create index if not exists faculty_subjects_filter_idx
  on public.faculty_subjects (department, branch, regulation, year, semester, subject_code);

create unique index if not exists faculty_subjects_unique_idx
  on public.faculty_subjects (faculty_id, branch, regulation, year, semester, subject_code);
