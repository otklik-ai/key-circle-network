ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS other_cities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS base_countries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_pref text,
  ADD COLUMN IF NOT EXISTS role_org text,
  ADD COLUMN IF NOT EXISTS functional_roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS one_liner text,
  ADD COLUMN IF NOT EXISTS call_about text,
  ADD COLUMN IF NOT EXISTS background text,
  ADD COLUMN IF NOT EXISTS focus_now text,
  ADD COLUMN IF NOT EXISTS interested_industries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS active_markets text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seeking_people text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seeking_people_note text,
  ADD COLUMN IF NOT EXISTS offering_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS open_to_contact text,
  ADD COLUMN IF NOT EXISTS outside_work text,
  ADD COLUMN IF NOT EXISTS home_chapter_city text,
  ADD COLUMN IF NOT EXISTS chapter_role text,
  ADD COLUMN IF NOT EXISTS field_visibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS skipped_fields text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS flagged_fields text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.profile_private (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profile_private TO authenticated;
GRANT ALL ON public.profile_private TO service_role;

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin reads private answers" ON public.profile_private
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner writes private answers" ON public.profile_private
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner updates private answers" ON public.profile_private
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER profile_private_updated_at BEFORE UPDATE ON public.profile_private
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Members read completed profiles" ON public.profiles;
CREATE POLICY "Members read completed profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (onboarding_complete = true AND review_status = 'approved')
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.get_club_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'members', (SELECT count(*) FROM public.profiles WHERE onboarding_complete AND review_status = 'approved'),
    'countries', (SELECT count(DISTINCT country) FROM public.profiles WHERE onboarding_complete AND country IS NOT NULL AND country <> ''),
    'friendships', (SELECT count(*) FROM public.friendships WHERE status = 'accepted'),
    'introductions', (SELECT count(*) FROM public.conversations)
  )
$function$;