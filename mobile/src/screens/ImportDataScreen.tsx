import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, Linking } from 'react-native';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { parseCSV, validateHeaders } from '../utils/csvParser';
import ResultsImportModal from '../components/results/ResultsImportModal';
import {
    importPlayers,
    importFixtures,
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
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    description: string;
}

const importOptions: ImportOption[] = [
    {
        value: 'players',
        label: 'Players',
        icon: 'account-group-outline',
        description: 'Your squad, with positions, shirt numbers and dates of birth',
    },
    {
        value: 'fixtures',
        label: 'Fixtures',
        icon: 'calendar-month-outline',
        description: 'Upcoming matches and kick-off times',
    },
    {
        value: 'results',
        label: 'Match results',
        icon: 'scoreboard-outline',
        description: 'Past results with scores and goalscorers (Excel or CSV)',
    },
    {
        value: 'match-events',
        label: 'Goals, assists and cards',
        icon: 'soccer',
        description: 'Match events that count towards player stats',
    },
];

export default function ImportDataScreen() {
    const COLORS = useBrandColors();
    const styles = useStyles();
    const [importType, setImportType] = useState<ImportType>('players');
    const [csvContent, setCsvContent] = useState('');
    const [fileName, setFileName] = useState('');
    const [parsedData, setParsedData] = useState<any>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [counts, setCounts] = useState<ImportCounts | null>(null);
    const [seasons, setSeasons] = useState<any[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState('');
    const [resultsUploadOpen, setResultsUploadOpen] = useState(false);

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
                    Alert.alert("That file doesn't fit", validation.message || 'Check it matches the template and try again.');
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
            Alert.alert("Couldn't open that file", 'Please try again, or pick a different file.');
        }
    };

    const handleDownloadTemplate = () => {
        const url = getTemplateUrl(importType);
        Linking.openURL(url).catch(() => {
            Alert.alert("Couldn't open the template", 'Check your connection and try again.');
        });
    };

    const handleImport = async () => {
        if (!csvContent.trim()) {
            Alert.alert('Choose a file first', 'Pick a CSV file to import.');
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
                    'Imported',
                    `Added ${importResult.imported} of ${importResult.total} rows.`
                );
            } else {
                Alert.alert("That didn't import", importResult.error || 'Check the file matches the template and try again.');
            }
        } catch (err: any) {
            console.error('Import error:', err);
            setResult({
                success: false,
                error: err.message || 'Import failed',
            });
            Alert.alert("That didn't import", err.message || 'Check your connection and try again.');
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
            <Paragraph style={styles.intro}>
                Add lots of players, fixtures or results at once from a CSV file.
            </Paragraph>

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
                            <Paragraph style={styles.countLabel}>Match events</Paragraph>
                        </Card.Content>
                    </Card>
                </View>
            )}

            {/* Main Form */}
            <Card style={styles.formCard}>
                <Card.Content>
                    {/* Season Selection */}
                    {seasons.length > 0 && (
                        <View style={styles.seasonSection}>
                            <Title style={styles.sectionTitle}>Season (optional)</Title>
                            <View style={styles.seasonBox}>
                                <RadioButton.Group
                                    onValueChange={(value) => setSelectedSeasonId(value)}
                                    value={selectedSeasonId}
                                >
                                    <RadioButton.Item label="This season" value="" />
                                    {seasons.map((season) => (
                                        <RadioButton.Item
                                            key={season.id}
                                            label={`${season.name}${season.is_current === 1 ? ' (Current)' : ''}`}
                                            value={season.id}
                                        />
                                    ))}
                                </RadioButton.Group>
                            </View>
                            <Paragraph style={styles.seasonHint}>
                                Pick an older season to fill in its history.
                            </Paragraph>
                        </View>
                    )}

                    {/* Step 1: Select Type */}
                    <Title style={styles.sectionTitle}>1. What are you adding?</Title>
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
                                    <View style={styles.optionIcon}>
                                        <MaterialCommunityIcons name={option.icon} size={24} color={COLORS.primary} />
                                    </View>
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

                    {importType === 'results' ? (
                        <View style={styles.resultsUpload}>
                            <Paragraph style={styles.seasonHint}>
                                Results have their own upload: it reads Excel or CSV in any column order, every season's sheet at once, and gives goals to players in the squad. You see it all before anything is saved.
                            </Paragraph>
                            <Button mode="contained" icon="file-upload-outline" onPress={() => setResultsUploadOpen(true)}>
                                Upload results spreadsheet
                            </Button>
                        </View>
                    ) : (
                    <>
                    <Button
                        mode="text"
                        onPress={handleDownloadTemplate}
                        style={styles.templateButton}
                        icon="download"
                        compact
                    >
                        Download the template
                    </Button>

                    {/* Step 2: Upload File */}
                    <Title style={styles.sectionTitle}>2. Choose a CSV file</Title>
                    <Card
                        style={styles.uploadCard}
                        onPress={handleSelectFile}
                    >
                        <Card.Content style={styles.uploadContent}>
                            {fileName ? (
                                <View style={styles.fileInfo}>
                                    <MaterialCommunityIcons name="file-delimited-outline" size={36} color={COLORS.primary} style={styles.fileIcon} />
                                    <View>
                                        <Title style={styles.fileName}>{fileName}</Title>
                                        <Paragraph style={styles.fileDetails}>
                                            {parsedData?.rowCount || 0} rows detected
                                        </Paragraph>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.uploadPlaceholder}>
                                    <MaterialCommunityIcons name="folder-upload-outline" size={44} color={COLORS.primary} style={styles.uploadIcon} />
                                    <Title style={styles.uploadLabel}>
                                        Tap to select a CSV file
                                    </Title>
                                    <Paragraph style={styles.uploadHint}>
                                        From your phone or a cloud drive
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
                                    …and {parsedData.rows.length - 5} more rows
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
                                        <View style={styles.resultRow}>
                                            <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                                            <Title style={styles.resultTitle}>Imported</Title>
                                        </View>
                                        <Paragraph style={styles.resultText}>
                                            Added {result.imported} of {result.total} rows.
                                        </Paragraph>
                                        {result.errors && result.errors.length > 0 && (
                                            <View style={styles.warnings}>
                                                <Paragraph style={styles.warningTitle}>Rows we skipped:</Paragraph>
                                                {result.errors.slice(0, 3).map((err, i) => (
                                                    <Paragraph key={i} style={styles.warningText}>
                                                        • {err}
                                                    </Paragraph>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <View style={styles.resultRow}>
                                        <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.error} />
                                        <Title style={styles.resultTitle}>
                                            {result.error || 'Import failed'}
                                        </Title>
                                    </View>
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
                            style={styles.button}
                        >
                            {importing ? 'Importing…' : `Import ${importOptions.find((o) => o.value === importType)?.label.toLowerCase() ?? ''}`}
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
                    </>
                    )}
                </Card.Content>
            </Card>
            <ResultsImportModal
                visible={resultsUploadOpen}
                onClose={() => setResultsUploadOpen(false)}
                onSaved={(message) => {
                    setResultsUploadOpen(false);
                    loadCounts();
                    Alert.alert('Results uploaded', message);
                }}
            />
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
    countsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
    },
    countCard: {
        flex: 1,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    countContent: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    countValue: {
        fontFamily: FONTS.display,
        fontSize: 26,
        lineHeight: 30,
        color: COLORS.primary,
    },
    countLabel: {
        fontSize: 11,
        color: COLORS.textLight,
        marginTop: 2,
    },
    formCard: {
        margin: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    seasonSection: {
        marginBottom: 24,
    },
    seasonBox: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: COLORS.surfaceRaised,
    },
    seasonHint: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: FONTS.display,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: COLORS.text,
        marginTop: 16,
        marginBottom: 12,
    },
    optionCard: {
        marginBottom: 8,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surfaceRaised,
    },
    optionCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primarySoft,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    optionIcon: {
        width: 46,
        height: 46,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${COLORS.primary}55`,
        backgroundColor: `${COLORS.primary}1F`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    optionInfo: {
        flex: 1,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    optionDescription: {
        fontSize: 11,
        color: COLORS.textLight,
    },
    resultsUpload: {
        gap: 12,
        marginTop: 12,
    },
    templateButton: {
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    uploadCard: {
        borderRadius: 18,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: COLORS.border,
        backgroundColor: COLORS.surfaceRaised,
        marginBottom: 16,
    },
    uploadContent: {
        padding: 20,
    },
    uploadPlaceholder: {
        alignItems: 'center',
    },
    uploadIcon: {
        marginBottom: 8,
    },
    uploadLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
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
        marginRight: 12,
    },
    fileName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
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
        borderRadius: 18,
    },
    resultSuccess: {
        backgroundColor: 'rgba(43,213,118,0.14)',
        borderWidth: 1,
        borderColor: COLORS.success,
    },
    resultError: {
        backgroundColor: 'rgba(255,0,85,0.14)',
        borderWidth: 1,
        borderColor: COLORS.error,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    resultTitle: {
        flexShrink: 1,
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    resultText: {
        fontSize: 12,
        marginTop: 4,
        color: COLORS.text,
    },
    warnings: {
        marginTop: 8,
    },
    warningTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.warning,
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
        borderRadius: 12,
    },
}));
