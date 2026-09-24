import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import Card from '../components/ui/Card';
import { COLORS, WEBSITE_URL } from '../config';
import { useClub } from '../context/ClubContext';
import { ClubSummary, fetchClubInfo, searchClubs } from '../services/club';

interface FindClubScreenProps {
  /** A club was chosen: carry on to log in / sign up for it. */
  onClubChosen: () => void;
  /** Log in without choosing first; the server finds the club from the email. */
  onLogIn: () => void;
}

const SEARCH_DELAY_MS = 300;

export default function FindClubScreen({ onClubChosen, onLogIn }: FindClubScreenProps) {
  const { chooseClub } = useClub();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClubSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState('');
  const latestQuery = useRef('');

  useEffect(() => {
    const q = query.trim();
    latestQuery.current = q;
    setError('');
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchClubs(q)
        .then((clubs) => {
          // Ignore answers to older searches that arrive late
          if (latestQuery.current === q) setResults(clubs);
        })
        .catch(() => {
          if (latestQuery.current === q) setError("We couldn't search right now. Check your connection and try again.");
        })
        .finally(() => {
          if (latestQuery.current === q) setSearching(false);
        });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const pick = async (summary: ClubSummary) => {
    setOpening(summary.slug);
    setError('');
    try {
      const club = await fetchClubInfo(summary.slug);
      if (!club) {
        setError(`${summary.name} isn't available any more.`);
        return;
      }
      await chooseClub(club);
      onClubChosen();
    } catch {
      setError("We couldn't open that club. Check your connection and try again.");
    } finally {
      setOpening(null);
    }
  };

  const showNoResults = query.trim().length >= 2 && !searching && !error && results.length === 0;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons name="shield-search" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Find your club</Text>
          <Text style={styles.subtitle}>Search for your club to see fixtures, results, news and match videos.</Text>
        </View>

        <TextInput
          label="Club name"
          placeholder="e.g. Riverside Rovers"
          value={query}
          onChangeText={setQuery}
          mode="outlined"
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          left={<TextInput.Icon icon="magnify" />}
          right={searching ? <TextInput.Icon icon={() => <ActivityIndicator size="small" color={COLORS.primary} />} /> : undefined}
          style={styles.input}
          accessibilityLabel="Search for your club"
        />

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        {results.map((club) => (
          <Pressable
            key={club.slug}
            onPress={() => pick(club)}
            disabled={opening !== null}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${club.name}`}
          >
            <Card inset style={styles.result}>
              <View style={[styles.swatch, { backgroundColor: club.primaryColor || COLORS.primary }]} />
              <View style={styles.resultText}>
                <Text style={styles.resultName}>{club.name}</Text>
                <Text style={styles.resultSlug}>{club.slug}</Text>
              </View>
              {opening === club.slug ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
              )}
            </Card>
          </Pressable>
        ))}

        {showNoResults ? (
          <Text style={styles.hint}>
            No clubs match “{query.trim()}”. Check the spelling, or ask your club for the name they signed up with.
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Button variant="ghost" onPress={onLogIn}>
            Already have an account? Log in
          </Button>
          <Button variant="ghost" size="small" onPress={() => Linking.openURL(`${WEBSITE_URL}/create-team`)}>
            Run a club? Start a free trial
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.primary}15`,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  error: {
    color: COLORS.error,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  swatch: {
    width: 12,
    height: 40,
    borderRadius: 3,
    marginRight: 12,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    color: COLORS.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  resultSlug: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 18,
  },
  hint: {
    color: COLORS.textLight,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
});
