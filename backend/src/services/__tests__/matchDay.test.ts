import { describe, expect, it } from "vitest";
import { buildAlert, scoreText, type AlertInput } from "../matchAlerts/content";
import { parseYouTubeVideoId } from "../stream/youtube";
import { kickOffAt, streamView, ukPostcode, validCoords, type FixtureRow } from "../matchDay";
import { inWindow, pickFixture } from "../stream/detect";

const base: AlertInput = { kind: "goal", clubName: "Syston Tigers", opponent: "Rovers", homeAway: "home", ourScore: 1, theirScore: 0 };

describe("match notification wording", () => {
  it("puts the home team first", () => {
    expect(scoreText(base)).toBe("Syston Tigers 1-0 Rovers");
    expect(scoreText({ ...base, homeAway: "away", ourScore: 2, theirScore: 1 })).toBe("Rovers 1-2 Syston Tigers");
  });

  it("names the scorer and celebrates braces and hat-tricks", () => {
    expect(buildAlert({ ...base, player: "Sam S.", minute: 12 })).toEqual({ title: "⚽ GOAL! Syston Tigers 1-0 Rovers", body: "Sam S. scored (12')." });
    expect(buildAlert({ ...base, player: "Sam S.", goalNumber: 3 }).body).toBe("Sam S. scored. That's a hat-trick!");
    expect(buildAlert({ ...base, player: "Sam S.", goalNumber: 4 }).body).toBe("Sam S. scored. That's 4!");
  });

  it("covers the rest of the match", () => {
    expect(buildAlert({ ...base, kind: "kick_off" }).title).toBe("Kick-off: Syston Tigers v Rovers");
    expect(buildAlert({ ...base, kind: "opp_goal", ourScore: 1, theirScore: 1, minute: 30 })).toEqual({ title: "Rovers score: Syston Tigers 1-1 Rovers", body: "Goal for Rovers (30')." });
    expect(buildAlert({ ...base, kind: "half_time" }).title).toBe("Half time: Syston Tigers 1-0 Rovers");
    expect(buildAlert({ ...base, kind: "red", player: "Ben J.", minute: 55 }).title).toBe("🟥 Red card: Ben J. (55')");
    expect(buildAlert({ ...base, kind: "yellow", player: "Ben J.", minute: 30 }).title).toBe("🟨 Yellow card: Ben J. (30')");
    expect(buildAlert({ ...base, kind: "full_time", scorers: "Sam S. 2" }).body).toBe("Win. Scorers: Sam S. 2");
    expect(buildAlert({ ...base, kind: "full_time", ourScore: 0, theirScore: 0 }).body).toBe("Draw. Tap for the match report.");
    expect(buildAlert({ ...base, kind: "stream", homeAway: "away" }).title).toBe("🔴 Live now: Rovers v Syston Tigers");
    expect(buildAlert({ ...base, kind: "correction", ourScore: 0 }).title).toBe("Correction: Syston Tigers 0-0 Rovers");
  });
});

describe("YouTube links", () => {
  it("finds the video in anything a manager might paste", () => {
    for (const link of [
      "dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "youtube.com/live/dQw4w9WgXcQ?feature=share",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ]) {
      expect(parseYouTubeVideoId(link), link).toBe("dQw4w9WgXcQ");
    }
  });

  it("rejects other sites and broken links", () => {
    for (const link of ["", "https://vimeo.com/123", "https://youtube.com/@club", "https://evil.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/short", "javascript:alert(1)"]) {
      expect(parseYouTubeVideoId(link), link).toBeNull();
    }
  });
});

describe("match day helpers", () => {
  it("turns UK kick-off times into the right instant in summer and winter", () => {
    expect(kickOffAt("2026-10-04", "10:30")).toBe(Date.UTC(2026, 9, 4, 9, 30)); // BST
    expect(kickOffAt("2026-11-08", "10:30")).toBe(Date.UTC(2026, 10, 8, 10, 30)); // GMT
    expect(kickOffAt("2026-10-04T14:00:00", null)).toBe(Date.UTC(2026, 9, 4, 13, 0));
    expect(kickOffAt("2026-10-04", null)).toBeNull();
    expect(kickOffAt(null, "10:00")).toBeNull();
  });

  it("reads UK postcodes from the venue", () => {
    expect(ukPostcode("Memorial Park, le7 1la")).toBe("LE7 1LA");
    expect(ukPostcode("Wembley HA90WS")).toBe("HA9 0WS");
    expect(ukPostcode("Central Park, New York")).toBeNull();
    expect(ukPostcode(null)).toBeNull();
  });

  it("only accepts real coordinates", () => {
    expect(validCoords(52.7, -1.07)).toBe(true);
    expect(validCoords(0, 0)).toBe(false);
    expect(validCoords(91, 0)).toBe(false);
    expect(validCoords("52.7", -1)).toBe(false);
  });

  it("describes the stream for the app", () => {
    const row = { youtube_live_id: "dQw4w9WgXcQ", youtube_status: "ended", stream_source: "youtube", stream_embeddable: 0 };
    expect(streamView(row)).toMatchObject({ videoId: "dQw4w9WgXcQ", status: "ended", source: "youtube", embeddable: false, watchUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
    expect(streamView({ ...row, youtube_live_id: "bad id" })).toBeNull();
    expect(streamView({ ...row, stream_source: null })).toBeNull();
  });
});

describe("matching a live stream to a fixture", () => {
  const row = (id: string, time: string | null, extra: Partial<FixtureRow> = {}): FixtureRow => ({
    id, opponent: "X", fixture_date: "2026-10-04", kick_off_time: time, venue: null, competition: null, home_team: null, away_team: null,
    venue_lat: null, venue_lng: null, youtube_live_id: null, youtube_status: null, stream_source: null, stream_embeddable: null,
    match_status: "scheduled", status: "scheduled", ...extra,
  });
  const now = Date.UTC(2026, 9, 4, 9, 20); // 10:20 UK

  it("checks around kick-off only", () => {
    expect(inWindow(row("a", "10:30"), now)).toBe(true);
    expect(inWindow(row("b", "12:00"), now)).toBe(false); // more than 45 minutes away
    expect(inWindow(row("c", "06:00"), now)).toBe(false); // over 3 hours ago
    expect(inWindow(row("d", null), now)).toBe(true);
    expect(inWindow(row("e", "10:30", { match_status: "full_time" }), now)).toBe(false);
    expect(inWindow(row("f", "06:00", { stream_source: "youtube", youtube_status: "live", youtube_live_id: "abcdefghijk" }), now)).toBe(true);
  });

  it("picks the match kicking off nearest now that doesn't have a stream", () => {
    const early = row("early", "09:00");
    const soon = row("soon", "10:30");
    expect(pickFixture([early, soon], now)?.id).toBe("soon");
    expect(pickFixture([early, { ...soon, youtube_live_id: "abcdefghijk", youtube_status: "live" }], now)?.id).toBe("early");
    expect(pickFixture([{ ...soon, match_status: "full_time" }], now)).toBeNull();
  });
});
