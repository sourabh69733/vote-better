-- An assembly seat lies inside one Lok Sabha seat (ECI GE 2024 statistical report 15).
ALTER TABLE area ADD COLUMN parent_id uuid REFERENCES area(id);
ALTER TABLE area ADD CONSTRAINT area_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id);
