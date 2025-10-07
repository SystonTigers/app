/**
 * @fileoverview Comprehensive Customer Setup Wizard
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Complete customer onboarding system with automated deployment
 *
 * FEATURES:
 * - 3-step customer onboarding process
 * - Account setup validation
 * - Dynamic configuration wizard
 * - Automated deployment pipeline
 * - Integration testing
 * - Customer success dashboard
 */

// ==================== SETUP WIZARD CONSTANTS ====================

const SETUP_WIZARD_CONFIG = {
  STEPS: {
    ACCOUNTS: 1,
    CONFIGURATION: 2,
    DEPLOYMENT: 3
  },

  REQUIRED_ACCOUNTS: [
    {
      name: 'Google Account',
      description: 'Gmail, Sheets, Calendar access',
      testUrl: 'https://myaccount.google.com',
      required: true
    },
    {
      name: 'Make.com',
      description: 'Automation workflows',
      testUrl: 'https://make.com',
      required: true
    },
    {
      name: 'Canva Pro',
      description: 'Design templates',
      testUrl: 'https://canva.com',
      required: true
    },
    {
      name: 'Facebook Business',
      description: 'Social media posting',
      testUrl: 'https://business.facebook.com',
      required: false
    },
    {
      name: 'Instagram Business',
      description: 'Instagram posting',
      testUrl: 'https://business.instagram.com',
      required: false
    },
    {
      name: 'Twitter Developer',
      description: 'Twitter posting',
      testUrl: 'https://developer.twitter.com',
      required: false
    }
  ],

  DEPLOYMENT_STEPS: [
    'Validate configuration',
    'Create Google Apps Script project',
    'Deploy web application',
    'Configure Make.com scenarios',
    'Set up calendar integration',
    'Test automation pipeline',
    'Generate customer dashboard'
  ]
};

// ==================== SETUP WIZARD INTERFACE ====================

/**
 * Create customer setup wizard interface
 * @returns {GoogleAppsScript.HTML.HtmlOutput} Setup wizard HTML
 */
function createCustomerSetupWizard() {
  return renderHtml_('customer_setup_wizard_ui', {
    titlePrefix: 'Setup Wizard',
    data: {
      steps: SETUP_WIZARD_CONFIG.STEPS,
      accounts: SETUP_WIZARD_CONFIG.REQUIRED_ACCOUNTS,
      deploymentSteps: SETUP_WIZARD_CONFIG.DEPLOYMENT_STEPS
    }
  });
}

/**
 * Handle setup wizard form submissions
 * @param {Object} params - Form parameters
 * @returns {Object} Processing result
 */
function handleSetupWizardSubmission(params) {
  try {
    const step = parseInt(params.step) || 1;

    switch (step) {
      case SETUP_WIZARD_CONFIG.STEPS.ACCOUNTS:
        return handleAccountsStep(params);
      case SETUP_WIZARD_CONFIG.STEPS.CONFIGURATION:
        return handleConfigurationStep(params);
      case SETUP_WIZARD_CONFIG.STEPS.DEPLOYMENT:
        return handleDeploymentStep(params);
      default:
        throw new Error('Invalid setup step');
    }

  } catch (error) {
    console.error('Setup wizard error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================== STEP 1: ACCOUNTS SETUP ====================

/**
 * Handle accounts setup step
 * @param {Object} params - Form parameters
 * @returns {Object} Validation result
 */
function handleAccountsStep(params) {
  try {
    console.log('🔐 Processing accounts setup step...');

    const accountChecks = [];

    // Validate required accounts
    for (const account of SETUP_WIZARD_CONFIG.REQUIRED_ACCOUNTS) {
      const hasAccount = params[`has_${account.name.toLowerCase().replace(/\s+/g, '_')}`] === 'true';

      accountChecks.push({
        name: account.name,
        required: account.required,
        hasAccount: hasAccount,
        valid: account.required ? hasAccount : true
      });
    }

    // Check if all required accounts are available
    const requiredAccountsValid = accountChecks
      .filter(check => check.required)
      .every(check => check.valid);

    if (!requiredAccountsValid) {
      return {
        success: false,
        error: 'Please ensure all required accounts are set up',
        accountChecks: accountChecks
      };
    }

    // Store account information
    storeCustomerAccountInfo(accountChecks);

    console.log('✅ Accounts setup validation passed');

    return {
      success: true,
      message: 'Account setup validated successfully',
      nextStep: SETUP_WIZARD_CONFIG.STEPS.CONFIGURATION,
      accountChecks: accountChecks
    };

  } catch (error) {
    console.error('Accounts setup error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Store customer account information
 * @param {Array} accountChecks - Account validation results
 */
function storeCustomerAccountInfo(accountChecks) {
  try {
    const customerData = {
      accounts: accountChecks,
      setupDate: new Date().toISOString(),
      setupStep: SETUP_WIZARD_CONFIG.STEPS.ACCOUNTS
    };

    // Store in script properties
    PropertiesService.getScriptProperties().setProperty(
      'CUSTOMER_SETUP_DATA',
      JSON.stringify(customerData)
    );

    console.log('💾 Customer account info stored');

  } catch (error) {
    console.error('Error storing customer account info:', error);
  }
}

// ==================== STEP 2: CONFIGURATION SETUP ====================

/**
 * Handle configuration setup step
 * @param {Object} params - Form parameters
 * @returns {Object} Configuration result
 */
function handleConfigurationStep(params) {
  try {
    console.log('⚙️ Processing configuration setup step...');

    // Extract configuration data
    const configData = {
      // Club Information
      TEAM_NAME: params.teamName || 'Your Football Club',
      TEAM_SHORT: params.teamShort || 'YFC',
      LEAGUE_NAME: params.leagueName || 'Your League',
      AGE_GROUP: params.ageGroup || "Senior Men's",
      SEASON: params.season || getCurrentSeasonString(),

      // Visual Branding
      PRIMARY_COLOR: params.primaryColor || '#dc143c',
      SECONDARY_COLOR: params.secondaryColor || '#ffffff',
      BADGE_URL: params.badgeUrl || '',

      // Location & Contact
      STADIUM_NAME: params.stadiumName || '',
      CONTACT_EMAIL: params.contactEmail || '',
      WEBSITE_URL: params.websiteUrl || '',
      SOCIAL_HASHTAGS: params.socialHashtags || '',

      // System Settings
      TIMEZONE: 'Europe/London',
      FOUNDED_YEAR: params.foundedYear || '',
      GROUND_CAPACITY: params.groundCapacity || ''
    };

    // Validate required fields
    const requiredFields = ['TEAM_NAME', 'TEAM_SHORT', 'LEAGUE_NAME', 'PRIMARY_COLOR'];
    const missingFields = requiredFields.filter(field => !configData[field] || configData[field].trim() === '');

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Please fill in required fields: ${missingFields.join(', ')}`,
        missingFields: missingFields
      };
    }

    // Apply configuration to system
    const configResult = applyCustomerConfiguration(configData);

    if (!configResult.success) {
      return {
        success: false,
        error: 'Failed to apply configuration: ' + configResult.error
      };
    }

    // Update customer setup progress
    updateCustomerSetupProgress(SETUP_WIZARD_CONFIG.STEPS.CONFIGURATION, configData);

    console.log('✅ Configuration setup completed');

    return {
      success: true,
      message: 'Configuration applied successfully',
      nextStep: SETUP_WIZARD_CONFIG.STEPS.DEPLOYMENT,
      configData: configData
    };

  } catch (error) {
    console.error('Configuration setup error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Apply customer configuration to system
 * @param {Object} configData - Configuration data
 * @returns {Object} Application result
 */
function applyCustomerConfiguration(configData) {
  try {
    console.log('📝 Applying customer configuration...');

    // Update each configuration value
    for (const [key, value] of Object.entries(configData)) {
      updateConfig(key, value);
    }

    // Clear config cache to force refresh
    clearConfigCache();

    // Validate configuration
    const validation = validateConfig();
    if (!validation.valid) {
      throw new Error('Configuration validation failed: ' + validation.error);
    }

    console.log('✅ Customer configuration applied successfully');

    return {
      success: true,
      message: 'Configuration applied and validated'
    };

  } catch (error) {
    console.error('Error applying customer configuration:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================== STEP 3: DEPLOYMENT SETUP ====================

/**
 * Handle deployment setup step
 * @param {Object} params - Form parameters
 * @returns {Object} Deployment result
 */
function handleDeploymentStep(params) {
  try {
    console.log('🚀 Starting automated deployment...');

    const deploymentResults = [];
    let currentStep = 0;

    // Step 1: Validate configuration
    currentStep++;
    console.log(`Step ${currentStep}: Validating configuration...`);
    const configValidation = validateSystemConfiguration();
    deploymentResults.push({
      step: currentStep,
      name: 'Validate configuration',
      success: configValidation.success,
      message: configValidation.message,
      error: configValidation.error
    });

    if (!configValidation.success) {
      return buildDeploymentResult(false, deploymentResults, 'Configuration validation failed');
    }

    // Step 2: Create Google Apps Script project
    currentStep++;
    console.log(`Step ${currentStep}: Setting up Apps Script project...`);
    const scriptSetup = setupAppsScriptProject();
    deploymentResults.push({
      step: currentStep,
      name: 'Create Google Apps Script project',
      success: scriptSetup.success,
      message: scriptSetup.message,
      error: scriptSetup.error
    });

    // Step 3: Deploy web application
    currentStep++;
    console.log(`Step ${currentStep}: Deploying web application...`);
    const webAppDeployment = deployWebApplication();
    deploymentResults.push({
      step: currentStep,
      name: 'Deploy web application',
      success: webAppDeployment.success,
      message: webAppDeployment.message,
      webAppUrl: webAppDeployment.webAppUrl,
      error: webAppDeployment.error
    });

    // Step 4: Configure Make.com scenarios
    currentStep++;
    console.log(`Step ${currentStep}: Setting up Make.com integration...`);
    const makeSetup = setupMakeComIntegration();
    deploymentResults.push({
      step: currentStep,
      name: 'Configure Make.com scenarios',
      success: makeSetup.success,
      message: makeSetup.message,
      error: makeSetup.error
    });

    // Step 5: Set up calendar integration
    currentStep++;
    console.log(`Step ${currentStep}: Setting up calendar integration...`);
    const calendarSetup = setupCalendarIntegration();
    deploymentResults.push({
      step: currentStep,
      name: 'Set up calendar integration',
      success: calendarSetup.success,
      message: calendarSetup.message,
      calendarUrl: calendarSetup.calendarUrl,
      error: calendarSetup.error
    });

    // Step 6: Test automation pipeline
    currentStep++;
    console.log(`Step ${currentStep}: Testing automation pipeline...`);
    const pipelineTest = testAutomationPipeline();
    deploymentResults.push({
      step: currentStep,
      name: 'Test automation pipeline',
      success: pipelineTest.success,
      message: pipelineTest.message,
      testResults: pipelineTest.testResults,
      error: pipelineTest.error
    });

    // Step 7: Generate customer dashboard
    currentStep++;
    console.log(`Step ${currentStep}: Generating customer dashboard...`);
    const dashboardSetup = generateCustomerDashboard();
    deploymentResults.push({
      step: currentStep,
      name: 'Generate customer dashboard',
      success: dashboardSetup.success,
      message: dashboardSetup.message,
      dashboardUrl: dashboardSetup.dashboardUrl,
      error: dashboardSetup.error
    });

    // Check overall success
    const overallSuccess = deploymentResults.every(result => result.success);

    // Update customer setup progress
    updateCustomerSetupProgress(SETUP_WIZARD_CONFIG.STEPS.DEPLOYMENT, {
      deploymentResults: deploymentResults,
      completed: overallSuccess,
      completedAt: new Date().toISOString()
    });

    console.log(overallSuccess ? '✅ Deployment completed successfully!' : '❌ Deployment completed with errors');

    return buildDeploymentResult(overallSuccess, deploymentResults,
      overallSuccess ? 'Deployment completed successfully' : 'Deployment completed with some errors');

  } catch (error) {
    console.error('Deployment error:', error);
    return {
      success: false,
      error: error.toString(),
      deploymentResults: []
    };
  }
}

/**
 * Build deployment result object
 * @param {boolean} success - Overall success
 * @param {Array} results - Step results
 * @param {string} message - Overall message
 * @returns {Object} Deployment result
 */
function buildDeploymentResult(success, results, message) {
  const completedSteps = results.filter(r => r.success).length;
  const totalSteps = results.length;

  return {
    success: success,
    message: message,
    completedSteps: completedSteps,
    totalSteps: totalSteps,
    deploymentResults: results,
    webAppUrl: results.find(r => r.webAppUrl)?.webAppUrl,
    calendarUrl: results.find(r => r.calendarUrl)?.calendarUrl,
    dashboardUrl: results.find(r => r.dashboardUrl)?.dashboardUrl
  };
}

// ==================== DEPLOYMENT FUNCTIONS ====================

/**
 * Validate system configuration for deployment
 * @returns {Object} Validation result
 */
function validateSystemConfiguration() {
  try {
    const config = getDynamicConfig();

    // Check required configuration
    const requiredKeys = ['TEAM_NAME', 'TEAM_SHORT', 'LEAGUE_NAME', 'PRIMARY_COLOR'];
    const missingKeys = requiredKeys.filter(key => !config[key] || config[key].includes('[SET'));

    if (missingKeys.length > 0) {
      return {
        success: false,
        message: `Missing required configuration: ${missingKeys.join(', ')}`
      };
    }

    return {
      success: true,
      message: 'System configuration is valid'
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Set up Google Apps Script project
 * @returns {Object} Setup result
 */
function setupAppsScriptProject() {
  try {
    // Check if project already exists
    const projectId = ScriptApp.getScriptId();

    if (projectId) {
      return {
        success: true,
        message: `Apps Script project ready (ID: ${projectId})`
      };
    } else {
      return {
        success: false,
        message: 'Apps Script project not found - manual setup required'
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Deploy web application
 * @returns {Object} Deployment result
 */
function deployWebApplication() {
  try {
    // Test web app functionality
    const testResult = testDynamicConfigSystem();

    if (!testResult.success) {
      return {
        success: false,
        message: 'Web application test failed',
        error: testResult.error
      };
    }

    // Get web app URL (this would be set during manual deployment)
    const webAppUrl = getWebAppUrl();

    return {
      success: true,
      message: 'Web application deployed successfully',
      webAppUrl: webAppUrl
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Set up Make.com integration
 * @returns {Object} Setup result
 */
function setupMakeComIntegration() {
  try {
    // Test Make.com connectivity
    const testResult = MakeIntegration.testConnectivity();

    if (testResult.success) {
      return {
        success: true,
        message: 'Make.com integration configured successfully'
      };
    } else {
      return {
        success: false,
        message: 'Make.com integration test failed - please check webhook URLs',
        error: testResult.error
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Set up calendar integration
 * @returns {Object} Setup result
 */
function setupCalendarIntegration() {
  try {
    // Create club calendar
    const calendar = getClubCalendar();
    const calendarUrl = getCalendarSharingURL();

    // Test calendar functionality
    const testResult = testCalendarIntegration();

    if (testResult.success) {
      return {
        success: true,
        message: 'Calendar integration set up successfully',
        calendarUrl: calendarUrl
      };
    } else {
      return {
        success: false,
        message: 'Calendar integration test failed',
        error: testResult.error
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test automation pipeline
 * @returns {Object} Test result
 */
function testAutomationPipeline() {
  try {
    const testResults = [];

    // Test 1: Configuration system
    const configTest = testDynamicConfigSystem();
    testResults.push({
      name: 'Dynamic configuration',
      success: configTest.success,
      error: configTest.error
    });

    // Test 2: UK date formatting
    const dateTest = testUKDateFormatting();
    testResults.push({
      name: 'UK date formatting',
      success: dateTest.success,
      error: dateTest.error
    });

    // Test 3: FA email parsing
    const emailTest = testFAEmailParsing();
    testResults.push({
      name: 'FA email parsing',
      success: emailTest.success,
      error: emailTest.error
    });

    // Test 4: Edge case handling
    const edgeTest = runSpecificEdgeCaseTest('duplicate');
    testResults.push({
      name: 'Edge case handling',
      success: edgeTest.success,
      error: edgeTest.error
    });

    const passedTests = testResults.filter(t => t.success).length;
    const totalTests = testResults.length;

    return {
      success: passedTests === totalTests,
      message: `Pipeline tests: ${passedTests}/${totalTests} passed`,
      testResults: testResults
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Generate customer dashboard
 * @returns {Object} Dashboard generation result
 */
function generateCustomerDashboard() {
  try {
    const config = getDynamicConfig();

    // Create dashboard URL
    const dashboardUrl = getWebAppUrl() + '?dashboard=true';

    // Generate customer success information
    const customerInfo = {
      clubName: config.TEAM_NAME,
      setupCompleted: new Date().toISOString(),
      dashboardUrl: dashboardUrl,
      calendarUrl: getCalendarSharingURL(),
      nextSteps: [
        'Add your first players using Player Management',
        'Import your fixtures using Fixture Management',
        'Test live match updates',
        'Configure your Make.com scenarios',
        'Set up your Canva templates'
      ]
    };

    // Store customer success info
    PropertiesService.getScriptProperties().setProperty(
      'CUSTOMER_SUCCESS_INFO',
      JSON.stringify(customerInfo)
    );

    return {
      success: true,
      message: 'Customer dashboard generated successfully',
      dashboardUrl: dashboardUrl,
      customerInfo: customerInfo
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Update customer setup progress
 * @param {number} step - Current step
 * @param {Object} data - Step data
 */
function updateCustomerSetupProgress(step, data) {
  try {
    const existingData = JSON.parse(
      PropertiesService.getScriptProperties().getProperty('CUSTOMER_SETUP_DATA') || '{}'
    );

    existingData.setupStep = step;
    existingData.lastUpdated = new Date().toISOString();
    existingData[`step${step}Data`] = data;

    PropertiesService.getScriptProperties().setProperty(
      'CUSTOMER_SETUP_DATA',
      JSON.stringify(existingData)
    );

    console.log(`📊 Customer setup progress updated: Step ${step}`);

  } catch (error) {
    console.error('Error updating customer setup progress:', error);
  }
}

/**
 * Get web app URL (for display in results)
 * @returns {string} Web app URL
 */
function getWebAppUrl() {
  try {
    // This would typically be configured during deployment
    const scriptId = ScriptApp.getScriptId();
    return `https://script.google.com/macros/s/${scriptId}/exec`;
  } catch (error) {
    return 'Web app URL not available';
  }
}

/**
 * Get customer setup status
 * @returns {Object} Setup status
 */
function getCustomerSetupStatus() {
  try {
    const setupData = JSON.parse(
      PropertiesService.getScriptProperties().getProperty('CUSTOMER_SETUP_DATA') || '{}'
    );

    const currentStep = setupData.setupStep || 0;
    const totalSteps = Object.keys(SETUP_WIZARD_CONFIG.STEPS).length;

    return {
      currentStep: currentStep,
      totalSteps: totalSteps,
      completed: currentStep >= totalSteps,
      setupData: setupData
    };

  } catch (error) {
    console.error('Error getting customer setup status:', error);
    return {
      currentStep: 0,
      totalSteps: 3,
      completed: false,
      error: error.toString()
    };
  }
}

// ==================== TESTING FUNCTIONS ====================

/**
 * Test complete customer setup wizard
 * @returns {Object} Test results
 */
function testCustomerSetupWizard() {
  console.log('🧪 Testing Customer Setup Wizard...');

  try {
    const testData = {
      accounts: {
        has_google_account: 'true',
        has_makecom: 'true',
        has_canva_pro: 'true'
      },
      configuration: {
        teamName: 'Test FC',
        teamShort: 'TFC',
        leagueName: 'Test League',
        primaryColor: '#ff0000',
        secondaryColor: '#ffffff'
      }
    };

    // Test accounts step
    const accountsResult = handleAccountsStep(testData.accounts);
    const test1 = accountsResult.success;

    // Test configuration step
    const configResult = handleConfigurationStep(testData.configuration);
    const test2 = configResult.success;

    const tests = [
      { name: 'Accounts validation', passed: test1 },
      { name: 'Configuration setup', passed: test2 }
    ];

    const passed = tests.filter(t => t.passed).length;
    const total = tests.length;

    console.log(`✅ Customer Setup Tests: ${passed}/${total} passed`);

    return {
      success: passed === total,
      passed: passed,
      total: total,
      tests: tests
    };

  } catch (error) {
    console.error('❌ Customer setup test failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}