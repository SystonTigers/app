import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Avatar,
  SegmentedButtons,
  Portal,
  Modal,
  TextInput,
  IconButton,
  ActivityIndicator,
  Divider,
  List,
  ProgressBar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Rect, Circle, Line, Text as SvgText, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, API_BASE_URL, TENANT_ID } from '../config';
import { useAuth } from '../context/AuthContext';
import api, { wearablesApi, squadApi } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH - 64;
const MAP_HEIGHT = MAP_WIDTH * 0.7; // Football pitch aspect ratio

// Types
interface Player {
  id: string;
  name: string;
  position?: string;
  number?: number;
}

interface GPSPoint {
  lat: number;
  lon: number;
  ts: number;
  speed?: number;
  hr?: number;
}

interface HeatmapCell {
  x: number;
  y: number;
  value: number;
  count?: number;
  avgSpeed?: number;
}

interface HeatmapData {
  gridWidth: number;
  gridHeight: number;
  cells: HeatmapCell[];
}

interface FitnessMetrics {
  totalDistanceM?: number;
  topSpeedKmh?: number;
  avgSpeedKmh?: number;
  sprintCount?: number;
  maxHeartRate?: number;
  avgHeartRate?: number;
  accelerationCount?: number;
  decelerationCount?: number;
  playerLoad?: number;
  heatmap?: HeatmapData;
  perceivedExertion?: number;
  fatigueLevel?: number;
}

interface Session {
  id: string;
  sessionType: string;
  sessionName?: string;
  sessionDate: string;
  durationMinutes?: number;
  entryMethod: string;
  metrics?: FitnessMetrics;
  gpsTrack?: GPSPoint[];
  player?: Player;
}

interface PlayerSummary {
  playerId: string;
  playerName: string;
  lastSessionDate?: string;
  totalSessions: number;
  seasonTotalDistanceKm: number;
  seasonTotalSprints: number;
  recentAvgDistanceKm: number;
  recentAvgTopSpeedKmh: number;
  injuryRiskLevel: 'low' | 'medium' | 'high';
}

// (mock data arrays removed — data loaded from API at runtime)

function generateMockHeatmap(): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (let x = 0; x < 12; x++) {
    for (let y = 0; y < 8; y++) {
      // Create a realistic distribution - more activity in midfield and attacking areas
      const midX = Math.abs(x - 6) / 6;
      const attackBias = x > 6 ? 0.3 : 0;
      const value = Math.random() * 0.5 + (1 - midX) * 0.3 + attackBias + Math.random() * 0.2;
      if (Math.random() > 0.3) { // Some cells empty
        cells.push({ x, y, value: Math.min(value, 1), count: Math.floor(Math.random() * 50) + 10 });
      }
    }
  }
  return cells;
}

function generateMockGPSTrack(): GPSPoint[] {
  const points: GPSPoint[] = [];
  let lat = 52.6189;
  let lon = -1.1398;
  const baseTs = Date.now() - 4200000; // ~70 mins ago

  for (let i = 0; i < 200; i++) {
    // Simulate movement within a pitch area
    lat += (Math.random() - 0.5) * 0.0002;
    lon += (Math.random() - 0.5) * 0.0003;
    // Keep within bounds
    lat = Math.max(52.618, Math.min(52.62, lat));
    lon = Math.max(-1.141, Math.min(-1.138, lon));

    points.push({
      lat,
      lon,
      ts: baseTs + i * 21000, // ~21 seconds per point
      speed: Math.random() * 8 + 1, // 1-9 m/s
      hr: Math.floor(Math.random() * 60 + 130), // 130-190 bpm
    });
  }
  return points;
}

// GPS Track Map Component
function GPSTrackMap({ track, width = MAP_WIDTH, height = MAP_HEIGHT }: { track: GPSPoint[]; width?: number; height?: number }) {
  if (!track || track.length < 2) {
    return (
      <View style={[styles.mapContainer, { width, height }]}>
        <Paragraph style={styles.noDataText}>No GPS data available</Paragraph>
      </View>
    );
  }

  // Calculate bounds
  const lats = track.map(p => p.lat);
  const lons = track.map(p => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const padding = 20;
  const mapW = width - padding * 2;
  const mapH = height - padding * 2;

  const scaleX = (lon: number) => padding + ((lon - minLon) / (maxLon - minLon || 0.001)) * mapW;
  const scaleY = (lat: number) => padding + ((maxLat - lat) / (maxLat - minLat || 0.001)) * mapH;

  // Create path
  const pathData = track.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.lon)} ${scaleY(p.lat)}`).join(' ');

  // Color by speed
  const maxSpeed = Math.max(...track.filter(p => p.speed).map(p => p.speed!));

  return (
    <View style={[styles.mapContainer, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Football pitch background */}
        <Rect x={padding} y={padding} width={mapW} height={mapH} fill="#2d5a27" rx={4} />
        {/* Center line */}
        <Line x1={padding + mapW / 2} y1={padding} x2={padding + mapW / 2} y2={padding + mapH} stroke="#fff" strokeWidth={1} opacity={0.3} />
        {/* Center circle */}
        <Circle cx={padding + mapW / 2} cy={padding + mapH / 2} r={mapH * 0.15} stroke="#fff" strokeWidth={1} fill="none" opacity={0.3} />
        {/* Penalty areas */}
        <Rect x={padding} y={padding + mapH * 0.25} width={mapW * 0.15} height={mapH * 0.5} stroke="#fff" strokeWidth={1} fill="none" opacity={0.3} />
        <Rect x={padding + mapW * 0.85} y={padding + mapH * 0.25} width={mapW * 0.15} height={mapH * 0.5} stroke="#fff" strokeWidth={1} fill="none" opacity={0.3} />

        {/* GPS track path */}
        <Path d={pathData} stroke={COLORS.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Start point */}
        <Circle cx={scaleX(track[0].lon)} cy={scaleY(track[0].lat)} r={6} fill="#4CAF50" />
        {/* End point */}
        <Circle cx={scaleX(track[track.length - 1].lon)} cy={scaleY(track[track.length - 1].lat)} r={6} fill="#F44336" />

        {/* Speed indicators (show high speed points) */}
        {track.filter(p => p.speed && p.speed > maxSpeed * 0.8).map((p, i) => (
          <Circle
            key={i}
            cx={scaleX(p.lon)}
            cy={scaleY(p.lat)}
            r={4}
            fill="#FF9800"
            opacity={0.8}
          />
        ))}
      </Svg>
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Paragraph style={styles.legendText}>Start</Paragraph>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
          <Paragraph style={styles.legendText}>End</Paragraph>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
          <Paragraph style={styles.legendText}>High Speed</Paragraph>
        </View>
      </View>
    </View>
  );
}

// Heatmap Component
function HeatmapView({ heatmap, width = MAP_WIDTH, height = MAP_HEIGHT }: { heatmap: HeatmapData; width?: number; height?: number }) {
  if (!heatmap || heatmap.cells.length === 0) {
    return (
      <View style={[styles.mapContainer, { width, height }]}>
        <Paragraph style={styles.noDataText}>No heatmap data available</Paragraph>
      </View>
    );
  }

  const padding = 20;
  const mapW = width - padding * 2;
  const mapH = height - padding * 2;
  const cellW = mapW / heatmap.gridWidth;
  const cellH = mapH / heatmap.gridHeight;

  // Heat color scale (green -> yellow -> orange -> red)
  const getHeatColor = (value: number): string => {
    if (value < 0.25) return `rgba(76, 175, 80, ${value * 3 + 0.2})`; // Green
    if (value < 0.5) return `rgba(255, 235, 59, ${value * 1.5 + 0.3})`; // Yellow
    if (value < 0.75) return `rgba(255, 152, 0, ${value + 0.2})`; // Orange
    return `rgba(244, 67, 54, ${value})`; // Red
  };

  return (
    <View style={[styles.mapContainer, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Football pitch background */}
        <Rect x={padding} y={padding} width={mapW} height={mapH} fill="#2d5a27" rx={4} />

        {/* Heatmap cells */}
        {heatmap.cells.map((cell, i) => (
          <Rect
            key={i}
            x={padding + cell.x * cellW}
            y={padding + cell.y * cellH}
            width={cellW}
            height={cellH}
            fill={getHeatColor(cell.value)}
            rx={2}
          />
        ))}

        {/* Pitch markings */}
        <Line x1={padding + mapW / 2} y1={padding} x2={padding + mapW / 2} y2={padding + mapH} stroke="#fff" strokeWidth={1} opacity={0.5} />
        <Circle cx={padding + mapW / 2} cy={padding + mapH / 2} r={mapH * 0.15} stroke="#fff" strokeWidth={1} fill="none" opacity={0.5} />
        <Rect x={padding} y={padding + mapH * 0.25} width={mapW * 0.15} height={mapH * 0.5} stroke="#fff" strokeWidth={1} fill="none" opacity={0.5} />
        <Rect x={padding + mapW * 0.85} y={padding + mapH * 0.25} width={mapW * 0.15} height={mapH * 0.5} stroke="#fff" strokeWidth={1} fill="none" opacity={0.5} />
      </Svg>
      <View style={styles.heatLegend}>
        <Paragraph style={styles.legendText}>Activity: </Paragraph>
        <View style={styles.heatScale}>
          <View style={[styles.heatScaleBar, { backgroundColor: 'rgba(76, 175, 80, 0.7)' }]} />
          <View style={[styles.heatScaleBar, { backgroundColor: 'rgba(255, 235, 59, 0.8)' }]} />
          <View style={[styles.heatScaleBar, { backgroundColor: 'rgba(255, 152, 0, 0.9)' }]} />
          <View style={[styles.heatScaleBar, { backgroundColor: 'rgba(244, 67, 54, 1)' }]} />
        </View>
        <View style={styles.heatScaleLabels}>
          <Paragraph style={styles.legendText}>Low</Paragraph>
          <Paragraph style={styles.legendText}>High</Paragraph>
        </View>
      </View>
    </View>
  );
}

// Metrics Card Component
function MetricsCard({ metrics, sessionType }: { metrics: FitnessMetrics; sessionType: string }) {
  const distanceKm = metrics.totalDistanceM ? (metrics.totalDistanceM / 1000).toFixed(2) : '-';

  return (
    <Card style={styles.metricsCard}>
      <Card.Content>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={24} color={COLORS.primary} />
            <Title style={styles.metricValue}>{distanceKm}</Title>
            <Paragraph style={styles.metricLabel}>km</Paragraph>
          </View>

          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="speedometer" size={24} color={COLORS.primary} />
            <Title style={styles.metricValue}>{metrics.topSpeedKmh?.toFixed(1) || '-'}</Title>
            <Paragraph style={styles.metricLabel}>Top km/h</Paragraph>
          </View>

          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="run-fast" size={24} color={COLORS.primary} />
            <Title style={styles.metricValue}>{metrics.sprintCount || '-'}</Title>
            <Paragraph style={styles.metricLabel}>Sprints</Paragraph>
          </View>

          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color="#F44336" />
            <Title style={styles.metricValue}>{metrics.maxHeartRate || '-'}</Title>
            <Paragraph style={styles.metricLabel}>Max HR</Paragraph>
          </View>

          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="heart" size={24} color="#E91E63" />
            <Title style={styles.metricValue}>{metrics.avgHeartRate || '-'}</Title>
            <Paragraph style={styles.metricLabel}>Avg HR</Paragraph>
          </View>

          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="arrow-up-bold" size={24} color="#4CAF50" />
            <Title style={styles.metricValue}>{metrics.accelerationCount || '-'}</Title>
            <Paragraph style={styles.metricLabel}>Accels</Paragraph>
          </View>

          {metrics.playerLoad && (
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="weight-lifter" size={24} color={COLORS.secondary} />
              <Title style={styles.metricValue}>{metrics.playerLoad}</Title>
              <Paragraph style={styles.metricLabel}>Load</Paragraph>
            </View>
          )}

          {metrics.perceivedExertion && (
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="emoticon-sad" size={24} color="#FF9800" />
              <Title style={styles.metricValue}>{metrics.perceivedExertion}/10</Title>
              <Paragraph style={styles.metricLabel}>RPE</Paragraph>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

// Manual Entry Modal
function ManualEntryModal({
  visible,
  onDismiss,
  onSubmit,
  selectedPlayer,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: any) => void;
  selectedPlayer: Player | null;
}) {
  const [sessionType, setSessionType] = useState<string>('match');
  const [sessionName, setSessionName] = useState('');
  const [distance, setDistance] = useState('');
  const [topSpeed, setTopSpeed] = useState('');
  const [sprints, setSprints] = useState('');
  const [maxHR, setMaxHR] = useState('');
  const [avgHR, setAvgHR] = useState('');
  const [rpe, setRpe] = useState('');
  const [fatigue, setFatigue] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!selectedPlayer) {
      Alert.alert('Error', 'Please select a player first');
      return;
    }

    const data = {
      playerId: selectedPlayer.id,
      sessionType,
      sessionName: sessionName || `${sessionType === 'match' ? 'Match' : 'Training'} Session`,
      sessionDate: new Date().toISOString().split('T')[0],
      totalDistanceKm: distance ? parseFloat(distance) : undefined,
      topSpeedKmh: topSpeed ? parseFloat(topSpeed) : undefined,
      sprintCount: sprints ? parseInt(sprints) : undefined,
      maxHeartRate: maxHR ? parseInt(maxHR) : undefined,
      avgHeartRate: avgHR ? parseInt(avgHR) : undefined,
      perceivedExertion: rpe ? parseInt(rpe) : undefined,
      fatigueLevel: fatigue ? parseInt(fatigue) : undefined,
      notes,
    };

    onSubmit(data);
    // Reset form
    setSessionName('');
    setDistance('');
    setTopSpeed('');
    setSprints('');
    setMaxHR('');
    setAvgHR('');
    setRpe('');
    setFatigue('');
    setNotes('');
    onDismiss();
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <ScrollView>
          <Title style={styles.modalTitle}>Manual Data Entry</Title>
          {selectedPlayer && (
            <Paragraph style={styles.modalSubtitle}>Recording for: {selectedPlayer.name}</Paragraph>
          )}

          <SegmentedButtons
            value={sessionType}
            onValueChange={setSessionType}
            buttons={[
              { value: 'match', label: 'Match' },
              { value: 'training', label: 'Training' },
            ]}
            style={styles.segmentedButtons}
          />

          <TextInput
            label="Session Name (optional)"
            value={sessionName}
            onChangeText={setSessionName}
            mode="outlined"
            style={styles.input}
          />

          <Divider style={styles.divider} />
          <Paragraph style={styles.sectionLabel}>Performance Metrics</Paragraph>

          <View style={styles.inputRow}>
            <TextInput
              label="Distance (km)"
              value={distance}
              onChangeText={setDistance}
              mode="outlined"
              keyboardType="decimal-pad"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              label="Top Speed (km/h)"
              value={topSpeed}
              onChangeText={setTopSpeed}
              mode="outlined"
              keyboardType="decimal-pad"
              style={[styles.input, styles.halfInput]}
            />
          </View>

          <View style={styles.inputRow}>
            <TextInput
              label="Sprint Count"
              value={sprints}
              onChangeText={setSprints}
              mode="outlined"
              keyboardType="number-pad"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              label="Max Heart Rate"
              value={maxHR}
              onChangeText={setMaxHR}
              mode="outlined"
              keyboardType="number-pad"
              style={[styles.input, styles.halfInput]}
            />
          </View>

          <TextInput
            label="Avg Heart Rate"
            value={avgHR}
            onChangeText={setAvgHR}
            mode="outlined"
            keyboardType="number-pad"
            style={styles.input}
          />

          <Divider style={styles.divider} />
          <Paragraph style={styles.sectionLabel}>Wellness (1-10)</Paragraph>

          <View style={styles.inputRow}>
            <TextInput
              label="RPE (Exertion)"
              value={rpe}
              onChangeText={setRpe}
              mode="outlined"
              keyboardType="number-pad"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              label="Fatigue Level"
              value={fatigue}
              onChangeText={setFatigue}
              mode="outlined"
              keyboardType="number-pad"
              style={[styles.input, styles.halfInput]}
            />
          </View>

          <TextInput
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <View style={styles.modalButtons}>
            <Button mode="outlined" onPress={onDismiss} style={styles.modalButton}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSubmit} style={styles.modalButton}>
              Save Entry
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

// Main Screen
export default function WearablesScreen() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [viewMode, setViewMode] = useState<string>('track');
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playerSummary, setPlayerSummary] = useState<PlayerSummary | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Load player summary when player changes
  useEffect(() => {
    if (selectedPlayer) {
      loadPlayerSummary(selectedPlayer.id);
    }
  }, [selectedPlayer]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, squadRes] = await Promise.all([
        wearablesApi.listSessions().catch(() => ({ data: [] })),
        squadApi.getSquad().catch(() => ({ data: [] })),
      ]);
      const squadData = (squadRes?.data || []).map((p: any) => ({
        id: p.id || p.playerId,
        name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
        position: p.position,
        number: p.number || p.squadNumber,
      }));
      setPlayers(squadData);
      if (squadData.length > 0 && !selectedPlayer) setSelectedPlayer(squadData[0]);
      const sessData = (sessionsRes?.data || []).map((s: any) => ({
        id: s.id || s.sessionId,
        sessionType: s.sessionType || s.type || 'training',
        sessionName: s.sessionName || s.name || '',
        sessionDate: s.sessionDate || s.date || '',
        durationMinutes: s.durationMinutes || s.duration,
        entryMethod: s.entryMethod || 'automatic',
        metrics: s.metrics || {},
        gpsTrack: s.gpsTrack,
        player: s.player,
      }));
      setSessions(sessData);
      if (sessData.length > 0) setSelectedSession(sessData[0]);
    } catch (err) {
      console.error('Error loading wearables:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerSummary = async (playerId: string) => {
    try {
      const result = await wearablesApi.getPlayerSummary(playerId);
      if (result?.data) {
        setPlayerSummary(result.data);
      }
    } catch (err) {
      console.error('Error loading player summary:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleManualSubmit = async (data: any) => {
    setLoading(true);
    try {
      await wearablesApi.manualEntry(data);
      Alert.alert('Success', 'Data saved successfully!');
      handleRefresh();
    } catch (error) {
      Alert.alert('Error', 'Failed to save data');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      default: return COLORS.textLight;
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'match': return 'soccer';
      case 'training': return 'whistle';
      default: return 'run';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Title>GPS & Fitness</Title>
          <Paragraph style={styles.subtitle}>Track performance data</Paragraph>
        </View>

        {/* Player Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerScroll}>
          {players.map(player => (
            <TouchableOpacity
              key={player.id}
              onPress={() => setSelectedPlayer(player)}
              style={[
                styles.playerChip,
                selectedPlayer?.id === player.id && styles.playerChipSelected
              ]}
            >
              <Avatar.Text
                size={36}
                label={player.name.split(' ').map(n => n[0]).join('')}
                style={[
                  styles.playerAvatar,
                  selectedPlayer?.id === player.id && styles.playerAvatarSelected
                ]}
              />
              <View>
                <Paragraph style={[
                  styles.playerChipName,
                  selectedPlayer?.id === player.id && styles.playerChipNameSelected
                ]}>
                  {player.name}
                </Paragraph>
                <Paragraph style={styles.playerChipPosition}>#{player.number} {player.position}</Paragraph>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Player Summary Card */}
        {playerSummary && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <View style={styles.summaryHeader}>
                <Title style={styles.summaryTitle}>Season Summary</Title>
                <Chip
                  style={{ backgroundColor: getRiskColor(playerSummary.injuryRiskLevel) }}
                  textStyle={{ color: '#fff' }}
                >
                  {playerSummary.injuryRiskLevel.toUpperCase()} Risk
                </Chip>
              </View>
              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Title style={styles.summaryValue}>{playerSummary.seasonTotalDistanceKm.toFixed(1)}</Title>
                  <Paragraph style={styles.summaryLabel}>Total km</Paragraph>
                </View>
                <View style={styles.summaryStat}>
                  <Title style={styles.summaryValue}>{playerSummary.seasonTotalSprints}</Title>
                  <Paragraph style={styles.summaryLabel}>Sprints</Paragraph>
                </View>
                <View style={styles.summaryStat}>
                  <Title style={styles.summaryValue}>{playerSummary.totalSessions}</Title>
                  <Paragraph style={styles.summaryLabel}>Sessions</Paragraph>
                </View>
                <View style={styles.summaryStat}>
                  <Title style={styles.summaryValue}>{playerSummary.recentAvgTopSpeedKmh.toFixed(1)}</Title>
                  <Paragraph style={styles.summaryLabel}>Avg Top Speed</Paragraph>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Session List */}
        <View style={styles.sessionHeader}>
          <Title style={styles.sectionTitle}>Recent Sessions</Title>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => setManualModalVisible(true)}
            compact
          >
            Manual Entry
          </Button>
        </View>

        {sessions.map(session => (
          <TouchableOpacity
            key={session.id}
            onPress={() => setSelectedSession(session)}
          >
            <Card style={[
              styles.sessionCard,
              selectedSession?.id === session.id && styles.sessionCardSelected
            ]}>
              <Card.Content>
                <View style={styles.sessionRow}>
                  <View style={styles.sessionInfo}>
                    <MaterialCommunityIcons
                      name={getSessionTypeIcon(session.sessionType)}
                      size={24}
                      color={COLORS.primary}
                    />
                    <View style={styles.sessionDetails}>
                      <Paragraph style={styles.sessionName}>
                        {session.sessionName || session.sessionType}
                      </Paragraph>
                      <Paragraph style={styles.sessionDate}>
                        {session.sessionDate} • {session.durationMinutes} mins
                      </Paragraph>
                    </View>
                  </View>
                  <View style={styles.sessionQuickStats}>
                    {session.metrics?.totalDistanceM && (
                      <Paragraph style={styles.quickStat}>
                        {(session.metrics.totalDistanceM / 1000).toFixed(1)} km
                      </Paragraph>
                    )}
                    <Chip
                      style={styles.entryMethodChip}
                      textStyle={styles.entryMethodText}
                    >
                      {session.entryMethod === 'automatic' ? 'GPS' : 'Manual'}
                    </Chip>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}

        {/* Selected Session Details */}
        {selectedSession && (
          <View style={styles.detailSection}>
            <Title style={styles.sectionTitle}>
              {selectedSession.sessionName || 'Session Details'}
            </Title>

            {/* View Mode Toggle */}
            <SegmentedButtons
              value={viewMode}
              onValueChange={setViewMode}
              buttons={[
                { value: 'track', label: 'GPS Track', icon: 'map-marker-path' },
                { value: 'heatmap', label: 'Heat Map', icon: 'grid' },
              ]}
              style={styles.viewToggle}
            />

            {/* Map Visualization */}
            <Card style={styles.mapCard}>
              <Card.Content>
                {viewMode === 'track' && selectedSession.gpsTrack ? (
                  <GPSTrackMap track={selectedSession.gpsTrack} />
                ) : viewMode === 'heatmap' && selectedSession.metrics?.heatmap ? (
                  <HeatmapView heatmap={selectedSession.metrics.heatmap} />
                ) : (
                  <View style={[styles.mapContainer, { height: MAP_HEIGHT }]}>
                    <MaterialCommunityIcons name="map-marker-off" size={48} color={COLORS.textLight} />
                    <Paragraph style={styles.noDataText}>
                      {viewMode === 'track' ? 'No GPS track data' : 'No heatmap data'}
                    </Paragraph>
                    <Paragraph style={styles.noDataHint}>
                      Use automatic sync or import GPS data
                    </Paragraph>
                  </View>
                )}
              </Card.Content>
            </Card>

            {/* Metrics */}
            {selectedSession.metrics && (
              <MetricsCard metrics={selectedSession.metrics} sessionType={selectedSession.sessionType} />
            )}
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Manual Entry Modal */}
      <ManualEntryModal
        visible={manualModalVisible}
        onDismiss={() => setManualModalVisible(false)}
        onSubmit={handleManualSubmit}
        selectedPlayer={selectedPlayer}
      />

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  subtitle: {
    color: COLORS.textLight,
  },
  playerScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingRight: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playerChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  playerAvatar: {
    backgroundColor: COLORS.textLight,
    marginRight: 8,
  },
  playerAvatarSelected: {
    backgroundColor: COLORS.primary,
  },
  playerChipName: {
    fontWeight: '600',
    fontSize: 14,
  },
  playerChipNameSelected: {
    color: COLORS.primary,
  },
  playerChipPosition: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    color: COLORS.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
  },
  sessionCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sessionCardSelected: {
    borderColor: COLORS.primary,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionDetails: {
    marginLeft: 12,
    flex: 1,
  },
  sessionName: {
    fontWeight: '600',
  },
  sessionDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  sessionQuickStats: {
    alignItems: 'flex-end',
  },
  quickStat: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  entryMethodChip: {
    backgroundColor: COLORS.background,
    marginTop: 4,
  },
  entryMethodText: {
    fontSize: 10,
  },
  detailSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  viewToggle: {
    marginBottom: 16,
  },
  mapCard: {
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  mapContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapLegend: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 4,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#fff',
  },
  heatLegend: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
  },
  heatScale: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  heatScaleBar: {
    width: 20,
    height: 12,
  },
  heatScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 80,
  },
  noDataText: {
    color: COLORS.textLight,
    marginTop: 8,
  },
  noDataHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  metricsCard: {
    backgroundColor: COLORS.surface,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
    width: '25%',
    paddingVertical: 12,
  },
  metricValue: {
    fontSize: 20,
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    textAlign: 'center',
    color: COLORS.textLight,
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  sectionLabel: {
    fontWeight: '600',
    marginBottom: 8,
    color: COLORS.textLight,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    minWidth: 100,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
