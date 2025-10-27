import React, { useState, useRef } from 'react';
import { View, FlatList, StyleSheet, Dimensions, Image, Animated } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { COLORS } from '../config';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface Slide {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

const slides: Slide[] = [
  {
    id: '1',
    icon: 'home-heart',
    title: 'Welcome to Syston Tigers',
    description: 'Your complete team management platform. Stay connected with fixtures, events, news, and more - all in one place.',
    color: COLORS.primary,
  },
  {
    id: '2',
    icon: 'calendar-check',
    title: 'Never Miss an Event',
    description: 'Track all matches, training sessions, and team events. RSVP directly in the app and get reminders before events.',
    color: '#FF6B6B',
  },
  {
    id: '3',
    icon: 'soccer',
    title: 'Live Match Updates',
    description: 'Follow matches in real-time with live scores, goal notifications, and team lineups. Even when you can\'t be there.',
    color: '#4ECDC4',
  },
  {
    id: '4',
    icon: 'video',
    title: 'Record & Share Highlights',
    description: 'Capture match moments right from the app. Upload videos, create highlights, and share with the team.',
    color: '#95E1D3',
  },
  {
    id: '5',
    icon: 'account-group',
    title: 'Team Stats & Squad',
    description: 'View player profiles, track statistics, and see who\'s playing. Monitor your team\'s progress throughout the season.',
    color: '#F38181',
  },
  {
    id: '6',
    icon: 'bell-ring',
    title: 'Smart Notifications',
    description: 'Get notified about goals, events, and team news. Smart geo-fencing only sends match updates when you\'re away from the venue.',
    color: '#AA96DA',
  },
  {
    id: '7',
    icon: 'trophy-variant',
    title: 'Vote for Man of the Match',
    description: 'Have your say! Vote for your player of the match after every game and see the results live.',
    color: COLORS.primary,
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const skip = () => {
    onComplete();
  };

  const renderItem = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
        <MaterialCommunityIcons name={item.icon as any} size={120} color={item.color} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <View style={styles.topBar}>
        {currentIndex < slides.length - 1 && (
          <Button
            mode="text"
            onPress={skip}
            labelStyle={styles.skipText}
            style={styles.skipButton}
          >
            Skip
          </Button>
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: currentIndex === index ? COLORS.primary : COLORS.textLight,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Next/Get Started Button */}
      <View style={styles.bottomContainer}>
        <Button
          mode="contained"
          onPress={scrollTo}
          style={styles.nextButton}
          buttonColor={COLORS.primary}
          textColor="#000"
          icon={currentIndex === slides.length - 1 ? 'check' : 'arrow-right'}
        >
          {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  skipButton: {
    alignSelf: 'flex-end',
  },
  skipText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  bottomContainer: {
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  nextButton: {
    paddingVertical: 6,
  },
});
