import React from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import SectionTitle from '../components/home/SectionTitle';

interface ManagementCard {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  screen: string;
}

const managementCards: ManagementCard[] = [
  {
    title: 'Match Centre',
    description: 'Post live score, goals, cards and subs from the touchline',
    icon: 'bullhorn-outline',
    screen: 'MatchCentre',
  },
  {
    title: 'Fixtures & Results',
    description: 'Add matches, update scores, manage competitions',
    icon: 'soccer',
    screen: 'ManageFixtures',
  },
  {
    title: 'Squad Management',
    description: 'Add players, update stats, manage positions',
    icon: 'account-group-outline',
    screen: 'ManageSquad',
  },
  {
    title: 'Import Data',
    description: 'Bulk upload players, fixtures from CSV/Excel',
    icon: 'file-upload-outline',
    screen: 'ImportData',
  },
  {
    title: 'Events & Calendar',
    description: 'Create events, training sessions, social gatherings',
    icon: 'calendar-month-outline',
    screen: 'ManageEvents',
  },
  {
    title: 'Create Post',
    description: 'Post updates, news, photos to team feed',
    icon: 'pencil-outline',
    screen: 'CreatePost',
  },
  {
    title: 'Player Images',
    description: 'Upload headshots & action photos, manage gallery',
    icon: 'camera-outline',
    screen: 'ManagePlayerImages',
  },
  {
    title: 'MOTM Voting',
    description: 'Create votes, manage results, auto-post winners',
    icon: 'trophy-outline',
    screen: 'ManageMOTM',
  },
  {
    title: 'People & Roles',
    description: 'Everyone at the club, and who can manage it',
    icon: 'account-cog-outline',
    screen: 'TeamMembers',
  },
];

export default function ManageScreen({ navigation }: any) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.intro}>
        Manage your team's fixtures, squad, events, and content
      </Text>

      <View style={styles.cardsContainer}>
        {managementCards.map((card) => (
          <TouchableOpacity
            key={card.screen}
            onPress={() => navigation.navigate(card.screen)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={card.title}
          >
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name={card.icon} size={26} color={COLORS.primary} />
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardDescription}>{card.description}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textLight} />
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      <SectionTitle title="QUICK STATS" color={COLORS.primary} />
      <View style={styles.stats}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Fixtures</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>23</Text>
                <Text style={styles.statLabel}>Players</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>8</Text>
                <Text style={styles.statLabel}>Events</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>45</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const useStyles = themedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  intro: {
    color: COLORS.textLight,
    marginHorizontal: 16,
    marginTop: 12,
  },
  cardsContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  card: {
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${COLORS.primary}55`,
    backgroundColor: `${COLORS.primary}1F`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRight: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: COLORS.text,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  stats: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: 32,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
}));
