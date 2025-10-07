/**
 * Config Sheet Template and Management Functions
 *
 * This file handles the creation and management of the customer-facing Config sheet
 * that allows users to configure the system without touching Apps Script code.
 */

/**
 * Configuration sheet structure and default values
 */
const CONFIG_SHEET_STRUCTURE = {
  // Sheet metadata
  SHEET_NAME: 'Config',

  // Configuration sections and their rows
  SECTIONS: {
    SYSTEM_INFO: {
      START_ROW: 2,
      TITLE: 'System Information',
      COLOR: '#e3f2fd'
    },
    API_ENDPOINTS: {
      START_ROW: 8,
      TITLE: 'API Endpoints',
      COLOR: '#f3e5f5'
    },
    CLUB_DETAILS: {
      START_ROW: 15,
      TITLE: 'Club Details',
      COLOR: '#e8f5e8'
    },
    GOOGLE_SERVICES: {
      START_ROW: 21,
      TITLE: 'Google Services',
      COLOR: '#fff3e0'
    },
    NOTIFICATIONS: {
      START_ROW: 27,
      TITLE: 'Notifications',
      COLOR: '#ffebee'
    },
    ADVANCED: {
      START_ROW: 32,
      TITLE: 'Advanced Settings',
      COLOR: '#f5f5f5'
    }
  },

  // Configuration items with their properties
  CONFIG_ITEMS: [
    // System Information
    {
      section: 'SYSTEM_INFO',
      key: 'SPREADSHEET_ID',
      label: 'Spreadsheet ID',
      description: 'Auto-detected - do not modify',
      value: '=SPREADSHEET_ID()',
      type: 'formula',
      editable: false
    },
    {
      section: 'SYSTEM_INFO',
      key: 'SCRIPT_ID',
      label: 'Apps Script ID',
      description: 'Auto-detected - do not modify',
      value: '=SCRIPT_ID()',
      type: 'formula',
      editable: false
    },
    {
      section: 'SYSTEM_INFO',
      key: 'LAST_UPDATED',
      label: 'Config Last Updated',
      description: 'Automatically updated when config changes',
      value: '=NOW()',
      type: 'formula',
      editable: false
    },

    // API Endpoints
    {
      section: 'API_ENDPOINTS',
      key: 'RAILWAY_URL',
      label: 'Railway API URL',
      description: 'Your Railway deployment URL (e.g., https://your-app.railway.app)',
      value: 'https://your-railway-app.railway.app',
      type: 'url',
      required: true,
      validation: 'https://*.railway.app*'
    },
    {
      section: 'API_ENDPOINTS',
      key: 'RENDER_URL',
      label: 'Render API URL',
      description: 'Your Render deployment URL (optional backup)',
      value: '',
      type: 'url',
      required: false,
      validation: 'https://*.onrender.com*'
    },
    {
      section: 'API_ENDPOINTS',
      key: 'WEBHOOK_URL',
      label: 'Webhook URL (Make.com)',
      description: 'Your Make.com webhook URL for automation',
      value: '',
      type: 'url',
      required: false,
      validation: 'https://hook.*.make.com/*'
    },
    {
      section: 'API_ENDPOINTS',
      key: 'API_KEY',
      label: 'API Authentication Key',
      description: 'Secret key for API authentication (keep secure)',
      value: '',
      type: 'password',
      required: true
    },

    // Club Details
    {
      section: 'CLUB_DETAILS',
      key: 'CLUB_NAME',
      label: 'Club Name',
      description: 'Your football club name',
      value: 'Your Football Club',
      type: 'text',
      required: true
    },
    {
      section: 'CLUB_DETAILS',
      key: 'SEASON',
      label: 'Current Season',
      description: 'Current season (e.g., 2024-25)',
      value: '2024-25',
      type: 'text',
      required: true,
      validation: '####-##'
    },
    {
      section: 'CLUB_DETAILS',
      key: 'REGION',
      label: 'Region/League',
      description: 'Your region or league name',
      value: 'Local League',
      type: 'text',
      required: true
    },
    {
      section: 'CLUB_DETAILS',
      key: 'TIMEZONE',
      label: 'Timezone',
      description: 'Your local timezone for scheduling',
      value: 'America/New_York',
      type: 'dropdown',
      required: true,
      options: [
        'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Australia/Sydney'
      ]
    },

    // Google Services
    {
      section: 'GOOGLE_SERVICES',
      key: 'DRIVE_FOLDER_ID',
      label: 'Google Drive Folder ID',
      description: 'Google Drive folder ID for video storage',
      value: '',
      type: 'text',
      required: true,
      validation: '^[a-zA-Z0-9_-]{28,}$'
    },
    {
      section: 'GOOGLE_SERVICES',
      key: 'YOUTUBE_CHANNEL_ID',
      label: 'YouTube Channel ID',
      description: 'Your YouTube channel ID (optional)',
      value: '',
      type: 'text',
      required: false
    },
    {
      section: 'GOOGLE_SERVICES',
      key: 'SHEETS_TEMPLATE_ID',
      label: 'Sheet Template ID',
      description: 'Template for new player sheets (optional)',
      value: '',
      type: 'text',
      required: false
    },

    // Notifications
    {
      section: 'NOTIFICATIONS',
      key: 'NOTIFICATION_EMAIL',
      label: 'Notification Email',
      description: 'Email address for system notifications',
      value: '',
      type: 'email',
      required: true
    },
    {
      section: 'NOTIFICATIONS',
      key: 'ENABLE_EMAIL_NOTIFICATIONS',
      label: 'Enable Email Notifications',
      description: 'Send email alerts for important events',
      value: 'YES',
      type: 'dropdown',
      required: true,
      options: ['YES', 'NO']
    },
    {
      section: 'NOTIFICATIONS',
      key: 'NOTIFICATION_LEVEL',
      label: 'Notification Level',
      description: 'How many notifications to receive',
      value: 'NORMAL',
      type: 'dropdown',
      required: true,
      options: ['MINIMAL', 'NORMAL', 'VERBOSE']
    },

    // Advanced Settings
    {
      section: 'ADVANCED',
      key: 'MAX_CONCURRENT_JOBS',
      label: 'Max Concurrent Jobs',
      description: 'Maximum number of videos to process simultaneously',
      value: 2,
      type: 'number',
      required: true,
      validation: '^[1-5]$'
    },
    {
      section: 'ADVANCED',
      key: 'CLEANUP_RETENTION_DAYS',
      label: 'File Retention (Days)',
      description: 'How long to keep processed files',
      value: 30,
      type: 'number',
      required: true,
      validation: '^[7-365]$'
    },
    {
      section: 'ADVANCED',
      key: 'DEBUG_MODE',
      label: 'Debug Mode',
      description: 'Enable detailed logging (for troubleshooting)',
      value: 'NO',
      type: 'dropdown',
      required: true,
      options: ['YES', 'NO']
    }
  ]
};

/**
 * Create or update the Config sheet with proper formatting and validation
 */
function createConfigSheet() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let configSheet = spreadsheet.getSheetByName(CONFIG_SHEET_STRUCTURE.SHEET_NAME);

    // Create sheet if it doesn't exist
    if (!configSheet) {
      configSheet = spreadsheet.insertSheet(CONFIG_SHEET_STRUCTURE.SHEET_NAME);
    } else {
      // Clear existing content
      configSheet.clear();
    }

    // Set up the sheet structure
    setupConfigSheetLayout(configSheet);
    populateConfigItems(configSheet);
    applyConfigSheetFormatting(configSheet);
    setupConfigValidation(configSheet);

    // Move Config sheet to the front
    spreadsheet.setActiveSheet(configSheet);
    spreadsheet.moveActiveSheet(1);

    Logger.log('Config sheet created successfully');
    return configSheet;

  } catch (error) {
    Logger.log('Error creating Config sheet: ' + error.toString());
    throw error;
  }
}

/**
 * Set up the basic layout of the Config sheet
 */
function setupConfigSheetLayout(sheet) {
  // Title row
  sheet.getRange(1, 1, 1, 4).merge();
  sheet.getRange(1, 1).setValue('🏈 Football Highlights System Configuration');
  sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(1, 1).setBackground('#4285f4').setFontColor('white');

  // Column headers
  const headers = ['Setting', 'Value', 'Description', 'Status'];
  sheet.getRange(2, 1, 1, 4).setValues([headers]);
  sheet.getRange(2, 1, 1, 4).setFontWeight('bold').setBackground('#f0f0f0');

  // Set column widths
  sheet.setColumnWidth(1, 200); // Setting name
  sheet.setColumnWidth(2, 300); // Value
  sheet.setColumnWidth(3, 400); // Description
  sheet.setColumnWidth(4, 100); // Status
}

/**
 * Populate the Config sheet with all configuration items
 */
function populateConfigItems(sheet) {
  let currentRow = 3;
  let currentSection = '';

  CONFIG_SHEET_STRUCTURE.CONFIG_ITEMS.forEach(item => {
    // Add section header if this is a new section
    if (item.section !== currentSection) {
      const sectionInfo = CONFIG_SHEET_STRUCTURE.SECTIONS[item.section];

      // Add section title
      sheet.getRange(currentRow, 1, 1, 4).merge();
      sheet.getRange(currentRow, 1).setValue(`📋 ${sectionInfo.TITLE}`);
      sheet.getRange(currentRow, 1).setFontWeight('bold').setBackground(sectionInfo.COLOR);
      currentRow++;

      currentSection = item.section;
    }

    // Add configuration item
    const statusValue = item.required ? '❗ Required' : '✅ Optional';
    const rowData = [
      item.label,
      item.value,
      item.description,
      statusValue
    ];

    sheet.getRange(currentRow, 1, 1, 4).setValues([rowData]);

    // Mark read-only fields
    if (!item.editable && item.editable !== undefined) {
      sheet.getRange(currentRow, 2).setBackground('#f5f5f5');
      sheet.getRange(currentRow, 2).protect().setDescription('Auto-generated - do not edit');
    }

    currentRow++;
  });
}

/**
 * Apply formatting to make the Config sheet user-friendly
 */
function applyConfigSheetFormatting(sheet) {
  const lastRow = sheet.getLastRow();

  // Apply borders
  sheet.getRange(1, 1, lastRow, 4).setBorder(true, true, true, true, true, true);

  // Alternate row colors for readability
  for (let row = 3; row <= lastRow; row++) {
    if ((row - 3) % 2 === 1) {
      sheet.getRange(row, 1, 1, 4).setBackground('#fafafa');
    }
  }

  // Freeze header rows
  sheet.setFrozenRows(2);

  // Set text wrapping for descriptions
  sheet.getRange(3, 3, lastRow - 2, 1).setWrap(true);

  // Center align status column
  sheet.getRange(3, 4, lastRow - 2, 1).setHorizontalAlignment('center');
}

/**
 * Set up data validation for configuration values
 */
function setupConfigValidation(sheet) {
  CONFIG_SHEET_STRUCTURE.CONFIG_ITEMS.forEach((item, index) => {
    const row = findConfigItemRow(sheet, item.label);
    if (!row) return;

    const cell = sheet.getRange(row, 2);

    switch (item.type) {
      case 'email':
        // Email validation
        const emailRule = SpreadsheetApp.newDataValidation()
          .requireTextContains('@')
          .setAllowInvalid(false)
          .setHelpText('Please enter a valid email address')
          .build();
        cell.setDataValidation(emailRule);
        break;

      case 'url':
        // URL validation
        if (item.validation) {
          const urlRule = SpreadsheetApp.newDataValidation()
            .requireTextMatches(item.validation)
            .setAllowInvalid(false)
            .setHelpText(`Please enter a valid URL matching: ${item.validation}`)
            .build();
          cell.setDataValidation(urlRule);
        }
        break;

      case 'dropdown':
        // Dropdown validation
        if (item.options) {
          const dropdownRule = SpreadsheetApp.newDataValidation()
            .requireValueInList(item.options, true)
            .setAllowInvalid(false)
            .build();
          cell.setDataValidation(dropdownRule);
        }
        break;

      case 'number':
        // Number validation
        if (item.validation) {
          const numberRule = SpreadsheetApp.newDataValidation()
            .requireTextMatches(item.validation)
            .setAllowInvalid(false)
            .setHelpText('Please enter a valid number')
            .build();
          cell.setDataValidation(numberRule);
        }
        break;
    }

    // Add note with additional help text
    if (item.validation && item.type !== 'dropdown') {
      cell.setNote(`Format: ${item.validation}\n\n${item.description}`);
    } else {
      cell.setNote(item.description);
    }
  });
}

/**
 * Find the row number for a specific configuration item
 */
function findConfigItemRow(sheet, label) {
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === label) {
      return i + 1; // Convert to 1-based row number
    }
  }
  return null;
}

/**
 * Validate all configuration values and update status
 */
function validateConfigSheet() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET_STRUCTURE.SHEET_NAME);
    if (!sheet) {
      throw new Error('Config sheet not found');
    }

    let allValid = true;
    const errors = [];

    CONFIG_SHEET_STRUCTURE.CONFIG_ITEMS.forEach(item => {
      const row = findConfigItemRow(sheet, item.label);
      if (!row) return;

      const cell = sheet.getRange(row, 2);
      const statusCell = sheet.getRange(row, 4);
      const value = cell.getValue();

      // Skip validation for auto-generated fields
      if (!item.editable && item.editable !== undefined) {
        statusCell.setValue('🔧 Auto');
        return;
      }

      // Check required fields
      if (item.required && (!value || value.toString().trim() === '')) {
        statusCell.setValue('❌ Missing');
        statusCell.setBackground('#ffcdd2');
        allValid = false;
        errors.push(`${item.label} is required`);
        return;
      }

      // Validate based on type
      let isValid = true;
      switch (item.type) {
        case 'email':
          isValid = validateEmail(value.toString());
          break;
        case 'url':
          isValid = validateUrl(value.toString(), item.validation);
          break;
        case 'number':
          isValid = validateNumber(value, item.validation);
          break;
      }

      if (isValid) {
        statusCell.setValue('✅ Valid');
        statusCell.setBackground('#c8e6c9');
      } else {
        statusCell.setValue('❌ Invalid');
        statusCell.setBackground('#ffcdd2');
        allValid = false;
        errors.push(`${item.label} has invalid format`);
      }
    });

    // Update overall status
    const statusMessage = allValid
      ? '✅ Configuration Valid - System Ready'
      : `❌ Configuration Issues: ${errors.length} error(s)`;

    // Add status summary at the top
    if (sheet.getRange(1, 5).getValue() === '') {
      sheet.getRange(1, 5).setValue(statusMessage);
      sheet.getRange(1, 5).setFontWeight('bold');
    } else {
      sheet.getRange(1, 5).setValue(statusMessage);
    }

    if (allValid) {
      sheet.getRange(1, 5).setBackground('#c8e6c9');
    } else {
      sheet.getRange(1, 5).setBackground('#ffcdd2');
    }

    return { valid: allValid, errors: errors };

  } catch (error) {
    Logger.log('Error validating config: ' + error.toString());
    throw error;
  }
}

/**
 * Helper validation functions
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateUrl(url, pattern) {
  if (!url || url.trim() === '') return false;

  try {
    new URL(url);
    if (pattern) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(regexPattern);
      return regex.test(url);
    }
    return true;
  } catch {
    return false;
  }
}

function validateNumber(value, pattern) {
  if (typeof value !== 'number' && isNaN(Number(value))) return false;

  if (pattern) {
    const regex = new RegExp(pattern);
    return regex.test(value.toString());
  }
  return true;
}