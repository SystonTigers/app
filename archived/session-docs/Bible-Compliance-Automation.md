# Bible Compliance Automation – Implementation Answers & Rules

This document records all key business logic choices and automation rules for the Syston Tigers Automation Script repo as discussed and agreed in September 2025.  
Use these answers for future development, onboarding, or reference when updating automation features.

---

## 1. Weekly Content Calendar Automation

- **Posting:** Automated, scheduled by day/time for each function as set in the Control Panel sheet (e.g., Throwback every Thursday at 18:00).
- **Control:** All automation functions (on/off, day, time) are toggleable in the Control Panel sheet.
- **Countdown Posts:** Scheduled X days before match day (not fixed days). All countdown posts for a postponed fixture are automatically suppressed.
- **Fixture Postponement:** If a fixture is postponed, ALL related countdown posts are suppressed immediately for that fixture only.
- **Quotes/Throwbacks Rotation:** Random unused selection, not sequential or weighted.
- **Destination:** Posts go directly to Make.com (no preview, no manual confirmation).
- **Cooldowns:** No cooldown logic needed. Posting frequency is controlled entirely by the Control Panel schedule.
- **Manual Overrides:** Not needed; automation follows schedule and flags.

---

## 2. Opposition Auto-Detection

- **Goal Events:**  
  - "Goal" = opposition team scores; "Own Goal" = either team scores an own goal.
- **Card Events:**  
  - "Opposition" is always the opponent.
- **Handling:**  
  - When an opposition goal or card is detected, post to Make.com, add a row to OPPOSITION_EVENTS, but **do NOT update player stats**. No exceptions.
- **Visibility:**  
  - Opposition events are admin-only, not shown in public summaries/stats.

---

## 3. Real-Time Player Minutes & Sub Swaps

- **Minutes Calculation:**  
  - Update minutes for all players at Full Time only (not after every sub/status).
  - If a player is subbed off and later brought back on, minutes are cumulative (e.g., 0-30, off, 60-90 = 60 mins total).
- **Sub Logging:**  
  - All sub events are logged in SUBS_LOG; all affect minutes.
- **Exceptions:**  
  - None (no special rules for injury, red card, etc.).

---

## 4. Second-Yellow Processing

- **Stats Recorded:**  
  - Only a red card (not two yellows + red).
- **Event Posting:**  
  - Triggers a special post/event (“Player sent off for 2nd yellow”).
  - Can be toggled on/off in the Control Panel.

---

## 5. Postponed Match Handling

- **Notice Sending:**  
  - Postponement notices sent immediately when fixture is marked postponed.
- **Countdown Posts:**  
  - Suppressed (not deleted) for postponed fixtures only.
- **Scope:**  
  - Only affects the postponed fixture, not the whole match week.

---

## 6. Video Clip Metadata Creation

- **Trigger Events:**  
  - All major events: Goals, cards, "big chance," etc.
- **Default Buffers:**  
  - Suggested: Goals (10s before, 20s after); Cards (5s before, 10s after); Big Chance (10s before, 15s after). These can be customized per event type in config.
- **Manual Override:**  
  - Allowed—clips can be manually created or edited.
- **Storage:**  
  - Google Drive: New folder for each match highlights; also move clips into individual player folders.

---

## 7. Video Editor Notes System

- **Recognized Notes:**  
  - big chance, goal, skill, good play, card, other.
- **Mapping:**  
  - Map notes to player automatically if possible; manual selection also allowed.
- **Storage:**  
  - Can store notes in VIDEO_CLIPS tab or in a separate Notes sheet.

---

## 8. Monitoring & Alerts

- **Alert Channel:**  
  - Email only.
- **Alert Level:**  
  - Critical errors only (e.g., webhook/script failure, data corruption). Minor errors are logged but not emailed.
- **Health Checks:**  
  - Weekly summary suggested: quota usage, error counts, most recent post, warnings if any feature is disabled.

---

## 9. Control Panel Flags

- **Enforcement:**  
  - Feature flags are respected strictly—automation is disabled if flag is OFF. No admin override except toggling the flag in the Control Panel.
- **Control:**  
  - All toggling is live from the Control Panel Sheet.

---

## 10. Make.com Post Helper

- **Retry/Backoff Strategy:**  
  - 3 attempts, 2 seconds apart.
- **Idempotency:**  
  - Track by event type + payload (prevents duplicate posts of same content, but allows new/different content for the same event type).

---

## 11. Goal of the Month (GOTM) Pipeline

- **Voting Period:**  
  - 5 days after posting.
- **Candidate Selection:**  
  - All goals in the month are candidates (no flagging needed).
- **Reminders:**  
  - Voting reminders are scheduled automatically.
- **Winner Announcement:**  
  - Announced to all social channels.

---

## 12. Live Match Day Automation Glue

- **Live Tab Activation:**  
  - Automatically activated on match day morning; manual backup button available.
- **Status Posts (KO/HT/SH KO/FT):**  
  - Triggered by user selecting status and pressing "Send" in Sheets.
- **Live Box Removal:**  
  - 20 minutes after MOTM posted.
- **Posting:**  
  - All posts are auto (no preview).

---

## General Automation Principles

- **Config-driven:**  
  All schedules, toggles, and business rules are set in config or Control Panel Sheet.
- **Direct Posting:**  
  Automation posts directly to Make.com and Google Drive (no preview/intermediate confirmation).
- **Strict Flag Enforcement:**  
  Feature flags are always respected; no hidden overrides.
- **Admin-first:**  
  Admins have control via Control Panel and manual buttons as backup.

---

_Last updated: 2025-09-22 by SystonTigers_
