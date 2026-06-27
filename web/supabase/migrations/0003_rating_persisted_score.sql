-- Pitchwreck — submit_rating returns the PERSISTED score (correctness fix)
--
-- ⚠️ HUMAN STEP: run this in your Supabase project: SQL Editor -> paste -> Run.
-- (Plain `create or replace function`, so it's safe to re-run.)
--
-- Why: the original submit_rating (0001) echoed back p_score as `your_score`,
-- even when the user had already voted a DIFFERENT value earlier (the insert is
-- `on conflict do nothing`, so the stored vote is unchanged). A returning user
-- who re-tapped would then see a "You" number that didn't match their real,
-- stored rating. This returns the score actually on file, and a matching `delta`.
--
-- The feed now also seeds the reveal from the stored vote (page.tsx + my_score),
-- so an already-rated post normally won't re-call this at all — this hardens the
-- RPC itself as defense-in-depth (e.g. the same user voting from two devices).

create or replace function public.submit_rating(p_post_id uuid, p_score smallint)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_inserted  int;
  v_avg       real;
  v_cnt       int;
  v_persisted int;   -- the score actually on file after the (idempotent) insert
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

  -- Read back the user's stored vote (the original one if they'd already rated).
  select score into v_persisted
    from public.ratings
   where post_id = p_post_id and user_id = v_uid;
  v_persisted := coalesce(v_persisted, p_score);

  select rating_avg, rating_count into v_avg, v_cnt from public.posts where id = p_post_id;
  return json_build_object(
    'crowd_avg',     round(v_avg::numeric, 2),
    'count',         v_cnt,
    'your_score',    v_persisted,
    'delta',         round((v_persisted - v_avg)::numeric, 2),
    'already_rated', (v_inserted = 0)
  );
end; $$;
