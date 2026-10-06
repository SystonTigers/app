import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Modal, Portal, TextInput } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, reportContent } from '../../services/api';
import { REPORT_REASONS, type ReportType } from '../../utils/reports';

interface Props {
  /** What's being reported; null hides the sheet */
  target: { type: ReportType; id: string; what: string } | null;
  onClose: () => void;
}

/**
 * Report a post or message to the club's staff: pick a reason, add a note
 * if you like. Staff see it in Manager zone → Reports.
 */
export default function ReportSheet({ target, onClose }: Props) {
  const c = useBrandColors();
  const styles = useStyles();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (target) { setReason(''); setDetails(''); setError(''); setSent(false); }
  }, [target]);

  const send = async () => {
    if (!target || !reason) return;
    setSending(true); setError('');
    try {
      await reportContent({ contentType: target.type, contentId: target.id, reason, details: details.trim() || undefined });
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err, "The report didn't send. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Portal>
      <Modal visible={!!target} onDismiss={onClose} contentContainerStyle={styles.modal}>
        {sent ? (
          <>
            <Text style={styles.title}>THANKS FOR TELLING US</Text>
            <Text style={styles.body}>The club&apos;s staff will look at it and take it down if it shouldn&apos;t be there.</Text>
            <Button mode="contained" onPress={onClose}>Done</Button>
          </>
        ) : (
          <>
            <Text style={styles.title}>REPORT THIS {target?.what.toUpperCase() ?? ''}</Text>
            <Text style={styles.meta}>What&apos;s wrong with it?</Text>
            <View style={styles.reasons}>
              {REPORT_REASONS.map((r) => {
                const on = reason === r.id;
                return (
                  <Pressable key={r.id} onPress={() => setReason(r.id)} style={[styles.chip, on ? { backgroundColor: c.primary, borderColor: c.primary } : null]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                    <Text style={[styles.chipText, on ? { color: c.onPrimary } : null]}>{r.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput mode="outlined" label="Anything else? (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} />
            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
            <Button mode="contained" onPress={send} loading={sending} disabled={sending || !reason}>Send report</Button>
            <Button mode="text" onPress={onClose} disabled={sending}>Cancel</Button>
          </>
        )}
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, margin: 16, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 18, gap: 10 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  body: { color: c.text, lineHeight: 21 },
  meta: { color: c.textLight, fontSize: 13 },
  error: { color: c.error },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, minHeight: 36 },
  chipText: { color: c.text, fontWeight: '700', fontSize: 13 },
}));
