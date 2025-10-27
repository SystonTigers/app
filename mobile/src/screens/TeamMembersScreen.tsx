import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../theme/';
import { Card, SectionHeader, Button, Badge, Divider, EmptyState, LoadingSpinner } from '../components';
import { API_BASE_URL, TENANT_ID, API_ENDPOINTS } from '../config';
import axios from 'axios';

/**
 * TeamMembersScreen
 *
 * Features:
 * - View all team members with their roles
 * - Change user roles (admin only)
 * - Invite new members
 * - Remove members
 * - Audit log of role changes (if audit endpoint enabled)
 */

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coach' | 'player' | 'parent' | 'viewer';
  joinedAt: string;
  lastActive?: string;
}

interface RoleChangeHistory {
  id: string;
  userId: string;
  userName: string;
  oldRole: string;
  newRole: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features', color: '#F44336' },
  { value: 'coach', label: 'Coach', description: 'Manage matches, training, and players', color: '#FF9800' },
  { value: 'player', label: 'Player', description: 'View and RSVP to events, stats', color: '#4CAF50' },
  { value: 'parent', label: 'Parent', description: 'View events, RSVP for players', color: '#2196F3' },
  { value: 'viewer', label: 'Viewer', description: 'View-only access', color: '#9E9E9E' },
];

export default function TeamMembersScreen() {
  const { theme } = useTheme();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roleHistory, setRoleHistory] = useState<RoleChangeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showRoleChanger, setShowRoleChanger] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Current user (mock - will come from auth context)
  const currentUser = { id: 'user1', role: 'admin' };
  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    loadMembers();
    if (isAdmin) {
      loadRoleHistory();
    }
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      // Mock data for now - will connect to real API
      const mockMembers: TeamMember[] = [
        {
          id: '1',
          name: 'John Smith',
          email: 'john@example.com',
          role: 'admin',
          joinedAt: '2024-01-15',
          lastActive: '2025-10-12',
        },
        {
          id: '2',
          name: 'Sarah Jones',
          email: 'sarah@example.com',
          role: 'coach',
          joinedAt: '2024-02-01',
          lastActive: '2025-10-11',
        },
        {
          id: '3',
          name: 'Mike Wilson',
          email: 'mike@example.com',
          role: 'player',
          joinedAt: '2024-03-10',
          lastActive: '2025-10-10',
        },
        {
          id: '4',
          name: 'Emma Davis',
          email: 'emma@example.com',
          role: 'parent',
          joinedAt: '2024-03-15',
          lastActive: '2025-10-09',
        },
        {
          id: '5',
          name: 'Tom Brown',
          email: 'tom@example.com',
          role: 'viewer',
          joinedAt: '2024-04-01',
          lastActive: '2025-10-08',
        },
      ];

      // In production, fetch from API:
      // const response = await axios.get(`${API_BASE_URL}/api/v1/team/members`, {
      //   params: { tenant: TENANT_ID }
      // });
      // setMembers(response.data);

      setMembers(mockMembers);
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const loadRoleHistory = async () => {
    try {
      // Mock audit history
      const mockHistory: RoleChangeHistory[] = [
        {
          id: '1',
          userId: '2',
          userName: 'Sarah Jones',
          oldRole: 'player',
          newRole: 'coach',
          changedBy: 'John Smith',
          changedAt: '2024-06-15T10:30:00Z',
          reason: 'Promoted to assistant coach',
        },
        {
          id: '2',
          userId: '3',
          userName: 'Mike Wilson',
          oldRole: 'viewer',
          newRole: 'player',
          changedBy: 'John Smith',
          changedAt: '2024-03-20T14:15:00Z',
          reason: 'Added to squad',
        },
      ];

      // In production, fetch from audit endpoint:
      // const response = await axios.get(`${API_BASE_URL}/api/v1/audit/role-changes`, {
      //   params: { tenant: TENANT_ID }
      // });
      // setRoleHistory(response.data);

      setRoleHistory(mockHistory);
    } catch (error) {
      console.error('Error loading role history:', error);
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: string) => {
    if (!isAdmin) {
      Alert.alert('Unauthorized', 'Only admins can change roles');
      return;
    }

    if (member.id === currentUser.id) {
      Alert.alert('Error', 'You cannot change your own role');
      return;
    }

    setSaving(true);
    try {
      // In production, call API:
      // await axios.put(`${API_BASE_URL}/api/v1/team/members/${member.id}/role`, {
      //   tenant: TENANT_ID,
      //   role: newRole,
      //   changedBy: currentUser.id,
      //   reason: 'Manual role change',
      // });

      // Update local state
      setMembers(members.map(m =>
        m.id === member.id ? { ...m, role: newRole as any } : m
      ));

      setShowRoleChanger(false);
      setSelectedMember(null);
      Alert.alert('Success', `Role changed to ${newRole}`);

      // Reload history
      if (isAdmin) {
        loadRoleHistory();
      }
    } catch (error) {
      console.error('Error changing role:', error);
      Alert.alert('Error', 'Failed to change role');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = (member: TeamMember) => {
    if (!isAdmin) {
      Alert.alert('Unauthorized', 'Only admins can remove members');
      return;
    }

    if (member.id === currentUser.id) {
      Alert.alert('Error', 'You cannot remove yourself');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // In production, call API
              // await axios.delete(`${API_BASE_URL}/api/v1/team/members/${member.id}`, {
              //   params: { tenant: TENANT_ID }
              // });

              setMembers(members.filter(m => m.id !== member.id));
              Alert.alert('Success', 'Member removed');
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'coach': return 'warning';
      case 'player': return 'success';
      case 'parent': return 'info';
      default: return 'default';
    }
  };

  const getRoleColor = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role)?.color || '#9E9E9E';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner message="Loading team members..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        <SectionHeader
          title="Team Members"
          subtitle={`${members.length} member${members.length !== 1 ? 's' : ''}`}
          action={isAdmin ? {
            label: 'Invite',
            onPress: () => setShowInviteModal(true)
          } : undefined}
        />

        {/* Role Legend */}
        <Card variant="default" style={styles.legendCard}>
          <Text style={[styles.legendTitle, { color: theme.colors.text }]}>Roles</Text>
          <View style={styles.legendGrid}>
            {ROLE_OPTIONS.map(role => (
              <View key={role.value} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: role.color }]} />
                <Text style={[styles.legendLabel, { color: theme.colors.text }]}>
                  {role.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Members List */}
        {members.length === 0 ? (
          <EmptyState
            title="No Members"
            message="Invite team members to get started"
            action={isAdmin ? {
              label: 'Invite Member',
              onPress: () => setShowInviteModal(true)
            } : undefined}
          />
        ) : (
          <View style={styles.membersList}>
            {members.map(member => (
              <Card key={member.id} variant="elevated" elevation={1} style={styles.memberCard}>
                <View style={styles.memberHeader}>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: theme.colors.text }]}>
                      {member.name}
                    </Text>
                    <Text style={[styles.memberEmail, { color: theme.colors.textSecondary }]}>
                      {member.email}
                    </Text>
                  </View>
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {member.role}
                  </Badge>
                </View>

                <View style={styles.memberMeta}>
                  <Text style={[styles.memberMetaText, { color: theme.colors.textSecondary }]}>
                    Joined: {new Date(member.joinedAt).toLocaleDateString()}
                  </Text>
                  {member.lastActive && (
                    <Text style={[styles.memberMetaText, { color: theme.colors.textSecondary }]}>
                      Last active: {new Date(member.lastActive).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                {isAdmin && member.id !== currentUser.id && (
                  <View style={styles.memberActions}>
                    <Button
                      variant="outline"
                      size="small"
                      onPress={() => {
                        setSelectedMember(member);
                        setShowRoleChanger(true);
                      }}
                    >
                      Change Role
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onPress={() => handleRemoveMember(member)}
                    >
                      Remove
                    </Button>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}

        {/* Role Change History */}
        {isAdmin && roleHistory.length > 0 && (
          <>
            <Divider style={styles.divider} />
            <SectionHeader
              title="Role Change History"
              subtitle="Recent role changes"
              action={{
                label: showHistory ? 'Hide' : 'Show',
                onPress: () => setShowHistory(!showHistory)
              }}
            />

            {showHistory && (
              <View style={styles.historyList}>
                {roleHistory.map(change => (
                  <Card key={change.id} variant="default" style={styles.historyCard}>
                    <Text style={[styles.historyUser, { color: theme.colors.text }]}>
                      {change.userName}
                    </Text>
                    <Text style={[styles.historyChange, { color: theme.colors.textSecondary }]}>
                      {change.oldRole} → {change.newRole}
                    </Text>
                    <Text style={[styles.historyMeta, { color: theme.colors.textSecondary }]}>
                      Changed by {change.changedBy} on{' '}
                      {new Date(change.changedAt).toLocaleDateString()}
                    </Text>
                    {change.reason && (
                      <Text style={[styles.historyReason, { color: theme.colors.textSecondary }]}>
                        Reason: {change.reason}
                      </Text>
                    )}
                  </Card>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Role Changer Modal */}
      {showRoleChanger && selectedMember && (
        <View style={[styles.modal, { backgroundColor: theme.colors.backdrop }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Change Role for {selectedMember.name}
            </Text>

            <View style={styles.rolePickerContainer}>
              <Text style={[styles.rolePickerLabel, { color: theme.colors.text }]}>
                Select new role:
              </Text>
              <Picker
                selectedValue={selectedMember.role}
                onValueChange={(value) => setSelectedMember({ ...selectedMember, role: value as any })}
                style={[styles.rolePicker, { color: theme.colors.text }]}
              >
                {ROLE_OPTIONS.map(role => (
                  <Picker.Item
                    key={role.value}
                    label={`${role.label} - ${role.description}`}
                    value={role.value}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                onPress={() => {
                  setShowRoleChanger(false);
                  setSelectedMember(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={() => handleRoleChange(selectedMember, selectedMember.role)}
                loading={saving}
              >
                Save
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <View style={[styles.modal, { backgroundColor: theme.colors.backdrop }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Invite Team Member
            </Text>

            <Text style={[styles.inviteText, { color: theme.colors.textSecondary }]}>
              Feature coming soon! Members can be invited via email with a role assignment.
            </Text>

            <Button
              variant="primary"
              onPress={() => setShowInviteModal(false)}
            >
              Close
            </Button>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  legendCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 14,
  },
  membersList: {
    paddingHorizontal: 16,
  },
  memberCard: {
    marginBottom: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
  },
  memberMeta: {
    marginTop: 8,
    gap: 4,
  },
  memberMetaText: {
    fontSize: 12,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  divider: {
    marginVertical: 16,
  },
  historyList: {
    paddingHorizontal: 16,
  },
  historyCard: {
    marginBottom: 8,
  },
  historyUser: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyChange: {
    fontSize: 14,
    marginBottom: 4,
  },
  historyMeta: {
    fontSize: 12,
    marginBottom: 2,
  },
  historyReason: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  rolePickerContainer: {
    marginBottom: 24,
  },
  rolePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  rolePicker: {
    height: 150,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  inviteText: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
});
