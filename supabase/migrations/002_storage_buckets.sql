-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Create the avatars bucket (public for direct URL access).
-- Uses on conflict do update so it also fixes an existing non-public bucket.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- =============================================
-- STORAGE RLS POLICIES — AVATARS
-- =============================================

-- Drop existing policies so this migration is idempotent
drop policy if exists "Anyone can view avatars" on storage.objects;
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "Users can update own avatars" on storage.objects;
drop policy if exists "Users can delete own avatars" on storage.objects;

-- Anyone can view avatars (required for public URL to work)
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
