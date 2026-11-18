CREATE TABLE source (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  authority text NOT NULL CHECK (authority <> ''),
  url text NOT NULL UNIQUE CHECK (url <> ''),
  document_type text NOT NULL CHECK (document_type <> ''),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES source(id),
  url text NOT NULL CHECK (url <> ''),
  content_hash text NOT NULL CHECK (content_hash <> ''),
  captured_at timestamptz NOT NULL,
  blob_ref text,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (source_id, content_hash)
);

CREATE TABLE observation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES snapshot(id),
  locator text NOT NULL CHECK (locator <> ''),
  predicate text NOT NULL CHECK (predicate <> ''),
  raw_value text NOT NULL,
  normalized_value jsonb NOT NULL,
  valid_from_value text,
  valid_from_precision text CHECK (valid_from_precision IN ('instant', 'day', 'month', 'year')),
  valid_from_original_text text,
  valid_from_source_timezone text,
  valid_to_value text,
  valid_to_precision text CHECK (valid_to_precision IN ('instant', 'day', 'month', 'year')),
  valid_to_original_text text,
  valid_to_source_timezone text,
  source_published_at_value text,
  source_published_at_precision text CHECK (source_published_at_precision IN ('instant', 'day', 'month', 'year')),
  source_published_at_original_text text,
  source_published_at_source_timezone text,
  normalized_at timestamptz NOT NULL,
  normalizer_version text NOT NULL CHECK (normalizer_version <> ''),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (snapshot_id, locator, predicate, normalizer_version),
  CHECK ((valid_from_value IS NULL) = (valid_from_precision IS NULL)),
  CHECK ((valid_from_value IS NULL) = (valid_from_original_text IS NULL)),
  CHECK ((valid_to_value IS NULL) = (valid_to_precision IS NULL)),
  CHECK ((valid_to_value IS NULL) = (valid_to_original_text IS NULL)),
  CHECK ((source_published_at_value IS NULL) = (source_published_at_precision IS NULL)),
  CHECK ((source_published_at_value IS NULL) = (source_published_at_original_text IS NULL))
);

CREATE TABLE person (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE area (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  name text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE election (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  name text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE contest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES election(id),
  area_id uuid NOT NULL REFERENCES area(id),
  stable_key text NOT NULL UNIQUE,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE entity_match (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id uuid NOT NULL REFERENCES observation(id),
  entity_id uuid,
  status text NOT NULL CHECK (status IN ('proposed', 'confirmed', 'ambiguous', 'rejected')),
  reason text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE review_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs-changes')),
  reviewer_id text NOT NULL CHECK (reviewer_id <> ''),
  reason text NOT NULL CHECK (reason <> ''),
  reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE review_observation (
  review_id uuid NOT NULL REFERENCES review_event(id),
  observation_id uuid NOT NULL REFERENCES observation(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (review_id, observation_id)
);
CREATE INDEX review_observation_by_observation ON review_observation (observation_id);

CREATE TABLE publication_revision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_id uuid REFERENCES publication_revision(id),
  published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE approved_fact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  predicate text NOT NULL,
  value jsonb NOT NULL,
  revision_id uuid NOT NULL REFERENCES publication_revision(id),
  published_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE fact_observation (
  fact_id uuid NOT NULL REFERENCES approved_fact(id),
  observation_id uuid NOT NULL REFERENCES observation(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (fact_id, observation_id)
);

CREATE FUNCTION reject_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'evidence rows are immutable; create a new event or revision';
END;
$$;

CREATE TRIGGER source_immutable BEFORE UPDATE OR DELETE ON source FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER snapshot_immutable BEFORE UPDATE OR DELETE ON snapshot FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER observation_immutable BEFORE UPDATE OR DELETE ON observation FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER entity_match_immutable BEFORE UPDATE OR DELETE ON entity_match FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER review_event_immutable BEFORE UPDATE OR DELETE ON review_event FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER review_observation_immutable BEFORE UPDATE OR DELETE ON review_observation FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER publication_revision_immutable BEFORE UPDATE OR DELETE ON publication_revision FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER approved_fact_immutable BEFORE UPDATE OR DELETE ON approved_fact FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER fact_observation_immutable BEFORE UPDATE OR DELETE ON fact_observation FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
