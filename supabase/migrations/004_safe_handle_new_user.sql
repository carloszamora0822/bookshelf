-- Make handle_new_user() resilient so a stray failure doesn't bring down auth signup.
-- Symptom this fixes: "Database error saving new user" returned from supabase.auth.signUp.
-- Causes covered: duplicate rows on retry, RLS getting in the way (set search_path defends
-- against schema misresolution), missing tables (caught and logged rather than thrown).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.user_profiles (id) values (new.id) on conflict do nothing;
  exception when others then
    raise warning 'handle_new_user: user_profiles insert failed for %: %', new.id, sqlerrm;
  end;

  begin
    insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;
  exception when others then
    raise warning 'handle_new_user: user_preferences insert failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

-- Re-attach the trigger in case it was dropped or never installed.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
