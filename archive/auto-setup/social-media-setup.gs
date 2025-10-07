/**
 * Social Media Setup Automation
 * Guides customers through connecting all social media accounts
 * Provides step-by-step instructions and validation
 */

class SocialMediaSetupWizard {
  constructor() {
    this.platforms = ['facebook', 'twitter', 'instagram', 'tiktok', 'youtube'];
    this.requiredPermissions = {
      facebook: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
      twitter: ['tweet.read', 'tweet.write', 'users.read'],
      instagram: ['instagram_basic', 'instagram_content_publish'],
      tiktok: ['video.publish', 'user.info.basic'],
      youtube: ['youtube.upload', 'youtube.readonly']
    };
  }

  /**
   * Main setup wizard function
   */
  runSocialMediaSetup() {
    try {
      const ui = SpreadsheetApp.getUi();

      // Welcome screen
      const welcomeResponse = ui.alert(
        '📱 Social Media Setup Wizard',
        'Welcome to the Social Media Setup!\n\n' +
        '🎯 We\'ll help you connect:\n' +
        '• Facebook Pages\n' +
        '• Twitter/X Account\n' +
        '• Instagram Business\n' +
        '• TikTok (optional)\n' +
        '• YouTube (optional)\n\n' +
        'This takes about 10 minutes. Ready to start?',
        ui.ButtonSet.YES_NO
      );

      if (welcomeResponse !== ui.Button.YES) {
        ui.alert('Setup cancelled. You can restart anytime from the Auto-Setup menu.');
        return { success: false, cancelled: true };
      }

      // Get customer config
      const customerConfig = getCustomerConfiguration();
      const setupResults = {
        clubName: customerConfig.data.clubName,
        connectedPlatforms: {},
        setupInstructions: {},
        errors: []
      };

      // Setup each platform
      for (const platform of this.platforms) {
        Logger.log(`🔧 Setting up ${platform}...`);

        const platformResult = this.setupPlatform(platform, customerConfig.data);
        setupResults.connectedPlatforms[platform] = platformResult;

        if (!platformResult.success) {
          setupResults.errors.push(`${platform}: ${platformResult.error}`);
        }
      }

      // Save setup results
      this.saveSocialMediaConfig(setupResults);

      // Create integration guide
      this.createIntegrationGuide(setupResults);

      // Show completion summary
      this.showSetupSummary(setupResults);

      Logger.log('✅ Social media setup completed');

      return {
        success: true,
        connectedPlatforms: Object.keys(setupResults.connectedPlatforms).filter(
          platform => setupResults.connectedPlatforms[platform].success
        ),
        errors: setupResults.errors
      };

    } catch (error) {
      Logger.log('❌ Error in social media setup: ' + error.toString());
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Setup individual social media platform
   */
  setupPlatform(platform, clubData) {
    const ui = SpreadsheetApp.getUi();

    try {
      switch (platform) {
        case 'facebook':
          return this.setupFacebook(clubData);
        case 'twitter':
          return this.setupTwitter(clubData);
        case 'instagram':
          return this.setupInstagram(clubData);
        case 'tiktok':
          return this.setupTikTok(clubData);
        case 'youtube':
          return this.setupYouTube(clubData);
        default:
          return { success: false, error: 'Unknown platform' };
      }
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Setup Facebook Page connection
   */
  setupFacebook(clubData) {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
      '📘 Facebook Setup',
      `Let's connect your ${clubData.clubName} Facebook Page!\n\n` +
      '📋 What you\'ll need:\n' +
      '• Facebook Page (not personal profile)\n' +
      '• Admin access to the page\n' +
      '• Facebook Developer App (we\'ll help create)\n\n' +
      'Ready to continue?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return { success: false, skipped: true };
    }

    // Get Facebook Page details
    const pageUrlResponse = ui.prompt(
      'Facebook Page URL',
      'Enter your Facebook Page URL (e.g., https://facebook.com/yourclub):',
      ui.ButtonSet.OK_CANCEL
    );

    if (pageUrlResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, cancelled: true };
    }

    const pageUrl = pageUrlResponse.getResponseText();

    // Extract page ID from URL
    const pageId = this.extractFacebookPageId(pageUrl);

    return {
      success: true,
      platform: 'facebook',
      pageUrl: pageUrl,
      pageId: pageId,
      appId: '[TO_BE_CONFIGURED]',
      accessToken: '[TO_BE_CONFIGURED]',
      instructions: this.generateFacebookInstructions(clubData, pageUrl),
      webhookUrl: `https://hook.integromat.com/facebook/${clubData.clubName.replace(/\s+/g, '_').toLowerCase()}`
    };
  }

  /**
   * Setup Twitter/X connection
   */
  setupTwitter(clubData) {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
      '🐦 Twitter/X Setup',
      `Let's connect your ${clubData.clubName} Twitter account!\n\n` +
      '📋 What you\'ll need:\n' +
      '• Twitter/X account\n' +
      '• Twitter Developer Account\n' +
      '• API v2 access\n\n' +
      'Ready to continue?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return { success: false, skipped: true };
    }

    // Get Twitter handle
    const handleResponse = ui.prompt(
      'Twitter Handle',
      'Enter your Twitter/X handle (without @):',
      ui.ButtonSet.OK_CANCEL
    );

    if (handleResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, cancelled: true };
    }

    const handle = handleResponse.getResponseText().replace('@', '');

    return {
      success: true,
      platform: 'twitter',
      handle: handle,
      apiKey: '[TO_BE_CONFIGURED]',
      apiSecret: '[TO_BE_CONFIGURED]',
      accessToken: '[TO_BE_CONFIGURED]',
      accessTokenSecret: '[TO_BE_CONFIGURED]',
      instructions: this.generateTwitterInstructions(clubData, handle),
      webhookUrl: `https://hook.integromat.com/twitter/${clubData.clubName.replace(/\s+/g, '_').toLowerCase()}`
    };
  }

  /**
   * Setup Instagram Business connection
   */
  setupInstagram(clubData) {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
      '📸 Instagram Setup',
      `Let's connect your ${clubData.clubName} Instagram!\n\n` +
      '📋 Requirements:\n' +
      '• Instagram Business Account\n' +
      '• Connected to Facebook Page\n' +
      '• Meta Business verification\n\n' +
      'Ready to continue?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return { success: false, skipped: true };
    }

    // Get Instagram handle
    const handleResponse = ui.prompt(
      'Instagram Handle',
      'Enter your Instagram handle (without @):',
      ui.ButtonSet.OK_CANCEL
    );

    if (handleResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, cancelled: true };
    }

    const handle = handleResponse.getResponseText().replace('@', '');

    return {
      success: true,
      platform: 'instagram',
      handle: handle,
      businessAccountId: '[TO_BE_CONFIGURED]',
      accessToken: '[TO_BE_CONFIGURED]',
      instructions: this.generateInstagramInstructions(clubData, handle),
      webhookUrl: `https://hook.integromat.com/instagram/${clubData.clubName.replace(/\s+/g, '_').toLowerCase()}`
    };
  }

  /**
   * Setup TikTok connection (optional)
   */
  setupTikTok(clubData) {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
      '🎵 TikTok Setup (Optional)',
      `Want to connect TikTok for ${clubData.clubName}?\n\n` +
      '📋 Great for:\n' +
      '• Short highlight clips\n' +
      '• Behind-the-scenes content\n' +
      '• Viral moments\n\n' +
      'Add TikTok to your automation?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return { success: false, skipped: true };
    }

    // Get TikTok handle
    const handleResponse = ui.prompt(
      'TikTok Handle',
      'Enter your TikTok handle (without @):',
      ui.ButtonSet.OK_CANCEL
    );

    if (handleResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, cancelled: true };
    }

    const handle = handleResponse.getResponseText().replace('@', '');

    return {
      success: true,
      platform: 'tiktok',
      handle: handle,
      clientKey: '[TO_BE_CONFIGURED]',
      clientSecret: '[TO_BE_CONFIGURED]',
      instructions: this.generateTikTokInstructions(clubData, handle),
      webhookUrl: `https://hook.integromat.com/tiktok/${clubData.clubName.replace(/\s+/g, '_').toLowerCase()}`
    };
  }

  /**
   * Setup YouTube connection (optional)
   */
  setupYouTube(clubData) {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
      '📺 YouTube Setup (Optional)',
      `Want to connect YouTube for ${clubData.clubName}?\n\n` +
      '📋 Perfect for:\n' +
      '• Match highlights\n' +
      '• Weekly compilations\n' +
      '• Player interviews\n\n' +
      'Add YouTube to your automation?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return { success: false, skipped: true };
    }

    // Get YouTube channel
    const channelResponse = ui.prompt(
      'YouTube Channel',
      'Enter your YouTube channel URL:',
      ui.ButtonSet.OK_CANCEL
    );

    if (channelResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, cancelled: true };
    }

    const channelUrl = channelResponse.getResponseText();
    const channelId = this.extractYouTubeChannelId(channelUrl);

    return {
      success: true,
      platform: 'youtube',
      channelUrl: channelUrl,
      channelId: channelId,
      clientId: '[TO_BE_CONFIGURED]',
      clientSecret: '[TO_BE_CONFIGURED]',
      instructions: this.generateYouTubeInstructions(clubData, channelUrl),
      webhookUrl: `https://hook.integromat.com/youtube/${clubData.clubName.replace(/\s+/g, '_').toLowerCase()}`
    };
  }

  /**
   * Generate platform-specific setup instructions
   */
  generateFacebookInstructions(clubData, pageUrl) {
    return {
      title: 'Facebook Page Connection',
      steps: [
        {
          step: 1,
          title: 'Create Facebook App',
          description: 'Go to developers.facebook.com and create a new app',
          details: 'Choose "Business" app type and add your club name'
        },
        {
          step: 2,
          title: 'Add Products',
          description: 'Add "Facebook Login" and "Pages API" to your app',
          details: 'These allow posting to your page automatically'
        },
        {
          step: 3,
          title: 'Get Page Access Token',
          description: 'Use Graph API Explorer to generate a long-lived page token',
          details: 'Select your page and required permissions'
        },
        {
          step: 4,
          title: 'Configure Webhook',
          description: 'Set up webhook for real-time events',
          details: 'URL will be provided in Make.com setup'
        }
      ],
      permissions: this.requiredPermissions.facebook,
      testUrl: `https://graph.facebook.com/me/accounts?access_token=YOUR_TOKEN`
    };
  }

  generateTwitterInstructions(clubData, handle) {
    return {
      title: 'Twitter/X API Connection',
      steps: [
        {
          step: 1,
          title: 'Apply for Developer Account',
          description: 'Go to developer.twitter.com and apply',
          details: 'Mention you\'re building automation for a football club'
        },
        {
          step: 2,
          title: 'Create Project & App',
          description: 'Create a new project and app in your developer portal',
          details: 'Choose "Making a bot" as your use case'
        },
        {
          step: 3,
          title: 'Generate API Keys',
          description: 'Create API Key, API Secret, Access Token, and Access Token Secret',
          details: 'Keep these secure - you\'ll need them for Make.com'
        },
        {
          step: 4,
          title: 'Enable OAuth 2.0',
          description: 'Set up OAuth 2.0 with proper callback URLs',
          details: 'Required for advanced automation features'
        }
      ],
      permissions: this.requiredPermissions.twitter,
      testUrl: `https://api.twitter.com/2/users/by/username/${handle}`
    };
  }

  generateInstagramInstructions(clubData, handle) {
    return {
      title: 'Instagram Business API Setup',
      steps: [
        {
          step: 1,
          title: 'Convert to Business Account',
          description: 'Switch your Instagram to a Business account',
          details: 'This is required for API access'
        },
        {
          step: 2,
          title: 'Connect to Facebook Page',
          description: 'Link your Instagram to your Facebook page',
          details: 'Both must be owned by the same business'
        },
        {
          step: 3,
          title: 'Get Business Verification',
          description: 'Complete Meta Business verification process',
          details: 'Required for content publishing API'
        },
        {
          step: 4,
          title: 'Use Facebook App',
          description: 'Use the same Facebook app for Instagram access',
          details: 'Add Instagram Basic Display and Instagram API products'
        }
      ],
      permissions: this.requiredPermissions.instagram,
      testUrl: `https://graph.facebook.com/v18.0/me/accounts`
    };
  }

  generateTikTokInstructions(clubData, handle) {
    return {
      title: 'TikTok for Developers Setup',
      steps: [
        {
          step: 1,
          title: 'Apply for TikTok for Developers',
          description: 'Register at developers.tiktok.com',
          details: 'Business verification may be required'
        },
        {
          step: 2,
          title: 'Create App',
          description: 'Create a new app in the developer console',
          details: 'Select "Content Posting" as your use case'
        },
        {
          step: 3,
          title: 'Request Permissions',
          description: 'Apply for video posting and user info permissions',
          details: 'Review process can take 1-2 weeks'
        },
        {
          step: 4,
          title: 'Configure OAuth',
          description: 'Set up OAuth 2.0 flow for user authorization',
          details: 'Users must authorize your app to post content'
        }
      ],
      permissions: this.requiredPermissions.tiktok,
      testUrl: 'https://open-api.tiktok.com/oauth/access_token/'
    };
  }

  generateYouTubeInstructions(clubData, channelUrl) {
    return {
      title: 'YouTube Data API Setup',
      steps: [
        {
          step: 1,
          title: 'Google Cloud Console',
          description: 'Create project in Google Cloud Console',
          details: 'Enable YouTube Data API v3'
        },
        {
          step: 2,
          title: 'Create Credentials',
          description: 'Generate OAuth 2.0 credentials',
          details: 'Download the client_secret.json file'
        },
        {
          step: 3,
          title: 'Configure OAuth Consent',
          description: 'Set up OAuth consent screen',
          details: 'Add your domain to authorized domains'
        },
        {
          step: 4,
          title: 'Test Authorization',
          description: 'Complete OAuth flow to get refresh token',
          details: 'Store refresh token securely for automation'
        }
      ],
      permissions: this.requiredPermissions.youtube,
      testUrl: 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true'
    };
  }

  /**
   * Save social media configuration to spreadsheet
   */
  saveSocialMediaConfig(setupResults) {
    try {
      const sheet = getSpreadsheet().getSheetByName('Social_Media_Config') ||
                   getSpreadsheet().insertSheet('Social_Media_Config');

      // Clear existing data
      sheet.clear();

      // Headers
      const headers = ['Platform', 'Status', 'Handle/Page', 'App ID', 'Webhook URL', 'Setup Date', 'Notes'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#2196F3');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');

      // Add platform data
      let row = 2;
      for (const [platform, config] of Object.entries(setupResults.connectedPlatforms)) {
        const status = config.success ? 'Connected' : (config.skipped ? 'Skipped' : 'Error');
        const handle = config.handle || config.pageUrl || config.channelUrl || 'N/A';
        const appId = config.appId || config.clientId || config.apiKey || '[TO_BE_CONFIGURED]';
        const webhook = config.webhookUrl || '';
        const notes = config.error || (config.skipped ? 'Skipped by user' : 'Ready for configuration');

        sheet.getRange(row, 1, 1, 7).setValues([[
          platform.charAt(0).toUpperCase() + platform.slice(1),
          status,
          handle,
          appId,
          webhook,
          new Date(),
          notes
        ]]);

        // Color code status
        const statusCell = sheet.getRange(row, 2);
        if (status === 'Connected') {
          statusCell.setBackground('#4CAF50').setFontColor('white');
        } else if (status === 'Skipped') {
          statusCell.setBackground('#FF9800').setFontColor('white');
        } else {
          statusCell.setBackground('#F44336').setFontColor('white');
        }

        row++;
      }

      // Auto-resize columns
      sheet.autoResizeColumns(1, headers.length);

      Logger.log('✅ Social media config saved successfully');

    } catch (error) {
      Logger.log('❌ Error saving social media config: ' + error.toString());
    }
  }

  /**
   * Create comprehensive integration guide
   */
  createIntegrationGuide(setupResults) {
    const guide = `
<!DOCTYPE html>
<html>
<head>
    <title>${setupResults.clubName} - Social Media Integration Guide</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; text-align: center; }
        .platform-section { margin: 30px 0; padding: 20px; border: 2px solid #e0e0e0; border-radius: 10px; }
        .connected { border-color: #4CAF50; background: #f8f9fa; }
        .skipped { border-color: #FF9800; background: #fff8f0; }
        .error { border-color: #F44336; background: #fff5f5; }
        .step { margin: 15px 0; padding: 15px; background: white; border-left: 4px solid #2196F3; border-radius: 5px; }
        .button { display: inline-block; padding: 12px 25px; background: #1976d2; color: white; text-decoration: none; border-radius: 8px; margin: 10px 5px; }
        .code { background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
        .success { color: #4CAF50; font-weight: bold; }
        .warning { color: #FF9800; font-weight: bold; }
        .error-text { color: #F44336; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📱 ${setupResults.clubName}</h1>
        <h2>Social Media Integration Complete!</h2>
        <p>Your platforms are ready for automation</p>
    </div>

    <div class="platform-section">
        <h3>📊 Setup Summary</h3>
        <ul>
            ${Object.entries(setupResults.connectedPlatforms).map(([platform, config]) => {
              const status = config.success ? 'success' : (config.skipped ? 'warning' : 'error-text');
              const statusText = config.success ? '✅ Connected' : (config.skipped ? '⏭️ Skipped' : '❌ Error');
              return `<li class="${status}">${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${statusText}</li>`;
            }).join('')}
        </ul>
    </div>

    ${Object.entries(setupResults.connectedPlatforms).map(([platform, config]) => {
      const sectionClass = config.success ? 'connected' : (config.skipped ? 'skipped' : 'error');
      return `
        <div class="platform-section ${sectionClass}">
            <h3>${this.getPlatformIcon(platform)} ${platform.charAt(0).toUpperCase() + platform.slice(1)} Integration</h3>

            ${config.success ? `
                <p class="success">✅ Successfully configured for automation!</p>
                <div class="code">
                    <strong>Webhook URL:</strong> ${config.webhookUrl}<br>
                    <strong>Handle/Page:</strong> ${config.handle || config.pageUrl || config.channelUrl}
                </div>
            ` : config.skipped ? `
                <p class="warning">⏭️ Platform skipped during setup</p>
                <p>You can add this platform later through the setup wizard.</p>
            ` : `
                <p class="error-text">❌ Setup encountered an error</p>
                <p><strong>Error:</strong> ${config.error}</p>
            `}

            ${config.instructions ? `
                <h4>📋 Configuration Steps</h4>
                ${config.instructions.steps.map(step => `
                    <div class="step">
                        <strong>Step ${step.step}: ${step.title}</strong>
                        <p>${step.description}</p>
                        <small style="color: #666;">${step.details}</small>
                    </div>
                `).join('')}

                <h4>🔑 Required Permissions</h4>
                <ul>
                    ${config.instructions.permissions.map(permission => `<li><code>${permission}</code></li>`).join('')}
                </ul>

                ${config.instructions.testUrl ? `
                    <h4>🧪 Test Connection</h4>
                    <div class="code">
                        Test URL: ${config.instructions.testUrl}
                    </div>
                ` : ''}
            ` : ''}
        </div>
      `;
    }).join('')}

    <div class="platform-section">
        <h3>🚀 Next Steps</h3>

        <div class="step">
            <strong>1. Complete API Configurations</strong>
            <p>Follow the step-by-step instructions above for each connected platform</p>
            <p>Keep all API keys and tokens secure</p>
        </div>

        <div class="step">
            <strong>2. Import Make.com Blueprint</strong>
            <p>Your Make.com blueprint is pre-configured with these social media connections</p>
            <p>Import the blueprint and add your API credentials</p>
        </div>

        <div class="step">
            <strong>3. Test Automation</strong>
            <p>Run test posts to verify all platforms are working correctly</p>
            <p>Check webhook endpoints are receiving data</p>
        </div>

        <div class="step">
            <strong>4. Go Live!</strong>
            <p>Your social media automation is ready for match day</p>
            <p>Goals, cards, and highlights will post automatically</p>
        </div>
    </div>

    <div class="platform-section">
        <h3>📞 Support & Resources</h3>

        <a href="mailto:support@footballautomation.com" class="button">📧 Email Support</a>
        <a href="#" class="button">💬 Live Chat</a>
        <a href="#" class="button">📚 Documentation</a>
        <a href="#" class="button">🎥 Video Tutorials</a>

        <h4>Common Issues</h4>
        <ul>
            <li><strong>API Rate Limits:</strong> Ensure you're using production-level API access</li>
            <li><strong>Webhook Errors:</strong> Check Make.com webhook URLs are correctly configured</li>
            <li><strong>Permission Denied:</strong> Verify all required permissions are granted</li>
            <li><strong>Token Expiry:</strong> Set up automatic token refresh in Make.com</li>
        </ul>
    </div>

    <footer style="text-align: center; margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 10px;">
        <p><strong>Social Media Integration for ${setupResults.clubName}</strong></p>
        <p>Football Club Automation Package © 2024</p>
        <p><em>Generated: ${new Date().toLocaleString()}</em></p>
    </footer>
</body>
</html>`;

    // Save integration guide
    try {
      const fileName = `${setupResults.clubName.replace(/\s+/g, '_')}_social_media_guide.html`;
      DriveApp.createFile(fileName, guide, MimeType.HTML);
      Logger.log(`✅ Integration guide saved as: ${fileName}`);
    } catch (error) {
      Logger.log('❌ Error saving integration guide: ' + error.toString());
    }

    return guide;
  }

  /**
   * Show setup completion summary
   */
  showSetupSummary(setupResults) {
    const ui = SpreadsheetApp.getUi();

    const connectedCount = Object.values(setupResults.connectedPlatforms).filter(p => p.success).length;
    const totalCount = Object.keys(setupResults.connectedPlatforms).length;
    const skippedCount = Object.values(setupResults.connectedPlatforms).filter(p => p.skipped).length;

    const summary = `🎉 Social Media Setup Complete!\n\n` +
      `📊 Results:\n` +
      `✅ Connected: ${connectedCount} platforms\n` +
      `⏭️ Skipped: ${skippedCount} platforms\n` +
      `❌ Errors: ${setupResults.errors.length}\n\n` +
      `📁 Files Created:\n` +
      `• Social Media Configuration Sheet\n` +
      `• Platform Integration Guide\n` +
      `• API Setup Instructions\n\n` +
      `🚀 Next: Import your Make.com blueprint!`;

    ui.alert('Setup Complete', summary, ui.ButtonSet.OK);
  }

  /**
   * Helper functions
   */
  extractFacebookPageId(pageUrl) {
    const match = pageUrl.match(/facebook\.com\/([^\/\?]+)/);
    return match ? match[1] : 'UNKNOWN_PAGE_ID';
  }

  extractYouTubeChannelId(channelUrl) {
    const match = channelUrl.match(/channel\/([^\/\?]+)/) || channelUrl.match(/c\/([^\/\?]+)/);
    return match ? match[1] : 'UNKNOWN_CHANNEL_ID';
  }

  getPlatformIcon(platform) {
    const icons = {
      facebook: '📘',
      twitter: '🐦',
      instagram: '📸',
      tiktok: '🎵',
      youtube: '📺'
    };
    return icons[platform] || '📱';
  }
}

/**
 * Main function to run social media setup
 */
function runSocialMediaSetup() {
  const wizard = new SocialMediaSetupWizard();
  return wizard.runSocialMediaSetup();
}

/**
 * Individual platform setup functions (can be called separately)
 */
function setupFacebookOnly() {
  const wizard = new SocialMediaSetupWizard();
  const customerConfig = getCustomerConfiguration();
  return wizard.setupFacebook(customerConfig.data);
}

function setupTwitterOnly() {
  const wizard = new SocialMediaSetupWizard();
  const customerConfig = getCustomerConfiguration();
  return wizard.setupTwitter(customerConfig.data);
}

function setupInstagramOnly() {
  const wizard = new SocialMediaSetupWizard();
  const customerConfig = getCustomerConfiguration();
  return wizard.setupInstagram(customerConfig.data);
}

/**
 * Test function
 */
function testSocialMediaSetup() {
  Logger.log('🧪 Testing social media setup wizard...');

  const result = runSocialMediaSetup();

  if (result.success) {
    Logger.log('✅ Test passed: Social media setup completed');
    Logger.log(`📱 Connected platforms: ${result.connectedPlatforms.join(', ')}`);
    if (result.errors.length > 0) {
      Logger.log(`⚠️ Errors encountered: ${result.errors.join(', ')}`);
    }
  } else {
    Logger.log('❌ Test failed: ' + (result.error || 'Setup cancelled'));
  }

  return result;
}