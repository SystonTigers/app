/**
 * @fileoverview Event icon mappings for match events
 * @version 1.0.0
 * @description Provides icon/emoji mappings for different event types (goals, cards, subs, etc.)
 */

/**
 * Get icon for a given event type
 * @param {string} eventType - Event type (goal, yellow_card, red_card, substitution, etc.)
 * @returns {string} Icon/emoji for the event
 */
function getEventIcon(eventType) {
  const iconMap = getEventIconMap();
  const normalizedType = (eventType || '').toString().toLowerCase().trim();

  return iconMap[normalizedType] || '⚽';
}

/**
 * Get complete event icon mapping
 * @returns {Object.<string, string>} Map of event types to icons
 */
function getEventIconMap() {
  return {
    // Goals
    'goal': '⚽',
    'own_goal': '🥅',
    'penalty': '⚽🎯',

    // Cards
    'yellow_card': '🟨',
    'yellow': '🟨',
    'card_yellow': '🟨',
    'red_card': '🟥',
    'red': '🟥',
    'card_red': '🟥',
    'second_yellow': '🟨🟥',
    'card_second_yellow': '🟨🟥',

    // Sin bin (temporary suspension)
    'sin_bin': '⏱️',
    'temporary_suspension': '⏱️',

    // Substitutions
    'substitution': '🔄',
    'sub': '🔄',
    'sub_in': '🔼',
    'sub_out': '🔽',

    // Match events
    'kickoff': '🏁',
    'halftime': '⏸️',
    'fulltime': '🏁',
    'half_time': '⏸️',
    'full_time': '🏁',

    // Other events
    'assist': '👟',
    'save': '🧤',
    'motm': '⭐',
    'man_of_the_match': '⭐',
    'injury': '🩹',
    'var_review': '📺',
    'offside': '🚩'
  };
}

/**
 * Get icon URL for event type (for graphics/overlays)
 * @param {string} eventType - Event type
 * @returns {string} URL to icon image or empty string
 */
function getEventIconUrl(eventType) {
  const urlMap = getEventIconUrlMap();
  const normalizedType = (eventType || '').toString().toLowerCase().trim();

  return urlMap[normalizedType] || '';
}

/**
 * Get mapping of event types to icon URLs
 * Can be configured to point to Google Drive, R2, or external CDN
 * @returns {Object.<string, string>} Map of event types to icon URLs
 */
function getEventIconUrlMap() {
  const baseIconUrl = getConfigValue('ICONS.BASE_URL', 'https://cdn.example.com/icons');

  return {
    'yellow_card': `${baseIconUrl}/yellow-card.png`,
    'red_card': `${baseIconUrl}/red-card.png`,
    'second_yellow': `${baseIconUrl}/second-yellow.png`,
    'sin_bin': `${baseIconUrl}/sin-bin.png`,
    'goal': `${baseIconUrl}/goal.png`,
    'substitution': `${baseIconUrl}/substitution.png`
  };
}

/**
 * Add icon to event object
 * @param {Object} event - Event object
 * @param {string} event.type - Event type
 * @returns {Object} Event object with icon and icon_url fields added
 * @example
 * const event = { type: 'yellow_card', player: 'John Smith', minute: 23 };
 * const enriched = addIconToEvent(event);
 * // { type: 'yellow_card', player: 'John Smith', minute: 23, icon: '🟨', icon_url: 'https://...' }
 */
function addIconToEvent(event) {
  if (!event || typeof event !== 'object') {
    return event;
  }

  const eventType = event.type || event.eventType || event.event_type || '';

  return {
    ...event,
    icon: getEventIcon(eventType),
    icon_url: getEventIconUrl(eventType)
  };
}

/**
 * Add icons to array of events
 * @param {Array<Object>} events - Array of event objects
 * @returns {Array<Object>} Events with icons added
 */
function addIconsToEvents(events) {
  if (!Array.isArray(events)) {
    return events;
  }

  return events.map(event => addIconToEvent(event));
}

/**
 * Format event text with icon
 * @param {string} eventType - Event type
 * @param {string} playerName - Player name
 * @param {number|string} minute - Match minute
 * @returns {string} Formatted event text
 * @example
 * formatEventWithIcon('yellow_card', 'John Smith', 23)
 * // Returns: "🟨 John Smith (23')"
 */
function formatEventWithIcon(eventType, playerName, minute) {
  const icon = getEventIcon(eventType);
  const player = (playerName || 'Unknown').toString().trim();
  const min = minute ? `(${minute}')` : '';

  return `${icon} ${player} ${min}`.trim();
}

/**
 * Get card severity level (for sorting/filtering)
 * @param {string} cardType - Card type
 * @returns {number} Severity level (0 = none, 1 = yellow, 2 = sin bin, 3 = second yellow, 4 = red)
 */
function getCardSeverity(cardType) {
  const severityMap = {
    'yellow': 1,
    'yellow_card': 1,
    'card_yellow': 1,
    'sin_bin': 2,
    'temporary_suspension': 2,
    'second_yellow': 3,
    'card_second_yellow': 3,
    'red': 4,
    'red_card': 4,
    'card_red': 4
  };

  const normalizedType = (cardType || '').toString().toLowerCase().trim();
  return severityMap[normalizedType] || 0;
}
