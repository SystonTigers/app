declare module "@team-platform/sdk" {
  // Keep minimal, UI-only fields actually used
  export type BrandKit = { primary?: string; secondary?: string; logoUrl?: string };
  export type Fixture = { id?: string; date?: string; opponent?: string; venue?: string; score?: string };
  export type FeedPost = { id: string; title?: string; body?: string; created_at?: string };
  export type LeagueTableRow = { team: string; played: number; points: number; won?: number; drawn?: number; lost?: number; goalsFor?: number; goalsAgainst?: number; goalDifference?: number; position?: number };
  export type NextFixture = Fixture;
  export type LiveUpdate = { message: string; at?: string };
}
