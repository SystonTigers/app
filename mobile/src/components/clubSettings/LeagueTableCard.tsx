import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Menu, TextInput } from 'react-native-paper';
import SettingsCard, { useCardStyles } from './SettingsCard';
import { themedStyles } from '../../theme/brand';
import { apiErrorMessage, leagueAdminApi, type LeagueOverview, type LeaguePasteResult } from '../../services/api';
import { normaliseResultDate, resultDate } from '../../utils/results';

/** "27/09/2026" from "2026-09-27" for the season start field. */
const ukDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso);

/** What a paste did, in a sentence. */
export function pasteSummary(r: LeaguePasteResult): string {
  if (r.kind === 'table') return `Table saved with ${r.rowsFound ?? 0} teams, sorted by points, goal difference and goals scored.`;
  const extra = [
    r.added === 0 ? 'no new ones (you already had them all)' : `${r.added ?? 0} new`,
    r.skipped ? `${r.skipped} postponed or unreadable skipped` : '',
    r.olderThanSeason ? `${r.olderThanSeason} from before the season start ignored` : '',
  ].filter(Boolean).join(', ');
  return `Found ${r.found ?? 0} results: ${extra}. Your table is up to date.`;
}

/**
 * The club's own league table (same as the website's Settings → League
 * Table): paste the league's results page or table, copied from any site,
 * and it's sorted by points, goal difference and goals scored. Match Centre
 * results are added automatically.
 */
export default function LeagueTableCard({ canManage, onMessage }: { canManage: boolean; onMessage: (text: string, error?: boolean) => void }) {
  const card = useCardStyles();
  const styles = useStyles();
  const [data, setData] = useState<LeagueOverview | null>(null);
  const [text, setText] = useState('');
  const [competition, setCompetition] = useState('');
  const [seasonStart, setSeasonStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [loadError, setLoadError] = useState('');

  const show = (next: LeagueOverview) => {
    setData(next);
    setCompetition(next.settings.competition);
    setSeasonStart(ukDate(next.settings.seasonStart));
  };
  useEffect(() => {
    if (!canManage) return;
    leagueAdminApi.get().then(show).catch((err) => setLoadError(apiErrorMessage(err, "Your league table didn't load.")));
  }, [canManage]);

  const run = async <T,>(fn: () => Promise<T>, done: (r: T) => string) => {
    setBusy(true);
    try {
      const r = await fn();
      show(r as unknown as LeagueOverview);
      onMessage(done(r));
      return r;
    } catch (err) {
      onMessage(apiErrorMessage(err, "That didn't work. Please try again."), true);
      return null;
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) return null;
  const s = data?.settings;
  const ourName = s?.ourTeam || s?.detectedTeam || '';
  const startIso = normaliseResultDate(seasonStart);
  const detailsChanged = !!s && (competition !== s.competition || (startIso ?? '') !== s.seasonStart);

  return (
    <SettingsCard icon="format-list-numbered" title="League table" help="Sorted by points, then goal difference, then goals scored. Your Match Centre results are added automatically. For everyone else's, copy the league's results page (FA Full-Time, COMET, GotSport, any site) and paste it here once a week.">
      {loadError ? <Text style={card.error}>{loadError}</Text> : null}
      <Text style={card.muted}>On the league&apos;s results page select all and copy, then paste below. Pasting the same results again is fine: ones you already have are skipped.</Text>
      <TextInput
        mode="outlined" multiline numberOfLines={5} value={text} onChangeText={setText} style={card.input}
        placeholder={'e.g. 27/09/26 10:30  Syston Tigers  3 - 1  Birstall United'} autoCorrect={false} autoCapitalize="none"
        accessibilityLabel="Paste results or the table"
      />
      <View style={card.buttons}>
        <Button mode="contained" onPress={async () => { const r = await run(() => leagueAdminApi.paste(text), pasteSummary); if (r) setText(''); }} loading={busy} disabled={busy || !text.trim()}>Update table</Button>
      </View>

      {s ? (
        <>
          <Text style={card.sub}>League details</Text>
          <TextInput mode="outlined" label="League name" value={competition} onChangeText={setCompetition} style={card.input} />
          <TextInput mode="outlined" label="Season started (DD/MM/YYYY)" value={seasonStart} onChangeText={setSeasonStart} style={card.input} keyboardType="numbers-and-punctuation" />
          <Menu
            visible={menu}
            onDismiss={() => setMenu(false)}
            anchor={<Button mode="outlined" style={styles.teamButton} onPress={() => setMenu(true)} disabled={busy || !data?.teams.length} icon="account-group">{`Our team: ${s.ourTeam ?? (s.detectedTeam ? `automatic (${s.detectedTeam})` : 'automatic')}`}</Button>}
          >
            <Menu.Item title={s.detectedTeam ? `Automatic (${s.detectedTeam})` : 'Automatic'} onPress={() => { setMenu(false); run(() => leagueAdminApi.update({ ourTeam: '' }), () => 'Saved.'); }} />
            {data!.teams.map((t) => <Menu.Item key={t} title={t} onPress={() => { setMenu(false); run(() => leagueAdminApi.update({ ourTeam: t }), () => 'Saved.'); }} />)}
          </Menu>
          {seasonStart && !startIso ? <Text style={card.error}>Enter the season start as DD/MM/YYYY.</Text> : null}
          <View style={card.buttons}>
            <Button mode="outlined" onPress={() => run(() => leagueAdminApi.update({ competition, seasonStart: startIso ?? s.seasonStart }), () => 'Saved.')} disabled={busy || !detailsChanged || !startIso}>Save league details</Button>
            <Button mode="text" onPress={() => run(() => leagueAdminApi.clearResults(), () => 'Pasted results cleared. Paste the results page again to start fresh.')} disabled={busy || !data?.resultsSaved}>{`Clear pasted results (${data?.resultsSaved ?? 0})`}</Button>
          </View>
          <Text style={card.muted}>Season started {resultDate(s.seasonStart)}.</Text>
        </>
      ) : null}

      {data?.table.length ? (
        <ScrollView horizontal style={card.box} contentContainerStyle={styles.table}>
          <View>
            <View style={styles.tr}>
              {['#', 'Team', 'P', 'W', 'D', 'L', 'GD', 'Pts'].map((h, i) => <Text key={h} style={[styles.th, i === 1 ? styles.team : styles.num]}>{h}</Text>)}
            </View>
            {data.table.map((r) => {
              const us = r.team === ourName;
              const cell = [styles.td, us ? styles.us : null];
              return (
                <View key={r.team} style={styles.tr}>
                  <Text style={[...cell, styles.num]}>{r.position}</Text>
                  <Text style={[...cell, styles.team]} numberOfLines={1}>{r.team}</Text>
                  {[r.played, r.won, r.drawn, r.lost].map((v, i) => <Text key={i} style={[...cell, styles.num]}>{v}</Text>)}
                  <Text style={[...cell, styles.num]}>{r.goalDifference > 0 ? '+' : ''}{r.goalDifference}</Text>
                  <Text style={[...cell, styles.num]}>{r.points}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : null}
    </SettingsCard>
  );
}

const useStyles = themedStyles((c) => ({
  teamButton: { marginTop: 8, alignSelf: 'flex-start' },
  table: { paddingRight: 8 },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 30, borderBottomWidth: 1, borderBottomColor: c.border },
  th: { color: c.textLight, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  td: { color: c.text, fontSize: 13, fontVariant: ['tabular-nums'] },
  us: { color: c.primary, fontWeight: '800' },
  num: { width: 34, textAlign: 'center' },
  team: { width: 170, paddingRight: 6 },
}));
