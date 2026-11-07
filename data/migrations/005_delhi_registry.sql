-- Delhi draft graph. These rows propose relationships; publication still requires review.
CREATE TABLE delhi_institution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE CHECK (stable_key <> ''),
  name text NOT NULL CHECK (name <> ''),
  kind text NOT NULL CHECK (kind IN ('government', 'department', 'police', 'court', 'legal-aid', 'other')),
  observation_id uuid NOT NULL REFERENCES observation(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE delhi_office (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE CHECK (stable_key <> ''),
  institution_id uuid NOT NULL REFERENCES delhi_institution(id),
  title text NOT NULL CHECK (title <> ''),
  observation_id uuid NOT NULL REFERENCES observation(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE delhi_appointment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES delhi_office(id),
  person_id uuid NOT NULL REFERENCES person(id),
  observation_id uuid NOT NULL REFERENCES observation(id),
  valid_from_value text,
  valid_from_precision text CHECK (valid_from_precision IN ('instant', 'day', 'month', 'year')),
  valid_to_value text,
  valid_to_precision text CHECK (valid_to_precision IN ('instant', 'day', 'month', 'year')),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (office_id, person_id, observation_id),
  CHECK ((valid_from_value IS NULL) = (valid_from_precision IS NULL)),
  CHECK ((valid_to_value IS NULL) = (valid_to_precision IS NULL))
);

CREATE TABLE delhi_jurisdiction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES delhi_office(id),
  area_id uuid NOT NULL REFERENCES area(id),
  observation_id uuid NOT NULL REFERENCES observation(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (office_id, area_id, observation_id)
);

CREATE TABLE delhi_facility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE CHECK (stable_key <> ''),
  institution_id uuid NOT NULL REFERENCES delhi_institution(id),
  name text NOT NULL CHECK (name <> ''),
  official_address text,
  observation_id uuid NOT NULL REFERENCES observation(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX delhi_appointment_by_office ON delhi_appointment (office_id);
CREATE INDEX delhi_jurisdiction_by_area ON delhi_jurisdiction (area_id);
CREATE TRIGGER delhi_institution_immutable BEFORE UPDATE OR DELETE ON delhi_institution FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER delhi_office_immutable BEFORE UPDATE OR DELETE ON delhi_office FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER delhi_appointment_immutable BEFORE UPDATE OR DELETE ON delhi_appointment FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER delhi_jurisdiction_immutable BEFORE UPDATE OR DELETE ON delhi_jurisdiction FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER delhi_facility_immutable BEFORE UPDATE OR DELETE ON delhi_facility FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
