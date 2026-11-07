ALTER TABLE entity_match
  ADD COLUMN sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  ADD COLUMN reviewer_id text;

ALTER TABLE entity_match ADD CONSTRAINT confirmed_match_has_reviewer
  CHECK (status <> 'confirmed' OR (entity_id IS NOT NULL AND reviewer_id IS NOT NULL AND reviewer_id <> ''));

CREATE INDEX entity_match_latest ON entity_match (observation_id, sequence DESC);
