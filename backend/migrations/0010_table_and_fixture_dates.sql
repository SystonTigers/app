-- League table rows were saved without goal difference, so it showed as 0.
UPDATE league_standings SET goal_difference = COALESCE(goals_for, 0) - COALESCE(goals_against, 0);

-- Fixtures imported from FA Full-Time were saved with dd/mm/yyyy dates, which
-- sort and compare wrongly. Convert any to yyyy-mm-dd.
UPDATE OR IGNORE fixtures
SET fixture_date = substr(fixture_date, 7, 4) || '-' || substr(fixture_date, 4, 2) || '-' || substr(fixture_date, 1, 2)
WHERE fixture_date GLOB '[0-9][0-9]/[0-9][0-9]/[0-9][0-9][0-9][0-9]';
