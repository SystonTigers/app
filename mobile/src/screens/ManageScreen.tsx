import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Avatar, Divider } from 'react-native-paper';
import { COLORS } from '../config';

interface ManagementCard {
  title: string;
  description: string;
  icon: string;
  screen: string;
  color: string;
}

const managementCards: ManagementCard[] = [
  {
    title: 'Fixtures & Results',
    description: 'Add matches, update scores, manage competitions',
    icon: '⚽',
    screen: 'ManageFixtures',
    color: '#4CAF50',
  },
  {
    title: 'Squad Management',
    description: 'Add players, update stats, manage positions',
    icon: '👥',
    screen: 'ManageSquad',
    color: '#2196F3',
  },
  {
    title: 'Events & Calendar',
    description: 'Create events, training sessions, social gatherings',
    icon: '📅',
    screen: 'ManageEvents',
    color: '#FF9800',
  },
  {
    title: 'Create Post',
    description: 'Post updates, news, photos to team feed',
    icon: '📝',
    screen: 'CreatePost',
    color: '#9C27B0',
  },
  {
    title: 'Player Images',
    description: 'Upload headshots & action photos, manage gallery',
    icon: '📸',
    screen: 'ManagePlayerImages',
    color: '#E91E63',
  },
  {
    title: 'MOTM Voting',
    description: 'Create votes, manage results, auto-post winners',
    icon: '🏆',
    screen: 'ManageMOTM',
    color: '#FFC107',
  },
  {
    title: 'Auto-Posts',
    description: 'Control automated social media posting',
    icon: '🤖',
    screen: 'AutoPostsMatrix',
    color: '#00BCD4',
  },
  {
    title: 'User Management',
    description: 'View all registered users, roles, and permissions',
    icon: '👤',
    screen: 'ManageUsers',
    color: '#673AB7',
  },
  {
    title: 'Club Config',
    description: 'Settings, branding, features, integrations',
    icon: '⚙️',
    screen: 'Config',
    color: '#607D8B',
  },
];

export default function ManageScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Team Management</Title>
        <Paragraph style={styles.headerSubtitle}>
          Manage your team's fixtures, squad, events, and content
        </Paragraph>
      </View>

      <View style={styles.cardsContainer}>
        {managementCards.map((card, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => navigation.navigate(card.screen)}
            activeOpacity={0.7}
          >
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: card.color }]}>
                    <Title style={styles.icon}>{card.icon}</Title>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Title style={styles.cardTitle}>{card.title}</Title>
                  <Paragraph style={styles.cardDescription}>
                    {card.description}
                  </Paragraph>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.stats}>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.statsTitle}>Quick Stats</Title>
            <Divider style={styles.divider} />
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Title style={styles.statValue}>12</Title>
                <Paragraph style={styles.statLabel}>Fixtures</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Title style={styles.statValue}>23</Title>
                <Paragraph style={styles.statLabel}>Players</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Title style={styles.statValue}>8</Title>
                <Paragraph style={styles.statLabel}>Events</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Title style={styles.statValue}>45</Title>
                <Paragraph style={styles.statLabel}>Posts</Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  cardsContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
    backgroundColor: COLORS.surface,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  cardLeft: {
    marginRight: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  icon: {
    fontSize: 32,
    margin: 0,
  },
  cardRight: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: COLORS.text,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  stats: {
    padding: 16,
    paddingTop: 0,
  },
  statsCard: {
    borderRadius: 12,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.text,
  },
  divider: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
});
