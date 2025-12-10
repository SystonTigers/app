/**
 * @fileoverview Homepage widget state manager.
 * Stores the most recent public-facing update so the website widget
 * can surface a single item that expires automatically after a short window.
 */

const HomepageWidgetService = (() => {
  const CACHE_KEY = 'homepage_widget_state';
  const PROPERTY_KEY = 'HOMEPAGE_WIDGET_STATE';
  const TTL_PROPERTY_KEY = 'HOMEPAGE_WIDGET_TTL_MINUTES';
  const DEFAULT_TTL_MINUTES = 90;

  /**
   * Resolve the TTL for widget entries from Script Properties.
   * Falls back to the default of 90 minutes and clamps to sane bounds.
   * @returns {number}
   */
  function resolveTtlMinutes_() {
    try {
      const raw = PropertiesService.getScriptProperties().getProperty(TTL_PROPERTY_KEY);
      if (!raw) {
        return DEFAULT_TTL_MINUTES;
      }
      const parsed = Number(raw);
      if (!isFinite(parsed) || parsed <= 0) {
        return DEFAULT_TTL_MINUTES;
      }
      // clamp between 30 minutes and 180 minutes to avoid excessive caching
      return Math.min(180, Math.max(30, Math.floor(parsed)));
    } catch (error) {
      console.warn('HomepageWidgetService resolveTtlMinutes_ failed, using default:', error);
      return DEFAULT_TTL_MINUTES;
    }
  }

  /**
   * Build a human readable summary for the widget based on the live event data.
   * @param {!Object} eventData
   * @returns {{headline: string, context: string}}
   */
  function buildSummary_(eventData) {
    if (!eventData || typeof eventData !== 'object') {
      return {
        headline: 'Update available',
        context: 'A new club update is ready to publish.'
      };
    }

    const minute = eventData.minute != null ? `${eventData.minute}'` : '';
    const match = eventData.matchLabel || eventData.matchId || '';

    switch (eventData.type) {
      case 'goal': {
        const scorer = eventData.player || 'Goal scored';
        const assist = eventData.assist ? ` (assist: ${eventData.assist})` : '';
        return {
          headline: `${scorer}${assist}`.trim(),
          context: [minute, 'Goal', match].filter(Boolean).join(' • ')
        };
      }
      case 'card': {
        const cardLabel = eventData.cardType === 'red' ? 'Red card' : 'Yellow card';
        return {
          headline: `${cardLabel} — ${eventData.player || 'Player'}`,
          context: [minute, match].filter(Boolean).join(' • ')
        };
      }
      case 'substitution': {
        const summary = `${eventData.playerOn || 'On'} for ${eventData.playerOff || 'Off'}`;
        return {
          headline: `Substitution: ${summary}`,
          context: [minute, match].filter(Boolean).join(' • ')
        };
      }
      case 'match_status': {
        const status = (eventData.status || '').replace(/_/g, ' ');
        return {
          headline: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Match status',
          context: [minute, match].filter(Boolean).join(' • ')
        };
      }
      default:
        return {
          headline: 'Club update',
          context: [minute, match].filter(Boolean).join(' • ')
        };
    }
  }

  /**
   * Persist the widget payload into cache and script properties.
   * @param {!Object} payload
   */
  function persistState_(payload) {
    const cache = CacheService.getScriptCache();
    try {
      const ttlSeconds = resolveTtlMinutes_() * 60;
      cache.put(CACHE_KEY, JSON.stringify(payload), Math.min(ttlSeconds, 6 * 60 * 60));
    } catch (error) {
      console.warn('HomepageWidgetService cache write failed:', error);
    }

    try {
      PropertiesService.getScriptProperties().setProperty(PROPERTY_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('HomepageWidgetService property write failed:', error);
    }
  }

  /**
   * Retrieve the widget state from cache or Script Properties.
   * @returns {Object|null}
   */
  function retrieveState_() {
    const cache = CacheService.getScriptCache();
    try {
      const cached = cache.get(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('HomepageWidgetService cache read failed:', error);
    }

    try {
      const stored = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('HomepageWidgetService property read failed:', error);
      return null;
    }
  }

  /**
   * Remove the persisted widget state when it expires.
   */
  function clearState_() {
    try {
      CacheService.getScriptCache().remove(CACHE_KEY);
    } catch (error) {
      console.warn('HomepageWidgetService cache clear failed:', error);
    }
    try {
      PropertiesService.getScriptProperties().deleteProperty(PROPERTY_KEY);
    } catch (error) {
      console.warn('HomepageWidgetService property clear failed:', error);
    }
  }

  return {
    /**
     * Record a new widget event payload using the raw event information.
     * @param {!Object} eventData
     * @param {!Object=} resultData
     */
    recordEvent(eventData, resultData) {
      try {
        const now = new Date();
        const ttlMinutes = resolveTtlMinutes_();
        const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
        const summary = buildSummary_(eventData);

        const payload = {
          id: eventData.id || eventData.eventId || Utilities.getUuid(),
          type: eventData.type || 'update',
          headline: summary.headline,
          context: summary.context,
          recordedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          matchId: eventData.matchId || null,
          extra: {
            minute: eventData.minute || null,
            player: eventData.player || null,
            assist: eventData.assist || null,
            status: eventData.status || null,
            processor: resultData && resultData.processor ? resultData.processor : null
          }
        };

        persistState_(payload);
        return { success: true, data: payload };
      } catch (error) {
        console.warn('HomepageWidgetService recordEvent failed:', error);
        return { success: false, error: error.toString() };
      }
    },

    /**
     * Resolve the widget payload if still within the TTL window.
     * @returns {{success: boolean, data: (Object|null), active: boolean}}
     */
    getWidgetState() {
      const state = retrieveState_();
      if (!state) {
        return { success: true, active: false, data: null };
      }

      try {
        const now = Date.now();
        const expiresAt = state.expiresAt ? Date.parse(state.expiresAt) : 0;
        if (!expiresAt || now >= expiresAt) {
          clearState_();
          return { success: true, active: false, data: null };
        }

        return { success: true, active: true, data: state };
      } catch (error) {
        console.warn('HomepageWidgetService getWidgetState failed:', error);
        clearState_();
        return { success: false, active: false, error: error.toString(), data: null };
      }
    }
  };
})();

/**
 * Expose widget state for the web client.
 * @returns {{success: boolean, active: boolean, data: (Object|null)}}
 */
function getHomepageWidgetState() {
  return HomepageWidgetService.getWidgetState();
}
