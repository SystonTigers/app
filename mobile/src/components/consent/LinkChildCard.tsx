import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, parentLinkApi } from '../../services/api';
import { clearPendingInvite, pendingInvite } from '../../services/inviteLink';

/**
 * Parent: enter the code from the manager to link your account to your child.
 * A player uses the same code to link their own page (`forSelf`).
 * A code from an invite link is filled in already.
 */
export default function LinkChildCard({ prominent, onLinked, forSelf = false }: { prominent: boolean; onLinked: (name: string) => void; forSelf?: boolean }) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [open, setOpen] = useState(prominent);

  useEffect(() => {
    pendingInvite().then((c) => {
      if (c) {
        setCode(c);
        setOpen(true);
      }
    });
  }, []);

  const link = async () => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      const res = await parentLinkApi.link(code);
      await clearPendingInvite();
      setCode('');
      setDone(res.data.alreadyLinked ? `You're already linked to ${res.data.name}.` : `Linked to ${res.data.name}.`);
      onLinked(res.data.name);
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't work. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={styles.link}>Got a code for another child? Link them</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, prominent ? styles.prominent : null]}>
      <Text style={styles.title}>{forSelf ? 'Link your player page' : 'Link your child'}</Text>
      <Text style={styles.help}>{forSelf ? 'Enter the code your manager gave you (like K7QM-3XRD). Then you can write your bio.' : 'Enter the code the manager sent you (like K7QM-3XRD).'}</Text>
      <View style={styles.row}>
        <TextInput
          value={code}
          onChangeText={(t) => { setCode(t.toUpperCase()); setError(''); }}
          placeholder="Code"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          style={styles.input}
          accessibilityLabel="Code from the manager"
        />
        <Pressable onPress={link} disabled={busy || code.replace(/[^A-Za-z0-9]/g, '').length !== 8} accessibilityRole="button"
          style={[styles.button, busy || code.replace(/[^A-Za-z0-9]/g, '').length !== 8 ? styles.disabled : null]}>
          <Text style={styles.buttonText}>{busy ? 'Linking…' : 'Link'}</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      {done ? <Text style={styles.done}>{done}</Text> : null}
      {forSelf ? <Text style={styles.small}>No code? Ask your manager: they can make one in Photo & video consent.</Text> : !prominent ? <Text style={styles.small}>No code? Ask your child's manager to send you one from the app.</Text> : (
        <Text style={styles.small}>No code yet? Ask your child's manager: they can send you one from Photo & video consent in the app.</Text>
      )}
    </View>
  );
}

const useStyles = themedStyles((COLORS) => ({
  card: { backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 8 },
  prominent: { borderColor: COLORS.primary },
  title: { color: COLORS.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' },
  help: { color: COLORS.textLight },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  // minWidth 0: a web text box otherwise keeps its natural width and pushes Link off the card
  input: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, borderRadius: 12, padding: 10, color: COLORS.text, fontSize: 18, letterSpacing: 2, fontWeight: '800' },
  button: { flexShrink: 0, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18 },
  buttonText: { color: COLORS.onPrimary, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  error: { color: COLORS.error },
  done: { color: COLORS.primary, fontWeight: '800' },
  small: { color: COLORS.textLight, fontSize: 12 },
  link: { color: COLORS.primary, fontWeight: '700' },
}));
