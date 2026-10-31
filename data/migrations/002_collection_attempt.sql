CREATE TABLE collection_attempt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES source(id),
  snapshot_id uuid REFERENCES snapshot(id),
  attempted_at timestamptz NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('succeeded', 'unavailable', 'invalid', 'error')),
  http_status integer CHECK (http_status BETWEEN 100 AND 599),
  detail text,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (outcome <> 'succeeded' OR snapshot_id IS NOT NULL)
);

CREATE INDEX collection_attempt_by_source ON collection_attempt (source_id, attempted_at DESC);
CREATE TRIGGER collection_attempt_immutable BEFORE UPDATE OR DELETE ON collection_attempt
FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
