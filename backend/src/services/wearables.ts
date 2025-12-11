// backend/src/services/wearables.ts
// Service layer for GPS/Wearables data management

import type { Env } from '../env';
import type {
  WearableDevice,
  WearableSession,
  PlayerFitnessMetrics,
  GPSSample,
  GPSPoint,
  HeatmapData,
  HeatmapCell,
  WearableSampleInput,
  ManualMetricsEntryRequest,
  PlayerMetricsSummary,
  FatigueAssessment,
  SessionWithMetrics,
  PitchDefinition,
} from '@syston-tigers/sdk';

// ============================================================================
// DEVICE MANAGEMENT
// ============================================================================

export async function createDevice(
  env: Env,
  tenantId: string,
  data: Omit<WearableDevice, 'id' | 'tenantId' | 'createdAt' | 'pairedAt'>
): Promise<WearableDevice> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(`
    INSERT INTO wearable_devices (
      id, tenant_id, player_id, device_type, provider, device_name,
      device_serial, is_active, config_json, paired_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    tenantId,
    data.playerId,
    data.deviceType,
    data.provider,
    data.deviceName || null,
    data.deviceSerial || null,
    data.isActive ? 1 : 0,
    data.config ? JSON.stringify(data.config) : null,
    now,
    now
  ).run();

  return {
    id,
    tenantId,
    ...data,
    pairedAt: now,
    createdAt: now,
    isActive: data.isActive ?? true,
  };
}

export async function getDevice(
  env: Env,
  tenantId: string,
  deviceId: string
): Promise<WearableDevice | null> {
  const row = await env.DB.prepare(`
    SELECT * FROM wearable_devices WHERE id = ? AND tenant_id = ?
  `).bind(deviceId, tenantId).first();

  if (!row) return null;

  return mapRowToDevice(row);
}

export async function getPlayerDevices(
  env: Env,
  tenantId: string,
  playerId: string
): Promise<WearableDevice[]> {
  const result = await env.DB.prepare(`
    SELECT * FROM wearable_devices
    WHERE tenant_id = ? AND player_id = ?
    ORDER BY created_at DESC
  `).bind(tenantId, playerId).all();

  return (result.results || []).map(mapRowToDevice);
}

export async function getAllDevices(
  env: Env,
  tenantId: string,
  activeOnly = false
): Promise<WearableDevice[]> {
  let query = `SELECT * FROM wearable_devices WHERE tenant_id = ?`;
  if (activeOnly) {
    query += ` AND is_active = 1`;
  }
  query += ` ORDER BY created_at DESC`;

  const result = await env.DB.prepare(query).bind(tenantId).all();
  return (result.results || []).map(mapRowToDevice);
}

export async function updateDevice(
  env: Env,
  tenantId: string,
  deviceId: string,
  updates: Partial<Pick<WearableDevice, 'deviceName' | 'isActive' | 'config' | 'batteryLevel' | 'lastSyncAt'>>
): Promise<boolean> {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.deviceName !== undefined) {
    sets.push('device_name = ?');
    values.push(updates.deviceName);
  }
  if (updates.isActive !== undefined) {
    sets.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }
  if (updates.config !== undefined) {
    sets.push('config_json = ?');
    values.push(JSON.stringify(updates.config));
  }
  if (updates.batteryLevel !== undefined) {
    sets.push('battery_level = ?');
    values.push(updates.batteryLevel);
  }
  if (updates.lastSyncAt !== undefined) {
    sets.push('last_sync_at = ?');
    values.push(updates.lastSyncAt);
  }

  sets.push('updated_at = ?');
  values.push(Date.now());
  values.push(deviceId, tenantId);

  const result = await env.DB.prepare(`
    UPDATE wearable_devices SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?
  `).bind(...values).run();

  return result.meta.changes > 0;
}

export async function deleteDevice(
  env: Env,
  tenantId: string,
  deviceId: string
): Promise<boolean> {
  const result = await env.DB.prepare(`
    DELETE FROM wearable_devices WHERE id = ? AND tenant_id = ?
  `).bind(deviceId, tenantId).run();

  return result.meta.changes > 0;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export async function createSession(
  env: Env,
  tenantId: string,
  data: Omit<WearableSession, 'id' | 'tenantId' | 'createdAt' | 'status'>
): Promise<WearableSession> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(`
    INSERT INTO wearable_sessions (
      id, tenant_id, player_id, device_id, fixture_id, session_type,
      session_name, session_date, start_time, end_time, duration_minutes,
      entry_method, import_source, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'complete', ?)
  `).bind(
    id,
    tenantId,
    data.playerId,
    data.deviceId || null,
    data.fixtureId || null,
    data.sessionType,
    data.sessionName || null,
    data.sessionDate,
    data.startTime || null,
    data.endTime || null,
    data.durationMinutes || null,
    data.entryMethod || 'automatic',
    data.importSource || null,
    now
  ).run();

  return {
    id,
    tenantId,
    ...data,
    status: 'complete',
    createdAt: now,
    entryMethod: data.entryMethod || 'automatic',
  };
}

export async function getSession(
  env: Env,
  tenantId: string,
  sessionId: string
): Promise<SessionWithMetrics | null> {
  const row = await env.DB.prepare(`
    SELECT ws.*, s.name as player_name, s.position as player_position, s.number as player_number
    FROM wearable_sessions ws
    LEFT JOIN squad s ON ws.player_id = s.id
    WHERE ws.id = ? AND ws.tenant_id = ?
  `).bind(sessionId, tenantId).first();

  if (!row) return null;

  const session = mapRowToSession(row);
  const metrics = await getMetricsForSession(env, tenantId, sessionId);

  return {
    ...session,
    metrics: metrics || undefined,
    player: row.player_name ? {
      id: row.player_id as string,
      name: row.player_name as string,
      position: row.player_position as string | undefined,
      number: row.player_number as number | undefined,
    } : undefined,
  };
}

export async function getPlayerSessions(
  env: Env,
  tenantId: string,
  playerId: string,
  options?: {
    sessionType?: string;
    limit?: number;
    offset?: number;
  }
): Promise<WearableSession[]> {
  let query = `
    SELECT * FROM wearable_sessions
    WHERE tenant_id = ? AND player_id = ?
  `;
  const params: (string | number)[] = [tenantId, playerId];

  if (options?.sessionType) {
    query += ` AND session_type = ?`;
    params.push(options.sessionType);
  }

  query += ` ORDER BY session_date DESC, created_at DESC`;

  if (options?.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }
  if (options?.offset) {
    query += ` OFFSET ?`;
    params.push(options.offset);
  }

  const result = await env.DB.prepare(query).bind(...params).all();
  return (result.results || []).map(mapRowToSession);
}

export async function getFixtureSessions(
  env: Env,
  tenantId: string,
  fixtureId: string
): Promise<SessionWithMetrics[]> {
  const result = await env.DB.prepare(`
    SELECT ws.*, s.name as player_name, s.position as player_position, s.number as player_number
    FROM wearable_sessions ws
    LEFT JOIN squad s ON ws.player_id = s.id
    WHERE ws.tenant_id = ? AND ws.fixture_id = ?
    ORDER BY s.name ASC
  `).bind(tenantId, fixtureId).all();

  const sessions: SessionWithMetrics[] = [];
  for (const row of result.results || []) {
    const session = mapRowToSession(row);
    const metrics = await getMetricsForSession(env, tenantId, session.id);
    sessions.push({
      ...session,
      metrics: metrics || undefined,
      player: row.player_name ? {
        id: row.player_id as string,
        name: row.player_name as string,
        position: row.player_position as string | undefined,
        number: row.player_number as number | undefined,
      } : undefined,
    });
  }

  return sessions;
}

// ============================================================================
// GPS DATA HANDLING
// ============================================================================

export async function saveGPSSamples(
  env: Env,
  tenantId: string,
  sessionId: string,
  playerId: string,
  samples: GPSSample[]
): Promise<number> {
  if (samples.length === 0) return 0;

  // Batch insert for efficiency
  const stmt = env.DB.prepare(`
    INSERT INTO gps_samples (
      id, tenant_id, session_id, player_id, latitude, longitude,
      altitude_m, accuracy_m, speed_ms, acceleration_ms2, bearing,
      heart_rate, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batch = samples.map(s => stmt.bind(
    s.id || crypto.randomUUID(),
    tenantId,
    sessionId,
    playerId,
    s.latitude,
    s.longitude,
    s.altitudeM || null,
    s.accuracyM || null,
    s.speedMs || null,
    s.accelerationMs2 || null,
    s.bearing || null,
    s.heartRate || null,
    s.timestamp
  ));

  await env.DB.batch(batch);

  // Also store as GPS track JSON for quick retrieval
  const trackPoints: GPSPoint[] = samples.map(s => ({
    lat: s.latitude,
    lon: s.longitude,
    ts: s.timestamp,
    speed: s.speedMs,
    alt: s.altitudeM,
    hr: s.heartRate,
    acc: s.accuracyM,
  }));

  await env.DB.prepare(`
    UPDATE wearable_sessions SET gps_track_json = ? WHERE id = ? AND tenant_id = ?
  `).bind(JSON.stringify(trackPoints), sessionId, tenantId).run();

  return samples.length;
}

export async function getGPSTrack(
  env: Env,
  tenantId: string,
  sessionId: string
): Promise<GPSPoint[]> {
  const row = await env.DB.prepare(`
    SELECT gps_track_json FROM wearable_sessions WHERE id = ? AND tenant_id = ?
  `).bind(sessionId, tenantId).first();

  if (!row?.gps_track_json) return [];

  try {
    return JSON.parse(row.gps_track_json as string);
  } catch {
    return [];
  }
}

export async function getGPSSamplesForSession(
  env: Env,
  tenantId: string,
  sessionId: string
): Promise<GPSSample[]> {
  const result = await env.DB.prepare(`
    SELECT * FROM gps_samples
    WHERE tenant_id = ? AND session_id = ?
    ORDER BY timestamp ASC
  `).bind(tenantId, sessionId).all();

  return (result.results || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    tenantId: row.tenant_id as string,
    sessionId: row.session_id as string,
    playerId: row.player_id as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    altitudeM: row.altitude_m as number | undefined,
    accuracyM: row.accuracy_m as number | undefined,
    speedMs: row.speed_ms as number | undefined,
    accelerationMs2: row.acceleration_ms2 as number | undefined,
    bearing: row.bearing as number | undefined,
    heartRate: row.heart_rate as number | undefined,
    timestamp: row.timestamp as number,
  }));
}

// ============================================================================
// METRICS CALCULATION & STORAGE
// ============================================================================

export async function calculateAndSaveMetrics(
  env: Env,
  tenantId: string,
  sessionId: string,
  playerId: string,
  samples: WearableSampleInput[],
  fixtureId?: string,
  seasonId?: string
): Promise<PlayerFitnessMetrics> {
  const now = Date.now();
  const id = crypto.randomUUID();

  // Calculate metrics from samples
  const metrics = calculateMetricsFromSamples(samples);

  // Generate heat map if GPS data available
  const gpsSamples = samples.filter(s => s.latitude !== undefined && s.longitude !== undefined);
  const heatmap = gpsSamples.length > 10 ? generateHeatmap(gpsSamples) : null;

  await env.DB.prepare(`
    INSERT INTO player_fitness_metrics (
      id, tenant_id, player_id, session_id, fixture_id, season_id,
      total_distance_m, walking_distance_m, jogging_distance_m, running_distance_m,
      high_speed_distance_m, sprint_distance_m,
      top_speed_ms, top_speed_kmh, avg_speed_ms, avg_speed_kmh,
      sprint_count, sprint_total_distance_m, longest_sprint_m, avg_sprint_distance_m,
      acceleration_count, deceleration_count, max_acceleration_ms2, max_deceleration_ms2,
      max_heart_rate, avg_heart_rate, min_heart_rate,
      hr_zone1_minutes, hr_zone2_minutes, hr_zone3_minutes, hr_zone4_minutes, hr_zone5_minutes,
      player_load, calories_burned,
      heatmap_json,
      captured_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, tenantId, playerId, sessionId, fixtureId || null, seasonId || null,
    metrics.totalDistanceM || null,
    metrics.walkingDistanceM || null,
    metrics.joggingDistanceM || null,
    metrics.runningDistanceM || null,
    metrics.highSpeedDistanceM || null,
    metrics.sprintDistanceM || null,
    metrics.topSpeedMs || null,
    metrics.topSpeedKmh || null,
    metrics.avgSpeedMs || null,
    metrics.avgSpeedKmh || null,
    metrics.sprintCount || null,
    metrics.sprintTotalDistanceM || null,
    metrics.longestSprintM || null,
    metrics.avgSprintDistanceM || null,
    metrics.accelerationCount || null,
    metrics.decelerationCount || null,
    metrics.maxAccelerationMs2 || null,
    metrics.maxDecelerationMs2 || null,
    metrics.maxHeartRate || null,
    metrics.avgHeartRate || null,
    metrics.minHeartRate || null,
    metrics.hrZone1Minutes || null,
    metrics.hrZone2Minutes || null,
    metrics.hrZone3Minutes || null,
    metrics.hrZone4Minutes || null,
    metrics.hrZone5Minutes || null,
    metrics.playerLoad || null,
    metrics.caloriesBurned || null,
    heatmap ? JSON.stringify(heatmap) : null,
    now, now
  ).run();

  return {
    id,
    tenantId,
    playerId,
    sessionId,
    fixtureId,
    seasonId,
    ...metrics,
    heatmap: heatmap || undefined,
    capturedAt: now,
    createdAt: now,
  };
}

export async function saveManualMetrics(
  env: Env,
  tenantId: string,
  data: ManualMetricsEntryRequest
): Promise<{ session: WearableSession; metrics: PlayerFitnessMetrics }> {
  const now = Date.now();

  // Create session first
  const session = await createSession(env, tenantId, {
    playerId: data.playerId,
    fixtureId: data.fixtureId,
    sessionType: data.sessionType,
    sessionName: data.sessionName,
    sessionDate: data.sessionDate,
    durationMinutes: data.durationMinutes,
    entryMethod: 'manual',
  });

  // Convert km to m
  const totalDistanceM = data.totalDistanceKm ? data.totalDistanceKm * 1000 : undefined;
  const sprintDistanceM = data.sprintDistanceKm ? data.sprintDistanceKm * 1000 : undefined;

  // Convert km/h to m/s
  const topSpeedMs = data.topSpeedKmh ? data.topSpeedKmh / 3.6 : undefined;
  const avgSpeedMs = data.avgSpeedKmh ? data.avgSpeedKmh / 3.6 : undefined;

  const metricsId = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO player_fitness_metrics (
      id, tenant_id, player_id, session_id, fixture_id,
      total_distance_m, sprint_distance_m,
      top_speed_ms, top_speed_kmh, avg_speed_ms, avg_speed_kmh,
      sprint_count, acceleration_count, deceleration_count,
      max_heart_rate, avg_heart_rate,
      perceived_exertion, fatigue_level, muscle_soreness,
      sleep_quality, sleep_hours, hydration_level, notes,
      captured_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    metricsId, tenantId, data.playerId, session.id, data.fixtureId || null,
    totalDistanceM || null, sprintDistanceM || null,
    topSpeedMs || null, data.topSpeedKmh || null,
    avgSpeedMs || null, data.avgSpeedKmh || null,
    data.sprintCount || null,
    data.accelerationCount || null,
    data.decelerationCount || null,
    data.maxHeartRate || null, data.avgHeartRate || null,
    data.perceivedExertion || null,
    data.fatigueLevel || null,
    data.muscleSoreness || null,
    data.sleepQuality || null,
    data.sleepHours || null,
    data.hydrationLevel || null,
    data.notes || null,
    now, now
  ).run();

  const metrics: PlayerFitnessMetrics = {
    id: metricsId,
    tenantId,
    playerId: data.playerId,
    sessionId: session.id,
    fixtureId: data.fixtureId,
    totalDistanceM,
    sprintDistanceM,
    topSpeedMs,
    topSpeedKmh: data.topSpeedKmh,
    avgSpeedMs,
    avgSpeedKmh: data.avgSpeedKmh,
    sprintCount: data.sprintCount,
    accelerationCount: data.accelerationCount,
    decelerationCount: data.decelerationCount,
    maxHeartRate: data.maxHeartRate,
    avgHeartRate: data.avgHeartRate,
    perceivedExertion: data.perceivedExertion,
    fatigueLevel: data.fatigueLevel,
    muscleSoreness: data.muscleSoreness,
    sleepQuality: data.sleepQuality,
    sleepHours: data.sleepHours,
    hydrationLevel: data.hydrationLevel,
    notes: data.notes,
    capturedAt: now,
    createdAt: now,
  };

  return { session, metrics };
}

export async function getMetricsForSession(
  env: Env,
  tenantId: string,
  sessionId: string
): Promise<PlayerFitnessMetrics | null> {
  const row = await env.DB.prepare(`
    SELECT * FROM player_fitness_metrics WHERE session_id = ? AND tenant_id = ?
  `).bind(sessionId, tenantId).first();

  if (!row) return null;

  return mapRowToMetrics(row);
}

export async function getPlayerMetrics(
  env: Env,
  tenantId: string,
  playerId: string,
  options?: {
    limit?: number;
    seasonId?: string;
  }
): Promise<PlayerFitnessMetrics[]> {
  let query = `
    SELECT * FROM player_fitness_metrics
    WHERE tenant_id = ? AND player_id = ?
  `;
  const params: (string | number)[] = [tenantId, playerId];

  if (options?.seasonId) {
    query += ` AND season_id = ?`;
    params.push(options.seasonId);
  }

  query += ` ORDER BY captured_at DESC`;

  if (options?.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }

  const result = await env.DB.prepare(query).bind(...params).all();
  return (result.results || []).map(mapRowToMetrics);
}

// ============================================================================
// ANALYTICS & SUMMARIES
// ============================================================================

export async function getPlayerMetricsSummary(
  env: Env,
  tenantId: string,
  playerId: string
): Promise<PlayerMetricsSummary | null> {
  // Get player info
  const player = await env.DB.prepare(`
    SELECT id, name FROM squad WHERE id = ? AND tenant_id = ?
  `).bind(playerId, tenantId).first();

  if (!player) return null;

  // Get season totals
  const seasonStats = await env.DB.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      MAX(ws.session_date) as last_session_date,
      SUM(pfm.total_distance_m) as total_distance,
      SUM(pfm.sprint_count) as total_sprints,
      AVG(pfm.total_distance_m) as avg_distance
    FROM player_fitness_metrics pfm
    JOIN wearable_sessions ws ON pfm.session_id = ws.id
    WHERE pfm.tenant_id = ? AND pfm.player_id = ?
  `).bind(tenantId, playerId).first();

  // Get recent averages (last 5 sessions)
  const recentStats = await env.DB.prepare(`
    SELECT
      AVG(total_distance_m) as avg_distance,
      AVG(top_speed_kmh) as avg_top_speed,
      AVG(avg_heart_rate) as avg_hr
    FROM player_fitness_metrics
    WHERE tenant_id = ? AND player_id = ?
    ORDER BY captured_at DESC
    LIMIT 5
  `).bind(tenantId, playerId).first();

  // Get current fatigue assessment
  const fatigue = await calculateFatigueAssessment(env, tenantId, playerId);

  return {
    playerId,
    playerName: player.name as string,
    lastSessionDate: seasonStats?.last_session_date as string | undefined,
    totalSessions: (seasonStats?.total_sessions as number) || 0,
    seasonTotalDistanceKm: ((seasonStats?.total_distance as number) || 0) / 1000,
    seasonTotalSprints: (seasonStats?.total_sprints as number) || 0,
    seasonAvgDistanceKm: ((seasonStats?.avg_distance as number) || 0) / 1000,
    recentAvgDistanceKm: ((recentStats?.avg_distance as number) || 0) / 1000,
    recentAvgTopSpeedKmh: (recentStats?.avg_top_speed as number) || 0,
    recentAvgHeartRate: (recentStats?.avg_hr as number) || 0,
    currentFatigueScore: fatigue?.fatigueRisk === 'high' ? 80 : fatigue?.fatigueRisk === 'medium' ? 50 : 20,
    currentReadinessScore: fatigue?.overallRisk === 'low' ? 85 : fatigue?.overallRisk === 'medium' ? 60 : 35,
    injuryRiskLevel: fatigue?.overallRisk || 'low',
  };
}

export async function calculateFatigueAssessment(
  env: Env,
  tenantId: string,
  playerId: string
): Promise<FatigueAssessment | null> {
  const player = await env.DB.prepare(`
    SELECT id, name FROM squad WHERE id = ? AND tenant_id = ?
  `).bind(playerId, tenantId).first();

  if (!player) return null;

  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = now - (28 * 24 * 60 * 60 * 1000);

  // Get acute load (7 days)
  const acuteResult = await env.DB.prepare(`
    SELECT SUM(COALESCE(player_load, total_distance_m / 100)) as load
    FROM player_fitness_metrics
    WHERE tenant_id = ? AND player_id = ? AND captured_at >= ?
  `).bind(tenantId, playerId, sevenDaysAgo).first();

  // Get chronic load (28 days)
  const chronicResult = await env.DB.prepare(`
    SELECT SUM(COALESCE(player_load, total_distance_m / 100)) as load
    FROM player_fitness_metrics
    WHERE tenant_id = ? AND player_id = ? AND captured_at >= ?
  `).bind(tenantId, playerId, twentyEightDaysAgo).first();

  const acuteLoad = (acuteResult?.load as number) || 0;
  const chronicLoad = (chronicResult?.load as number) || 0;
  const weeklyChronicLoad = chronicLoad / 4;
  const acwr = weeklyChronicLoad > 0 ? acuteLoad / weeklyChronicLoad : 0;

  // Determine risk levels
  let workloadRisk: 'low' | 'medium' | 'high' = 'low';
  if (acwr > 1.5) workloadRisk = 'high';
  else if (acwr > 1.3) workloadRisk = 'medium';

  let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (acwr > 1.7) overallRisk = 'critical';
  else if (acwr > 1.5) overallRisk = 'high';
  else if (acwr > 1.3) overallRisk = 'medium';

  const recommendations: string[] = [];
  if (overallRisk === 'critical') {
    recommendations.push('Consider rest day or light recovery session');
    recommendations.push('Monitor for signs of fatigue or injury');
  } else if (overallRisk === 'high') {
    recommendations.push('Reduce training intensity this week');
  } else if (acwr < 0.8) {
    recommendations.push('Training load is low - consider increasing intensity');
  }

  return {
    playerId,
    playerName: player.name as string,
    assessedAt: now,
    acuteLoad,
    chronicLoad: weeklyChronicLoad,
    acuteChronicRatio: acwr,
    overallRisk,
    workloadRisk,
    fatigueRisk: workloadRisk,
    recommendations,
    suggestedLoadReduction: overallRisk === 'critical' ? 50 : overallRisk === 'high' ? 25 : undefined,
  };
}

// ============================================================================
// HEAT MAP GENERATION
// ============================================================================

export function generateHeatmap(
  samples: WearableSampleInput[],
  gridWidth = 12,
  gridHeight = 8
): HeatmapData {
  const gpsSamples = samples.filter(s => s.latitude !== undefined && s.longitude !== undefined);

  if (gpsSamples.length === 0) {
    return { gridWidth, gridHeight, cells: [] };
  }

  // Find bounds
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;

  for (const s of gpsSamples) {
    if (s.latitude! < minLat) minLat = s.latitude!;
    if (s.latitude! > maxLat) maxLat = s.latitude!;
    if (s.longitude! < minLon) minLon = s.longitude!;
    if (s.longitude! > maxLon) maxLon = s.longitude!;
  }

  // Create grid
  const cellCounts: Map<string, { count: number; speedSum: number }> = new Map();
  const latStep = (maxLat - minLat) / gridHeight || 0.0001;
  const lonStep = (maxLon - minLon) / gridWidth || 0.0001;

  for (const s of gpsSamples) {
    const x = Math.min(Math.floor((s.longitude! - minLon) / lonStep), gridWidth - 1);
    const y = Math.min(Math.floor((s.latitude! - minLat) / latStep), gridHeight - 1);
    const key = `${x},${y}`;

    const existing = cellCounts.get(key) || { count: 0, speedSum: 0 };
    existing.count++;
    if (s.speed) existing.speedSum += s.speed;
    cellCounts.set(key, existing);
  }

  // Find max count for normalization
  let maxCount = 0;
  for (const data of cellCounts.values()) {
    if (data.count > maxCount) maxCount = data.count;
  }

  // Convert to cells
  const cells: HeatmapCell[] = [];
  for (const [key, data] of cellCounts.entries()) {
    const [x, y] = key.split(',').map(Number);
    cells.push({
      x,
      y,
      value: maxCount > 0 ? data.count / maxCount : 0,
      count: data.count,
      avgSpeed: data.count > 0 ? data.speedSum / data.count : undefined,
    });
  }

  return { gridWidth, gridHeight, cells };
}

// ============================================================================
// PITCH DEFINITIONS
// ============================================================================

export async function savePitchDefinition(
  env: Env,
  tenantId: string,
  data: Omit<PitchDefinition, 'id' | 'tenantId' | 'createdAt'>
): Promise<PitchDefinition> {
  const id = crypto.randomUUID();
  const now = Date.now();

  // If this is default, unset other defaults
  if (data.isDefault) {
    await env.DB.prepare(`
      UPDATE pitch_definitions SET is_default = 0 WHERE tenant_id = ?
    `).bind(tenantId).run();
  }

  await env.DB.prepare(`
    INSERT INTO pitch_definitions (
      id, tenant_id, name, venue_name,
      corner_nw_lat, corner_nw_lon, corner_ne_lat, corner_ne_lon,
      corner_sw_lat, corner_sw_lon, corner_se_lat, corner_se_lon,
      length_m, width_m, rotation_degrees, is_default, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, tenantId, data.name, data.venueName || null,
    data.cornerNwLat, data.cornerNwLon,
    data.cornerNeLat, data.cornerNeLon,
    data.cornerSwLat, data.cornerSwLon,
    data.cornerSeLat, data.cornerSeLon,
    data.lengthM, data.widthM, data.rotationDegrees,
    data.isDefault ? 1 : 0, now
  ).run();

  return {
    id,
    tenantId,
    ...data,
    createdAt: now,
  };
}

export async function getPitchDefinitions(
  env: Env,
  tenantId: string
): Promise<PitchDefinition[]> {
  const result = await env.DB.prepare(`
    SELECT * FROM pitch_definitions WHERE tenant_id = ? ORDER BY is_default DESC, name ASC
  `).bind(tenantId).all();

  return (result.results || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    venueName: row.venue_name as string | undefined,
    cornerNwLat: row.corner_nw_lat as number,
    cornerNwLon: row.corner_nw_lon as number,
    cornerNeLat: row.corner_ne_lat as number,
    cornerNeLon: row.corner_ne_lon as number,
    cornerSwLat: row.corner_sw_lat as number,
    cornerSwLon: row.corner_sw_lon as number,
    cornerSeLat: row.corner_se_lat as number,
    cornerSeLon: row.corner_se_lon as number,
    lengthM: row.length_m as number,
    widthM: row.width_m as number,
    rotationDegrees: row.rotation_degrees as number,
    isDefault: row.is_default === 1,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number | undefined,
  }));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateMetricsFromSamples(samples: WearableSampleInput[]): Partial<PlayerFitnessMetrics> {
  const metrics: Partial<PlayerFitnessMetrics> = {};

  // Filter by type
  const gpsSamples = samples.filter(s => s.latitude !== undefined && s.longitude !== undefined);
  const hrSamples = samples.filter(s => s.heartRate !== undefined);
  const speedSamples = samples.filter(s => s.speed !== undefined);
  const accSamples = samples.filter(s => s.acceleration !== undefined);

  // Distance calculation
  if (gpsSamples.length > 1) {
    let totalDistance = 0;
    let walkingDistance = 0;
    let joggingDistance = 0;
    let runningDistance = 0;
    let highSpeedDistance = 0;
    let sprintDistance = 0;

    for (let i = 1; i < gpsSamples.length; i++) {
      const prev = gpsSamples[i - 1];
      const curr = gpsSamples[i];
      const dist = haversineDistance(
        prev.latitude!, prev.longitude!,
        curr.latitude!, curr.longitude!
      );

      totalDistance += dist;

      // Categorize by speed (m/s)
      const speed = curr.speed || 0;
      const speedKmh = speed * 3.6;

      if (speedKmh < 7) walkingDistance += dist;
      else if (speedKmh < 14) joggingDistance += dist;
      else if (speedKmh < 20) runningDistance += dist;
      else if (speedKmh < 25) highSpeedDistance += dist;
      else sprintDistance += dist;
    }

    metrics.totalDistanceM = totalDistance;
    metrics.walkingDistanceM = walkingDistance;
    metrics.joggingDistanceM = joggingDistance;
    metrics.runningDistanceM = runningDistance;
    metrics.highSpeedDistanceM = highSpeedDistance;
    metrics.sprintDistanceM = sprintDistance;
  }

  // Speed metrics
  if (speedSamples.length > 0) {
    const speeds = speedSamples.map(s => s.speed!);
    const maxSpeed = Math.max(...speeds);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

    metrics.topSpeedMs = maxSpeed;
    metrics.topSpeedKmh = maxSpeed * 3.6;
    metrics.avgSpeedMs = avgSpeed;
    metrics.avgSpeedKmh = avgSpeed * 3.6;

    // Sprint detection (>25 km/h = ~6.94 m/s)
    let sprintCount = 0;
    let inSprint = false;
    let currentSprintDistance = 0;
    let longestSprint = 0;
    const sprints: number[] = [];

    for (let i = 0; i < speedSamples.length; i++) {
      const speedKmh = speedSamples[i].speed! * 3.6;
      if (speedKmh >= 25) {
        if (!inSprint) {
          inSprint = true;
          sprintCount++;
          currentSprintDistance = 0;
        }
        // Estimate distance in this sample interval
        if (i > 0) {
          const timeDiff = (speedSamples[i].timestamp - speedSamples[i - 1].timestamp) / 1000;
          currentSprintDistance += speedSamples[i].speed! * timeDiff;
        }
      } else if (inSprint) {
        inSprint = false;
        sprints.push(currentSprintDistance);
        if (currentSprintDistance > longestSprint) {
          longestSprint = currentSprintDistance;
        }
      }
    }

    metrics.sprintCount = sprintCount;
    metrics.longestSprintM = longestSprint;
    if (sprints.length > 0) {
      metrics.sprintTotalDistanceM = sprints.reduce((a, b) => a + b, 0);
      metrics.avgSprintDistanceM = metrics.sprintTotalDistanceM / sprints.length;
    }
  }

  // Heart rate metrics
  if (hrSamples.length > 0) {
    const hrs = hrSamples.map(s => s.heartRate!);
    metrics.maxHeartRate = Math.max(...hrs);
    metrics.minHeartRate = Math.min(...hrs);
    metrics.avgHeartRate = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
  }

  // Acceleration metrics
  if (accSamples.length > 0) {
    const accs = accSamples.map(s => s.acceleration!);
    let accCount = 0;
    let decCount = 0;
    let maxAcc = 0;
    let maxDec = 0;

    for (const acc of accs) {
      if (acc > 3) {
        accCount++;
        if (acc > maxAcc) maxAcc = acc;
      } else if (acc < -3) {
        decCount++;
        if (acc < maxDec) maxDec = acc;
      }
    }

    metrics.accelerationCount = accCount;
    metrics.decelerationCount = decCount;
    metrics.maxAccelerationMs2 = maxAcc;
    metrics.maxDecelerationMs2 = Math.abs(maxDec);
  }

  // Estimate player load (simplified)
  if (metrics.totalDistanceM && metrics.sprintCount) {
    metrics.playerLoad = (metrics.totalDistanceM / 100) + (metrics.sprintCount * 10) +
      ((metrics.accelerationCount || 0) * 2) + ((metrics.decelerationCount || 0) * 2);
  }

  return metrics;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function mapRowToDevice(row: Record<string, unknown>): WearableDevice {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    playerId: row.player_id as string,
    deviceType: row.device_type as WearableDevice['deviceType'],
    provider: row.provider as WearableDevice['provider'],
    deviceName: row.device_name as string | undefined,
    deviceSerial: row.device_serial as string | undefined,
    isActive: row.is_active === 1,
    batteryLevel: row.battery_level as number | undefined,
    lastSyncAt: row.last_sync_at as number | undefined,
    firmwareVersion: row.firmware_version as string | undefined,
    config: row.config_json ? JSON.parse(row.config_json as string) : undefined,
    pairedAt: row.paired_at as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number | undefined,
  };
}

function mapRowToSession(row: Record<string, unknown>): WearableSession {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    playerId: row.player_id as string,
    deviceId: row.device_id as string | undefined,
    fixtureId: row.fixture_id as string | undefined,
    sessionType: row.session_type as WearableSession['sessionType'],
    sessionName: row.session_name as string | undefined,
    sessionDate: row.session_date as string,
    startTime: row.start_time as number | undefined,
    endTime: row.end_time as number | undefined,
    durationMinutes: row.duration_minutes as number | undefined,
    entryMethod: row.entry_method as WearableSession['entryMethod'],
    importSource: row.import_source as string | undefined,
    gpsTrack: row.gps_track_json ? JSON.parse(row.gps_track_json as string) : undefined,
    status: row.status as WearableSession['status'],
    processingError: row.processing_error as string | undefined,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number | undefined,
  };
}

function mapRowToMetrics(row: Record<string, unknown>): PlayerFitnessMetrics {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    playerId: row.player_id as string,
    sessionId: row.session_id as string,
    fixtureId: row.fixture_id as string | undefined,
    seasonId: row.season_id as string | undefined,
    totalDistanceM: row.total_distance_m as number | undefined,
    walkingDistanceM: row.walking_distance_m as number | undefined,
    joggingDistanceM: row.jogging_distance_m as number | undefined,
    runningDistanceM: row.running_distance_m as number | undefined,
    highSpeedDistanceM: row.high_speed_distance_m as number | undefined,
    sprintDistanceM: row.sprint_distance_m as number | undefined,
    topSpeedMs: row.top_speed_ms as number | undefined,
    topSpeedKmh: row.top_speed_kmh as number | undefined,
    avgSpeedMs: row.avg_speed_ms as number | undefined,
    avgSpeedKmh: row.avg_speed_kmh as number | undefined,
    sprintCount: row.sprint_count as number | undefined,
    sprintTotalDistanceM: row.sprint_total_distance_m as number | undefined,
    longestSprintM: row.longest_sprint_m as number | undefined,
    avgSprintDistanceM: row.avg_sprint_distance_m as number | undefined,
    accelerationCount: row.acceleration_count as number | undefined,
    decelerationCount: row.deceleration_count as number | undefined,
    maxAccelerationMs2: row.max_acceleration_ms2 as number | undefined,
    maxDecelerationMs2: row.max_deceleration_ms2 as number | undefined,
    maxHeartRate: row.max_heart_rate as number | undefined,
    avgHeartRate: row.avg_heart_rate as number | undefined,
    minHeartRate: row.min_heart_rate as number | undefined,
    restingHeartRate: row.resting_heart_rate as number | undefined,
    hrZone1Minutes: row.hr_zone1_minutes as number | undefined,
    hrZone2Minutes: row.hr_zone2_minutes as number | undefined,
    hrZone3Minutes: row.hr_zone3_minutes as number | undefined,
    hrZone4Minutes: row.hr_zone4_minutes as number | undefined,
    hrZone5Minutes: row.hr_zone5_minutes as number | undefined,
    playerLoad: row.player_load as number | undefined,
    trainingImpulse: row.training_impulse as number | undefined,
    caloriesBurned: row.calories_burned as number | undefined,
    hrRecovery1min: row.hr_recovery_1min as number | undefined,
    hrRecovery2min: row.hr_recovery_2min as number | undefined,
    timeInOwnHalfPct: row.time_in_own_half_pct as number | undefined,
    timeInOppHalfPct: row.time_in_opp_half_pct as number | undefined,
    avgPositionX: row.avg_position_x as number | undefined,
    avgPositionY: row.avg_position_y as number | undefined,
    heatmap: row.heatmap_json ? JSON.parse(row.heatmap_json as string) : undefined,
    perceivedExertion: row.perceived_exertion as number | undefined,
    fatigueLevel: row.fatigue_level as number | undefined,
    muscleSoreness: row.muscle_soreness as number | undefined,
    sleepQuality: row.sleep_quality as number | undefined,
    sleepHours: row.sleep_hours as number | undefined,
    hydrationLevel: row.hydration_level as number | undefined,
    notes: row.notes as string | undefined,
    injuryRiskScore: row.injury_risk_score as number | undefined,
    fatigueScore: row.fatigue_score as number | undefined,
    readinessScore: row.readiness_score as number | undefined,
    capturedAt: row.captured_at as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number | undefined,
  };
}
