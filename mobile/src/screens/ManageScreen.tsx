import React from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';

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
    title: 'Fixtures',
    description: 'Add matches, kick-off times and venues',
    icon: 'soccer',
    screen: 'ManageFixtures',
  },
  {
    title: 'Manage squad',
    description: 'Add players, shirt numbers and positions',
    icon: 'account-group-outline',
    screen: 'ManageSquad',
  },
  {
    title: 'Import data',
    description: 'Add players, fixtures and results from a CSV file',
    icon: 'file-upload-outline',
    screen: 'ImportData',
  },
  {
    title: 'Events',
    description: 'Training sessions, socials and other dates',
    icon: 'calendar-month-outline',
    screen: 'ManageEvents',
  },
  {
    title: 'New club post',
    description: 'Share news on everyone\'s Home screen',
    icon: 'pencil-outline',
    screen: 'CreatePost',
  },
  {
    title: 'Player images',
    description: 'Headshots and action photos for each player',
    icon: 'camera-outline',
    screen: 'ManagePlayerImages',
  },
  {
    title: 'Man of the Match',
    description: 'Open and close votes; the winner is posted for you',
    icon: 'trophy-outline',
    screen: 'ManageMOTM',
  },
  {
    title: 'Club settings',
    description: 'Badge, social media, what gets posted, graphics, FA snippets, email forwarding',
    icon: 'cog-outline',
    screen: 'ClubSettings',
  },
  {
    title: 'People & roles',
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
        Everything for running the club, in one place.
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
}));
