/**
 * @fileoverview Event icon mappings for match events
 * @version 1.0.0
 * @description Provides icon/emoji mappings for different event types (goals, cards, subs, etc.)
 */

/**
 * Icon mappings for different event types
 */
const EVENT_ICONS = {
  // Goals
  goal: '⚽',
  own_goal: '🔴⚽',
  penalty: '🎯',
  free_kick: '🌟',
  header: '🎯',

  // Cards
  yellow_card: '🟨',
  red_card: '🟥',
  second_yellow: '🟨🟥',

  // Sin bins (temporary suspension)
  sin_bin: '⏱️',
  sin_bin_return: '↩️',

  // Substitutions
  substitution: '🔄',
  sub_in: '⬆️',
  sub_out: '⬇️',
  injury_sub: '🏥',

  // Match events
  kickoff: '⚡',
  halftime: '⏸️',
  fulltime: '🏁',
  extra_time: '⏱️+',
  penalties: '🎯',

  // Other
  injury: '🏥',
  assist: '👟',
  motm: '⭐',
  captain: '©',

  // Negative
  miss: '❌',
  save: '🧤',
  offside: '🚩'
};

/**
 * Icon URLs for graphics overlays (optional - for video processing)
 */
const EVENT_ICON_URLS = {
  yellow_card: 'https://r2.systonapp.com/icons/yellow-card.png',
  red_card: 'https://r2.systonapp.com/icons/red-card.png',
  sin_bin: 'https://r2.systonapp.com/icons/sin-bin.png',
  goal: 'https://r2.systonapp.com/icons/goal.png',
  substitution: 'https://r2.systonapp.com/icons/substitution.png'
};

/**
 * Severity levels for sorting/filtering
 */
const EVENT_SEVERITY = {
  goal: 5,
  red_card: 4,
  second_yellow: 4,
  yellow_card: 3,
  sin_bin: 3,
  penalty: 5,
  own_goal: 4,
  substitution: 2,
  injury: 3,
  motm: 5
};

/**
 * Get icon for a given event type
 * @param {string} eventType - Event type (goal, yellow_card, red_card, etc.)
 * @returns {string} Icon/emoji for the event
 */
function getEventIcon(eventType) {
  return EVENT_ICONS[eventType] || '📌';
}

/**
 * Get icon URL for graphics/overlays
 * @param {string} eventType - Event type
 * @returns {string|null} URL to icon image or null if not available
 */
function getEventIconUrl(eventType) {
  return EVENT_ICON_URLS[eventType] || null;
}

/**
 * Get severity level for an event
 * @param {string} eventType - Event type
 * @returns {number} Severity (1-5, higher = more important)
 */
function getEventSeverity(eventType) {
  return EVENT_SEVERITY[eventType] || 1;
}

/**
 * Add icon to event object
 * @param {Object} event - Event object
 * @returns {Object} Event with icon added
 */
function addIconToEvent(event) {
  if (!event.type) {
    Logger.log('Event missing type field');
    return event;
  }

  return {
    ...event,
    icon: getEventIcon(event.type),
    icon_url: getEventIconUrl(event.type),
    severity: getEventSeverity(event.type)
  };
}

/**
 * Format event with icon for display
 * @param {Object} event - Event object with type, player, minute
 * @returns {string} Formatted string like "⚽ 23' John Smith (Goal)"
 */
function formatEventWithIcon(event) {
  if (!event.type || !event.player) {
    return 'Invalid event';
  }

  const icon = getEventIcon(event.type);
  const minute = event.minute || '?';
  const player = event.player;
  const eventName = event.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return `${icon} ${minute}' ${player} (${eventName})`;
}

/**
 * Batch add icons to array of events
 * @param {Array<Object>} events - Array of event objects
 * @returns {Array<Object>} Events with icons added
 */
function addIconsToEvents(events) {
  if (!Array.isArray(events)) {
    Logger.log('addIconsToEvents expects an array');
    return [];
  }

  return events.map(addIconToEvent);
}

/**
 * Sort events by severity (highest first)
 * @param {Array<Object>} events - Array of event objects
 * @returns {Array<Object>} Sorted events
 */
function sortEventsBySeverity(events) {
  return events.sort((a, b) => {
    const severityA = getEventSeverity(a.type);
    const severityB = getEventSeverity(b.type);
    return severityB - severityA;
  });
}

/**
 * Get card color for display
 * @param {string} cardType - yellow_card, red_card, second_yellow, sin_bin
 * @returns {string} Hex color code
 */
function getCardColor(cardType) {
  const colors = {
    yellow_card: '#FFD700',
    red_card: '#DC143C',
    second_yellow: '#FF8C00',
    sin_bin: '#4B0082'
  };

  return colors[cardType] || '#808080';
}

/**
 * Example usage for match event processing
 */
function exampleUsage() {
  // Example events from a match
  const matchEvents = [
    { type: 'goal', player: 'John Smith', minute: 12, team: 'home' },
    { type: 'yellow_card', player: 'Mike Jones', minute: 23, team: 'away' },
    { type: 'substitution', player_in: 'Tom Brown', player_out: 'Chris Wilson', minute: 45, team: 'home' },
    { type: 'red_card', player: 'Mike Jones', minute: 67, team: 'away' },
    { type: 'goal', player: 'Sarah Lee', minute: 78, team: 'home' }
  ];

  // Add icons to events
  const eventsWithIcons = addIconsToEvents(matchEvents);

  // Sort by severity
  const sortedEvents = sortEventsBySeverity(eventsWithIcons);

  // Format for display
  sortedEvents.forEach(event => {
    Logger.log(formatEventWithIcon(event));
  });

  // Output:
  // ⚽ 12' John Smith (Goal)
  // ⚽ 78' Sarah Lee (Goal)
  // 🟥 67' Mike Jones (Red Card)
  // 🟨 23' Mike Jones (Yellow Card)
  // 🔄 45' Tom Brown ↔ Chris Wilson (Substitution)
}
