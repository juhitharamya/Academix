alter table if exists public.evaluations
  add column if not exists semester text not null default '';

drop index if exists evaluations_unique_idx;

create unique index if not exists evaluations_unique_idx
  on public.evaluations (department, branch, regulation, year, semester, section, mid_type, subject_code);
