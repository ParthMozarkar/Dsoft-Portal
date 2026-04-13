-- ============================================================
-- VAULT — Student Portal Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. PROFILES
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  name text not null,
  role text check (role in ('admin','teacher','student')) not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. BATCHES
create table batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  teacher_id uuid references profiles(id) on delete set null,
  enrollment_code text unique not null,
  created_at timestamptz default now()
);

-- 3. BATCH ENROLLMENTS
create table batch_enrollments (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  enrolled_at timestamptz default now(),
  unique(batch_id, student_id)
);

-- 4. NOTES
create table notes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  title text not null,
  subject text,
  file_url text not null,
  created_at timestamptz default now()
);

-- 5. ASSIGNMENTS
create table assignments (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) on delete cascade,
  created_by uuid references profiles(id),
  title text not null,
  description text,
  due_date timestamptz not null,
  starter_file_url text,
  created_at timestamptz default now()
);

-- 6. SUBMISSIONS
create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id) on delete cascade,
  student_id uuid references profiles(id),
  file_url text not null,
  student_note text,
  status text check (status in ('pending','reviewed','resubmit')) default 'pending',
  marks integer,
  remarks text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  unique(assignment_id, student_id)
);

-- 7. NOTICES
create table notices (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) on delete cascade,
  created_by uuid references profiles(id),
  title text not null,
  body text not null,
  urgency text check (urgency in ('info','important','urgent')) default 'info',
  pinned boolean default false,
  attachment_url text,
  created_at timestamptz default now()
);

-- 8. NOTICE READS
create table notice_reads (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid references notices(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  read_at timestamptz default now(),
  unique(notice_id, user_id)
);

-- 9. LECTURES
create table lectures (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) on delete cascade,
  created_by uuid references profiles(id),
  title text not null,
  scheduled_at timestamptz not null,
  daily_room_url text,
  daily_room_name text,
  recording_url text,
  status text check (status in ('scheduled','live','ended')) default 'scheduled',
  duration_seconds integer,
  created_at timestamptz default now()
);
