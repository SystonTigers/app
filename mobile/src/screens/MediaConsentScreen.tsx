import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { useClub } from '../context/ClubContext';
import { apiErrorMessage, consentApi, type PlayerConsent } from '../services/api';
import { consentSummary, filterConsent, type ConsentFilter } from '../utils/consent';
import ConsentQuestion from '../components/consent/ConsentQuestion';
import LinkChildCard from '../components/consent/LinkChildCard';
import StaffConsentRow from '../components/consent/StaffConsentRow';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { seesConsent } from '../utils/roles';

type Field = 'photos' | 'video';

const FILTERS: Array<{ id: ConsentFilter; label: string }> = [
  { id: 'unanswered', label: 'Not answered' },
  { id: 'noVideo', label: 'No video yes' },
  { id: 'noParent', label: 'No parent linked' },
  { id: 'all', label: 'Everyone' },
];

/**
 * Photo and video consent. Parents link their account to their child with
 * the manager's code, then answer for them. Staff see the squad one line per
 * player, record answers from paper forms and send families a code.
 */
export default function MediaConsentScreen() {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const { club } = useClub();
  const { user } = useAuth();
  const isPlayer = user?.role === 'player';
  const clubName = club?.name || 'the club';
  const [players, setPlayers] = useState<PlayerConsent[]>([]);
  const [staff, setStaff] = useState(false);
  const [filter, setFilter] = useState<ConsentFilter>('unanswered');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await consentApi.get();
      setPlayers(res.data.players);
      setStaff(res.data.canEditAll);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't load this. Check your signal and try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const replace = (p: PlayerConsent) => setPlayers((list) => list.map((x) => (x.playerId === p.playerId ? { ...x, ...p } : x)));

  const answer = async (player: PlayerConsent, field: Field, value: boolean) => {
    setSaving(`${player.playerId}:${field}`);
    setError('');
    try {
      replace((await consentApi.set(player.playerId, { [field]: value })).data);
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setSaving(null);
    }
  };

  if (!seesConsent(user?.role)) {
    return (
      <View style={[styles.container, styles.center, { padding: 32 }]}>
        <MaterialCommunityIcons name="camera-lock" size={40} color={COLORS.primary} />
        <Text style={[styles.intro, { textAlign: 'center', marginTop: 12 }]}>
          Photo and video consent is answered by players and their parents. As a supporter there&apos;s nothing for you to do here.
        </Text>
      </View>
    );
  }

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const summary = consentSummary(players);
  const shown = staff ? filterConsent(players, filter) : players;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
    >
      <Text style={styles.intro}>
        {staff
          ? 'Who can appear in photos and videos the club shares publicly. Parents answer in the app once linked to their child; tap a player to send the family a code or record a paper form.'
          : isPlayer
            ? `Can ${clubName} use your photo and video? This covers social media posts, the club website and match highlight videos.`
            : `Can ${clubName} use your child's photo and video? This covers social media posts, the club website and match highlight videos.`}
      </Text>
      <Text style={styles.small}>
        {isPlayer
          ? 'Without a yes, your photo is never shown publicly and the manager is warned before sharing video of you. You can change your answer at any time.'
          : "Without a yes, a child's photo is never shown publicly and the manager is warned before sharing video of them. Answers can be changed at any time."}
      </Text>
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

      {staff ? (
        <>
          <View style={styles.summary}>
            <SummaryItem label="Photos: yes" value={`${summary.photosYes}/${players.length}`} />
            <SummaryItem label="Video: yes" value={`${summary.videoYes}/${players.length}`} />
            <SummaryItem label="No parent linked" value={String(summary.noParent)} warn={summary.noParent > 0} />
          </View>
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Pressable key={f.id} onPress={() => setFilter(f.id)} accessibilityRole="button" accessibilityState={{ selected: filter === f.id }}
                style={[styles.filter, filter === f.id ? styles.filterOn : null]}>
                <Text style={[styles.filterText, filter === f.id ? styles.filterTextOn : null]}>{f.label} ({filterConsent(players, f.id).length})</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.legend}>
            <MaterialCommunityIcons name="camera" size={14} color={COLORS.textLight} /><Text style={styles.small}>photos</Text>
            <MaterialCommunityIcons name="video" size={14} color={COLORS.textLight} /><Text style={styles.small}>video</Text>
            <MaterialCommunityIcons name="account-multiple" size={14} color={COLORS.textLight} /><Text style={styles.small}>parents linked · ✓ yes · ✗ no · ? not answered</Text>
          </View>
          {shown.length ? shown.map((p) => (
            <StaffConsentRow key={p.playerId} player={p} clubName={clubName} clubSlug={club?.slug ?? null} onChanged={replace} />
          )) : <Text style={styles.empty}>{players.length ? 'Nobody here: all done.' : 'Add players in Manage squad first.'}</Text>}
        </>
      ) : (
        <>
          {/* A player links once, to themselves; parents can link more children */}
          {isPlayer && players.length ? null : <LinkChildCard prominent={!players.length} forSelf={isPlayer} onLinked={() => load()} />}
          {players.map((p) => (
            <View key={p.playerId} style={styles.card}>
              <Text style={styles.name}>{isPlayer ? 'Your answer' : p.name}</Text>
              <ConsentQuestion label="Photos" value={p.photos} busy={saving === `${p.playerId}:photos`} onAnswer={(v) => answer(p, 'photos', v)} />
              <ConsentQuestion label="Video (live stream and highlights)" value={p.video} busy={saving === `${p.playerId}:video`} onAnswer={(v) => answer(p, 'video', v)} />
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function SummaryItem({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, warn ? styles.warn : null]}>{value}</Text>
      <Text style={styles.small}>{label}</Text>
    </View>
  );
}

const useStyles = themedStyles((COLORS) => ({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  intro: { color: COLORS.text, fontSize: 15, lineHeight: 21 },
  small: { color: COLORS.textLight, fontSize: 12 },
  error: { color: COLORS.error, backgroundColor: 'rgba(255,0,85,0.14)', borderRadius: 12, padding: 12 },
  summary: { flexDirection: 'row', gap: 8 },
  summaryItem: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 12, alignItems: 'center' },
  summaryValue: { color: COLORS.text, fontSize: 26, fontFamily: FONTS.display, fontVariant: ['tabular-nums'] },
  warn: { color: COLORS.warning },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  filter: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  filterOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  filterTextOn: { color: COLORS.onPrimary },
  empty: { color: COLORS.textLight, textAlign: 'center', paddingVertical: 24 },
  card: { backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 10 },
  name: { color: COLORS.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' },
}));
