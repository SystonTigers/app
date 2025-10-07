/**
 * @fileoverview Data Privacy Compliance and PII Protection Manager
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Comprehensive data privacy, GDPR compliance, and PII protection system
 *
 * FEATURES IMPLEMENTED:
 * - GDPR compliance framework
 * - PII detection and masking
 * - Data retention policies
 * - Consent management
 * - Data export and portability
 * - Right to erasure (deletion)
 * - Privacy audit trails
 * - Data minimization controls
 * - Anonymization and pseudonymization
 * - Privacy impact assessments
 */

// ==================== PRIVACY COMPLIANCE MANAGER ====================

/**
 * Privacy Compliance Manager - Comprehensive data privacy and GDPR compliance
 */
class PrivacyComplianceManager {

  constructor() {
    this.loggerName = 'Privacy';
    this._logger = null;
    this.piiFields = [
      'email', 'phone', 'address', 'postcode', 'dob', 'passport', 'licence',
      'medical', 'financial', 'ip_address', 'device_id', 'social_security'
    ];
    this.sensitivePlayerData = [
      'full_name', 'date_of_birth', 'contact_details', 'medical_info',
      'emergency_contact', 'address', 'registration_number'
    ];
    this.retentionPolicies = new Map();
    this.dataProcessingLog = [];

    // Consent persistence
    this.privacyConfig = getConfigValue('PRIVACY', {});
    this.playersSheetName = getConfigValue('SHEETS.TAB_NAMES.PRIVACY_PLAYERS');
    this.consentsSheetName = getConfigValue('SHEETS.TAB_NAMES.PRIVACY_CONSENTS');
    this.auditSheetName = getConfigValue('SHEETS.TAB_NAMES.PRIVACY_AUDIT');
    this.cacheTtlMs = this.privacyConfig.CACHE_TTL_MS || (5 * 60 * 1000);
    this.failClosed = this.privacyConfig.FAIL_CLOSED !== false;
    this.minorAgeThreshold = this.privacyConfig.MINOR_AGE_THRESHOLD || 16;
    this.auditEnabled = !!(this.privacyConfig.AUDIT && this.privacyConfig.AUDIT.ENABLED !== false);

    this.playerConsentCache = new Map();
    this.playerLookupIndex = new Map();
    this.consentRecordIndex = new Map();
    this.lastConsentHydration = 0;
  }

  get logger() {
    if (!this._logger) {
      try {
        this._logger = logger.scope(this.loggerName);
      } catch (error) {
        this._logger = {
          enterFunction: (fn, data) => console.log(`[${this.loggerName}] → ${fn}`, data || ''),
          exitFunction: (fn, data) => console.log(`[${this.loggerName}] ← ${fn}`, data || ''),
          info: (msg, data) => console.log(`[${this.loggerName}] ${msg}`, data || ''),
          warn: (msg, data) => console.warn(`[${this.loggerName}] ${msg}`, data || ''),
          error: (msg, data) => console.error(`[${this.loggerName}] ${msg}`, data || ''),
          audit: (msg, data) => console.log(`[${this.loggerName}] AUDIT: ${msg}`, data || ''),
          security: (msg, data) => console.log(`[${this.loggerName}] SECURITY: ${msg}`, data || '')
        };
      }
    }
    return this._logger;
  }

  // ==================== PII DETECTION AND CLASSIFICATION ====================

  /**
   * Detect and classify PII in data
   * @param {Object} data - Data to analyze
   * @returns {Object} PII detection results
   */
  detectPII(data) {
    this.logger.enterFunction('detectPII', { dataKeys: Object.keys(data) });

    try {
      const piiDetected = {
        fields: [],
        riskLevel: 'low',
        recommendations: [],
        detectedTypes: []
      };

      for (const [key, value] of Object.entries(data)) {
        const fieldAnalysis = this.analyzeField(key, value);
        if (fieldAnalysis.isPII) {
          piiDetected.fields.push({
            field: key,
            type: fieldAnalysis.type,
            severity: fieldAnalysis.severity,
            value: this.maskValue(value, fieldAnalysis.type)
          });
          piiDetected.detectedTypes.push(fieldAnalysis.type);
        }
      }

      // Determine overall risk level
      piiDetected.riskLevel = this.calculateRiskLevel(piiDetected.detectedTypes);

      // Generate recommendations
      piiDetected.recommendations = this.generatePrivacyRecommendations(piiDetected);

      this.logger.exitFunction('detectPII', {
        fieldsDetected: piiDetected.fields.length,
        riskLevel: piiDetected.riskLevel
      });

      return piiDetected;

    } catch (error) {
      this.logger.error('PII detection failed', { error: error.toString() });
      return { fields: [], riskLevel: 'unknown', recommendations: [], detectedTypes: [] };
    }
  }

  /**
   * Analyze individual field for PII
   * @param {string} fieldName - Field name
   * @param {any} value - Field value
   * @returns {Object} Field analysis
   */
  analyzeField(fieldName, value) {
    const analysis = {
      isPII: false,
      type: 'none',
      severity: 'low',
      confidence: 0
    };

    if (!value || typeof value !== 'string') {
      return analysis;
    }

    const lowercaseField = fieldName.toLowerCase();
    const stringValue = value.toString();

    // Email detection
    if (this.isEmail(stringValue) || lowercaseField.includes('email')) {
      analysis.isPII = true;
      analysis.type = 'email';
      analysis.severity = 'medium';
      analysis.confidence = 0.9;
      return analysis;
    }

    // Phone number detection
    if (this.isPhoneNumber(stringValue) || lowercaseField.includes('phone')) {
      analysis.isPII = true;
      analysis.type = 'phone';
      analysis.severity = 'medium';
      analysis.confidence = 0.8;
      return analysis;
    }

    // Name detection (for player names)
    if (lowercaseField.includes('name') && this.isPersonName(stringValue)) {
      analysis.isPII = true;
      analysis.type = 'name';
      analysis.severity = this.sensitivePlayerData.includes(lowercaseField) ? 'high' : 'medium';
      analysis.confidence = 0.7;
      return analysis;
    }

    // Address detection
    if (lowercaseField.includes('address') || lowercaseField.includes('postcode')) {
      analysis.isPII = true;
      analysis.type = 'address';
      analysis.severity = 'high';
      analysis.confidence = 0.9;
      return analysis;
    }

    // Date of birth detection
    if (lowercaseField.includes('dob') || lowercaseField.includes('birth')) {
      analysis.isPII = true;
      analysis.type = 'dob';
      analysis.severity = 'high';
      analysis.confidence = 0.9;
      return analysis;
    }

    // Medical information
    if (lowercaseField.includes('medical') || lowercaseField.includes('health')) {
      analysis.isPII = true;
      analysis.type = 'medical';
      analysis.severity = 'very_high';
      analysis.confidence = 0.8;
      return analysis;
    }

    return analysis;
  }

  /**
   * Enhanced PII masking with different strategies
   * @param {any} value - Value to mask
   * @param {string} type - PII type
   * @param {string} strategy - Masking strategy
   * @returns {string} Masked value
   */
  maskValue(value, type, strategy = 'partial') {
    if (!value) return value;

    const stringValue = value.toString();

    switch (type) {
      case 'email':
        return this.maskEmail(stringValue, strategy);
      case 'phone':
        return this.maskPhone(stringValue, strategy);
      case 'name':
        return this.maskName(stringValue, strategy);
      case 'address':
        return this.maskAddress(stringValue, strategy);
      case 'dob':
        return this.maskDate(stringValue, strategy);
      default:
        return this.maskGeneric(stringValue, strategy);
    }
  }

  /**
   * Mask email addresses
   * @param {string} email - Email to mask
   * @param {string} strategy - Masking strategy
   * @returns {string} Masked email
   */
  maskEmail(email, strategy) {
    switch (strategy) {
      case 'full':
        return '***@***.***';
      case 'domain':
        const [local] = email.split('@');
        return `${local}@***.***`;
      case 'partial':
      default:
        const [localPart, domain] = email.split('@');
        const maskedLocal = localPart.length > 2 ?
          localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1) :
          '*'.repeat(localPart.length);
        return `${maskedLocal}@${domain}`;
    }
  }

  /**
   * Mask phone numbers
   * @param {string} phone - Phone to mask
   * @param {string} strategy - Masking strategy
   * @returns {string} Masked phone
   */
  maskPhone(phone, strategy) {
    const cleanPhone = phone.replace(/\D/g, '');

    switch (strategy) {
      case 'full':
        return '*'.repeat(phone.length);
      case 'last_four':
        return '*'.repeat(Math.max(0, cleanPhone.length - 4)) + cleanPhone.slice(-4);
      case 'partial':
      default:
        if (cleanPhone.length > 6) {
          return cleanPhone.slice(0, 3) + '*'.repeat(cleanPhone.length - 6) + cleanPhone.slice(-3);
        }
        return '*'.repeat(phone.length);
    }
  }

  /**
   * Mask names (especially player names)
   * @param {string} name - Name to mask
   * @param {string} strategy - Masking strategy
   * @returns {string} Masked name
   */
  maskName(name, strategy) {
    const nameParts = name.split(' ');

    switch (strategy) {
      case 'full':
        return nameParts.map(() => '***').join(' ');
      case 'last_name_only':
        return nameParts.length > 1 ?
          nameParts[0] + ' ' + nameParts.slice(1).map(() => '***').join(' ') :
          this.maskGeneric(name, 'partial');
      case 'initials':
        return nameParts.map(part => part.charAt(0) + '.').join(' ');
      case 'partial':
      default:
        return nameParts.map(part =>
          part.length > 2 ?
            part.charAt(0) + '*'.repeat(part.length - 2) + part.charAt(part.length - 1) :
            '*'.repeat(part.length)
        ).join(' ');
    }
  }

  /**
   * Mask addresses
   * @param {string} address - Address to mask
   * @param {string} strategy - Masking strategy
   * @returns {string} Masked address
   */
  maskAddress(address, strategy) {
    switch (strategy) {
      case 'full':
        return '*** *** ***';
      case 'city_only':
        const parts = address.split(',');
        return parts.length > 1 ?
          '*** ***, ' + parts[parts.length - 1].trim() :
          '*** ***';
      case 'partial':
      default:
        return address.split(' ')
          .map((word, index) => index === 0 ? word : '*'.repeat(word.length))
          .join(' ');
    }
  }

  /**
   * Mask dates (especially birth dates)
   * @param {string} date - Date to mask
   * @param {string} strategy - Masking strategy
   * @returns {string} Masked date
   */
  maskDate(date, strategy) {
    switch (strategy) {
      case 'full':
        return '***-**-**';
      case 'year_only':
        return '***-**-' + date.slice(-4);
      case 'month_day':
        return date.slice(0, 6) + '****';
      case 'partial':
      default:
        return '***-' + date.slice(5);
    }
  }

  /**
   * Generic masking for unknown PII types
   * @param {string} value - Value to mask
   * @param {string} strategy - Masking strategy
   * @returns {string} Masked value
   */
  maskGeneric(value, strategy) {
    switch (strategy) {
      case 'full':
        return '*'.repeat(value.length);
      case 'partial':
      default:
        if (value.length <= 3) {
          return '*'.repeat(value.length);
        }
        return value.charAt(0) + '*'.repeat(value.length - 2) + value.charAt(value.length - 1);
    }
  }

  // ==================== CONSENT DATA PERSISTENCE & EVALUATION ====================

  /**
   * Refresh cached consent data from Google Sheets
   * @param {boolean} forceReload - Force hydration even if cache valid
   * @returns {Object} Hydration result
   */
  refreshConsentCaches(forceReload = false) {
    const now = Date.now();
    const cacheValid = (now - this.lastConsentHydration) < this.cacheTtlMs;

    if (!forceReload && cacheValid && this.playerConsentCache.size > 0) {
      return { success: true, refreshed: false };
    }

    return this.hydrateConsentData();
  }

  /**
   * Hydrate consent data from the Players and Consents sheets
   * @returns {Object} Hydration summary
   */
  hydrateConsentData() {
    this.logger.enterFunction('hydrateConsentData');

    try {
      const playerColumns = getConfigValue('SHEETS.REQUIRED_COLUMNS.PRIVACY_PLAYERS', []);
      const consentColumns = getConfigValue('SHEETS.REQUIRED_COLUMNS.PRIVACY_CONSENTS', []);

      const playersSheet = SheetUtils.getOrCreateSheet(this.playersSheetName, playerColumns);
      if (!playersSheet) {
        throw new Error('Privacy players sheet unavailable');
      }

      const consentsSheet = SheetUtils.getOrCreateSheet(this.consentsSheetName, consentColumns);

      const playerRows = SheetUtils.getAllDataAsObjects(playersSheet);
      const consentRows = consentsSheet ? SheetUtils.getAllDataAsObjects(consentsSheet) : [];

      this.playerConsentCache.clear();
      this.playerLookupIndex.clear();
      this.consentRecordIndex.clear();

      playerRows.forEach(row => {
        const profile = this.buildPlayerProfile(row);
        if (!profile) {
          return;
        }

        this.playerConsentCache.set(profile.cacheKey, profile);
        if (profile.nameKey) {
          if (!this.playerLookupIndex.has(profile.nameKey)) {
            this.playerLookupIndex.set(profile.nameKey, profile.cacheKey);
          }
        }
      });

      consentRows.forEach(row => {
        const record = this.buildConsentRecord(row);
        if (!record) {
          return;
        }

        const cacheKey = this.normalizeKey(record.playerId);
        if (!this.consentRecordIndex.has(cacheKey)) {
          this.consentRecordIndex.set(cacheKey, []);
        }
        this.consentRecordIndex.get(cacheKey).push(record);
      });

      this.consentRecordIndex.forEach(records => {
        records.sort((a, b) => (b.capturedAt || 0) - (a.capturedAt || 0));
      });

      this.lastConsentHydration = Date.now();

      const hydrationSummary = {
        success: true,
        refreshed: true,
        players: this.playerConsentCache.size,
        consents: consentRows.length
      };

      this.logger.exitFunction('hydrateConsentData', hydrationSummary);
      return hydrationSummary;

    } catch (error) {
      this.logger.error('Consent data hydration failed', { error: error.toString() });

      if (this.failClosed) {
        this.playerConsentCache.clear();
        this.consentRecordIndex.clear();
      }

      return { success: false, error: error.toString() };
    }
  }

  /**
   * Build normalized player profile from sheet row
   * @param {Object} row - Sheet row
   * @returns {Object|null} Player profile
   */
  buildPlayerProfile(row) {
    if (!row) {
      return null;
    }

    const playerIdRaw = row['Player ID'] || row.player_id || row.Id || '';
    const fullNameRaw = row['Full Name'] || row['Player Name'] || row.full_name || row.name || '';

    if (!playerIdRaw && !fullNameRaw) {
      return null;
    }

    const cacheKey = this.normalizeKey(playerIdRaw || fullNameRaw);
    const nameKey = fullNameRaw ? this.normalizeKey(fullNameRaw) : null;
    const cleanedName = fullNameRaw ? StringUtils.cleanPlayerName(fullNameRaw) : '';

    const dob = this.parseDate(row['Date of Birth'] || row.dob || row['DOB']);
    const ageYears = this.calculateAge(dob);
    const isMinor = typeof ageYears === 'number' ? ageYears < this.minorAgeThreshold : false;

    const defaultStatusRaw = (row['Default Consent Status'] || row.consent_status || '').toString();
    const defaultStatus = this.normalizeKey(defaultStatusRaw);
    const defaultExpiry = this.parseDate(row['Default Consent Expiry'] || row.consent_expiry);

    return {
      playerId: playerIdRaw ? playerIdRaw.toString().trim() : cleanedName,
      cacheKey: cacheKey,
      fullName: cleanedName,
      nameKey: nameKey,
      dateOfBirth: dob ? DateUtils.formatISO(dob) : null,
      dobDate: dob,
      ageYears: ageYears,
      isMinor: isMinor,
      defaultStatus: defaultStatus,
      defaultExpiry: defaultExpiry,
      anonymiseFaces: this.toBoolean(row['Anonymise Faces'] || row.anonymise_faces, false),
      useInitialsOnly: this.toBoolean(row['Use Initials Only'] || row.use_initials_only, false),
      guardianName: row['Guardian Name'] || row.guardian_name || '',
      guardianEmail: row['Guardian Email'] || row.guardian_email || '',
      guardianPhone: row['Guardian Phone'] || row.guardian_phone || '',
      lastReviewed: row['Last Reviewed'] || row.last_reviewed || ''
    };
  }

  /**
   * Build normalized consent record from sheet row
   * @param {Object} row - Sheet row data
   * @returns {Object|null} Consent record
   */
  buildConsentRecord(row) {
    if (!row) {
      return null;
    }

    const playerIdRaw = row['Player ID'] || row.player_id || row.PlayerId;
    if (!playerIdRaw) {
      return null;
    }

    const consentTypeRaw = row['Consent Type'] || row.consent_type || this.privacyConfig.CONSENT_TYPES?.GENERAL_MEDIA;
    const statusRaw = row['Status'] || row.status || '';
    const capturedAt = this.parseDate(row['Captured At'] || row.captured_at);
    const expiresAt = this.parseDate(row['Expires At'] || row.expires_at);
    const revokedAt = this.parseDate(row['Revoked At'] || row.revoked_at);

    return {
      playerId: playerIdRaw.toString().trim(),
      consentType: this.normalizeKey(consentTypeRaw || 'general_media'),
      status: this.normalizeConsentStatus(statusRaw),
      capturedAt: capturedAt ? capturedAt.getTime() : null,
      capturedDate: capturedAt,
      expiresAt: expiresAt ? expiresAt.getTime() : null,
      expiresDate: expiresAt,
      revokedAt: revokedAt ? revokedAt.getTime() : null,
      revokedDate: revokedAt,
      proofReference: row['Proof Reference'] || row.proof || '',
      source: row['Source'] || row.source || '',
      notes: row['Notes'] || row.notes || '',
      anonymiseFaces: this.toBoolean(row['Anonymise Faces'] || row.anonymise_faces, false),
      useInitialsOnly: this.toBoolean(row['Use Initials Only'] || row.use_initials_only, false)
    };
  }

  /**
   * Evaluate media consent for players
   * @param {Object} context - Evaluation context
   * @returns {Object} Consent decision
   */
  evaluateConsentForMedia(context = {}) {
    const players = Array.isArray(context.players) ? context.players : [];
    const eventType = context.eventType || context.mediaType || 'general_media';
    const moduleName = context.module || 'unknown';

    this.logger.enterFunction('evaluateConsentForMedia', {
      module: moduleName,
      eventType,
      playerCount: players.length,
      platform: context.platform || 'unspecified'
    });

    try {
      const hydration = this.refreshConsentCaches(false);
      if (!hydration.success && this.failClosed) {
        throw new Error(hydration.error || 'Consent data unavailable');
      }

      const globalFlags = this.privacyConfig.GLOBAL_FLAGS || {};
      const aggregatedFlags = {
        anonymiseFaces: this.toBoolean(globalFlags.ANONYMISE_FACES, false),
        useInitialsOnly: this.toBoolean(globalFlags.USE_INITIALS_ONLY, false)
      };

      const playerResults = players.map(playerRef =>
        this.evaluatePlayerConsent(playerRef, context, aggregatedFlags)
      );

      playerResults.forEach(result => {
        aggregatedFlags.anonymiseFaces = aggregatedFlags.anonymiseFaces || result.anonymiseFaces;
        aggregatedFlags.useInitialsOnly = aggregatedFlags.useInitialsOnly || result.useInitialsOnly;
      });

      const blockedPlayer = playerResults.find(result => !result.allowed);
      const allowed = players.length === 0 ? true : !blockedPlayer;
      const decisionReason = blockedPlayer ? blockedPlayer.reason : 'consent_granted';

      const decision = {
        allowed: allowed,
        reason: decisionReason,
        mediaType: context.mediaType || eventType,
        platform: context.platform || 'unspecified',
        module: moduleName,
        eventType: eventType,
        anonymiseFaces: aggregatedFlags.anonymiseFaces,
        useInitialsOnly: aggregatedFlags.useInitialsOnly,
        players: playerResults,
        evaluated_at: DateUtils.formatISO(DateUtils.now()),
        matchId: context.matchId || context.match_id || null
      };

      if (!context.skipAudit) {
        this.recordConsentAudit(decision, context);
      }

      this.logger.exitFunction('evaluateConsentForMedia', {
        allowed: decision.allowed,
        anonymiseFaces: decision.anonymiseFaces,
        useInitialsOnly: decision.useInitialsOnly
      });

      return decision;

    } catch (error) {
      this.logger.error('Consent evaluation failed', { error: error.toString(), context });

      const fallbackDecision = {
        allowed: false,
        reason: `consent_evaluation_error:${error.message || error.toString()}`,
        mediaType: context.mediaType || 'general_media',
        platform: context.platform || 'unspecified',
        module: moduleName,
        eventType: eventType,
        anonymiseFaces: true,
        useInitialsOnly: true,
        players: [],
        evaluated_at: DateUtils.formatISO(DateUtils.now()),
        matchId: context.matchId || context.match_id || null
      };

      if (!context.skipAudit) {
        this.recordConsentAudit(fallbackDecision, { ...context, error: error.toString() });
      }

      return fallbackDecision;
    }
  }

  /**
   * Evaluate consent for a single player
   * @param {Object|string} playerRef - Player reference (ID or name)
   * @param {Object} context - Evaluation context
   * @param {Object} aggregatedFlags - Aggregated anonymisation flags
   * @returns {Object} Player consent result
   */
  evaluatePlayerConsent(playerRef, context, aggregatedFlags) {
    const consentType = this.normalizeKey(context.mediaType || this.privacyConfig.CONSENT_TYPES?.GENERAL_MEDIA || 'general_media');
    const normalizedRef = this.normalizePlayerRef(playerRef);

    if (!normalizedRef.value) {
      return this.buildFailedConsentResult(null, 'missing_player_reference');
    }

    const profile = this.getPlayerProfile(normalizedRef);
    if (!profile) {
      return this.buildFailedConsentResult(normalizedRef.value, 'player_not_registered');
    }

    const records = this.consentRecordIndex.get(profile.cacheKey) || [];
    const filteredRecords = this.filterConsentRecords(records, consentType);

    const consentStatus = this.resolveConsentStatus(profile, filteredRecords, context, aggregatedFlags);

    return {
      playerId: profile.playerId,
      playerName: profile.fullName,
      isMinor: profile.isMinor,
      consentStatus: consentStatus.status,
      allowed: consentStatus.allowed,
      reason: consentStatus.reason,
      expiresAt: consentStatus.expiresAt,
      anonymiseFaces: consentStatus.anonymiseFaces,
      useInitialsOnly: consentStatus.useInitialsOnly,
      proofReference: consentStatus.proofReference,
      consentType: consentType,
      lastReviewed: profile.lastReviewed || null
    };
  }

  /**
   * Build failed consent result for fail-closed scenarios
   * @param {string|null} playerRef - Player reference
   * @param {string} reason - Failure reason
   * @returns {Object} Consent result
   */
  buildFailedConsentResult(playerRef, reason) {
    return {
      playerId: playerRef || '',
      playerName: playerRef || '',
      isMinor: false,
      consentStatus: 'unknown',
      allowed: this.failClosed ? false : true,
      reason: reason,
      expiresAt: null,
      anonymiseFaces: true,
      useInitialsOnly: true,
      proofReference: '',
      consentType: 'general_media',
      lastReviewed: null
    };
  }

  /**
   * Normalize consent status values
   * @param {string} status - Raw status
   * @returns {string} Normalized status
   */
  normalizeConsentStatus(status) {
    const normalized = this.normalizeKey(status);

    if (['granted', 'approved', 'allow', 'allowed'].includes(normalized)) {
      return 'granted';
    }

    if (['revoked', 'withdrawn', 'cancelled', 'denied', 'declined'].includes(normalized)) {
      return 'revoked';
    }

    if (['pending', 'awaiting', 'requested'].includes(normalized)) {
      return 'pending';
    }

    if (normalized === 'expired') {
      return 'expired';
    }

    return normalized || 'unknown';
  }

  /**
   * Filter consent records by type with fallbacks
   * @param {Array<Object>} records - Consent records
   * @param {string} consentType - Consent type key
   * @returns {Array<Object>} Filtered records
   */
  filterConsentRecords(records, consentType) {
    if (!records || records.length === 0) {
      return [];
    }

    const fallbacks = [
      consentType,
      this.normalizeKey(this.privacyConfig.CONSENT_TYPES?.GENERAL_MEDIA || 'general_media'),
      'all',
      'all_media'
    ];

    return records.filter(record => fallbacks.includes(record.consentType));
  }

  /**
   * Resolve consent status using profile and records
   * @param {Object} profile - Player profile
   * @param {Array<Object>} records - Consent records
   * @param {Object} context - Evaluation context
   * @param {Object} aggregatedFlags - Aggregated anonymisation flags
   * @returns {Object} Consent resolution result
   */
  resolveConsentStatus(profile, records, context, aggregatedFlags) {
    const now = DateUtils.now();
    const nowTime = now.getTime();
    let status = 'unknown';
    let allowed = false;
    let reason = '';
    let expiresAtIso = null;
    let proofReference = '';

    let anonymiseFaces = aggregatedFlags.anonymiseFaces || profile.anonymiseFaces;
    let useInitialsOnly = aggregatedFlags.useInitialsOnly || profile.useInitialsOnly;

    const revokedRecord = records.find(record => record.status === 'revoked' && (!record.revokedDate || record.revokedDate <= nowTime));
    if (revokedRecord) {
      status = 'revoked';
      reason = 'consent_revoked';
      anonymiseFaces = true;
      useInitialsOnly = true;
      proofReference = revokedRecord.proofReference || '';
      return {
        allowed: false,
        status,
        reason,
        expiresAt: null,
        anonymiseFaces,
        useInitialsOnly,
        proofReference
      };
    }

    const grantedRecord = records.find(record => record.status === 'granted');
    if (grantedRecord) {
      if (grantedRecord.expiresDate && grantedRecord.expiresDate.getTime() < nowTime) {
        status = 'expired';
        reason = 'consent_expired';
        anonymiseFaces = true;
        useInitialsOnly = true;
        expiresAtIso = DateUtils.formatISO(grantedRecord.expiresDate);
      } else {
        status = 'granted';
        allowed = true;
        expiresAtIso = grantedRecord.expiresDate ? DateUtils.formatISO(grantedRecord.expiresDate) : null;
        anonymiseFaces = anonymiseFaces || grantedRecord.anonymiseFaces;
        useInitialsOnly = useInitialsOnly || grantedRecord.useInitialsOnly;
        proofReference = grantedRecord.proofReference || '';
      }
    } else if (records.some(record => record.status === 'pending')) {
      status = 'pending';
      reason = 'consent_pending';
      anonymiseFaces = true;
      useInitialsOnly = true;
    } else {
      status = profile.defaultStatus || 'unknown';

      if (status === 'granted') {
        const defaultExpiry = profile.defaultExpiry;
        if (defaultExpiry && defaultExpiry.getTime() < nowTime) {
          status = 'expired';
          reason = 'default_consent_expired';
          anonymiseFaces = true;
          useInitialsOnly = true;
          expiresAtIso = DateUtils.formatISO(defaultExpiry);
        } else {
          allowed = !profile.isMinor; // minors require explicit consent record
          expiresAtIso = defaultExpiry ? DateUtils.formatISO(defaultExpiry) : null;
        }
      } else {
        status = 'missing';
        reason = 'no_consent_record';
        anonymiseFaces = true;
        useInitialsOnly = true;
      }
    }

    if (profile.isMinor && allowed) {
      // Fail closed for minors unless explicit granted record exists
      const hasExplicitGrant = records.some(record => {
        if (record.status !== 'granted') {
          return false;
        }
        if (!record.expiresDate) {
          return true;
        }
        return record.expiresDate.getTime() >= nowTime;
      });
      if (!hasExplicitGrant) {
        allowed = false;
        status = 'missing';
        reason = 'minor_requires_documented_consent';
        anonymiseFaces = true;
        useInitialsOnly = true;
      }
    }

    if (!allowed && !reason) {
      reason = `consent_${status}`;
    }

    return {
      allowed: allowed,
      status,
      reason,
      expiresAt: expiresAtIso,
      anonymiseFaces,
      useInitialsOnly,
      proofReference
    };
  }

  /**
   * Normalize player reference to identifier or name key
   * @param {Object|string} playerRef - Player reference
   * @returns {Object} Normalized reference
   */
  normalizePlayerRef(playerRef) {
    if (!playerRef && playerRef !== 0) {
      return { value: '', type: 'unknown' };
    }

    if (typeof playerRef === 'object') {
      if (playerRef.playerId || playerRef.player_id || playerRef.id) {
        return { value: this.normalizeKey(playerRef.playerId || playerRef.player_id || playerRef.id), type: 'id' };
      }
      if (playerRef.player || playerRef.fullName || playerRef.name) {
        return { value: this.normalizeKey(playerRef.player || playerRef.fullName || playerRef.name), type: 'name' };
      }
    }

    const value = playerRef.toString().trim();
    if (!value) {
      return { value: '', type: 'unknown' };
    }

    const normalized = this.normalizeKey(value);
    if (this.playerConsentCache.has(normalized)) {
      return { value: normalized, type: 'id' };
    }

    return { value: normalized, type: 'name' };
  }

  /**
   * Get cached player profile
   * @param {Object} normalizedRef - Normalized reference
   * @returns {Object|null} Player profile
   */
  getPlayerProfile(normalizedRef) {
    if (!normalizedRef || !normalizedRef.value) {
      return null;
    }

    if (normalizedRef.type === 'id') {
      return this.playerConsentCache.get(normalizedRef.value) || null;
    }

    const cacheKey = this.playerLookupIndex.get(normalizedRef.value);
    if (cacheKey) {
      return this.playerConsentCache.get(cacheKey) || null;
    }

    for (const profile of this.playerConsentCache.values()) {
      if (this.normalizeKey(profile.fullName) === normalizedRef.value) {
        return profile;
      }
    }

    return null;
  }

  /**
   * Record consent decision to audit log
   * @param {Object} decision - Consent decision
   * @param {Object} context - Evaluation context
   */
  recordConsentAudit(decision, context = {}) {
    if (!this.auditEnabled) {
      return;
    }

    try {
      const columns = getConfigValue('SHEETS.REQUIRED_COLUMNS.PRIVACY_AUDIT', []);
      const sheet = SheetUtils.getOrCreateSheet(this.auditSheetName, columns);
      if (!sheet) {
        return;
      }

      const timestamp = decision.evaluated_at || DateUtils.formatISO(DateUtils.now());
      const players = decision.players && decision.players.length > 0 ? decision.players : [
        {
          playerId: '',
          playerName: '',
          reason: decision.reason,
          consentStatus: 'n/a'
        }
      ];

      players.forEach(player => {
        const row = {
          'Timestamp': timestamp,
          'Player ID': player.playerId || '',
          'Player Name': player.playerName || '',
          'Action': 'media_post_evaluation',
          'Media Type': decision.mediaType,
          'Platform': decision.platform,
          'Decision': decision.allowed ? 'allowed' : 'blocked',
          'Reason': player.reason || decision.reason,
          'Context': JSON.stringify({
            module: decision.module,
            eventType: decision.eventType,
            matchId: decision.matchId || null,
            consentStatus: player.consentStatus || 'unknown'
          }),
          'Performed By': 'automation'
        };

        SheetUtils.addRowFromObject(sheet, row);
      });

      this.enforceAuditRetention(sheet);

    } catch (error) {
      this.logger.warn('Consent audit logging failed', { error: error.toString() });
    }
  }

  /**
   * Enforce audit sheet retention limits
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Audit sheet
   */
  enforceAuditRetention(sheet) {
    try {
      const maxRows = (this.privacyConfig.AUDIT && this.privacyConfig.AUDIT.MAX_ROWS) || 2000;
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1 || maxRows <= 0) {
        return;
      }

      const allowedRows = maxRows + 1; // include header row
      if (lastRow > allowedRows) {
        const rowsToDelete = lastRow - allowedRows;
        sheet.deleteRows(2, rowsToDelete);
      }
    } catch (error) {
      this.logger.warn('Audit retention enforcement failed', { error: error.toString() });
    }
  }

  /**
   * Build consent dashboard summary for control panel
   * @param {number|null} windowDays - Expiry window in days
   * @returns {Object} Summary data
   */
  getConsentDashboardSummary(windowDays = null) {
    this.logger.enterFunction('getConsentDashboardSummary', { windowDays });

    try {
      const hydration = this.refreshConsentCaches(false);
      if (!hydration.success && this.failClosed) {
        throw new Error(hydration.error || 'Consent data unavailable');
      }

      const players = Array.from(this.playerConsentCache.values());
      const minors = players.filter(profile => profile.isMinor);
      const globalFlags = this.privacyConfig.GLOBAL_FLAGS || {};
      let minorsWithoutConsent = 0;

      minors.forEach(profile => {
        const result = this.evaluatePlayerConsent(
          { playerId: profile.playerId },
          {
            mediaType: this.privacyConfig.CONSENT_TYPES?.GENERAL_MEDIA || 'general_media',
            module: 'dashboard',
            platform: 'control_panel',
            skipAudit: true
          },
          {
            anonymiseFaces: this.toBoolean(globalFlags.ANONYMISE_FACES, false),
            useInitialsOnly: this.toBoolean(globalFlags.USE_INITIALS_ONLY, false)
          }
        );

        if (!result.allowed) {
          minorsWithoutConsent += 1;
        }
      });

      const expiring = this.getConsentExpiryReport(windowDays, true);
      const auditSummary = this.getAuditSummary();

      const summary = {
        total_players: players.length,
        minors: minors.length,
        minors_without_active_consent: minorsWithoutConsent,
        global_flags: {
          anonymiseFaces: this.toBoolean(globalFlags.ANONYMISE_FACES, false),
          useInitialsOnly: this.toBoolean(globalFlags.USE_INITIALS_ONLY, false)
        },
        expiring_consents: expiring.slice(0, 10),
        audit: auditSummary
      };

      this.logger.exitFunction('getConsentDashboardSummary', { success: true });
      return { success: true, summary };

    } catch (error) {
      this.logger.error('Consent dashboard summary failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Get audit summary for control panel
   * @param {number} days - Lookback window
   * @returns {Object} Audit summary
   */
  getAuditSummary(days = 7) {
    if (!this.auditEnabled) {
      return { enabled: false };
    }

    try {
      const sheet = SheetUtils.getOrCreateSheet(
        this.auditSheetName,
        getConfigValue('SHEETS.REQUIRED_COLUMNS.PRIVACY_AUDIT', [])
      );

      if (!sheet) {
        return { enabled: false };
      }

      const rows = SheetUtils.getAllDataAsObjects(sheet);
      if (!rows || rows.length === 0) {
        return { enabled: true, blocked_last_7_days: 0, last_decision: null };
      }

      const threshold = DateUtils.addDays(DateUtils.now(), -Math.abs(days));
      let blocked = 0;
      let lastDecision = null;

      rows.forEach(row => {
        const timestamp = this.parseDate(row.Timestamp || row.timestamp);
        if (!lastDecision) {
          lastDecision = {
            timestamp: row.Timestamp || row.timestamp || '',
            decision: row.Decision || row.decision || '',
            playerName: row['Player Name'] || row.player_name || '',
            reason: row.Reason || row.reason || ''
          };
        }

        if (timestamp && timestamp >= threshold) {
          const decision = (row.Decision || row.decision || '').toString().toLowerCase();
          if (decision === 'blocked') {
            blocked += 1;
          }
        }
      });

      return {
        enabled: true,
        blocked_last_7_days: blocked,
        last_decision: lastDecision
      };

    } catch (error) {
      this.logger.warn('Consent audit summary failed', { error: error.toString() });
      return { enabled: false, error: error.toString() };
    }
  }

  /**
   * Get consents expiring within a window
   * @param {number|null} windowDays - Days until expiry
   * @param {boolean} skipAudit - Skip logging
   * @returns {Array<Object>} Expiring consents
   */
  getConsentExpiryReport(windowDays = null, skipAudit = false) {
    const days = typeof windowDays === 'number' ? windowDays : (this.privacyConfig.EXPIRY_NOTICE_DAYS || 30);
    const now = DateUtils.now();
    const nowTime = now.getTime();
    const threshold = DateUtils.addDays(new Date(now.getTime()), days);
    const thresholdTime = threshold.getTime();

    this.refreshConsentCaches(false);

    const expiring = [];

    this.consentRecordIndex.forEach((records, cacheKey) => {
      const profile = this.playerConsentCache.get(cacheKey) || null;

      records.forEach(record => {
        if (record.status !== 'granted' || !record.expiresDate) {
          return;
        }

        const expiresTime = record.expiresDate.getTime();

        if (expiresTime >= nowTime && expiresTime <= thresholdTime) {
          expiring.push({
            playerId: profile ? profile.playerId : record.playerId,
            playerName: profile ? profile.fullName : record.playerId,
            consentType: record.consentType,
            expires_at: DateUtils.formatISO(record.expiresDate),
            days_remaining: Math.ceil((expiresTime - nowTime) / (1000 * 60 * 60 * 24)),
            anonymiseFaces: record.anonymiseFaces || (profile ? profile.anonymiseFaces : false),
            useInitialsOnly: record.useInitialsOnly || (profile ? profile.useInitialsOnly : false)
          });
        }
      });
    });

    expiring.sort((a, b) => a.expires_at.localeCompare(b.expires_at));

    if (!skipAudit && this.auditEnabled) {
      this.logExpiryReport(expiring, days);
    }

    return expiring;
  }

  /**
   * Send nightly consent expiry report
   * @param {number|null} windowDays - Window for expiry
   * @returns {Object} Report result
   */
  sendConsentExpiryReport(windowDays = null) {
    this.logger.enterFunction('sendConsentExpiryReport', { windowDays });

    try {
      const expiring = this.getConsentExpiryReport(windowDays, false);
      const generatedAt = DateUtils.formatISO(DateUtils.now());

      const reporting = this.privacyConfig.REPORTING || {};
      const recipientsProperty = reporting.RECIPIENT_PROPERTY;
      let emailResult = { sent: false };

      if (reporting.ENABLED !== false && recipientsProperty) {
        const recipients = PropertiesService.getScriptProperties().getProperty(recipientsProperty);

        if (recipients && typeof MailApp !== 'undefined') {
          const emailBody = this.buildExpiryEmailHtml(expiring, generatedAt, windowDays);

          try {
            // @testHook(consent_expiry_email_start)
            MailApp.sendEmail({
              to: recipients,
              subject: 'Syston Tigers – Consent expiry report',
              htmlBody: emailBody,
              name: 'Syston Tigers Automation'
            });
            // @testHook(consent_expiry_email_complete)
            emailResult = { sent: true, recipients };
          } catch (emailError) {
            this.logger.warn('Consent expiry email failed', { error: emailError.toString() });
            emailResult = { sent: false, error: emailError.toString() };
          }
        }
      }

      this.logger.exitFunction('sendConsentExpiryReport', {
        success: true,
        expiring_count: expiring.length,
        email_sent: emailResult.sent
      });

      return {
        success: true,
        generated_at: generatedAt,
        expiring,
        email: emailResult
      };

    } catch (error) {
      this.logger.error('Consent expiry report failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Log expiry report to audit sheet
   * @param {Array<Object>} expiring - Expiring consents
   * @param {number} windowDays - Window days
   */
  logExpiryReport(expiring, windowDays) {
    if (!this.auditEnabled) {
      return;
    }

    try {
      const sheet = SheetUtils.getOrCreateSheet(
        this.auditSheetName,
        getConfigValue('SHEETS.REQUIRED_COLUMNS.PRIVACY_AUDIT', [])
      );

      if (!sheet) {
        return;
      }

      const timestamp = DateUtils.formatISO(DateUtils.now());

      if (!expiring || expiring.length === 0) {
        SheetUtils.addRowFromObject(sheet, {
          'Timestamp': timestamp,
          'Player ID': '',
          'Player Name': 'N/A',
          'Action': 'expiry_report',
          'Media Type': 'general_media',
          'Platform': 'automation',
          'Decision': 'clear',
          'Reason': `no_consents_expiring_${windowDays || this.privacyConfig.EXPIRY_NOTICE_DAYS || 30}`,
          'Context': '{}',
          'Performed By': 'automation'
        });
      } else {
        expiring.forEach(item => {
          SheetUtils.addRowFromObject(sheet, {
            'Timestamp': timestamp,
            'Player ID': item.playerId,
            'Player Name': item.playerName,
            'Action': 'expiry_report',
            'Media Type': item.consentType,
            'Platform': 'automation',
            'Decision': 'requires_attention',
            'Reason': `expires_in_${item.days_remaining}_days`,
            'Context': JSON.stringify({ expires_at: item.expires_at }),
            'Performed By': 'automation'
          });
        });
      }

      this.enforceAuditRetention(sheet);

    } catch (error) {
      this.logger.warn('Expiry report logging failed', { error: error.toString() });
    }
  }

  /**
   * Build expiry email body
   * @param {Array<Object>} expiring - Expiring consents
   * @param {string} generatedAt - Timestamp
   * @param {number|null} windowDays - Window
   * @returns {string} Email HTML
   */
  buildExpiryEmailHtml(expiring, generatedAt, windowDays) {
    const days = windowDays || this.privacyConfig.EXPIRY_NOTICE_DAYS || 30;
    if (!expiring || expiring.length === 0) {
      return `<p>Consent expiry report generated at ${generatedAt}.</p><p>No consents are due to expire within ${days} days.</p>`;
    }

    const rows = expiring.map(item => {
      return `<tr>
        <td>${item.playerName}</td>
        <td>${item.consentType}</td>
        <td>${item.expires_at}</td>
        <td>${item.days_remaining}</td>
      </tr>`;
    }).join('');

    return `
      <p>Consent expiry report generated at ${generatedAt}.</p>
      <p>The following consents expire within ${days} days:</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th>Player</th>
            <th>Consent Type</th>
            <th>Expires At</th>
            <th>Days Remaining</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  /**
   * Normalize string keys
   * @param {any} value - Value to normalize
   * @returns {string} Normalized key
   */
  normalizeKey(value) {
    if (value === null || value === undefined) {
      return '';
    }
    return value.toString().trim().toLowerCase();
  }

  /**
   * Convert value to boolean with fallback
   * @param {any} value - Value to convert
   * @param {boolean} fallback - Fallback value
   * @returns {boolean} Parsed boolean
   */
  toBoolean(value, fallback = false) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['yes', 'true', '1', 'y'].includes(normalized)) {
        return true;
      }
      if (['no', 'false', '0', 'n'].includes(normalized)) {
        return false;
      }
    }

    return fallback;
  }

  /**
   * Parse various date formats safely
   * @param {any} value - Date value
   * @returns {Date|null} Parsed date
   */
  parseDate(value) {
    if (!value && value !== 0) {
      return null;
    }

    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'number') {
      const fromNumber = new Date(value);
      return isNaN(fromNumber.getTime()) ? null : fromNumber;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const isoDate = new Date(trimmed);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }

      const ukDate = DateUtils.parseUK(trimmed);
      if (ukDate) {
        return ukDate;
      }
    }

    return null;
  }

  /**
   * Calculate age from date of birth
   * @param {Date|null} date - Date of birth
   * @returns {number|null} Age in years
   */
  calculateAge(date) {
    if (!date) {
      return null;
    }

    const diff = DateUtils.now().getTime() - date.getTime();
    if (diff <= 0) {
      return null;
    }

    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  // ==================== GDPR COMPLIANCE FEATURES ====================

  /**
   * Process data subject request (GDPR Article 15)
   * @param {string} subjectId - Data subject identifier
   * @param {string} requestType - Type of request (access, portability, deletion)
   * @param {Object} requestDetails - Request details
   * @returns {Object} Request processing result
   */
  processDataSubjectRequest(subjectId, requestType, requestDetails = {}) {
    this.logger.enterFunction('processDataSubjectRequest', { subjectId, requestType });

    try {
      // Validate request
      const validation = this.validateDataSubjectRequest(subjectId, requestType, requestDetails);
      if (!validation.success) {
        return validation;
      }

      let result = {};

      switch (requestType) {
        case 'access':
          result = this.processAccessRequest(subjectId, requestDetails);
          break;
        case 'portability':
          result = this.processPortabilityRequest(subjectId, requestDetails);
          break;
        case 'deletion':
          result = this.processDeletionRequest(subjectId, requestDetails);
          break;
        case 'rectification':
          result = this.processRectificationRequest(subjectId, requestDetails);
          break;
        default:
          return { success: false, error: `Unknown request type: ${requestType}` };
      }

      // Log the request processing
      this.logDataProcessing({
        type: 'data_subject_request',
        subjectId: this.normalizeSubjectId(subjectId),
        requestType: requestType,
        processed: new Date(),
        result: result.success
      });

      this.logger.exitFunction('processDataSubjectRequest', { success: result.success });
      return result;

    } catch (error) {
      this.logger.error('Data subject request processing failed', { subjectId, requestType, error: error.toString() });
      this.logger.exitFunction('processDataSubjectRequest', { success: false });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process access request (Right to know)
   * @param {string} subjectId - Subject identifier
   * @param {Object} requestDetails - Request details
   * @returns {Object} Access result
   */
  processAccessRequest(subjectId, requestDetails) {
    const normalizedSubjectId = this.normalizeSubjectId(subjectId);

    this.logger.enterFunction('processAccessRequest', {
      subject_hash: normalizedSubjectId,
      request_detail_keys: Object.keys(requestDetails || {})
    });

    try {
      const personalData = this.collectPersonalData(subjectId);
      const processedData = this.prepareDataForAccess(personalData);

      const result = {
        success: true,
        data: processedData,
        dataCategories: this.getDataCategories(personalData),
        processingPurposes: this.getProcessingPurposes(subjectId),
        retentionPeriod: this.getRetentionPeriod(subjectId),
        thirdParties: this.getThirdPartySharing(subjectId)
      };

      this.logger.exitFunction('processAccessRequest', {
        success: true,
        data_field_count: processedData ? Object.keys(processedData).length : 0
      });

      return result;

    } catch (error) {
      const errorMessage = `Access request failed: ${error.toString()}`;
      this.logger.error('Access request processing failed', {
        subject_hash: normalizedSubjectId,
        error: error.toString()
      });
      this.logger.exitFunction('processAccessRequest', { success: false });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process deletion request (Right to be forgotten)
   * @param {string} subjectId - Subject identifier
   * @param {Object} requestDetails - Request details
   * @returns {Object} Deletion result
   */
  processDeletionRequest(subjectId, requestDetails) {
    const normalizedSubjectId = this.normalizeSubjectId(subjectId);

    this.logger.enterFunction('processDeletionRequest', {
      subject_hash: normalizedSubjectId,
      request_detail_keys: Object.keys(requestDetails || {})
    });

    try {
      // Check if deletion is legally permissible
      const deletionCheck = this.canDeleteData(subjectId, requestDetails);
      if (!deletionCheck.canDelete) {
        const failureResult = {
          success: false,
          error: 'Deletion not permitted',
          reason: deletionCheck.reason
        };

        this.logger.exitFunction('processDeletionRequest', {
          success: false,
          reason: deletionCheck.reason || 'unknown'
        });

        return failureResult;
      }

      // Perform deletion
      const deletionResult = this.deletePersonalData(subjectId, requestDetails);

      // Anonymize remaining data if necessary
      if (deletionResult.anonymizeRemaining) {
        this.anonymizeRemainingData(subjectId);
      }

      const successResult = {
        success: true,
        message: 'Personal data deleted successfully',
        deletedRecords: deletionResult.deletedRecords,
        anonymizedRecords: deletionResult.anonymizedRecords
      };

      this.logger.exitFunction('processDeletionRequest', {
        success: true,
        deleted_records: deletionResult.deletedRecords || 0,
        anonymized_records: deletionResult.anonymizedRecords || 0
      });

      return successResult;

    } catch (error) {
      const errorMessage = `Deletion failed: ${error.toString()}`;
      this.logger.error('Deletion request processing failed', {
        subject_hash: normalizedSubjectId,
        error: error.toString()
      });
      this.logger.exitFunction('processDeletionRequest', { success: false });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process data portability request
   * @param {string} subjectId - Subject identifier
   * @param {Object} requestDetails - Request details
   * @returns {Object} Portability result
   */
  processPortabilityRequest(subjectId, requestDetails) {
    const normalizedSubjectId = this.normalizeSubjectId(subjectId);

    this.logger.enterFunction('processPortabilityRequest', {
      subject_hash: normalizedSubjectId,
      request_detail_keys: Object.keys(requestDetails || {})
    });

    try {
      const personalData = this.collectPersonalData(subjectId);
      const portableData = this.prepareDataForPortability(personalData);

      // Generate export in requested format
      const format = requestDetails.format || 'json';
      const exportData = this.formatDataForExport(portableData, format);

      const successResult = {
        success: true,
        data: exportData,
        format: format,
        exportDate: new Date().toISOString(),
        recordCount: Array.isArray(portableData) ? portableData.length : 0
      };

      this.logger.exitFunction('processPortabilityRequest', {
        success: true,
        record_count: successResult.recordCount,
        format: format
      });

      return successResult;

    } catch (error) {
      const errorMessage = `Portability request failed: ${error.toString()}`;
      this.logger.error('Portability request processing failed', {
        subject_hash: normalizedSubjectId,
        error: error.toString()
      });
      this.logger.exitFunction('processPortabilityRequest', { success: false });
      return { success: false, error: errorMessage };
    }
  }

  // ==================== DATA RETENTION MANAGEMENT ====================

  /**
   * Apply data retention policies
   * @param {Object} options - Retention options
   * @returns {Object} Retention result
   */
  applyRetentionPolicies(options = {}) {
    this.logger.enterFunction('applyRetentionPolicies');

    try {
      const results = {
        reviewedRecords: 0,
        deletedRecords: 0,
        anonymizedRecords: 0,
        errors: []
      };

      // Get all data categories and their retention periods
      const retentionRules = this.getRetentionRules();

      for (const [category, rules] of retentionRules) {
        try {
          const categoryResult = this.applyRetentionToCategory(category, rules);
          results.reviewedRecords += categoryResult.reviewed;
          results.deletedRecords += categoryResult.deleted;
          results.anonymizedRecords += categoryResult.anonymized;
        } catch (error) {
          results.errors.push(`${category}: ${error.toString()}`);
        }
      }

      this.logger.exitFunction('applyRetentionPolicies', {
        deleted: results.deletedRecords,
        anonymized: results.anonymizedRecords
      });

      return { success: true, results: results };

    } catch (error) {
      this.logger.error('Retention policy application failed', { error: error.toString() });
      this.logger.exitFunction('applyRetentionPolicies', { success: false });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Get retention rules for different data categories
   * @returns {Map} Retention rules
   */
  getRetentionRules() {
    const rules = new Map();

    // Player data retention
    rules.set('player_stats', {
      retention_period: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      action_after_expiry: 'anonymize'
    });

    // Match data retention
    rules.set('match_events', {
      retention_period: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
      action_after_expiry: 'anonymize'
    });

    // Personal details retention
    rules.set('personal_details', {
      retention_period: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years after last activity
      action_after_expiry: 'delete'
    });

    // Security logs retention
    rules.set('security_logs', {
      retention_period: 1 * 365 * 24 * 60 * 60 * 1000, // 1 year
      action_after_expiry: 'delete'
    });

    return rules;
  }

  // ==================== DATA ANONYMIZATION ====================

  /**
   * Anonymize player data while preserving statistical value
   * @param {Object} playerData - Player data to anonymize
   * @returns {Object} Anonymized data
   */
  anonymizePlayerData(playerData) {
    this.logger.enterFunction('anonymizePlayerData');

    try {
      const anonymized = { ...playerData };

      // Replace identifiable information with anonymous identifiers
      anonymized.player_name = `Player_${this.generateAnonymousId()}`;
      anonymized.player_id = this.generateAnonymousId();

      // Remove or generalize sensitive fields
      delete anonymized.email;
      delete anonymized.phone;
      delete anonymized.address;
      delete anonymized.date_of_birth;
      delete anonymized.registration_number;

      // Generalize remaining data
      if (anonymized.age) {
        anonymized.age_range = this.generalizeAge(anonymized.age);
        delete anonymized.age;
      }

      if (anonymized.position) {
        anonymized.position_group = this.generalizePosition(anonymized.position);
      }

      // Preserve statistical data
      // Goals, assists, minutes, etc. can remain as they're not personally identifiable

      this.logger.exitFunction('anonymizePlayerData', { success: true });
      return anonymized;

    } catch (error) {
      this.logger.error('Player data anonymization failed', { error: error.toString() });
      this.logger.exitFunction('anonymizePlayerData', { success: false });
      return playerData; // Return original if anonymization fails
    }
  }

  /**
   * Generalize age to age ranges
   * @param {number} age - Actual age
   * @returns {string} Age range
   */
  generalizeAge(age) {
    if (age < 18) return 'Under 18';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    return '45+';
  }

  /**
   * Generalize position to position groups
   * @param {string} position - Specific position
   * @returns {string} Position group
   */
  generalizePosition(position) {
    const defensePositions = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
    const midfieldPositions = ['CM', 'DM', 'AM', 'LM', 'RM'];
    const attackPositions = ['ST', 'CF', 'LW', 'RW'];

    if (defensePositions.includes(position)) return 'Defense';
    if (midfieldPositions.includes(position)) return 'Midfield';
    if (attackPositions.includes(position)) return 'Attack';
    if (position === 'GK') return 'Goalkeeper';
    return 'Outfield';
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if string is an email
   * @param {string} value - Value to check
   * @returns {boolean} Is email
   */
  isEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Check if string is a phone number
   * @param {string} value - Value to check
   * @returns {boolean} Is phone number
   */
  isPhoneNumber(value) {
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(value);
  }

  /**
   * Check if string is a person name
   * @param {string} value - Value to check
   * @returns {boolean} Is person name
   */
  isPersonName(value) {
    // Basic heuristic: 2-4 words, each starting with capital letter
    const nameRegex = /^[A-Z][a-z]+(\s[A-Z][a-z]+){1,3}$/;
    return nameRegex.test(value) && value.length > 3;
  }

  /**
   * Calculate risk level based on detected PII types
   * @param {Array} detectedTypes - Detected PII types
   * @returns {string} Risk level
   */
  calculateRiskLevel(detectedTypes) {
    if (detectedTypes.includes('medical') || detectedTypes.includes('financial')) {
      return 'very_high';
    }
    if (detectedTypes.includes('dob') || detectedTypes.includes('address')) {
      return 'high';
    }
    if (detectedTypes.includes('email') || detectedTypes.includes('phone')) {
      return 'medium';
    }
    if (detectedTypes.includes('name')) {
      return 'low';
    }
    return 'minimal';
  }

  /**
   * Generate privacy recommendations
   * @param {Object} piiAnalysis - PII analysis results
   * @returns {Array} Recommendations
   */
  generatePrivacyRecommendations(piiAnalysis) {
    const recommendations = [];

    if (piiAnalysis.riskLevel === 'very_high') {
      recommendations.push('Implement additional encryption for highly sensitive data');
      recommendations.push('Consider data minimization - collect only necessary information');
    }

    if (piiAnalysis.detectedTypes.includes('name')) {
      recommendations.push('Implement player name masking in logs and non-essential displays');
    }

    if (piiAnalysis.detectedTypes.includes('email')) {
      recommendations.push('Ensure email addresses are used only for necessary communications');
    }

    recommendations.push('Implement data retention policies for automatic cleanup');
    recommendations.push('Regular privacy audits and PII detection scans');

    return recommendations;
  }

  /**
   * Generate anonymous identifier
   * @returns {string} Anonymous identifier
   */
  generateAnonymousId() {
    return 'ANON_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  /**
   * Hash subject identifier for logging
   * @param {string} subjectId - Subject identifier
   * @returns {string} Hashed identifier
   */
  hashSubjectId(subjectId) {
    const value = subjectId === undefined || subjectId === null ? 'UNKNOWN' : String(subjectId);
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'HASH_' + hash.toString(16);
  }

  /**
   * Normalize subject identifier to hashed representation
   * @param {string} subjectId - Subject identifier
   * @returns {string} Normalized subject hash
   */
  normalizeSubjectId(subjectId) {
    if (typeof subjectId === 'string' && subjectId.startsWith('HASH_')) {
      return subjectId;
    }
    if (subjectId === undefined || subjectId === null) {
      return 'HASH_UNKNOWN';
    }
    return this.hashSubjectId(String(subjectId));
  }

  /**
   * Log data processing activity
   * @param {Object} activity - Processing activity
   */
  logDataProcessing(activity) {
    const activityType = activity && activity.type ? activity.type : 'unknown';
    const normalizedSubjectId = this.normalizeSubjectId(activity ? activity.subjectId : null);

    this.logger.enterFunction('logDataProcessing', {
      activity_type: activityType,
      subject_hash: normalizedSubjectId
    });

    try {
      const timestamp = activity && activity.timestamp ? activity.timestamp : new Date().toISOString();
      const auditEntry = {
        ...(activity || {}),
        timestamp,
        subjectId: normalizedSubjectId,
        source: 'PrivacyComplianceManager'
      };

      this.dataProcessingLog.push(auditEntry);

      // Keep only last 1000 entries
      if (this.dataProcessingLog.length > 1000) {
        this.dataProcessingLog = this.dataProcessingLog.slice(-1000);
      }

      // Also log to audit sheet
      // @testHook(privacy_audit_sheet_get_start)
      const auditSheet = SheetUtils.getOrCreateSheet('PrivacyAudit', [
        'Timestamp', 'Activity Type', 'Subject ID', 'Details', 'Result'
      ]);
      // @testHook(privacy_audit_sheet_get_complete)

      if (auditSheet) {
        const rowValues = [
          timestamp,
          activityType,
          normalizedSubjectId,
          JSON.stringify(auditEntry),
          auditEntry.result || 'N/A'
        ];

        // @testHook(privacy_audit_append_start)
        auditSheet.appendRow(rowValues);
        // @testHook(privacy_audit_append_complete)
      }

      this.logger.exitFunction('logDataProcessing', { success: true });

    } catch (error) {
      this.logger.error('Data processing logging failed', { error: error.toString() });
      this.logger.exitFunction('logDataProcessing', { success: false });
    }
  }

  /**
   * Validate data subject request
   * @param {string} subjectId - Subject identifier
   * @param {string} requestType - Request type
   * @param {Object} requestDetails - Request details
   * @returns {Object} Validation result
   */
  validateDataSubjectRequest(subjectId, requestType, requestDetails) {
    this.logger.enterFunction('validateDataSubjectRequest', {
      request_type: requestType,
      request_detail_keys: Object.keys(requestDetails || {})
    });

    let result = { success: true };

    try {
      // Validate subject ID
      const subjectValidation = validateInput(subjectId, 'string', { required: true, minLength: 3 });
      if (!subjectValidation.success) {
        result = { success: false, error: `Invalid subject ID: ${subjectValidation.error}` };
      }

      // Validate request type only if subject valid
      if (result.success) {
        const validRequestTypes = ['access', 'portability', 'deletion', 'rectification'];
        if (!validRequestTypes.includes(requestType)) {
          result = { success: false, error: `Invalid request type. Must be one of: ${validRequestTypes.join(', ')}` };
        }
      }

    } finally {
      this.logger.exitFunction('validateDataSubjectRequest', {
        success: result.success,
        error: result.success ? undefined : result.error
      });
    }

    return result;
  }

  // Placeholder methods for actual data operations (would need to be implemented based on specific data storage)
  collectPersonalData(subjectId) { return []; }
  prepareDataForAccess(data) { return data; }
  getDataCategories(data) { return []; }
  getProcessingPurposes(subjectId) { return []; }
  getRetentionPeriod(subjectId) { return '7 years'; }
  getThirdPartySharing(subjectId) { return []; }
  canDeleteData(subjectId, details) { return { canDelete: true, reason: '' }; }
  deletePersonalData(subjectId, details) { return { deletedRecords: 0, anonymizedRecords: 0 }; }
  anonymizeRemainingData(subjectId) { return true; }
  prepareDataForPortability(data) { return data; }
  formatDataForExport(data, format) { return JSON.stringify(data); }
  applyRetentionToCategory(category, rules) { return { reviewed: 0, deleted: 0, anonymized: 0 }; }
}

// ==================== GLOBAL PRIVACY FUNCTIONS ====================

/**
 * Global privacy compliance manager instance
 */
const PrivacyManager = new PrivacyComplianceManager();

// ==================== CONSENT GATE HELPER ====================

/**
 * ConsentGate provides reusable consent evaluation for outbound posts
 */
class ConsentGate {

  /**
   * Evaluate whether a payload can be published based on consent rules
   * @param {Object} payload - Payload destined for Make.com
   * @param {Object} context - Additional context metadata
   * @returns {Object} Consent decision
   */
  static evaluatePost(payload, context = {}) {
    const gateLogger = logger.scope('ConsentGate');
    const eventType = context.eventType || payload?.event_type || 'unspecified';
    const moduleName = context.module || 'unknown';

    gateLogger.enterFunction('evaluatePost', {
      module: moduleName,
      eventType,
      platform: context.platform || payload?.platform || 'unspecified'
    });

    try {
      const decision = PrivacyManager.evaluateConsentForMedia({
        players: context.players || [],
        mediaType: context.mediaType || payload?.media_type || eventType,
        platform: context.platform || payload?.platform || 'unspecified',
        module: moduleName,
        eventType,
        matchId: context.matchId || payload?.match_id || payload?.matchId || null,
        skipAudit: context.skipAudit === true
      });

      gateLogger.exitFunction('evaluatePost', {
        allowed: decision.allowed,
        anonymiseFaces: decision.anonymiseFaces,
        useInitialsOnly: decision.useInitialsOnly
      });

      return decision;

    } catch (error) {
      gateLogger.error('Consent gate evaluation failed', { error: error.toString() });
      return {
        allowed: false,
        reason: error.toString(),
        anonymiseFaces: true,
        useInitialsOnly: true,
        players: [],
        mediaType: context.mediaType || payload?.media_type || 'general_media',
        platform: context.platform || payload?.platform || 'unspecified',
        module: moduleName,
        eventType,
        evaluated_at: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Apply consent directives to payload metadata
   * @param {Object} payload - Original payload
   * @param {Object} decision - Consent decision
   * @returns {Object} Payload with privacy metadata
   */
  static applyDecisionToPayload(payload, decision) {
    if (!payload || !decision) {
      return payload;
    }

    const privacyDirectives = {
      allowed: decision.allowed,
      anonymiseFaces: !!decision.anonymiseFaces,
      useInitialsOnly: !!decision.useInitialsOnly,
      reason: decision.reason,
      evaluated_at: decision.evaluated_at,
      players: decision.players || []
    };

    return {
      ...payload,
      privacy: privacyDirectives
    };
  }
}

/**
 * Detect PII in data - Global function
 * @param {Object} data - Data to analyze
 * @returns {Object} PII detection results
 */
function detectPII(data) {
  return PrivacyManager.detectPII(data);
}

/**
 * Evaluate consent for media payloads (global helper)
 * @param {Object} context - Evaluation context
 * @returns {Object} Consent decision
 */
function evaluateConsentForMedia(context = {}) {
  return PrivacyManager.evaluateConsentForMedia(context);
}

/**
 * Enhanced PII masking - Global function
 * @param {Object} data - Data to mask
 * @param {string} strategy - Masking strategy
 * @returns {Object} Masked data
 */
function maskPIIEnhanced(data, strategy = 'partial') {
  const piiDetection = PrivacyManager.detectPII(data);
  const maskedData = { ...data };

  piiDetection.fields.forEach(field => {
    maskedData[field.field] = PrivacyManager.maskValue(data[field.field], field.type, strategy);
  });

  return maskedData;
}

/**
 * Process data subject request - Global function
 * @param {string} subjectId - Subject identifier
 * @param {string} requestType - Request type
 * @param {Object} requestDetails - Request details
 * @returns {Object} Request result
 */
function processDataSubjectRequest(subjectId, requestType, requestDetails = {}) {
  return PrivacyManager.processDataSubjectRequest(subjectId, requestType, requestDetails);
}

/**
 * Anonymize player data - Global function
 * @param {Object} playerData - Player data
 * @returns {Object} Anonymized data
 */
function anonymizePlayerData(playerData) {
  return PrivacyManager.anonymizePlayerData(playerData);
}

/**
 * Apply data retention policies - Global function
 * @param {Object} options - Retention options
 * @returns {Object} Retention result
 */
function applyDataRetentionPolicies(options = {}) {
  return PrivacyManager.applyRetentionPolicies(options);
}

/**
 * Get consent dashboard summary for control panel
 * @param {number|null} windowDays - Expiry window
 * @returns {Object} Summary result
 */
function getConsentDashboardSummary(windowDays = null) {
  return PrivacyManager.getConsentDashboardSummary(windowDays);
}

/**
 * Generate and optionally email consent expiry report
 * @param {number|null} windowDays - Expiry window
 * @returns {Object} Report result
 */
function sendConsentExpiryReport(windowDays = null) {
  return PrivacyManager.sendConsentExpiryReport(windowDays);
}