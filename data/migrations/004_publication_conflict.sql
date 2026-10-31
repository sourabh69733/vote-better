CREATE TABLE publication_conflict_resolution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id uuid NOT NULL REFERENCES observation(id),
  prior_fact_id uuid NOT NULL REFERENCES approved_fact(id),
  reviewer_id text NOT NULL CHECK (reviewer_id <> ''),
  reason text NOT NULL CHECK (reason <> ''),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX publication_conflict_by_observation ON publication_conflict_resolution (observation_id, prior_fact_id);
CREATE TRIGGER publication_conflict_immutable BEFORE UPDATE OR DELETE ON publication_conflict_resolution
  FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
