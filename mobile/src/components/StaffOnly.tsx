import React from 'react';
import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { isAdminRole, isStaffRole } from '../utils/roles';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';

type Level = 'staff' | 'admin';

/** Shown instead of a staff screen when someone without the role opens it (e.g. from a link). */
export function StaffOnlyNotice({ level = 'staff' }: { level?: Level }) {
  const styles = useStyles();
  const c = useBrandColors();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <MaterialCommunityIcons name="shield-lock-outline" size={40} color={c.primary} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {level === 'admin' ? 'This is for club admins' : 'This is for club staff'}
      </Text>
      <Text style={styles.body}>
        {level === 'admin'
          ? 'Only the club’s owner and admins can open this page.'
          : 'Only the club’s managers and coaches can open this page. If you help run the club, ask an admin to change your role in People & Roles.'}
      </Text>
      <Button
        mode="contained"
        icon="home-variant"
        onPress={() => navigation.navigate('TabNavigator')}
        accessibilityLabel="Back to Home"
        style={styles.button}
      >
        Back to Home
      </Button>
    </View>
  );
}

/**
 * Wraps a screen so only staff (or only admins) see it. The server checks every
 * change anyway; this stops other members landing on a page they can't use.
 */
export function staffScreen<P extends object>(Screen: React.ComponentType<P>, level: Level = 'staff'): React.FC<P> {
  function Guarded(props: P) {
    const { user } = useAuth();
    const allowed = level === 'admin' ? isAdminRole(user?.role) : isStaffRole(user?.role);
    if (!allowed) return <StaffOnlyNotice level={level} />;
    return <Screen {...props} />;
  }
  Guarded.displayName = `StaffOnly(${Screen.displayName || Screen.name || 'Screen'})`;
  return Guarded;
}

const useStyles = themedStyles((c) => ({
  wrap: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primarySoft,
    marginBottom: 20,
  },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 28, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
  body: { color: c.textLight, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8, maxWidth: 320 },
  button: { marginTop: 24 },
}));
