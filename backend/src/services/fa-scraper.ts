/**
 * FA Scraper Service
 * Scrapes fixtures from FA Full-Time website, emails, and embed snippets
 */

// ====== TYPES ======

export interface FAFixture {
    date: string;
    time: string;
    homeTeam: string;
    awayTeam: string;
    opponent: string;
    venue: 'Home' | 'Away' | string;
    competition: string;
    status: 'scheduled' | 'postponed' | 'cancelled' | 'completed';
    homeScore?: number;
    awayScore?: number;
    source: 'fa_website' | 'fa_email' | 'fa_snippet';
    opponentBadge?: string;
}

export interface FAScraperConfig {
    teamPageUrl?: string;
    snippetUrl?: string;
    teamName: string;
    teamShortName?: string;
}

// ====== FA WEBSITE SCRAPER ======

export async function scrapeWebsite(teamPageUrl: string, teamName: string): Promise<FAFixture[]> {
    console.log(`[FA Scraper] Scraping website: ${teamPageUrl}`);

    try {
        const response = await fetch(teamPageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            console.error(`[FA Scraper] HTTP ${response.status}`);
            return [];
        }

        const html = await response.text();
        const fixtures: FAFixture[] = [];

        // Strategy 1: Parse HTML tables
        const tableFixtures = parseTableFixtures(html, teamName);
        fixtures.push(...tableFixtures);

        // Strategy 2: Parse data attributes
        const divFixtures = parseDivFixtures(html, teamName);
        fixtures.push(...divFixtures);

        // Strategy 3: Parse embedded JSON
        const jsonFixtures = parseJSONFixtures(html, teamName);
        fixtures.push(...jsonFixtures);

        // Deduplicate
        const unique = deduplicateFixtures(fixtures);
        console.log(`[FA Scraper] Found ${unique.length} fixtures from website`);

        return unique;
    } catch (error) {
        console.error('[FA Scraper] Website scrape failed:', error);
        return [];
    }
}

// ====== FA SNIPPET PARSER ======

export async function parseSnippet(snippetUrl: string, teamName: string): Promise<FAFixture[]> {
    console.log(`[FA Scraper] Parsing snippet: ${snippetUrl}`);

    try {
        const response = await fetch(snippetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            console.error(`[FA Scraper] Snippet HTTP ${response.status}`);
            return [];
        }

        const content = await response.text();
        const fixtures: FAFixture[] = [];

        // Try JSON parsing first
        try {
            const jsonData = JSON.parse(content);
            const jsonFixtures = parseJSONData(jsonData, teamName);
            fixtures.push(...jsonFixtures);
        } catch {
            // Not JSON, try HTML parsing
            fixtures.push(...parseTableFixtures(content, teamName));
            fixtures.push(...parseDivFixtures(content, teamName));
        }

        // Check for embedded iframes
        const iframeMatch = content.match(/<iframe[^>]*src=["']([^"']+)["']/i);
        if (iframeMatch) {
            const iframeFixtures = await parseSnippet(iframeMatch[1], teamName);
            fixtures.push(...iframeFixtures);
        }

        const unique = deduplicateFixtures(fixtures);
        console.log(`[FA Scraper] Found ${unique.length} fixtures from snippet`);

        return unique;
    } catch (error) {
        console.error('[FA Scraper] Snippet parse failed:', error);
        return [];
    }
}

// ====== FA EMAIL PARSER ======

export function parseEmailContent(emailHtml: string, teamName: string): FAFixture[] {
    console.log('[FA Scraper] Parsing email content');

    try {
        const fixtures: FAFixture[] = [];
        const text = stripHtml(emailHtml);

        // Extract fixture data from email
        const fixture = extractFixtureFromEmail(emailHtml, text, teamName);
        if (fixture) {
            fixtures.push(fixture);
        }

        console.log(`[FA Scraper] Found ${fixtures.length} fixtures from email`);
        return fixtures;
    } catch (error) {
        console.error('[FA Scraper] Email parse failed:', error);
        return [];
    }
}

function extractFixtureFromEmail(html: string, text: string, teamName: string): FAFixture | null {
    // Extract opposition
    const opposition = extractOpposition(text, teamName);
    if (!opposition) {return null;}

    // Extract date
    const date = extractDate(text);
    if (!date) {return null;}

    // Extract time
    const time = extractTime(text) || '15:00';

    // Extract venue
    const venue = extractVenue(text, teamName);

    // Extract competition
    const competition = extractCompetition(text);

    // Extract status
    const status = extractStatus(text);

    return {
        date,
        time,
        homeTeam: venue === 'Home' ? teamName : opposition,
        awayTeam: venue === 'Home' ? opposition : teamName,
        opponent: opposition,
        venue,
        competition,
        status,
        source: 'fa_email'
    };
}

// ====== HTML PARSING HELPERS ======

function parseTableFixtures(html: string, teamName: string): FAFixture[] {
    const fixtures: FAFixture[] = [];

    // Match fixture rows
    const rowPattern = /<tr[^>]*class="[^"]*(?:fixture|match|upcoming|result)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowPattern.exec(html)) !== null) {
        const row = rowMatch[1];

        // Extract date
        const dateMatch = row.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        const date = dateMatch ? dateMatch[1] : null;
        if (!date) {continue;}

        // Extract teams from cells
        const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const cells: string[] = [];
        let cellMatch;
        while ((cellMatch = cellPattern.exec(row)) !== null) {
            cells.push(cleanText(stripHtml(cellMatch[1])));
        }

        if (cells.length < 3) {continue;}

        // Find team names in cells
        const teams = cells.filter(cell =>
            cell.length > 2 &&
            !cell.match(/^\d/) &&
            !cell.includes(':')
        ).slice(0, 2);

        if (teams.length < 2) {continue;}

        const homeTeam = teams[0];
        const awayTeam = teams[1];

        if (!isOurMatch(homeTeam, awayTeam, teamName)) {continue;}

        // Extract time
        const timeMatch = row.match(/(\d{1,2}:\d{2})/);
        const time = timeMatch ? timeMatch[1] : '15:00';

        // Extract score if result
        const scoreMatch = row.match(/(\d+)\s*[-:]\s*(\d+)/);

        fixtures.push({
            date,
            time,
            homeTeam,
            awayTeam,
            opponent: isOurMatch(homeTeam, '', teamName) ? awayTeam : homeTeam,
            venue: isOurMatch(homeTeam, '', teamName) ? 'Home' : 'Away',
            competition: extractCompetitionFromRow(row),
            status: scoreMatch ? 'completed' : 'scheduled',
            homeScore: scoreMatch ? parseInt(scoreMatch[1]) : undefined,
            awayScore: scoreMatch ? parseInt(scoreMatch[2]) : undefined,
            source: 'fa_website',
            opponentBadge: extractBadgeFromRow(row, isOurMatch(homeTeam, '', teamName) ? awayTeam : homeTeam)
        });
    }

    return fixtures;
}

function parseDivFixtures(html: string, teamName: string): FAFixture[] {
    const fixtures: FAFixture[] = [];

    // Match divs with data attributes
    const divPattern = /<div[^>]*(?:data-match|data-fixture)[^>]*>([\s\S]*?)<\/div>/gi;
    let divMatch;

    while ((divMatch = divPattern.exec(html)) !== null) {
        const div = divMatch[0];

        // Extract data attributes
        const dateMatch = div.match(/data-date="([^"]+)"/);
        const homeMatch = div.match(/data-home="([^"]+)"/);
        const awayMatch = div.match(/data-away="([^"]+)"/);
        const timeMatch = div.match(/data-time="([^"]+)"/);
        const compMatch = div.match(/data-competition="([^"]+)"/);

        if (!dateMatch || !homeMatch || !awayMatch) {continue;}

        const homeTeam = cleanText(homeMatch[1]);
        const awayTeam = cleanText(awayMatch[1]);

        if (!isOurMatch(homeTeam, awayTeam, teamName)) {continue;}

        fixtures.push({
            date: dateMatch[1],
            time: timeMatch ? timeMatch[1] : '15:00',
            homeTeam,
            awayTeam,
            opponent: isOurMatch(homeTeam, '', teamName) ? awayTeam : homeTeam,
            venue: isOurMatch(homeTeam, '', teamName) ? 'Home' : 'Away',
            competition: compMatch ? cleanText(compMatch[1]) : 'League',
            status: 'scheduled',
            source: 'fa_website'
        });
    }

    return fixtures;
}

function parseJSONFixtures(html: string, teamName: string): FAFixture[] {
    const fixtures: FAFixture[] = [];

    // Look for JSON in script tags
    const jsonPattern = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
    let jsonMatch;

    while ((jsonMatch = jsonPattern.exec(html)) !== null) {
        try {
            const data = JSON.parse(jsonMatch[1]);
            fixtures.push(...parseJSONData(data, teamName));
        } catch {
            continue;
        }
    }

    return fixtures;
}

function parseJSONData(data: any, teamName: string): FAFixture[] {
    const fixtures: FAFixture[] = [];

    // Find fixture arrays in various possible locations
    const possibleArrays = [
        data.fixtures,
        data.matches,
        data.upcoming,
        data.results,
        data
    ].filter(arr => Array.isArray(arr));

    for (const arr of possibleArrays) {
        for (const item of arr) {
            const homeTeam = item.homeTeam || item.home || item.homeClub || '';
            const awayTeam = item.awayTeam || item.away || item.awayClub || '';
            const date = item.date || item.matchDate || item.fixtureDate || '';

            if (!date || !homeTeam || !awayTeam) {continue;}
            if (!isOurMatch(homeTeam, awayTeam, teamName)) {continue;}

            fixtures.push({
                date: formatDate(date),
                time: item.time || item.kickOff || '15:00',
                homeTeam,
                awayTeam,
                opponent: isOurMatch(homeTeam, '', teamName) ? awayTeam : homeTeam,
                venue: isOurMatch(homeTeam, '', teamName) ? 'Home' : 'Away',
                competition: item.competition || item.league || 'League',
                status: normalizeStatus(item.status),
                homeScore: item.homeScore,
                awayScore: item.awayScore,
                source: 'fa_website'
            });
        }
    }

    return fixtures;
}

// ====== EMAIL EXTRACTION HELPERS ======

function extractOpposition(text: string, teamName: string): string | null {
    const patterns = [
        new RegExp(`${teamName}\\s+(?:vs?\\.?|v\\.?)\\s+([^\\n,]+)`, 'i'),
        new RegExp(`([^\\n,]+)\\s+(?:vs?\\.?|v\\.?)\\s+${teamName}`, 'i'),
        /Home:\s*([^,\n]+).*Away:\s*([^,\n]+)/i,
        /Away:\s*([^,\n]+).*Home:\s*([^,\n]+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            for (let i = 1; i < match.length; i++) {
                const team = match[i]?.trim();
                if (team && !team.toLowerCase().includes(teamName.toLowerCase())) {
                    return cleanTeamName(team);
                }
            }
        }
    }

    return null;
}

function extractDate(text: string): string | null {
    const patterns = [
        /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
        /\b(\d{1,2}-\d{1,2}-\d{4})\b/,
        /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[0];
        }
    }

    return null;
}

function extractTime(text: string): string | null {
    const patterns = [
        /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi,
        /kick\s*off[:\s]*(\d{1,2}):(\d{2})/gi,
        /start[:\s]*(\d{1,2}):(\d{2})/gi
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[0].replace(/kick\s*off[:\s]*/i, '').replace(/start[:\s]*/i, '').trim();
        }
    }

    return null;
}

function extractVenue(text: string, teamName: string): 'Home' | 'Away' {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('home ground') || lowerText.includes('home match')) {
        return 'Home';
    }
    if (lowerText.includes('away') || lowerText.includes('away match')) {
        return 'Away';
    }

    // Check if team is listed first (usually home team)
    const vsMatch = text.match(/([^v]+)\s+v\s+([^v]+)/i);
    if (vsMatch) {
        const firstTeam = vsMatch[1].trim();
        if (firstTeam.toLowerCase().includes(teamName.toLowerCase())) {
            return 'Home';
        }
    }

    return 'Away';
}

function extractCompetition(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('cup') || lowerText.includes('trophy')) {return 'Cup';}
    if (lowerText.includes('friendly')) {return 'Friendly';}
    if (lowerText.includes('playoff') || lowerText.includes('play-off')) {return 'Playoff';}

    return 'League';
}

function extractCompetitionFromRow(row: string): string {
    const compMatch = row.match(/(?:competition|league|cup)[^>]*>([^<]+)<\/td>/i);
    return compMatch ? cleanText(compMatch[1]) : 'League';
}

function extractStatus(text: string): 'scheduled' | 'postponed' | 'cancelled' | 'completed' {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('postpone') || lowerText.includes('rearrange')) {return 'postponed';}
    if (lowerText.includes('cancel') || lowerText.includes('called off')) {return 'cancelled';}
    if (lowerText.includes('final') || lowerText.includes('full time')) {return 'completed';}

    return 'scheduled';
}

function extractBadgeFromRow(row: string, opponentName: string): string | undefined {
    // Look for img tag inside the cell containing the opponent name
    const safeName = opponentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cellRegex = new RegExp(`<td[^>]*>[\\s\\S]*?${safeName}[\\s\\S]*?</td>`, 'i');
    const cellMatch = row.match(cellRegex);

    if (cellMatch) {
        const imgMatch = cellMatch[0].match(/<img[^>]+src=["']([^"']+)["']/i);
        return imgMatch ? imgMatch[1] : undefined;
    }

    return undefined;
}

// ====== UTILITY HELPERS ======

function isOurMatch(homeTeam: string, awayTeam: string, ourTeam: string): boolean {
    const home = homeTeam.toLowerCase();
    const away = awayTeam.toLowerCase();
    const our = ourTeam.toLowerCase();

    return home.includes(our) || away.includes(our) ||
        our.includes(home) || our.includes(away);
}

function cleanText(text: string): string {
    return text
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

function stripHtml(html: string): string {
    return html
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanTeamName(name: string): string {
    return name
        .replace(/\b(FC|F\.C\.|Football Club|AFC)\b/gi, '')
        .replace(/[()]/g, '')
        .trim();
}

function normalizeStatus(status: string | undefined): 'scheduled' | 'postponed' | 'cancelled' | 'completed' {
    if (!status) {return 'scheduled';}

    const lower = status.toLowerCase();
    if (lower.includes('cancel') || lower.includes('postpone')) {return 'postponed';}
    if (lower.includes('complete') || lower.includes('finish')) {return 'completed';}

    return 'scheduled';
}

function formatDate(dateStr: string): string {
    if (!dateStr) {return '';}

    // If already in DD/MM/YYYY format, return as is
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        return dateStr;
    }

    // Try to parse and format
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
    } catch {
        return dateStr;
    }

    return dateStr;
}

function deduplicateFixtures(fixtures: FAFixture[]): FAFixture[] {
    const seen = new Set<string>();
    const unique: FAFixture[] = [];

    for (const fixture of fixtures) {
        const key = `${fixture.date}|${fixture.opponent}`.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(fixture);
        }
    }

    return unique;
}

// ====== SYNC TO DATABASE ======

export async function syncFixturesToDB(
    fixtures: FAFixture[],
    env: any,
    tenantId: string
): Promise<{ added: number; updated: number; errors: string[] }> {
    const result = { added: 0, updated: 0, errors: [] as string[] };

    for (const fixture of fixtures) {
        try {
            // Check if fixture already exists
            const existing = await env.DB.prepare(`
        SELECT id FROM fixtures 
        WHERE tenant_id = ? 
        AND opponent = ? 
        AND date = ?
      `).bind(tenantId, fixture.opponent, fixture.date).first();

            if (existing) {
                // Update existing fixture
                await env.DB.prepare(`
          UPDATE fixtures SET
            time = ?,
            home_team = ?,
            away_team = ?,
            venue = ?,
            competition = ?,
            status = ?,
            home_score = ?,
            away_score = ?,
            source = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
                    fixture.time,
                    fixture.homeTeam,
                    fixture.awayTeam,
                    fixture.venue,
                    fixture.competition,
                    fixture.status,
                    fixture.homeScore ?? null,
                    fixture.awayScore ?? null,
                    fixture.source,
                    existing.id
                ).run();

                result.updated++;
            } else {
                // Insert new fixture
                await env.DB.prepare(`
          INSERT INTO fixtures (
            id, tenant_id, date, time, home_team, away_team, opponent,
            venue, competition, status, home_score, away_score, source,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(
                    crypto.randomUUID(),
                    tenantId,
                    fixture.date,
                    fixture.time,
                    fixture.homeTeam,
                    fixture.awayTeam,
                    fixture.opponent,
                    fixture.venue,
                    fixture.competition,
                    fixture.status,
                    fixture.homeScore ?? null,
                    fixture.awayScore ?? null,
                    fixture.source
                ).run();

                result.added++;
            }

            // Sync Opponent to Opponent Teams table (for badge verification)
            if (fixture.opponentBadge) {
                // Normalize opponent name for linking
                const normalizedName = fixture.opponent.toLowerCase()
                    .trim()
                    .replace(/\b(fc|f\.c\.|afc|a\.f\.c\.|football club|united|town|city)\b/gi, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .trim();

                await env.DB.prepare(`
                    INSERT INTO opponent_teams (id, tenant_id, team_name, normalized_name, reference_badge_url, status, first_seen_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 'pending', unixepoch(), unixepoch())
                    ON CONFLICT(tenant_id, normalized_name) DO UPDATE SET
                        reference_badge_url = excluded.reference_badge_url,
                        updated_at = unixepoch()
                `).bind(
                    crypto.randomUUID(),
                    tenantId,
                    fixture.opponent,
                    normalizedName,
                    fixture.opponentBadge
                ).run();
            }

        } catch (error: any) {
            result.errors.push(`Failed to sync fixture ${fixture.opponent}: ${error.message}`);
        }
    }

    return result;
}
