/**
 * Monthly round-ups, on the 1st (UK time):
 *
 *   11:00  last month's results          month_results:<yyyy-mm>
 *   12:00  the season's top scorers       stats:<yyyy-mm>
 *   17:00  this month's fixtures          month_fixtures:<yyyy-mm>
 *
 * Each source id is unique, so a missed slot posts later the same day and a
 * second run never posts twice. Nothing is posted for a month with no games
 * or a season with no goals yet. Clubs choose where each goes in Club Settings.
 */
import { tracksAssists } from "../clubOptions";
import { resolveSeason } from "../seasons/range";
import { squadStats } from "../squadStats";
import { forPosting, type SocialEnv } from "./club";
import { fixturesPost, resultsPost, statsRoundupPost } from "./clubPosts";
import type { Queue } from "./scheduler";
import { addDays, fixtureFacts, fixturesBetween, monthEnd, monthLabel, resultsBetween, type UkTime } from "./scheduleData";

export async function queueRoundups(env: SocialEnv, tenantId: string, t: UkTime, now: Date, queue: Queue): Promise<void> {
  if (!t.date.endsWith("-01")) return;
  const thisMonth = t.date.slice(0, 7);
  const lastMonth = addDays(t.date, -1).slice(0, 7);

  if (t.hour >= 11) {
    await queue("month_results", `month_results:${lastMonth}`, async (club) => {
      const facts = await resultsBetween(env, tenantId, `${lastMonth}-01`, monthEnd(`${lastMonth}-01`), 12);
      if (!facts.length) return null;
      const label = monthLabel(lastMonth);
      return resultsPost(club.brand, facts, label, `${label.split(" ")[0]}'s results`);
    });
  }

  if (t.hour >= 12) {
    await queue("stats_roundup", `stats:${thisMonth}`, async (club, policy) => {
      const season = await resolveSeason(env, tenantId, null, now);
      const lines = await squadStats(env, tenantId, season);
      if (!lines.some((l) => l.goals > 0)) return null;
      return statsRoundupPost(club.brand, policy, season?.label ?? "This season",
        lines.map((l) => ({ name: l.name, goals: l.goals, assists: l.assists, appearances: l.appearances })), await tracksAssists(env, tenantId));
    });
  }

  if (t.hour >= 17) {
    await queue("month_fixtures", `month_fixtures:${thisMonth}`, async (club) => {
      const rows = await fixturesBetween(env, tenantId, t.date, monthEnd(t.date), "live");
      if (!rows.length) return null;
      const facts = await Promise.all(rows.map((r) => fixtureFacts(env, tenantId, r)));
      const label = monthLabel(thisMonth);
      return fixturesPost(club.brand, facts.map((f) => forPosting(club, f)), label, `${label.split(" ")[0]}'s fixtures`);
    });
  }
}
