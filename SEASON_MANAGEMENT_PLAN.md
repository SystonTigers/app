# Season Management - Implementation Plan

## Executive Summary

This plan details the implementation of the Season Management feature, enabling coaches/admins to close seasons and start new ones while preserving historical data. The existing codebase already has foundational season infrastructure that we'll extend.

---

## Current State Analysis

### What Already Exists

**Database (Migration 015):**
- `seasons` table with: id, tenant_id, name, start_date, end_date, is_current, status, timestamps
- `player_seasons` table for historical roster tracking
- `fun_stats_cache` table for pre-computed stats
- `season_id` columns on fixtures, league_standings, team_results tables
- Proper indexes for performance

**Backend API (`backend/src/routes/seasons.ts`):**
- `GET /api/v1/seasons` - List all seasons
- `POST /api/v1/seasons` - Create new season
- `POST /api/v1/seasons/set-current` - Set active season
- `POST /api/v1/seasons/archive` - Basic archive (just changes status)
- `GET /api/v1/seasons/current` - Get current season
- `POST /api/v1/seasons/:seasonId/players` - Add player to season roster
- `GET /api/v1/seasons/:seasonId/players` - Get season roster

**Web Admin (`web-app/src/app/[tenant]/admin/seasons/page.tsx`):**
- Create season form
- List seasons with status badges
- Set current / archive buttons
- Basic functionality working

**History Page (`web-app/src/app/[tenant]/history/page.tsx`):**
- Season tabs component
- Season summary (record, top scorers)
- Fun stats integration
- Quick links to filtered fixtures/results/table/squad

### What's Missing (From Feature Brief)

1. **End Season Process** - Confirmation flow with summary, warnings, explicit confirmation
2. **Season Awards** - Player of Season, Top Scorer, Most Assists, custom awards
3. **Start New Season Wizard** - Squad carryover options (carry all, fresh start, selective)
4. **Season Snapshots** - Frozen stats at archive time
5. **Mid-Season Player Management** - Track departed players with dates
6. **Mobile App Integration** - No season management in mobile app yet
7. **Career Stats** - Aggregate stats across all seasons for players
8. **Reopen Season** - Allow undo within 24 hours
9. **New Player Signings** - Add new players mid-season with auto-generated welcome post

---

## Implementation Tasks

### Phase 1: Database Schema Updates

**New Migration: `017_season_awards_and_snapshots.sql`**

```sql
-- Season Awards table
CREATE TABLE IF NOT EXISTS season_awards (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    award_type TEXT NOT NULL,  -- 'player_of_season', 'top_scorer', 'most_assists', 'players_player', 'most_improved', 'managers_player', 'custom'
    award_name TEXT,           -- Custom award name (null for standard types)
    player_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    FOREIGN KEY (player_id) REFERENCES squad(id)
);

-- Season snapshots (frozen stats at archive time)
CREATE TABLE IF NOT EXISTS season_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    snapshot_type TEXT NOT NULL,  -- 'team_record', 'player_stats', 'league_position'
    data TEXT NOT NULL,            -- JSON blob of frozen stats
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    UNIQUE(tenant_id, season_id, snapshot_type)
);

-- Update player_seasons for departure tracking
ALTER TABLE player_seasons ADD COLUMN departed_date TEXT;
ALTER TABLE player_seasons ADD COLUMN departure_reason TEXT;  -- 'left_club', 'moved_up', 'retired'

-- Add archived_at timestamp to seasons for reopen window
ALTER TABLE seasons ADD COLUMN archived_at INTEGER;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_season_awards_season ON season_awards(season_id);
CREATE INDEX IF NOT EXISTS idx_season_snapshots_season ON season_snapshots(season_id);
```

**Files to create/modify:**
- `backend/migrations/017_season_awards_and_snapshots.sql` (new)

---

### Phase 2: Backend API Enhancements

#### 2.1 Enhanced Archive Season Endpoint

**File:** `backend/src/routes/seasons.ts`

Update `handleArchiveSeason` to:
1. Calculate and store season summary snapshot
2. Calculate and store player stats snapshots
3. Store league position snapshot
4. Set `archived_at` timestamp
5. Auto-calculate awards (Top Scorer, Most Assists)

```typescript
// POST /api/v1/seasons/archive-with-summary
export async function handleArchiveSeasonWithSummary(req: Request, env: any, corsHdrs: Headers) {
    // 1. Validate season exists and is active
    // 2. Calculate all stats
    // 3. Create snapshots
    // 4. Store awards
    // 5. Update season status
    // 6. Return summary for confirmation
}
```

#### 2.2 End Season Confirmation Flow

**New Endpoints:**

```typescript
// GET /api/v1/seasons/:seasonId/end-season-preview
// Returns: summary stats, top performers, warnings
// Used for confirmation screen before archiving

// POST /api/v1/seasons/:seasonId/end-season
// Body: { awards?: SeasonAward[], notes?: string }
// Performs actual archive with awards
```

#### 2.3 Season Awards Endpoints

```typescript
// GET /api/v1/seasons/:seasonId/awards
// Returns all awards for a season

// POST /api/v1/seasons/:seasonId/awards
// Body: { awardType, playerId, customName? }
// Creates an award

// DELETE /api/v1/seasons/:seasonId/awards/:awardId
// Removes an award
```

#### 2.4 Start New Season Wizard

```typescript
// POST /api/v1/seasons/start-new
// Body: {
//   name: string,
//   startDate: string,
//   competition?: string,
//   ageGroup?: string,
//   squadOption: 'carryover' | 'fresh' | 'selective',
//   selectedPlayerIds?: string[]  // Only for 'selective'
// }
// Creates season and handles squad setup
```

#### 2.5 Reopen Season (Admin Only)

```typescript
// POST /api/v1/seasons/:seasonId/reopen
// Only works if archived_at < 24 hours ago
// Clears snapshots and awards, sets status back to active
```

#### 2.6 Career Stats Endpoint

```typescript
// GET /api/v1/players/:playerId/career-stats
// Aggregates stats across all seasons
// Returns: { seasons: [], totals: {}, records: [] }
```

**Files to create/modify:**
- `backend/src/routes/seasons.ts` (extend)
- `backend/src/routes/season-awards.ts` (new)
- `backend/src/routes/career-stats.ts` (new)
- `backend/src/index.ts` (register new routes)

---

### Phase 3: Web Admin UI Enhancements

#### 3.1 Enhanced Seasons Admin Page

**File:** `web-app/src/app/[tenant]/admin/seasons/page.tsx`

Add:
- "End Season" button that opens confirmation modal
- End Season Modal with:
  - Summary stats (matches played, wins, goals, etc.)
  - Top performers list
  - Awards selection UI
  - Warning text
  - Confirmation input (type season name)
- "Start New Season" wizard modal:
  - Step 1: Season details (name, dates, competition)
  - Step 2: Squad setup (carryover/fresh/selective radio buttons)
  - Step 3: If selective, player checklist
  - Step 4: Confirmation
- "Reopen" button (visible within 24hr window)

#### 3.2 Season Awards Management

**File:** `web-app/src/app/[tenant]/admin/seasons/[id]/awards/page.tsx` (new)

- List current awards
- Add award form (dropdown for type, player selector)
- Custom award name input (when type = 'custom')
- Delete award button

#### 3.3 Enhanced History Page

**File:** `web-app/src/app/[tenant]/history/page.tsx`

Add:
- Awards section for archived seasons
- Frozen stats display (from snapshots)
- Player career toggle (This Season / Career)

**Files to create/modify:**
- `web-app/src/app/[tenant]/admin/seasons/page.tsx` (enhance)
- `web-app/src/app/[tenant]/admin/seasons/[id]/awards/page.tsx` (new)
- `web-app/src/app/[tenant]/history/page.tsx` (enhance)
- `web-app/src/components/EndSeasonModal.tsx` (new)
- `web-app/src/components/StartSeasonWizard.tsx` (new)
- `web-app/src/components/SeasonAwardsEditor.tsx` (new)

---

### Phase 4: Mobile App Integration

#### 4.1 Season Management Screen (Admin Only)

**File:** `mobile/src/screens/ManageSeasonsScreen.tsx` (new)

Features:
- List seasons with status
- "End Season" button (opens confirmation flow)
- "Start New Season" button (opens wizard)
- Basic awards assignment

#### 4.2 Stats Screen Enhancement

**File:** `mobile/src/screens/StatsScreen.tsx`

Add:
- Season selector dropdown (like web SeasonTabs)
- Career stats toggle
- Season awards display

#### 4.3 Player Profile Enhancement

**File:** `mobile/src/screens/ProfileScreen.tsx` or create `PlayerDetailScreen.tsx`

Add:
- Career stats summary
- Season-by-season breakdown
- Awards earned

**Files to create/modify:**
- `mobile/src/screens/ManageSeasonsScreen.tsx` (new)
- `mobile/src/screens/StatsScreen.tsx` (enhance)
- `mobile/src/screens/ManageScreen.tsx` (add navigation to ManageSeasonsScreen)
- `mobile/src/services/api.ts` (add season API calls)

---

### Phase 5: Squad/Player Roster Integration

#### 5.1 Handle Player Departures

**Files:** `backend/src/routes/squad.ts`, `backend/src/routes/seasons.ts`

- When marking player as departed:
  - Update `player_seasons.status` to 'departed'
  - Set `departed_date`
  - Keep player in historical roster (still shows in season history)
  - Hide from current squad list

#### 5.2 Player Carryover Logic

When starting new season with 'carryover':
1. Get all players from previous season where `status = 'active'`
2. Create `player_seasons` records for new season
3. Reset stats (no match_events in new season)

When starting with 'selective':
1. Show UI with checkboxes for each player
2. Only create `player_seasons` for selected players

**Files to modify:**
- `backend/src/routes/squad.ts` (add departure handling)
- `backend/src/routes/seasons.ts` (carryover logic)

---

### Phase 5.3: New Player Signings with Welcome Post

#### Feature Overview
When adding a new player to the squad, optionally auto-generate a welcome post to the news feed introducing them to the team. This creates engagement and announces new signings professionally.

#### Backend Implementation

**File:** `backend/src/routes/squad.ts`

**New/Enhanced Endpoint:**
```typescript
// POST /api/v1/squad
// Enhanced to support welcome post generation
// Body: {
//   name: string,
//   position: string,
//   squadNumber?: number,
//   photoUrl?: string,
//   dateOfBirth?: string,
//   createWelcomePost?: boolean,      // NEW: Opt-in for welcome post
//   welcomePostOptions?: {            // NEW: Customization options
//     previousClub?: string,          // "Joins from Leicester City Juniors"
//     customMessage?: string,         // Override auto-generated message
//     includePhoto?: boolean,         // Include player photo in post (default: true)
//   }
// }
```

**Welcome Post Auto-Generation Logic:**
```typescript
async function generateWelcomePost(player: Player, options: WelcomePostOptions, tenantId: string, env: any) {
    // Get tenant info for team name
    const tenant = await env.DB.prepare("SELECT name FROM tenants WHERE id = ?").bind(tenantId).first();
    const teamName = tenant?.name || 'the team';

    // Generate post content
    let content = `Welcome to ${teamName}, ${player.name}! `;

    if (options.previousClub) {
        content += `${player.name} joins us from ${options.previousClub}. `;
    }

    content += `${player.name} will wear the number ${player.squadNumber || 'TBC'} shirt `;
    content += `and play as ${player.position}. `;
    content += `Welcome to the Tigers family! 🐯⚽`;

    // Allow custom override
    if (options.customMessage) {
        content = options.customMessage;
    }

    // Create feed post
    const postId = crypto.randomUUID();
    await env.DB.prepare(
        `INSERT INTO feed_posts (id, tenant_id, title, content, author, image_url, post_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        postId,
        tenantId,
        `New Signing: ${player.name}`,
        content,
        'Club Admin',
        options.includePhoto !== false ? player.photoUrl : null,
        'signing',  // New post type for filtering
        Date.now()
    ).run();

    return postId;
}
```

#### Database Update

**Migration addition to `017_season_awards_and_snapshots.sql`:**
```sql
-- Add post_type to feed_posts for categorization
ALTER TABLE feed_posts ADD COLUMN post_type TEXT DEFAULT 'general';
-- Types: 'general', 'signing', 'match_report', 'announcement', 'milestone'

-- Add previous_club to squad for tracking origin
ALTER TABLE squad ADD COLUMN previous_club TEXT;

-- Add signed_date for "time at club" calculations
ALTER TABLE squad ADD COLUMN signed_date TEXT;
```

#### Web Admin UI

**File:** `web-app/src/app/[tenant]/admin/squad/page.tsx`

Add to "Add Player" form:
- Checkbox: "Create welcome post"
- Conditional fields when checked:
  - Previous club input
  - Custom message textarea (optional, shows auto-generated preview)
  - Include photo toggle

**File:** `web-app/src/components/AddPlayerModal.tsx` (new or enhance existing)

```tsx
// UI mockup
<div className="space-y-4">
    {/* Existing fields: name, position, number, photo */}

    <div className="border-t pt-4 mt-4">
        <label className="flex items-center gap-2">
            <input type="checkbox" checked={createWelcomePost} onChange={...} />
            <span>Announce this signing</span>
        </label>

        {createWelcomePost && (
            <div className="mt-4 space-y-3 pl-6">
                <input
                    placeholder="Previous club (optional)"
                    value={previousClub}
                    onChange={...}
                />

                <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>Preview:</strong>
                    <p>{generatedPostPreview}</p>
                </div>

                <textarea
                    placeholder="Custom message (leave blank for auto-generated)"
                    value={customMessage}
                    onChange={...}
                />
            </div>
        )}
    </div>
</div>
```

#### Mobile App

**File:** `mobile/src/screens/ManageSquadScreen.tsx`

Add same options to "Add Player" flow:
- Toggle for welcome post
- Previous club field
- Preview of auto-generated message

#### Welcome Post Templates

Standard templates based on context:

**Template 1 - Basic:**
> Welcome to [Team Name], [Player Name]! [He/She] will wear the number [X] shirt and play as [Position]. Welcome to the Tigers family!

**Template 2 - With Previous Club:**
> New Signing Alert! [Player Name] joins [Team Name] from [Previous Club]. [He/She] will wear number [X] as our new [Position]. Welcome aboard!

**Template 3 - Season Start:**
> Introducing our new signing for the [Season] season - [Player Name]! [He/She] arrives from [Previous Club] and will strengthen our [Position] options. Let's give [him/her] a warm welcome!

#### Files to Create/Modify
- `backend/src/routes/squad.ts` (enhance add player)
- `backend/migrations/017_season_awards_and_snapshots.sql` (add columns)
- `web-app/src/app/[tenant]/admin/squad/page.tsx` (enhance form)
- `web-app/src/components/AddPlayerModal.tsx` (new or enhance)
- `mobile/src/screens/ManageSquadScreen.tsx` (enhance)

---

### Phase 6: Testing & Edge Cases

#### Test Cases:
1. Create first season for new tenant
2. End season and verify snapshots created
3. Start new season with carryover
4. Start new season selective (deselect some players)
5. Verify departed players show in history but not current
6. Reopen season within 24 hours
7. Try to reopen after 24 hours (should fail)
8. Career stats calculation across 3+ seasons
9. Season with no matches (edge case)
10. Two active seasons (should be prevented)
11. Add new player with welcome post - verify post created
12. Add new player without welcome post - verify no post created
13. Add new player with custom welcome message
14. Add new player with previous club mentioned

**Files to create:**
- `backend/src/routes/__tests__/seasons.test.ts` (enhance)
- `backend/src/routes/__tests__/season-awards.test.ts` (new)
- `backend/src/routes/__tests__/squad-signing.test.ts` (new)

---

## Implementation Order

1. **Phase 1: Database** - Create migration, run locally
2. **Phase 2.1-2.3: Core Backend** - Archive with summary, awards endpoints
3. **Phase 3.1: Web Admin Basics** - End season modal, basic awards
4. **Phase 2.4: Start Season Wizard** - Backend for new season flow
5. **Phase 3.1 continued: Web Admin Wizard** - Start season UI
6. **Phase 5.1-5.2: Squad Integration** - Departures and carryover
7. **Phase 5.3: New Player Signings** - Welcome post generation
8. **Phase 4: Mobile App** - Basic season management
9. **Phase 2.5-2.6: Advanced Backend** - Reopen, career stats
10. **Phase 3.3, 4.2-4.3: UI Polish** - History page, mobile enhancements
11. **Phase 6: Testing** - Comprehensive test coverage

---

## Data Flow Diagrams

### End Season Flow

```
User clicks "End Season"
         │
         ▼
GET /seasons/:id/end-season-preview
         │
         ▼
┌─────────────────────────────────┐
│  Show Confirmation Modal        │
│  - Summary stats                │
│  - Top performers               │
│  - Awards selection             │
│  - Type season name to confirm  │
└─────────────────────────────────┘
         │
         ▼ (User confirms)
POST /seasons/:id/end-season
         │
         ├── Calculate team snapshot
         ├── Calculate player snapshots
         ├── Store awards
         ├── Set status = 'archived'
         └── Set archived_at = now()
         │
         ▼
Success! Redirect to history page
```

### Start New Season Flow

```
User clicks "Start New Season"
         │
         ▼
┌─────────────────────────────────┐
│  Step 1: Season Details         │
│  - Name (e.g., "2025-26")       │
│  - Start date                   │
│  - Competition (optional)       │
│  - Age group (optional)         │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Step 2: Squad Setup            │
│  ○ Carry over all players       │
│  ○ Start fresh (empty squad)    │
│  ○ Select players to keep       │
└─────────────────────────────────┘
         │
         ▼ (If selective)
┌─────────────────────────────────┐
│  Step 3: Player Selection       │
│  ☑ Player 1                     │
│  ☑ Player 2                     │
│  ☐ Player 3 (not carrying over) │
└─────────────────────────────────┘
         │
         ▼
POST /seasons/start-new
         │
         ├── Create season record
         ├── Set is_current = 1
         ├── Create player_seasons records
         └── Unset previous is_current
         │
         ▼
Success! Redirect to new season
```

### New Player Signing Flow

```
Admin clicks "Add Player"
         │
         ▼
┌─────────────────────────────────┐
│  Enter Player Details           │
│  - Name                         │
│  - Position                     │
│  - Squad number                 │
│  - Photo                        │
│  ☑ Announce this signing        │
└─────────────────────────────────┘
         │
         ▼ (If announce checked)
┌─────────────────────────────────┐
│  Welcome Post Options           │
│  - Previous club (optional)     │
│  - Preview auto-generated post  │
│  - Custom message (optional)    │
└─────────────────────────────────┘
         │
         ▼
POST /api/v1/squad
         │
         ├── Create player record
         ├── Add to current season roster
         ├── IF createWelcomePost:
         │   ├── Generate post content
         │   ├── Insert into feed_posts
         │   └── Return postId
         │
         ▼
Success! Player added + Post created
```

---

## API Response Schemas

### End Season Preview Response
```typescript
interface EndSeasonPreviewResponse {
  success: true;
  data: {
    season: Season;
    summary: {
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      points: number;
      cleanSheets: number;
    };
    topScorer: { playerId: string; name: string; goals: number } | null;
    topAssister: { playerId: string; name: string; assists: number } | null;
    mostAppearances: { playerId: string; name: string; appearances: number } | null;
    motmLeader: { playerId: string; name: string; count: number } | null;
    warnings: string[];  // e.g., "No matches recorded this season"
  };
}
```

### Career Stats Response
```typescript
interface CareerStatsResponse {
  success: true;
  data: {
    player: { id: string; name: string };
    totals: {
      appearances: number;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
      cleanSheets?: number;
      motmCount: number;
    };
    seasons: Array<{
      seasonId: string;
      seasonName: string;
      appearances: number;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
      cleanSheets?: number;
      motmCount: number;
    }>;
    awards: Array<{
      seasonId: string;
      seasonName: string;
      awardType: string;
      awardName?: string;
    }>;
  };
}
```

---

## Estimated Effort

| Phase | Description | Effort |
|-------|-------------|--------|
| 1 | Database migration | Small |
| 2.1-2.3 | Core backend (archive, awards) | Medium |
| 3.1 | Web admin (end season modal) | Medium |
| 2.4 | Start season backend | Medium |
| 3.1 cont. | Web admin (start season wizard) | Medium |
| 5 | Squad integration | Medium |
| 4 | Mobile app | Large |
| 2.5-2.6 | Advanced backend | Small |
| 3.3, 4.2-4.3 | UI polish | Medium |
| 6 | Testing | Medium |

**Total: Large feature, implement incrementally**

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss on archive | Create snapshots before any status change |
| Orphaned stats | Always link match_events via fixture.season_id |
| Concurrent season creation | DB constraint (is_current=1 limited to one) |
| Mobile offline handling | Sync season state on app open |
| Performance with many seasons | Use indexed queries, pagination |

---

## Success Criteria

1. Admin can end season with single confirmation flow
2. All stats frozen and viewable in history
3. Awards recorded and displayed
4. New season starts with correct squad
5. Career stats show aggregated totals
6. Departed players visible in history only
7. 24-hour reopen window works
8. Mobile app has basic season management
9. No data loss during transitions
10. Performance remains fast with 10+ seasons

---

## Files Summary

### New Files
- `backend/migrations/017_season_awards_and_snapshots.sql`
- `backend/src/routes/season-awards.ts`
- `backend/src/routes/career-stats.ts`
- `web-app/src/app/[tenant]/admin/seasons/[id]/awards/page.tsx`
- `web-app/src/components/EndSeasonModal.tsx`
- `web-app/src/components/StartSeasonWizard.tsx`
- `web-app/src/components/SeasonAwardsEditor.tsx`
- `web-app/src/components/AddPlayerModal.tsx`
- `mobile/src/screens/ManageSeasonsScreen.tsx`
- `backend/src/routes/__tests__/squad-signing.test.ts`

### Modified Files
- `backend/src/routes/seasons.ts`
- `backend/src/routes/squad.ts` (add welcome post generation)
- `backend/src/index.ts`
- `web-app/src/app/[tenant]/admin/seasons/page.tsx`
- `web-app/src/app/[tenant]/admin/squad/page.tsx` (add signing announcement)
- `web-app/src/app/[tenant]/history/page.tsx`
- `mobile/src/screens/StatsScreen.tsx`
- `mobile/src/screens/ManageScreen.tsx`
- `mobile/src/screens/ManageSquadScreen.tsx` (add signing announcement)
- `mobile/src/services/api.ts`
