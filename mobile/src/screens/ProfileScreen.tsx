import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { Text, Card, TextInput, Button, Avatar, IconButton, Divider } from 'react-native-paper';
import { COLORS } from '../config';
import { useAuth } from '../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '+44 7700 900123',
    profileImage: null as string | null,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateProfileField = (field: keyof typeof profileData, value: string) => {
    setProfileData({ ...profileData, [field]: value });
  };

  const updatePasswordField = (field: keyof typeof passwordData, value: string) => {
    setPasswordData({ ...passwordData, [field]: value });
  };

  const handlePickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a profile picture.');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setProfileData({ ...profileData, profileImage: result.assets[0].uri });
      // TODO: Upload to server
      // await api.post('/api/v1/users/profile/avatar', {
      //   image: result.assets[0].uri
      // });
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);

    try {
      // TODO: API call to update profile
      // const response = await api.put('/api/v1/users/profile', {
      //   tenant: TENANT_ID,
      //   userId: user?.userId,
      //   firstName: profileData.firstName,
      //   lastName: profileData.lastName,
      //   phone: profileData.phone,
      // });

      // Mock success
      setTimeout(() => {
        setLoading(false);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      }, 1000);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // TODO: API call to change password
      // const response = await api.post('/api/v1/users/change-password', {
      //   tenant: TENANT_ID,
      //   userId: user?.userId,
      //   currentPassword: passwordData.currentPassword,
      //   newPassword: passwordData.newPassword,
      // });

      // Mock success
      setTimeout(() => {
        setLoading(false);
        setShowPasswordSection(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        Alert.alert('Success', 'Password changed successfully!');
      }, 1000);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to change password. Please check your current password and try again.');
    }
  };

  const getRoleBadgeColor = (role: string | undefined) => {
    switch (role) {
      case 'admin':
        return COLORS.error;
      case 'coach':
        return COLORS.primary;
      case 'player':
        return COLORS.success;
      case 'parent':
        return '#9C27B0';
      default:
        return COLORS.textLight;
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
              label={`${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`}
              style={styles.avatar}
              color="#000"
            />
          )}
          <IconButton
            icon="camera"
            iconColor="#fff"
            size={20}
            style={styles.cameraButton}
            onPress={handlePickImage}
          />
        </View>

        <Text style={styles.name}>
          {profileData.firstName} {profileData.lastName}
        </Text>

        <View style={styles.roleBadge}>
          <MaterialCommunityIcons
            name={user?.role === 'admin' ? 'shield-crown' : user?.role === 'coach' ? 'whistle' : user?.role === 'player' ? 'soccer' : 'account-child'}
            size={16}
            color="#fff"
          />
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Profile Information */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Profile Information</Text>
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
                  buttonColor={COLORS.primary}
                  textColor="#000"
                >
                  Save
                </Button>
              </View>
            )}
          </View>

          <Divider style={styles.divider} />

          {/* First Name */}
          <TextInput
            label="First Name"
            value={profileData.firstName}
            onChangeText={(text) => updateProfileField('firstName', text)}
            mode="outlined"
            disabled={!isEditing}
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />

          {/* Last Name */}
          <TextInput
            label="Last Name"
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
          <Text style={styles.hint}>Email cannot be changed</Text>

          {/* Phone */}
          <TextInput
            label="Phone Number"
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
                Change Password
              </Button>
            )}
          </View>

          {showPasswordSection && (
            <>
              <Divider style={styles.divider} />

              <TextInput
                label="Current Password"
                value={passwordData.currentPassword}
                onChangeText={(text) => updatePasswordField('currentPassword', text)}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                left={<TextInput.Icon icon="lock" />}
              />

              <TextInput
                label="New Password"
                value={passwordData.newPassword}
                onChangeText={(text) => updatePasswordField('newPassword', text)}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                left={<TextInput.Icon icon="lock-plus" />}
              />

              <TextInput
                label="Confirm New Password"
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
                  buttonColor={COLORS.primary}
                  textColor="#000"
                  style={styles.passwordButton}
                >
                  Update Password
                </Button>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Account Stats */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Account Stats</Text>
          <Divider style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="calendar-check" size={32} color={COLORS.primary} />
              <Text style={styles.statValue}>15</Text>
              <Text style={styles.statLabel}>Events Attended</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="soccer" size={32} color={COLORS.primary} />
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statLabel}>Matches Played</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="trophy" size={32} color={COLORS.primary} />
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>MOTM Awards</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Spacer for bottom */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: COLORS.secondary,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#000',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    gap: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  card: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: COLORS.surface,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: COLORS.background,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
});
