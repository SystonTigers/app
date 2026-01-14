import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import {
    Card,
    Title,
    Paragraph,
    Button,
    RadioButton,
    DataTable,
    ActivityIndicator,
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../config';
import { parseCSV, validateHeaders } from '../utils/csvParser';
import {
    importPlayers,
    importFixtures,
    importResults,
    importMatchEvents,
    getImportStatus,
    getTemplateUrl,
    getSeasons,
    ImportResult,
    ImportCounts,
} from '../services/import';

type ImportType = 'players' | 'fixtures' | 'results' | 'match-events';

interface ImportOption {
    value: ImportType;
    label: string;
    icon: string;
    description: string;
}

const importOptions: ImportOption[] = [
    {
        value: 'players',
        label: 'Players/Squad',
        icon: '👥',
        description: 'Import player roster with positions, numbers, DOB',
    },
    {
        value: 'fixtures',
        label: 'Fixtures',
        icon: '📅',
        description: 'Import upcoming matches and schedule',
    },
    {
        value: 'results',
        label: 'Match Results',
        icon: '📊',
        description: 'Import historical match results with scores',
    },
    {
        value: 'match-events',
        label: 'Goals/Assists/Cards',
        icon: '⚽',
        description: 'Import match events and player stats',
    },
];

export default function ImportDataScreen() {
    const [importType, setImportType] = useState<ImportType>('players');
    const [csvContent, setCsvContent] = useState('');
    const [fileName, setFileName] = useState('');
    const [parsedData, setParsedData] = useState<any>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [counts, setCounts] = useState<ImportCounts | null>(null);
    const [seasons, setSeasons] = useState<any[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState('');

    useEffect(() => {
        loadSeasons();
        loadCounts();
    }, []);

    const loadSeasons = async () => {
        const seasonsList = await getSeasons();
        setSeasons(seasonsList);
    };

    const loadCounts = async () => {
        const status = await getImportStatus();
        if (status) {
            setCounts(status);
        }
    };

    const handleSelectFile = async () => {
        try {
            const doc = await DocumentPicker.getDocumentAsync({
                type: 'text/csv',
                copyToCacheDirectory: true,
            });

            if (doc.assets && doc.assets.length > 0) {
                const file = doc.assets[0];
                setFileName(file.name);

                // Read file content
                const response = await fetch(file.uri);
                const content = await response.text();
                setCsvContent(content);

                // Parse and validate
                const parsed = parseCSV(content);
                const validation = validateHeaders(parsed.headers, importType);

                if (!validation.valid) {
                    Alert.alert('Invalid CSV', validation.message || 'Invalid format');
                    return;
                }

                setParsedData(parsed);
                setResult(null);
            } else if (doc.canceled) {
                // User canceled selection
                return;
            }
        } catch (err: any) {
            console.error('File selection error:', err);
            Alert.alert('Error', 'Failed to select file');
        }
    };

    const handleDownloadTemplate = () => {
        const url = getTemplateUrl(importType);
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Failed to open template URL');
        });
    };

    const handleImport = async () => {
        if (!csvContent.trim()) {
            Alert.alert('Error', 'No CSV content to import');
            return;
        }

        setImporting(true);
        setResult(null);

        try {
            let importResult: ImportResult;
            const seasonParam = selectedSeasonId || undefined;

            switch (importType) {
                case 'players':
                    importResult = await importPlayers(csvContent, seasonParam);
                    break;
                case 'fixtures':
                    importResult = await importFixtures(csvContent, seasonParam);
                    break;
                case 'results':
                    importResult = await importResults(csvContent, seasonParam);
                    break;
                case 'match-events':
                    importResult = await importMatchEvents(csvContent, seasonParam);
                    break;
                default:
                    throw new Error('Invalid import type');
            }

            setResult(importResult);

            if (importResult.success) {
                loadCounts();
                Alert.alert(
                    'Success',
                    `Imported ${importResult.imported} of ${importResult.total} rows`
                );
            } else {
                Alert.alert('Import Failed', importResult.error || 'Unknown error');
            }
        } catch (err: any) {
            console.error('Import error:', err);
            setResult({
                success: false,
                error: err.message || 'Import failed',
            });
            Alert.alert('Error', err.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setCsvContent('');
        setFileName('');
        setParsedData(null);
        setResult(null);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Title style={styles.headerTitle}>Import Data</Title>
                <Paragraph style={styles.headerSubtitle}>
                    Upload CSV files to bulk import data
                </Paragraph>
            </View>

            {/* Current Data Counts */}
            {counts && (
                <View style={styles.countsContainer}>
                    <Card style={styles.countCard}>
                        <Card.Content style={styles.countContent}>
                            <Title style={styles.countValue}>{counts.players}</Title>
                            <Paragraph style={styles.countLabel}>Players</Paragraph>
                        </Card.Content>
                    </Card>
                    <Card style={styles.countCard}>
                        <Card.Content style={styles.countContent}>
                            <Title style={styles.countValue}>{counts.fixtures}</Title>
                            <Paragraph style={styles.countLabel}>Fixtures</Paragraph>
                        </Card.Content>
                    </Card>
                    <Card style={styles.countCard}>
                        <Card.Content style={styles.countContent}>
                            <Title style={styles.countValue}>{counts.matches}</Title>
                            <Paragraph style={styles.countLabel}>Results</Paragraph>
                        </Card.Content>
                    </Card>
                    <Card style={styles.countCard}>
                        <Card.Content style={styles.countContent}>
                            <Title style={styles.countValue}>{counts.match_events}</Title>
                            <Paragraph style={styles.countLabel}>Events</Paragraph>
                        </Card.Content>
                    </Card>
                </View>
            )}

            {/* Main Form */}
            <Card style={styles.formCard}>
                <Card.Content>
                    {/* Season Selection */}
                    {seasons.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                            <Title style={styles.sectionTitle}>Select Season (Optional)</Title>
                            <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' }}>
                                <RadioButton.Group
                                    onValueChange={(value) => setSelectedSeasonId(value)}
                                    value={selectedSeasonId}
                                >
                                    <RadioButton.Item label="Current Season (Default)" value="" />
                                    {seasons.map((season) => (
                                        <RadioButton.Item
                                            key={season.id}
                                            label={`${season.name}${season.is_current === 1 ? ' (Current)' : ''}`}
                                            value={season.id}
                                        />
                                    ))}
                                </RadioButton.Group>
                            </View>
                            <Paragraph style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                                💡 Select a historical season to import data for that specific season
                            </Paragraph>
                        </View>
                    )}

                    {/* Step 1: Select Type */}
                    <Title style={styles.sectionTitle}>1. Select Data Type</Title>
                    <RadioButton.Group
                        onValueChange={(value) => setImportType(value as ImportType)}
                        value={importType}
                    >
                        {importOptions.map((option) => (
                            <Card
                                key={option.value}
                                style={[
                                    styles.optionCard,
                                    importType === option.value && styles.optionCardSelected,
                                ]}
                                onPress={() => setImportType(option.value)}
                            >
                                <Card.Content style={styles.optionContent}>
                                    <Title style={styles.optionIcon}>{option.icon}</Title>
                                    <View style={styles.optionInfo}>
                                        <Title style={styles.optionLabel}>{option.label}</Title>
                                        <Paragraph style={styles.optionDescription}>
                                            {option.description}
                                        </Paragraph>
                                    </View>
                                    <RadioButton value={option.value} />
                                </Card.Content>
                            </Card>
                        ))}
                    </RadioButton.Group>

                    <Button
                        mode="text"
                        onPress={handleDownloadTemplate}
                        style={styles.templateButton}
                        icon="download"
                        compact
                    >
                        Download {importType} template
                    </Button>

                    {/* Step 2: Upload File */}
                    <Title style={styles.sectionTitle}>2. Select CSV File</Title>
                    <Card
                        style={styles.uploadCard}
                        onPress={handleSelectFile}
                    >
                        <Card.Content style={styles.uploadContent}>
                            {fileName ? (
                                <View style={styles.fileInfo}>
                                    <Title style={styles.fileIcon}>📄</Title>
                                    <View>
                                        <Title style={styles.fileName}>{fileName}</Title>
                                        <Paragraph style={styles.fileDetails}>
                                            {parsedData?.rowCount || 0} rows detected
                                        </Paragraph>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.uploadPlaceholder}>
                                    <Title style={styles.uploadIcon}>📁</Title>
                                    <Title style={styles.uploadLabel}>
                                        Tap to select a CSV file
                                    </Title>
                                    <Paragraph style={styles.uploadHint}>
                                        From device storage or cloud drive
                                    </Paragraph>
                                </View>
                            )}
                        </Card.Content>
                    </Card>

                    {/* Step 3: Preview */}
                    {parsedData && parsedData.rows.length > 0 && (
                        <View style={styles.previewSection}>
                            <Title style={styles.sectionTitle}>3. Preview</Title>
                            <ScrollView horizontal style={styles.tableScroll}>
                                <DataTable>
                                    <DataTable.Header>
                                        {parsedData.headers.map((header: string, i: number) => (
                                            <DataTable.Title key={i}>{header}</DataTable.Title>
                                        ))}
                                    </DataTable.Header>

                                    {parsedData.rows.slice(0, 5).map((row: string[], i: number) => (
                                        <DataTable.Row key={i}>
                                            {row.map((cell: string, j: number) => (
                                                <DataTable.Cell key={j}>{cell}</DataTable.Cell>
                                            ))}
                                        </DataTable.Row>
                                    ))}
                                </DataTable>
                            </ScrollView>
                            {parsedData.rows.length > 5 && (
                                <Paragraph style={styles.moreRows}>
                                    ... and {parsedData.rows.length - 5} more rows
                                </Paragraph>
                            )}
                        </View>
                    )}

                    {/* Result */}
                    {result && (
                        <Card
                            style={[
                                styles.resultCard,
                                result.success ? styles.resultSuccess : styles.resultError,
                            ]}
                        >
                            <Card.Content>
                                {result.success ? (
                                    <View>
                                        <Title style={styles.resultTitle}>✅ Import Successful</Title>
                                        <Paragraph style={styles.resultText}>
                                            Imported {result.imported} of {result.total} rows
                                        </Paragraph>
                                        {result.errors && result.errors.length > 0 && (
                                            <View style={styles.warnings}>
                                                <Paragraph style={styles.warningTitle}>Warnings:</Paragraph>
                                                {result.errors.slice(0, 3).map((err, i) => (
                                                    <Paragraph key={i} style={styles.warningText}>
                                                        • {err}
                                                    </Paragraph>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <Title style={styles.resultTitle}>
                                        ❌ {result.error || 'Import failed'}
                                    </Title>
                                )}
                            </Card.Content>
                        </Card>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Button
                            mode="contained"
                            onPress={handleImport}
                            disabled={!csvContent || importing}
                            loading={importing}
                            style={[styles.button, styles.importButton]}
                            labelStyle={styles.buttonLabel}
                        >
                            {importing ? 'Importing...' : `Import ${importType}`}
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={handleReset}
                            style={styles.button}
                            disabled={importing}
                        >
                            Reset
                        </Button>
                    </View>
                </Card.Content>
            </Card>
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
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.secondary,
        opacity: 0.8,
    },
    countsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
    },
    countCard: {
        flex: 1,
        borderRadius: 8,
        elevation: 1,
    },
    countContent: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    countValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    countLabel: {
        fontSize: 11,
        color: COLORS.textLight,
        marginTop: 2,
    },
    formCard: {
        margin: 16,
        borderRadius: 12,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 12,
    },
    optionCard: {
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: COLORS.background,
    },
    optionCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '10',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    optionIcon: {
        fontSize: 28,
        marginRight: 12,
    },
    optionInfo: {
        flex: 1,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    optionDescription: {
        fontSize: 11,
        color: COLORS.textLight,
    },
    templateButton: {
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    uploadCard: {
        borderRadius: 8,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: COLORS.textLight,
        marginBottom: 16,
    },
    uploadContent: {
        padding: 20,
    },
    uploadPlaceholder: {
        alignItems: 'center',
    },
    uploadIcon: {
        fontSize: 48,
        marginBottom: 8,
    },
    uploadLabel: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    uploadHint: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 4,
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fileIcon: {
        fontSize: 36,
        marginRight: 12,
    },
    fileName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    fileDetails: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    previewSection: {
        marginTop: 16,
    },
    tableScroll: {
        maxHeight: 200,
    },
    moreRows: {
        textAlign: 'center',
        marginTop: 8,
        fontSize: 12,
        color: COLORS.textLight,
    },
    resultCard: {
        marginTop: 16,
        borderRadius: 8,
    },
    resultSuccess: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    resultError: {
        backgroundColor: '#FFEBEE',
        borderWidth: 1,
        borderColor: '#F44336',
    },
    resultTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    resultText: {
        fontSize: 12,
        marginTop: 4,
    },
    warnings: {
        marginTop: 8,
    },
    warningTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FF9800',
    },
    warningText: {
        fontSize: 11,
        color: COLORS.textLight,
        marginTop: 2,
    },
    actions: {
        marginTop: 16,
        gap: 8,
    },
    button: {
        borderRadius: 8,
    },
    importButton: {
        backgroundColor: COLORS.primary,
    },
    buttonLabel: {
        color: COLORS.secondary,
    },
});
