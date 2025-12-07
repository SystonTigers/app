/**
 * @fileoverview FA Email Integration for Fixture Parsing
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Automatic parsing of FA fixture emails and calendar integration
 *
 * FEATURES:
 * - Gmail API integration for FA emails
 * - Intelligent fixture data extraction
 * - Automatic calendar event creation
 * - Duplicate fixture prevention
 * - Multi-league support
 * - UK date format compliance
 */

// ==================== FA EMAIL CONSTANTS ====================

const FA_EMAIL_CONFIG = {
  // FA email addresses to monitor
  FA_SENDERS: [
    'fa-fixtures@thefa.com',
    'fixtures@thefa.com',
    'noreply@thefa.com',
    'fulltime@thefa.com'
  ],

  // Search terms for fixture emails
  SEARCH_TERMS: [
    'fixture',
    'match',
    'kick off',
    'postponed',
    'rearranged',
    'cancelled',
    'resigned',
    'withdrawn',
    'dropped out'
  ],

  // Fixture status keywords
  STATUS_KEYWORDS: {
    confirmed: ['confirmed', 'scheduled', 'arranged'],
    postponed: ['postponed', 'delayed', 'rearranged'],
    cancelled: ['cancelled', 'called off', 'abandoned'],
    resigned: ['resigned', 'withdrawn', 'dropped out', 'left the league', 'removed from league']
  }
};

// ==================== EMAIL PARSING FUNCTIONS ====================

/**
 * Main function to check for new FA fixture emails
 * @returns {Object} Processing results
 */
function checkForNewFAEmails() {
  console.log('📧 Checking for new FA fixture emails...');

  try {
    const config = getDynamicConfig();
    const results = {
      emailsChecked: 0,
      fixturesFound: 0,
      fixturesAdded: 0,
      resignationsProcessed: 0,
      errors: []
    };

    // Build search query for FA emails
    const searchQuery = buildFAEmailSearchQuery();
    console.log('Search query:', searchQuery);

    // Search for FA emails
    const threads = GmailApp.search(searchQuery, 0, 50); // Check last 50 emails
    results.emailsChecked = threads.length;

    console.log(`Found ${threads.length} FA email threads to check`);

    // Process each thread
    for (const thread of threads) {
      const messages = thread.getMessages();

      for (const message of messages) {
        // Check for resignation emails first
        const resignedTeam = parseResignationFromEmail(message);
        if (resignedTeam) {
          const resignResult = processResignation(resignedTeam);
          if (resignResult.success) {
            results.resignationsProcessed++;
            console.log(`✅ Processed resignation: ${resignedTeam}`);
          } else {
            results.errors.push(`Failed to process resignation for: ${resignedTeam}`);
          }
          continue; // Skip fixture parsing for resignation emails
        }

        const fixtureData = parseFixtureFromEmail(message);

        if (fixtureData) {
          results.fixturesFound++;

          // Check if fixture already exists
          if (!isFixtureAlreadyAdded(fixtureData)) {
            // Add to fixtures sheet
            const addResult = addFixtureToSheet(fixtureData);

            if (addResult.success) {
              results.fixturesAdded++;

              // Add to calendar
              addFixtureToCalendar(fixtureData);

              console.log(`✅ Added fixture: ${fixtureData.opposition} on ${fixtureData.date}`);
            } else {
              results.errors.push(`Failed to add fixture: ${addResult.error}`);
            }
          } else {
            console.log(`⚠️ Fixture already exists: ${fixtureData.opposition} on ${fixtureData.date}`);
          }
        }
      }
    }

    console.log(`📊 FA Email Check Complete: ${results.fixturesAdded} fixtures added, ${results.resignationsProcessed} resignations processed`);
    return results;

  } catch (error) {
    console.error('❌ FA email check failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Parse resignation information from FA email
 * @param {GmailMessage} message - Gmail message object
 * @returns {string|null} Team name that resigned or null
 */
function parseResignationFromEmail(message) {
  try {
    const subject = message.getSubject().toLowerCase();
    const body = message.getPlainBody().toLowerCase();
    const text = `${subject} ${body}`;

    // Check if this is a resignation email
    const isResignation = FA_EMAIL_CONFIG.STATUS_KEYWORDS.resigned.some(keyword =>
      text.includes(keyword.toLowerCase())
    );

    if (!isResignation) {
      return null;
    }

    console.log(`📧 Found resignation email: ${subject}`);

    // Extract team name patterns
    const patterns = [
      /([A-Za-z\s]+(?:FC|AFC|United|City|Town|Rovers)?)\s+(?:has|have)\s+(?:resigned|withdrawn)/i,
      /(?:resigned|withdrawn)[:\s]+([A-Za-z\s]+(?:FC|AFC|United|City|Town|Rovers)?)/i,
      /([A-Za-z\s]+(?:FC|AFC|United|City|Town|Rovers)?)\s+(?:dropped out|left the league)/i,
      /team[:\s]+([A-Za-z\s]+)(?:\s+has)?\s+(?:resigned|withdrawn)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const teamName = cleanTeamName(match[1].trim());
        if (teamName && teamName.length > 2) {
          return teamName;
        }
      }
    }

    return null;

  } catch (error) {
    console.error('Error parsing resignation email:', error);
    return null;
  }
}

/**
 * Process team resignation - call backend API to remove team
 * @param {string} teamName - Name of the team that resigned
 * @returns {Object} Processing result
 */
function processResignation(teamName) {
  try {
    const props = PropertiesService.getScriptProperties();
    const backendUrl = props.getProperty('BACKEND_API_URL') || 'https://syston-postbus.team-platform-2025.workers.dev';
    const jwt = props.getProperty('BACKEND_JWT');

    if (!jwt) {
      console.warn('No backend JWT configured - cannot process resignation via API');
      // Fall back to local sheet processing
      return removeResignedTeamFromSheets(teamName);
    }

    // Call backend API to resign team
    const response = UrlFetchApp.fetch(`${backendUrl}/api/v1/table/resign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      payload: JSON.stringify({ teamName: teamName }),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    if (responseCode >= 200 && responseCode < 300) {
      console.log(`✅ Team ${teamName} resigned via API`);
      // Also update local sheets
      removeResignedTeamFromSheets(teamName);
      return { success: true };
    } else {
      console.error(`❌ API error: ${response.getContentText()}`);
      // Fall back to local processing
      return removeResignedTeamFromSheets(teamName);
    }

  } catch (error) {
    console.error('Error processing resignation:', error);
    // Fall back to local processing
    return removeResignedTeamFromSheets(teamName);
  }
}

/**
 * Remove resigned team from local Google Sheets and recalculate league table
 * @param {string} teamName - Team name to remove
 * @returns {Object} Result
 */
function removeResignedTeamFromSheets(teamName) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    let removed = 0;

    // Step 1: Get results against the resigned team BEFORE deleting
    const resultsSheet = spreadsheet.getSheetByName('Results');
    const resultsToDeduct = [];
    
    if (resultsSheet) {
      const resultsData = resultsSheet.getDataRange().getValues();
      const teamLower = teamName.toLowerCase();
      
      // Find matches against the resigned team (typically: Date, Opposition, OurScore, TheirScore, ...)
      for (let i = 1; i < resultsData.length; i++) {
        const row = resultsData[i];
        const opponent = String(row[1] || '').toLowerCase();
        
        if (opponent.includes(teamLower)) {
          resultsToDeduct.push({
            ourScore: Number(row[2]) || 0,
            theirScore: Number(row[3]) || 0
          });
        }
      }
      
      // Now remove the rows
      removed += removeTeamRowsFromSheet(resultsSheet, teamName, 1);
    }

    // Step 2: Remove from Fixtures sheet
    const fixturesSheet = spreadsheet.getSheetByName('Fixtures');
    if (fixturesSheet) {
      removed += removeTeamRowsFromSheet(fixturesSheet, teamName, 1); // Column B (opposition)
    }

    // Step 3: Update League Table - recalculate based on removed results
    const tableSheet = spreadsheet.getSheetByName('League Table');
    if (tableSheet && resultsToDeduct.length > 0) {
      recalculateLeagueTableAfterResignation(tableSheet, teamName, resultsToDeduct);
    } else if (tableSheet) {
      // Just remove the resigned team row
      removeTeamRowsFromSheet(tableSheet, teamName, 0);
    }

    console.log(`✅ Removed ${removed} rows for resigned team: ${teamName}`);
    return { success: true, rowsRemoved: removed };

  } catch (error) {
    console.error('Error removing resigned team from sheets:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Recalculate league table after a team resignation
 * Deducts points/goals from your team based on matches played against resigned team
 * @param {Sheet} tableSheet - League Table sheet
 * @param {string} resignedTeam - Name of resigned team
 * @param {Array} resultsToDeduct - Array of {ourScore, theirScore} for matches against resigned team
 */
function recalculateLeagueTableAfterResignation(tableSheet, resignedTeam, resultsToDeduct) {
  const config = getDynamicConfig();
  const ourTeamName = config.TEAM_NAME || config.TEAM_SHORT;
  
  const data = tableSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find column indices (typical: Position, Team, P, W, D, L, GF, GA, GD, Pts)
  const cols = {
    team: headers.findIndex(h => /team/i.test(h)),
    played: headers.findIndex(h => /^p$/i.test(h) || /played/i.test(h)),
    won: headers.findIndex(h => /^w$/i.test(h) || /won/i.test(h)),
    drawn: headers.findIndex(h => /^d$/i.test(h) || /drawn/i.test(h)),
    lost: headers.findIndex(h => /^l$/i.test(h) || /lost/i.test(h)),
    gf: headers.findIndex(h => /^gf$/i.test(h) || /goals?\s*for/i.test(h)),
    ga: headers.findIndex(h => /^ga$/i.test(h) || /goals?\s*against/i.test(h)),
    gd: headers.findIndex(h => /^gd$/i.test(h) || /goal\s*diff/i.test(h)),
    pts: headers.findIndex(h => /^pts$/i.test(h) || /points/i.test(h))
  };
  
  // Calculate deductions from our team
  let deductPlayed = 0, deductWon = 0, deductDrawn = 0, deductLost = 0;
  let deductGF = 0, deductGA = 0, deductPts = 0;
  
  for (const match of resultsToDeduct) {
    deductPlayed++;
    deductGF += match.ourScore;
    deductGA += match.theirScore;
    
    if (match.ourScore > match.theirScore) {
      deductWon++;
      deductPts += 3;
    } else if (match.ourScore === match.theirScore) {
      deductDrawn++;
      deductPts += 1;
    } else {
      deductLost++;
    }
  }
  
  // Find and update our team's row
  const resignedLower = resignedTeam.toLowerCase();
  const ourTeamLower = ourTeamName.toLowerCase();
  const rowsToDelete = [];
  
  for (let i = 1; i < data.length; i++) {
    const teamCell = String(data[i][cols.team] || '').toLowerCase();
    
    // Remove resigned team
    if (teamCell.includes(resignedLower)) {
      rowsToDelete.push(i + 1); // 1-indexed
      continue;
    }
    
    // Update our team's stats
    if (teamCell.includes(ourTeamLower)) {
      const row = i + 1; // 1-indexed for sheet
      
      if (cols.played >= 0) {
        const current = Number(data[i][cols.played]) || 0;
        tableSheet.getRange(row, cols.played + 1).setValue(Math.max(0, current - deductPlayed));
      }
      if (cols.won >= 0) {
        const current = Number(data[i][cols.won]) || 0;
        tableSheet.getRange(row, cols.won + 1).setValue(Math.max(0, current - deductWon));
      }
      if (cols.drawn >= 0) {
        const current = Number(data[i][cols.drawn]) || 0;
        tableSheet.getRange(row, cols.drawn + 1).setValue(Math.max(0, current - deductDrawn));
      }
      if (cols.lost >= 0) {
        const current = Number(data[i][cols.lost]) || 0;
        tableSheet.getRange(row, cols.lost + 1).setValue(Math.max(0, current - deductLost));
      }
      if (cols.gf >= 0) {
        const current = Number(data[i][cols.gf]) || 0;
        tableSheet.getRange(row, cols.gf + 1).setValue(Math.max(0, current - deductGF));
      }
      if (cols.ga >= 0) {
        const current = Number(data[i][cols.ga]) || 0;
        tableSheet.getRange(row, cols.ga + 1).setValue(Math.max(0, current - deductGA));
      }
      if (cols.pts >= 0) {
        const current = Number(data[i][cols.pts]) || 0;
        tableSheet.getRange(row, cols.pts + 1).setValue(Math.max(0, current - deductPts));
      }
      
      // Recalculate GD if column exists
      if (cols.gd >= 0 && cols.gf >= 0 && cols.ga >= 0) {
        const newGF = Number(tableSheet.getRange(row, cols.gf + 1).getValue()) || 0;
        const newGA = Number(tableSheet.getRange(row, cols.ga + 1).getValue()) || 0;
        tableSheet.getRange(row, cols.gd + 1).setValue(newGF - newGA);
      }
      
      console.log(`✅ Updated ${ourTeamName}: -${deductPlayed}P, -${deductPts}pts, -${deductGF}GF, -${deductGA}GA`);
    }
  }
  
  // Delete resigned team rows (backwards to avoid index shifting)
  rowsToDelete.reverse().forEach(rowIndex => {
    tableSheet.deleteRow(rowIndex);
  });
  
  // Sort table by points (descending), then GD
  if (cols.pts >= 0) {
    const dataRange = tableSheet.getRange(2, 1, tableSheet.getLastRow() - 1, tableSheet.getLastColumn());
    dataRange.sort([
      { column: cols.pts + 1, ascending: false },
      { column: cols.gd >= 0 ? cols.gd + 1 : cols.pts + 1, ascending: false }
    ]);
    
    // Update positions
    for (let i = 2; i <= tableSheet.getLastRow(); i++) {
      tableSheet.getRange(i, 1).setValue(i - 1); // Position column
    }
  }
}

/**
 * Remove rows containing team name from a sheet
 * @param {Sheet} sheet - Google Sheet
 * @param {string} teamName - Team name to match
 * @param {number} columnIndex - Column index to check (0-based)
 * @returns {number} Number of rows removed
 */
function removeTeamRowsFromSheet(sheet, teamName, columnIndex) {
  const data = sheet.getDataRange().getValues();
  const teamLower = teamName.toLowerCase();
  let removed = 0;

  // Find rows to delete (iterate backwards to avoid index shifting)
  for (let i = data.length - 1; i >= 1; i--) { // Skip header row
    const cellValue = String(data[i][columnIndex] || '').toLowerCase();
    if (cellValue.includes(teamLower)) {
      sheet.deleteRow(i + 1); // Sheet rows are 1-indexed
      removed++;
    }
  }

  return removed;
}

/**
 * Build Gmail search query for FA emails
 * @returns {string} Gmail search query
 */
function buildFAEmailSearchQuery() {
  const config = getDynamicConfig();

  // Get date range (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateString = formatUKDate(thirtyDaysAgo, 'YYYY/MM/DD');

  // Build sender query
  const senderQuery = FA_EMAIL_CONFIG.FA_SENDERS
    .map(sender => `from:${sender}`)
    .join(' OR ');

  // Build subject query
  const subjectQuery = FA_EMAIL_CONFIG.SEARCH_TERMS
    .map(term => `subject:${term}`)
    .join(' OR ');

  // Combine queries
  return `(${senderQuery}) AND (${subjectQuery}) AND after:${dateString} AND is:unread`;
}

/**
 * Parse fixture data from FA email
 * @param {GmailMessage} message - Gmail message object
 * @returns {Object|null} Parsed fixture data or null
 */
function parseFixtureFromEmail(message) {
  try {
    const subject = message.getSubject();
    const body = message.getPlainBody();
    const htmlBody = message.getBody();

    console.log(`📧 Parsing email: ${subject}`);

    // Extract fixture information
    const fixtureData = {
      source: 'FA Email',
      emailSubject: subject,
      emailDate: message.getDate(),
      opposition: extractOpposition(subject, body),
      date: extractMatchDate(subject, body),
      time: extractKickOffTime(subject, body),
      venue: extractVenue(subject, body),
      competition: extractCompetition(subject, body),
      status: extractStatus(subject, body),
      referee: extractReferee(body),
      notes: extractNotes(body)
    };

    // Validate required fields
    if (fixtureData.opposition && fixtureData.date) {
      console.log(`✅ Valid fixture found: ${fixtureData.opposition}`);
      return fixtureData;
    } else {
      console.log(`⚠️ Incomplete fixture data in email: ${subject}`);
      return null;
    }

  } catch (error) {
    console.error('Error parsing fixture email:', error);
    return null;
  }
}

/**
 * Extract opposition team name from email
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {string} Opposition team name
 */
function extractOpposition(subject, body) {
  const config = getDynamicConfig();
  const ourTeam = config.TEAM_NAME;
  const ourShortName = config.TEAM_SHORT;

  // Common patterns for opposition extraction
  const patterns = [
    // "TeamA vs TeamB" format
    new RegExp(`${ourShortName}\\s+(?:vs?\\.?|v\\.?)\\s+([^\\n,]+)`, 'i'),
    new RegExp(`([^\\n,]+)\\s+(?:vs?\\.?|v\\.?)\\s+${ourShortName}`, 'i'),

    // "TeamA v TeamB" format
    new RegExp(`${ourTeam}\\s+v\\s+([^\\n,]+)`, 'i'),
    new RegExp(`([^\\n,]+)\\s+v\\s+${ourTeam}`, 'i'),

    // "Home: TeamA Away: TeamB" format
    /Home:\s*([^,\n]+).*Away:\s*([^,\n]+)/i,
    /Away:\s*([^,\n]+).*Home:\s*([^,\n]+)/i
  ];

  // Try each pattern
  for (const pattern of patterns) {
    const match = subject.match(pattern) || body.match(pattern);
    if (match) {
      // Determine which capture group is the opposition
      for (let i = 1; i < match.length; i++) {
        const team = match[i].trim();
        if (team && !team.toLowerCase().includes(ourTeam.toLowerCase()) &&
            !team.toLowerCase().includes(ourShortName.toLowerCase())) {
          return cleanTeamName(team);
        }
      }
    }
  }

  return null;
}

/**
 * Extract match date from email
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {string} Match date in UK format
 */
function extractMatchDate(subject, body) {
  const text = `${subject} ${body}`;

  // Date patterns to match
  const patterns = [
    // DD/MM/YYYY format
    /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g,
    // DD-MM-YYYY format
    /\b(\d{1,2}-\d{1,2}-\d{4})\b/g,
    // DD Month YYYY format
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi,
    // Month DD, YYYY format
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const date = parseUKDate(match) || new Date(match);
        if (date && !isNaN(date.getTime())) {
          // Check if date is in the future or recent past (within 7 days)
          const today = getCurrentUKDate();
          const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

          if (daysDiff >= -7 && daysDiff <= 365) { // Within last week to next year
            return formatUKDate(date);
          }
        }
      }
    }
  }

  return null;
}

/**
 * Extract kick-off time from email
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {string} Kick-off time (HH:mm format)
 */
function extractKickOffTime(subject, body) {
  const text = `${subject} ${body}`;

  // Time patterns
  const patterns = [
    /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi,
    /\b(\d{1,2})\.(\d{2})\s*(am|pm)?\b/gi,
    /kick\s*off[:\s]*(\d{1,2}):(\d{2})/gi,
    /start[:\s]*(\d{1,2}):(\d{2})/gi
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const timeStr = match[0];
      // Convert to 24-hour format
      let [_, hours, minutes, period] = timeStr.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i) || [];

      if (hours && minutes) {
        hours = parseInt(hours);
        minutes = parseInt(minutes);

        if (period && period.toLowerCase() === 'pm' && hours < 12) {
          hours += 12;
        } else if (period && period.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }
  }

  return null;
}

/**
 * Extract venue information from email
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {string} Venue information
 */
function extractVenue(subject, body) {
  const config = getDynamicConfig();
  const text = `${subject} ${body}`;

  // Venue patterns
  const patterns = [
    /venue[:\s]*([^\n,]+)/gi,
    /ground[:\s]*([^\n,]+)/gi,
    /at[:\s]*([^\n,]+ground[^\n,]*)/gi,
    /home[:\s]*team[:\s]*([^\n,]+)/gi,
    /away[:\s]*team[:\s]*([^\n,]+)/gi
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const venue = match[1].trim();

      // Determine if home or away
      if (venue.toLowerCase().includes(config.TEAM_NAME.toLowerCase()) ||
          venue.toLowerCase().includes(config.STADIUM_NAME.toLowerCase())) {
        return 'Home';
      } else {
        return `Away - ${venue}`;
      }
    }
  }

  return 'TBC';
}

/**
 * Extract competition information from email
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {string} Competition name
 */
function extractCompetition(subject, body) {
  const text = `${subject} ${body}`.toLowerCase();

  // Competition keywords
  const competitions = {
    'League': ['league', 'division'],
    'Cup': ['cup', 'trophy'],
    'Friendly': ['friendly', 'testimonial'],
    'Playoff': ['playoff', 'play-off', 'promotion']
  };

  for (const [comp, keywords] of Object.entries(competitions)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return comp;
    }
  }

  return 'League'; // Default
}

/**
 * Extract fixture status from email
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {string} Fixture status
 */
function extractStatus(subject, body) {
  const text = `${subject} ${body}`.toLowerCase();

  for (const [status, keywords] of Object.entries(FA_EMAIL_CONFIG.STATUS_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  return 'Scheduled';
}

/**
 * Extract referee information from email
 * @param {string} body - Email body
 * @returns {string} Referee name
 */
function extractReferee(body) {
  const patterns = [
    /referee[:\s]*([^\n,]+)/gi,
    /ref[:\s]*([^\n,]+)/gi,
    /official[:\s]*([^\n,]+)/gi
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return '';
}

/**
 * Extract additional notes from email
 * @param {string} body - Email body
 * @returns {string} Additional notes
 */
function extractNotes(body) {
  const notePatterns = [
    /notes?[:\s]*([^\n]+)/gi,
    /additional[:\s]*([^\n]+)/gi,
    /please note[:\s]*([^\n]+)/gi
  ];

  const notes = [];
  for (const pattern of notePatterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      notes.push(match[1].trim());
    }
  }

  return notes.join('; ');
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Clean team name (remove common prefixes/suffixes)
 * @param {string} teamName - Raw team name
 * @returns {string} Cleaned team name
 */
function cleanTeamName(teamName) {
  return teamName
    .replace(/\b(FC|F\.C\.|Football Club|AFC)\b/gi, '')
    .replace(/[()]/g, '')
    .trim();
}

/**
 * Check if fixture already exists in sheets
 * @param {Object} fixtureData - Fixture data to check
 * @returns {boolean} True if fixture already exists
 */
function isFixtureAlreadyAdded(fixtureData) {
  try {
    const fixturesSheet = SheetUtils.getSheet('Fixtures');
    if (!fixturesSheet) return false;

    const data = fixturesSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const existingDate = formatUKDate(row[0]);
      const existingOpposition = row[1];

      if (existingDate === fixtureData.date &&
          existingOpposition.toLowerCase().includes(fixtureData.opposition.toLowerCase())) {
        return true;
      }
    }

    return false;

  } catch (error) {
    console.error('Error checking existing fixtures:', error);
    return false;
  }
}

/**
 * Add fixture to Google Sheets
 * @param {Object} fixtureData - Fixture data to add
 * @returns {Object} Add result
 */
function addFixtureToSheet(fixtureData) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

    // Get or create Fixtures sheet
    let fixturesSheet = spreadsheet.getSheetByName('Fixtures');
    if (!fixturesSheet) {
      fixturesSheet = spreadsheet.insertSheet('Fixtures');

      // Add headers
      fixturesSheet.getRange(1, 1, 1, 10).setValues([[
        'Date', 'Opposition', 'Kick Off', 'Venue', 'Venue Details', 'Competition', 'Importance', 'Notes', 'Status', 'Source'
      ]]);

      // Format headers
      const headerRange = fixturesSheet.getRange(1, 1, 1, 10);
      headerRange.setBackground('#007bff');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
    }

    // Add new fixture
    const newRow = fixturesSheet.getLastRow() + 1;
    fixturesSheet.getRange(newRow, 1, 1, 10).setValues([[
      fixtureData.date,
      fixtureData.opposition,
      fixtureData.time || '',
      fixtureData.venue || 'TBC',
      '',
      fixtureData.competition || 'League',
      'Normal',
      fixtureData.notes || '',
      fixtureData.status || 'Scheduled',
      'FA Email'
    ]]);

    console.log(`✅ Fixture added to sheet: ${fixtureData.opposition}`);
    return { success: true };

  } catch (error) {
    console.error('Error adding fixture to sheet:', error);
    return { success: false, error: error.toString() };
  }
}

// ==================== CALENDAR INTEGRATION ====================

/**
 * Add fixture to Google Calendar
 * @param {Object} fixtureData - Fixture data
 * @returns {Object} Calendar add result
 */
function addFixtureToCalendar(fixtureData) {
  try {
    const config = getDynamicConfig();

    // Parse date and time
    const matchDate = parseUKDate(fixtureData.date);
    if (!matchDate) {
      console.warn('Invalid match date for calendar:', fixtureData.date);
      return { success: false, error: 'Invalid date' };
    }

    // Set kick-off time
    if (fixtureData.time) {
      const [hours, minutes] = fixtureData.time.split(':');
      matchDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      matchDate.setHours(15, 0, 0, 0); // Default 3pm kick-off
    }

    // Calculate end time (2 hours later)
    const endTime = new Date(matchDate.getTime() + (2 * 60 * 60 * 1000));

    // Create event
    const eventTitle = `${config.TEAM_SHORT} vs ${fixtureData.opposition}`;
    const eventDescription = `
${config.TEAM_NAME} vs ${fixtureData.opposition}
Competition: ${fixtureData.competition}
Venue: ${fixtureData.venue}
${fixtureData.notes ? 'Notes: ' + fixtureData.notes : ''}

Added automatically from FA email
    `.trim();

    CalendarApp.getDefaultCalendar().createEvent(
      eventTitle,
      matchDate,
      endTime,
      {
        description: eventDescription,
        location: fixtureData.venue
      }
    );

    console.log(`📅 Calendar event created: ${eventTitle}`);
    return { success: true };

  } catch (error) {
    console.error('Error adding to calendar:', error);
    return { success: false, error: error.toString() };
  }
}

// ==================== AUTOMATION FUNCTIONS ====================

/**
 * Set up automatic FA email checking (daily trigger)
 */
function setupFAEmailAutomation() {
  try {
    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'checkForNewFAEmails') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Create daily trigger at 9 AM
    ScriptApp.newTrigger('checkForNewFAEmails')
      .timeBased()
      .everyDays(1)
      .atHour(9)
      .create();

    console.log('✅ FA email automation trigger created');
    return { success: true };

  } catch (error) {
    console.error('Error setting up FA email automation:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Test FA email parsing functionality
 * @returns {Object} Test results
 */
function testFAEmailParsing() {
  console.log('🧪 Testing FA Email Parsing...');

  try {
    // Test data
    const clubName = (typeof getConfigValue === 'function')
      ? getConfigValue('SYSTEM.CLUB_NAME', 'Your Football Club')
      : 'Your Football Club';
    const testEmail = {
      subject: `Fixture Confirmation: ${clubName} vs Local Rivals FC`,
      body: `
        Fixture Details:
        Date: 25/12/2024
        Kick Off: 15:00
        Venue: Home Ground
        Competition: League
        Referee: John Smith

        Please note: This fixture is confirmed.
      `
    };

    // Mock message object
    const mockMessage = {
      getSubject: () => testEmail.subject,
      getPlainBody: () => testEmail.body,
      getBody: () => testEmail.body,
      getDate: () => new Date()
    };

    // Test parsing
    const parsed = parseFixtureFromEmail(mockMessage);

    const tests = [
      { name: 'Opposition extracted', passed: parsed && parsed.opposition === 'Local Rivals FC' },
      { name: 'Date extracted', passed: parsed && parsed.date === '25/12/2024' },
      { name: 'Time extracted', passed: parsed && parsed.time === '15:00' },
      { name: 'Status extracted', passed: parsed && parsed.status === 'Confirmed' }
    ];

    const passed = tests.filter(t => t.passed).length;
    const total = tests.length;

    console.log(`✅ FA Email Tests: ${passed}/${total} passed`);

    return {
      success: passed === total,
      passed: passed,
      total: total,
      tests: tests,
      parsed: parsed
    };

  } catch (error) {
    console.error('❌ FA Email test failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}