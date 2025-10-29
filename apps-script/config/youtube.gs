/**
 * YouTube Configuration
 * Contains YouTube API settings, channel info, and upload preferences
 */

// ============================================================================
// YOUTUBE SETTINGS
// ============================================================================

const YOUTUBE_CONFIG = {
  API_KEY: PropertiesService.getScriptProperties().getProperty('YOUTUBE_API_KEY'),

  UPLOAD_DEFAULTS: {
    privacy: 'unlisted', // 'public', 'unlisted', or 'private'
    category: '17',      // Sports category
    language: 'en-GB',
    madeForKids: false
  },

  VIDEO_SETTINGS: {
    title: '{team} vs {opponent} - {date} Highlights',
    descriptionTemplate: 'Match highlights from {team} vs {opponent}\n\nDate: {date}\nCompetition: {competition}\n\nSubscribe for more highlights!',
    tags: ['football', 'soccer', 'highlights', 'match highlights', 'grassroots football']
  },

  THUMBNAIL: {
    generate: true,
    width: 1280,
    height: 720
  }
};

/**
 * Get YouTube configuration
 */
function getYouTubeSettings() {
  return YOUTUBE_CONFIG;
}

/**
 * Generate video title from match data
 */
function generateYouTubeTitle(matchData) {
  return YOUTUBE_CONFIG.VIDEO_SETTINGS.title
    .replace('{team}', matchData.team || 'Team')
    .replace('{opponent}', matchData.opponent || 'Opponent')
    .replace('{date}', matchData.date || '');
}

/**
 * Generate video description from match data
 */
function generateYouTubeDescription(matchData) {
  return YOUTUBE_CONFIG.VIDEO_SETTINGS.descriptionTemplate
    .replace('{team}', matchData.team || 'Team')
    .replace('{opponent}', matchData.opponent || 'Opponent')
    .replace('{date}', matchData.date || '')
    .replace('{competition}', matchData.competition || '');
}
