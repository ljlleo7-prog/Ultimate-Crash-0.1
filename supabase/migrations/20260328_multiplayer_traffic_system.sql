-- Multiplayer Traffic System Migration
-- Namespace-scoped multiplayer where each pilot flies their own aircraft
-- and other aircraft appear as live traffic

-- ==============================================================================
-- 1. ENSURE PUBLIC.PROFILES EXISTS
-- ==============================================================================
-- This migration assumes public.profiles(id) exists as the user FK root.
-- If it doesn't exist yet, create a minimal version here.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            username TEXT UNIQUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- ==============================================================================
-- 2. MULTIPLAYER NAMESPACE TABLES
-- ==============================================================================

-- Namespace registry
CREATE TABLE IF NOT EXISTS public.mp_namespaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Traffic session container
CREATE TABLE IF NOT EXISTS public.mp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    namespace_id UUID NOT NULL REFERENCES public.mp_namespaces(id) ON DELETE CASCADE,
    session_code TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'briefing', 'active', 'ended', 'archived')),
    host_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    scenario_config JSONB DEFAULT '{}'::JSONB,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (namespace_id, session_code)
);

-- Session membership and roles
CREATE TABLE IF NOT EXISTS public.mp_session_participants (
    session_id UUID REFERENCES public.mp_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'pilot' CHECK (role IN ('pilot', 'atc', 'observer', 'instructor')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (session_id, user_id)
);

-- Aircraft presence metadata (low-rate durable)
CREATE TABLE IF NOT EXISTS public.mp_aircraft_presence (
    session_id UUID REFERENCES public.mp_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    callsign TEXT NOT NULL,
    aircraft_type TEXT NOT NULL,
    flight_plan JSONB DEFAULT '{}'::JSONB,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (session_id, user_id)
);

-- Append-only event log
CREATE TABLE IF NOT EXISTS public.mp_flight_events (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.mp_sessions(id) ON DELETE CASCADE,
    namespace_id UUID NOT NULL REFERENCES public.mp_namespaces(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::JSONB,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_mp_sessions_namespace ON public.mp_sessions(namespace_id);
CREATE INDEX IF NOT EXISTS idx_mp_sessions_status ON public.mp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mp_sessions_host ON public.mp_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_mp_session_participants_user ON public.mp_session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_aircraft_presence_session ON public.mp_aircraft_presence(session_id);
CREATE INDEX IF NOT EXISTS idx_mp_flight_events_session ON public.mp_flight_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mp_flight_events_namespace ON public.mp_flight_events(namespace_id);

-- ==============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE public.mp_namespaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_aircraft_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_flight_events ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ==============================================================================

-- Namespaces: viewable by everyone, creatable by authenticated users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_namespaces' AND policyname = 'mp_namespaces_select') THEN
        CREATE POLICY mp_namespaces_select ON public.mp_namespaces FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_namespaces' AND policyname = 'mp_namespaces_insert') THEN
        CREATE POLICY mp_namespaces_insert ON public.mp_namespaces FOR INSERT WITH CHECK (auth.uid() = created_by);
    END IF;
END $$;

-- Sessions: only viewable by participants in that session
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_sessions' AND policyname = 'mp_sessions_select') THEN
        CREATE POLICY mp_sessions_select ON public.mp_sessions FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.mp_session_participants
                WHERE session_id = mp_sessions.id AND user_id = auth.uid()
            )
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_sessions' AND policyname = 'mp_sessions_update') THEN
        CREATE POLICY mp_sessions_update ON public.mp_sessions FOR UPDATE USING (auth.uid() = host_user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_session_participants' AND policyname = 'mp_session_participants_select') THEN
        CREATE POLICY mp_session_participants_select ON public.mp_session_participants FOR SELECT USING (
            auth.uid() = user_id OR EXISTS (
                SELECT 1 FROM public.mp_session_participants self_participant
                WHERE self_participant.session_id = mp_session_participants.session_id
                  AND self_participant.user_id = auth.uid()
            )
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_session_participants' AND policyname = 'mp_session_participants_update') THEN
        CREATE POLICY mp_session_participants_update ON public.mp_session_participants FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_aircraft_presence' AND policyname = 'mp_aircraft_presence_select') THEN
        CREATE POLICY mp_aircraft_presence_select ON public.mp_aircraft_presence FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.mp_session_participants
                WHERE session_id = mp_aircraft_presence.session_id AND user_id = auth.uid()
            )
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_aircraft_presence' AND policyname = 'mp_aircraft_presence_insert') THEN
        CREATE POLICY mp_aircraft_presence_insert ON public.mp_aircraft_presence FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_aircraft_presence' AND policyname = 'mp_aircraft_presence_update') THEN
        CREATE POLICY mp_aircraft_presence_update ON public.mp_aircraft_presence FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_flight_events' AND policyname = 'mp_flight_events_select') THEN
        CREATE POLICY mp_flight_events_select ON public.mp_flight_events FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.mp_session_participants
                WHERE session_id = mp_flight_events.session_id AND user_id = auth.uid()
            )
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mp_flight_events' AND policyname = 'mp_flight_events_insert') THEN
        CREATE POLICY mp_flight_events_insert ON public.mp_flight_events FOR INSERT WITH CHECK (auth.uid() = created_by);
    END IF;
END $$;

-- ==============================================================================
-- 6. GRANTS
-- ==============================================================================

GRANT SELECT, INSERT ON public.mp_namespaces TO authenticated;
GRANT SELECT, UPDATE ON public.mp_sessions TO authenticated;
GRANT SELECT, UPDATE ON public.mp_session_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mp_aircraft_presence TO authenticated;
GRANT SELECT, INSERT ON public.mp_flight_events TO authenticated;

-- ==============================================================================
-- 7. RPC FUNCTIONS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.mp_create_session(namespace_key text, scenario_config jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_namespace_id uuid;
    v_session_id uuid;
    v_session_code text := COALESCE(NULLIF(scenario_config->>'session_code', ''), upper(substr(md5(gen_random_uuid()::text), 1, 6)));
    v_role text := COALESCE(NULLIF(scenario_config->>'requested_role', ''), 'pilot');
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    INSERT INTO public.mp_namespaces (key, created_by)
    VALUES (namespace_key, v_user_id)
    ON CONFLICT (key) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_namespace_id;

    INSERT INTO public.mp_sessions (namespace_id, session_code, host_user_id, scenario_config)
    VALUES (v_namespace_id, v_session_code, v_user_id, COALESCE(scenario_config, '{}'::jsonb))
    RETURNING id INTO v_session_id;

    INSERT INTO public.mp_session_participants (session_id, user_id, role)
    VALUES (v_session_id, v_user_id, v_role)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.mp_aircraft_presence (session_id, user_id, callsign, aircraft_type, flight_plan)
    VALUES (
        v_session_id,
        v_user_id,
        COALESCE(NULLIF(scenario_config->>'callsign', ''), 'UNKNOWN'),
        COALESCE(NULLIF(scenario_config->>'aircraft_type', ''), 'UNKNOWN'),
        COALESCE(scenario_config->'flight_plan', '{}'::jsonb)
    )
    ON CONFLICT (session_id, user_id) DO UPDATE SET
        callsign = EXCLUDED.callsign,
        aircraft_type = EXCLUDED.aircraft_type,
        flight_plan = EXCLUDED.flight_plan,
        last_seen_at = NOW();

    RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mp_join_session(namespace_key text, session_code text, desired_role text DEFAULT 'pilot')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_session public.mp_sessions%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT s.* INTO v_session
    FROM public.mp_sessions s
    JOIN public.mp_namespaces n ON n.id = s.namespace_id
    WHERE n.key = namespace_key
      AND s.session_code = session_code
    LIMIT 1;

    IF v_session.id IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    INSERT INTO public.mp_session_participants (session_id, user_id, role)
    VALUES (v_session.id, v_user_id, COALESCE(NULLIF(desired_role, ''), 'pilot'))
    ON CONFLICT (session_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        last_active_at = NOW();

    RETURN jsonb_build_object(
        'sessionId', v_session.id,
        'namespaceKey', namespace_key,
        'sessionCode', v_session.session_code,
        'role', COALESCE(NULLIF(desired_role, ''), 'pilot'),
        'isHost', v_session.host_user_id = v_user_id,
        'scenarioConfig', v_session.scenario_config
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.mp_leave_session(target_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    DELETE FROM public.mp_aircraft_presence
    WHERE session_id = target_session_id AND user_id = v_user_id;

    DELETE FROM public.mp_session_participants
    WHERE session_id = target_session_id AND user_id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mp_set_participant_role(target_session_id uuid, target_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    UPDATE public.mp_session_participants
    SET role = target_role,
        last_active_at = NOW()
    WHERE session_id = target_session_id AND user_id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mp_append_event(target_session_id uuid, target_event_type text, target_payload jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_namespace_id uuid;
    v_event_id bigint;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT namespace_id INTO v_namespace_id
    FROM public.mp_sessions
    WHERE id = target_session_id;

    IF v_namespace_id IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    INSERT INTO public.mp_flight_events (session_id, namespace_id, event_type, payload, created_by)
    VALUES (target_session_id, v_namespace_id, target_event_type, COALESCE(target_payload, '{}'::jsonb), v_user_id)
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mp_create_session(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mp_join_session(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mp_leave_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mp_set_participant_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mp_append_event(uuid, text, jsonb) TO authenticated;

-- ==============================================================================
-- 8. REALTIME PUBLICATION
-- ==============================================================================

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.mp_flight_events;
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
    END;
END $$;
