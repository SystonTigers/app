import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Alert, Image, Pressable } from 'react-native';
import { Text, Card, TextInput, Button, Avatar, Divider } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { useAuth } from '../context/AuthContext';
import { playerPageApi, usersApi } from '../services/api';
import type { MyPlayer } from '../utils/playerPage';
import { roleLabel } from '../utils/roles';
import LinkChildCard from '../components/consent/LinkChildCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }: any) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const { user, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profileImage: null as string | null,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linked, setLinked] = useState<MyPlayer[] | null>(null);

  const loadLinked = useCallback(() => {
    if (user?.role !== 'player' && user?.role !== 'parent') return;
    playerPageApi.mine().then(setLinked).catch(() => setLinked(null));
  }, [user?.role]);

  useEffect(() => {
    loadProfile();
    loadLinked();
  }, [loadLinked]);

  const loadProfile = async () => {
    try {
      if (!user) return;
      setProfileData(prev => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.email || prev.email,
      }));

      // Fetch fresh details if needed
      const fresh = await usersApi.getProfile();
      if (fresh.success && fresh.user) {
        setProfileData(prev => ({
          ...prev,
          firstName: fresh.user.firstName || prev.firstName,
          lastName: fresh.user.lastName || prev.lastName,
          email: fresh.user.email || prev.email,
          phone: fresh.user.phone || prev.phone,
          profileImage: fresh.user.avatarUrl || prev.profileImage
        }));
      }
    } catch (err) {
      console.warn('Failed to load profile details', err);
    }
  };

  const updateProfileField = (field: keyof typeof profileData, value: string) => {
    setProfileData({ ...profileData, [field]: value });
  };

  const updatePasswordField = (field: keyof typeof passwordData, value: string) => {
    setPasswordData({ ...passwordData, [field]: value });
  };

  const handleSaveProfile = async () => {
    setLoading(true);

    try {
      const response = await usersApi.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
      });

      if (response.success) {
        setLoading(false);
        setIsEditing(false);
        Alert.alert('Saved', 'Your details are saved.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("That didn't save", 'Please check your connection and try again.');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('Fill in all three', 'Enter your current password and the new one twice.');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      Alert.alert('Too short', 'Your new password needs at least 8 characters.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert("Passwords don't match", 'Type the same new password in both boxes.');
      return;
    }

    setLoading(true);

    try {
      const response = await usersApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.success) {
        setLoading(false);
        setShowPasswordSection(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        Alert.alert('Password changed', 'Use your new password next time you log in.');
      }
    } catch (error: any) {
      setLoading(false);
      const serverMessage = error?.response?.data?.error?.message;
      Alert.alert(
        "That didn't work",
        typeof serverMessage === 'string' && serverMessage
          ? serverMessage
          : 'Check your current password and try again.'
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header with Avatar */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profileData.profileImage ? (
            <Image source={{ uri: profileData.profileImage }} style={styles.avatarImage} />
          ) : (
            <Avatar.Text
              size={100}
              label={`${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`.toUpperCase() || '?'}
              style={styles.avatar}
              color={COLORS.primary}
            />
          )}
        </View>

        <Text style={styles.name}>
          {profileData.firstName} {profileData.lastName}
        </Text>

        <View style={styles.roleBadge}>
          <MaterialCommunityIcons
            name={user?.role === 'admin' ? 'shield-crown' : user?.role === 'coach' ? 'whistle' : user?.role === 'player' ? 'soccer' : user?.role === 'supporter' ? 'account-heart' : 'account-child'}
            size={16}
            color={COLORS.primary}
          />
          <Text style={styles.roleText}>{roleLabel(user?.clubRole ?? user?.role).toUpperCase()}</Text>
        </View>
      </View>

      {/* Profile Information */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your details</Text>
            {!isEditing ? (
              <Button
                mode="text"
                onPress={() => setIsEditing(true)}
                labelStyle={{ fontSize: 14 }}
                icon="pencil"
              >
                Edit
              </Button>
            ) : (
              <View style={styles.editButtons}>
                <Button
                  mode="text"
                  onPress={() => setIsEditing(false)}
                  labelStyle={{ fontSize: 14 }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveProfile}
                  loading={loading}
                  disabled={loading}
                  labelStyle={{ fontSize: 14 }}
                >
                  Save
                </Button>
              </View>
            )}
          </View>

          <Divider style={styles.divider} />

          {/* First Name */}
          <TextInput
            label="First name"
            value={profileData.firstName}
            onChangeText={(text) => updateProfileField('firstName', text)}
            mode="outlined"
            disabled={!isEditing}
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />

          {/* Last Name */}
          <TextInput
            label="Last name"
            value={profileData.lastName}
            onChangeText={(text) => updateProfileField('lastName', text)}
            mode="outlined"
            disabled={!isEditing}
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />

          {/* Email (Read-only) */}
          <TextInput
            label="Email"
            value={profileData.email}
            mode="outlined"
            disabled={true}
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
            right={<TextInput.Icon icon="lock" />}
          />
          <Text style={styles.hint}>Your email can&apos;t be changed here.</Text>

          {/* Phone */}
          <TextInput
            label="Phone number"
            value={profileData.phone}
            onChangeText={(text) => updateProfileField('phone', text)}
            mode="outlined"
            disabled={!isEditing}
            keyboardType="phone-pad"
            style={styles.input}
            left={<TextInput.Icon icon="phone" />}
          />
        </Card.Content>
      </Card>

      {/* Change Password */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Security</Text>
            {!showPasswordSection && (
              <Button
                mode="text"
                onPress={() => setShowPasswordSection(true)}
                labelStyle={{ fontSize: 14 }}
                icon="lock-reset"
              >
                Change password
              </Button>
            )}
          </View>

          {showPasswordSection && (
            <>
              <Divider style={styles.divider} />

              <TextInput
                label="Current password"
                value={passwordData.currentPassword}
                onChangeText={(text) => updatePasswordField('currentPassword', text)}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                left={<TextInput.Icon icon="lock" />}
              />

              <TextInput
                label="New password"
                value={passwordData.newPassword}
                onChangeText={(text) => updatePasswordField('newPassword', text)}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                left={<TextInput.Icon icon="lock-plus" />}
              />

              <TextInput
                label="Confirm new password"
                value={passwordData.confirmPassword}
                onChangeText={(text) => updatePasswordField('confirmPassword', text)}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                left={<TextInput.Icon icon="lock-check" />}
              />

              <View style={styles.passwordButtons}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowPasswordSection(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  style={styles.passwordButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleChangePassword}
                  loading={loading}
                  disabled={loading}
                  style={styles.passwordButton}
                >
                  Update password
                </Button>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Players: their own page. Parents: their children's pages (real links only, no made-up numbers) */}
      {linked && (user?.role === 'player' || user?.role === 'parent') ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>{user?.role === 'player' ? 'Your player page' : 'Your children'}</Text>
            <Divider style={styles.divider} />
            {linked.length ? (
              linked.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => navigation.navigate('Player', { id: p.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${p.isMe ? 'your' : `${p.name}'s`} player page`}
                  style={styles.linkedRow}
                >
                  <MaterialCommunityIcons name={p.isMe ? 'account-star' : 'account-child'} size={24} color={COLORS.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkedName}>{p.isMe ? 'Stats, photos and goals' : p.name}</Text>
                    <Text style={styles.linkedHint}>{p.isMe ? (p.hasBio ? 'Open your player page' : 'Add a short bio so everyone knows a bit about you.') : 'Open their player page'}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textLight} />
                </Pressable>
              ))
            ) : (
              <LinkChildCard prominent forSelf={user?.role === 'player'} onLinked={loadLinked} />
            )}
          </Card.Content>
        </Card>
      ) : null}

      {/* Spacer for bottom */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const useStyles = themedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    padding: 4,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatar: {
    backgroundColor: COLORS.primarySoft,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 30,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
    marginTop: 16,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    gap: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.primary,
  },
  card: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: COLORS.border,
  },
  input: {
    marginBottom: 12,
    backgroundColor: COLORS.background,
  },
  hint: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 12,
    fontStyle: 'italic',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  passwordButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  passwordButton: {
    flex: 1,
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  linkedName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  linkedHint: {
    color: COLORS.textLight,
    fontSize: 13,
    marginTop: 2,
  },
}));
