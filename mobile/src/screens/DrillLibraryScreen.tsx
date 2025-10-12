import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Searchbar, Chip, Portal, Modal, IconButton, Button } from 'react-native-paper';
import { COLORS } from '../config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DRILLS_LIBRARY, DRILL_CATEGORIES, Drill } from '../data/drillsData';

export default function DrillLibraryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);

  // Filter drills based on search and filters
  const filteredDrills = useMemo(() => {
    let drills = DRILLS_LIBRARY;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      drills = drills.filter(
        (drill) =>
          drill.name.toLowerCase().includes(query) ||
          drill.description.toLowerCase().includes(query) ||
          drill.focus.some((f) => f.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      drills = drills.filter((drill) => drill.category === selectedCategory);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'All') {
      drills = drills.filter((drill) => drill.difficulty === selectedDifficulty);
    }

    return drills;
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  // Count drills by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DRILL_CATEGORIES.forEach((cat) => {
      counts[cat] = DRILLS_LIBRARY.filter((d) => d.category === cat).length;
    });
    return counts;
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return COLORS.success;
      case 'intermediate':
        return COLORS.warning;
      case 'advanced':
        return COLORS.error;
      default:
        return COLORS.textLight;
    }
  };

  const renderDrillCard = (drill: Drill) => (
    <Card key={drill.id} style={styles.drillCard} onPress={() => setSelectedDrill(drill)}>
      <Card.Content>
        <View style={styles.drillHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.drillName}>{drill.name}</Text>
            <Text style={styles.drillCategory}>{drill.category}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
        </View>

        <View style={styles.drillMeta}>
          <Chip
            style={[styles.difficultyChip, { backgroundColor: getDifficultyColor(drill.difficulty) }]}
            textStyle={{ color: '#fff', fontSize: 11 }}
          >
            {drill.difficulty}
          </Chip>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.metaText}>{drill.duration}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="account-group" size={14} color={COLORS.textLight} />
            <Text style={styles.metaText}>{drill.players}</Text>
          </View>
        </View>

        <Text style={styles.drillDescription} numberOfLines={2}>
          {drill.description}
        </Text>

        <View style={styles.focusChips}>
          {drill.focus.slice(0, 3).map((focus, idx) => (
            <Chip key={idx} style={styles.focusChip} textStyle={styles.focusChipText}>
              {focus}
            </Chip>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  const renderDrillDetail = () => {
    if (!selectedDrill) return null;

    return (
      <Portal>
        <Modal
          visible={!!selectedDrill}
          onDismiss={() => setSelectedDrill(null)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedDrill.name}</Text>
                <Text style={styles.modalCategory}>{selectedDrill.category}</Text>
              </View>
              <IconButton icon="close" onPress={() => setSelectedDrill(null)} />
            </View>

            <View style={styles.modalMeta}>
              <Chip
                style={[
                  styles.difficultyChip,
                  { backgroundColor: getDifficultyColor(selectedDrill.difficulty) },
                ]}
                textStyle={{ color: '#fff' }}
              >
                {selectedDrill.difficulty.toUpperCase()}
              </Chip>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="clock" size={18} color={COLORS.primary} />
                <Text style={styles.modalMetaText}>{selectedDrill.duration}</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="account-group" size={18} color={COLORS.primary} />
                <Text style={styles.modalMetaText}>{selectedDrill.players} players</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.modalDescription}>{selectedDrill.description}</Text>

            <Text style={styles.sectionTitle}>Equipment Needed</Text>
            <View style={styles.equipmentList}>
              {selectedDrill.equipment.length === 0 ? (
                <Text style={styles.equipmentItem}>• None required</Text>
              ) : (
                selectedDrill.equipment.map((item, idx) => (
                  <Text key={idx} style={styles.equipmentItem}>
                    • {item}
                  </Text>
                ))
              )}
            </View>

            <Text style={styles.sectionTitle}>Focus Areas</Text>
            <View style={styles.focusChips}>
              {selectedDrill.focus.map((focus, idx) => (
                <Chip key={idx} style={styles.focusChipLarge} textStyle={styles.focusChipText}>
                  {focus}
                </Chip>
              ))}
            </View>

            {selectedDrill.diagramUrl && (
              <View style={styles.diagramSection}>
                <Text style={styles.sectionTitle}>Drill Diagram</Text>
                <View style={styles.diagramPlaceholder}>
                  <MaterialCommunityIcons name="image-outline" size={48} color={COLORS.textLight} />
                  <Text style={styles.diagramText}>Diagram coming soon</Text>
                </View>
              </View>
            )}

            <Button
              mode="contained"
              icon="plus"
              onPress={() => {
                // TODO: Add to session
                setSelectedDrill(null);
              }}
              style={styles.addButton}
              buttonColor={COLORS.primary}
            >
              Add to Session
            </Button>

            <Button
              mode="outlined"
              icon="share"
              onPress={() => {
                // TODO: Share drill
              }}
              style={styles.shareButton}
            >
              Share Drill
            </Button>
          </ScrollView>
        </Modal>
      </Portal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Drill Library</Text>
        <Text style={styles.subtitle}>{DRILLS_LIBRARY.length} drills available</Text>
      </View>

      {/* Search */}
      <Searchbar
        placeholder="Search drills..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        iconColor={COLORS.primary}
      />

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity onPress={() => setSelectedCategory('All')}>
          <Chip
            selected={selectedCategory === 'All'}
            style={[styles.filterChip, selectedCategory === 'All' && styles.selectedFilterChip]}
            textStyle={selectedCategory === 'All' && styles.selectedFilterText}
          >
            All ({DRILLS_LIBRARY.length})
          </Chip>
        </TouchableOpacity>
        {DRILL_CATEGORIES.map((category) => (
          <TouchableOpacity key={category} onPress={() => setSelectedCategory(category)}>
            <Chip
              selected={selectedCategory === category}
              style={[
                styles.filterChip,
                selectedCategory === category && styles.selectedFilterChip,
              ]}
              textStyle={selectedCategory === category && styles.selectedFilterText}
            >
              {category} ({categoryCounts[category] || 0})
            </Chip>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Difficulty Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.difficultyFilter}>
        <Text style={styles.filterLabel}>Difficulty:</Text>
        {['All', 'beginner', 'intermediate', 'advanced'].map((diff) => (
          <TouchableOpacity key={diff} onPress={() => setSelectedDifficulty(diff)}>
            <Chip
              selected={selectedDifficulty === diff}
              style={[
                styles.filterChip,
                selectedDifficulty === diff && styles.selectedFilterChip,
              ]}
              textStyle={selectedDifficulty === diff && styles.selectedFilterText}
            >
              {diff === 'All' ? 'All' : diff.charAt(0).toUpperCase() + diff.slice(1)}
            </Chip>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.resultsText}>
          {filteredDrills.length} drill{filteredDrills.length !== 1 ? 's' : ''} found
        </Text>

        {filteredDrills.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="soccer-field"
                size={64}
                color={COLORS.textLight}
                style={{ alignSelf: 'center' }}
              />
              <Text style={styles.emptyText}>No drills found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </Card.Content>
          </Card>
        ) : (
          filteredDrills.map(renderDrillCard)
        )}
      </ScrollView>

      {renderDrillDetail()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    padding: 16,
    paddingTop: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterChip: {
    marginLeft: 8,
    backgroundColor: COLORS.surface,
  },
  selectedFilterChip: {
    backgroundColor: COLORS.primary,
  },
  selectedFilterText: {
    color: '#000',
  },
  difficultyFilter: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    alignSelf: 'center',
    marginRight: 8,
    marginLeft: 8,
  },
  resultsText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  drillCard: {
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    elevation: 2,
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  drillName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  drillCategory: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  drillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  difficultyChip: {
    height: 24,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  drillDescription: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  focusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  focusChip: {
    height: 24,
    backgroundColor: `${COLORS.primary}20`,
  },
  focusChipLarge: {
    height: 28,
    backgroundColor: `${COLORS.primary}20`,
  },
  focusChipText: {
    fontSize: 11,
    color: COLORS.text,
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalCategory: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  modalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    paddingBottom: 8,
  },
  modalMetaText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    padding: 16,
    paddingBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  equipmentList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  equipmentItem: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  diagramSection: {
    marginTop: 8,
  },
  diagramPlaceholder: {
    height: 200,
    backgroundColor: COLORS.background,
    marginHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diagramText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  addButton: {
    margin: 16,
    marginBottom: 8,
  },
  shareButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
});
