-- 0002_align_schema.sql
-- Brings the database in line with what the code actually uses.
-- Production had most migrations after 016 marked as applied without being run,
-- so ~50 tables the API reads/writes did not exist. Additive only, except:
--   * photos / results: rebuilt in the shape the code expects (both were empty in prod).
--   * squad is the single roster table (code previously also referenced players / squad_players).

-- ---- New tables
CREATE TABLE IF NOT EXISTS squad (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    number INTEGER,
    position TEXT,
    role TEXT DEFAULT 'Player',
    photo_url TEXT,
    bio TEXT,
    dob TEXT,
    joined_at INTEGER,
    created_at INTEGER,
    signed_date TEXT,
    previous_club TEXT,
    signing_notes TEXT,
    global_profile_id TEXT,
    login_code TEXT,
    parent_email TEXT,
    headshot_url TEXT,
    headshot_uploaded_at INTEGER,
    contact1_relationship TEXT, contact1_name TEXT, contact1_phone TEXT, contact1_email TEXT,
    contact2_relationship TEXT, contact2_name TEXT, contact2_phone TEXT, contact2_email TEXT,
    contact3_relationship TEXT, contact3_name TEXT, contact3_phone TEXT, contact3_email TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  event_date DATETIME NOT NULL, -- 'date' in frontend
  cover_photo_url TEXT,
  type TEXT NOT NULL, -- 'match', 'training', 'social', 'throwback'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS auth_user_players (
  user_id TEXT NOT NULL,       -- FK to auth_users.id
  player_id TEXT NOT NULL,     -- FK to players.id
  tenant_id TEXT NOT NULL,     -- Denormalized for speed
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, player_id),
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES squad(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS badge_library (
  id TEXT PRIMARY KEY,
  team_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,  -- "thurmaston-magpies-fc"
  badge_url TEXT NOT NULL,               -- R2 URL or external
  verified INTEGER DEFAULT 0,            -- 1 = human confirmed
  contributed_by TEXT,                   -- tenant_id who first added
  usage_count INTEGER DEFAULT 1,         -- how many tenants use this
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS billing_credits (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    tenant_id TEXT,  -- Original team that was absorbed
    amount_gbp INTEGER NOT NULL,  -- Credit amount in pence
    reason TEXT NOT NULL,
    applied_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS billing_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    stripe_event_id TEXT,
    amount_gbp INTEGER,
    currency TEXT DEFAULT 'gbp',
    description TEXT,
    metadata TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS club_documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,                -- "Code of Conduct"
    description TEXT,
    content TEXT,                       -- Markdown/HTML content
    file_url TEXT,                      -- Or uploaded PDF URL
    requires_signature INTEGER DEFAULT 0,
    required_for_registration INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS club_products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_gbp INTEGER NOT NULL,
    cost_gbp INTEGER DEFAULT 0,         -- Club's cost (for their records)
    category TEXT,
    image_url TEXT,
    stock_quantity INTEGER DEFAULT -1,  -- -1 = unlimited
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS content_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  reporter_id TEXT,  -- NULL for anonymous reports
  content_type TEXT NOT NULL CHECK(content_type IN ('post', 'comment', 'message')),
  content_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(reason IN ('spam', 'harassment', 'hate_speech', 'violence', 'inappropriate', 'misinformation', 'other')),
  details TEXT,  -- Optional additional context from reporter
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  admin_notes TEXT,  -- Admin comments on the report
  action_taken TEXT,  -- What action was taken (e.g., 'removed', 'warned_user', 'no_action')
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES auth_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK(platform IN ('ios', 'android', 'web')),
    created_at INTEGER NOT NULL,
    last_active INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discount_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,                 -- "Coach Child Discount"
    description TEXT,
    discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed', 'free')),
    discount_value INTEGER,             -- 50 = 50% or 500 = £5.00
    applies_to TEXT NOT NULL,           -- 'coach_children', 'volunteer_children', 'siblings', 'all'
    max_children INTEGER,               -- Max children discount applies to (null = unlimited)
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discussion_group_types (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    group_type TEXT NOT NULL CHECK (group_type IN ('main', 'coaches', 'players')),
    discussion_category_id TEXT, -- Links to discussion_categories
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, group_type)
);

CREATE TABLE IF NOT EXISTS friendly_matches (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  requester_tenant_id TEXT NOT NULL,  -- Team requesting to play
  requester_team_name TEXT NOT NULL,
  host_tenant_id TEXT NOT NULL,       -- Team who posted the request
  proposed_date TEXT,
  proposed_venue TEXT,
  proposed_kickoff TEXT,              -- e.g. "14:00"
  message TEXT,
  status TEXT DEFAULT 'pending',      -- 'pending', 'accepted', 'declined', 'cancelled'
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (request_id) REFERENCES friendly_requests(id)
);

CREATE TABLE IF NOT EXISTS friendly_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  preferred_dates TEXT,           -- JSON array of date options
  location_pref TEXT DEFAULT 'any', -- 'home', 'away', 'neutral', 'any'
  age_group TEXT,                 -- 'U11', 'U14', 'Adult', etc.
  skill_level TEXT,               -- 'recreational', 'competitive', 'semi-pro'
  kit_colors TEXT,                -- Primary kit colors e.g. "red/white"
  max_travel_miles INTEGER,       -- Max distance willing to travel
  pitch_type TEXT,                -- 'grass', '3g', '4g', 'any'
  notes TEXT,
  contact_info TEXT,              -- Optional contact details
  status TEXT DEFAULT 'open',     -- 'open', 'matched', 'expired', 'cancelled'
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

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

CREATE TABLE IF NOT EXISTS login_codes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    code TEXT NOT NULL,
    code_type TEXT NOT NULL CHECK (code_type IN ('player', 'coach', 'fan')),
    player_id TEXT, -- Links to player for player codes, NULL for coach/fan
    label TEXT, -- Display name (e.g., "Coach Sarah" for coach codes)
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(code)
);

CREATE TABLE IF NOT EXISTS match_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  fixture_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'goal', 'assist', 'yellow_card', 'red_card', 'motm'
  minute INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS member_payments (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    player_id TEXT,                     -- Which player this is for (optional)
    payer_name TEXT,                    -- Name of person paying
    payer_email TEXT NOT NULL,          -- Email of payer
    amount_requested INTEGER NOT NULL,  -- Original amount in pence
    amount_paid INTEGER NOT NULL,       -- Amount paid (may differ if fees added)
    platform_fee INTEGER NOT NULL,      -- Your cut in pence
    stripe_fee INTEGER NOT NULL,        -- Stripe's actual fee in pence
    net_to_club INTEGER NOT NULL,       -- What club receives after all fees
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
    paid_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (request_id) REFERENCES payment_requests(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS motm_sessions (
    match_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT DEFAULT 'draft', -- draft, active, closed
    voting_start_at DATETIME,
    voting_end_at DATETIME,
    auto_post BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Note: We rely on application-level integrity for match_id 
    -- as it could map to fixtures or team_results depending on maturity
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS opponent_teams (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  badge_library_id TEXT,                  -- FK to shared library (if using shared)
  custom_badge_url TEXT,                  -- Override with tenant's own upload
  pending_badge_url TEXT,                 -- Google image result awaiting approval
  status TEXT DEFAULT 'pending',          -- 'pending', 'approved', 'custom'
  first_seen_at INTEGER,                  -- When we first played them
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()), reference_badge_url TEXT,
  UNIQUE(tenant_id, normalized_name),
  FOREIGN KEY (badge_library_id) REFERENCES badge_library(id)
);

CREATE TABLE IF NOT EXISTS organization_invites (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,  -- The team being invited
    invited_by_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'expired')),
    verification_code TEXT,  -- 6-digit code sent to team admin
    expires_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    responded_at INTEGER,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS organization_members (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, user_email)
);

CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    plan TEXT NOT NULL CHECK(plan IN ('essentials', 'team', 'club', 'club_pro')),
    status TEXT NOT NULL DEFAULT 'trial' CHECK(status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
    billing_interval TEXT DEFAULT 'monthly' CHECK(billing_interval IN ('monthly', 'annual')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'trialing',
    max_teams INTEGER DEFAULT 1,
    trial_ends_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
, pass_fees_to_payer INTEGER DEFAULT 0, stripe_connected_account_id TEXT);

CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,                -- "March Training Subs", "Match Fee vs Tigers"
    description TEXT,                   -- Optional details
    amount_gbp INTEGER NOT NULL,        -- Amount in pence (e.g., 2500 = £25.00)
    due_date INTEGER,                   -- Unix timestamp, optional
    applies_to TEXT DEFAULT 'all',      -- 'all', 'players', or comma-separated player IDs
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed', 'cancelled')),
    reminder_count INTEGER DEFAULT 0,
    created_by TEXT,                    -- Admin email who created
    created_at INTEGER DEFAULT (unixepoch()),
    closed_at INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS plan_limits (
    plan TEXT PRIMARY KEY,
    max_teams INTEGER NOT NULL,
    monthly_price_gbp INTEGER NOT NULL,  -- in pence
    annual_price_gbp INTEGER NOT NULL,   -- in pence (20% discount)
    features TEXT NOT NULL  -- JSON array of feature flags
);

CREATE TABLE IF NOT EXISTS platform_revenue (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    revenue_type TEXT NOT NULL CHECK(revenue_type IN ('subscription', 'dues_fee', 'shop_commission', 'printify_margin')),
    amount_gbp INTEGER NOT NULL,        -- Amount in pence
    source_id TEXT,                     -- Payment/order ID reference
    description TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS player_agreements (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    signed_by_name TEXT NOT NULL,       -- "John Smith"
    signed_by_email TEXT NOT NULL,
    relationship TEXT DEFAULT 'parent', -- 'parent', 'guardian', 'self'
    signature_data TEXT,                -- Base64 signature image OR typed name
    signature_type TEXT DEFAULT 'drawn' CHECK(signature_type IN ('drawn', 'typed')),
    ip_address TEXT,
    user_agent TEXT,
    signed_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (document_id) REFERENCES club_documents(id),
    FOREIGN KEY (player_id) REFERENCES squad(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS player_global_profiles (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS player_images (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL, -- 'headshot' | 'action'
  uploaded_at INTEGER NOT NULL,
  uploaded_by TEXT,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS player_registrations (
    id TEXT PRIMARY KEY,
    fee_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    paid_amount INTEGER,
    stripe_payment_id TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'waived')),
    paid_at INTEGER,
    FOREIGN KEY (fee_id) REFERENCES registration_fees(id),
    FOREIGN KEY (player_id) REFERENCES squad(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_subscriptions (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'cancelled', 'pending')),
    discount_id TEXT,                   -- Applied discount
    next_billing_date INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    cancelled_at INTEGER,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    FOREIGN KEY (player_id) REFERENCES squad(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_transfers (
    id TEXT PRIMARY KEY,
    global_profile_id TEXT NOT NULL,
    from_tenant_id TEXT NOT NULL,
    from_player_id TEXT NOT NULL,
    to_tenant_id TEXT,
    to_player_id TEXT,
    transfer_code TEXT UNIQUE NOT NULL,
    stats_snapshot TEXT NOT NULL,
    player_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    redeemed_at INTEGER,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (global_profile_id) REFERENCES player_global_profiles(id),
    FOREIGN KEY (from_tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS printify_templates (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,                     -- NULL = global/default template
    printify_product_id TEXT,           -- Printify's product ID
    name TEXT NOT NULL,                 -- "Club Hoodie"
    category TEXT,                      -- "clothing", "accessories", "drinkware"
    base_price_gbp INTEGER NOT NULL,    -- Our selling price (pence)
    printify_cost_gbp INTEGER NOT NULL, -- What Printify charges us (pence)
    image_url TEXT,
    supports_name INTEGER DEFAULT 1,
    supports_number INTEGER DEFAULT 1,
    supports_phrase INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch())
, blueprint_id INTEGER, print_provider_id INTEGER, variants_json TEXT);

CREATE TABLE IF NOT EXISTS product_personalizations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,           -- Printify or custom product ID
    personalization_type TEXT NOT NULL CHECK(personalization_type IN ('name', 'number', 'phrase', 'custom_text')),
    position TEXT,                      -- 'front', 'back', 'sleeve'
    max_characters INTEGER,
    price_addon_gbp INTEGER DEFAULT 0,  -- Extra cost for personalization (pence)
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registration_fees (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,                 -- "Season Registration 2024-25"
    description TEXT,
    amount_gbp INTEGER NOT NULL,        -- Amount in pence
    season TEXT,                        -- "2024-25"
    is_mandatory INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    notification_type TEXT NOT NULL CHECK(notification_type IN ('match_reminder', 'motm_voting', 'custom')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data TEXT, -- JSON string
    scheduled_for INTEGER NOT NULL,
    sent_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS season_awards (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    award_type TEXT NOT NULL CHECK(award_type IN (
        'player_of_season',
        'top_scorer',
        'most_assists',
        'players_player',
        'most_improved',
        'managers_player',
        'golden_glove',
        'custom'
    )),
    award_name TEXT,           -- Custom award name (null for standard types)
    player_id TEXT NOT NULL,
    notes TEXT,                -- Optional notes about the award
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    FOREIGN KEY (player_id) REFERENCES squad(id)
);

CREATE TABLE IF NOT EXISTS season_scraper_configs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    fa_team_page_url TEXT,      -- FA Full-Time team page URL
    fa_snippet_url TEXT,         -- FA embed snippet URL (optional)
    team_name TEXT NOT NULL,     -- Team name for matching in scraped data
    last_scraped_at INTEGER,     -- Timestamp of last successful scrape
    last_scrape_result TEXT,     -- JSON: {added: n, updated: n, errors: []}
    is_active INTEGER DEFAULT 1, -- Enable/disable without deleting
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, season_id)
);

CREATE TABLE IF NOT EXISTS season_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    snapshot_type TEXT NOT NULL CHECK(snapshot_type IN (
        'team_record',      -- W/D/L, goals, points
        'player_stats',     -- All player stats JSON array
        'league_position',  -- Final league position
        'top_performers'    -- Top scorer, assists, MOTM leaders
    )),
    data TEXT NOT NULL,            -- JSON blob of frozen stats
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    UNIQUE(tenant_id, season_id, snapshot_type)
);

CREATE TABLE IF NOT EXISTS shop_commission_rates (
    plan TEXT PRIMARY KEY,
    commission_percent INTEGER NOT NULL  -- e.g., 10 = 10%
);

CREATE TABLE IF NOT EXISTS shop_orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    player_id TEXT,                     -- Who the personalization is for
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    items_json TEXT NOT NULL,           -- JSON array of items with personalization
    subtotal_gbp INTEGER NOT NULL,
    platform_fee_gbp INTEGER NOT NULL,  -- Our commission
    total_gbp INTEGER NOT NULL,
    stripe_payment_id TEXT,
    printify_order_id TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    created_at INTEGER DEFAULT (unixepoch()), shipping_address_json TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS shop_phrases (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    phrase TEXT NOT NULL,               -- "Believe in the Dream"
    phrase_type TEXT DEFAULT 'slogan' CHECK(phrase_type IN ('slogan', 'funny', 'season', 'custom')),
    is_default INTEGER DEFAULT 0,       -- Whether auto-applied to products
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS staff_children (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    staff_user_id TEXT NOT NULL,        -- User ID of coach/volunteer
    staff_email TEXT NOT NULL,
    player_id TEXT NOT NULL,
    relationship TEXT DEFAULT 'parent' CHECK(relationship IN ('parent', 'guardian', 'sibling')),
    verified INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (player_id) REFERENCES squad(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscription_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    old_plan TEXT,
    new_plan TEXT,
    old_status TEXT,
    new_status TEXT,
    reason TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,                 -- "Monthly Training Subs"
    description TEXT,
    amount_gbp INTEGER NOT NULL,        -- Amount in pence
    frequency TEXT DEFAULT 'monthly' CHECK(frequency IN ('monthly', 'termly', 'annual')),
    billing_day INTEGER DEFAULT 1,      -- Day of month to charge (1-28)
    start_date INTEGER,                 -- Unix timestamp
    end_date INTEGER,                   -- Unix timestamp (null = ongoing)
    applies_to TEXT DEFAULT 'all',      -- 'all' or comma-separated player types
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'cancelled')),
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    code_id TEXT, -- Which code was used to login
    email TEXT, -- For fans who login with email
    role TEXT NOT NULL CHECK (role IN ('manager', 'coach', 'parent', 'player', 'fan')),
    player_id TEXT, -- Which player this session is for (if applicable)
    display_name TEXT,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (code_id) REFERENCES login_codes(id),
    FOREIGN KEY (player_id) REFERENCES squad(id)
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  match_id TEXT, -- Optional link to a match
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  youtube_url TEXT, -- Optional external link
  duration INTEGER DEFAULT 0, -- Duration in seconds
  type TEXT NOT NULL, -- 'goal', 'save', 'skill', 'highlights', 'full-match'
  views INTEGER DEFAULT 0,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (match_id) REFERENCES fixtures(id)
);

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

-- ---- Tables rebuilt (empty in production)
DROP TABLE IF EXISTS photos;
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  album_id TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_by TEXT,
  caption TEXT,
  tags TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);
DROP TABLE IF EXISTS results;
CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  match_date TEXT NOT NULL,
  opponent TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  venue TEXT,
  competition TEXT,
  scorers TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, match_date, opponent)
);

-- ---- New columns on existing tables
ALTER TABLE league_standings ADD COLUMN season_id TEXT;
ALTER TABLE team_results ADD COLUMN season_id TEXT;
ALTER TABLE tenants ADD COLUMN fan_code TEXT;
ALTER TABLE tenants ADD COLUMN subscription_status TEXT DEFAULT 'trialing';
ALTER TABLE tenants ADD COLUMN organization_id TEXT;
ALTER TABLE tenants ADD COLUMN pass_fees_to_payer INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN stripe_connected_account_id TEXT;
ALTER TABLE feed_posts ADD COLUMN post_type TEXT DEFAULT 'general';
ALTER TABLE feed_posts ADD COLUMN related_player_id TEXT;
ALTER TABLE fixtures ADD COLUMN season_id TEXT;
ALTER TABLE seasons ADD COLUMN archived_at INTEGER;
ALTER TABLE seasons ADD COLUMN notes TEXT;
ALTER TABLE seasons ADD COLUMN competition TEXT;
ALTER TABLE seasons ADD COLUMN age_group TEXT;
ALTER TABLE player_seasons ADD COLUMN departed_date TEXT;
ALTER TABLE player_seasons ADD COLUMN departure_reason TEXT;
ALTER TABLE discussions ADD COLUMN related_entity_type TEXT;
ALTER TABLE discussions ADD COLUMN related_entity_id TEXT;

-- ---- Indexes
CREATE INDEX IF NOT EXISTS idx_albums_date ON albums(event_date);
CREATE INDEX IF NOT EXISTS idx_albums_tenant ON albums(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aup_player ON auth_user_players(player_id);
CREATE INDEX IF NOT EXISTS idx_aup_user ON auth_user_players(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_library_normalized ON badge_library(normalized_name);
CREATE INDEX IF NOT EXISTS idx_badge_library_verified ON badge_library(verified);
CREATE INDEX IF NOT EXISTS idx_billing_events_tenant ON billing_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_club_documents_tenant ON club_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_club_products_tenant ON club_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON discussion_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON discussion_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_content 
ON content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter 
ON content_reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_tenant_status 
ON content_reports(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(token);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created ON discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_pinned ON discussions(pinned);
CREATE INDEX IF NOT EXISTS idx_drills_category ON training_drills(category);
CREATE INDEX IF NOT EXISTS idx_feed_posts_player ON feed_posts(related_player_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON feed_posts(tenant_id, post_type);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_date ON player_fitness_metrics(tenant_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_fixture ON player_fitness_metrics(fixture_id);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_player ON player_fitness_metrics(tenant_id, player_id);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_season ON player_fitness_metrics(tenant_id, season_id);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_session ON player_fitness_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_tenant ON player_fitness_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_season ON fixtures(season_id);
CREATE INDEX IF NOT EXISTS idx_friendly_matches_host ON friendly_matches(host_tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_friendly_matches_request ON friendly_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_friendly_matches_requester ON friendly_matches(requester_tenant_id);
CREATE INDEX IF NOT EXISTS idx_friendly_requests_age ON friendly_requests(age_group, status);
CREATE INDEX IF NOT EXISTS idx_friendly_requests_status ON friendly_requests(status);
CREATE INDEX IF NOT EXISTS idx_friendly_requests_tenant ON friendly_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fun_stats_tenant ON fun_stats_cache(tenant_id, season_id);
CREATE INDEX IF NOT EXISTS idx_gps_samples_player_time ON gps_samples(tenant_id, player_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_gps_samples_session ON gps_samples(session_id);
CREATE INDEX IF NOT EXISTS idx_gps_samples_timestamp ON gps_samples(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_lms_entries_status ON lms_entries(status);
CREATE INDEX IF NOT EXISTS idx_lms_entries_user ON lms_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_lms_games_status ON lms_games(status);
CREATE INDEX IF NOT EXISTS idx_lms_predictions_entry ON lms_predictions(entry_id);
CREATE INDEX IF NOT EXISTS idx_lms_rounds_status ON lms_rounds(status);
CREATE INDEX IF NOT EXISTS idx_login_codes_code ON login_codes(code);
CREATE INDEX IF NOT EXISTS idx_login_codes_player ON login_codes(player_id);
CREATE INDEX IF NOT EXISTS idx_login_codes_tenant ON login_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_match_events_fixture ON match_events (tenant_id, fixture_id);
CREATE INDEX IF NOT EXISTS idx_match_events_player ON match_events (tenant_id, player_id);
CREATE INDEX IF NOT EXISTS idx_member_payments_payer ON member_payments(payer_email);
CREATE INDEX IF NOT EXISTS idx_member_payments_request ON member_payments(request_id);
CREATE INDEX IF NOT EXISTS idx_member_payments_status ON member_payments(status);
CREATE INDEX IF NOT EXISTS idx_member_payments_tenant ON member_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_motm_sessions_status ON motm_sessions(status);
CREATE INDEX IF NOT EXISTS idx_motm_sessions_tenant ON motm_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opponent_teams_status ON opponent_teams(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_opponent_teams_tenant ON opponent_teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_status ON organization_invites(status);
CREATE INDEX IF NOT EXISTS idx_org_invites_tenant ON organization_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON organization_members(user_email);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_email);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_tenant ON payment_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pitch_definitions_tenant ON pitch_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plan_drills_order ON training_plan_drills(plan_id, order_index);
CREATE INDEX IF NOT EXISTS idx_plan_drills_plan ON training_plan_drills(plan_id);
CREATE INDEX IF NOT EXISTS idx_plans_date ON training_plans(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_date ON platform_revenue(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_tenant ON platform_revenue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_type ON platform_revenue(revenue_type);
CREATE INDEX IF NOT EXISTS idx_player_agreements_document ON player_agreements(document_id);
CREATE INDEX IF NOT EXISTS idx_player_agreements_player ON player_agreements(player_id);
CREATE INDEX IF NOT EXISTS idx_player_images_player ON player_images(tenant_id, player_id);
CREATE INDEX IF NOT EXISTS idx_player_images_tenant ON player_images(tenant_id);
CREATE INDEX IF NOT EXISTS idx_player_subscriptions_player ON player_subscriptions(player_id);
CREATE INDEX IF NOT EXISTS idx_promo_lifetime ON promo_codes(lifetime);
CREATE INDEX IF NOT EXISTS idx_results_season ON team_results(season_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_tenant ON scheduled_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user ON scheduled_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_scraper_configs_active ON season_scraper_configs(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_scraper_configs_season ON season_scraper_configs(season_id);
CREATE INDEX IF NOT EXISTS idx_scraper_configs_tenant ON season_scraper_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_season_awards_player ON season_awards(player_id);
CREATE INDEX IF NOT EXISTS idx_season_awards_season ON season_awards(season_id);
CREATE INDEX IF NOT EXISTS idx_season_awards_tenant ON season_awards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_season_snapshots_season ON season_snapshots(season_id);
CREATE INDEX IF NOT EXISTS idx_season_snapshots_tenant ON season_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);
CREATE INDEX IF NOT EXISTS idx_shop_orders_tenant ON shop_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shop_phrases_tenant ON shop_phrases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_squad_global_profile ON squad(global_profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_squad_login_code ON squad(login_code) WHERE login_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_squad_signed_date ON squad(tenant_id, signed_date);
CREATE INDEX IF NOT EXISTS idx_squad_tenant ON squad(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_children_player ON staff_children(player_id);
CREATE INDEX IF NOT EXISTS idx_staff_children_staff ON staff_children(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_standings_season ON league_standings(season_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tenant ON subscription_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_billing_tier ON tenants(billing_tier);
CREATE INDEX IF NOT EXISTS idx_tenants_organization ON tenants(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenants_provision_state ON tenants(provision_state);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_transfers_code ON player_transfers(transfer_code);
CREATE INDEX IF NOT EXISTS idx_transfers_global_profile ON player_transfers(global_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant ON user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_videos_match ON videos(match_id);
CREATE INDEX IF NOT EXISTS idx_videos_tenant ON videos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_videos_type ON videos(type);
CREATE INDEX IF NOT EXISTS idx_wearable_devices_active ON wearable_devices(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_wearable_devices_player ON wearable_devices(tenant_id, player_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wearable_devices_serial ON wearable_devices(tenant_id, device_serial) WHERE device_serial IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wearable_devices_tenant ON wearable_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wearable_integrations_provider ON wearable_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_wearable_integrations_tenant ON wearable_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wearable_sessions_date ON wearable_sessions(tenant_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_sessions_fixture ON wearable_sessions(fixture_id);
CREATE INDEX IF NOT EXISTS idx_wearable_sessions_player ON wearable_sessions(tenant_id, player_id);
CREATE INDEX IF NOT EXISTS idx_wearable_sessions_tenant ON wearable_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wearable_sessions_type ON wearable_sessions(tenant_id, session_type);
CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_tenant ON photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_results_tenant_date ON results(tenant_id, match_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_squad_login_code ON squad(login_code) WHERE login_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_squad_tenant ON squad(tenant_id);
