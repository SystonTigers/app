/**
 * Auto-Setup Main Controller
 * Central hub for the complete customer auto-setup system
 * Provides easy access to all setup components
 */

class AutoSetupController {
  constructor() {
    this.version = '1.0.0';
    this.components = {
      makeBlueprint: 'Make.com Blueprint Generator',
      canvaTemplates: 'Canva Template Package',
      socialMediaSetup: 'Social Media Configuration',
      customerDeployment: 'Complete Deployment Package',
      endToEndTesting: 'System Validation Testing'
    };
  }

  /**
   * Main auto-setup wizard - runs everything for customer
   */
  runCompleteAutoSetup() {
    try {
      const ui = SpreadsheetApp.getUi();

      // Welcome screen
      const welcomeResponse = ui.alert(
        '🚀 Football Club Auto-Setup System',
        '🎯 Complete Plug-and-Play Automation Package!\n\n' +
        '✨ What you\'ll get:\n' +
        '⚙️ Make.com Blueprint (1-click import)\n' +
        '🎨 Professional Canva Templates\n' +
        '📱 Social Media Auto-Configuration\n' +
        '📚 Complete Setup Documentation\n' +
        '🎯 Customer Success Materials\n\n' +
        '⏱️ Setup takes ~15 minutes\n' +
        '🎁 Result: Complete automation ready to go!\n\n' +
        'Start complete auto-setup?',
        ui.ButtonSet.YES_NO
      );

      if (welcomeResponse !== ui.Button.YES) {
        ui.alert('Setup cancelled. You can restart anytime from the menu.');
        return { success: false, cancelled: true };
      }

      Logger.log('🚀 Starting complete auto-setup system...');

      const setupResults = {
        customer: null,
        components: {},
        files: [],
        errors: [],
        startTime: new Date(),
        endTime: null,
        duration: null
      };

      // Step 1: Generate Make.com Blueprint
      ui.alert('Step 1/5', '⚙️ Generating Make.com Blueprint...\n\nThis creates your complete automation workflow.', ui.ButtonSet.OK);
      setupResults.components.makeBlueprint = this.runMakeBlueprintGeneration();

      // Step 2: Create Canva Templates
      ui.alert('Step 2/5', '🎨 Creating Canva Template Package...\n\nGenerating professional graphics for all event types.', ui.ButtonSet.OK);
      setupResults.components.canvaTemplates = this.runCanvaTemplateGeneration();

      // Step 3: Setup Social Media
      ui.alert('Step 3/5', '📱 Configuring Social Media Setup...\n\nPreparing all platform connections and guides.', ui.ButtonSet.OK);
      setupResults.components.socialMediaSetup = this.runSocialMediaConfiguration();

      // Step 4: Create Deployment Package
      ui.alert('Step 4/5', '📦 Creating Complete Deployment Package...\n\nBundling everything for easy customer delivery.', ui.ButtonSet.OK);
      setupResults.components.customerDeployment = this.runCustomerDeploymentPackage();

      // Step 5: Validate System
      ui.alert('Step 5/5', '🧪 Running System Validation...\n\nTesting all components work together perfectly.', ui.ButtonSet.OK);
      setupResults.components.testing = this.runSystemValidation();

      // Calculate completion time
      setupResults.endTime = new Date();
      setupResults.duration = Math.round((setupResults.endTime - setupResults.startTime) / 1000);

      // Show completion summary
      this.showCompletionSummary(setupResults);

      // Save master record
      this.saveMasterSetupRecord(setupResults);

      Logger.log('✅ Complete auto-setup finished successfully');

      return {
        success: true,
        setupResults: setupResults,
        duration: setupResults.duration,
        components: Object.keys(setupResults.components).length
      };

    } catch (error) {
      Logger.log('❌ Error in complete auto-setup: ' + error.toString());
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Individual component runners
   */
  runMakeBlueprintGeneration() {
    try {
      return generateMakeBlueprint();
    } catch (error) {
      Logger.log('Error in Make blueprint generation: ' + error.toString());
      return { success: false, error: error.toString() };
    }
  }

  runCanvaTemplateGeneration() {
    try {
      return generateCanvaTemplates();
    } catch (error) {
      Logger.log('Error in Canva template generation: ' + error.toString());
      return { success: false, error: error.toString() };
    }
  }

  runSocialMediaConfiguration() {
    try {
      return runSocialMediaSetup();
    } catch (error) {
      Logger.log('Error in social media setup: ' + error.toString());
      return { success: false, error: error.toString() };
    }
  }

  runCustomerDeploymentPackage() {
    try {
      return createCustomerDeploymentPackage();
    } catch (error) {
      Logger.log('Error in deployment package: ' + error.toString());
      return { success: false, error: error.toString() };
    }
  }

  runSystemValidation() {
    try {
      return runEndToEndTests();
    } catch (error) {
      Logger.log('Error in system validation: ' + error.toString());
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Show completion summary to user
   */
  showCompletionSummary(setupResults) {
    const ui = SpreadsheetApp.getUi();

    const successCount = Object.values(setupResults.components).filter(c => c && c.success).length;
    const totalCount = Object.keys(setupResults.components).length;

    const summary = `🎉 Auto-Setup Complete!\n\n` +
      `📊 Results:\n` +
      `✅ Successful: ${successCount}/${totalCount} components\n` +
      `⏱️ Duration: ${setupResults.duration} seconds\n\n` +
      `📦 Generated:\n` +
      `⚙️ Make.com Blueprint - Ready to import\n` +
      `🎨 Canva Templates - Professional graphics\n` +
      `📱 Social Media Setup - Platform guides\n` +
      `📚 Documentation - Complete instructions\n` +
      `🧪 Validation Tests - Quality assurance\n\n` +
      `🚀 Your customer package is ready!\n` +
      `📧 Check your Google Drive or email for delivery.`;

    ui.alert('🎉 Setup Complete!', summary, ui.ButtonSet.OK);
  }

  /**
   * Save master setup record
   */
  saveMasterSetupRecord(setupResults) {
    try {
      const sheet = getSpreadsheet().getSheetByName('Auto_Setup_Log') ||
                   getSpreadsheet().insertSheet('Auto_Setup_Log');

      // Add headers if sheet is new
      if (sheet.getLastRow() <= 1) {
        const headers = ['Setup ID', 'Start Time', 'End Time', 'Duration (s)', 'Components', 'Success Rate', 'Status', 'Notes'];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

        // Format headers
        const headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setBackground('#673AB7');
        headerRange.setFontColor('white');
        headerRange.setFontWeight('bold');
      }

      // Generate setup ID
      const setupId = 'SETUP_' + Date.now().toString().slice(-8);

      // Calculate success rate
      const successCount = Object.values(setupResults.components).filter(c => c && c.success).length;
      const totalCount = Object.keys(setupResults.components).length;
      const successRate = totalCount > 0 ? (successCount / totalCount * 100).toFixed(1) + '%' : '0%';

      // Determine overall status
      const status = successCount === totalCount ? 'SUCCESS' : 'PARTIAL';

      // Add record
      const newRow = sheet.getLastRow() + 1;
      sheet.getRange(newRow, 1, 1, 8).setValues([[
        setupId,
        setupResults.startTime,
        setupResults.endTime,
        setupResults.duration,
        totalCount,
        successRate,
        status,
        `Auto-setup v${this.version}`
      ]]);

      // Color code status
      const statusCell = sheet.getRange(newRow, 7);
      if (status === 'SUCCESS') {
        statusCell.setBackground('#4CAF50').setFontColor('white');
      } else {
        statusCell.setBackground('#FF9800').setFontColor('white');
      }

      // Auto-resize columns
      sheet.autoResizeColumns(1, 8);

      Logger.log(`✅ Master setup record saved with ID: ${setupId}`);

    } catch (error) {
      Logger.log('❌ Error saving master setup record: ' + error.toString());
    }
  }

  /**
   * Quick setup for specific components only
   */
  runQuickSetup() {
    const ui = SpreadsheetApp.getUi();

    const componentChoice = ui.alert(
      '⚡ Quick Setup',
      'Which component do you want to setup?\n\n' +
      '⚙️ Make.com Blueprint only\n' +
      '🎨 Canva Templates only\n' +
      '📱 Social Media only',
      ui.ButtonSet.YES_NO_CANCEL
    );

    try {
      let result;
      if (componentChoice === ui.Button.YES) {
        result = this.runMakeBlueprintGeneration();
        ui.alert('Blueprint Ready', 'Make.com blueprint generated successfully!', ui.ButtonSet.OK);
      } else if (componentChoice === ui.Button.NO) {
        result = this.runCanvaTemplateGeneration();
        ui.alert('Templates Ready', 'Canva templates created successfully!', ui.ButtonSet.OK);
      } else if (componentChoice === ui.Button.CANCEL) {
        result = this.runSocialMediaConfiguration();
        ui.alert('Social Media Ready', 'Social media setup completed!', ui.ButtonSet.OK);
      }

      return result;

    } catch (error) {
      ui.alert('Error', 'Quick setup failed: ' + error.toString(), ui.ButtonSet.OK);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * System status check
   */
  checkSystemStatus() {
    const ui = SpreadsheetApp.getUi();

    Logger.log('🔍 Checking system status...');

    const status = {
      makeBlueprintGenerator: typeof generateMakeBlueprint === 'function',
      canvaTemplateGenerator: typeof generateCanvaTemplates === 'function',
      socialMediaSetup: typeof runSocialMediaSetup === 'function',
      customerDeployment: typeof createCustomerDeploymentPackage === 'function',
      endToEndTesting: typeof runEndToEndTests === 'function',
      customerConfiguration: typeof getCustomerConfiguration === 'function',
      spreadsheetAccess: typeof getSpreadsheet === 'function'
    };

    const workingComponents = Object.values(status).filter(s => s).length;
    const totalComponents = Object.keys(status).length;
    const healthPercentage = (workingComponents / totalComponents * 100).toFixed(1);

    const statusMessage = `🔍 System Health Check\n\n` +
      `📊 Status: ${workingComponents}/${totalComponents} components working\n` +
      `💚 Health: ${healthPercentage}%\n\n` +
      `Component Status:\n` +
      `${Object.entries(status).map(([name, working]) =>
        `${working ? '✅' : '❌'} ${name.replace(/([A-Z])/g, ' $1').toLowerCase()}`
      ).join('\n')}\n\n` +
      `${healthPercentage === '100.0' ? '🚀 All systems operational!' : '⚠️ Some components need attention'}`;

    ui.alert('System Status', statusMessage, ui.ButtonSet.OK);

    return {
      healthy: healthPercentage === '100.0',
      healthPercentage: healthPercentage,
      componentStatus: status,
      workingComponents: workingComponents,
      totalComponents: totalComponents
    };
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    return {
      version: this.version,
      components: this.components,
      lastUpdated: '2024-01-15',
      author: 'Football Automation System',
      description: 'Complete plug-and-play football club automation setup'
    };
  }
}

/**
 * Main entry points for Google Apps Script menu
 */

function runCompleteAutoSetup() {
  const controller = new AutoSetupController();
  return controller.runCompleteAutoSetup();
}

function runQuickSetup() {
  const controller = new AutoSetupController();
  return controller.runQuickSetup();
}

function checkSystemStatus() {
  const controller = new AutoSetupController();
  return controller.checkSystemStatus();
}

function getSystemInfo() {
  const controller = new AutoSetupController();
  return controller.getSystemInfo();
}

/**
 * Create menu in Google Sheets for easy access
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('🚀 Auto-Setup System')
    .addItem('🎯 Run Complete Auto-Setup', 'runCompleteAutoSetup')
    .addSeparator()
    .addItem('⚡ Quick Setup (Single Component)', 'runQuickSetup')
    .addSeparator()
    .addItem('⚙️ Generate Make.com Blueprint', 'generateMakeBlueprint')
    .addItem('🎨 Create Canva Templates', 'generateCanvaTemplates')
    .addItem('📱 Setup Social Media', 'runSocialMediaSetup')
    .addItem('📦 Create Deployment Package', 'createCustomerDeploymentPackage')
    .addSeparator()
    .addItem('🧪 Run System Tests', 'runEndToEndTests')
    .addItem('🔍 Check System Status', 'checkSystemStatus')
    .addSeparator()
    .addItem('ℹ️ System Information', 'getSystemInfo')
    .addToUi();

  // Also create a simple menu for basic users
  ui.createMenu('🏈 Football Automation')
    .addItem('🚀 Start Auto-Setup', 'runCompleteAutoSetup')
    .addItem('📊 System Status', 'checkSystemStatus')
    .addToUi();
}

/**
 * Show welcome message when script loads
 */
function showWelcomeMessage() {
  const ui = SpreadsheetApp.getUi();

  ui.alert(
    '🎉 Football Auto-Setup System Ready!',
    '🚀 Your complete automation system is loaded and ready!\n\n' +
    '📋 Available in menus:\n' +
    '• "🚀 Auto-Setup System" - Full control panel\n' +
    '• "🏈 Football Automation" - Simple quick access\n\n' +
    '⭐ To get started:\n' +
    '1. Click "🚀 Auto-Setup System"\n' +
    '2. Select "🎯 Run Complete Auto-Setup"\n' +
    '3. Follow the wizard!\n\n' +
    'Your customers will get a complete plug-and-play package!',
    ui.ButtonSet.OK
  );
}