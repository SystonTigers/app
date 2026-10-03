-- Players' first name and surname, so name styles ("S. Smith", "Sam S.") split
-- two-word first names and surnames correctly. `name` stays as the full name
-- ("first last") for everything that already reads it. Existing players keep
-- working from `name` until staff save them with the two fields.
ALTER TABLE squad ADD COLUMN first_name TEXT;
ALTER TABLE squad ADD COLUMN last_name TEXT;
