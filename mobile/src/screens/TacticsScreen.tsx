import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../utils/roles';
import { apiClient, apiErrorMessage } from '../services/api';
import { DEFAULT_TACTICS, FORMATIONS, STYLES, levelLabel, positions, readTactics, type Tactics } from '../utils/tactics';

/**
 * How we play (the website's Training → Tactics): the formation on a pitch
 * and the team's style. Coaches change it; everyone else sees it.
 */
export default function TacticsScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const { user } = useAuth();
  const staff = isStaffRole(user?.role);
  const [tactics, setTactics] = useState<Tactics>(DEFAULT_TACTICS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<'attacking' | 'defensive'>('attacking');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = (await apiClient.get('/api/v1/tactics')).data?.data;
      setTactics(readTactics(data));
      setSaved(!!data);
    } catch (err) {
      setError(apiErrorMessage(err, "Tactics didn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      await apiClient.post('/api/v1/tactics', tactics);
      setSaved(true);
      setNotice('Tactics saved. Everyone at the club can see them here.');
    } catch (err) {
      setError(apiErrorMessage(err, "The tactics didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const Choice = ({ label, options, value, onPick }: { label: string; options: readonly string[]; value: string; onPick: (v: string) => void }) => (
    <View style={styles.choice}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const on = value === o;
          return (
            <Pressable key={o} disabled={!staff} onPress={() => onPick(o)} style={[styles.chip, on ? { backgroundColor: c.primary, borderColor: c.primary } : null, !staff && !on ? styles.dim : null]} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: !staff }}>
              <Text style={[styles.chipText, on ? { color: c.onPrimary } : null]}>{levelLabel(o)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const setPhaseValue = (key: string, v: string) => setTactics((t) => ({ ...t, phases: { ...t.phases, [phase]: { ...t.phases[phase], [key]: v } } }));
  const W = 300; const H = 400;

  if (loading) return <View style={styles.container}><ActivityIndicator color={c.primary} style={styles.loading} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>
      <Text style={styles.intro}>{staff ? 'Set the team’s shape and how you want to play. Players and parents see it here.' : 'How the coaches want us to play.'}</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

      {!staff && !saved ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>NO TACTICS SET YET</Text>
          <Text style={styles.body}>The coaches haven&apos;t set the team&apos;s shape yet.</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.cardTitle, styles.flex]}>FORMATION</Text>
              <Text style={[styles.big, { color: c.primary }]}>{tactics.formation}</Text>
            </View>
            <View style={styles.pitch} accessibilityLabel={`Pitch showing a ${tactics.formation} formation`}>
              <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
                <Rect x={8} y={8} width={W - 16} height={H - 16} rx={10} fill={c.surfaceRaised} stroke={c.border} strokeWidth={2} />
                <Line x1={8} y1={H / 2} x2={W - 8} y2={H / 2} stroke={c.border} strokeWidth={2} />
                <Circle cx={W / 2} cy={H / 2} r={34} fill="none" stroke={c.border} strokeWidth={2} />
                <Rect x={W * 0.25} y={H - 8 - 56} width={W * 0.5} height={56} fill="none" stroke={c.border} strokeWidth={2} />
                <Rect x={W * 0.25} y={8} width={W * 0.5} height={56} fill="none" stroke={c.border} strokeWidth={2} />
                {positions(tactics.formation).map((p, i) => (
                  <Circle key={i} cx={8 + p.x * (W - 16)} cy={H - 8 - p.y * (H - 16)} r={13} fill={i === 0 ? c.text : c.primary} stroke={c.background} strokeWidth={3} />
                ))}
              </Svg>
            </View>
            {staff ? (
              <View style={styles.chips}>
                {FORMATIONS.map((f) => {
                  const on = tactics.formation === f;
                  return (
                    <Pressable key={f} onPress={() => setTactics({ ...tactics, formation: f })} style={[styles.chip, on ? { backgroundColor: c.primary, borderColor: c.primary } : null]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                      <Text style={[styles.chipText, on ? { color: c.onPrimary } : null]}>{f}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>HOW WE PLAY</Text>
            <View style={styles.choice}>
              <Text style={styles.label}>Playing style</Text>
              <View style={styles.chips}>
                {(STYLES.includes(tactics.playingStyle) ? STYLES : [...STYLES, tactics.playingStyle]).map((s) => {
                  const on = tactics.playingStyle === s;
                  return (
                    <Pressable key={s} disabled={!staff} onPress={() => setTactics({ ...tactics, playingStyle: s })} style={[styles.chip, on ? { backgroundColor: c.primary, borderColor: c.primary } : null, !staff && !on ? styles.dim : null]} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: !staff }}>
                      <Text style={[styles.chipText, on ? { color: c.onPrimary } : null]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Choice label="Pressing" options={['low', 'medium', 'high']} value={tactics.pressingIntensity} onPick={(v) => setTactics({ ...tactics, pressingIntensity: v as Tactics['pressingIntensity'] })} />
            <Choice label="Build-up play" options={['short', 'mixed', 'direct']} value={tactics.buildUpPlay} onPick={(v) => setTactics({ ...tactics, buildUpPlay: v as Tactics['buildUpPlay'] })} />
            <Choice label="Defensive line" options={['deep', 'medium', 'high']} value={tactics.defensiveLine} onPick={(v) => setTactics({ ...tactics, defensiveLine: v as Tactics['defensiveLine'] })} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>IN AND OUT OF POSSESSION</Text>
            <View style={styles.chips}>
              {(['attacking', 'defensive'] as const).map((p) => {
                const on = phase === p;
                return (
                  <Pressable key={p} onPress={() => setPhase(p)} style={[styles.chip, on ? { backgroundColor: c.primary, borderColor: c.primary } : null]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                    <Text style={[styles.chipText, on ? { color: c.onPrimary } : null]}>{p === 'attacking' ? 'With the ball' : 'Without the ball'}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Choice label="Width" options={['narrow', 'normal', 'wide']} value={tactics.phases[phase].width} onPick={(v) => setPhaseValue('width', v)} />
            {phase === 'attacking'
              ? <Choice label="Tempo" options={['low', 'medium', 'high']} value={tactics.phases.attacking.tempo} onPick={(v) => setPhaseValue('tempo', v)} />
              : <Choice label="Aggression" options={['low', 'medium', 'high']} value={tactics.phases.defensive.aggression} onPick={(v) => setPhaseValue('aggression', v)} />}
          </View>

          {staff ? <Button mode="contained" icon="content-save" onPress={save} loading={saving} disabled={saving}>Save tactics</Button> : null}
        </>
      )}
    </ScrollView>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  intro: { color: c.textLight, lineHeight: 20 },
  notice: { color: c.success, fontWeight: '700' },
  error: { color: c.error },
  loading: { marginTop: 24 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 10 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  big: { fontFamily: FONTS.display, fontSize: 30 },
  body: { color: c.text, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  pitch: { width: '100%', maxWidth: 320, aspectRatio: 3 / 4, alignSelf: 'center' },
  choice: { gap: 6 },
  label: { color: c.text, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  chipText: { color: c.text, fontWeight: '700', fontSize: 13 },
  dim: { opacity: 0.5 },
}));
