-- A club's own designs (services/graphics/templates/): the id of a template
-- set whose backgrounds are in R2 under graphics/templates/<id>/. Only clubs
-- named here are offered that set as a graphics style. Syston Tigers' Canva
-- set is the first; choosing it is still up to the club (Club Settings).
ALTER TABLE tenants ADD COLUMN graphics_templates TEXT;
UPDATE tenants SET graphics_templates = 'syston-canva' WHERE slug = 'syston-tigers';
