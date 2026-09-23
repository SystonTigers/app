-- Migration 043: Carpool Coordinator
-- Ride-sharing for away fixtures

-- Lift offers from drivers
CREATE TABLE IF NOT EXISTS carpool_offers (
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

-- Seat requests from passengers
CREATE TABLE IF NOT EXISTS carpool_requests (
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

CREATE INDEX IF NOT EXISTS idx_carpool_offers_fixture ON carpool_offers(fixture_id, status);
CREATE INDEX IF NOT EXISTS idx_carpool_offers_tenant ON carpool_offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_carpool_requests_offer ON carpool_requests(offer_id);
CREATE INDEX IF NOT EXISTS idx_carpool_requests_user ON carpool_requests(passenger_user_id);
