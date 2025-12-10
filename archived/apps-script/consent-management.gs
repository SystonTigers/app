/**
 * Comprehensive GDPR Consent Management System
 * Creates, tracks, and manages consent forms for football club automation
 * @version 6.2.0
 * @author Claude Code Assistant
 */

class ConsentManager {
  static getConsentTypes() {
    return {
      SOCIAL_MEDIA: 'social_media_posting',
      VIDEO_RECORDING: 'video_recording',
      PHOTOGRAPHY: 'photography',
      DATA_PROCESSING: 'data_processing',
      PERFORMANCE_TRACKING: 'performance_tracking',
      COMMUNICATIONS: 'email_communications'
    };
  }

  static getConsentStatus() {
    return {
      PENDING: 'pending',
      GRANTED: 'granted',
      REFUSED: 'refused',
      EXPIRED: 'expired',
      WITHDRAWN: 'withdrawn'
    };
  }

  static getAgeCategories() {
    return {
      ADULT: 'adult',           // 18+
      YOUNG_ADULT: 'young_adult', // 16-17
      MINOR: 'minor'            // Under 16
    };
  }

  /**
   * Creates comprehensive consent form for new players/parents
   */
  static createConsentForm(playerData) {
    try {
      const config = getDynamicConfig();
      const template = this.buildConsentFormTemplate(playerData, config);

      const form = {
        formId: Utilities.getUuid(),
        playerId: playerData.playerId || playerData.name.replace(/\s+/g, '_').toLowerCase(),
        playerName: playerData.name,
        dateOfBirth: playerData.dateOfBirth,
        ageCategory: this.determineAgeCategory(playerData.dateOfBirth),
        parentGuardian: playerData.parentGuardian || null,
        contactEmail: playerData.email,
        parentEmail: playerData.parentEmail || null,
        consentItems: this.generateConsentItems(playerData),
        legalBasis: this.generateLegalBasis(),
        createdAt: new Date().toISOString(),
        expiryDate: this.calculateExpiryDate(),
        status: this.getConsentStatus().PENDING,
        template: template,
        submissionUrl: this.generateSubmissionUrl(),
        teamName: config.TEAM_NAME,
        season: config.SEASON
      };

      // Store in Consent Forms sheet
      this.storeConsentForm(form);

      // Generate downloadable PDF
      const pdfBlob = this.generateConsentPDF(form);
      const pdfFile = DriveApp.createFile(pdfBlob);

      // Move to consent forms folder
      const consentFolder = this.getOrCreateConsentFolder();
      pdfFile.moveTo(consentFolder);

      // Send email with form if email provided
      if (form.contactEmail) {
        this.sendConsentFormEmail(form, pdfFile.getDownloadUrl());
      }

      return {
        success: true,
        formId: form.formId,
        pdfUrl: pdfFile.getDownloadUrl(),
        submissionUrl: form.submissionUrl,
        expiryDate: form.expiryDate
      };

    } catch (error) {
      console.error('Failed to create consent form:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Builds HTML template for consent form
   */
  static buildConsentFormTemplate(playerData, config) {
    const ageCategory = this.determineAgeCategory(playerData.dateOfBirth);
    const isMinor = ageCategory === this.getAgeCategories().MINOR;
    const isYoungAdult = ageCategory === this.getAgeCategories().YOUNG_ADULT;

    return renderHtml_('consent-form', {
      playerName: playerData.name,
      teamName: config.TEAM_NAME,
      leagueName: config.LEAGUE_NAME,
      season: config.SEASON,
      contactEmail: config.CONTACT_EMAIL,
      dataController: config.DATA_CONTROLLER || config.TEAM_NAME,
      isMinor: isMinor,
      isYoungAdult: isYoungAdult,
      requiresParentConsent: isMinor || isYoungAdult,
      parentGuardian: playerData.parentGuardian,
      formId: Utilities.getUuid(),
      consentItems: this.generateConsentItems(playerData),
      legalBasis: this.generateLegalBasis(),
      rightsInformation: this.generateRightsInformation(),
      expiryDate: formatUKDate(this.calculateExpiryDate()),
      primaryColor: config.PRIMARY_COLOR,
      secondaryColor: config.SECONDARY_COLOR,
      badgeUrl: config.BADGE_URL
    });
  }

  /**
   * Generates specific consent items based on player data
   */
  static generateConsentItems(playerData) {
    const ageCategory = this.determineAgeCategory(playerData.dateOfBirth);
    const items = [];

    // Social Media Posting (Required for match content)
    items.push({
      type: this.getConsentTypes().SOCIAL_MEDIA,
      title: 'Social Media Content',
      description: `Consent for ${playerData.name}'s name, performance data, and likeness to be included in social media posts about matches, goals, achievements, and team updates.`,
      required: false,
      consequences: 'Without this consent, the player will not be featured in social media content.',
      dataTypes: ['Name', 'Match statistics', 'Goal/assist information', 'Photos during matches'],
      retention: '2 years from end of season or until consent withdrawn',
      ageRestricted: ageCategory !== this.getAgeCategories().ADULT
    });

    // Video Recording (For highlights and analysis)
    items.push({
      type: this.getConsentTypes().VIDEO_RECORDING,
      title: 'Video Recording',
      description: 'Consent for video recording during matches for highlights, analysis, and promotional content.',
      required: false,
      consequences: 'Video recording may still occur but your image will be blurred/anonymized.',
      dataTypes: ['Match footage', 'Training videos', 'Interview recordings'],
      retention: '3 years for highlights, 1 year for analysis footage',
      ageRestricted: ageCategory === this.getAgeCategories().MINOR
    });

    // Photography
    items.push({
      type: this.getConsentTypes().PHOTOGRAPHY,
      title: 'Photography',
      description: 'Consent for photographs during matches, training, and team events.',
      required: false,
      consequences: 'Photos may still be taken but your image will be excluded or anonymized.',
      dataTypes: ['Match photos', 'Team photos', 'Event photography'],
      retention: '2 years from capture date',
      ageRestricted: ageCategory === this.getAgeCategories().MINOR
    });

    // Performance Data Processing
    items.push({
      type: this.getConsentTypes().PERFORMANCE_TRACKING,
      title: 'Performance Tracking',
      description: 'Collection and processing of match statistics, training data, and performance analytics.',
      required: true,
      consequences: 'Essential for team management - cannot participate without this consent.',
      dataTypes: ['Goals', 'Assists', 'Minutes played', 'Training attendance', 'Disciplinary records'],
      retention: 'Duration of club membership plus 7 years for disciplinary records',
      ageRestricted: false
    });

    // Communications
    items.push({
      type: this.getConsentTypes().COMMUNICATIONS,
      title: 'Club Communications',
      description: 'Receiving emails about fixtures, results, training updates, and club news.',
      required: false,
      consequences: 'You will miss important team communications and updates.',
      dataTypes: ['Email address', 'Phone number (if provided)', 'Communication preferences'],
      retention: 'Until consent withdrawn or club membership ends',
      ageRestricted: false
    });

    return items;
  }

  /**
   * Generates legal basis information for GDPR compliance
   */
  static generateLegalBasis() {
    return {
      contractualNecessity: {
        applies: ['performance_tracking'],
        description: 'Processing necessary for the performance of club membership contract.'
      },
      legitimateInterests: {
        applies: ['social_media_posting', 'communications'],
        description: 'Processing based on legitimate interests of the club for sporting activities and member communications.',
        balancing: 'We have balanced our interests against your privacy rights and believe processing is proportionate.'
      },
      consent: {
        applies: ['video_recording', 'photography'],
        description: 'Processing based on your explicit consent, which can be withdrawn at any time.'
      }
    };
  }

  /**
   * Generates GDPR rights information
   */
  static generateRightsInformation() {
    const config = getDynamicConfig();

    return {
      rightToAccess: 'You can request a copy of your personal data we hold.',
      rightToRectification: 'You can ask us to correct inaccurate personal data.',
      rightToErasure: 'You can request deletion of your data in certain circumstances.',
      rightToRestriction: 'You can request restriction of processing in certain circumstances.',
      rightToPortability: 'You can request your data in a portable format.',
      rightToWithdraw: 'You can withdraw consent at any time for consent-based processing.',
      rightToComplain: 'You can complain to the Information Commissioner\'s Office (ICO).',
      contactEmail: config.CONTACT_EMAIL || 'dataprotection@club.com',
      responseTime: '30 days (extendable to 90 days for complex requests)'
    };
  }

  /**
   * Determines age category from date of birth
   */
  static determineAgeCategory(dateOfBirth) {
    if (!dateOfBirth) return this.getAgeCategories().ADULT;

    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    if (age < 16) return this.getAgeCategories().MINOR;
    if (age < 18) return this.getAgeCategories().YOUNG_ADULT;
    return this.getAgeCategories().ADULT;
  }

  /**
   * Calculates consent expiry date (2 years from creation)
   */
  static calculateExpiryDate() {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 2);
    return expiry;
  }

  /**
   * Stores consent form in Google Sheets
   */
  static storeConsentForm(form) {
    const sheet = SheetUtils.getOrCreateSheet('Consent Forms', [
      'Form ID', 'Player ID', 'Player Name', 'Age Category', 'Email', 'Parent Email',
      'Social Media', 'Video', 'Photography', 'Performance', 'Communications',
      'Status', 'Created Date', 'Expiry Date', 'Last Updated'
    ]);

    const consentValues = form.consentItems.reduce((acc, item) => {
      acc[item.type] = 'pending';
      return acc;
    }, {});

    sheet.appendRow([
      form.formId,
      form.playerId,
      form.playerName,
      form.ageCategory,
      form.contactEmail,
      form.parentEmail,
      consentValues[this.getConsentTypes().SOCIAL_MEDIA] || 'n/a',
      consentValues[this.getConsentTypes().VIDEO_RECORDING] || 'n/a',
      consentValues[this.getConsentTypes().PHOTOGRAPHY] || 'n/a',
      consentValues[this.getConsentTypes().PERFORMANCE_TRACKING] || 'n/a',
      consentValues[this.getConsentTypes().COMMUNICATIONS] || 'n/a',
      form.status,
      form.createdAt,
      form.expiryDate.toISOString(),
      form.createdAt
    ]);
  }

  /**
   * Processes consent form submission
   */
  static processConsentSubmission(formData) {
    try {
      const formId = formData.formId;
      const consents = formData.consents || {};
      const signature = formData.signature;
      const parentSignature = formData.parentSignature;

      // Validate submission
      const validation = this.validateConsentSubmission(formData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Update consent records
      const updateResult = this.updateConsentRecords(formId, consents, {
        signature: signature,
        parentSignature: parentSignature,
        submittedAt: new Date().toISOString(),
        ipAddress: formData.ipAddress,
        userAgent: formData.userAgent
      });

      if (!updateResult.success) {
        return updateResult;
      }

      // Send confirmation emails
      this.sendConsentConfirmation(formId, consents);

      // Create audit log entry
      this.auditConsentSubmission(formId, consents, formData);

      return {
        success: true,
        formId: formId,
        consentsGranted: Object.keys(consents).filter(k => consents[k] === 'granted'),
        message: 'Consent form submitted successfully'
      };

    } catch (error) {
      console.error('Failed to process consent submission:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Updates consent records in sheet
   */
  static updateConsentRecords(formId, consents, metadata) {
    const sheet = SheetUtils.getSheet('Consent Forms');
    if (!sheet) return { success: false, error: 'Consent sheet not found' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const formIdCol = headers.indexOf('Form ID');

    for (let i = 1; i < data.length; i++) {
      if (data[i][formIdCol] === formId) {
        // Update consent columns
        Object.keys(consents).forEach(consentType => {
          const colName = this.getConsentColumnName(consentType);
          const colIndex = headers.indexOf(colName);
          if (colIndex > -1) {
            sheet.getRange(i + 1, colIndex + 1).setValue(consents[consentType]);
          }
        });

        // Update status and metadata
        const statusCol = headers.indexOf('Status');
        const lastUpdatedCol = headers.indexOf('Last Updated');

        sheet.getRange(i + 1, statusCol + 1).setValue('submitted');
        sheet.getRange(i + 1, lastUpdatedCol + 1).setValue(metadata.submittedAt);

        return { success: true };
      }
    }

    return { success: false, error: 'Form not found' };
  }

  /**
   * Maps consent type to sheet column name
   */
  static getConsentColumnName(consentType) {
    const mapping = {
      [this.getConsentTypes().SOCIAL_MEDIA]: 'Social Media',
      [this.getConsentTypes().VIDEO_RECORDING]: 'Video',
      [this.getConsentTypes().PHOTOGRAPHY]: 'Photography',
      [this.getConsentTypes().PERFORMANCE_TRACKING]: 'Performance',
      [this.getConsentTypes().COMMUNICATIONS]: 'Communications'
    };
    return mapping[consentType] || consentType;
  }

  /**
   * Validates consent form submission
   */
  static validateConsentSubmission(formData) {
    if (!formData.formId) {
      return { valid: false, error: 'Form ID is required' };
    }

    if (!formData.signature) {
      return { valid: false, error: 'Signature is required' };
    }

    // Check required consents
    const requiredConsents = [this.getConsentTypes().PERFORMANCE_TRACKING];
    for (const required of requiredConsents) {
      if (!formData.consents[required] || formData.consents[required] !== 'granted') {
        return {
          valid: false,
          error: `${required} consent is required for club membership`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Creates audit log for consent submission
   */
  static auditConsentSubmission(formId, consents, metadata) {
    const auditSheet = SheetUtils.getOrCreateSheet('Consent Audit', [
      'Timestamp', 'Form ID', 'Action', 'Consent Type', 'Decision',
      'IP Address', 'User Agent', 'Details'
    ]);

    Object.keys(consents).forEach(consentType => {
      auditSheet.appendRow([
        new Date().toISOString(),
        formId,
        'consent_submission',
        consentType,
        consents[consentType],
        metadata.ipAddress || 'unknown',
        metadata.userAgent || 'unknown',
        JSON.stringify({ submitted: metadata.submittedAt })
      ]);
    });
  }

  /**
   * Generates PDF version of consent form
   */
  static generateConsentPDF(form) {
    const template = HtmlService.createTemplate(`
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .consent-item { margin: 20px 0; border: 1px solid #ddd; padding: 15px; }
            .signature-box { border: 1px solid #000; height: 40px; margin: 10px 0; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1><?= teamName ?> - GDPR Consent Form</h1>
            <p>Player: <?= playerName ?> | Season: <?= season ?></p>
            <p>Form ID: <?= formId ?></p>
          </div>

          <h2>Data Processing Consent</h2>
          <? for (let item of consentItems) { ?>
            <div class="consent-item">
              <h3><?= item.title ?></h3>
              <p><?= item.description ?></p>
              <p><strong>Data Types:</strong> <?= item.dataTypes.join(', ') ?></p>
              <p><strong>Retention:</strong> <?= item.retention ?></p>
              <div>
                <input type="checkbox"> I consent to this processing
                <input type="checkbox"> I do not consent to this processing
              </div>
            </div>
          <? } ?>

          <h2>Signatures</h2>
          <? if (requiresParentConsent) { ?>
            <div>
              <p><strong>Parent/Guardian Signature:</strong></p>
              <div class="signature-box"></div>
              <p>Name: _________________ Date: _____________</p>
            </div>
          <? } ?>

          <div>
            <p><strong>Player Signature (if 16+):</strong></p>
            <div class="signature-box"></div>
            <p>Name: _________________ Date: _____________</p>
          </div>

          <div class="footer">
            <p>For questions about data processing, contact: <?= contactEmail ?></p>
            <p>This consent is valid until: <?= expiryDate ?></p>
          </div>
        </body>
      </html>
    `);

    // Populate template with form data
    Object.keys(form).forEach(key => {
      template[key] = form[key];
    });

    const htmlOutput = template.evaluate().getContent();
    return Utilities.newBlob(htmlOutput, 'text/html', `consent_form_${form.playerId}.html`);
  }

  /**
   * Sends consent form email to player/parent
   */
  static sendConsentFormEmail(form, pdfUrl) {
    const config = getDynamicConfig();
    const recipient = form.ageCategory === this.getAgeCategories().MINOR ?
      form.parentEmail : form.contactEmail;

    if (!recipient) return;

    const subject = `${config.TEAM_NAME} - GDPR Consent Form Required`;
    const body = `
      Dear ${form.ageCategory === this.getAgeCategories().MINOR ? 'Parent/Guardian' : form.playerName},

      Please complete the attached GDPR consent form for ${form.playerName}'s participation with ${config.TEAM_NAME}.

      You can complete the form online at: ${form.submissionUrl}

      Or download and complete the PDF version here: ${pdfUrl}

      This consent form covers:
      - Social media content featuring the player
      - Video recording and photography
      - Performance data tracking
      - Club communications

      The form must be completed before the player can participate in matches.

      If you have any questions, please contact us at ${config.CONTACT_EMAIL}.

      Best regards,
      ${config.TEAM_NAME} Data Protection Team
    `;

    try {
      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        body: body,
        name: config.TEAM_NAME
      });
    } catch (error) {
      console.error('Failed to send consent form email:', error);
    }
  }

  /**
   * Gets or creates consent forms folder in Drive
   */
  static getOrCreateConsentFolder() {
    const folders = DriveApp.getFoldersByName('Consent Forms');
    if (folders.hasNext()) {
      return folders.next();
    }
    return DriveApp.createFolder('Consent Forms');
  }

  /**
   * Generates submission URL for online form completion
   */
  static generateSubmissionUrl() {
    const config = getDynamicConfig();
    return `${config.WEB_APP_URL}?action=consent_form`;
  }

  /**
   * Sends confirmation email after consent submission
   */
  static sendConsentConfirmation(formId, consents) {
    // Implementation for confirmation emails
    console.log('Consent confirmation sent for form:', formId);
  }

  /**
   * Generates monthly consent expiry report
   */
  static generateExpiryReport() {
    const sheet = SheetUtils.getSheet('Consent Forms');
    if (!sheet) return { success: false, error: 'Consent sheet not found' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const expiryCol = headers.indexOf('Expiry Date');
    const nameCol = headers.indexOf('Player Name');
    const emailCol = headers.indexOf('Email');

    const expiringSoon = [];
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    for (let i = 1; i < data.length; i++) {
      const expiryDate = new Date(data[i][expiryCol]);
      if (expiryDate <= thirtyDaysAhead && expiryDate > now) {
        expiringSoon.push({
          playerName: data[i][nameCol],
          email: data[i][emailCol],
          expiryDate: expiryDate,
          daysUntilExpiry: Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000))
        });
      }
    }

    return {
      success: true,
      expiringSoon: expiringSoon,
      reportDate: now.toISOString()
    };
  }
}

/**
 * Web app handler for consent form submissions
 */
function handleConsentFormRequest(e) {
  const action = e.parameter.action;

  switch (action) {
    case 'consent_form':
      return ConsentManager.createConsentForm(e.parameter);

    case 'submit_consent':
      return ConsentManager.processConsentSubmission(e.parameter);

    case 'expiry_report':
      return ConsentManager.generateExpiryReport();

    default:
      return { success: false, error: 'Unknown action' };
  }
}