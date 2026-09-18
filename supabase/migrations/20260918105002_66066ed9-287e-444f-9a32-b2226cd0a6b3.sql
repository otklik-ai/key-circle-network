-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Invites
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  email text,
  invited_name text,
  note text,
  industry_hint text,
  location_hint text,
  grants_admin boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid,
  used_by uuid,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invites" ON public.invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text,
  full_name text NOT NULL DEFAULT '',
  headline text,
  bio text,
  city text,
  country text,
  photo_url text,
  industries text[] NOT NULL DEFAULT '{}',
  expertise text[] NOT NULL DEFAULT '{}',
  passports text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  seeking text,
  offering text,
  current_projects text,
  linkedin_url text,
  call_link text,
  membership_status text NOT NULL DEFAULT 'free',
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read completed profiles" ON public.profiles FOR SELECT TO authenticated
  USING (onboarding_complete = true OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invite validation (public) and redemption (signed-in)
CREATE OR REPLACE FUNCTION public.validate_invite(_key text)
RETURNS TABLE (valid boolean, email text, invited_name text, note text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.invites%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM public.invites i WHERE upper(i.key) = upper(trim(_key));
  IF NOT FOUND OR inv.status <> 'pending' OR (inv.expires_at IS NOT NULL AND inv.expires_at < now()) THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text; RETURN;
  END IF;
  RETURN QUERY SELECT true, inv.email, inv.invited_name, inv.note;
END; $$;
GRANT EXECUTE ON FUNCTION public.validate_invite(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.redeem_invite(_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.invites%ROWTYPE; uid uuid := auth.uid(); pid uuid; uemail text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO pid FROM public.profiles WHERE user_id = uid;
  IF pid IS NOT NULL THEN RETURN pid; END IF;
  SELECT * INTO inv FROM public.invites i WHERE upper(i.key) = upper(trim(_key)) FOR UPDATE;
  IF NOT FOUND OR inv.status <> 'pending' OR (inv.expires_at IS NOT NULL AND inv.expires_at < now()) THEN
    RAISE EXCEPTION 'This key is not valid';
  END IF;
  uemail := (auth.jwt() ->> 'email');
  UPDATE public.invites SET status = 'used', used_by = uid, used_at = now() WHERE id = inv.id;
  INSERT INTO public.profiles (user_id, email, full_name) VALUES (uid, uemail, coalesce(inv.invited_name, '')) RETURNING id INTO pid;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'member') ON CONFLICT DO NOTHING;
  IF inv.grants_admin THEN INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING; END IF;
  RETURN pid;
END; $$;
GRANT EXECUTE ON FUNCTION public.redeem_invite(text) TO authenticated;

-- Conversations & messages
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations, public.conversation_participants, public.messages TO authenticated;
GRANT ALL ON public.conversations, public.conversation_participants, public.messages TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = _conversation_id AND user_id = _user_id)
$$;

CREATE POLICY "Participants read conversations" ON public.conversations FOR SELECT TO authenticated USING (public.is_participant(id, auth.uid()));
CREATE POLICY "Participants read participants" ON public.conversation_participants FOR SELECT TO authenticated USING (public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated USING (public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_participant(conversation_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id; RETURN NEW; END; $$;
CREATE TRIGGER messages_touch_conversation AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(_other_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); cid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _other_user = uid THEN RAISE EXCEPTION 'Cannot message yourself'; END IF;
  SELECT a.conversation_id INTO cid
  FROM public.conversation_participants a
  JOIN public.conversation_participants b ON a.conversation_id = b.conversation_id
  WHERE a.user_id = uid AND b.user_id = _other_user LIMIT 1;
  IF cid IS NOT NULL THEN RETURN cid; END IF;
  INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO cid;
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (cid, uid), (cid, _other_user);
  RETURN cid;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Friendships
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Involved users read friendships" ON public.friendships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users request friendships" ON public.friendships FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Addressee responds" ON public.friendships FOR UPDATE TO authenticated USING (addressee_id = auth.uid()) WITH CHECK (addressee_id = auth.uid());
CREATE POLICY "Involved users remove friendships" ON public.friendships FOR DELETE TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Search requests (admin tasks)
CREATE TABLE public.search_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  query text NOT NULL,
  result_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_requests TO authenticated;
GRANT ALL ON public.search_requests TO service_role;
ALTER TABLE public.search_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own requests" ON public.search_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create requests" ON public.search_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update requests" ON public.search_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER search_requests_updated_at BEFORE UPDATE ON public.search_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public counters
CREATE OR REPLACE FUNCTION public.get_club_stats()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'members', (SELECT count(*) FROM public.profiles WHERE onboarding_complete),
    'countries', (SELECT count(DISTINCT country) FROM public.profiles WHERE onboarding_complete AND country IS NOT NULL AND country <> ''),
    'friendships', (SELECT count(*) FROM public.friendships WHERE status = 'accepted'),
    'introductions', (SELECT count(*) FROM public.conversations)
  )
$$;
GRANT EXECUTE ON FUNCTION public.get_club_stats() TO anon, authenticated;

-- Founder key
INSERT INTO public.invites (key, invited_name, note, grants_admin)
VALUES ('FOUNDER-CIRCLE-2026', NULL, 'Founding admin key', true);