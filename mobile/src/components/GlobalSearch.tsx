import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Searchbar, Text, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

interface SearchResult {
    id: string;
    type: 'player' | 'fixture' | 'drill' | 'news';
    title: string;
    subtitle?: string;
    screen?: string;
}

interface GlobalSearchProps {
    onClose: () => void;
    onNavigate: (screen: string, params?: any) => void;
}

// Mock search data - replace with actual search logic
const MOCK_SEARCH_DATA: SearchResult[] = [
    { id: '1', type: 'player', title: 'Jake Smith', subtitle: '#10 - Forward', screen: 'Squad' },
    { id: '2', type: 'player', title: 'Tom Reynolds', subtitle: '#5 - Midfielder', screen: 'Squad' },
    { id: '3', type: 'fixture', title: 'Syston Tigers vs Rival FC', subtitle: 'Saturday 3PM', screen: 'Fixtures' },
    { id: '4', type: 'drill', title: 'Rondo 4v2', subtitle: 'Possession drill', screen: 'DrillLibrary' },
    { id: '5', type: 'news', title: 'Match Report: 3-0 Victory', subtitle: 'Yesterday', screen: 'Home' },
];

export default function GlobalSearch({ onClose, onNavigate }: GlobalSearchProps) {
    const { theme } = useTheme();
    const { colors } = theme;
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.length > 0) {
            const filtered = MOCK_SEARCH_DATA.filter(
                item =>
                    item.title.toLowerCase().includes(query.toLowerCase()) ||
                    item.subtitle?.toLowerCase().includes(query.toLowerCase())
            );
            setResults(filtered);
        } else {
            setResults([]);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'player':
                return 'account';
            case 'fixture':
                return 'calendar';
            case 'drill':
                return 'run';
            case 'news':
                return 'newspaper';
            default:
                return 'magnify';
        }
    };

    const handleSelectResult = (result: SearchResult) => {
        if (result.screen) {
            onNavigate(result.screen);
            onClose();
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface }]}>
                <Searchbar
                    placeholder="Search players, fixtures, drills..."
                    onChangeText={handleSearch}
                    value={searchQuery}
                    style={styles.searchBar}
                    autoFocus
                />
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            {searchQuery.length > 0 && results.length === 0 && (
                <View style={styles.emptyResults}>
                    <MaterialCommunityIcons name="magnify-close" size={64} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        No results for "{searchQuery}"
                    </Text>
                </View>
            )}

            <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <List.Item
                        title={item.title}
                        description={item.subtitle}
                        left={() => <MaterialCommunityIcons name={getIcon(item.type)} size={24} color={colors.primary} />}
                        onPress={() => handleSelectResult(item)}
                        style={{ backgroundColor: colors.surface, marginBottom: 1 }}
                    />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 48,
        gap: 12,
    },
    searchBar: {
        flex: 1,
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyResults: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
    },
});
