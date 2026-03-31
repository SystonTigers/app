import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { List, Text, Divider, Avatar, useTheme as usePaperTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/useTheme';
import { COLORS } from '../config';

// Define the navigation groups and their items
// This structure makes it easy to add/remove items
const MENU_GROUPS = [
    {
        id: 'match_day',
        title: 'Match Day',
        icon: 'soccer-field',
        items: [
            { label: 'Live Console', screen: 'LiveMatchInput', icon: 'gamepad-variant', roles: ['admin', 'manager', 'coach', 'parent', 'player'] },
            { label: 'Watch Live', screen: 'LiveMatchWatch', icon: 'youtube-tv', roles: ['admin', 'manager', 'coach', 'parent', 'player'] },
            { label: 'MOTM Voting', screen: 'MOTMVoting', icon: 'star-circle', roles: ['admin', 'manager', 'coach', 'parent', 'player'] },
            { label: 'Predictions', screen: 'LastManStanding', icon: 'crystal-ball', roles: ['admin', 'manager', 'coach', 'parent', 'player'] },
        ]
    },
    {
        id: 'training',
        title: 'Training & Stats',
        icon: 'whistle',
        items: [
            { label: 'Training Centre', screen: 'Training', icon: 'run', roles: ['admin', 'manager', 'coach', 'player'] },
            { label: 'Drill Library', screen: 'DrillLibrary', icon: 'clipboard-list', roles: ['admin', 'manager', 'coach', 'player'] },
            { label: 'Stats Center', screen: 'Stats', icon: 'chart-bar', roles: ['admin', 'manager', 'coach', 'parent', 'player'] },
            { label: 'League Table', screen: 'LeagueTable', icon: 'format-list-numbered', roles: ['admin', 'manager', 'coach', 'parent', 'player'] },
            { label: 'Wearables', screen: 'Wearables', icon: 'watch-variant', roles: ['player'] },
        ]
    },
    {
        id: 'my_club',
        title: 'My Club',
        icon: 'shield-account',
        items: [
            { label: 'Team Members', screen: 'TeamMembers', icon: 'account-group', roles: ['admin', 'manager', 'coach', 'parent', 'player'] },
            { label: 'Club Shop', screen: 'Shop', icon: 'shopping', roles: ['admin', 'manager', 'coach', 'parent', 'player'] },
            { label: 'Documents', screen: 'Documents', icon: 'file-document', roles: ['admin', 'manager', 'coach', 'parent', 'player'] }, // Assuming we have this or will add
        ]
    },
    {
        id: 'admin_zone',
        title: 'Manager Zone',
        icon: 'security',
        protected: true,
        roles: ['admin', 'manager', 'coach'], // Only these roles see this group
        items: [
            { label: 'Manage Squad', screen: 'ManageSquad', icon: 'account-cog', roles: ['admin', 'manager', 'coach'] },
            { label: 'Manage Fixtures', screen: 'ManageFixtures', icon: 'calendar-edit', roles: ['admin', 'manager'] },
            { label: 'Manage Events', screen: 'ManageEvents', icon: 'calendar-clock', roles: ['admin', 'manager'] },
            { label: 'Manage MOTM', screen: 'ManageMOTM', icon: 'star-cog', roles: ['admin', 'manager'] },
            { label: 'Player Images', screen: 'ManagePlayerImages', icon: 'camera-account', roles: ['admin', 'manager'] },
            { label: 'Push Notifications', screen: 'PushNotificationsSetup', icon: 'bell-ring', roles: ['admin'] },
            { label: 'Auto Posts', screen: 'AutoPostsMatrix', icon: 'robot', roles: ['admin'] },
        ]
    },
    {
        id: 'settings',
        title: 'Settings',
        icon: 'cog',
        items: [
            { label: 'My Profile', screen: 'Profile', icon: 'account-circle', roles: ['admin', 'manager', 'coach', 'parent', 'player'] },
            { label: 'App Settings', screen: 'Settings', icon: 'tune', roles: ['admin', 'manager', 'coach', 'parent', 'player'] },
            { label: 'System Config', screen: 'Config', icon: 'console', roles: ['admin'] },
        ]
    }
];

export default function CustomDrawerContent(props: any) {
    const { user, logout } = useAuth();
    const { theme } = useTheme();
    const { colors } = theme;
    const userRole = user?.role || 'player'; // Default to player if role unknown

    // State for accordion expansion
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handlePressGroup = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const handleNavigate = (screen: string) => {
        props.navigation.navigate(screen);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    // Helper to check access
    const hasAccess = (allowedRoles?: string[]) => {
        if (!allowedRoles) return true;
        return allowedRoles.includes(userRole);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Drawer Header with User Info */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={styles.userInfo}>
                    <Avatar.Text
                        size={50}
                        label={user?.firstName ? user.firstName.charAt(0).toUpperCase() : '?'}
                        style={[styles.avatar, { borderColor: colors.primary, backgroundColor: colors.primary }]}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <View style={styles.userDetails}>
                        <Text style={[styles.userName, { color: colors.text }]}>
                            {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Welcome Guest'}
                        </Text>
                        <Text style={[styles.userRole, { color: colors.primary }]}>
                            {userRole.toUpperCase()}
                        </Text>
                    </View>
                </View>
            </View>

            <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
                <View style={styles.menuContainer}>
                    {MENU_GROUPS.map((group) => {
                        // Check if user has access to this entire group
                        if (group.protected && !hasAccess(group.roles)) {
                            return null;
                        }

                        return (
                            <List.Accordion
                                key={group.id}
                                title={group.title}
                                left={props => <MaterialCommunityIcons {...props} name={group.icon as any} size={24} color={expandedId === group.id ? colors.primary : colors.textSecondary} />}
                                expanded={expandedId === group.id}
                                onPress={() => handlePressGroup(group.id)}
                                style={[styles.groupHeader, { backgroundColor: expandedId === group.id ? colors.primary + '10' : 'transparent' }]}
                                titleStyle={{ color: expandedId === group.id ? colors.primary : colors.text, fontWeight: 'bold' }}
                                theme={{ colors: { primary: colors.primary } }}
                            >
                                {group.items.map((item) => {
                                    // Check if user has access to this specific item
                                    if (!hasAccess(item.roles)) {
                                        return null;
                                    }

                                    return (
                                        <DrawerItem
                                            key={item.screen}
                                            label={item.label}
                                            icon={({ color, size }) => (
                                                <MaterialCommunityIcons name={item.icon as any} size={20} color={color} />
                                            )}
                                            onPress={() => handleNavigate(item.screen)}
                                            labelStyle={{ color: colors.textSecondary, marginLeft: -16 }}
                                            style={styles.drawerItem}
                                            activeTintColor={colors.primary}
                                            inactiveTintColor={colors.textSecondary}
                                        />
                                    );
                                })}
                            </List.Accordion>
                        );
                    })}
                </View>
            </DrawerContentScrollView>

            {/* Footer with Logout */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <DrawerItem
                    label="Log Out"
                    icon={({ color, size }) => (
                        <MaterialCommunityIcons name="logout" size={size} color={colors.error} />
                    )}
                    onPress={handleLogout}
                    labelStyle={{ color: colors.error, fontWeight: 'bold' }}
                />
                <Text style={[styles.version, { color: colors.textSecondary }]}>v1.0.0 Boost Huddle</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingTop: 50, // Status bar clearing
        borderBottomWidth: 1,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userRole: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    drawerContent: {
        paddingTop: 10,
    },
    menuContainer: {
        paddingHorizontal: 8,
    },
    groupHeader: {
        borderRadius: 8,
        marginBottom: 4,
    },
    drawerItem: {
        marginLeft: 16,
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
    },
    version: {
        textAlign: 'center',
        fontSize: 10,
        marginTop: 8,
        opacity: 0.5,
    },
});
