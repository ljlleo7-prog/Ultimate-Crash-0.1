-- Database schema for SkylineTragedy failure graph

-- Table: skylinetragedy_failures
CREATE TABLE IF NOT EXISTS skylinetragedy_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    failure_code TEXT UNIQUE NOT NULL,
    system TEXT NOT NULL,
    description TEXT,
    severity INTEGER,
    time_scale TEXT,
    source_confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: skylinetragedy_failure_symptoms
CREATE TABLE IF NOT EXISTS skylinetragedy_failure_symptoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    failure_id UUID REFERENCES skylinetragedy_failures(id) ON DELETE CASCADE,
    sensory_type TEXT CHECK (sensory_type IN ('visual', 'auditory', 'tactile', 'smell', 'handling')),
    description TEXT,
    instrument_related BOOLEAN DEFAULT FALSE,
    physics_related BOOLEAN DEFAULT FALSE
);

-- Table: skylinetragedy_failure_edges
CREATE TABLE IF NOT EXISTS skylinetragedy_failure_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cause_failure UUID REFERENCES skylinetragedy_failures(id) ON DELETE CASCADE,
    effect_failure UUID REFERENCES skylinetragedy_failures(id) ON DELETE CASCADE,
    probability FLOAT DEFAULT 1.0,
    delay_seconds INTEGER DEFAULT 0,
    propagation_type TEXT CHECK (propagation_type IN ('SYSTEM', 'PROCEDURAL', 'HUMAN_FACTOR', 'PHYSICS'))
);

-- Table: skylinetragedy_revision_proposals
CREATE TABLE IF NOT EXISTS skylinetragedy_revision_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposed_node JSONB,
    proposed_edges JSONB,
    source_document TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: skylinetragedy_narratives
CREATE TABLE IF NOT EXISTS skylinetragedy_narratives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signature TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    symptoms JSONB,
    source_document TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skylinetragedy_atc_phrase_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent TEXT NOT NULL,
    speaker TEXT NOT NULL,
    speaker_role TEXT NOT NULL,
    language TEXT DEFAULT 'EN',
    phrase_template TEXT NOT NULL,
    parameters JSONB,
    phase_of_flight TEXT,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE skylinetragedy_atc_phrase_templates
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'EN';

UPDATE skylinetragedy_atc_phrase_templates
SET language = 'EN'
WHERE language IS NULL;

ALTER TABLE skylinetragedy_atc_phrase_templates
ALTER COLUMN language SET NOT NULL;

DROP INDEX IF EXISTS skylinetragedy_atc_phrase_templates_unique;

CREATE UNIQUE INDEX IF NOT EXISTS skylinetragedy_atc_phrase_templates_unique
ON skylinetragedy_atc_phrase_templates (intent, speaker, speaker_role, language, phrase_template, phase_of_flight, source);

ALTER TABLE skylinetragedy_atc_phrase_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'skylinetragedy_atc_phrase_templates'
          AND policyname = 'skylinetragedy_atc_phrase_templates_read'
    ) THEN
        CREATE POLICY skylinetragedy_atc_phrase_templates_read
        ON skylinetragedy_atc_phrase_templates
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'skylinetragedy_atc_phrase_templates'
          AND policyname = 'skylinetragedy_atc_phrase_templates_write'
    ) THEN
        CREATE POLICY skylinetragedy_atc_phrase_templates_write
        ON skylinetragedy_atc_phrase_templates
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'skylinetragedy_atc_phrase_templates'
          AND policyname = 'skylinetragedy_atc_phrase_templates_update'
    ) THEN
        CREATE POLICY skylinetragedy_atc_phrase_templates_update
        ON skylinetragedy_atc_phrase_templates
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'skylinetragedy_atc_phrase_templates'
          AND policyname = 'skylinetragedy_atc_phrase_templates_delete'
    ) THEN
        CREATE POLICY skylinetragedy_atc_phrase_templates_delete
        ON skylinetragedy_atc_phrase_templates
        FOR DELETE
        TO authenticated
        USING (true);
    END IF;
END $$;
