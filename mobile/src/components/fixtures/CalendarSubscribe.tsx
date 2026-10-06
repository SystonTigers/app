import React, { useState } from 'react';
import { Linking, Platform, Pressable, Share, Text, View } from 'react-native';
import { Button, Modal, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { API_BASE_URL } from '../../config';
import { calendarUrl, googleCalendarUrl, webcalUrl } from '../../utils/calendarLink';

/**
 * "Add fixtures to my calendar": subscribes the phone's calendar (Apple or
 * Google) to the club's fixtures, so new and moved games appear by
 * themselves. Or share the link to paste into another calendar.
 */
export default function CalendarSubscribe({ clubSlug }: { clubSlug: string }) {
  const c = useBrandColors();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const url = calendarUrl(API_BASE_URL, clubSlug);

  const go = (link: string) => { setOpen(false); Linking.openURL(link).catch(() => setNote("Your phone couldn't open that. Try sharing the link instead.")); };
  const share = async () => {
    setNote('');
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setNote('Link copied. Paste it into your calendar as a subscription ("From URL").');
      } else {
        await Share.share({ message: url, url });
      }
    } catch {
      setNote(url);
    }
  };

  const Option = ({ icon, title, text, onPress }: { icon: string; title: string; text: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, pressed ? styles.pressed : null]} accessibilityRole="button" accessibilityLabel={title}>
      <MaterialCommunityIcons name={icon as never} size={24} color={c.primary} />
      <View style={styles.flex}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.meta}>{text}</Text>
      </View>
    </Pressable>
  );

  return (
    <>
      <Button mode="outlined" icon="calendar-sync" onPress={() => { setNote(''); setOpen(true); }} style={styles.button}>Add fixtures to my calendar</Button>
      <Portal>
        <Modal visible={open} onDismiss={() => setOpen(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.title}>ADD FIXTURES TO YOUR CALENDAR</Text>
          <Text style={styles.body}>Every fixture goes in your calendar, and new or moved games update by themselves.</Text>
          <Option icon="apple" title="iPhone, iPad or Mac" text="Opens your Calendar app to subscribe" onPress={() => go(webcalUrl(url))} />
          <Option icon="google" title="Google Calendar" text="Android phones and Gmail. Tap Add on the page that opens" onPress={() => go(googleCalendarUrl(url))} />
          <Option icon="link-variant" title={Platform.OS === 'web' ? 'Copy the link' : 'Share the link'} text="For Outlook or another calendar" onPress={share} />
          {note ? <Text style={styles.note} selectable>{note}</Text> : null}
          <Button mode="text" onPress={() => setOpen(false)}>Close</Button>
        </Modal>
      </Portal>
    </>
  );
}

const useStyles = themedStyles((c) => ({
  button: { alignSelf: 'flex-start' },
  modal: { backgroundColor: c.surface, margin: 16, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 18, gap: 10 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  body: { color: c.text, lineHeight: 21 },
  meta: { color: c.textLight, fontSize: 12 },
  note: { color: c.success, fontWeight: '700' },
  flex: { flex: 1 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, minHeight: 56, backgroundColor: c.surfaceRaised },
  pressed: { opacity: 0.8 },
  optionTitle: { color: c.text, fontWeight: '800' },
}));
