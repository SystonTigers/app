import React from 'react';
import { menuRole, roleLabel } from '../utils/roles';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import { useTheme } from '../theme/useTheme';
import { FONTS } from '../theme/brandFonts';
import Backdrop from './brand/Backdrop';
import Crest from './home/Crest';

// The menu: every section is open, so everything is one tap away.
const ALL = ['admin', 'manager', 'coach', 'parent', 'player'];
const STAFF = ['admin', 'manager', 'coach'];
const MANAGERS = ['admin', 'manager'];

interface MenuItem {
    label: string;
    screen: string;
    icon: string;
    roles: string[];
    /** Hidden for these roles, before supporters are treated as parents */
    hiddenFor?: string[];
}

const MENU_GROUPS: { id: string; title: string; icon: string; protected?: boolean; roles?: string[]; items: MenuItem[] }[] = [
    {
        id: 'match_day',
        title: 'Match day',
        icon: 'soccer-field',
        items: [
            { label: 'Home', screen: 'TabNavigator', icon: 'home-variant', roles: ALL },
            { label: 'Match highlights', screen: 'Highlights', icon: 'play-box-multiple', roles: ALL },
            { label: 'Live match', screen: 'LiveMatch', icon: 'whistle', roles: ALL },
            { label: 'Man of the Match', screen: 'MOTMVoting', icon: 'star-circle', roles: ALL },
            { label: 'Predictions', screen: 'LastManStanding', icon: 'crystal-ball', roles: ALL },
        ]
    },
    {
        id: 'training',
        title: 'Training & stats',
        icon: 'whistle',
        items: [
            { label: 'Training centre', screen: 'Training', icon: 'run', roles: ['admin', 'manager', 'coach', 'player'] },
            { label: 'Drill library', screen: 'DrillLibrary', icon: 'clipboard-list', roles: ['admin', 'manager', 'coach', 'player'] },
            { label: 'Results', screen: 'Results', icon: 'scoreboard-outline', roles: ALL },
            { label: 'Stats', screen: 'Stats', icon: 'chart-bar', roles: ALL },
            { label: 'League table', screen: 'LeagueTable', icon: 'format-list-numbered', roles: ALL },
        ]
    },
    {
        id: 'my_club',
        title: 'My club',
        icon: 'shield-account',
        items: [
            { label: 'People & roles', screen: 'TeamMembers', icon: 'account-group', roles: STAFF },
            { label: 'Gallery', screen: 'Gallery', icon: 'image-multiple', roles: ALL },
        ]
    },
    {
        id: 'admin_zone',
        title: 'Manager zone',
        icon: 'security',
        protected: true,
        roles: STAFF, // Only these roles see this group
        items: [
            { label: 'Match Centre', screen: 'MatchCentre', icon: 'scoreboard', roles: STAFF },
            { label: 'New club post', screen: 'CreatePost', icon: 'pencil-plus', roles: STAFF },
            { label: 'Manage squad', screen: 'ManageSquad', icon: 'account-cog', roles: STAFF },
            { label: 'Manage fixtures', screen: 'ManageFixtures', icon: 'calendar-edit', roles: MANAGERS },
            { label: 'Manage results', screen: 'Results', icon: 'scoreboard-outline', roles: MANAGERS },
            { label: 'Manage events', screen: 'ManageEvents', icon: 'calendar-clock', roles: MANAGERS },
            { label: 'Man of the Match votes', screen: 'ManageMOTM', icon: 'star-cog', roles: MANAGERS },
            { label: 'Player images', screen: 'ManagePlayerImages', icon: 'camera-account', roles: MANAGERS },
            { label: 'Import data', screen: 'ImportData', icon: 'file-upload-outline', roles: MANAGERS },
            { label: 'Club settings', screen: 'ClubSettings', icon: 'cog-outline', roles: MANAGERS },
            { label: 'Push notifications', screen: 'PushNotificationsSetup', icon: 'bell-ring', roles: ['admin'] },
        ]
    },
    {
        id: 'settings',
        title: 'Settings',
        icon: 'cog',
        items: [
            { label: 'My profile', screen: 'Profile', icon: 'account-circle', roles: ALL },
            { label: 'Photo & video consent', screen: 'MediaConsent', icon: 'camera-lock', roles: ALL, hiddenFor: ['supporter'] },
            { label: 'App settings', screen: 'Settings', icon: 'tune', roles: ALL },
        ]
    }
];

export default function CustomDrawerContent(props: any) {
    const { user, logout } = useAuth();
    const { club } = useClub();
    const { theme } = useTheme();
    const color = theme.colors.primary;
    const insets = useSafeAreaInsets();
    const userRole = user?.role || 'player'; // Default to player if role unknown
    const current: string | undefined = props.state?.routes?.[props.state.index]?.name;

    const hasAccess = (allowedRoles?: string[]) => !allowedRoles || allowedRoles.includes(menuRole(userRole));
    const shows = (item: MenuItem) => hasAccess(item.roles) && !item.hiddenFor?.includes(userRole);
    const name = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Welcome';

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <View style={styles.container}>
            {/* Club banner with the signed-in person */}
            <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
                <Backdrop color={color} width={320} height={200} glowY={0.1} />
                <View style={styles.clubRow}>
                    <Crest name={club?.name || 'Club'} color={color} badgeUrl={club?.badgeUrl} size={52} />
                    <Text style={styles.clubName} numberOfLines={2}>{(club?.name || 'Your club').toUpperCase()}</Text>
                </View>
                <View style={styles.userRow}>
                    <View style={[styles.avatar, { backgroundColor: color }]}>
                        <Text style={styles.avatarText}>{user?.firstName ? user.firstName.charAt(0).toUpperCase() : '?'}</Text>
                    </View>
                    <Text style={styles.userName} numberOfLines={1}>{name}</Text>
                    <View style={[styles.role, { borderColor: `${color}88` }]}>
                        <Text style={[styles.roleText, { color }]}>{roleLabel(user?.clubRole ?? userRole).toUpperCase()}</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.menu}>
                {MENU_GROUPS.map((group) => {
                    if (group.protected && !hasAccess(group.roles)) return null;
                    const items = group.items.filter(shows);
                    if (!items.length) return null;
                    const staffZone = group.id === 'admin_zone';
                    return (
                        <View key={group.id} style={[styles.section, staffZone ? [styles.staffZone, { borderColor: `${color}33` }] : null]}>
                            <View style={styles.sectionHead}>
                                <MaterialCommunityIcons name={group.icon as any} size={14} color={staffZone ? color : 'rgba(242,245,247,0.45)'} />
                                <Text style={[styles.sectionTitle, staffZone ? { color } : null]}>{group.title.toUpperCase()}</Text>
                            </View>
                            {items.map((item) => {
                                const active = current === item.screen;
                                return (
                                    <Pressable
                                        key={`${group.id}-${item.screen}`}
                                        onPress={() => props.navigation.navigate(item.screen)}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: active }}
                                        style={({ pressed }) => [styles.item, active ? { backgroundColor: `${color}1A` } : null, pressed ? styles.pressed : null]}
                                    >
                                        {active ? <View style={[styles.activeBar, { backgroundColor: color }]} /> : null}
                                        <View style={[styles.itemIcon, { backgroundColor: active ? color : 'rgba(255,255,255,0.05)' }]}>
                                            <MaterialCommunityIcons name={item.icon as any} size={19} color={active ? '#06080B' : color} />
                                        </View>
                                        <Text style={[styles.itemLabel, active ? styles.itemLabelActive : null]}>{item.label}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    );
                })}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                <Pressable onPress={handleLogout} accessibilityRole="button" style={styles.logout}>
                    <MaterialCommunityIcons name="logout" size={18} color="#FF5C6A" />
                    <Text style={styles.logoutText}>Log out</Text>
                </Pressable>
                <Text style={styles.powered}>POWERED BY <Text style={{ color }}>BOOST HUDDLE</Text></Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#07090C' },
    header: { paddingHorizontal: 18, paddingBottom: 16, overflow: 'hidden', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
    clubRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    clubName: { flex: 1, color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 26, lineHeight: 27 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
    avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#06080B', fontFamily: FONTS.display, fontSize: 18 },
    userName: { flex: 1, color: '#F2F5F7', fontWeight: '700', fontSize: 15 },
    role: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    roleText: { fontFamily: FONTS.displaySemi, fontSize: 12, letterSpacing: 1.5 },
    menu: { paddingVertical: 10, paddingHorizontal: 10, gap: 6 },
    section: { paddingVertical: 4 },
    staffZone: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 4, marginTop: 6, backgroundColor: 'rgba(255,255,255,0.02)' },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 4 },
    sectionTitle: { color: 'rgba(242,245,247,0.45)', fontFamily: FONTS.displaySemi, fontSize: 13, letterSpacing: 2 },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 12 },
    pressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
    activeBar: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 2 },
    itemIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    itemLabel: { color: 'rgba(242,245,247,0.86)', fontSize: 15, fontWeight: '600' },
    itemLabelActive: { color: '#FFFFFF', fontWeight: '800' },
    footer: { paddingHorizontal: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    logout: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    logoutText: { color: '#FF5C6A', fontWeight: '800' },
    powered: { color: 'rgba(242,245,247,0.35)', fontFamily: FONTS.displaySemi, fontSize: 12, letterSpacing: 1.5 },
});
