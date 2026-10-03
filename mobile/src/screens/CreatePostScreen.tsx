import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button, HelperText, Snackbar, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { feedApi } from '../services/api';
import { useClubName } from '../context/ClubContext';

/** The longest club post the feed shows comfortably */
const MAX_LENGTH = 1000;

/**
 * A club post for the app's Latest feed. Match-day posts (goals, results, line-ups)
 * go to Facebook and Instagram automatically from Club Settings; this is for news.
 */
export default function CreatePostScreen({ navigation }: any) {
  const c = useBrandColors();
  const styles = useStyles();
  const clubName = useClubName();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const text = content.trim();
  const tooLong = content.length > MAX_LENGTH;

  const handlePost = async () => {
    if (!text || tooLong || posting) return;
    setPosting(true);
    setError(null);
    try {
      await feedApi.createPost(text, ['feed']);
      setContent('');
      setPosted(true);
    } catch (err) {
      console.error('Failed to create post:', err);
      setError("That didn't post. Check your connection and try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>Share news with everyone at the club.</Text>

        <View style={styles.card}>
          <View style={styles.where}>
            <MaterialCommunityIcons name="cellphone" size={18} color={c.primary} />
            <Text style={styles.whereText}>
              Posts go to the Latest feed on everyone&apos;s Home screen. Goals, results and line-ups are posted for you, to
              Facebook and Instagram too, as set in Club Settings.
            </Text>
          </View>

          <TextInput
            mode="outlined"
            label="Your post"
            multiline
            numberOfLines={8}
            value={content}
            onChangeText={setContent}
            placeholder="Training moves to Thursday this week…"
            style={styles.textInput}
            accessibilityLabel="Your post"
          />
          <HelperText type={tooLong ? 'error' : 'info'} visible style={styles.counter}>
            {tooLong ? `Keep it under ${MAX_LENGTH} characters (${content.length}).` : `${content.length} / ${MAX_LENGTH}`}
          </HelperText>

          <Text style={styles.label}>PREVIEW</Text>
          <View style={styles.preview}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewClub} numberOfLines={1}>{clubName}</Text>
              <Text style={styles.previewTime}>Just now</Text>
            </View>
            <Text style={[styles.previewContent, !text && styles.previewEmpty]}>{text || 'Your post will appear here.'}</Text>
          </View>

          {error ? <HelperText type="error" visible>{error}</HelperText> : null}

          <View style={styles.actions}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.actionButton} accessibilityLabel="Cancel">
              Cancel
            </Button>
            <Button
              mode="contained"
              icon="send"
              onPress={handlePost}
              loading={posting}
              style={styles.actionButton}
              disabled={!text || tooLong || posting}
              accessibilityLabel="Post to the club"
            >
              Post
            </Button>
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={posted}
        onDismiss={() => setPosted(false)}
        duration={4000}
        action={{ label: 'See it', onPress: () => navigation.navigate('TabNavigator') }}
      >
        Posted. It&apos;s on everyone&apos;s Home screen.
      </Snackbar>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingBottom: 32 },
  intro: { color: c.textLight, fontSize: 14, marginHorizontal: 16, marginTop: 14, marginBottom: 4 },
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  where: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: c.primarySoft,
    marginBottom: 16,
  },
  whereText: { flex: 1, color: c.text, fontSize: 13, lineHeight: 19 },
  textInput: { minHeight: 140 },
  counter: { textAlign: 'right' },
  label: { fontFamily: FONTS.displaySemi, fontSize: 13, letterSpacing: 2, color: c.textLight, marginTop: 8, marginBottom: 8 },
  preview: { backgroundColor: c.surfaceRaised, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 },
  previewClub: { flex: 1, fontSize: 15, fontWeight: '800', color: c.text },
  previewTime: { fontSize: 12, color: c.textLight },
  previewContent: { fontSize: 14, lineHeight: 20, color: c.text },
  previewEmpty: { color: c.textLight },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionButton: { flex: 1 },
}));
