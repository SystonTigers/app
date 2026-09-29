-- Match highlights: moments tapped in Match Centre played from the match's
-- YouTube video. The video's clock is lined up with the phones' clock by
-- where kick-off is in the video (seconds). Found from the stream's start
-- time when YouTube tells us, or set by staff ("Kick-off is here").
ALTER TABLE fixtures ADD COLUMN video_kickoff_sec REAL;
-- Staff tweaks per moment: {"<event id>": {"start": -5, "end": 3, "hidden": true}}
ALTER TABLE fixtures ADD COLUMN highlight_edits TEXT;
