PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_date TEXT NOT NULL,
  opponent TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  venue TEXT,
  competition TEXT,
  scorers TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_date, opponent)
);
CREATE TABLE fixture_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  fa_website_url TEXT,

  -- FA provides different snippet codes for each
  fa_snippet_fixtures_url TEXT,
  fa_snippet_results_url TEXT,
  fa_snippet_table_url TEXT,
  fa_snippet_team_fixtures_url TEXT,

  sync_enabled INTEGER DEFAULT 1,
  sync_interval_minutes INTEGER DEFAULT 5,

  -- Calendar integration
  calendar_id TEXT,
  calendar_enabled INTEGER DEFAULT 0,

  -- Email integration
  gmail_search_query TEXT,
  gmail_label TEXT,
  email_sync_enabled INTEGER DEFAULT 1,

  -- Match day intelligent scheduling
  match_day_boost_enabled INTEGER DEFAULT 1,
  match_day_boost_interval_minutes INTEGER DEFAULT 1, -- Check every minute during matches
  typical_kick_off_time TEXT DEFAULT '14:00', -- Typical match start time

  -- Game format configuration (for calculating accurate boost mode timing)
  age_group TEXT DEFAULT 'U16', -- e.g., U16, U14, U12, U10
  game_size TEXT DEFAULT '11v11', -- e.g., 11v11, 9v9, 7v7, 5v5
  half_length INTEGER DEFAULT 40, -- Minutes per half (e.g., 40, 30, 25, 20)
  quarter_length INTEGER, -- Minutes per quarter (for younger age groups that play quarters)

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE league_standings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  competition TEXT NOT NULL,
  team_name TEXT NOT NULL,

  -- Standard FA stats (from website)
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,

  -- Calculated stats (from our results)
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,

  -- Metadata
  position INTEGER,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, competition, team_name)
);
CREATE TABLE league_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  competition TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  standings_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, competition, snapshot_date)
);
CREATE TABLE team_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  match_date TEXT NOT NULL,
  competition TEXT NOT NULL,

  -- Match details
  opponent TEXT NOT NULL,
  venue TEXT NOT NULL,
  our_score INTEGER NOT NULL,
  their_score INTEGER NOT NULL,

  -- Calculated
  result TEXT NOT NULL, -- 'win', 'draw', 'loss'
  points INTEGER NOT NULL, -- 3, 1, 0

  -- Data source tracking
  source TEXT, -- 'website', 'snippet', 'email', 'manual'
  verified INTEGER DEFAULT 0, -- 1 if confirmed accurate

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, match_date, opponent)
);
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE live_updates (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  minute INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('goal', 'card', 'subs', 'info')),
  text TEXT NOT NULL,
  scorer TEXT,
  assist TEXT,
  card TEXT CHECK(card IN ('yellow', 'red', 'sinbin')),
  player TEXT,
  score_so_far TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES "fixtures_old"(id) ON DELETE CASCADE
);
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,  
  slug TEXT NOT NULL UNIQUE,  
  name TEXT NOT NULL,  
  email TEXT NOT NULL,  
  plan TEXT NOT NULL CHECK(plan IN ('starter', 'pro')),  
  status TEXT NOT NULL DEFAULT 'trial' CHECK(status IN ('trial', 'active', 'suspended', 'cancelled')),
  comped INTEGER NOT NULL DEFAULT 0,  
  stripe_customer_id TEXT,  
  stripe_subscription_id TEXT,  
  trial_ends_at INTEGER,  
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
, route_ready INTEGER DEFAULT 0, owner_email_sent_at INTEGER, provisioned_at INTEGER, provision_state TEXT DEFAULT 'pending', provision_reason TEXT, provision_updated_at TEXT, billing_tier TEXT DEFAULT 'standard', promo_code_used TEXT);
CREATE TABLE tenant_brand (
  tenant_id TEXT PRIMARY KEY,  
  primary_color TEXT NOT NULL DEFAULT '#FFD700',  
  secondary_color TEXT NOT NULL DEFAULT '#000000',  
  badge_url TEXT,  
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE TABLE usage_counters (
  id TEXT PRIMARY KEY,  
  tenant_id TEXT NOT NULL,
  month TEXT NOT NULL,  
  action_count INTEGER NOT NULL DEFAULT 0,  
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, month)  
);
CREATE TABLE promo_codes (
  id TEXT PRIMARY KEY,  
  code TEXT NOT NULL UNIQUE,  
  discount_percent INTEGER NOT NULL CHECK(discount_percent >= 0 AND discount_percent <= 100),
  max_uses INTEGER,  
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_until INTEGER,  
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
, active INTEGER NOT NULL DEFAULT 1, tenant_slug_whitelist TEXT, starts_at TEXT, plan TEXT, lifetime INTEGER DEFAULT 0, notes TEXT);
CREATE TABLE promo_redemptions (
  id TEXT PRIMARY KEY,  
  tenant_id TEXT NOT NULL,
  promo_code_id TEXT NOT NULL,
  redeemed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, promo_code_id)  
);
CREATE TABLE make_connections (
  id TEXT PRIMARY KEY,  
  tenant_id TEXT NOT NULL UNIQUE,  
  webhook_url TEXT NOT NULL,  
  webhook_secret TEXT NOT NULL,  
  scenario_id TEXT,  
  last_synced_at INTEGER,  
  created_at INTEGER NOT NULL DEFAULT (unixepoch()), validated_at INTEGER, updated_at INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE TABLE pro_automation (
  id TEXT PRIMARY KEY,  
  tenant_id TEXT NOT NULL UNIQUE,  
  apps_script_id TEXT,  
  service_account_email TEXT,  
  last_synced_at INTEGER,  
  created_at INTEGER NOT NULL DEFAULT (unixepoch()), kv_namespace TEXT, cron_schedule TEXT, apps_script_deploy_job_id TEXT, apps_script_deploy_status TEXT, updated_at INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE TABLE feed_posts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  image_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE TABLE auth_users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  roles TEXT NOT NULL,
  profile TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(tenant_id, email)
);
CREATE TABLE IF NOT EXISTS "fixtures_old" (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, fixture_date TEXT NOT NULL, opponent TEXT NOT NULL, venue TEXT, competition TEXT, kick_off_time TEXT, status TEXT NOT NULL DEFAULT 'scheduled', source TEXT, home_team TEXT NOT NULL, away_team TEXT NOT NULL, home_score INTEGER, away_score INTEGER, youtube_live_id TEXT, youtube_status TEXT, youtube_scheduled_start TEXT, current_minute INTEGER DEFAULT 0, match_status TEXT DEFAULT 'scheduled', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(tenant_id, fixture_date, home_team, away_team));
CREATE TABLE fixtures (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), tenant_id TEXT NOT NULL, fixture_date TEXT NOT NULL, opponent TEXT NOT NULL, home_team TEXT NOT NULL, away_team TEXT NOT NULL, venue TEXT, competition TEXT, kick_off_time TEXT, status TEXT NOT NULL DEFAULT 'scheduled', source TEXT, home_score INTEGER, away_score INTEGER, youtube_live_id TEXT, youtube_status TEXT, youtube_scheduled_start TEXT, current_minute INTEGER DEFAULT 0, match_status TEXT DEFAULT 'scheduled', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE(tenant_id, fixture_date, home_team, away_team));
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  badge_url TEXT,
  colors_json TEXT,
  slogan TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  plan TEXT NOT NULL DEFAULT 'starter',
  team_code TEXT UNIQUE
);
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  role TEXT NOT NULL, -- manager/parent/player
  team_id TEXT,
  FOREIGN KEY(team_id) REFERENCES teams(id)
);
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  date_utc INTEGER NOT NULL,
  venue TEXT,
  lat REAL, lon REAL,
  status TEXT DEFAULT 'scheduled',
  FOREIGN KEY(team_id) REFERENCES teams(id)
);
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  type TEXT NOT NULL, -- goal/assist/card_yellow/card_red/sin_bin/sub/note
  minute INTEGER,
  player_id TEXT,
  assist_id TEXT,
  payload_json TEXT,
  ts INTEGER NOT NULL,
  FOREIGN KEY(match_id) REFERENCES matches(id)
);
CREATE TABLE products (
  id TEXT PRIMARY KEY, 
  title TEXT NOT NULL,
  description TEXT,
  handle TEXT UNIQUE NOT NULL, 
  image_url TEXT,
  printify_id TEXT, 
  vendor TEXT, 
  status TEXT DEFAULT 'active', 
  tenant_id TEXT, 
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE product_variants (
  id TEXT PRIMARY KEY, 
  product_id TEXT NOT NULL,
  title TEXT NOT NULL, 
  sku TEXT UNIQUE,
  price_gbp INTEGER NOT NULL, 
  printify_variant_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE TABLE orders (
  id TEXT PRIMARY KEY, 
  tenant_id TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  customer_email TEXT,
  customer_name TEXT,
  shipping_address_json TEXT, 
  total_gbp INTEGER NOT NULL,
  commission_gbp INTEGER NOT NULL, 
  status TEXT DEFAULT 'pending', 
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_gbp INTEGER NOT NULL,
  printify_order_id TEXT, 
  created_at INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE photo_albums (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, 
    album_date TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE TABLE photos (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    album_id TEXT NOT NULL,
    photo_key TEXT NOT NULL, 
    caption TEXT,
    uploaded_by TEXT NOT NULL,
    uploaded_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (album_id) REFERENCES photo_albums(id) ON DELETE CASCADE
);
CREATE TABLE training_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    session_date TEXT NOT NULL,
    session_time TEXT NOT NULL,
    team TEXT NOT NULL,
    focus TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned', 
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE TABLE drills (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    duration TEXT NOT NULL,
    players TEXT NOT NULL,
    equipment TEXT NOT NULL, 
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL, 
    focus TEXT NOT NULL, 
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE TABLE session_drills (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    drill_id TEXT NOT NULL,
    duration INTEGER NOT NULL,
    notes TEXT,
    drill_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (drill_id) REFERENCES drills(id) ON DELETE CASCADE
);
CREATE TABLE motm_votes (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    voted_at INTEGER NOT NULL,
    UNIQUE(match_id, user_id) 
);
CREATE TABLE social_posts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    content TEXT NOT NULL,
    platforms TEXT NOT NULL, 
    media_urls TEXT, 
    scheduled_for INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled', 
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    posted_at INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE TABLE gotm_voting (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL
);
CREATE TABLE gotm_candidates (
    id TEXT PRIMARY KEY,
    voting_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    match_id TEXT,
    description TEXT,
    video_url TEXT,
    votes INTEGER DEFAULT 0
);
CREATE TABLE gotm_votes (
    id TEXT PRIMARY KEY,
    voting_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE seasons (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_current INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);
CREATE TABLE player_seasons (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    squad_number INTEGER,
    position TEXT,
    joined_date TEXT,
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL
);
CREATE TABLE fun_stats_cache (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT,
    stat_type TEXT NOT NULL,
    stat_key TEXT NOT NULL,
    subject_id TEXT,
    value TEXT NOT NULL,
    computed_at INTEGER NOT NULL
);
CREATE TABLE discussions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    video_id TEXT,
    pinned INTEGER DEFAULT 0,
    locked INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE discussion_comments (
    id TEXT PRIMARY KEY,
    discussion_id TEXT NOT NULL,
    parent_comment_id TEXT,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    video_timestamp INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE training_drills (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    equipment TEXT,
    description TEXT NOT NULL,
    diagram_url TEXT,
    demo_video_url TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE training_plans (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    scheduled_date TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE training_plan_drills (
    plan_id TEXT NOT NULL,
    drill_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    PRIMARY KEY (plan_id, drill_id)
);
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data TEXT,
    read INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);
CREATE TABLE push_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE lms_games (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    entry_fee INTEGER DEFAULT 0,
    prize_pool INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);
CREATE TABLE lms_entries (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    eliminated_round INTEGER,
    created_at INTEGER NOT NULL
);
CREATE TABLE lms_rounds (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    deadline TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at INTEGER NOT NULL
);
CREATE TABLE lms_predictions (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    fixture_id TEXT NOT NULL,
    predicted_winner TEXT NOT NULL,
    result TEXT,
    created_at INTEGER NOT NULL
);
CREATE TABLE scout_notes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  fixture_id TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  
  -- Key observations
  key_players TEXT,        -- JSON: [{number, position, notes}]
  formation TEXT,          -- e.g., "4-3-3"
  strengths TEXT,          -- JSON array
  weaknesses TEXT,         -- JSON array
  set_pieces TEXT,         -- Corner/FK tactics
  
  -- General notes
  notes TEXT,
  
  -- Visibility
  visible_to_players INTEGER DEFAULT 0, -- 0 = coaches only, 1 = all
  
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE carpool_offers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  fixture_id TEXT NOT NULL,
  
  -- Driver info
  driver_user_id TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  
  -- Offer details
  seats_available INTEGER NOT NULL,
  seats_taken INTEGER DEFAULT 0,
  departure_location TEXT,
  departure_postcode TEXT,
  departure_time TEXT,           -- ISO datetime
  return_offered INTEGER DEFAULT 1, -- boolean: 0/1
  notes TEXT,
  
  status TEXT DEFAULT 'active', -- active, cancelled, completed
  
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE carpool_requests (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  
  -- Passenger info
  passenger_user_id TEXT NOT NULL,
  passenger_name TEXT NOT NULL,
  
  -- For players (kids)
  player_id TEXT,
  player_name TEXT,
  
  seats_needed INTEGER DEFAULT 1,
  pickup_notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, accepted, declined, cancelled
  
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  
  FOREIGN KEY (offer_id) REFERENCES carpool_offers(id) ON DELETE CASCADE
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_results_date ON results(match_date DESC);
CREATE INDEX idx_fixture_settings_tenant ON fixture_settings(tenant_id);
CREATE INDEX idx_league_standings_competition ON league_standings(tenant_id, competition);
CREATE INDEX idx_league_standings_position ON league_standings(competition, position);
CREATE INDEX idx_team_results_date ON team_results(tenant_id, match_date DESC);
CREATE INDEX idx_team_results_competition ON team_results(tenant_id, competition);
CREATE INDEX idx_live_updates_match ON live_updates(match_id, created_at DESC);
CREATE INDEX idx_live_updates_type ON live_updates(type);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_plan ON tenants(plan);
CREATE INDEX idx_usage_tenant_month ON usage_counters(tenant_id, month);
CREATE INDEX idx_promo_code ON promo_codes(code);
CREATE INDEX idx_promo_valid_until ON promo_codes(valid_until);
CREATE INDEX idx_redemption_tenant ON promo_redemptions(tenant_id);
CREATE INDEX idx_redemption_promo ON promo_redemptions(promo_code_id);
CREATE INDEX idx_make_tenant ON make_connections(tenant_id);
CREATE INDEX idx_pro_tenant ON pro_automation(tenant_id);
CREATE INDEX idx_tenants_provisioned_at ON tenants(provisioned_at);
CREATE INDEX idx_feed_posts_tenant ON feed_posts(tenant_id);
CREATE INDEX idx_feed_posts_created_at ON feed_posts(created_at DESC);
CREATE INDEX idx_make_connections_tenant ON make_connections(tenant_id);
CREATE INDEX idx_make_connections_validated ON make_connections(tenant_id, validated_at);
CREATE INDEX idx_feed_posts_created ON feed_posts(tenant_id, created_at DESC);
CREATE INDEX idx_promo_active ON promo_codes(active);
CREATE INDEX idx_auth_users_tenant ON auth_users(tenant_id);
CREATE INDEX idx_fixtures_tenant_date ON "fixtures_old"(tenant_id, fixture_date, kick_off_time);
CREATE INDEX idx_fixtures_tenant_status ON "fixtures_old"(tenant_id, status);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_vendor ON products(vendor);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_stripe_session ON orders(stripe_session_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_photos_album ON photos(album_id);
CREATE INDEX idx_photos_tenant ON photos(tenant_id);
CREATE INDEX idx_training_sessions_tenant ON training_sessions(tenant_id);
CREATE INDEX idx_drills_tenant ON drills(tenant_id);
CREATE INDEX idx_session_drills_session ON session_drills(session_id);
CREATE INDEX idx_motm_votes_match ON motm_votes(match_id);
CREATE INDEX idx_social_posts_tenant ON social_posts(tenant_id);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_gotm_voting_tenant ON gotm_voting(tenant_id);
CREATE INDEX idx_gotm_candidates_voting ON gotm_candidates(voting_id);
CREATE INDEX idx_gotm_votes_voting_user ON gotm_votes(voting_id, user_id);
CREATE INDEX idx_seasons_tenant ON seasons(tenant_id);
CREATE INDEX idx_seasons_current ON seasons(tenant_id, is_current);
CREATE INDEX idx_player_seasons_season ON player_seasons(season_id);
CREATE INDEX idx_player_seasons_player ON player_seasons(player_id);
CREATE INDEX idx_discussions_tenant ON discussions(tenant_id);
CREATE INDEX idx_discussions_category ON discussions(category);
CREATE INDEX idx_comments_discussion ON discussion_comments(discussion_id);
CREATE INDEX idx_plans_tenant ON training_plans(tenant_id);
CREATE INDEX idx_notifications_user ON notifications(tenant_id, user_id, read);
CREATE INDEX idx_push_tokens_user ON push_tokens(tenant_id, user_id);
CREATE INDEX idx_lms_games_tenant ON lms_games(tenant_id);
CREATE INDEX idx_lms_entries_game ON lms_entries(game_id);
CREATE INDEX idx_lms_rounds_game ON lms_rounds(game_id);
CREATE INDEX idx_lms_predictions_round ON lms_predictions(round_id);
CREATE INDEX idx_scout_notes_fixture ON scout_notes(fixture_id);
CREATE INDEX idx_scout_notes_tenant ON scout_notes(tenant_id);
CREATE INDEX idx_carpool_offers_fixture ON carpool_offers(fixture_id, status);
CREATE INDEX idx_carpool_offers_tenant ON carpool_offers(tenant_id);
CREATE INDEX idx_carpool_requests_offer ON carpool_requests(offer_id);
CREATE INDEX idx_carpool_requests_user ON carpool_requests(passenger_user_id);
