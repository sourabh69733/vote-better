-- Elections, seats and contests as entities that results attach to.
-- Facts still live in approved_fact; these rows only give them stable places to hang.
ALTER TABLE election
  ADD COLUMN body text CHECK (body IN ('lok-sabha', 'assembly', 'bye-election')),
  ADD COLUMN authority text CHECK (authority <> '');

ALTER TABLE area
  ADD COLUMN kind text CHECK (kind IN ('lok-sabha-seat', 'assembly-seat', 'ward')),
  ADD COLUMN state text CHECK (state <> '');

ALTER TABLE contest ADD CONSTRAINT contest_once_per_seat UNIQUE (election_id, area_id);

-- One person standing in one contest. The result itself stays an approved fact about the person.
CREATE TABLE candidacy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES contest(id),
  person_id uuid NOT NULL REFERENCES person(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (contest_id, person_id)
);
CREATE INDEX candidacy_by_person ON candidacy (person_id);
