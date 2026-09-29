import React, { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../config';
import { apiErrorMessage, consentApi, parentLinkApi, type LinkedParent, type PlayerConsent } from '../../services/api';
import { inviteMessage } from '../../services/inviteLink';
import ConsentQuestion from './ConsentQuestion';

const mark = (v: boolean | null) => (v === true ? '✓' : v === false ? '✗' : '?');
const markStyle = (v: boolean | null) => (v === true ? styles.yes : v === false ? styles.no : styles.unknown);

/** Share the invite: the phone's share sheet (WhatsApp, text), else show it to copy. */
async function shareInvite(message: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
      if (nav.share) {
        await nav.share({ text: message });
        return true;
      }
      await navigator.clipboard.writeText(message);
      return true;
    }
    await Share.share({ message });
    return true;
  } catch {
    return false;
  }
}

/**
 * Staff: one player on a line (photo, video, linked parents). Tap to record
 * an answer from a paper form, invite a parent or check who's linked.
 */
export default function StaffConsentRow({ player, clubName, clubSlug, onChanged }: {
  player: PlayerConsent; clubName: string; clubSlug: string | null; onChanged: (p: PlayerConsent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState<{ code: string; message: string; shared: boolean } | null>(null);
  const [parents, setParents] = useState<LinkedParent[] | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && parents === null) {
      parentLinkApi.parents(player.playerId).then((r) => setParents(r.data)).catch(() => setParents([]));
    }
  };

  const answer = async (field: 'photos' | 'video', value: boolean) => {
    setBusy(field);
    setError('');
    try {
      onChanged((await consentApi.set(player.playerId, { [field]: value })).data);
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  const makeInvite = async () => {
    setBusy('invite');
    setError('');
    try {
      const res = await parentLinkApi.invite(player.playerId);
      const message = inviteMessage(clubName, player.name, res.data.code, clubSlug);
      const shared = await shareInvite(message);
      setInvite({ code: res.data.code, message, shared });
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't make a code. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  const unlink = async (p: LinkedParent) => {
    setBusy(p.userId);
    try {
      const res = await parentLinkApi.unlink(player.playerId, p.userId);
      setParents(res.data);
      onChanged({ ...player, linkedParents: res.data.length });
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't remove that link."));
    } finally {
      setBusy(null);
    }
  };

  const linked = player.linkedParents ?? 0;
  return (
    <View style={styles.wrap}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={`${player.name}: photos ${mark(player.photos)}, video ${mark(player.video)}, ${linked} parents linked`} style={styles.row}>
        <Text style={styles.name} numberOfLines={1}>{player.number !== null ? `${player.number}. ` : ''}{player.name}</Text>
        <Text style={[styles.badge, markStyle(player.photos)]}>📷 {mark(player.photos)}</Text>
        <Text style={[styles.badge, markStyle(player.video)]}>🎥 {mark(player.video)}</Text>
        <Text style={[styles.badge, linked ? styles.plain : styles.unknown]}>👪 {linked}</Text>
      </Pressable>
      {open ? (
        <View style={styles.panel}>
          <ConsentQuestion label="Photos (recording a paper form)" value={player.photos} busy={busy === 'photos'} onAnswer={(v) => answer('photos', v)} />
          <ConsentQuestion label="Video" value={player.video} busy={busy === 'video'} onAnswer={(v) => answer('video', v)} />
          {player.source ? <Text style={styles.small}>{player.source === 'parent' ? 'Last answered by a parent in the app' : 'Last recorded by club staff'}</Text> : null}

          <Text style={styles.heading}>Parents linked</Text>
          {parents === null ? <Text style={styles.small}>Loading…</Text> : parents.length ? parents.map((p) => (
            <View key={p.userId} style={styles.parent}>
              <Text style={styles.parentEmail} numberOfLines={1}>{p.email}</Text>
              <Pressable onPress={() => unlink(p)} disabled={busy === p.userId} accessibilityRole="button" accessibilityLabel={`Remove ${p.email}`}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          )) : <Text style={styles.small}>Nobody yet. Send the family a code so they can answer in the app.</Text>}
          <Pressable onPress={makeInvite} disabled={busy === 'invite'} accessibilityRole="button" style={styles.invite}>
            <Text style={styles.inviteText}>{busy === 'invite' ? 'Making a code…' : 'Invite a parent (WhatsApp, text…)'}</Text>
          </Pressable>
          {invite ? (
            <View style={styles.code}>
              <Text style={styles.codeText} selectable>{invite.code}</Text>
              <Text style={styles.small} selectable>{invite.shared ? 'Sent to your share options (copied on a computer). Works for 30 days; making a new code stops this one.' : invite.message}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#14181C', borderRadius: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12 },
  name: { flex: 1, color: COLORS.text, fontWeight: '700' },
  badge: { fontSize: 13, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  yes: { color: COLORS.primary },
  no: { color: COLORS.error },
  unknown: { color: '#F5C400' },
  plain: { color: COLORS.textLight },
  panel: { padding: 12, paddingTop: 0, gap: 10 },
  heading: { color: COLORS.text, fontWeight: '800', marginTop: 6 },
  parent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  parentEmail: { flex: 1, color: COLORS.textLight },
  remove: { color: COLORS.error, fontWeight: '700' },
  invite: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  inviteText: { color: COLORS.primary, fontWeight: '800' },
  code: { gap: 4 },
  codeText: { color: COLORS.text, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  small: { color: COLORS.textLight, fontSize: 12 },
  error: { color: COLORS.error },
});
