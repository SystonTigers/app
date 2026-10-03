import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Share, Text, View } from 'react-native';
import { Button, IconButton, Snackbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { withOpacity } from '../theme/utils';
import { FONTS } from '../theme/brandFonts';
import DrillVideos from '../components/drills/DrillVideos';
import DrillFormModal from '../components/drills/DrillFormModal';
import { difficultyColor } from '../components/drills/DrillCard';
import { allDrills, findDrill, refFrom, shareText } from '../utils/drills';
import { loadDrills, removeDrill, setFavourite, useDrills } from '../services/drillsStore';
import { apiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../utils/roles';

/**
 * One drill: what it is, set-up, how it works, coaching points, ways to make
 * it harder or easier, and videos. Everyone can star it; staff add videos,
 * edit or remove club drills, or "Make our version" of a built-in drill.
 */
export default function DrillScreen({ navigation, route }: { navigation: any; route: { params?: { ref?: string } } }) {
  const c = useBrandColors();
  const styles = useStyles();
  const { user } = useAuth();
  const staff = isStaffRole(user?.role);
  const drills = useDrills();
  const ref = refFrom(route.params?.ref);
  const [form, setForm] = useState<'edit' | 'copy' | null>(null);
  const [message, setMessage] = useState('');

  useFocusEffect(useCallback(() => {
    void loadDrills();
  }, []));

  const drill = useMemo(() => (ref ? findDrill(ref, allDrills(drills.club)) : null), [ref, drills.club]);

  if (!drill) {
    const waiting = ref?.startsWith('club:') && !drills.loaded;
    return (
      <View style={[styles.container, styles.center]}>
        {waiting ? <ActivityIndicator color={c.primary} size="large" /> : (
          <>
            <MaterialCommunityIcons name="clipboard-remove-outline" size={56} color={c.textLight} />
            <Text style={styles.missing}>This drill has been removed.</Text>
            <Button mode="contained" onPress={() => navigation.navigate('DrillLibrary')}>Drill Library</Button>
          </>
        )}
      </View>
    );
  }

  const favourite = drills.favourites.includes(drill.ref);
  const links = drills.links[drill.ref] ?? [];
  const diff = difficultyColor(c, drill.difficulty);

  const toggle = () => setFavourite(drill.ref, !favourite)
    .then(() => setMessage(favourite ? 'Removed from your favourites.' : 'Added to your favourites.'))
    .catch((err) => setMessage(apiErrorMessage(err, "That didn't save. Please try again.")));

  const confirmRemove = () => Alert.alert('Remove this drill?', `${drill.name} will be removed for everyone at the club, with its videos.`, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Remove',
      style: 'destructive',
      onPress: () => {
        removeDrill(drill.id)
          .then(() => navigation.navigate('DrillLibrary'))
          .catch((err) => setMessage(apiErrorMessage(err, "The drill wasn't removed. Please try again.")));
      },
    },
  ]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.category}>{drill.club ? 'OUR DRILL · ' : ''}{drill.category.toUpperCase()}</Text>
            <Text style={styles.name} accessibilityRole="header">{drill.name}</Text>
          </View>
          <IconButton
            icon={favourite ? 'star' : 'star-outline'}
            iconColor={favourite ? c.primary : c.textLight}
            size={30}
            onPress={toggle}
            accessibilityLabel={favourite ? 'Remove from favourites' : 'Add to favourites'}
          />
        </View>

        <View style={styles.meta}>
          <View style={[styles.pill, { backgroundColor: withOpacity(diff, 0.16) }]}><Text style={[styles.pillText, { color: diff }]}>{drill.difficulty}</Text></View>
          <Meta icon="clock-outline" text={drill.duration} />
          <Meta icon="account-group" text={`${drill.players} players`} />
        </View>

        {drill.description ? <Text style={styles.body}>{drill.description}</Text> : null}

        {drill.diagramUrl ? (
          <Image source={{ uri: drill.diagramUrl }} style={styles.diagram} resizeMode="contain" accessibilityLabel={`${drill.name} diagram`} />
        ) : null}

        {drill.setup ? <Section title="Set-up"><Text style={styles.body}>{drill.setup}</Text></Section> : null}
        <Section title="Equipment">
          <Text style={styles.body}>{drill.equipment.length ? drill.equipment.join(' · ') : 'Nothing needed'}</Text>
        </Section>
        {drill.steps.length ? (
          <Section title="How it works">
            {drill.steps.map((s, i) => (
              <View key={i} style={styles.step}>
                <Text style={[styles.stepNo, { color: c.primary }]}>{i + 1}</Text>
                <Text style={[styles.body, styles.flex]}>{s}</Text>
              </View>
            ))}
          </Section>
        ) : null}
        {drill.coachingPoints.length ? (
          <Section title="Coaching points">
            {drill.coachingPoints.map((s, i) => (
              <View key={i} style={styles.step}>
                <MaterialCommunityIcons name="whistle" size={16} color={c.primary} style={styles.bullet} />
                <Text style={[styles.body, styles.flex]}>{s}</Text>
              </View>
            ))}
          </Section>
        ) : null}
        {drill.progressions.length ? (
          <Section title="Make it harder or easier">
            {drill.progressions.map((s, i) => (
              <View key={i} style={styles.step}>
                <MaterialCommunityIcons name={/^easier/i.test(s) ? 'arrow-down-bold' : 'arrow-up-bold'} size={16} color={c.textLight} style={styles.bullet} />
                <Text style={[styles.body, styles.flex]}>{s}</Text>
              </View>
            ))}
          </Section>
        ) : null}
        {drill.focus.length ? <Section title="Focus"><Text style={styles.body}>{drill.focus.join(' · ')}</Text></Section> : null}

        {links.length || staff ? (
          <Section title="Videos">
            <DrillVideos drillRef={drill.ref} links={links} staff={staff} onMessage={setMessage} />
          </Section>
        ) : null}

        <View style={styles.actions}>
          <Button mode="outlined" icon="share-variant" onPress={() => Share.share({ title: drill.name, message: shareText(drill) }).catch(() => undefined)}>Share</Button>
          {staff && drill.club ? <Button mode="outlined" icon="pencil" onPress={() => setForm('edit')}>Edit</Button> : null}
          {staff && !drill.club ? <Button mode="outlined" icon="content-copy" onPress={() => setForm('copy')}>Make our version</Button> : null}
          {staff && drill.club ? <Button mode="text" textColor={c.error} icon="delete-outline" onPress={confirmRemove}>Remove</Button> : null}
        </View>
      </ScrollView>

      <DrillFormModal
        visible={!!form}
        editing={form === 'edit' ? drill : null}
        copyFrom={form === 'copy' ? drill : null}
        onDismiss={() => setForm(null)}
        onSaved={(saved) => {
          setForm(null);
          setMessage(form === 'copy' ? 'Saved as one of your club drills.' : 'Drill saved.');
          if (saved.ref !== drill.ref) navigation.setParams({ ref: saved.ref });
        }}
      />
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3500}>{message}</Snackbar>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Meta({ icon, text }: { icon: string; text: string }) {
  const c = useBrandColors();
  const styles = useStyles();
  return (
    <View style={styles.metaItem}>
      <MaterialCommunityIcons name={icon as never} size={16} color={c.primary} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  missing: { color: c.text, fontSize: 16, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 56, maxWidth: 760, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  category: { color: c.textLight, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  name: { color: c.text, fontFamily: FONTS.display, fontSize: 32, lineHeight: 36, letterSpacing: 0.5, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginTop: 10, marginBottom: 12 },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: c.text, fontSize: 14 },
  body: { color: c.text, fontSize: 15, lineHeight: 22 },
  flex: { flex: 1 },
  diagram: { width: '100%', height: 220, marginTop: 14, borderRadius: 12, backgroundColor: c.surface },
  section: { marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  sectionTitle: { color: c.primary, fontWeight: '900', fontSize: 12, letterSpacing: 1.2, marginBottom: 8 },
  step: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  stepNo: { fontFamily: FONTS.display, fontSize: 20, width: 20, textAlign: 'center', lineHeight: 22 },
  bullet: { marginTop: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
}));
