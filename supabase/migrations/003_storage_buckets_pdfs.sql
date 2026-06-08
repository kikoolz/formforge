-- =============================================
-- STORAGE BUCKETS — PDFs
-- =============================================

-- Create the pdfs bucket (public for direct URL access)
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', true)
on conflict (id) do update set public = true;

-- =============================================
-- STORAGE RLS POLICIES — PDFs
-- =============================================

drop policy if exists "Anyone can view PDFs" on storage.objects;
drop policy if exists "Authenticated users can upload PDFs" on storage.objects;
drop policy if exists "Users can update own PDFs" on storage.objects;
drop policy if exists "Users can delete own PDFs" on storage.objects;

-- Anyone can read PDFs (needed for public form preview and filled PDF download)
create policy "Anyone can view PDFs"
  on storage.objects for select
  using (bucket_id = 'pdfs');

-- Authenticated users can upload PDFs
create policy "Authenticated users can upload PDFs"
  on storage.objects for insert
  with check (bucket_id = 'pdfs' and auth.role() = 'authenticated');

-- Users can update own PDFs
create policy "Users can update own PDFs"
  on storage.objects for update
  using (bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete own PDFs
create policy "Users can delete own PDFs"
  on storage.objects for delete
  using (bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
