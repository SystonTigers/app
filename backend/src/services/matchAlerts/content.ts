/**
 * Wording for match notifications. Pure (no I/O) so it's easy to test.
 * Names are passed in already shortened to the club's public name style,
 * because notifications show on lock screens.
 */

export const ALERT_KINDS = ["kick_off", "goal", "opp_goal", "half_time", "yellow", "red", "full_time", "stream", "correction", "motm"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

/** Live event types that notify people who aren't at the match. */
export const EVENT_ALERT_KINDS: readonly string[] = ["kick_off", "goal", "opp_goal", "half_time", "yellow", "red", "full_time"];

export interface AlertInput {
  kind: AlertKind;
  clubName: string;
  opponent: string;
  homeAway: "home" | "away";
  ourScore: number;
  theirScore: number;
  minute?: number | null;
  /** Scorer, or the player booked or sent off */
  player?: string | null;
  /** This scorer's goal number in the match (2 = brace, 3 = hat-trick) */
  goalNumber?: number;
  /** Yellow cards: the player's second, so they're sent off */
  secondYellow?: boolean;
  /** Full time: "Sam S. 2, Ben J." */
  scorers?: string | null;
}

export interface AlertText {
  title: string;
  body: string;
}

const MILESTONES: Record<number, string> = { 2: "brace", 3: "hat-trick" };

function fixtureName(i: AlertInput): string {
  return i.homeAway === "home" ? `${i.clubName} v ${i.opponent}` : `${i.opponent} v ${i.clubName}`;
}

/** "Syston Tigers 2-1 Rovers" with the home team first. */
export function scoreText(i: AlertInput): string {
  return i.homeAway === "home"
    ? `${i.clubName} ${i.ourScore}-${i.theirScore} ${i.opponent}`
    : `${i.opponent} ${i.theirScore}-${i.ourScore} ${i.clubName}`;
}

function at(minute: number | null | undefined): string {
  return typeof minute === "number" ? ` (${minute}')` : "";
}

function resultWord(i: AlertInput): string {
  if (i.ourScore > i.theirScore) return "Win";
  if (i.ourScore < i.theirScore) return "Defeat";
  return "Draw";
}

export function buildAlert(i: AlertInput): AlertText {
  switch (i.kind) {
    case "kick_off":
      return { title: `Kick-off: ${fixtureName(i)}`, body: "We're under way. Follow every update in the app." };
    case "goal": {
      const n = i.goalNumber ?? 1;
      const extra = n >= 4 ? ` That's ${n}!` : MILESTONES[n] ? ` That's a ${MILESTONES[n]}!` : "";
      return { title: `⚽ GOAL! ${scoreText(i)}`, body: `${i.player || "We"} scored${at(i.minute)}.${extra}` };
    }
    case "opp_goal":
      return { title: `${i.opponent} score: ${scoreText(i)}`, body: `Goal for ${i.opponent}${at(i.minute)}.` };
    case "half_time":
      return { title: `Half time: ${scoreText(i)}`, body: "Second half coming up." };
    case "yellow":
      if (i.secondYellow) return { title: `🟥 Second yellow, sent off${i.player ? `: ${i.player}` : ""}${at(i.minute)}`, body: scoreText(i) };
      return { title: `🟨 Yellow card${i.player ? `: ${i.player}` : ""}${at(i.minute)}`, body: scoreText(i) };
    case "red":
      return { title: `🟥 Red card${i.player ? `: ${i.player}` : ""}${at(i.minute)}`, body: scoreText(i) };
    case "full_time":
      return { title: `Full time: ${scoreText(i)}`, body: i.scorers ? `${resultWord(i)}. Scorers: ${i.scorers}` : `${resultWord(i)}. Tap for the match report.` };
    case "stream":
      return { title: `🔴 Live now: ${fixtureName(i)}`, body: "Watch the match live in the app." };
    case "correction":
      return { title: `Correction: ${scoreText(i)}`, body: "The last update was a mistake and has been removed." };
    case "motm":
      return motmAlert(i.clubName, i.opponent, new Date().toISOString());
  }
}

/** "Man of the Match vote is open" for everyone at the club, with when it closes (UK time). */
export function motmAlert(clubName: string, opponent: string | null, closesAt: string, now = Date.now()): AlertText {
  const end = new Date(closesAt);
  const sameDay = end.toLocaleDateString("en-GB", { timeZone: "Europe/London" }) === new Date(now).toLocaleDateString("en-GB", { timeZone: "Europe/London" });
  const time = end.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
  const when = sameDay ? time : `${end.toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "short" })} ${time}`;
  const match = opponent ? ` v ${opponent}` : "";
  return {
    title: "⭐ Man of the Match vote is open",
    body: `Who was best for ${clubName}${match}? Voting closes ${when}.`,
  };
}
