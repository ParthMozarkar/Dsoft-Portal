-- ============================================================
-- VAULT — Fixes for Triggers and Security
-- ============================================================

-- 1. Create missing trigger for auto-creating profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Student'),
    'student' -- Default role is student
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Secure batch enrollment via RPC
-- This allows students to enroll using a code without exposing RLS insert to all students
create or replace function public.enroll_student(p_code text)
returns void
language plpgsql
security definer
as $$
declare
  v_batch_id uuid;
  v_student_id uuid;
begin
  -- Get batch id
  select id into v_batch_id from public.batches where enrollment_code = p_code;
  if v_batch_id is null then
    raise exception 'Invalid enrollment code';
  end if;

  -- Get student id
  select id into v_student_id from public.profiles where user_id = auth.uid();
  if v_student_id is null then
    raise exception 'Profile not found';
  end if;

  -- Insert enrollment
  insert into public.batch_enrollments (batch_id, student_id)
  values (v_batch_id, v_student_id)
  on conflict do nothing;
end;
$$;


-- 3. Fix security flaw in batch_enrollments RLS
-- Previously allowed any student to insert directly into any batch
drop policy if exists "enrollments_insert_admin" on batch_enrollments;
create policy "enrollments_insert_admin"
  on batch_enrollments for insert
  to authenticated
  with check (
    get_my_role() = 'admin'
  );
