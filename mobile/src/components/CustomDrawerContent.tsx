import type { ClubModule } from '../services/club';
import React, { useEffect, useState } from 'react';
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

// The menu: short and role-shaped. Home, Matches, Players and Highlights are
// bottom tabs, so they aren't repeated here. Families see only what's theirs;
// coaches get the Coach zone first, its sections folding so it stays tidy.
const ALL = ['admin', 'manager', 'coach', 'parent', 'player'];
const STAFF = ['admin', 'manager', 'coach'];
const MANAGERS = ['admin', 'manager'];
const PLAYERS_AND_STAFF = ['admin', 'manager', 'coach', 'player'];

interface MenuItem {
    label: string;
    screen: string;
    icon: string;
    roles: string[];
    /** Hidden for these roles, before supporters are treated as parents */
    hiddenFor?: string[];
    /** A club extra: shown only when the club has switched it on */
    module?: ClubModule;
}

interface MenuGroup { id: string; title: string; icon: string; items: MenuItem[] }

/** What everyone at the club sees (each item still checks its own roles). */
const MEMBER_GROUPS: MenuGroup[] = [
    {
        id: 'match_day', title: 'Match day', icon: 'soccer-field', items: [
            { label: 'Availability', screen: 'Availability', icon: 'calendar-check', roles: ['parent', 'player'], hiddenFor: ['supporter'] },
            { label: 'Live match', screen: 'LiveMatch', icon: 'whistle', roles: ALL },
            { label: 'Man of the Match vote', screen: 'MOTMVoting', icon: 'star-circle', roles: ALL },
            { label: 'Predictions', screen: 'LastManStanding', icon: 'crystal-ball', roles: ALL },
        ],
    },
    {
        id: 'training', title: 'Training', icon: 'run', items: [
            { label: 'Training sessions', screen: 'Training', icon: 'run', roles: PLAYERS_AND_STAFF },
            { label: 'Drill library', screen: 'DrillLibrary', icon: 'clipboard-list', roles: PLAYERS_AND_STAFF },
            { label: 'Tactics', screen: 'Tactics', icon: 'strategy', roles: PLAYERS_AND_STAFF },
        ],
    },
    {
        id: 'team', title: 'Team', icon: 'trophy-outline', items: [
            { label: 'Results', screen: 'Results', icon: 'scoreboard-outline', roles: ALL },
            { label: 'League table', screen: 'LeagueTable', icon: 'format-list-numbered', roles: ALL },
            { label: 'Stats', screen: 'Stats', icon: 'chart-bar', roles: ALL },
            { label: 'Club history', screen: 'ClubHistory', icon: 'history', roles: ALL },
        ],
    },
    {
        id: 'club', title: 'Club', icon: 'shield-account', items: [
            { label: 'Team Talk', screen: 'TeamTalk', icon: 'forum-outline', roles: ALL, hiddenFor: ['supporter'] },
            { label: 'Gallery', screen: 'Gallery', icon: 'image-multiple', roles: ALL },
            { label: 'Club shop', screen: 'Shop', icon: 'shopping-outline', roles: ALL, module: 'shop' },
        ],
    },
    {
        id: 'me', title: 'Me', icon: 'account-circle', items: [
            { label: 'My profile', screen: 'Profile', icon: 'account-circle', roles: ALL },
            { label: 'Photo & video consent', screen: 'MediaConsent', icon: 'camera-lock', roles: ['parent', 'player'], hiddenFor: ['supporter'] },
            { label: 'Signing on', screen: 'SigningOn', icon: 'clipboard-check-outline', roles: ['parent', 'player'], hiddenFor: ['supporter'], module: 'signingOn' },
            { label: 'App settings', screen: 'Settings', icon: 'tune', roles: ALL },
        ],
    },
];

/** The Coach zone: staff only, in folding sections. */
const STAFF_GROUPS: MenuGroup[] = [
    {
        id: 'staff_match', title: 'Match day', icon: 'scoreboard', items: [
            { label: 'Match Centre', screen: 'MatchCentre', icon: 'scoreboard', roles: STAFF },
            { label: 'Availability', screen: 'Availability', icon: 'calendar-check', roles: STAFF },
            { label: 'New club post', screen: 'CreatePost', icon: 'pencil-plus', roles: STAFF },
            { label: 'Man of the Match votes', screen: 'ManageMOTM', icon: 'star-cog', roles: MANAGERS },
        ],
    },
    {
        id: 'staff_squad', title: 'Squad & fixtures', icon: 'calendar-edit', items: [
            { label: 'Manage squad', screen: 'ManageSquad', icon: 'account-cog', roles: STAFF },
            { label: 'Manage fixtures', screen: 'ManageFixtures', icon: 'calendar-edit', roles: MANAGERS },
            { label: 'Events', screen: 'ManageEvents', icon: 'calendar-clock', roles: MANAGERS },
            { label: 'Friendlies', screen: 'Friendlies', icon: 'handshake-outline', roles: MANAGERS },
            { label: 'Opponents', screen: 'Opponents', icon: 'shield-half-full', roles: MANAGERS },
        ],
    },
    {
        id: 'staff_people', title: 'People', icon: 'account-group', items: [
            { label: 'People & roles', screen: 'TeamMembers', icon: 'account-group', roles: STAFF },
            { label: 'Photo & video consent', screen: 'MediaConsent', icon: 'camera-lock', roles: STAFF },
            { label: 'Signing on', screen: 'SigningOn', icon: 'clipboard-check-outline', roles: STAFF, module: 'signingOn' },
            { label: 'Subs and fees', screen: 'Dues', icon: 'cash-multiple', roles: MANAGERS, module: 'subs' },
            { label: 'Reports', screen: 'Reports', icon: 'flag-outline', roles: STAFF },
        ],
    },
    {
        id: 'staff_fun', title: 'Competitions & photos', icon: 'trophy-variant-outline', items: [
            { label: 'Goal of the Month', screen: 'ManageGotm', icon: 'soccer', roles: MANAGERS },
            { label: 'Last Man Standing', screen: 'ManageLms', icon: 'crystal-ball', roles: MANAGERS },
            { label: 'Player cut-outs', screen: 'PlayerCutouts', icon: 'account-box-outline', roles: STAFF },
            { label: 'Player images', screen: 'ManagePlayerImages', icon: 'camera-account', roles: MANAGERS },
        ],
    },
    {
        id: 'staff_setup', title: 'Club setup', icon: 'cog-outline', items: [
            { label: 'Club settings', screen: 'ClubSettings', icon: 'cog-outline', roles: MANAGERS },
            { label: 'Seasons', screen: 'ManageSeasons', icon: 'calendar-range', roles: MANAGERS },
            { label: 'Import data', screen: 'ImportData', icon: 'file-upload-outline', roles: MANAGERS },
            { label: 'Push notifications', screen: 'PushNotificationsSetup', icon: 'bell-ring', roles: ['admin'] },
        ],
    },
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
    const shows = (item: MenuItem) => hasAccess(item.roles) && !item.hiddenFor?.includes(userRole) && (!item.module || club?.modules?.[item.module] === true);
    const staff = hasAccess(STAFF);
    const staffGroups = staff ? STAFF_GROUPS.map((g) => ({ ...g, items: g.items.filter(shows) })).filter((g) => g.items.length) : [];
    // One Coach zone section open at a time: the one you're in, else Match day
    const here = staffGroups.find((g) => g.items.some((i) => i.screen === current))?.id;
    const [open, setOpen] = useState<string | null>(here ?? 'staff_match');
    useEffect(() => { if (here) setOpen(here); }, [here]);
    const name = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Welcome';

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const renderItem = (item: MenuItem, groupId: string) => {
        const active = current === item.screen;
        return (
            <Pressable
                key={`${groupId}-${item.screen}`}
                onPress={() => props.navigation.navigate(item.screen)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [styles.item, active ? { backgroundColor: `${color}1A` } : null, pressed ? styles.pressed : null]}
            >
                {active ? <View style={[styles.activeBar, { backgroundColor: color }]} /> : null}
                <MaterialCommunityIcons name={item.icon as any} size={20} color={active ? color : 'rgba(242,245,247,0.7)'} />
                <Text style={[styles.itemLabel, active ? styles.itemLabelActive : null]}>{item.label}</Text>
            </Pressable>
        );
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
                {staffGroups.length ? (
                    <View style={[styles.staffZone, styles.zoneFirst, { borderColor: `${color}40` }]}>
                        <View style={styles.zoneHead}>
                            <MaterialCommunityIcons name="security" size={15} color={color} />
                            <Text style={[styles.zoneTitle, { color }]}>COACH ZONE</Text>
                        </View>
                        {staffGroups.map((group) => {
                            const expanded = open === group.id;
                            return (
                                <View key={group.id}>
                                    <Pressable
                                        onPress={() => setOpen(expanded ? null : group.id)}
                                        accessibilityRole="button"
                                        accessibilityState={{ expanded }}
                                        accessibilityLabel={`${group.title}, ${group.items.length} items`}
                                        style={({ pressed }) => [styles.fold, pressed ? styles.pressed : null]}
                                    >
                                        <MaterialCommunityIcons name={group.icon as any} size={18} color={expanded ? color : 'rgba(242,245,247,0.6)'} />
                                        <Text style={[styles.foldLabel, expanded ? styles.itemLabelActive : null]}>{group.title}</Text>
                                        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="rgba(242,245,247,0.5)" />
                                    </Pressable>
                                    {expanded ? <View style={styles.foldItems}>{group.items.map((item) => renderItem(item, group.id))}</View> : null}
                                </View>
                            );
                        })}
                    </View>
                ) : null}
                {MEMBER_GROUPS.map((group) => {
                    const items = group.items.filter(shows);
                    if (!items.length) return null;
                    return (
                        <View key={group.id} style={styles.section}>
                            <View style={styles.sectionHead}>
                                <Text style={styles.sectionTitle}>{group.title.toUpperCase()}</Text>
                            </View>
                            {items.map((item) => renderItem(item, group.id))}
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
    menu: { paddingVertical: 8, paddingHorizontal: 10, gap: 2 },
    section: { paddingBottom: 6 },
    sectionHead: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
    sectionTitle: { color: 'rgba(242,245,247,0.42)', fontFamily: FONTS.displaySemi, fontSize: 13, letterSpacing: 2 },
    item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44, paddingHorizontal: 12, borderRadius: 12 },
    pressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
    activeBar: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 2 },
    itemLabel: { flex: 1, color: 'rgba(242,245,247,0.88)', fontSize: 15, fontWeight: '600' },
    staffZone: { borderWidth: 1, borderRadius: 16, padding: 4, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.025)' },
    zoneFirst: { marginTop: 4, marginBottom: 6 },
    zoneHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
    zoneTitle: { fontFamily: FONTS.displaySemi, fontSize: 13, letterSpacing: 2 },
    fold: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 46, paddingHorizontal: 12, borderRadius: 12 },
    foldLabel: { flex: 1, color: 'rgba(242,245,247,0.88)', fontSize: 15, fontWeight: '700' },
    foldItems: { paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)', marginLeft: 20, marginBottom: 4 },
    itemLabelActive: { color: '#FFFFFF', fontWeight: '800' },
    footer: { paddingHorizontal: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    logout: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    logoutText: { color: '#FF5C6A', fontWeight: '800' },
    powered: { color: 'rgba(242,245,247,0.35)', fontFamily: FONTS.displaySemi, fontSize: 12, letterSpacing: 1.5 },
});
