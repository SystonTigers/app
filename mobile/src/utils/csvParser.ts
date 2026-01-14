/**
 * CSV Parser Utility
 * Parses CSV content into structured data for preview and validation
 */

export interface ParsedCSV {
    headers: string[];
    rows: string[][];
    rowCount: number;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}

/**
 * Parse CSV text into headers and rows
 */
export function parseCSV(csvText: string): ParsedCSV {
    const lines = csvText.trim().split('\n').filter(line => line.trim());

    if (lines.length < 1) {
        return { headers: [], rows: [], rowCount: 0 };
    }

    // Parse header row
    const headers = parseCSVLine(lines[0]).map(h => h.trim());

    // Parse data rows
    const rows: string[][] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length > 0 && values.some(v => v.trim())) {
            rows.push(values.map(v => v.trim()));
        }
    }

    return {
        headers,
        rows,
        rowCount: rows.length,
    };
}

/**
 * Validate CSV headers for specific import type
 */
export function validateHeaders(
    headers: string[],
    importType: string
): { valid: boolean; message?: string } {
    const normalizedHeaders = headers.map(h =>
        h.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    );

    const requiredFields: { [key: string]: string[] } = {
        players: ['name'],
        fixtures: ['date', 'opponent'],
        results: ['date', 'opponent'],
        'match-events': ['date', 'player', 'event_type'],
    };

    const required = requiredFields[importType] || [];
    const missing = required.filter(
        field => !normalizedHeaders.some(h => h.includes(field))
    );

    if (missing.length > 0) {
        return {
            valid: false,
            message: `Missing required fields: ${missing.join(', ')}`,
        };
    }

    return { valid: true };
}
