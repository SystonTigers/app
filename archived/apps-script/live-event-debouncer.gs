/**
 * @fileoverview Live Event Debouncer Service
 * @version 6.2.0
 * @description Prevents duplicate live event posts and manages event queue
 */

/**
 * Live Event Debouncer
 * Queues live events and processes them in batches to prevent duplicates and quota exhaustion
 */
class LiveEventDebouncer {

  static getConstants() {
    return {
      QUEUE_KEY: 'LIVE_EVENT_QUEUE',
      PROCESSED_KEY: 'PROCESSED_EVENTS',
      MAX_QUEUE_SIZE: 100,
      MAX_PROCESSED_KEYS: 1000
    };
  }

  /**
   * Queue a live event instead of posting immediately
   * This prevents duplicates and allows batching
   */
  static queueEvent(eventData) {
    try {
      // Generate deterministic ID for idempotency
      const eventId = this.generateEventId(eventData);

      // Check if already processed
      if (this.isAlreadyProcessed(eventId)) {
        console.log(`⏭️ Event already processed: ${eventId}`);
        return {
          success: true,
          skipped: true,
          eventId: eventId,
          reason: 'Already processed'
        };
      }

      // Add to queue
      const queue = this.getEventQueue();
      const queuedEvent = {
        id: eventId,
        data: eventData,
        timestamp: new Date().toISOString(),
        attempts: 0
      };

      queue.push(queuedEvent);

      // Limit queue size
      if (queue.length > this.getConstants().MAX_QUEUE_SIZE) {
        queue.shift(); // Remove oldest
        console.warn(`⚠️ Event queue full, removed oldest event`);
      }

      this.saveEventQueue(queue);

      // Ensure processing trigger exists
      this.ensureProcessingTrigger();

      console.log(`📥 Queued event: ${eventId} (queue size: ${queue.length})`);

      return {
        success: true,
        queued: true,
        eventId: eventId,
        queueSize: queue.length
      };

    } catch (error) {
      console.error('❌ Failed to queue event:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Process queued events in batch (called by timer trigger)
   */
  static processEventQueue() {
    try {
      const startTime = Date.now();
      console.log('🔄 Processing live event queue...');

      const queue = this.getEventQueue();

      if (queue.length === 0) {
        console.log('📭 Event queue is empty');
        return { success: true, processed: 0, message: 'Queue empty' };
      }

      console.log(`📊 Processing ${queue.length} queued events`);

      const results = [];
      const processed = [];
      const failed = [];

      // Process events in batches (max 5 at a time to avoid quota issues)
      const batchSize = 5;
      const batch = queue.slice(0, batchSize);

      for (const queuedEvent of batch) {
        try {
          // Double-check not already processed
          if (this.isAlreadyProcessed(queuedEvent.id)) {
            console.log(`⏭️ Skipping already processed event: ${queuedEvent.id}`);
            processed.push(queuedEvent.id);
            continue;
          }

          // Process the event
          const result = this.processLiveEvent(queuedEvent.data);

          if (result && result.success) {
            console.log(`✅ Successfully processed event: ${queuedEvent.id}`);
            this.markAsProcessed(queuedEvent.id);
            processed.push(queuedEvent.id);
            results.push({ eventId: queuedEvent.id, status: 'success' });
          } else {
            console.warn(`⚠️ Event processing failed: ${queuedEvent.id}`);
            queuedEvent.attempts = (queuedEvent.attempts || 0) + 1;

            // Retry up to 3 times
            if (queuedEvent.attempts >= 3) {
              console.error(`❌ Event failed after 3 attempts: ${queuedEvent.id}`);
              failed.push(queuedEvent.id);
              results.push({ eventId: queuedEvent.id, status: 'failed', attempts: queuedEvent.attempts });
            } else {
              console.log(`🔄 Will retry event: ${queuedEvent.id} (attempt ${queuedEvent.attempts})`);
              results.push({ eventId: queuedEvent.id, status: 'retry', attempts: queuedEvent.attempts });
            }
          }

        } catch (error) {
          console.error(`❌ Error processing event ${queuedEvent.id}:`, error);
          failed.push(queuedEvent.id);
          results.push({ eventId: queuedEvent.id, status: 'error', error: error.toString() });
        }
      }

      // Remove processed and failed events from queue
      const remainingQueue = queue.filter(event =>
        !processed.includes(event.id) && !failed.includes(event.id)
      );

      this.saveEventQueue(remainingQueue);

      const processTime = Date.now() - startTime;
      const summary = {
        success: true,
        processed: processed.length,
        failed: failed.length,
        remaining: remainingQueue.length,
        processingTime: processTime,
        results: results
      };

      console.log(`📊 Queue processing complete: ${processed.length} processed, ${failed.length} failed, ${remainingQueue.length} remaining (${processTime}ms)`);

      return summary;

    } catch (error) {
      console.error('❌ Event queue processing failed:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Generate deterministic event ID for idempotency
   */
  static generateEventId(eventData) {
    const components = [
      eventData.matchId || 'no_match',
      eventData.type || 'unknown',
      eventData.minute || '0',
      eventData.player || 'no_player',
      eventData.timestamp || Date.now()
    ];

    return `evt_${components.join('_').replace(/[^a-zA-Z0-9_]/g, '_')}`;
  }

  /**
   * Check if event was already processed
   */
  static isAlreadyProcessed(eventId) {
    const processed = this.getProcessedEvents();
    return processed.includes(eventId);
  }

  /**
   * Mark event as processed
   */
  static markAsProcessed(eventId) {
    const processed = this.getProcessedEvents();

    if (!processed.includes(eventId)) {
      processed.push(eventId);

      // Limit size to prevent memory issues
      if (processed.length > this.getConstants().MAX_PROCESSED_KEYS) {
        processed.splice(0, processed.length - this.getConstants().MAX_PROCESSED_KEYS);
      }

      PropertiesService.getScriptProperties().setProperty(
        this.getConstants().PROCESSED_KEY,
        JSON.stringify(processed)
      );
    }
  }

  /**
   * Get processed events list
   */
  static getProcessedEvents() {
    try {
      const stored = PropertiesService.getScriptProperties().getProperty(this.getConstants().PROCESSED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('⚠️ Could not read processed events, starting fresh:', error);
      return [];
    }
  }

  /**
   * Get current event queue
   */
  static getEventQueue() {
    try {
      const stored = PropertiesService.getScriptProperties().getProperty(this.getConstants().QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('⚠️ Could not read event queue, starting fresh:', error);
      return [];
    }
  }

  /**
   * Save event queue
   */
  static saveEventQueue(queue) {
    try {
      PropertiesService.getScriptProperties().setProperty(
        this.getConstants().QUEUE_KEY,
        JSON.stringify(queue)
      );
    } catch (error) {
      console.error('❌ Failed to save event queue:', error);
      throw error;
    }
  }

  /**
   * Process individual live event (calls existing system)
  */
  static processLiveEvent(eventData) {
    try {
      let result = null;

      // Route to appropriate processor based on event type
      switch (eventData.type) {
        case 'goal':
          if (typeof processGoal === 'function') {
            result = processGoal(eventData.player, eventData.minute, eventData.assist);
          }
          break;

        case 'card':
          if (typeof processCard === 'function') {
            result = processCard(eventData.player, eventData.cardType, eventData.minute);
          }
          break;

        case 'substitution':
          if (typeof processSubstitution === 'function') {
            result = processSubstitution(eventData.playerOff, eventData.playerOn, eventData.minute);
          }
          break;

        case 'match_status':
          if (typeof postMatchStatus === 'function') {
            result = postMatchStatus(eventData.status, eventData.minute);
          }
          break;

        default:
          console.warn(`⚠️ Unknown event type: ${eventData.type}`);
          result = { success: false, error: `Unknown event type: ${eventData.type}` };
      }

      // Fallback: try EnhancedEventsManager if available and no primary handler responded
      if ((!result || result.success === false) && typeof EnhancedEventsManager !== 'undefined') {
        switch (eventData.type) {
          case 'goal':
            result = EnhancedEventsManager.processGoalEvent(eventData);
            break;
          case 'card':
            result = EnhancedEventsManager.processCardEvent(eventData);
            break;
        }
      }

      if (result && result.success && typeof HomepageWidgetService !== 'undefined') {
        HomepageWidgetService.recordEvent(eventData, result);
      }

      if (result) {
        return result;
      }

      return { success: false, error: 'No processor available for event type' };

    } catch (error) {
      console.error(`❌ Failed to process live event:`, error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Ensure processing trigger exists (1-minute timer)
   */
  static ensureProcessingTrigger() {
    try {
      // Use TriggerManager if available
      if (typeof TriggerManager !== 'undefined') {
        TriggerManager.ensureSingleTrigger('processLiveEventQueue', 'time', {
          everyMinutes: 1
        });
      } else {
        // Fallback: check manually
        const triggers = ScriptApp.getProjectTriggers()
          .filter(t => t.getHandlerFunction() === 'processLiveEventQueue');

        if (triggers.length === 0) {
          ScriptApp.newTrigger('processLiveEventQueue')
            .timeBased()
            .everyMinutes(1)
            .create();
          console.log('✅ Created processing trigger');
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not ensure processing trigger:', error);
    }
  }

  /**
   * Get queue status for monitoring
   */
  static getQueueStatus() {
    const queue = this.getEventQueue();
    const processed = this.getProcessedEvents();

    return {
      queueSize: queue.length,
      processedCount: processed.length,
      oldestQueued: queue.length > 0 ? queue[0].timestamp : null,
      newestQueued: queue.length > 0 ? queue[queue.length - 1].timestamp : null,
      queueIsFull: queue.length >= this.getConstants().MAX_QUEUE_SIZE,
      needsProcessing: queue.length > 0
    };
  }

  /**
   * Clear all queued and processed events (admin function)
   */
  static clearAll() {
    try {
      PropertiesService.getScriptProperties().deleteProperty(this.getConstants().QUEUE_KEY);
      PropertiesService.getScriptProperties().deleteProperty(this.getConstants().PROCESSED_KEY);

      console.log('🧹 Cleared all queued and processed events');

      return {
        success: true,
        message: 'All events cleared'
      };
    } catch (error) {
      console.error('❌ Failed to clear events:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
}

// Export for global use
globalThis.LiveEventDebouncer = LiveEventDebouncer;

/**
 * Trigger function for processing queue (called every minute)
 */
function processLiveEventQueue() {
  return LiveEventDebouncer.processEventQueue();
}

/**
 * Wrapper functions to replace direct posting
 * These should be used instead of immediate Make.com posting
 */

function queueGoalEvent(player, minute, assist = null, matchId = null) {
  return LiveEventDebouncer.queueEvent({
    type: 'goal',
    player: player,
    minute: minute,
    assist: assist,
    matchId: matchId,
    timestamp: new Date().toISOString()
  });
}

function queueCardEvent(player, cardType, minute, matchId = null) {
  return LiveEventDebouncer.queueEvent({
    type: 'card',
    player: player,
    cardType: cardType,
    minute: minute,
    matchId: matchId,
    timestamp: new Date().toISOString()
  });
}

function queueSubstitution(playerOff, playerOn, minute, matchId = null) {
  return LiveEventDebouncer.queueEvent({
    type: 'substitution',
    playerOff: playerOff,
    playerOn: playerOn,
    minute: minute,
    matchId: matchId,
    timestamp: new Date().toISOString()
  });
}

function queueMatchStatus(status, minute = null, matchId = null) {
  return LiveEventDebouncer.queueEvent({
    type: 'match_status',
    status: status,
    minute: minute,
    matchId: matchId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Admin/monitoring functions
 */

function getEventQueueStatus() {
  const status = LiveEventDebouncer.getQueueStatus();
  console.log('📊 Event Queue Status:', status);
  return status;
}

function clearEventQueue() {
  return LiveEventDebouncer.clearAll();
}