import { EventEmitter } from 'events';

export class MatchNotesParser extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.actionTypes = {
      'goal': {
        keywords: ['goal', 'scores', 'scored', 'nets', 'finds the net', 'back of the net', 'strike', 'finish'],
        priority: 1,
        clipDuration: { before: 8, after: 12 }
      },
      'assist': {
        keywords: ['assist', 'assisted', 'sets up', 'cross for', 'through ball', 'pass to'],
        priority: 2,
        clipDuration: { before: 5, after: 8 }
      },
      'save': {
        keywords: ['save', 'saves', 'stops', 'blocks', 'catches', 'parries', 'denies', 'keeper'],
        priority: 1,
        clipDuration: { before: 5, after: 8 }
      },
      'card': {
        keywords: ['yellow', 'red', 'card', 'booked', 'sent off', 'dismissed', 'caution'],
        priority: 2,
        clipDuration: { before: 3, after: 10 }
      },
      'substitution': {
        keywords: ['sub', 'substituted', 'replaced', 'comes on', 'off for', 'change'],
        priority: 3,
        clipDuration: { before: 2, after: 5 }
      },
      'foul': {
        keywords: ['foul', 'fouled', 'penalty', 'free kick', 'tackle', 'challenge'],
        priority: 3,
        clipDuration: { before: 4, after: 8 }
      },
      'corner': {
        keywords: ['corner', 'corner kick', 'flag kick'],
        priority: 4,
        clipDuration: { before: 3, after: 8 }
      },
      'offside': {
        keywords: ['offside', 'offside trap', 'linesman', 'flag up'],
        priority: 4,
        clipDuration: { before: 3, after: 5 }
      },
      'chance': {
        keywords: ['chance', 'opportunity', 'close', 'almost', 'nearly', 'just wide', 'over the bar'],
        priority: 2,
        clipDuration: { before: 6, after: 8 }
      },
      'tackle': {
        keywords: ['tackle', 'tackles', 'intercepts', 'wins the ball', 'blocks', 'defensive'],
        priority: 3,
        clipDuration: { before: 3, after: 6 }
      }
    };
  }

  async parseMatchNotes(rawNotes) {
    this.logger.info('Starting match notes parsing', {
      notesLength: rawNotes.length
    });

    if (!rawNotes || typeof rawNotes !== 'string') {
      return { actions: [], players: [], totalActions: 0 };
    }

    const lines = rawNotes
      .split(/\\r?\\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const actions = [];
    const players = new Map();
    const parseErrors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        const parsed = await this.parseNoteLine(line, i + 1);
        if (parsed) {
          actions.push(parsed);
          this.trackPlayer(players, parsed);

          this.logger.debug('Parsed action', {
            line: i + 1,
            player: parsed.player,
            action: parsed.action,
            timestamp: parsed.timestamp
          });
        }
      } catch (error) {
        parseErrors.push({
          line: i + 1,
          content: line,
          error: error.message
        });
        this.logger.warn('Failed to parse line', {
          line: i + 1,
          content: line,
          error: error.message
        });
      }
    }

    // Sort actions by timestamp
    actions.sort((a, b) => a.timestamp - b.timestamp);

    // Validate timeline consistency
    this.validateTimeline(actions);

    const result = {
      actions: actions,
      players: Array.from(players.values()),
      totalActions: actions.length,
      parseErrors: parseErrors,
      statistics: this.generateStatistics(actions, players)
    };

    this.logger.info('Match notes parsing completed', {
      totalLines: lines.length,
      successfullyParsed: actions.length,
      parseErrors: parseErrors.length,
      playersFound: players.size
    });

    this.emit('parsingComplete', result);
    return result;
  }

  async parseNoteLine(line, lineNumber) {
    const formats = [
      // Format 1: "15:30 - Smith goal from penalty"
      {
        regex: /^(\\d{1,2}:\\d{2})\\s*[-–—]\\s*(.+?)\\s+(\\w+(?:\\s+\\w+)?)\\s+(.+)$/i,
        extract: (match) => ({
          timestamp: this.timeToSeconds(match[1]),
          player: this.normalizePlayerName(match[3]),
          action: this.extractActionType(match[4]),
          description: `${match[2]} ${match[4]}`.trim(),
          rawText: match[0],
          confidence: 0.9
        })
      },

      // Format 2: "Smith goal 15:30"
      {
        regex: /^(\\w+(?:\\s+\\w+)?)\\s+(.+?)\\s+(\\d{1,2}:\\d{2})$/i,
        extract: (match) => ({
          timestamp: this.timeToSeconds(match[3]),
          player: this.normalizePlayerName(match[1]),
          action: this.extractActionType(match[2]),
          description: match[2],
          rawText: match[0],
          confidence: 0.85
        })
      },

      // Format 3: "15:30 Smith scores!"
      {
        regex: /^(\\d{1,2}:\\d{2})\\s+(\\w+(?:\\s+\\w+)?)\\s+(.+)$/i,
        extract: (match) => ({
          timestamp: this.timeToSeconds(match[1]),
          player: this.normalizePlayerName(match[2]),
          action: this.extractActionType(match[3]),
          description: match[3],
          rawText: match[0],
          confidence: 0.9
        })
      },

      // Format 4: "Great save by Martinez at 23 minutes"
      {
        regex: /(.+?)\\s+by\\s+(\\w+(?:\\s+\\w+)?)\\s+at\\s+(\\d{1,2})\\s*(?:min|minutes?|')$/i,
        extract: (match) => ({
          timestamp: parseInt(match[3]) * 60,
          player: this.normalizePlayerName(match[2]),
          action: this.extractActionType(match[1]),
          description: match[1],
          rawText: match[0],
          confidence: 0.8
        })
      },

      // Format 5: "23' - Johnson yellow card"
      {
        regex: /^(\\d{1,2})'\\s*[-–—]?\\s*(.+?)\\s+(\\w+(?:\\s+\\w+)?)\\s+(.+)$/i,
        extract: (match) => ({
          timestamp: parseInt(match[1]) * 60,
          player: this.normalizePlayerName(match[3]),
          action: this.extractActionType(match[4]),
          description: `${match[2]} ${match[4]}`.trim(),
          rawText: match[0],
          confidence: 0.85
        })
      },

      // Format 6: "HT: 1-0" or "FT: 2-1" (Match events)
      {
        regex: /^(HT|FT|KO|\\d{1,2}H|Half[\\s-]?Time|Full[\\s-]?Time|Kick[\\s-]?Off)[:s\\s]*(.*)$/i,
        extract: (match) => {
          const eventType = match[1].toUpperCase();
          let timestamp = 0;

          if (eventType.includes('HT') || eventType.includes('HALF')) {
            timestamp = 45 * 60; // 45 minutes
          } else if (eventType.includes('FT') || eventType.includes('FULL')) {
            timestamp = 90 * 60; // 90 minutes
          } else if (eventType.includes('KO') || eventType.includes('KICK')) {
            timestamp = 0; // Kick off
          }

          return {
            timestamp: timestamp,
            player: 'SYSTEM',
            action: eventType.includes('HT') || eventType.includes('HALF') ? 'half_time' :
                   eventType.includes('FT') || eventType.includes('FULL') ? 'full_time' : 'kickoff',
            description: match[2] || eventType,
            rawText: match[0],
            confidence: 1.0,
            isSystemEvent: true
          };
        }
      },

      // Format 7: "Min 67: Davis substitution"
      {
        regex: /^(?:min|minute)\\s+(\\d{1,2})[:.]\\s*(.+?)\\s+(\\w+(?:\\s+\\w+)?)\\s+(.+)$/i,
        extract: (match) => ({
          timestamp: parseInt(match[1]) * 60,
          player: this.normalizePlayerName(match[3]),
          action: this.extractActionType(match[4]),
          description: `${match[2]} ${match[4]}`.trim(),
          rawText: match[0],
          confidence: 0.8
        })
      },

      // Format 8: "67th minute - Own goal"
      {
        regex: /^(\\d{1,2})(?:st|nd|rd|th)?\\s+min(?:ute)?\\s*[-–—]\\s*(.+)$/i,
        extract: (match) => ({
          timestamp: parseInt(match[1]) * 60,
          player: this.extractPlayerFromDescription(match[2]),
          action: this.extractActionType(match[2]),
          description: match[2],
          rawText: match[0],
          confidence: 0.7
        })
      }
    ];

    // Try each format
    for (const format of formats) {
      const match = line.match(format.regex);
      if (match) {
        try {
          const parsed = format.extract(match);

          // Validate the parsed data
          if (this.validateParsedAction(parsed, lineNumber)) {
            // Add metadata
            parsed.lineNumber = lineNumber;
            parsed.clipTiming = this.getClipTiming(parsed.action);
            parsed.priority = this.getActionPriority(parsed.action);

            return parsed;
          }
        } catch (error) {
          this.logger.warn('Format extraction failed', { format, error: error.message });
        }
      }
    }

    // If no format matched, try fuzzy matching
    return this.tryFuzzyParsing(line, lineNumber);
  }

  extractActionType(description) {
    const desc = description.toLowerCase().trim();

    // Direct keyword matching
    for (const [actionType, config] of Object.entries(this.actionTypes)) {
      if (config.keywords.some(keyword => desc.includes(keyword))) {
        return actionType;
      }
    }

    // Contextual analysis
    if (desc.includes('net') && (desc.includes('back') || desc.includes('into'))) {
      return 'goal';
    }

    if (desc.includes('wide') || desc.includes('over') || desc.includes('post')) {
      return 'chance';
    }

    if (desc.includes('hand') && desc.includes('ball')) {
      return 'foul';
    }

    return 'other';
  }

  extractPlayerFromDescription(description) {
    // Look for patterns like "by PlayerName" or "PlayerName's"
    const byMatch = description.match(/\\bby\\s+(\\w+(?:\\s+\\w+)?)/i);
    if (byMatch) {
      return this.normalizePlayerName(byMatch[1]);
    }

    const possessiveMatch = description.match(/(\\w+(?:\\s+\\w+)?)'s/i);
    if (possessiveMatch) {
      return this.normalizePlayerName(possessiveMatch[1]);
    }

    // Look for capitalized words that might be names
    const words = description.split(/\\s+/);
    const potentialNames = words.filter(word =>
      /^[A-Z][a-z]+$/.test(word) &&
      word.length > 2 &&
      !['The', 'And', 'But', 'For', 'From', 'Into', 'With'].includes(word)
    );

    if (potentialNames.length > 0) {
      return this.normalizePlayerName(potentialNames[0]);
    }

    return 'Unknown';
  }

  normalizePlayerName(name) {
    if (!name || typeof name !== 'string') {
      return 'Unknown';
    }

    return name
      .trim()
      .split(/\\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .replace(/[^a-zA-Z\\s'-]/g, '') // Remove special characters except apostrophes and hyphens
      .trim();
  }

  timeToSeconds(timeStr) {
    if (!timeStr) return 0;

    // Handle formats like "15:30", "45", "45'"
    const cleanTime = timeStr.replace(/['\"]/g, '').trim();

    if (cleanTime.includes(':')) {
      const [minutes, seconds = 0] = cleanTime.split(':').map(Number);
      return (minutes * 60) + seconds;
    } else {
      // Just minutes
      const minutes = parseInt(cleanTime);
      return isNaN(minutes) ? 0 : minutes * 60;
    }
  }

  validateParsedAction(action, lineNumber) {
    // Basic validation
    if (!action || typeof action !== 'object') {
      return false;
    }

    if (typeof action.timestamp !== 'number' || action.timestamp < 0 || action.timestamp > 7200) {
      this.logger.warn('Invalid timestamp', {
        line: lineNumber,
        timestamp: action.timestamp
      });
      return false;
    }

    if (!action.player || action.player.trim().length === 0) {
      this.logger.warn('Missing player', { line: lineNumber });
      return false;
    }

    if (!action.action || action.action.trim().length === 0) {
      this.logger.warn('Missing action', { line: lineNumber });
      return false;
    }

    return true;
  }

  trackPlayer(playersMap, action) {
    if (action.isSystemEvent || action.player === 'Unknown') {
      return;
    }

    if (!playersMap.has(action.player)) {
      playersMap.set(action.player, {
        name: action.player,
        actions: [],
        statistics: {
          goals: 0,
          assists: 0,
          saves: 0,
          cards: 0,
          total: 0
        }
      });
    }

    const player = playersMap.get(action.player);
    player.actions.push(action);
    player.statistics.total++;

    // Update statistics
    switch (action.action) {
      case 'goal':
        player.statistics.goals++;
        break;
      case 'assist':
        player.statistics.assists++;
        break;
      case 'save':
        player.statistics.saves++;
        break;
      case 'card':
        player.statistics.cards++;
        break;
    }
  }

  getClipTiming(actionType) {
    return this.actionTypes[actionType]?.clipDuration || { before: 5, after: 8 };
  }

  getActionPriority(actionType) {
    return this.actionTypes[actionType]?.priority || 5;
  }

  validateTimeline(actions) {
    const issues = [];

    for (let i = 1; i < actions.length; i++) {
      const prev = actions[i - 1];
      const curr = actions[i];

      // Check for time going backwards
      if (curr.timestamp < prev.timestamp) {
        issues.push({
          type: 'timeline_backwards',
          actions: [prev, curr],
          message: `Time goes backwards from ${prev.timestamp}s to ${curr.timestamp}s`
        });
      }

      // Check for impossible timing (same second, different major events)
      if (curr.timestamp === prev.timestamp &&
          ['goal', 'save', 'card'].includes(prev.action) &&
          ['goal', 'save', 'card'].includes(curr.action)) {
        issues.push({
          type: 'simultaneous_events',
          actions: [prev, curr],
          message: 'Multiple major events at the same timestamp'
        });
      }
    }

    if (issues.length > 0) {
      this.logger.warn('Timeline validation issues found', { issues });
    }

    return issues;
  }

  generateStatistics(actions, playersMap) {
    const actionCounts = {};
    let totalClipDuration = 0;

    actions.forEach(action => {
      actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;
      const timing = this.getClipTiming(action.action);
      totalClipDuration += timing.before + timing.after;
    });

    const topPlayers = Array.from(playersMap.values())
      .sort((a, b) => b.statistics.total - a.statistics.total)
      .slice(0, 5)
      .map(player => ({
        name: player.name,
        totalActions: player.statistics.total,
        breakdown: player.statistics
      }));

    return {
      actionCounts,
      totalClipDuration,
      averageTimestamp: actions.length > 0
        ? actions.reduce((sum, a) => sum + a.timestamp, 0) / actions.length
        : 0,
      topPlayers
    };
  }

  tryFuzzyParsing(line, lineNumber) {
    this.logger.debug('Attempting fuzzy parsing', { line, lineNumber });

    // Look for any time indicators
    const timePatterns = [
      /\\b(\\d{1,2})[:.]?(\\d{2})?\\b/g,
      /\\b(\\d{1,2})'\\b/g,
      /\\bmin(?:ute)?\\s*(\\d{1,2})\\b/gi
    ];

    let timestamp = null;
    for (const pattern of timePatterns) {
      const match = line.match(pattern);
      if (match) {
        if (match[0].includes(':')) {
          timestamp = this.timeToSeconds(match[0]);
        } else {
          const minutes = parseInt(match[0].replace(/[^\\d]/g, ''));
          if (minutes >= 0 && minutes <= 120) {
            timestamp = minutes * 60;
          }
        }
        break;
      }
    }

    // Look for action keywords
    let action = 'other';
    for (const [actionType, config] of Object.entries(this.actionTypes)) {
      if (config.keywords.some(keyword =>
        line.toLowerCase().includes(keyword.toLowerCase())
      )) {
        action = actionType;
        break;
      }
    }

    // Look for player names (capitalized words)
    const words = line.split(/\\s+/);
    const potentialPlayer = words.find(word =>
      /^[A-Z][a-z]{2,}$/.test(word) &&
      !['Goal', 'Save', 'Card', 'Foul', 'Corner', 'Minute', 'Time'].includes(word)
    );

    if (timestamp !== null && action !== 'other' && potentialPlayer) {
      this.logger.info('Fuzzy parsing successful', { line, timestamp, action, player: potentialPlayer });

      return {
        timestamp,
        player: this.normalizePlayerName(potentialPlayer),
        action,
        description: line,
        rawText: line,
        confidence: 0.5,
        fuzzyParsed: true,
        lineNumber
      };
    }

    // Return null if we can't parse anything meaningful
    return null;
  }
}