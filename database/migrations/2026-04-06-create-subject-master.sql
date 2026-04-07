create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;

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

alter table if exists public.faculty_subjects
  add column if not exists subject_master_id uuid references public.subject_master(id) on delete set null;

update public.faculty_subjects
set branch = upper(department)
where coalesce(branch, '') = ''
  and upper(department) in ('CSM', 'CSD', 'CSE', 'ECE');

insert into public.subject_master (
  regulation,
  department,
  branch,
  year,
  semester,
  subject_name,
  subject_code,
  is_active
)
select distinct
  upper(trim(regulation)) as regulation,
  case
    when upper(trim(department)) = 'H&S' then 'H&S'
    else upper(trim(department))
  end as department,
  case
    when upper(trim(department)) = 'H&S' then upper(trim(coalesce(nullif(branch, ''), '')))
    else upper(trim(coalesce(nullif(branch, ''), department)))
  end as branch,
  case
    when upper(trim(department)) = 'H&S' then 'I'
    else upper(trim(coalesce(nullif(year, ''), 'II')))
  end as year,
  case
    when upper(trim(semester)) in ('SEM I', 'SEMESTER I') then 'I'
    when upper(trim(semester)) in ('SEM II', 'SEMESTER II') then 'II'
    else upper(trim(semester))
  end as semester,
  trim(subject_name) as subject_name,
  upper(trim(subject_code)) as subject_code,
  true as is_active
from public.subjects
where trim(coalesce(regulation, '')) <> ''
  and trim(coalesce(department, '')) <> ''
  and trim(coalesce(subject_name, '')) <> ''
  and trim(coalesce(subject_code, '')) <> ''
on conflict (regulation, department, branch, year, semester, subject_code) do update
set
  subject_name = excluded.subject_name,
  is_active = true,
  updated_at = now();

update public.faculty_subjects fs
set subject_master_id = sm.id
from public.subject_master sm
where fs.subject_master_id is null
  and upper(trim(fs.regulation)) = sm.regulation
  and case
        when upper(trim(fs.department)) = 'H&S' then 'H&S'
        else upper(trim(fs.department))
      end = sm.department
  and upper(trim(coalesce(nullif(fs.branch, ''), fs.department))) = sm.branch
  and upper(trim(fs.year)) = sm.year
  and case
        when upper(trim(fs.semester)) in ('SEM I', 'SEMESTER I') then 'I'
        when upper(trim(fs.semester)) in ('SEM II', 'SEMESTER II') then 'II'
        else upper(trim(fs.semester))
      end = sm.semester
  and upper(trim(fs.subject_code)) = sm.subject_code;
