-- Hevy AI Training Companion — Initial Database Schema
-- Follows Supabase Postgres Best Practices:
-- 1. RLS enabled on all public tables (server uses service_role key exclusively)
-- 2. All foreign key columns explicitly indexed
-- 3. Identity columns (bigint generated always as identity) and timestamptz used throughout

-- 1. Exercise Templates (mirrored from Hevy /v1/exercise_templates)
create table if not exists public.exercise_templates (
  id text primary key,
  title text not null,
  type text not null default 'weight_reps',
  primary_muscle_group text not null default 'other',
  secondary_muscle_groups jsonb not null default '[]'::jsonb,
  is_custom boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists exercise_templates_primary_muscle_idx
  on public.exercise_templates (primary_muscle_group);

alter table public.exercise_templates enable row level security;

-- 2. Routines (mirrored from Hevy /v1/routines + app split metadata)
create table if not exists public.routines (
  id text primary key,
  title text not null,
  folder_id integer,
  notes text,
  split_order integer not null default 0,
  is_active_in_split boolean not null default true,
  is_ai_target_routine boolean not null default false,
  hevy_updated_at timestamptz,
  hevy_created_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists routines_split_order_idx
  on public.routines (is_active_in_split, split_order);

alter table public.routines enable row level security;

-- 3. Routine Exercises (exercises inside each Hevy routine + progression rules)
create table if not exists public.routine_exercises (
  id bigint generated always as identity primary key,
  routine_id text not null references public.routines(id) on delete cascade,
  exercise_template_id text not null references public.exercise_templates(id) on delete restrict,
  index integer not null default 0,
  title text not null,
  superset_id integer,
  rest_seconds integer not null default 90,
  notes text,
  target_sets jsonb not null default '[]'::jsonb,
  target_rep_min integer not null default 8,
  target_rep_max integer not null default 12,
  weight_increment_kg numeric(6,2) not null default 2.50,
  target_rpe numeric(3,1) not null default 8.5,
  progression_rule text not null default 'double_progression',
  unique (routine_id, index)
);

create index if not exists routine_exercises_routine_id_idx
  on public.routine_exercises (routine_id);
create index if not exists routine_exercises_template_id_idx
  on public.routine_exercises (exercise_template_id);

alter table public.routine_exercises enable row level security;

-- 4. Workouts (completed workouts from Hevy /v1/workouts)
create table if not exists public.workouts (
  id text primary key,
  routine_id text,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration_seconds integer not null default 0,
  total_volume_kg numeric(12,2) not null default 0,
  total_working_sets integer not null default 0,
  hevy_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists workouts_start_time_idx
  on public.workouts (start_time desc);
create index if not exists workouts_routine_id_idx
  on public.workouts (routine_id);

alter table public.workouts enable row level security;

-- 5. Workout Exercises (individual exercises performed within a workout)
create table if not exists public.workout_exercises (
  id bigint generated always as identity primary key,
  workout_id text not null references public.workouts(id) on delete cascade,
  exercise_template_id text not null references public.exercise_templates(id) on delete restrict,
  index integer not null default 0,
  title text not null,
  notes text,
  superset_id integer,
  best_e1rm_kg numeric(8,2) not null default 0,
  max_weight_kg numeric(8,2) not null default 0,
  exercise_volume_kg numeric(10,2) not null default 0,
  working_sets_count integer not null default 0,
  avg_rpe numeric(3,1)
);

create index if not exists workout_exercises_workout_id_idx
  on public.workout_exercises (workout_id);
create index if not exists workout_exercises_template_id_idx
  on public.workout_exercises (exercise_template_id);

alter table public.workout_exercises enable row level security;

-- 6. Workout Sets (individual sets inside a workout exercise)
create table if not exists public.workout_sets (
  id bigint generated always as identity primary key,
  workout_exercise_id bigint not null references public.workout_exercises(id) on delete cascade,
  index integer not null default 0,
  type text not null default 'normal',
  weight_kg numeric(8,2),
  reps integer,
  distance_meters integer,
  duration_seconds integer,
  rpe numeric(3,1),
  e1rm_kg numeric(8,2) not null default 0,
  is_pr boolean not null default false
);

create index if not exists workout_sets_workout_exercise_id_idx
  on public.workout_sets (workout_exercise_id);

alter table public.workout_sets enable row level security;

-- 7. App Settings & Sync State (single-row config state)
create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  last_sync_at timestamptz,
  ai_target_routine_id text,
  ai_target_routine_title text not null default '⚡ Today''s AI Workout',
  training_goal text not null default 'Hypertrophy & Progressive Overload',
  weekly_goal_sessions integer not null default 3,
  unit_system text not null default 'kg',
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;
