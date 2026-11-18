-- One row per finished run of a registered source. Rows are never edited.
CREATE TABLE sync_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id text NOT NULL CHECK (registry_id ~ '^[a-z0-9-]+$'),
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL CHECK (finished_at >= started_at),
  outcome text NOT NULL CHECK (outcome IN ('succeeded', 'partial', 'failed')),
  items integer NOT NULL DEFAULT 0 CHECK (items >= 0),
  detail text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX sync_run_by_registry ON sync_run (registry_id, finished_at DESC);
CREATE TRIGGER sync_run_immutable BEFORE UPDATE OR DELETE ON sync_run
FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
