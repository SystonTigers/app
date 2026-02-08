// backend/src/routes/wearables.ts
// API routes for GPS/Wearables tracking

import { json } from '../services/util';
import { requireJWT } from '../services/auth';
import type { Env } from '../env';
import * as wearablesService from '../services/wearables';
import type {
  CreateWearableDeviceRequest,
  UpdateWearableDeviceRequest,
  SyncWearableDataRequest,
  ManualMetricsEntryRequest,
  CreateSessionRequest,
} from '@syston-tigers/sdk';

// ============================================================================
// DEVICE ROUTES
// ============================================================================

// GET /api/v1/wearables/devices - List all devices for tenant
export async function handleListDevices(req: Request, env: Env, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const url = new URL(req.url);
    const playerId = url.searchParams.get('playerId');
    const activeOnly = url.searchParams.get('activeOnly') === 'true';

    let devices;
    if (playerId) {
      devices = await wearablesService.getPlayerDevices(env, claims.tenantId, playerId);
    } else {
      devices = await wearablesService.getAllDevices(env, claims.tenantId, activeOnly);
    }

    return json({ success: true, data: devices }, 200, corsHdrs);
  } catch (err) {
    console.error('List devices error:', err);
    return json({ success: false, error: 'Failed to list devices' }, 500, corsHdrs);
  }
}

// POST /api/v1/wearables/devices - Create/pair a new device
export async function handleCreateDevice(req: Request, env: Env, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const body = await req.json() as CreateWearableDeviceRequest;

    if (!body.playerId || !body.deviceType || !body.provider) {
      return json({ success: false, error: 'playerId, deviceType, and provider are required' }, 400, corsHdrs);
    }

    const device = await wearablesService.createDevice(env, claims.tenantId, {
      playerId: body.playerId,
      deviceType: body.deviceType,
      provider: body.provider,
      deviceName: body.deviceName,
      deviceSerial: body.deviceSerial,
      config: body.config,
      isActive: true,
    });

    return json({ success: true, data: device }, 201, corsHdrs);
  } catch (err) {
    console.error('Create device error:', err);
    return json({ success: false, error: 'Failed to create device' }, 500, corsHdrs);
  }
}

// GET /api/v1/wearables/devices/:deviceId - Get device details
export async function handleGetDevice(req: Request, env: Env, corsHdrs: Headers, deviceId: string) {
  try {
    const claims = await requireJWT(req, env);
    const device = await wearablesService.getDevice(env, claims.tenantId, deviceId);

    if (!device) {
      return json({ success: false, error: 'Device not found' }, 404, corsHdrs);
    }

    return json({ success: true, data: device }, 200, corsHdrs);
  } catch (err) {
    console.error('Get device error:', err);
    return json({ success: false, error: 'Failed to get device' }, 500, corsHdrs);
  }
}

// PUT /api/v1/wearables/devices/:deviceId - Update device
export async function handleUpdateDevice(req: Request, env: Env, corsHdrs: Headers, deviceId: string) {
  try {
    const claims = await requireJWT(req, env);
    const body = await req.json() as UpdateWearableDeviceRequest;

    const updated = await wearablesService.updateDevice(env, claims.tenantId, deviceId, body);

    if (!updated) {
      return json({ success: false, error: 'Device not found' }, 404, corsHdrs);
    }

    return json({ success: true }, 200, corsHdrs);
  } catch (err) {
    console.error('Update device error:', err);
    return json({ success: false, error: 'Failed to update device' }, 500, corsHdrs);
  }
}

// DELETE /api/v1/wearables/devices/:deviceId - Delete/unpair device
export async function handleDeleteDevice(req: Request, env: Env, corsHdrs: Headers, deviceId: string) {
  try {
    const claims = await requireJWT(req, env);
    const deleted = await wearablesService.deleteDevice(env, claims.tenantId, deviceId);

    if (!deleted) {
      return json({ success: false, error: 'Device not found' }, 404, corsHdrs);
    }

    return json({ success: true, message: 'Device deleted' }, 200, corsHdrs);
  } catch (err) {
    console.error('Delete device error:', err);
    return json({ success: false, error: 'Failed to delete device' }, 500, corsHdrs);
  }
}

// ============================================================================
// SESSION ROUTES
// ============================================================================

// GET /api/v1/wearables/sessions - List sessions
export async function handleListSessions(req: Request, env: Env, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const url = new URL(req.url);
    const playerId = url.searchParams.get('playerId');
    const fixtureId = url.searchParams.get('fixtureId');
    const sessionType = url.searchParams.get('sessionType') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (fixtureId) {
      const sessions = await wearablesService.getFixtureSessions(env, claims.tenantId, fixtureId);
      return json({ success: true, data: sessions }, 200, corsHdrs);
    }

    if (!playerId) {
      return json({ success: false, error: 'playerId or fixtureId is required' }, 400, corsHdrs);
    }

    const sessions = await wearablesService.getPlayerSessions(env, claims.tenantId, playerId, {
      sessionType,
      limit,
    });

    return json({ success: true, data: sessions }, 200, corsHdrs);
  } catch (err) {
    console.error('List sessions error:', err);
    return json({ success: false, error: 'Failed to list sessions' }, 500, corsHdrs);
  }
}

// POST /api/v1/wearables/sessions - Create a session (for manual entry or import)
export async function handleCreateSession(req: Request, env: Env, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const body = await req.json() as CreateSessionRequest;

    if (!body.playerId || !body.sessionType || !body.sessionDate) {
      return json({ success: false, error: 'playerId, sessionType, and sessionDate are required' }, 400, corsHdrs);
    }

    const session = await wearablesService.createSession(env, claims.tenantId, {
      playerId: body.playerId,
      deviceId: body.deviceId,
      fixtureId: body.fixtureId,
      sessionType: body.sessionType,
      sessionName: body.sessionName,
      sessionDate: body.sessionDate,
      durationMinutes: body.durationMinutes,
      entryMethod: body.entryMethod || 'manual',
    });

    return json({ success: true, data: session }, 201, corsHdrs);
  } catch (err) {
    console.error('Create session error:', err);
    return json({ success: false, error: 'Failed to create session' }, 500, corsHdrs);
  }
}

// GET /api/v1/wearables/sessions/:sessionId - Get session with metrics
export async function handleGetSession(req: Request, env: Env, corsHdrs: Headers, sessionId: string) {
  try {
    const claims = await requireJWT(req, env);
    const session = await wearablesService.getSession(env, claims.tenantId, sessionId);

    if (!session) {
      return json({ success: false, error: 'Session not found' }, 404, corsHdrs);
    }

    return json({ success: true, data: session }, 200, corsHdrs);
  } catch (err) {
    console.error('Get session error:', err);
    return json({ success: false, error: 'Failed to get session' }, 500, corsHdrs);
  }
}

// GET /api/v1/wearables/sessions/:sessionId/gps-track - Get GPS track for map
export async function handleGetGPSTrack(req: Request, env: Env, corsHdrs: Headers, sessionId: string) {
  try {
    const claims = await requireJWT(req, env);
    const track = await wearablesService.getGPSTrack(env, claims.tenantId, sessionId);

    return json({ success: true, data: track }, 200, corsHdrs);
  } catch (err) {
    console.error('Get GPS track error:', err);
    return json({ success: false, error: 'Failed to get GPS track' }, 500, corsHdrs);
  }
}

// ============================================================================
// DATA SYNC ROUTES
// ============================================================================

// POST /api/v1/wearables/sync - Sync data from device/app (automatic entry)
export async function handleSyncData(req: Request, env: Env, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const body = await req.json() as SyncWearableDataRequest;

    if (!body.playerId || !body.samples || body.samples.length === 0) {
      return json({ success: false, error: 'playerId and samples are required' }, 400, corsHdrs);
    }

    // Create or get session
    let sessionId = body.sessionId;
    if (!sessionId) {
      const session = await wearablesService.createSession(env, claims.tenantId, {
        playerId: body.playerId,
        deviceId: body.deviceId,
        fixtureId: body.fixtureId,
        sessionType: body.sessionType || 'training',
        sessionDate: body.sessionDate || new Date().toISOString().split('T')[0],
        entryMethod: 'automatic',
      });
      sessionId = session.id;
    }

    // Save GPS samples if present
    const gpsSamples = body.samples
      .filter(s => s.latitude !== undefined && s.longitude !== undefined)
      .map(s => ({
        id: crypto.randomUUID(),
        tenantId: claims.tenantId,
        sessionId: sessionId!,
        playerId: body.playerId,
        latitude: s.latitude!,
        longitude: s.longitude!,
        altitudeM: s.altitude,
        accuracyM: s.accuracy,
        speedMs: s.speed,
        accelerationMs2: s.acceleration,
        bearing: s.bearing,
        heartRate: s.heartRate,
        timestamp: s.timestamp,
      }));

    if (gpsSamples.length > 0) {
      await wearablesService.saveGPSSamples(env, claims.tenantId, sessionId, body.playerId, gpsSamples);
    }

    // Calculate and save metrics
    const metrics = await wearablesService.calculateAndSaveMetrics(
      env,
      claims.tenantId,
      sessionId,
      body.playerId,
      body.samples,
      body.fixtureId
    );

    // Update device last sync time
    if (body.deviceId) {
      await wearablesService.updateDevice(env, claims.tenantId, body.deviceId, {
        lastSyncAt: Date.now(),
      });
    }

    return json({
      success: true,
      data: {
        sessionId,
        samplesProcessed: body.samples.length,
        metrics,
      },
    }, 200, corsHdrs);
  } catch (err) {
    console.error('Sync data error:', err);
    return json({ success: false, error: 'Failed to sync data' }, 500, corsHdrs);
  }
}

// POST /api/v1/wearables/manual - Manual metrics entry
export async function handleManualEntry(req: Request, env: Env, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const body = await req.json() as ManualMetricsEntryRequest;

    if (!body.playerId || !body.sessionType || !body.sessionDate) {
      return json({ success: false, error: 'playerId, sessionType, and sessionDate are required' }, 400, corsHdrs);
    }

    const result = await wearablesService.saveManualMetrics(env, claims.tenantId, body);

    return json({ success: true, data: result }, 201, corsHdrs);
  } catch (err) {
    console.error('Manual entry error:', err);
    return json({ success: false, error: 'Failed to save manual entry' }, 500, corsHdrs);
  }
}

// ============================================================================
// METRICS & ANALYTICS ROUTES
// ============================================================================

// GET /api/v1/wearables/metrics/:playerId - Get player metrics
export async function handleGetPlayerMetrics(req: Request, env: Env, corsHdrs: Headers, playerId: string) {
  try {
    const claims = await requireJWT(req, env);
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const seasonId = url.searchParams.get('seasonId') || undefined;

    const metrics = await wearablesService.getPlayerMetrics(env, claims.tenantId, playerId, {
      limit,
      seasonId,
    });

    return json({ success: true, data: metrics }, 200, corsHdrs);
  } catch (err) {
    console.error('Get player metrics error:', err);
    return json({ success: false, error: 'Failed to get player metrics' }, 500, corsHdrs);
  }
}

// GET /api/v1/wearables/summary/:playerId - Get player metrics summary
export async function handleGetPlayerSummary(req: Request, env: Env, corsHdrs: Headers, playerId: string) {
  try {
    const claims = await requireJWT(req, env);
    const summary = await wearablesService.getPlayerMetricsSummary(env, claims.tenantId, playerId);

    if (!summary) {
      return json({ success: false, error: 'Player not found' }, 404, corsHdrs);
    }

    return json({ success: true, data: summary }, 200, corsHdrs);
  } catch (err) {
    console.error('Get player summary error:', err);
    return json({ success: false, error: 'Failed to get player summary' }, 500, corsHdrs);
  }
}

// GET /api/v1/wearables/fatigue/:playerId - Get fatigue/injury risk assessment
export async function handleGetFatigueAssessment(req: Request, env: Env, corsHdrs: Headers, playerId: string) {
  try {
    const claims = await requireJWT(req, env);
    const assessment = await wearablesService.calculateFatigueAssessment(env, claims.tenantId, playerId);

    if (!assessment) {
      return json({ success: false, error: 'Player not found' }, 404, corsHdrs);
    }

    return json({ success: true, data: assessment }, 200, corsHdrs);
  } catch (err) {
    console.error('Get fatigue assessment error:', err);
    return json({ success: false, error: 'Failed to get fatigue assessment' }, 500, corsHdrs);
  }
}

// ============================================================================
// PITCH DEFINITIONS ROUTES
// ============================================================================

// GET /api/v1/wearables/pitches - List pitch definitions
export async function handleListPitches(req: Request, env: Env, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const pitches = await wearablesService.getPitchDefinitions(env, claims.tenantId);

    return json({ success: true, data: pitches }, 200, corsHdrs);
  } catch (err) {
    console.error('List pitches error:', err);
    return json({ success: false, error: 'Failed to list pitches' }, 500, corsHdrs);
  }
}

// POST /api/v1/wearables/pitches - Create pitch definition
export async function handleCreatePitch(req: Request, env: Env, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const body = await req.json() as {
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
      lengthM?: number;
      widthM?: number;
      rotationDegrees?: number;
      isDefault?: boolean;
    };

    if (!body.name || body.cornerNwLat === undefined) {
      return json({ success: false, error: 'name and corner coordinates are required' }, 400, corsHdrs);
    }

    const pitch = await wearablesService.savePitchDefinition(env, claims.tenantId, {
      name: body.name,
      venueName: body.venueName,
      cornerNwLat: body.cornerNwLat,
      cornerNwLon: body.cornerNwLon,
      cornerNeLat: body.cornerNeLat,
      cornerNeLon: body.cornerNeLon,
      cornerSwLat: body.cornerSwLat,
      cornerSwLon: body.cornerSwLon,
      cornerSeLat: body.cornerSeLat,
      cornerSeLon: body.cornerSeLon,
      lengthM: body.lengthM || 100,
      widthM: body.widthM || 64,
      rotationDegrees: body.rotationDegrees || 0,
      isDefault: body.isDefault || false,
    });

    return json({ success: true, data: pitch }, 201, corsHdrs);
  } catch (err) {
    console.error('Create pitch error:', err);
    return json({ success: false, error: 'Failed to create pitch' }, 500, corsHdrs);
  }
}

// ============================================================================
// IMPORT ROUTES (for CSV/JSON file imports)
// ============================================================================

// POST /api/v1/wearables/import - Import data from file
export async function handleImportData(req: Request, env: Env, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const body = await req.json() as {
      playerId: string;
      fixtureId?: string;
      sessionType?: string;
      sessionDate: string;
      format: 'csv' | 'json' | 'garmin_fit' | 'strava';
      data: string | object;  // Raw CSV string or parsed JSON
    };

    if (!body.playerId || !body.sessionDate || !body.format || !body.data) {
      return json({ success: false, error: 'playerId, sessionDate, format, and data are required' }, 400, corsHdrs);
    }

    // Parse data based on format
    let samples: {
      timestamp: number;
      latitude?: number;
      longitude?: number;
      speed?: number;
      heartRate?: number;
      altitude?: number;
    }[] = [];

    if (body.format === 'json' && typeof body.data === 'object') {
      // Assume array of samples
      samples = body.data as typeof samples;
    } else if (body.format === 'csv' && typeof body.data === 'string') {
      // Parse CSV
      samples = parseCSV(body.data);
    }
    // Add support for other formats as needed

    if (samples.length === 0) {
      return json({ success: false, error: 'No valid samples found in import data' }, 400, corsHdrs);
    }

    // Create session
    const session = await wearablesService.createSession(env, claims.tenantId, {
      playerId: body.playerId,
      fixtureId: body.fixtureId,
      sessionType: (body.sessionType as 'match' | 'training') || 'training',
      sessionDate: body.sessionDate,
      entryMethod: 'import',
      importSource: body.format,
    });

    // Save GPS samples
    const gpsSamples = samples
      .filter(s => s.latitude !== undefined && s.longitude !== undefined)
      .map(s => ({
        id: crypto.randomUUID(),
        tenantId: claims.tenantId,
        sessionId: session.id,
        playerId: body.playerId,
        latitude: s.latitude!,
        longitude: s.longitude!,
        speedMs: s.speed,
        heartRate: s.heartRate,
        altitudeM: s.altitude,
        timestamp: s.timestamp,
      }));

    if (gpsSamples.length > 0) {
      await wearablesService.saveGPSSamples(env, claims.tenantId, session.id, body.playerId, gpsSamples);
    }

    // Calculate metrics
    const wearableSamples = samples.map(s => ({
      timestamp: s.timestamp,
      type: 'combined' as const,
      latitude: s.latitude,
      longitude: s.longitude,
      speed: s.speed,
      heartRate: s.heartRate,
      altitude: s.altitude,
    }));

    const metrics = await wearablesService.calculateAndSaveMetrics(
      env,
      claims.tenantId,
      session.id,
      body.playerId,
      wearableSamples,
      body.fixtureId
    );

    return json({
      success: true,
      data: {
        sessionId: session.id,
        samplesImported: samples.length,
        metrics,
      },
    }, 201, corsHdrs);
  } catch (err) {
    console.error('Import data error:', err);
    return json({ success: false, error: 'Failed to import data' }, 500, corsHdrs);
  }
}

// Simple CSV parser for GPS data
function parseCSV(csv: string): {
  timestamp: number;
  latitude?: number;
  longitude?: number;
  speed?: number;
  heartRate?: number;
  altitude?: number;
}[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) {return [];}

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const samples: ReturnType<typeof parseCSV> = [];

  // Map common header names to our fields
  const fieldMap: Record<string, string> = {
    'timestamp': 'timestamp',
    'time': 'timestamp',
    'ts': 'timestamp',
    'lat': 'latitude',
    'latitude': 'latitude',
    'lon': 'longitude',
    'lng': 'longitude',
    'longitude': 'longitude',
    'speed': 'speed',
    'velocity': 'speed',
    'hr': 'heartRate',
    'heart_rate': 'heartRate',
    'heartrate': 'heartRate',
    'alt': 'altitude',
    'altitude': 'altitude',
    'elevation': 'altitude',
  };

  const headerIndices: Record<string, number> = {};
  headers.forEach((h, i) => {
    const mapped = fieldMap[h];
    if (mapped) {headerIndices[mapped] = i;}
  });

  if (headerIndices.timestamp === undefined) {
    return [];
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const sample: ReturnType<typeof parseCSV>[0] = {
      timestamp: parseInt(values[headerIndices.timestamp]) || Date.now(),
    };

    if (headerIndices.latitude !== undefined) {
      sample.latitude = parseFloat(values[headerIndices.latitude]);
    }
    if (headerIndices.longitude !== undefined) {
      sample.longitude = parseFloat(values[headerIndices.longitude]);
    }
    if (headerIndices.speed !== undefined) {
      sample.speed = parseFloat(values[headerIndices.speed]);
    }
    if (headerIndices.heartRate !== undefined) {
      sample.heartRate = parseInt(values[headerIndices.heartRate]);
    }
    if (headerIndices.altitude !== undefined) {
      sample.altitude = parseFloat(values[headerIndices.altitude]);
    }

    if (!isNaN(sample.timestamp)) {
      samples.push(sample);
    }
  }

  return samples;
}
