-- 0005_public_player_names.sql
-- Club setting: show players' full names and photos on the public club page.
-- Off by default, so public pages show first name and surname initial, and no
-- photos (UK Children's Code: high privacy by default).
ALTER TABLE tenants ADD COLUMN public_full_names INTEGER NOT NULL DEFAULT 0;
