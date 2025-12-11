// packages/sdk/src/types-wearables.ts
// TypeScript types for GPS/Wearables tracking system

// ============================================================================
// DEVICE TYPES
// ============================================================================

export type WearableDeviceType =
  | 'gps_vest'
  | 'gps_shin_pad'
  | 'hr_monitor'
  | 'smartwatch'
  | 'other';

export type WearableProvider =
  | 'catapult'
  | 'statsports'
  | 'playertek'
  | 'garmin'
  | 'polar'
  | 'fitbit'
  | 'apple'
  | 'strava'
  | 'zepp'
  | 'whoop'
  | 'oura'
  | 'manual'
  | 'other';

export interface WearableDevice {
  id: string;
  tenantId: string;
  playerId: string;
  deviceType: WearableDeviceType;
  provider: WearableProvider;
  deviceName?: string;
  deviceSerial?: string;
  isActive: boolean;
  batteryLevel?: number;
  lastSyncAt?: number;
  firmwareVersion?: string;
  config?: WearableDeviceConfig;
  pairedAt: number;
  createdAt: number;
  updatedAt?: number;
}

export interface WearableDeviceConfig {
  sampleRate?: number;        // Hz
  hrZones?: number[];         // [zone1Max, zone2Max, zone3Max, zone4Max]
  maxHeartRate?: number;      // Player's max HR for zone calculation
  sprintThreshold?: number;   // km/h threshold for sprint detection
  customFields?: Record<string, unknown>;
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export type SessionType =
  | 'match'
  | 'training'
  | 'fitness_test'
  | 'recovery'
  | 'other';

export type EntryMethod = 'automatic' | 'manual' | 'import';

export type SessionStatus = 'recording' | 'processing' | 'complete' | 'error';

export interface WearableSession {
  id: string;
  tenantId: string;
  playerId: string;
  deviceId?: string;
  fixtureId?: string;
  sessionType: SessionType;
  sessionName?: string;
  sessionDate: string;        // YYYY-MM-DD
  startTime?: number;
  endTime?: number;
  durationMinutes?: number;
  entryMethod: EntryMethod;
  importSource?: string;
  gpsTrack?: GPSPoint[];
  status: SessionStatus;
  processingError?: string;
  createdAt: number;
  updatedAt?: number;
}

// ============================================================================
// GPS DATA TYPES
// ============================================================================

export interface GPSPoint {
  lat: number;
  lon: number;
  ts: number;                 // Unix timestamp
  speed?: number;             // m/s
  alt?: number;               // Altitude in meters
  hr?: number;                // Heart rate if synced
  acc?: number;               // Accuracy in meters
}

export interface GPSSample {
  id: string;
  tenantId: string;
  sessionId: string;
  playerId: string;
  latitude: number;
  longitude: number;
  altitudeM?: number;
  accuracyM?: number;
  speedMs?: number;
  accelerationMs2?: number;
  bearing?: number;
  heartRate?: number;
  timestamp: number;
}

// ============================================================================
// FITNESS METRICS
// ============================================================================

export interface PlayerFitnessMetrics {
  id: string;
  tenantId: string;
  playerId: string;
  sessionId: string;
  fixtureId?: string;
  seasonId?: string;

  // Distance metrics (meters)
  totalDistanceM?: number;
  walkingDistanceM?: number;
  joggingDistanceM?: number;
  runningDistanceM?: number;
  highSpeedDistanceM?: number;
  sprintDistanceM?: number;

  // Speed metrics
  topSpeedMs?: number;
  topSpeedKmh?: number;
  avgSpeedMs?: number;
  avgSpeedKmh?: number;

  // Sprint metrics
  sprintCount?: number;
  sprintTotalDistanceM?: number;
  longestSprintM?: number;
  avgSprintDistanceM?: number;

  // Acceleration/deceleration
  accelerationCount?: number;
  decelerationCount?: number;
  maxAccelerationMs2?: number;
  maxDecelerationMs2?: number;

  // Heart rate
  maxHeartRate?: number;
  avgHeartRate?: number;
  minHeartRate?: number;
  restingHeartRate?: number;

  // HR Zones (minutes)
  hrZone1Minutes?: number;
  hrZone2Minutes?: number;
  hrZone3Minutes?: number;
  hrZone4Minutes?: number;
  hrZone5Minutes?: number;

  // Workload
  playerLoad?: number;
  trainingImpulse?: number;
  caloriesBurned?: number;

  // Recovery
  hrRecovery1min?: number;
  hrRecovery2min?: number;

  // Positional
  timeInOwnHalfPct?: number;
  timeInOppHalfPct?: number;
  avgPositionX?: number;
  avgPositionY?: number;

  // Heat map
  heatmap?: HeatmapData;

  // Manual entry
  perceivedExertion?: number;     // RPE 1-10
  fatigueLevel?: number;          // 1-10
  muscleSoreness?: number;        // 1-10
  sleepQuality?: number;          // 1-10
  sleepHours?: number;
  hydrationLevel?: number;        // 1-10
  notes?: string;

  // Risk scores
  injuryRiskScore?: number;       // 0-100
  fatigueScore?: number;          // 0-100
  readinessScore?: number;        // 0-100

  capturedAt: number;
  createdAt: number;
  updatedAt?: number;
}

// ============================================================================
// HEAT MAP & VISUALIZATION
// ============================================================================

export interface HeatmapData {
  gridWidth: number;              // Number of columns
  gridHeight: number;             // Number of rows
  cells: HeatmapCell[];
}

export interface HeatmapCell {
  x: number;                      // Grid X position (0 to gridWidth-1)
  y: number;                      // Grid Y position (0 to gridHeight-1)
  value: number;                  // Normalized intensity 0-1
  count?: number;                 // Number of data points in cell
  avgSpeed?: number;              // Average speed in this area
}

export interface PitchDefinition {
  id: string;
  tenantId: string;
  name: string;
  venueName?: string;
  cornerNwLat: number;
  cornerNwLon: number;
  cornerNeLat: number;
  cornerNeLon: number;
  cornerSwLat: number;
  cornerSwLon: number;
  cornerSeLat: number;
  cornerSeLon: number;
  lengthM: number;
  widthM: number;
  rotationDegrees: number;
  isDefault: boolean;
  createdAt: number;
  updatedAt?: number;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateWearableDeviceRequest {
  playerId: string;
  deviceType: WearableDeviceType;
  provider: WearableProvider;
  deviceName?: string;
  deviceSerial?: string;
  config?: WearableDeviceConfig;
}

export interface UpdateWearableDeviceRequest {
  deviceName?: string;
  isActive?: boolean;
  config?: WearableDeviceConfig;
}

export interface CreateSessionRequest {
  playerId: string;
  deviceId?: string;
  fixtureId?: string;
  sessionType: SessionType;
  sessionName?: string;
  sessionDate: string;
  durationMinutes?: number;
  entryMethod?: EntryMethod;
}

export interface SyncWearableDataRequest {
  playerId: string;
  deviceId?: string;
  sessionId?: string;
  fixtureId?: string;
  sessionType?: SessionType;
  sessionDate?: string;
  samples: WearableSampleInput[];
}

export interface WearableSampleInput {
  timestamp: number;
  type: 'gps' | 'heart_rate' | 'acceleration' | 'combined';
  latitude?: number;
  longitude?: number;
  altitude?: number;
  speed?: number;
  heartRate?: number;
  acceleration?: number;
  bearing?: number;
  accuracy?: number;
  raw?: Record<string, unknown>;  // Provider-specific fields
}

export interface ManualMetricsEntryRequest {
  playerId: string;
  fixtureId?: string;
  sessionType: SessionType;
  sessionName?: string;
  sessionDate: string;
  durationMinutes?: number;

  // Distance (can enter in km, converted to m)
  totalDistanceKm?: number;
  sprintDistanceKm?: number;

  // Speed (km/h)
  topSpeedKmh?: number;
  avgSpeedKmh?: number;

  // Counts
  sprintCount?: number;
  accelerationCount?: number;
  decelerationCount?: number;

  // Heart rate
  maxHeartRate?: number;
  avgHeartRate?: number;

  // Wellness
  perceivedExertion?: number;
  fatigueLevel?: number;
  muscleSoreness?: number;
  sleepQuality?: number;
  sleepHours?: number;
  hydrationLevel?: number;

  notes?: string;
}

export interface SyncDataResponse {
  success: boolean;
  sessionId: string;
  samplesProcessed: number;
  metrics?: PlayerFitnessMetrics;
  errors?: string[];
}

export interface PlayerMetricsSummary {
  playerId: string;
  playerName: string;
  lastSessionDate?: string;
  totalSessions: number;

  // Season totals
  seasonTotalDistanceKm: number;
  seasonTotalSprints: number;
  seasonAvgDistanceKm: number;

  // Recent averages (last 5 sessions)
  recentAvgDistanceKm: number;
  recentAvgTopSpeedKmh: number;
  recentAvgHeartRate: number;

  // Risk assessment
  currentFatigueScore?: number;
  currentReadinessScore?: number;
  injuryRiskLevel: 'low' | 'medium' | 'high';
}

export interface SessionWithMetrics extends WearableSession {
  metrics?: PlayerFitnessMetrics;
  player?: {
    id: string;
    name: string;
    position?: string;
    number?: number;
  };
}

// ============================================================================
// PROVIDER INTEGRATION
// ============================================================================

export interface WearableIntegration {
  id: string;
  tenantId: string;
  provider: WearableProvider;
  providerAccountId?: string;
  isActive: boolean;
  lastSyncAt?: number;
  syncError?: string;
  connectedAt: number;
  createdAt: number;
  updatedAt?: number;
}

export interface ConnectProviderRequest {
  provider: WearableProvider;
  authCode?: string;            // OAuth authorization code
  apiKey?: string;              // For API key auth
  apiSecret?: string;
}

// ============================================================================
// COMPARISON & ANALYTICS
// ============================================================================

export interface MetricsComparison {
  current: PlayerFitnessMetrics;
  previous?: PlayerFitnessMetrics;
  seasonAverage?: Partial<PlayerFitnessMetrics>;
  positionAverage?: Partial<PlayerFitnessMetrics>;
  changes: {
    distanceChange?: number;      // Percentage
    speedChange?: number;
    sprintCountChange?: number;
    workloadChange?: number;
  };
}

export interface TeamMetricsOverview {
  sessionDate: string;
  sessionType: SessionType;
  playerMetrics: Array<{
    playerId: string;
    playerName: string;
    position?: string;
    totalDistanceKm: number;
    topSpeedKmh: number;
    sprintCount: number;
    avgHeartRate?: number;
    playerLoad?: number;
  }>;
  teamAverages: {
    avgDistanceKm: number;
    avgTopSpeedKmh: number;
    avgSprintCount: number;
    avgHeartRate?: number;
  };
}

export interface FatigueAssessment {
  playerId: string;
  playerName: string;
  assessedAt: number;

  // Workload analysis
  acuteLoad: number;              // Last 7 days
  chronicLoad: number;            // Last 28 days
  acuteChronicRatio: number;      // ACWR

  // Risk levels
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  workloadRisk: 'low' | 'medium' | 'high';
  fatigueRisk: 'low' | 'medium' | 'high';

  // Recommendations
  recommendations: string[];
  suggestedLoadReduction?: number;  // Percentage
}
