-- Pitchwreck — initial schema
-- Run this in your Supabase project: SQL Editor -> paste -> Run.
-- Design notes live in /SPEC.md (sections 6, 7, 8).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- CATEGORIES  (extensibility: "Startup Ideas" is just category #1)
-- A new format later = INSERT a row here, not a rebuild. See SPEC §2b.
-- ---------------------------------------------------------------------------
create table public.categories (
  id              text primary key,            -- e.g. 'startup-ideas'
  name            text not null,               -- 'Startup Ideas'
  tagline         text,
  copy_prompt     text not null,               -- prompt users paste into their OWN ChatGPT/Claude
  image_style     text not null default 'flat cartoon illustration, bold black outlines, exaggerated comical expressions, vibrant colors, satirical poster, funny',
  validation_rule text not null default 'The text must be a business or startup idea.',
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PROFILES  (1:1 with auth.users; auto-created by trigger below)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  avatar_url  text,
  posts_today int  not null default 0,          -- denormalized daily counter
  posts_day   date,                              -- the day posts_today refers to
  is_banned   boolean not null default false,
  referred_by uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- POSTS  (image + caption; running rating aggregates live here)
-- ---------------------------------------------------------------------------
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  category_id  text not null references public.categories(id),
  author_id    uuid not null references public.profiles(id) on delete cascade,
  caption      text not null check (char_length(caption) <= 280),
  source_text  text not null,                  -- the AI text the user pasted (audit / regenerate)
  image_prompt text not null,                  -- prompt actually sent to the image model
  image_url    text,                           -- null until generation succeeds
  image_path   text,                           -- storage object path (when we upload)
  status       text not null default 'pending'
                 check (status in ('pending','ready','failed','removed')),
  nsfw_score   real,
  regen_count  int    not null default 0,
  rating_sum   bigint not null default 0,
  rating_count int    not null default 0,
  rating_avg   real   not null default 0,
  craziness    real   not null default 0,      -- rating variance, for "craziest" board (later)
  report_count int    not null default 0,
  created_at   timestamptz not null default now()
);
create index idx_posts_feed     on public.posts (created_at desc)                                   where status = 'ready';
create index idx_posts_ranked   on public.posts (rating_avg desc, rating_count desc, created_at desc) where status = 'ready';
create index idx_posts_category on public.posts (category_id, created_at desc)                       where status = 'ready';
create index idx_posts_author   on public.posts (author_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RATINGS  (PK enforces one vote per user per post)
-- ---------------------------------------------------------------------------
create table public.ratings (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  score      smallint not null check (score between 0 and 10),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index idx_ratings_user on public.ratings (user_id);

-- ---------------------------------------------------------------------------
-- COMMENTS
-- ---------------------------------------------------------------------------
create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  author_id    uuid not null references public.profiles(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 1000),
  report_count int  not null default 0,
  status       text not null default 'visible' check (status in ('visible','removed')),
  created_at   timestamptz not null default now()
);
create index idx_comments_post on public.comments (post_id, created_at desc);

-- ---------------------------------------------------------------------------
-- REPORTS  (polymorphic; one report per user per target)
-- ---------------------------------------------------------------------------
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment')),
  target_id   uuid not null,
  reason      text not null check (reason in ('nsfw','spam','hate','other')),
  note        text,
  status      text not null default 'open' check (status in ('open','reviewed','actioned','dismissed')),
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index idx_reports_open on public.reports (status, created_at) where status = 'open';

-- ---------------------------------------------------------------------------
-- REFERRALS  (for the future "founders club" tier)
-- ---------------------------------------------------------------------------
create table public.referrals (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id),
  code        text unique not null,
  invitee_id  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
alter table public.categories enable row level security;
alter table public.profiles   enable row level security;
alter table public.posts      enable row level security;
alter table public.ratings    enable row level security;
alter table public.comments   enable row level security;
alter table public.reports    enable row level security;
alter table public.referrals  enable row level security;

create policy "categories readable"  on public.categories for select using (true);

create policy "profiles readable"    on public.profiles  for select using (true);
create policy "profiles self update" on public.profiles  for update using (auth.uid() = id);

-- Anyone (incl. anon) can read ready posts; authors can see their own non-ready rows.
-- Writes happen only through the SECURITY DEFINER functions below.
create policy "posts public read"    on public.posts     for select using (status = 'ready' or author_id = auth.uid());

create policy "ratings self read"    on public.ratings   for select using (user_id = auth.uid());

create policy "comments public read" on public.comments  for select using (status = 'visible');
create policy "comments insert own"  on public.comments  for insert with check (author_id = auth.uid());

create policy "reports insert own"   on public.reports   for insert with check (reporter_id = auth.uid());

-- ===========================================================================
-- FUNCTIONS (run as definer so clients can't tamper with aggregates/counters)
-- ===========================================================================

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'wreck_' || substr(replace(new.id::text,'-',''), 1, 8))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomically claim a daily posting slot. Returns true if allowed (and increments).
create or replace function public.claim_post_slot(p_max int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_ok boolean;
begin
  if v_uid is null then return false; end if;
  update public.profiles
     set posts_today = case when posts_day = current_date then posts_today + 1 else 1 end,
         posts_day   = current_date
   where id = v_uid
     and (posts_day is distinct from current_date or posts_today < p_max)
  returning true into v_ok;
  return coalesce(v_ok, false);
end; $$;

-- Insert a finished post (image already generated). Author = caller.
create or replace function public.create_post(
  p_category_id text, p_caption text, p_source_text text,
  p_image_prompt text, p_image_url text, p_nsfw_score real default null
) returns public.posts language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_post public.posts;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  insert into public.posts (category_id, author_id, caption, source_text, image_prompt, image_url, nsfw_score, status)
  values (p_category_id, v_uid, p_caption, p_source_text, p_image_prompt, p_image_url, p_nsfw_score, 'ready')
  returning * into v_post;
  return v_post;
end; $$;

-- Submit a 0-10 rating once; returns the crowd average + how the guess compared.
create or replace function public.submit_rating(p_post_id uuid, p_score smallint)
returns json language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_inserted int; v_avg real; v_cnt int;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  if p_score < 0 or p_score > 10 then raise exception 'score out of range'; end if;

  insert into public.ratings (post_id, user_id, score)
  values (p_post_id, v_uid, p_score)
  on conflict (post_id, user_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.posts
       set rating_sum   = rating_sum + p_score,
           rating_count = rating_count + 1,
           rating_avg   = (rating_sum + p_score)::real / (rating_count + 1)
     where id = p_post_id;
  end if;

  select rating_avg, rating_count into v_avg, v_cnt from public.posts where id = p_post_id;
  return json_build_object(
    'crowd_avg',     round(v_avg::numeric, 2),
    'count',         v_cnt,
    'your_score',    p_score,
    'delta',         round((p_score - v_avg)::numeric, 2),
    'already_rated', (v_inserted = 0)
  );
end; $$;

-- ===========================================================================
-- SEED: the one launch category
-- ===========================================================================
insert into public.categories (id, name, tagline, copy_prompt, sort_order) values
('startup-ideas', 'Startup Ideas', 'Pitch your worst. Watch it burn.',
 'You are a delusional startup founder pitching to a VC who has already left the room. Invent ONE absurd, hilarious startup idea in 1-2 sentences. Make it sound like a real pitch but completely unhinged. Output ONLY the pitch text, nothing else.',
 0)
on conflict (id) do nothing;
