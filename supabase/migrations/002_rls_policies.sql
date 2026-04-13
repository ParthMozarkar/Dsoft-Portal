-- ============================================================
-- VAULT — Row Level Security Policies
-- Run this in the Supabase SQL Editor AFTER 001_schema.sql
-- ============================================================

-- ========================
-- Enable RLS on all tables
-- ========================
alter table profiles enable row level security;
alter table batches enable row level security;
alter table batch_enrollments enable row level security;
alter table notes enable row level security;
alter table assignments enable row level security;
alter table submissions enable row level security;
alter table notices enable row level security;
alter table notice_reads enable row level security;
alter table lectures enable row level security;

-- ========================
-- Helper function: get current user's profile id
-- ========================
create or replace function get_my_profile_id()
returns uuid
language sql
stable
security definer
as $$
  select id from profiles where user_id = auth.uid()
$$;

-- ========================
-- Helper function: get current user's role
-- ========================
create or replace function get_my_role()
returns text
language sql
stable
security definer
as $$
  select role from profiles where user_id = auth.uid()
$$;

-- ========================
-- Helper function: check if user is enrolled in a batch
-- ========================
create or replace function is_enrolled_in_batch(p_batch_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1 from batch_enrollments
    where batch_id = p_batch_id
      and student_id = get_my_profile_id()
  )
$$;

-- ========================
-- Helper function: check if user is the teacher of a batch
-- ========================
create or replace function is_teacher_of_batch(p_batch_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1 from batches
    where id = p_batch_id
      and teacher_id = get_my_profile_id()
  )
$$;

-- ============================================================
-- PROFILES
-- ============================================================

-- All authenticated users can read all profiles
create policy "profiles_select_all"
  on profiles for select
  to authenticated
  using (true);

-- Users can update only their own profile
create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can insert their own profile (during registration)
create policy "profiles_insert_own"
  on profiles for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================================
-- BATCHES
-- ============================================================

-- All authenticated users can read batches
create policy "batches_select_all"
  on batches for select
  to authenticated
  using (true);

-- Only admin/teacher can insert batches
create policy "batches_insert_admin_teacher"
  on batches for insert
  to authenticated
  with check (get_my_role() in ('admin', 'teacher'));

-- Only admin/teacher can update batches
create policy "batches_update_admin_teacher"
  on batches for update
  to authenticated
  using (get_my_role() in ('admin', 'teacher'))
  with check (get_my_role() in ('admin', 'teacher'));

-- Only admin/teacher can delete batches
create policy "batches_delete_admin_teacher"
  on batches for delete
  to authenticated
  using (get_my_role() in ('admin', 'teacher'));

-- ============================================================
-- BATCH ENROLLMENTS
-- ============================================================

-- Students can read their own enrollments
create policy "enrollments_select_own"
  on batch_enrollments for select
  to authenticated
  using (
    student_id = get_my_profile_id()
    or get_my_role() = 'admin'
    or get_my_role() = 'teacher'
  );

-- Admin can insert enrollments
create policy "enrollments_insert_admin"
  on batch_enrollments for insert
  to authenticated
  with check (
    get_my_role() = 'admin'
    -- also allow self-enrollment during registration
    or student_id = get_my_profile_id()
  );

-- Admin can delete enrollments
create policy "enrollments_delete_admin"
  on batch_enrollments for delete
  to authenticated
  using (get_my_role() = 'admin');

-- ============================================================
-- NOTES
-- ============================================================

-- Enrolled students, batch teacher, and admin can read
create policy "notes_select"
  on notes for select
  to authenticated
  using (
    is_enrolled_in_batch(batch_id)
    or is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- Batch teacher and admin can insert
create policy "notes_insert"
  on notes for insert
  to authenticated
  with check (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- Batch teacher and admin can update
create policy "notes_update"
  on notes for update
  to authenticated
  using (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  )
  with check (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- Batch teacher and admin can delete
create policy "notes_delete"
  on notes for delete
  to authenticated
  using (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- ============================================================
-- ASSIGNMENTS
-- ============================================================

-- Enrolled students, batch teacher, and admin can read
create policy "assignments_select"
  on assignments for select
  to authenticated
  using (
    is_enrolled_in_batch(batch_id)
    or is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- Batch teacher and admin can insert
create policy "assignments_insert"
  on assignments for insert
  to authenticated
  with check (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- Batch teacher and admin can update
create policy "assignments_update"
  on assignments for update
  to authenticated
  using (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  )
  with check (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- Batch teacher and admin can delete
create policy "assignments_delete"
  on assignments for delete
  to authenticated
  using (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- ============================================================
-- SUBMISSIONS
-- ============================================================

-- Students can read their own submissions; teacher of batch + admin can read all
create policy "submissions_select"
  on submissions for select
  to authenticated
  using (
    student_id = get_my_profile_id()
    or get_my_role() = 'admin'
    or exists(
      select 1 from assignments a
      where a.id = assignment_id
        and is_teacher_of_batch(a.batch_id)
    )
  );

-- Students can insert their own submission
create policy "submissions_insert_student"
  on submissions for insert
  to authenticated
  with check (
    student_id = get_my_profile_id()
  );

-- Students can update their own; teacher/admin can update for marking
create policy "submissions_update"
  on submissions for update
  to authenticated
  using (
    student_id = get_my_profile_id()
    or get_my_role() = 'admin'
    or exists(
      select 1 from assignments a
      where a.id = assignment_id
        and is_teacher_of_batch(a.batch_id)
    )
  )
  with check (
    student_id = get_my_profile_id()
    or get_my_role() = 'admin'
    or exists(
      select 1 from assignments a
      where a.id = assignment_id
        and is_teacher_of_batch(a.batch_id)
    )
  );

-- ============================================================
-- NOTICES
-- ============================================================

-- Enrolled students can read notices for their batches; teacher/admin can read all
create policy "notices_select"
  on notices for select
  to authenticated
  using (
    is_enrolled_in_batch(batch_id)
    or is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- Teacher/admin can insert
create policy "notices_insert"
  on notices for insert
  to authenticated
  with check (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- Teacher/admin can update
create policy "notices_update"
  on notices for update
  to authenticated
  using (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  )
  with check (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- Teacher/admin can delete
create policy "notices_delete"
  on notices for delete
  to authenticated
  using (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- ============================================================
-- NOTICE READS
-- ============================================================

-- Users can read their own notice_reads
create policy "notice_reads_select_own"
  on notice_reads for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their own notice_reads
create policy "notice_reads_insert_own"
  on notice_reads for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================================
-- LECTURES
-- ============================================================

-- Enrolled students can read; teacher/admin can read all
create policy "lectures_select"
  on lectures for select
  to authenticated
  using (
    is_enrolled_in_batch(batch_id)
    or is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- Teacher/admin can insert
create policy "lectures_insert"
  on lectures for insert
  to authenticated
  with check (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- Teacher/admin can update
create policy "lectures_update"
  on lectures for update
  to authenticated
  using (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  )
  with check (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );

-- Teacher/admin can delete
create policy "lectures_delete"
  on lectures for delete
  to authenticated
  using (
    is_teacher_of_batch(batch_id)
    or get_my_role() = 'admin'
  );
