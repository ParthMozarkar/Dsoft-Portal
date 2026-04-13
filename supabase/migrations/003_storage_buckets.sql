-- ============================================================
-- VAULT — Storage Buckets
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Create private storage buckets
insert into storage.buckets (id, name, public) values ('notes-files', 'notes-files', false);
insert into storage.buckets (id, name, public) values ('assignment-starters', 'assignment-starters', false);
insert into storage.buckets (id, name, public) values ('submissions', 'submissions', false);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false);
insert into storage.buckets (id, name, public) values ('lecture-attachments', 'lecture-attachments', false);

-- ============================================================
-- Storage RLS Policies
-- ============================================================

-- Avatars: users can upload/read their own avatar
create policy "avatars_select" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

create policy "avatars_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Notes files: authenticated users can read; admin/teacher can upload
create policy "notes_files_select" on storage.objects for select to authenticated
  using (bucket_id = 'notes-files');

create policy "notes_files_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'notes-files'
    and (select role from profiles where user_id = auth.uid()) in ('admin', 'teacher')
  );

-- Assignment starters: authenticated users can read; admin/teacher can upload
create policy "assignment_starters_select" on storage.objects for select to authenticated
  using (bucket_id = 'assignment-starters');

create policy "assignment_starters_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assignment-starters'
    and (select role from profiles where user_id = auth.uid()) in ('admin', 'teacher')
  );

-- Submissions: students can upload to their own folder; teacher/admin can read all
create policy "submissions_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'submissions'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (select role from profiles where user_id = auth.uid()) in ('admin', 'teacher')
    )
  );

create policy "submissions_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lecture attachments: authenticated can read; admin/teacher can upload
create policy "lecture_attachments_select" on storage.objects for select to authenticated
  using (bucket_id = 'lecture-attachments');

create policy "lecture_attachments_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lecture-attachments'
    and (select role from profiles where user_id = auth.uid()) in ('admin', 'teacher')
  );
