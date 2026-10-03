import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { themedStyles } from '../../theme/brand';
import { apiErrorMessage, playerPageApi } from '../../services/api';
import { bioProblem, MAX_BIO } from '../../utils/playerPage';

/**
 * The player's own words. Only the player can write or change it; staff can
 * take it down. Everyone at the club can read it.
 */
export default function PlayerBio({ playerId, firstName, bio, canEdit, canRemove, onSaved, onMessage }: {
  playerId: string; firstName: string; bio: string | null; canEdit: boolean; canRemove: boolean;
  onSaved: (bio: string | null) => void; onMessage: (text: string) => void;
}) {
  const styles = useStyles();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (value: string) => {
    const problem = bioProblem(value);
    if (problem) return setError(problem);
    setSaving(true);
    setError('');
    try {
      const saved = await playerPageApi.setBio(playerId, value);
      onSaved(saved);
      setEditing(false);
      onMessage(saved ? 'Your bio is saved.' : 'Bio removed.');
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const takeDown = () => Alert.alert('Remove this bio?', `${firstName} can write a new one.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => void save('') },
  ]);

  if (editing) {
    return (
      <View>
        <TextInput
          mode="outlined"
          multiline
          numberOfLines={5}
          value={text}
          onChangeText={(t) => { setText(t); setError(''); }}
          maxLength={MAX_BIO + 50}
          label="About me"
          accessibilityLabel="Your bio"
          placeholder="Position, favourite player, best goal, what you're working on…"
        />
        <Text style={styles.counter}>{text.trim().length}/{MAX_BIO} · No links, phone numbers or social media names</Text>
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.buttons}>
          <Button mode="outlined" onPress={() => setEditing(false)} disabled={saving}>Cancel</Button>
          <Button mode="contained" onPress={() => save(text)} loading={saving} disabled={saving}>Save</Button>
        </View>
      </View>
    );
  }

  return (
    <View>
      {bio ? <Text style={styles.bio}>{bio}</Text> : (
        <Text style={styles.empty}>{canEdit ? 'Tell everyone at the club a bit about you.' : `${firstName} hasn't written a bio yet.`}</Text>
      )}
      {canEdit || (canRemove && bio) ? (
        <View style={styles.buttons}>
          {canEdit ? <Button mode="contained-tonal" icon="pencil" onPress={() => { setText(bio ?? ''); setEditing(true); }}>{bio ? 'Edit my bio' : 'Write my bio'}</Button> : null}
          {canRemove && bio ? <Button mode="text" icon="delete-outline" onPress={takeDown} loading={saving}>Remove</Button> : null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  bio: { color: c.text, fontSize: 15, lineHeight: 22 },
  empty: { color: c.textLight, fontSize: 14, fontStyle: 'italic' },
  counter: { color: c.textLight, fontSize: 12, marginTop: 4 },
  error: { color: c.error, marginTop: 6 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
}));
