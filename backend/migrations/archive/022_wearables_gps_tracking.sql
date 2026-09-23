-- Migration: GPS/Wearables Data Tracking System
-- Created: 2024-12-10
-- Description: Adds support for GPS vests, shin pads, and other wearable devices
--              with generic provider support, manual entry, and fitness metrics

-- ============================================================================
-- 1. WEARABLE DEVICES - Register devices per player
-- ============================================================================
CREATE TABLE IF NOT EXISTS wearable_devices (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    player_id TEXT NOT NULL,

    -- Device info (generic to support any provider)
    device_type TEXT NOT NULL,              -- 'gps_vest', 'gps_shin_pad', 'hr_monitor', 'smartwatch', 'other'
    provider TEXT,                          -- 'catapult', 'statsports', 'playertek', 'garmin', 'polar', 'fitbit', 'apple', 'strava', 'manual', etc
    device_name TEXT,                       -- User-friendly name e.g. "John's GPS Vest"
    device_serial TEXT,                     -- Serial number or device ID from provider

    -- Status
    is_active INTEGER DEFAULT 1,
    battery_level REAL,                     -- 0-100 percentage
    last_sync_at INTEGER,                   -- Last successful data sync
    firmware_version TEXT,

    -- Config (flexible JSON for provider-specific settings)
    config_json TEXT,                       -- e.g. {"sample_rate": 10, "hr_zones": [120, 150, 170, 185]}

    -- Timestamps
    paired_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (player_id) REFERENCES squad(id)
);

CREATE INDEX IF NOT EXISTS idx_wearable_devices_tenant ON wearable_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wearable_devices_player ON wearable_devices(tenant_id, player_id);
CREATE INDEX IF NOT EXISTS idx_wearable_devices_active ON wearable_devices(tenant_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wearable_devices_serial ON wearable_devices(tenant_id, device_serial) WHERE device_serial IS NOT NULL;

-- ============================================================================
-- 2. WEARABLE SESSIONS - Per match/training data collection sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS wearable_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    device_id TEXT,                         -- NULL for manual entry
    fixture_id TEXT,                        -- Link to match (optional)

    -- Session info
    session_type TEXT NOT NULL,             -- 'match', 'training', 'fitness_test', 'recovery', 'other'
    session_name TEXT,                      -- e.g. "vs Panthers - Away" or "Tuesday Training"
    session_date TEXT NOT NULL,             -- YYYY-MM-DD

    -- Duration
    start_time INTEGER,                     -- Unix timestamp
    end_time INTEGER,                       -- Unix timestamp
    duration_minutes INTEGER,               -- Total session duration

    -- Entry method
    entry_method TEXT NOT NULL DEFAULT 'automatic', -- 'automatic', 'manual', 'import'
    import_source TEXT,                     -- For imports: 'csv', 'json', 'garmin_fit', 'strava_api', etc

    -- Raw data storage (flexible JSON for any provider format)
    raw_data_json TEXT,                     -- Full raw data from device/import

    -- GPS Track Data (array of coordinates for map visualization)
    gps_track_json TEXT,                    -- [{"lat": 52.6189, "lon": -1.1398, "ts": 1234567890, "speed": 5.2}, ...]

    -- Status
    status TEXT DEFAULT 'complete',         -- 'recording', 'processing', 'complete', 'error'
    processing_error TEXT,

    -- Timestamps
    created_at INTEGER NOT NULL,
    updated_at INTEGER,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (player_id) REFERENCES squad(id),
    FOREIGN KEY (device_id) REFERENCES wearable_devices(id),
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
);

CREATE INDEX IF NOT EXISTS idx_wearable_sessions_tenant ON wearable_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wearable_sessions_player ON wearable_sessions(tenant_id, player_id);
CREATE INDEX IF NOT EXISTS idx_wearable_sessions_fixture ON wearable_sessions(fixture_id);
CREATE INDEX IF NOT EXISTS idx_wearable_sessions_date ON wearable_sessions(tenant_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_sessions_type ON wearable_sessions(tenant_id, session_type);

-- ============================================================================
-- 3. PLAYER FITNESS METRICS - Aggregated/calculated metrics per session
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_fitness_metrics (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    session_id TEXT NOT NULL,               -- Link to wearable_session
    fixture_id TEXT,                        -- Denormalized for quick queries
    season_id TEXT,

    -- Distance metrics (in meters)
    total_distance_m REAL,                  -- Total distance covered
    walking_distance_m REAL,                -- < 7 km/h
    jogging_distance_m REAL,                -- 7-14 km/h
    running_distance_m REAL,                -- 14-20 km/h
    high_speed_distance_m REAL,             -- 20-25 km/h
    sprint_distance_m REAL,                 -- > 25 km/h

    -- Speed metrics (m/s or km/h based on preference)
    top_speed_ms REAL,                      -- Peak speed in m/s
    top_speed_kmh REAL,                     -- Peak speed in km/h
    avg_speed_ms REAL,                      -- Average speed
    avg_speed_kmh REAL,

    -- Sprint metrics
    sprint_count INTEGER,                   -- Number of sprints (>25 km/h)
    sprint_total_distance_m REAL,           -- Combined sprint distance
    longest_sprint_m REAL,                  -- Longest single sprint
    avg_sprint_distance_m REAL,

    -- Acceleration/deceleration
    acceleration_count INTEGER,             -- High accelerations (>3 m/s²)
    deceleration_count INTEGER,             -- High decelerations (>3 m/s²)
    max_acceleration_ms2 REAL,              -- Peak acceleration
    max_deceleration_ms2 REAL,              -- Peak deceleration

    -- Heart rate metrics
    max_heart_rate INTEGER,                 -- bpm
    avg_heart_rate INTEGER,                 -- bpm
    min_heart_rate INTEGER,                 -- bpm
    resting_heart_rate INTEGER,             -- Pre-session resting HR

    -- HR Zone distribution (minutes in each zone)
    hr_zone1_minutes REAL,                  -- Zone 1: 50-60% max HR (very light)
    hr_zone2_minutes REAL,                  -- Zone 2: 60-70% max HR (light)
    hr_zone3_minutes REAL,                  -- Zone 3: 70-80% max HR (moderate)
    hr_zone4_minutes REAL,                  -- Zone 4: 80-90% max HR (hard)
    hr_zone5_minutes REAL,                  -- Zone 5: 90-100% max HR (max effort)

    -- Workload & recovery
    player_load REAL,                       -- Arbitrary workload units (provider-specific)
    training_impulse REAL,                  -- TRIMP score
    calories_burned INTEGER,

    -- Recovery metrics
    hr_recovery_1min INTEGER,               -- HR drop 1 min post-session
    hr_recovery_2min INTEGER,               -- HR drop 2 min post-session

    -- Positional data
    time_in_own_half_pct REAL,              -- % time in defensive half
    time_in_opp_half_pct REAL,              -- % time in attacking half
    avg_position_x REAL,                    -- Average X position on pitch
    avg_position_y REAL,                    -- Average Y position on pitch

    -- Heat map data (grid-based position frequency)
    heatmap_json TEXT,                      -- Grid data for heat map visualization

    -- Manual entry fields (for when no device used)
    perceived_exertion INTEGER,             -- RPE 1-10 scale
    fatigue_level INTEGER,                  -- 1-10 scale
    muscle_soreness INTEGER,                -- 1-10 scale
    sleep_quality INTEGER,                  -- 1-10 scale (night before)
    sleep_hours REAL,                       -- Hours slept (night before)
    hydration_level INTEGER,                -- 1-10 scale
    notes TEXT,                             -- Coach/player notes

    -- Calculated risk scores
    injury_risk_score REAL,                 -- 0-100 (higher = more risk)
    fatigue_score REAL,                     -- 0-100 (higher = more fatigued)
    readiness_score REAL,                   -- 0-100 (higher = more ready)

    -- Timestamps
    captured_at INTEGER NOT NULL,           -- When metrics were calculated
    created_at INTEGER NOT NULL,
    updated_at INTEGER,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (player_id) REFERENCES squad(id),
    FOREIGN KEY (session_id) REFERENCES wearable_sessions(id),
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id),
    FOREIGN KEY (season_id) REFERENCES seasons(id)
);

CREATE INDEX IF NOT EXISTS idx_fitness_metrics_tenant ON player_fitness_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_player ON player_fitness_metrics(tenant_id, player_id);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_session ON player_fitness_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_fixture ON player_fitness_metrics(fixture_id);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_season ON player_fitness_metrics(tenant_id, season_id);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_date ON player_fitness_metrics(tenant_id, captured_at DESC);

-- ============================================================================
-- 4. GPS SAMPLES - Raw GPS data points for detailed track visualization
-- ============================================================================
CREATE TABLE IF NOT EXISTS gps_samples (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    player_id TEXT NOT NULL,

    -- Position
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    altitude_m REAL,
    accuracy_m REAL,                        -- GPS accuracy in meters

    -- Motion
    speed_ms REAL,                          -- Instantaneous speed
    acceleration_ms2 REAL,                  -- Instantaneous acceleration
    bearing REAL,                           -- Direction of movement (degrees)

    -- Heart rate (if synchronized)
    heart_rate INTEGER,

    -- Timestamp
    timestamp INTEGER NOT NULL,             -- Unix timestamp (milliseconds for precision)

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (session_id) REFERENCES wearable_sessions(id),
    FOREIGN KEY (player_id) REFERENCES squad(id)
);

CREATE INDEX IF NOT EXISTS idx_gps_samples_session ON gps_samples(session_id);
CREATE INDEX IF NOT EXISTS idx_gps_samples_player_time ON gps_samples(tenant_id, player_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_gps_samples_timestamp ON gps_samples(session_id, timestamp);

-- ============================================================================
-- 5. PROVIDER INTEGRATIONS - OAuth/API credentials per tenant (encrypted)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wearable_integrations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,

    provider TEXT NOT NULL,                 -- 'garmin', 'strava', 'polar', 'catapult', etc
    provider_account_id TEXT,               -- Account ID with provider

    -- OAuth tokens (encrypted in application layer)
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at INTEGER,

    -- API keys (for providers that use API keys)
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,

    -- Webhook config
    webhook_url TEXT,
    webhook_secret TEXT,

    -- Status
    is_active INTEGER DEFAULT 1,
    last_sync_at INTEGER,
    sync_error TEXT,

    -- Timestamps
    connected_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_wearable_integrations_tenant ON wearable_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wearable_integrations_provider ON wearable_integrations(provider);

-- ============================================================================
-- 6. PITCH DEFINITIONS - For accurate heat map positioning
-- ============================================================================
CREATE TABLE IF NOT EXISTS pitch_definitions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,

    name TEXT NOT NULL,                     -- "Home Ground", "Training Field A"
    venue_name TEXT,

    -- Corner coordinates (GPS)
    corner_nw_lat REAL NOT NULL,
    corner_nw_lon REAL NOT NULL,
    corner_ne_lat REAL NOT NULL,
    corner_ne_lon REAL NOT NULL,
    corner_sw_lat REAL NOT NULL,
    corner_sw_lon REAL NOT NULL,
    corner_se_lat REAL NOT NULL,
    corner_se_lon REAL NOT NULL,

    -- Pitch dimensions (meters)
    length_m REAL DEFAULT 100,
    width_m REAL DEFAULT 64,

    -- Rotation angle from north (degrees)
    rotation_degrees REAL DEFAULT 0,

    is_default INTEGER DEFAULT 0,

    created_at INTEGER NOT NULL,
    updated_at INTEGER,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_pitch_definitions_tenant ON pitch_definitions(tenant_id);
