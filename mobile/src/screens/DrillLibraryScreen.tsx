import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Chip, Searchbar, Snackbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import DrillCard from '../components/drills/DrillCard';
import DrillFormModal from '../components/drills/DrillFormModal';
import { DRILL_CATEGORIES } from '../data/drillsData';
import { allDrills, filterDrills, refFrom, type DrillView } from '../utils/drills';
import { loadDrills, setFavourite, useDrills } from '../services/drillsStore';
import { apiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../utils/roles';

const VIEWS: Array<[DrillView, string, string]> = [
  ['all', 'All drills', 'view-grid-outline'],
  ['favourites', 'Favourites', 'star'],
  ['club', 'Our drills', 'shield-star-outline'],
];

/**
 * Drill Library: the built-in drills and the club's own, with search,
 * category and difficulty filters, favourites (each person has their own)
 * and, for staff, "New drill". Tapping a drill opens its page.
 */
export default function DrillLibraryScreen({ navigation, route }: { navigation: any; route?: { params?: { drillId?: string; view?: DrillView } } }) {
  const c = useBrandColors();
  const styles = useStyles();
  const { user } = useAuth();
  const staff = isStaffRole(user?.role);
  const drills = useDrills();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [view, setView] = useState<DrillView>(route?.params?.view ?? 'all');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    void loadDrills();
  }, []));

  // Older links (Training Centre, shared addresses) open a drill straight away
  const linked = refFrom(route?.params?.drillId);
  useEffect(() => {
    if (!linked) return;
    navigation.setParams({ drillId: undefined });
    navigation.navigate('Drill', { ref: linked });
  }, [linked, navigation]);

  const everything = useMemo(() => allDrills(drills.club), [drills.club]);
  const shown = useMemo(
    () => filterDrills(everything, { query, category, difficulty, view, favourites: drills.favourites }),
    [everything, query, category, difficulty, view, drills.favourites],
  );
  const categories = useMemo(() => {
    const extra = drills.club.map((d) => d.category).filter((x) => !DRILL_CATEGORIES.includes(x));
    return [...DRILL_CATEGORIES, ...new Set(extra)];
  }, [drills.club]);

  const toggle = async (ref: string) => {
    const on = !drills.favourites.includes(ref);
    try {
      await setFavourite(ref, on);
    } catch (err) {
      setMessage(apiErrorMessage(err, "That didn't save. Check your connection and try again."));
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadDrills(true);
    setRefreshing(false);
  };

  const emptyText = view === 'favourites'
    ? 'Tap the star on any drill to keep it here.'
    : view === 'club'
      ? staff ? "Your club hasn't made any drills yet. Tap New drill, or open any drill and choose \"Make our version\"." : "Your coaches haven't added any club drills yet."
      : 'Try a different search or filter.';

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.views}>
        {VIEWS.map(([key, label, icon]) => (
          <Chip
            key={key}
            icon={icon}
            selected={view === key}
            showSelectedCheck={false}
            onPress={() => setView(key)}
            style={[styles.chip, view === key ? styles.chipOn : null]}
            textStyle={view === key ? styles.chipOnText : undefined}
            accessibilityLabel={`${label}${key === 'favourites' ? `, ${drills.favourites.length}` : ''}`}
          >
            {label}{key === 'favourites' && drills.favourites.length ? ` (${drills.favourites.length})` : ''}{key === 'club' && drills.club.length ? ` (${drills.club.length})` : ''}
          </Chip>
        ))}
      </ScrollView>

      <Searchbar placeholder="Search drills" onChangeText={setQuery} value={query} style={styles.search} iconColor={c.primary} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {['All', ...categories].map((cat) => (
          <Chip key={cat} selected={category === cat} showSelectedCheck={false} onPress={() => setCategory(cat)} style={[styles.chip, category === cat ? styles.chipOn : null]} textStyle={category === cat ? styles.chipOnText : undefined} compact>
            {cat}
          </Chip>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {['All', 'beginner', 'intermediate', 'advanced'].map((d) => (
          <Chip key={d} selected={difficulty === d} showSelectedCheck={false} onPress={() => setDifficulty(d)} style={[styles.chip, difficulty === d ? styles.chipOn : null]} textStyle={difficulty === d ? styles.chipOnText : undefined} compact>
            {d === 'All' ? 'Any level' : d.charAt(0).toUpperCase() + d.slice(1)}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.countRow}>
          <Text style={styles.count}>{shown.length} drill{shown.length === 1 ? '' : 's'}</Text>
          {staff ? <Button mode="contained" icon="plus" compact onPress={() => setCreating(true)}>New drill</Button> : null}
        </View>
        {drills.error ? <Text style={styles.error}>{drills.error}</Text> : null}
        {shown.length ? shown.map((d) => (
          <DrillCard
            key={d.ref}
            drill={d}
            favourite={drills.favourites.includes(d.ref)}
            videos={drills.links[d.ref]?.length ?? 0}
            onPress={() => navigation.navigate('Drill', { ref: d.ref })}
            onToggleFavourite={() => toggle(d.ref)}
          />
        )) : (
          <View style={styles.empty}>
            <MaterialCommunityIcons name={view === 'favourites' ? 'star-outline' : 'soccer-field'} size={56} color={c.textLight} />
            <Text style={styles.emptyTitle}>{view === 'favourites' ? 'No favourites yet' : 'No drills here'}</Text>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        )}
      </ScrollView>

      <DrillFormModal
        visible={creating}
        onDismiss={() => setCreating(false)}
        onSaved={(saved) => {
          setCreating(false);
          navigation.navigate('Drill', { ref: saved.ref });
        }}
      />
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={5000}>{message}</Snackbar>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  views: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  filters: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  chipOnText: { color: c.onPrimary, fontWeight: '700' },
  search: { marginHorizontal: 16, marginVertical: 12, backgroundColor: c.surface, borderRadius: 14 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 48 },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  count: { color: c.textLight, fontSize: 13 },
  error: { color: c.error, marginBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { color: c.text, fontSize: 17, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  emptyText: { color: c.textLight, fontSize: 14, textAlign: 'center', lineHeight: 20 },
}));
