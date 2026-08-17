-- Accented usernames.
--
-- Signup used to reject anything outside [a-z0-9_], so names like "José" or "Muñoz" were reported
-- as invalid. The display name now keeps its accents while a transliterated slug backs the
-- internal auth email (`{slug}@bsp.internal`).
--
-- `username` therefore becomes the display name and `username_slug` the unique login key. The
-- profile trigger fills the slug from the email local part; the signup route overwrites `username`
-- with what the user actually typed.

alter table public.profiles
  add column if not exists username_slug text;

-- Backfill existing rows: their username is already the slug, since it came from the email.
update public.profiles
  set username_slug = lower(username)
  where username_slug is null;

-- Existing usernames came from the email local part, so a `lower()` collision should be
-- impossible. "Should be" is not good enough to bet the migration on: a duplicate would abort the
-- unique index below and leave the table half-migrated, so any collision is made unique here
-- instead by appending a short suffix from the row's own id.
update public.profiles p
  set username_slug = p.username_slug || '_' || left(replace(p.id::text, '-', ''), 6)
  where exists (
    select 1 from public.profiles other
    where other.username_slug = p.username_slug
      and other.id <> p.id
  );

alter table public.profiles
  alter column username_slug set not null;

-- The slug is what must stay unique — two profiles sharing one would share an auth email. This
-- also serves slug lookups, so no separate non-unique index is needed.
create unique index if not exists profiles_username_slug_key
  on public.profiles (username_slug);

-- `username` is now a display name, so its own uniqueness constraint is dropped: "José" and "Jose"
-- are prevented from coexisting by the slug index above, and the display text no longer needs to
-- carry that job.
alter table public.profiles
  drop constraint if exists profiles_username_key;

-- Trigger now seeds both columns from the email local part. The signup route immediately updates
-- `username` to the accented text the user entered.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, username_slug)
  values (
    new.id,
    split_part(new.email, '@', 1),
    lower(split_part(new.email, '@', 1))
  );
  return new;
end;
$$;
