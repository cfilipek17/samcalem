-- Pitchwreck — Storage bucket for post images (Milestone 2)
--
-- ⚠️ HUMAN STEP REQUIRED: an agent cannot run this for you.
-- Run this in your Supabase project: SQL Editor -> paste -> Run.
-- (Storage buckets/policies live in the `storage` schema, which the app's
--  anon/auth keys cannot create — only the dashboard SQL editor / service role can.)
--
-- What it does:
--   1. Creates a PUBLIC bucket `post-images` (idempotent).
--   2. Adds a public-read policy so feed <img> tags can load the files anonymously.
--   3. Lets authenticated users (and the service role) write/replace objects.
--
-- After running this, new posts upload the generated PNG to
-- `post-images/{post_id}.png` and store the public URL in posts.image_url
-- (+ the object path in posts.image_path). If the bucket is missing or the
-- service-role key is absent, the app falls back to the inline data-URL so
-- posting still works (see web/src/lib/storage.ts + web/src/app/actions.ts).

-- 1. The bucket. `public = true` makes object URLs readable without a token.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

-- 2. Public read: anyone (incl. anon) can SELECT objects in this bucket.
drop policy if exists "post-images public read" on storage.objects;
create policy "post-images public read"
  on storage.objects for select
  using (bucket_id = 'post-images');

-- 3. Authenticated write: logged-in users can upload new objects.
--    (The server action uses the service-role key, which bypasses RLS, but this
--     policy keeps direct client uploads working too and is harmless.)
drop policy if exists "post-images auth insert" on storage.objects;
create policy "post-images auth insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-images');

-- 4. Authenticated update: allow replacing an object (e.g. regenerate).
drop policy if exists "post-images auth update" on storage.objects;
create policy "post-images auth update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'post-images')
  with check (bucket_id = 'post-images');

-- ---------------------------------------------------------------------------
-- RPC: set a post's stored image after a successful Storage upload.
-- The author owns the row but posts have no client UPDATE policy (all writes go
-- through SECURITY DEFINER functions), so this lets the create flow swap the
-- temporary data-URL for the permanent Storage URL + object path.
-- ---------------------------------------------------------------------------
create or replace function public.set_post_image(
  p_post_id uuid, p_image_url text, p_image_path text
) returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'auth required'; end if;
  update public.posts
     set image_url = p_image_url,
         image_path = p_image_path
   where id = p_post_id
     and author_id = v_uid;   -- author can only touch their own post
end; $$;
