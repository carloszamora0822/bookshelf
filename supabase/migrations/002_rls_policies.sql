-- user_profiles
alter table user_profiles enable row level security;

create policy "users read own profile"
  on user_profiles for select using (auth.uid() = id);
create policy "users update own profile"
  on user_profiles for update using (auth.uid() = id);

-- user_preferences
alter table user_preferences enable row level security;

create policy "users read own preferences"
  on user_preferences for select using (auth.uid() = user_id);
create policy "users update own preferences"
  on user_preferences for update using (auth.uid() = user_id);

-- books
alter table books enable row level security;

create policy "users read own books"
  on books for select using (auth.uid() = user_id);
create policy "users insert own books"
  on books for insert with check (auth.uid() = user_id);
create policy "users update own books"
  on books for update using (auth.uid() = user_id);
create policy "users delete own books"
  on books for delete using (auth.uid() = user_id);

-- book_pages (filter through parent book)
alter table book_pages enable row level security;

create policy "users read own book pages"
  on book_pages for select
  using (exists (
    select 1 from books where books.id = book_pages.book_id and books.user_id = auth.uid()
  ));

-- book_outline_entries (filter through parent book)
alter table book_outline_entries enable row level security;

create policy "users read own outline entries"
  on book_outline_entries for select
  using (exists (
    select 1 from books where books.id = book_outline_entries.book_id and books.user_id = auth.uid()
  ));

-- bookmarks
alter table bookmarks enable row level security;

create policy "users read own bookmarks"
  on bookmarks for select using (auth.uid() = user_id);
create policy "users insert own bookmarks"
  on bookmarks for insert with check (auth.uid() = user_id);
create policy "users update own bookmarks"
  on bookmarks for update using (auth.uid() = user_id);
create policy "users delete own bookmarks"
  on bookmarks for delete using (auth.uid() = user_id);

-- notes
alter table notes enable row level security;

create policy "users read own notes"
  on notes for select using (auth.uid() = user_id);
create policy "users insert own notes"
  on notes for insert with check (auth.uid() = user_id);
create policy "users update own notes"
  on notes for update using (auth.uid() = user_id);
create policy "users delete own notes"
  on notes for delete using (auth.uid() = user_id);

-- tags
alter table tags enable row level security;

create policy "users read own tags"
  on tags for select using (auth.uid() = user_id);
create policy "users insert own tags"
  on tags for insert with check (auth.uid() = user_id);
create policy "users update own tags"
  on tags for update using (auth.uid() = user_id);
create policy "users delete own tags"
  on tags for delete using (auth.uid() = user_id);

-- book_tags (filter through parent book)
alter table book_tags enable row level security;

create policy "users read own book tags"
  on book_tags for select
  using (exists (
    select 1 from books where books.id = book_tags.book_id and books.user_id = auth.uid()
  ));
create policy "users insert own book tags"
  on book_tags for insert
  with check (exists (
    select 1 from books where books.id = book_tags.book_id and books.user_id = auth.uid()
  ));
create policy "users delete own book tags"
  on book_tags for delete
  using (exists (
    select 1 from books where books.id = book_tags.book_id and books.user_id = auth.uid()
  ));
