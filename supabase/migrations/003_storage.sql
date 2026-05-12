-- Create private storage bucket for PDFs and covers
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'books',
  'books',
  false,
  104857600, -- 100MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- Storage RLS: users can only access their own files
-- Files are stored under: {user_id}/pdfs/{filename} and {user_id}/covers/{filename}
create policy "users upload own files"
  on storage.objects for insert
  with check (
    bucket_id = 'books'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users read own files"
  on storage.objects for select
  using (
    bucket_id = 'books'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'books'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
