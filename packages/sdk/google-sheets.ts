import { google, sheets_v4 } from 'googleapis';
import { GoogleAuth, JWT } from 'google-auth-library';

export type MatchEventType = 'GOAL' | 'CHANCE' | 'SAVE' | 'FOUL' | 'CARD' | 'SKILL';

export type MatchEvent = {
  type: MatchEventType;
  minute: number;
  scorer?: string;
  assister?: string;
  homeScore?: number;
  awayScore?: number;
  notes?: string;
  raw?: Record<string, string>;
};

export interface LoadMatchEventsOptions {
  spreadsheetId?: string;
  range?: string;
  credentialsJson?: string;
  scopes?: string[];
}

function parseCredentials(credentialsJson?: string) {
  if (!credentialsJson) return undefined;
  try {
    return JSON.parse(credentialsJson);
  } catch (err) {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON');
  }
}

function resolveConfig(matchId: string, options?: LoadMatchEventsOptions) {
  const spreadsheetId = options?.spreadsheetId ?? process.env.SHEETS_SPREADSHEET_ID;
  const range = options?.range ?? process.env.SHEETS_RANGE;
  const credentials = parseCredentials(options?.credentialsJson ?? process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  if (!spreadsheetId || !range) {
    throw new Error('SHEETS_SPREADSHEET_ID and SHEETS_RANGE must be configured');
  }
  const scopes = options?.scopes ?? ['https://www.googleapis.com/auth/spreadsheets.readonly'];
  const auth = new GoogleAuth({
    credentials,
    scopes,
  });
  return { matchId, spreadsheetId, range, auth };
}

function normaliseHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function coerceMinute(value?: string): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+)(?:\+(\d+))?$/);
  if (match) {
    const base = Number(match[1]);
    const extra = match[2] ? Number(match[2]) : 0;
    return base + extra;
  }
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber)) return asNumber;
  return null;
}

function coerceScore(value?: string): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

function mapRowToEvent(headers: string[], row: string[], matchId: string): MatchEvent | null {
  const indexOf = (name: string) => headers.indexOf(name);
  const typeIdx = indexOf('type');
  const minuteIdx = indexOf('minute');
  const scorerIdx = indexOf('scorer');
  const assisterIdx = indexOf('assister');
  const homeScoreIdx = indexOf('home_score');
  const awayScoreIdx = indexOf('away_score');
  const notesIdx = indexOf('notes');
  const matchIdIdx = indexOf('match_id');

  const values: Record<string, string> = {};
  headers.forEach((header, idx) => {
    if (row[idx] !== undefined) {
      values[header] = String(row[idx]).trim();
    }
  });

  if (matchIdIdx !== -1) {
    const rowMatchId = row[matchIdIdx]?.trim();
    if (rowMatchId && rowMatchId !== matchId) {
      return null;
    }
  }

  const rawType = typeIdx !== -1 ? row[typeIdx]?.trim().toUpperCase() : undefined;
  if (!rawType) return null;
  const allowedTypes: MatchEventType[] = ['GOAL', 'CHANCE', 'SAVE', 'FOUL', 'CARD', 'SKILL'];
  if (!allowedTypes.includes(rawType as MatchEventType)) {
    return null;
  }

  const minuteValue = minuteIdx !== -1 ? coerceMinute(row[minuteIdx]) : null;
  if (minuteValue == null) return null;

  return {
    type: rawType as MatchEventType,
    minute: minuteValue,
    scorer: scorerIdx !== -1 ? row[scorerIdx]?.trim() || undefined : undefined,
    assister: assisterIdx !== -1 ? row[assisterIdx]?.trim() || undefined : undefined,
    homeScore: homeScoreIdx !== -1 ? coerceScore(row[homeScoreIdx]) : undefined,
    awayScore: awayScoreIdx !== -1 ? coerceScore(row[awayScoreIdx]) : undefined,
    notes: notesIdx !== -1 ? row[notesIdx]?.trim() || undefined : undefined,
    raw: values,
  };
}

export async function loadMatchEvents(matchId: string, options?: LoadMatchEventsOptions): Promise<MatchEvent[]> {
  if (!matchId) {
    throw new Error('matchId is required');
  }
  const config = resolveConfig(matchId, options);
  const authClient = (await config.auth.getClient()) as JWT | GoogleAuth;
  const sheets = google.sheets({ version: 'v4', auth: authClient }) as sheets_v4.Sheets;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: config.range,
  });
  const values = response.data.values || [];
  if (values.length === 0) {
    return [];
  }
  const headerRow = values[0].map((header) => normaliseHeader(String(header)));
  const events: MatchEvent[] = [];
  for (const row of values.slice(1)) {
    const event = mapRowToEvent(headerRow, row as string[], matchId);
    if (event) {
      events.push(event);
    }
  }
  events.sort((a, b) => a.minute - b.minute);
  return events;
}
