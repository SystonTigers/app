-- A player's cut-out photo (a see-through PNG of just them), drawn standing
-- in the club's goal graphics. Separate from the headshot the app shows.
ALTER TABLE squad ADD COLUMN cutout_url TEXT;
