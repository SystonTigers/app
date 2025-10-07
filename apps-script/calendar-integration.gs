/**
 * @fileoverview Google Calendar Integration for Football Fixtures
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Comprehensive calendar integration for fixture management
 *
 * FEATURES:
 * - Automatic calendar event creation for fixtures
 * - Match reminders and notifications
 * - Team calendar sharing
 * - Event updates and cancellations
 * - Calendar export functionality
 */

// ==================== CALENDAR CONSTANTS ====================

const CALENDAR_CONFIG = {
  // Event colors (Google Calendar color IDs)
  COLORS: {
    LEAGUE: '9', // Blue
    CUP: '11',   // Red
    FRIENDLY: '2', // Green
    POSTPONED: '8', // Gray
    CANCELLED: '8'  // Gray
  },

  // Reminder settings (minutes before event)
  REMINDERS: {
    MATCH_DAY: [60, 30], // 1 hour and 30 minutes before
    TRAINING: [30],      // 30 minutes before
    DEADLINE: [1440, 60] // 24 hours and 1 hour before
  },

  // Event duration defaults (minutes)
  DURATIONS: {
    MATCH: 120,        // 2 hours
    TRAINING: 90,      // 1.5 hours
    MEETING: 60        // 1 hour
  }
};

// ==================== CALENDAR MANAGEMENT ====================

/**
 * Get or create football club calendar
 * @returns {GoogleAppsScript.Calendar.Calendar} Club calendar
 */
function getClubCalendar() {
  try {
    const config = getDynamicConfig();
    const calendarName = `${config.TEAM_NAME} - Fixtures & Events`;

    // Try to find existing calendar
    const calendars = CalendarApp.getAllCalendars();
    for (const calendar of calendars) {
      if (calendar.getName() === calendarName) {
        console.log(`📅 Found existing calendar: ${calendarName}`);
        return calendar;
      }
    }

    // Create new calendar if not found
    const newCalendar = CalendarApp.createCalendar(calendarName, {
      summary: `Official fixtures and events for ${config.TEAM_NAME}`,
      description: `Automatically managed calendar for ${config.TEAM_NAME} football club`,
      location: config.STADIUM_NAME || '',
      timeZone: UK_TIMEZONE
    });

    console.log(`📅 Created new calendar: ${calendarName}`);
    return newCalendar;

  } catch (error) {
    console.error('Error getting club calendar:', error);
    // Fallback to default calendar
    return CalendarApp.getDefaultCalendar();
  }
}

/**
 * Add fixture to calendar
 * @param {Object} fixtureData - Fixture information
 * @returns {Object} Calendar event creation result
 */
function addFixtureToCalendar(fixtureData) {
  try {
    const config = getDynamicConfig();
    const calendar = getClubCalendar();

    // Parse fixture date and time
    const matchDate = parseUKDate(fixtureData.date);
    if (!matchDate) {
      throw new Error(`Invalid fixture date: ${fixtureData.date}`);
    }

    // Set kick-off time
    const kickOffTime = fixtureData.time || fixtureData.kickoff || '15:00';
    const [hours, minutes] = kickOffTime.split(':');
    matchDate.setHours(parseInt(hours) || 15, parseInt(minutes) || 0, 0, 0);

    // Calculate end time
    const endTime = new Date(matchDate.getTime() + (CALENDAR_CONFIG.DURATIONS.MATCH * 60 * 1000));

    // Create event title
    const isHome = fixtureData.venue === 'Home' || fixtureData.venue?.toLowerCase().includes('home');
    const eventTitle = isHome
      ? `${config.TEAM_SHORT} vs ${fixtureData.opposition}`
      : `${fixtureData.opposition} vs ${config.TEAM_SHORT}`;

    // Create event description
    const eventDescription = buildEventDescription(fixtureData, config);

    // Determine event location
    const eventLocation = determineEventLocation(fixtureData, config);

    // Create calendar event
    const event = calendar.createEvent(
      eventTitle,
      matchDate,
      endTime,
      {
        description: eventDescription,
        location: eventLocation
      }
    );

    // Set event color based on competition
    const colorId = CALENDAR_CONFIG.COLORS[fixtureData.competition?.toUpperCase()] || CALENDAR_CONFIG.COLORS.LEAGUE;
    event.setColor(colorId);

    // Add reminders
    event.removeAllReminders();
    CALENDAR_CONFIG.REMINDERS.MATCH_DAY.forEach(minutes => {
      event.addEmailReminder(minutes);
      event.addPopupReminder(minutes);
    });

    // Add custom properties for identification
    event.setTag('club_fixture', 'true');
    event.setTag('opposition', fixtureData.opposition);
    event.setTag('season', config.SEASON);

    console.log(`📅 Calendar event created: ${eventTitle} on ${formatUKDate(matchDate)}`);

    return {
      success: true,
      eventId: event.getId(),
      eventTitle: eventTitle,
      eventDate: formatUKDate(matchDate),
      eventTime: kickOffTime
    };

  } catch (error) {
    console.error('Error adding fixture to calendar:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Build comprehensive event description
 * @param {Object} fixtureData - Fixture data
 * @param {Object} config - Club configuration
 * @returns {string} Event description
 */
function buildEventDescription(fixtureData, config) {
  const description = [];

  // Basic match info
  description.push(`🏈 ${config.TEAM_NAME} Football Match`);
  description.push('');

  // Opposition and competition
  description.push(`⚽ Opposition: ${fixtureData.opposition}`);
  description.push(`🏆 Competition: ${fixtureData.competition || 'League'}`);
  description.push(`📅 Season: ${config.SEASON}`);

  if (fixtureData.venue) {
    description.push(`🏟️ Venue: ${fixtureData.venue}`);
  }

  if (fixtureData.venueDetails) {
    description.push(`📍 Ground: ${fixtureData.venueDetails}`);
  }

  if (fixtureData.referee) {
    description.push(`👨‍⚖️ Referee: ${fixtureData.referee}`);
  }

  // Match importance
  if (fixtureData.importance && fixtureData.importance !== 'Normal') {
    description.push(`⭐ Importance: ${fixtureData.importance}`);
  }

  // Additional notes
  if (fixtureData.notes) {
    description.push('');
    description.push('📝 Notes:');
    description.push(fixtureData.notes);
  }

  // Add website and contact info
  if (config.WEBSITE_URL) {
    description.push('');
    description.push(`🌐 Club Website: ${config.WEBSITE_URL}`);
  }

  // Auto-generation note
  description.push('');
  description.push('🤖 Automatically added by Football Club Automation System');

  return description.join('\n');
}

/**
 * Determine event location
 * @param {Object} fixtureData - Fixture data
 * @param {Object} config - Club configuration
 * @returns {string} Event location
 */
function determineEventLocation(fixtureData, config) {
  if (fixtureData.venueDetails) {
    return fixtureData.venueDetails;
  }

  if (fixtureData.venue === 'Home' && config.STADIUM_NAME) {
    return config.STADIUM_NAME;
  }

  if (fixtureData.venue && fixtureData.venue !== 'Home' && fixtureData.venue !== 'Away') {
    return fixtureData.venue;
  }

  return 'Venue TBC';
}

// ==================== CALENDAR UPDATES ====================

/**
 * Update existing calendar event
 * @param {Object} fixtureData - Updated fixture data
 * @param {string} opposition - Opposition team name (for finding event)
 * @returns {Object} Update result
 */
function updateCalendarEvent(fixtureData, opposition) {
  try {
    const calendar = getClubCalendar();
    const config = getDynamicConfig();

    // Find existing event
    const startDate = parseUKDate(fixtureData.date);
    const endDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000)); // Next day

    const events = calendar.getEvents(startDate, endDate);
    const matchEvent = events.find(event =>
      event.getTitle().includes(opposition) &&
      event.getTag('club_fixture') === 'true'
    );

    if (!matchEvent) {
      console.log(`⚠️ Calendar event not found for ${opposition}`);
      return { success: false, error: 'Event not found' };
    }

    // Update event details
    const kickOffTime = fixtureData.time || '15:00';
    const [hours, minutes] = kickOffTime.split(':');
    const newStartTime = new Date(startDate);
    newStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const newEndTime = new Date(newStartTime.getTime() + (CALENDAR_CONFIG.DURATIONS.MATCH * 60 * 1000));

    // Update event
    matchEvent.setTime(newStartTime, newEndTime);
    matchEvent.setDescription(buildEventDescription(fixtureData, config));
    matchEvent.setLocation(determineEventLocation(fixtureData, config));

    // Update color if competition changed
    if (fixtureData.competition) {
      const colorId = CALENDAR_CONFIG.COLORS[fixtureData.competition.toUpperCase()] || CALENDAR_CONFIG.COLORS.LEAGUE;
      matchEvent.setColor(colorId);
    }

    console.log(`📅 Calendar event updated: ${matchEvent.getTitle()}`);

    return {
      success: true,
      eventTitle: matchEvent.getTitle(),
      eventDate: formatUKDate(newStartTime)
    };

  } catch (error) {
    console.error('Error updating calendar event:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Cancel calendar event (mark as cancelled, don't delete)
 * @param {string} opposition - Opposition team name
 * @param {string} originalDate - Original fixture date
 * @returns {Object} Cancellation result
 */
function cancelCalendarEvent(opposition, originalDate) {
  try {
    const calendar = getClubCalendar();
    const config = getDynamicConfig();

    // Find event to cancel
    const startDate = parseUKDate(originalDate);
    const endDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000));

    const events = calendar.getEvents(startDate, endDate);
    const matchEvent = events.find(event =>
      event.getTitle().includes(opposition) &&
      event.getTag('club_fixture') === 'true'
    );

    if (!matchEvent) {
      return { success: false, error: 'Event not found' };
    }

    // Update title to show cancellation
    const cancelledTitle = `[CANCELLED] ${matchEvent.getTitle()}`;
    matchEvent.setTitle(cancelledTitle);

    // Update description
    const description = matchEvent.getDescription() + '\n\n🚫 MATCH CANCELLED';
    matchEvent.setDescription(description);

    // Set to cancelled color
    matchEvent.setColor(CALENDAR_CONFIG.COLORS.CANCELLED);

    // Add cancellation tag
    matchEvent.setTag('status', 'cancelled');

    console.log(`📅 Calendar event cancelled: ${cancelledTitle}`);

    return {
      success: true,
      eventTitle: cancelledTitle
    };

  } catch (error) {
    console.error('Error cancelling calendar event:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================== CALENDAR SHARING ====================

/**
 * Share club calendar with team members
 * @param {Array} emailAddresses - Array of email addresses to share with
 * @param {string} role - Calendar role ('reader', 'writer', 'owner')
 * @returns {Object} Sharing result
 */
function shareClubCalendar(emailAddresses, role = 'reader') {
  try {
    const calendar = getClubCalendar();
    const results = [];

    for (const email of emailAddresses) {
      try {
        calendar.addEditor(email);
        results.push({ email: email, success: true });
        console.log(`📅 Calendar shared with: ${email}`);
      } catch (error) {
        results.push({ email: email, success: false, error: error.toString() });
        console.error(`Error sharing calendar with ${email}:`, error);
      }
    }

    return {
      success: true,
      results: results,
      sharedWith: results.filter(r => r.success).length
    };

  } catch (error) {
    console.error('Error sharing club calendar:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get calendar sharing URL
 * @returns {string} Public calendar URL
 */
function getCalendarSharingURL() {
  try {
    const calendar = getClubCalendar();
    const calendarId = calendar.getId();

    // Make calendar public (readable)
    calendar.setSelected(true);

    // Return public URL
    const publicUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=${UK_TIMEZONE}`;

    console.log(`📅 Calendar sharing URL generated: ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    console.error('Error getting calendar sharing URL:', error);
    return null;
  }
}

// ==================== FIXTURE SYNCHRONIZATION ====================

/**
 * Sync all fixtures from sheet to calendar
 * @returns {Object} Sync results
 */
function syncFixturesToCalendar() {
  try {
    console.log('📅 Syncing all fixtures to calendar...');

    const fixturesSheet = SheetUtils.getSheet('Fixtures');
    if (!fixturesSheet) {
      throw new Error('Fixtures sheet not found');
    }

    const data = fixturesSheet.getDataRange().getValues();
    const headers = data[0];
    const results = {
      processed: 0,
      added: 0,
      updated: 0,
      errors: []
    };

    // Process each fixture
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[1]) continue; // Skip empty rows

      results.processed++;

      const fixtureData = {
        date: formatUKDate(row[0]),
        opposition: row[1],
        time: row[2] || '15:00',
        venue: row[3] || 'TBC',
        venueDetails: row[4] || '',
        competition: row[5] || 'League',
        importance: row[6] || 'Normal',
        notes: row[7] || '',
        status: row[8] || 'Scheduled'
      };

      // Skip cancelled fixtures
      if (fixtureData.status.toLowerCase() === 'cancelled') {
        continue;
      }

      try {
        // Check if event already exists
        const existingEvent = findCalendarEvent(fixtureData.opposition, fixtureData.date);

        if (existingEvent) {
          // Update existing event
          const updateResult = updateCalendarEvent(fixtureData, fixtureData.opposition);
          if (updateResult.success) {
            results.updated++;
          } else {
            results.errors.push(`Update failed: ${fixtureData.opposition} - ${updateResult.error}`);
          }
        } else {
          // Add new event
          const addResult = addFixtureToCalendar(fixtureData);
          if (addResult.success) {
            results.added++;
          } else {
            results.errors.push(`Add failed: ${fixtureData.opposition} - ${addResult.error}`);
          }
        }

      } catch (error) {
        results.errors.push(`Error processing ${fixtureData.opposition}: ${error.toString()}`);
      }
    }

    console.log(`📅 Calendar sync complete: ${results.added} added, ${results.updated} updated`);

    return results;

  } catch (error) {
    console.error('Error syncing fixtures to calendar:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Find existing calendar event
 * @param {string} opposition - Opposition team name
 * @param {string} date - Match date (UK format)
 * @returns {GoogleAppsScript.Calendar.CalendarEvent|null} Calendar event or null
 */
function findCalendarEvent(opposition, date) {
  try {
    const calendar = getClubCalendar();
    const matchDate = parseUKDate(date);
    const nextDay = new Date(matchDate.getTime() + (24 * 60 * 60 * 1000));

    const events = calendar.getEvents(matchDate, nextDay);
    return events.find(event =>
      event.getTitle().includes(opposition) &&
      event.getTag('club_fixture') === 'true'
    ) || null;

  } catch (error) {
    console.error('Error finding calendar event:', error);
    return null;
  }
}

// ==================== CALENDAR EXPORT ====================

/**
 * Export calendar as ICS file
 * @returns {Object} Export result with download URL
 */
function exportCalendarAsICS() {
  try {
    const config = getDynamicConfig();
    const calendar = getClubCalendar();

    // Get current season events
    const seasonStart = getCurrentSeasonStart();
    const seasonEnd = new Date(seasonStart.getFullYear() + 1, 6, 31); // July 31st next year

    const events = calendar.getEvents(seasonStart, seasonEnd);

    // Build ICS content
    const icsContent = buildICSContent(events, config);

    // Save to Drive
    const fileName = `${config.TEAM_SHORT}_fixtures_${getCurrentSeasonString()}.ics`;
    const blob = Utilities.newBlob(icsContent, 'text/calendar', fileName);
    const file = DriveApp.createFile(blob);

    // Make file public
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    console.log(`📅 Calendar exported: ${fileName}`);

    return {
      success: true,
      fileName: fileName,
      fileId: file.getId(),
      downloadUrl: file.getDownloadUrl()
    };

  } catch (error) {
    console.error('Error exporting calendar:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Build ICS file content
 * @param {Array} events - Calendar events
 * @param {Object} config - Club configuration
 * @returns {string} ICS file content
 */
function buildICSContent(events, config) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Football Club Automation//EN',
    `X-WR-CALNAME:${config.TEAM_NAME} Fixtures`,
    `X-WR-CALDESC:Official fixtures for ${config.TEAM_NAME}`,
    'X-WR-TIMEZONE:Europe/London'
  ];

  for (const event of events) {
    if (event.getTag('club_fixture') === 'true') {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.getId()}`);
      lines.push(`DTSTART:${formatDateForICS(event.getStartTime())}`);
      lines.push(`DTEND:${formatDateForICS(event.getEndTime())}`);
      lines.push(`SUMMARY:${event.getTitle()}`);
      lines.push(`DESCRIPTION:${event.getDescription().replace(/\n/g, '\\n')}`);
      lines.push(`LOCATION:${event.getLocation()}`);
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\n');
}

/**
 * Format date for ICS file
 * @param {Date} date - Date to format
 * @returns {string} ICS formatted date
 */
function formatDateForICS(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// ==================== TESTING FUNCTIONS ====================

/**
 * Test calendar integration functionality
 * @returns {Object} Test results
 */
function testCalendarIntegration() {
  console.log('🧪 Testing Calendar Integration...');

  try {
    const testFixture = {
      date: formatUKDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // Next week
      opposition: 'Test FC',
      time: '15:00',
      venue: 'Home',
      competition: 'Friendly',
      notes: 'Test fixture for calendar integration'
    };

    // Test 1: Add fixture to calendar
    const addResult = addFixtureToCalendar(testFixture);
    const test1 = addResult.success;

    // Test 2: Find the created event
    const foundEvent = findCalendarEvent(testFixture.opposition, testFixture.date);
    const test2 = foundEvent !== null;

    // Test 3: Update the event
    testFixture.time = '14:00';
    const updateResult = updateCalendarEvent(testFixture, testFixture.opposition);
    const test3 = updateResult.success;

    // Test 4: Cancel the event
    const cancelResult = cancelCalendarEvent(testFixture.opposition, testFixture.date);
    const test4 = cancelResult.success;

    const tests = [
      { name: 'Add fixture to calendar', passed: test1 },
      { name: 'Find calendar event', passed: test2 },
      { name: 'Update calendar event', passed: test3 },
      { name: 'Cancel calendar event', passed: test4 }
    ];

    const passed = tests.filter(t => t.passed).length;
    const total = tests.length;

    console.log(`✅ Calendar Integration Tests: ${passed}/${total} passed`);

    return {
      success: passed === total,
      passed: passed,
      total: total,
      tests: tests
    };

  } catch (error) {
    console.error('❌ Calendar integration test failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}