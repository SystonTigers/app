import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import {
  Card,
  Paragraph,
  Chip,
  Avatar,
  IconButton,
  Searchbar,
  Divider,
  Text,
} from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { apiClient } from '../services/api';
import { getTenantId } from '../services/club';

interface User {
  id: string;
  tenant_id: string;
  email: string;
  roles: string[];
  profile: {
    name?: string;
    phone?: string;
  } | null;
  created_at: number;
  updated_at: number;
}

const roleColors: { [key: string]: string } = {
  admin: '#F44336',
  coach: '#2196F3',
  player: '#4CAF50',
  parent: '#FF9800',
  fan: '#9C27B0',
};

const roleIcons: { [key: string]: string } = {
  admin: 'shield-crown',
  coach: 'whistle',
  player: 'soccer',
  parent: 'account-supervisor',
  fan: 'heart',
};

export default function ManageUsersScreen() {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, selectedRole, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Uses the shared API client so the signed-in user's token is attached
      const { data } = await apiClient.get('/api/v1/admin/users', {
        params: { tenantId: getTenantId() },
      });

      if (data.success) {
        setUsers(data.users || []);
      } else {
        throw new Error(data.error?.message || 'Failed to load users');
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filter by search query (email or name)
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.profile?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by role
    if (selectedRole) {
      filtered = filtered.filter((user) => user.roles.includes(selectedRole));
    }

    setFilteredUsers(filtered);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getRoleBadges = (roles: string[]) => {
    return roles.map((role) => (
      <Chip
        key={role}
        mode="outlined"
        icon={roleIcons[role] || 'account'}
        style={[styles.roleChip, { borderColor: roleColors[role] || '#999' }]}
        textStyle={{ color: roleColors[role] || '#999', fontSize: 12 }}
      >
        {role}
      </Chip>
    ));
  };

  const getInitials = (email: string, name?: string) => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.count}>
        {users.length} total user{users.length !== 1 ? 's' : ''}
      </Text>

      {/* Search Bar */}
      <Searchbar
        placeholder="Search by email or name..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={{ color: COLORS.text }}
        iconColor={COLORS.textLight}
        placeholderTextColor={COLORS.textLight}
      />

      {/* Role Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <Chip
          mode={selectedRole === null ? 'flat' : 'outlined'}
          selected={selectedRole === null}
          onPress={() => setSelectedRole(null)}
          style={styles.filterChip}
        >
          All ({users.length})
        </Chip>
        {['admin', 'coach', 'player', 'parent', 'fan'].map((role) => {
          const count = users.filter((u) => u.roles.includes(role)).length;
          if (count === 0) return null;
          return (
            <Chip
              key={role}
              mode={selectedRole === role ? 'flat' : 'outlined'}
              selected={selectedRole === role}
              onPress={() => setSelectedRole(role)}
              style={styles.filterChip}
              icon={roleIcons[role]}
            >
              {role} ({count})
            </Chip>
          );
        })}
      </ScrollView>

      {/* Users List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {filteredUsers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Paragraph style={styles.emptyText}>
                {searchQuery || selectedRole
                  ? 'No users match your filters'
                  : 'No users registered yet'}
              </Paragraph>
            </Card.Content>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} style={styles.userCard}>
              <Card.Content style={styles.userCardContent}>
                <View style={styles.userInfo}>
                  <Avatar.Text
                    size={50}
                    label={getInitials(user.email, user.profile?.name)}
                    color={roleColors[user.roles[0]] || COLORS.primary}
                    style={{
                      backgroundColor: `${roleColors[user.roles[0]] || COLORS.primary}24`,
                      borderWidth: 1,
                      borderColor: roleColors[user.roles[0]] || COLORS.primary,
                    }}
                  />
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      {user.profile?.name || user.email}
                    </Text>
                    {user.profile?.name && (
                      <Text style={styles.userEmail}>{user.email}</Text>
                    )}
                    {user.profile?.phone && (
                      <Text style={styles.userPhone}>{user.profile.phone}</Text>
                    )}
                    <View style={styles.rolesContainer}>{getRoleBadges(user.roles)}</View>
                  </View>
                </View>
                <View style={styles.userMeta}>
                  <Text style={styles.metaText}>
                    Joined: {formatDate(user.created_at)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = themedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
  },
  count: {
    color: COLORS.textLight,
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchBar: {
    margin: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border,
    elevation: 0,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
  },
  emptyCard: {
    margin: 16,
    marginTop: 32,
    backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 16,
  },
  userCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border,
  },
  userCardContent: {
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  userPhone: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  roleChip: {
    height: 28,
    marginRight: 4,
    backgroundColor: 'transparent',
  },
  userMeta: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
}));
