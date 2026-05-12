-- Application-level user profile data
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system'
    check (theme in ('system','light','dark')),
  default_page_mode text not null default 'horizontal'
    check (default_page_mode in ('horizontal','vertical')),
  updated_at timestamptz not null default now()
);

create table books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  file_path text not null,
  file_size_bytes bigint,
  page_count integer,
  cover_source text not null default 'page'
    check (cover_source in ('page','upload')),
  cover_page integer,
  cover_path text,
  has_outline boolean not null default false,
  extraction_status text not null default 'pending'
    check (extraction_status in ('pending','processing','completed','failed')),
  last_opened_page integer,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index books_user_id_idx on books(user_id);
create index books_user_last_opened_idx
  on books(user_id, last_opened_at desc nulls last);

create table book_pages (
  book_id uuid not null references books(id) on delete cascade,
  page_number integer not null,
  text_content text,
  primary key (book_id, page_number)
);

create table book_outline_entries (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  parent_id uuid references book_outline_entries(id) on delete cascade,
  title text not null,
  page_number integer,
  order_index integer not null
);
create index outline_book_id_idx on book_outline_entries(book_id, order_index);

create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  page_number integer not null,
  label text,
  created_at timestamptz not null default now(),
  unique (book_id, page_number)
);
create index bookmarks_book_id_idx on bookmarks(book_id, page_number);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  page_number integer not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_book_page_idx on notes(book_id, page_number);

create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table book_tags (
  book_id uuid not null references books(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (book_id, tag_id)
);

-- Auto-create user profile and preferences on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_profiles (id) values (new.id);
  insert into user_preferences (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-update updated_at timestamps
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger books_updated_at
  before update on books
  for each row execute function update_updated_at();

create trigger user_preferences_updated_at
  before update on user_preferences
  for each row execute function update_updated_at();

create trigger notes_updated_at
  before update on notes
  for each row execute function update_updated_at();
