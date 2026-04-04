alter table if exists public.student_marks
  add column if not exists assignment_marks jsonb not null default '{}'::jsonb;

alter table if exists public.student_marks
  add column if not exists assignment_total numeric not null default 0;

alter table if exists public.student_marks
  add column if not exists assignment_co_map jsonb not null default '{}'::jsonb;

alter table if exists public.student_marks
  add column if not exists grand_total numeric not null default 0;
