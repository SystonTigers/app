import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, TextInput, Switch, List, Button, Chip, Divider } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../config';
import { clubConfigApi } from '../services/api';

interface ClubConfig {
  clubDetails: {
    name: string;
    shortName: string;
    founded: string;
    venue: string;
    email: string;
    phone: string;
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    clubBadge?: string;
    sponsorLogos: string[];
  };
  externalIds: {
    faFullTime?: string;
    youtubeChannelId?: string;
    printifyStoreId?: string;
    paymentPlatformId?: string;
  };
  featureFlags: {
    enableGallery: boolean;
    enableShop: boolean;
    enablePayments: boolean;
    enableHighlights: boolean;
    enableMOTMVoting: boolean;
    enableTrainingPlans: boolean;
    enableAwards: boolean;
  };
  policies: {
    quietHoursStart: string;
    quietHoursEnd: string;
    allowUrgentBypass: boolean;
    maxUploadSizeMB: number;
    photoConsentRequired: boolean;
  };
  navLinks: {
    websiteUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    tiktokUrl?: string;
  };
}

export default function ConfigScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ClubConfig>({
    clubDetails: {
      name: 'Syston Tigers FC',
      shortName: 'Tigers',
      founded: '1952',
      venue: 'Syston Playing Fields',
      email: 'info@systontigers.com',
      phone: '+44 116 123 4567',
    },
    branding: {
      primaryColor: '#FFD700',
      secondaryColor: '#000000',
      clubBadge: 'https://picsum.photos/200/200?random=badge',
      sponsorLogos: ['https://picsum.photos/150/80?random=sponsor1', 'https://picsum.photos/150/80?random=sponsor2'],
    },
    externalIds: {
      faFullTime: 'FA12345',
      youtubeChannelId: 'UCxxxxxxxxxx',
      printifyStoreId: 'store_abc123',
      paymentPlatformId: 'pay_xyz789',
    },
    featureFlags: {
      enableGallery: true,
      enableShop: true,
      enablePayments: true,
      enableHighlights: true,
      enableMOTMVoting: true,
      enableTrainingPlans: false,
      enableAwards: false,
    },
    policies: {
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      allowUrgentBypass: true,
      maxUploadSizeMB: 10,
      photoConsentRequired: true,
    },
    navLinks: {
      websiteUrl: 'https://systontigers.com',
      facebookUrl: 'https://facebook.com/systontigers',
      instagramUrl: 'https://instagram.com/systontigers',
      twitterUrl: 'https://x.com/systontigers',
    },
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('');

  // Load config from backend on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await clubConfigApi.getConfig();
      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load club config:', error);
      Alert.alert('Error', 'Failed to load club configuration. Using defaults.');
    } finally {
      setLoading(false);
    }
  };

  const updateClubDetail = (field: keyof ClubConfig['clubDetails'], value: string) => {
    setConfig({
      ...config,
      clubDetails: { ...config.clubDetails, [field]: value },
    });
    setHasChanges(true);
  };

  const updateBranding = (field: keyof ClubConfig['branding'], value: any) => {
    setConfig({
      ...config,
      branding: { ...config.branding, [field]: value },
    });
    setHasChanges(true);
  };

  const updateExternalId = (field: keyof ClubConfig['externalIds'], value: string) => {
    setConfig({
      ...config,
      externalIds: { ...config.externalIds, [field]: value },
    });
    setHasChanges(true);
  };

  const toggleFeature = (flag: keyof ClubConfig['featureFlags']) => {
    setConfig({
      ...config,
      featureFlags: { ...config.featureFlags, [flag]: !config.featureFlags[flag] },
    });
    setHasChanges(true);
  };

  const updatePolicy = (field: keyof ClubConfig['policies'], value: any) => {
    setConfig({
      ...config,
      policies: { ...config.policies, [field]: value },
    });
    setHasChanges(true);
  };

  const updateNavLink = (field: keyof ClubConfig['navLinks'], value: string) => {
    setConfig({
      ...config,
      navLinks: { ...config.navLinks, [field]: value },
    });
    setHasChanges(true);
  };

  const uploadBadge = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll permissions are needed.');
      return;
    }

    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateBranding('clubBadge', result.assets[0].uri);
    }
  };

  const addSponsorLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll permissions are needed.');
      return;
    }

    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateBranding('sponsorLogos', [...config.branding.sponsorLogos, result.assets[0].uri]);
    }
  };

  const removeSponsorLogo = (index: number) => {
    const newLogos = config.branding.sponsorLogos.filter((_, i) => i !== index);
    updateBranding('sponsorLogos', newLogos);
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      const response = await clubConfigApi.updateConfig(config);
      if (response.success) {
        Alert.alert('Saved', 'Club configuration has been updated!', [
          { text: 'OK', onPress: () => setHasChanges(false) }
        ]);
      } else {
        Alert.alert('Error', 'Failed to save configuration. Please try again.');
      }
    } catch (error: any) {
      console.error('Failed to save club config:', error);
      Alert.alert('Error', 'Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Paragraph style={{ marginTop: 16 }}>Loading configuration...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Club Configuration</Title>
        <Paragraph style={styles.headerSubtitle}>Manage club settings & branding</Paragraph>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Club Details */}
        <Card style={styles.sectionCard}>
          <List.Item
            title="Club Details"
            description="Basic information about your club"
            left={props => <List.Icon {...props} icon="shield-outline" color={COLORS.primary} />}
            right={props => <List.Icon {...props} icon={expandedSection === 'details' ? 'chevron-up' : 'chevron-down'} />}
            onPress={() => toggleSection('details')}
          />
          {expandedSection === 'details' && (
            <Card.Content>
              <TextInput
                label="Club Name"
                value={config.clubDetails.name}
                onChangeText={(text) => updateClubDetail('name', text)}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Short Name"
                value={config.clubDetails.shortName}
                onChangeText={(text) => updateClubDetail('shortName', text)}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Founded Year"
                value={config.clubDetails.founded}
                onChangeText={(text) => updateClubDetail('founded', text)}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />
              <TextInput
                label="Home Venue"
                value={config.clubDetails.venue}
                onChangeText={(text) => updateClubDetail('venue', text)}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Email"
                value={config.clubDetails.email}
                onChangeText={(text) => updateClubDetail('email', text)}
                mode="outlined"
                keyboardType="email-address"
                style={styles.input}
              />
              <TextInput
                label="Phone"
                value={config.clubDetails.phone}
                onChangeText={(text) => updateClubDetail('phone', text)}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </Card.Content>
          )}
        </Card>

        {/* Branding */}
        <Card style={styles.sectionCard}>
          <List.Item
            title="Branding & Colors"
            description="Club badge, colors, sponsor logos"
            left={props => <List.Icon {...props} icon="palette" color={COLORS.primary} />}
            right={props => <List.Icon {...props} icon={expandedSection === 'branding' ? 'chevron-up' : 'chevron-down'} />}
            onPress={() => toggleSection('branding')}
          />
          {expandedSection === 'branding' && (
            <Card.Content>
              <Paragraph style={styles.subsectionLabel}>Club Badge</Paragraph>
              {config.branding.clubBadge && (
                <Image source={{ uri: config.branding.clubBadge }} style={styles.badgePreview} />
              )}
              <Button
                mode="outlined"
                icon="upload"
                onPress={uploadBadge}
                style={styles.uploadButton}
              >
                Upload Badge
              </Button>

              <Paragraph style={styles.subsectionLabel}>Colors</Paragraph>
              <TextInput
                label="Primary Color (Hex)"
                value={config.branding.primaryColor}
                onChangeText={(text) => updateBranding('primaryColor', text)}
                mode="outlined"
                placeholder="#FFD700"
                style={styles.input}
              />
              <TextInput
                label="Secondary Color (Hex)"
                value={config.branding.secondaryColor}
                onChangeText={(text) => updateBranding('secondaryColor', text)}
                mode="outlined"
                placeholder="#000000"
                style={styles.input}
              />

              <Paragraph style={styles.subsectionLabel}>Sponsor Logos</Paragraph>
              <View style={styles.sponsorLogosGrid}>
                {config.branding.sponsorLogos.map((logo, index) => (
                  <View key={index} style={styles.sponsorLogoItem}>
                    <Image source={{ uri: logo }} style={styles.sponsorLogoPreview} />
                    <Button
                      mode="text"
                      icon="delete"
                      onPress={() => removeSponsorLogo(index)}
                      compact
                      textColor={COLORS.error}
                    >
                      Remove
                    </Button>
                  </View>
                ))}
              </View>
              <Button
                mode="outlined"
                icon="plus"
                onPress={addSponsorLogo}
                style={styles.addButton}
              >
                Add Sponsor Logo
              </Button>
            </Card.Content>
          )}
        </Card>

        {/* External IDs */}
        <Card style={styles.sectionCard}>
          <List.Item
            title="External Integrations"
            description="IDs for third-party services"
            left={props => <List.Icon {...props} icon="link-variant" color={COLORS.primary} />}
            right={props => <List.Icon {...props} icon={expandedSection === 'external' ? 'chevron-up' : 'chevron-down'} />}
            onPress={() => toggleSection('external')}
          />
          {expandedSection === 'external' && (
            <Card.Content>
              <TextInput
                label="FA Full-Time ID"
                value={config.externalIds.faFullTime}
                onChangeText={(text) => updateExternalId('faFullTime', text)}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="YouTube Channel ID"
                value={config.externalIds.youtubeChannelId}
                onChangeText={(text) => updateExternalId('youtubeChannelId', text)}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Printify Store ID"
                value={config.externalIds.printifyStoreId}
                onChangeText={(text) => updateExternalId('printifyStoreId', text)}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Payment Platform ID"
                value={config.externalIds.paymentPlatformId}
                onChangeText={(text) => updateExternalId('paymentPlatformId', text)}
                mode="outlined"
                style={styles.input}
              />
            </Card.Content>
          )}
        </Card>

        {/* Feature Flags */}
        <Card style={styles.sectionCard}>
          <List.Item
            title="Feature Flags"
            description="Enable/disable app modules"
            left={props => <List.Icon {...props} icon="toggle-switch" color={COLORS.primary} />}
            right={props => <List.Icon {...props} icon={expandedSection === 'features' ? 'chevron-up' : 'chevron-down'} />}
            onPress={() => toggleSection('features')}
          />
          {expandedSection === 'features' && (
            <Card.Content>
              {(Object.keys(config.featureFlags) as Array<keyof ClubConfig['featureFlags']>).map(flag => (
                <List.Item
                  key={flag}
                  title={flag.replace(/^enable/, '').replace(/([A-Z])/g, ' $1').trim()}
                  right={() => (
                    <Switch
                      value={config.featureFlags[flag]}
                      onValueChange={() => toggleFeature(flag)}
                      color={COLORS.primary}
                    />
                  )}
                />
              ))}
            </Card.Content>
          )}
        </Card>

        {/* Policies */}
        <Card style={styles.sectionCard}>
          <List.Item
            title="Policies"
            description="Quiet hours, upload limits, consent"
            left={props => <List.Icon {...props} icon="shield-check" color={COLORS.primary} />}
            right={props => <List.Icon {...props} icon={expandedSection === 'policies' ? 'chevron-up' : 'chevron-down'} />}
            onPress={() => toggleSection('policies')}
          />
          {expandedSection === 'policies' && (
            <Card.Content>
              <Paragraph style={styles.subsectionLabel}>Quiet Hours</Paragraph>
              <View style={styles.timeRow}>
                <TextInput
                  label="Start"
                  value={config.policies.quietHoursStart}
                  onChangeText={(text) => updatePolicy('quietHoursStart', text)}
                  mode="outlined"
                  placeholder="HH:MM"
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  label="End"
                  value={config.policies.quietHoursEnd}
                  onChangeText={(text) => updatePolicy('quietHoursEnd', text)}
                  mode="outlined"
                  placeholder="HH:MM"
                  style={[styles.input, { flex: 1, marginLeft: 8 }]}
                />
              </View>
              <List.Item
                title="Allow Urgent Bypass"
                right={() => (
                  <Switch
                    value={config.policies.allowUrgentBypass}
                    onValueChange={(value) => updatePolicy('allowUrgentBypass', value)}
                    color={COLORS.primary}
                  />
                )}
              />
              <TextInput
                label="Max Upload Size (MB)"
                value={config.policies.maxUploadSizeMB.toString()}
                onChangeText={(text) => updatePolicy('maxUploadSizeMB', parseInt(text) || 10)}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />
              <List.Item
                title="Photo Consent Required"
                description="GDPR compliance for image uploads"
                right={() => (
                  <Switch
                    value={config.policies.photoConsentRequired}
                    onValueChange={(value) => updatePolicy('photoConsentRequired', value)}
                    color={COLORS.primary}
                  />
                )}
              />
            </Card.Content>
          )}
        </Card>

        {/* Navigation Links */}
        <Card style={styles.sectionCard}>
          <List.Item
            title="Navigation Links"
            description="Website & social media URLs"
            left={props => <List.Icon {...props} icon="web" color={COLORS.primary} />}
            right={props => <List.Icon {...props} icon={expandedSection === 'links' ? 'chevron-up' : 'chevron-down'} />}
            onPress={() => toggleSection('links')}
          />
          {expandedSection === 'links' && (
            <Card.Content>
              <TextInput
                label="Website URL"
                value={config.navLinks.websiteUrl}
                onChangeText={(text) => updateNavLink('websiteUrl', text)}
                mode="outlined"
                keyboardType="url"
                style={styles.input}
              />
              <TextInput
                label="Facebook URL"
                value={config.navLinks.facebookUrl}
                onChangeText={(text) => updateNavLink('facebookUrl', text)}
                mode="outlined"
                keyboardType="url"
                style={styles.input}
              />
              <TextInput
                label="Instagram URL"
                value={config.navLinks.instagramUrl}
                onChangeText={(text) => updateNavLink('instagramUrl', text)}
                mode="outlined"
                keyboardType="url"
                style={styles.input}
              />
              <TextInput
                label="X (Twitter) URL"
                value={config.navLinks.twitterUrl}
                onChangeText={(text) => updateNavLink('twitterUrl', text)}
                mode="outlined"
                keyboardType="url"
                style={styles.input}
              />
              <TextInput
                label="TikTok URL"
                value={config.navLinks.tiktokUrl}
                onChangeText={(text) => updateNavLink('tiktokUrl', text)}
                mode="outlined"
                keyboardType="url"
                style={styles.input}
              />
            </Card.Content>
          )}
        </Card>
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <View style={styles.saveContainer}>
          <Button
            mode="contained"
            icon="content-save"
            onPress={saveConfig}
            style={styles.saveButton}
            buttonColor={COLORS.primary}
            textColor={COLORS.secondary}
            disabled={saving}
            loading={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  scrollContainer: {
    flex: 1,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    elevation: 2,
  },
  subsectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
  },
  badgePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 12,
  },
  uploadButton: {
    marginBottom: 12,
  },
  sponsorLogosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sponsorLogoItem: {
    alignItems: 'center',
  },
  sponsorLogoPreview: {
    width: 100,
    height: 50,
    borderRadius: 4,
    marginBottom: 4,
  },
  addButton: {
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
  },
  saveContainer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  saveButton: {
    paddingVertical: 8,
  },
});
