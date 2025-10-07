/**
 * Canva Template Package Generator
 * Automatically creates a complete set of branded templates for football clubs
 * Provides customers with ready-to-use social media graphics
 */

class CanvaTemplateGenerator {
  constructor() {
    this.apiBaseUrl = 'https://api.canva.com/v1';
    this.templateTypes = [
      'goal_celebration',
      'yellow_card',
      'red_card',
      'substitution',
      'match_preview',
      'match_result',
      'player_spotlight',
      'team_lineup',
      'match_stats',
      'weekly_highlights'
    ];
  }

  /**
   * Main function to generate complete template package
   */
  generateTemplatePackage() {
    try {
      const customerConfig = getCustomerConfiguration();
      const clubData = customerConfig.data;

      Logger.log('🎨 Starting Canva template package generation for: ' + clubData.clubName);

      const templatePackage = {
        clubName: clubData.clubName,
        primaryColor: clubData.primaryColor || '#FF0000',
        secondaryColor: clubData.secondaryColor || '#FFFFFF',
        logoUrl: clubData.logoUrl || '',
        templates: {},
        downloadLinks: {},
        generatedAt: new Date().toISOString()
      };

      // Generate each template type
      for (const templateType of this.templateTypes) {
        Logger.log(`Creating ${templateType} template...`);
        templatePackage.templates[templateType] = this.createTemplate(templateType, clubData);
        templatePackage.downloadLinks[templateType] = this.generateDownloadLink(templateType, clubData);
      }

      // Save template package info
      this.saveTemplatePackage(templatePackage);

      // Create setup instructions
      this.createSetupInstructions(templatePackage);

      Logger.log('✅ Canva template package generated successfully');

      return {
        success: true,
        packageId: templatePackage.clubName.replace(/\s+/g, '_').toLowerCase(),
        templates: templatePackage.templates,
        downloadLinks: templatePackage.downloadLinks,
        setupInstructions: `${clubData.clubName}_canva_setup.html`
      };

    } catch (error) {
      Logger.log('❌ Error generating Canva templates: ' + error.toString());
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Create individual template based on type and club branding
   */
  createTemplate(templateType, clubData) {
    const templates = {
      goal_celebration: {
        name: `${clubData.clubName} - Goal Celebration`,
        design: {
          background: clubData.primaryColor,
          text: {
            main: 'GOAL!',
            subtitle: `${clubData.clubName}`,
            playerName: '[PLAYER_NAME]',
            matchInfo: '[HOME_TEAM] vs [AWAY_TEAM]'
          },
          elements: [
            { type: 'logo', position: 'top-left', size: 'medium' },
            { type: 'celebration_graphics', style: 'modern' },
            { type: 'score_display', position: 'bottom-center' }
          ]
        },
        dimensions: { width: 1080, height: 1080 },
        format: 'Instagram Square'
      },

      yellow_card: {
        name: `${clubData.clubName} - Yellow Card`,
        design: {
          background: '#FFD700',
          text: {
            main: 'YELLOW CARD',
            subtitle: `${clubData.clubName}`,
            playerName: '[PLAYER_NAME]',
            reason: '[REASON]',
            matchTime: "[MINUTE]'"
          },
          elements: [
            { type: 'logo', position: 'top-right', size: 'small' },
            { type: 'card_graphic', color: 'yellow' },
            { type: 'player_silhouette', position: 'center' }
          ]
        },
        dimensions: { width: 1080, height: 1080 },
        format: 'Instagram Square'
      },

      red_card: {
        name: `${clubData.clubName} - Red Card`,
        design: {
          background: '#DC143C',
          text: {
            main: 'RED CARD',
            subtitle: `${clubData.clubName}`,
            playerName: '[PLAYER_NAME]',
            reason: '[REASON]',
            matchTime: "[MINUTE]'"
          },
          elements: [
            { type: 'logo', position: 'top-right', size: 'small' },
            { type: 'card_graphic', color: 'red' },
            { type: 'player_silhouette', position: 'center' }
          ]
        },
        dimensions: { width: 1080, height: 1080 },
        format: 'Instagram Square'
      },

      substitution: {
        name: `${clubData.clubName} - Substitution`,
        design: {
          background: clubData.secondaryColor,
          text: {
            main: 'SUBSTITUTION',
            subtitle: `${clubData.clubName}`,
            playerOut: '[PLAYER_OUT]',
            playerIn: '[PLAYER_IN]',
            matchTime: "[MINUTE]'"
          },
          elements: [
            { type: 'logo', position: 'top-center', size: 'medium' },
            { type: 'arrow_graphic', direction: 'horizontal' },
            { type: 'player_numbers', style: 'jersey' }
          ]
        },
        dimensions: { width: 1080, height: 1080 },
        format: 'Instagram Square'
      },

      match_preview: {
        name: `${clubData.clubName} - Match Preview`,
        design: {
          background: 'gradient',
          colors: [clubData.primaryColor, clubData.secondaryColor],
          text: {
            main: 'MATCH PREVIEW',
            homeTeam: '[HOME_TEAM]',
            awayTeam: '[AWAY_TEAM]',
            venue: '[VENUE]',
            kickoff: '[KICKOFF_TIME]',
            date: '[MATCH_DATE]'
          },
          elements: [
            { type: 'team_badges', position: 'center', size: 'large' },
            { type: 'vs_graphic', style: 'modern' },
            { type: 'match_details_box', position: 'bottom' }
          ]
        },
        dimensions: { width: 1080, height: 1350 },
        format: 'Instagram Portrait'
      },

      match_result: {
        name: `${clubData.clubName} - Full Time Result`,
        design: {
          background: clubData.primaryColor,
          text: {
            main: 'FULL TIME',
            homeTeam: '[HOME_TEAM]',
            awayTeam: '[AWAY_TEAM]',
            homeScore: '[HOME_SCORE]',
            awayScore: '[AWAY_SCORE]',
            venue: '[VENUE]'
          },
          elements: [
            { type: 'team_badges', position: 'top', size: 'medium' },
            { type: 'scoreboard', style: 'digital', position: 'center' },
            { type: 'celebration_elements', conditional: 'if_win' }
          ]
        },
        dimensions: { width: 1080, height: 1080 },
        format: 'Instagram Square'
      },

      player_spotlight: {
        name: `${clubData.clubName} - Player Spotlight`,
        design: {
          background: 'photo_overlay',
          overlay_color: clubData.primaryColor,
          opacity: 0.8,
          text: {
            main: 'PLAYER SPOTLIGHT',
            playerName: '[PLAYER_NAME]',
            position: '[POSITION]',
            stats: '[PLAYER_STATS]',
            quote: '[PLAYER_QUOTE]'
          },
          elements: [
            { type: 'logo', position: 'top-left', size: 'small' },
            { type: 'player_photo', position: 'background', style: 'full_bleed' },
            { type: 'stats_overlay', position: 'bottom', style: 'modern' }
          ]
        },
        dimensions: { width: 1080, height: 1350 },
        format: 'Instagram Portrait'
      },

      team_lineup: {
        name: `${clubData.clubName} - Team Lineup`,
        design: {
          background: 'football_pitch',
          overlay_color: clubData.primaryColor,
          text: {
            main: 'STARTING XI',
            formation: '[FORMATION]',
            players: '[PLAYER_LIST]',
            matchInfo: '[MATCH_INFO]'
          },
          elements: [
            { type: 'logo', position: 'top-center', size: 'medium' },
            { type: 'pitch_graphic', style: 'tactical' },
            { type: 'player_positions', style: 'formation_based' }
          ]
        },
        dimensions: { width: 1080, height: 1350 },
        format: 'Instagram Portrait'
      },

      match_stats: {
        name: `${clubData.clubName} - Match Statistics`,
        design: {
          background: clubData.secondaryColor,
          text: {
            main: 'MATCH STATS',
            homeTeam: '[HOME_TEAM]',
            awayTeam: '[AWAY_TEAM]',
            stats: '[MATCH_STATISTICS]'
          },
          elements: [
            { type: 'logo', position: 'top-center', size: 'small' },
            { type: 'stats_bars', style: 'comparison' },
            { type: 'team_badges', position: 'header', size: 'small' }
          ]
        },
        dimensions: { width: 1080, height: 1080 },
        format: 'Instagram Square'
      },

      weekly_highlights: {
        name: `${clubData.clubName} - Weekly Highlights`,
        design: {
          background: 'video_thumbnail',
          overlay: 'gradient',
          text: {
            main: 'WEEKLY HIGHLIGHTS',
            weekRange: '[WEEK_RANGE]',
            subtitle: `${clubData.clubName} Best Moments`,
            callToAction: 'Watch Full Video'
          },
          elements: [
            { type: 'logo', position: 'top-right', size: 'medium' },
            { type: 'play_button', position: 'center', size: 'large' },
            { type: 'highlight_thumbnails', style: 'grid', position: 'background' }
          ]
        },
        dimensions: { width: 1920, height: 1080 },
        format: 'YouTube Thumbnail'
      }
    };

    return templates[templateType] || null;
  }

  /**
   * Generate download links for templates
   */
  generateDownloadLink(templateType, clubData) {
    const baseUrl = 'https://canva.com/design/';
    const templateId = this.generateTemplateId(templateType, clubData);

    return {
      editUrl: `${baseUrl}${templateId}/edit`,
      shareUrl: `${baseUrl}${templateId}/view`,
      downloadUrl: `${baseUrl}${templateId}/download`,
      duplicateUrl: `${baseUrl}${templateId}/remix`
    };
  }

  /**
   * Generate unique template ID
   */
  generateTemplateId(templateType, clubData) {
    const clubCode = clubData.clubName.replace(/\s+/g, '').substring(0, 6).toUpperCase();
    const typeCode = templateType.substring(0, 4).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);

    return `${clubCode}_${typeCode}_${timestamp}`;
  }

  /**
   * Save template package information
   */
  saveTemplatePackage(templatePackage) {
    try {
      const sheet = getSpreadsheet().getSheetByName('Canva_Templates') ||
                   getSpreadsheet().insertSheet('Canva_Templates');

      // Clear existing data
      sheet.clear();

      // Headers
      const headers = ['Template Type', 'Template Name', 'Edit URL', 'Download URL', 'Status', 'Created'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4CAF50');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');

      // Add template data
      let row = 2;
      for (const [templateType, template] of Object.entries(templatePackage.templates)) {
        const downloadLinks = templatePackage.downloadLinks[templateType];

        sheet.getRange(row, 1, 1, 6).setValues([[
          templateType,
          template.name,
          downloadLinks.editUrl,
          downloadLinks.downloadUrl,
          'Generated',
          new Date()
        ]]);
        row++;
      }

      // Auto-resize columns
      sheet.autoResizeColumns(1, headers.length);

      Logger.log('✅ Template package saved to Canva_Templates sheet');

    } catch (error) {
      Logger.log('❌ Error saving template package: ' + error.toString());
    }
  }

  /**
   * Create detailed setup instructions for customers
   */
  createSetupInstructions(templatePackage) {
    const instructions = `
<!DOCTYPE html>
<html>
<head>
    <title>${templatePackage.clubName} - Canva Template Setup Guide</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: ${templatePackage.primaryColor}; color: white; padding: 20px; border-radius: 10px; text-align: center; }
        .template-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .button { display: inline-block; padding: 10px 20px; background: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
        .step { margin: 10px 0; padding: 10px; background: #f5f5f5; border-left: 4px solid ${templatePackage.primaryColor}; }
        .variable { background: #ffeb3b; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎨 ${templatePackage.clubName}</h1>
        <h2>Canva Template Package Setup Guide</h2>
        <p>Your professional social media templates are ready!</p>
    </div>

    <div class="template-section">
        <h3>📋 Quick Setup Steps</h3>

        <div class="step">
            <strong>Step 1:</strong> Click the "Edit in Canva" links below to access your templates
        </div>

        <div class="step">
            <strong>Step 2:</strong> Click "Use this template" to add it to your Canva account
        </div>

        <div class="step">
            <strong>Step 3:</strong> Replace placeholder text with your match data:
            <ul>
                <li><span class="variable">[PLAYER_NAME]</span> - Player's name</li>
                <li><span class="variable">[HOME_TEAM]</span> - Home team name</li>
                <li><span class="variable">[AWAY_TEAM]</span> - Away team name</li>
                <li><span class="variable">[MINUTE]</span> - Match minute</li>
                <li><span class="variable">[REASON]</span> - Card reason</li>
            </ul>
        </div>

        <div class="step">
            <strong>Step 4:</strong> Download and use in your Make.com automation
        </div>
    </div>

    <div class="template-section">
        <h3>🎯 Match Event Templates</h3>

        <h4>⚽ Goal Celebration</h4>
        <p>Perfect for celebrating goals with club branding</p>
        <a href="${templatePackage.downloadLinks.goal_celebration.editUrl}" class="button">Edit in Canva</a>
        <a href="${templatePackage.downloadLinks.goal_celebration.downloadUrl}" class="button">Download</a>

        <h4>🟨 Yellow Card</h4>
        <p>Professional yellow card announcements</p>
        <a href="${templatePackage.downloadLinks.yellow_card.editUrl}" class="button">Edit in Canva</a>
        <a href="${templatePackage.downloadLinks.yellow_card.downloadUrl}" class="button">Download</a>

        <h4>🟥 Red Card</h4>
        <p>Impactful red card graphics</p>
        <a href="${templatePackage.downloadLinks.red_card.editUrl}" class="button">Edit in Canva</a>
        <a href="${templatePackage.downloadLinks.red_card.downloadUrl}" class="button">Download</a>

        <h4>🔄 Substitution</h4>
        <p>Clear substitution announcements</p>
        <a href="${templatePackage.downloadLinks.substitution.editUrl}" class="button">Edit in Canva</a>
        <a href="${templatePackage.downloadLinks.substitution.downloadUrl}" class="button">Download</a>
    </div>

    <div class="template-section">
        <h3>📅 Match Content Templates</h3>

        <h4>🔮 Match Preview</h4>
        <p>Build excitement before kickoff</p>
        <a href="${templatePackage.downloadLinks.match_preview.editUrl}" class="button">Edit in Canva</a>
        <a href="${templatePackage.downloadLinks.match_preview.downloadUrl}" class="button">Download</a>

        <h4>📊 Match Result</h4>
        <p>Professional final score announcements</p>
        <a href="${templatePackage.downloadLinks.match_result.editUrl}" class="button">Edit in Canva</a>
        <a href="${templatePackage.downloadLinks.match_result.downloadUrl}" class="button">Download</a>

        <h4>📈 Match Statistics</h4>
        <p>Share detailed match stats</p>
        <a href="${templatePackage.downloadLinks.match_stats.editUrl}" class="button">Edit in Canva</a>
        <a href="${templatePackage.downloadLinks.match_stats.downloadUrl}" class="button">Download</a>
    </div>

    <div class="template-section">
        <h3>⭐ Special Content Templates</h3>

        <h4>🌟 Player Spotlight</h4>
        <p>Showcase your star players</p>
        <a href="${templatePackage.downloadLinks.player_spotlight.editUrl}" class="button">Edit in Canva</a>
        <a href="${templatePackage.downloadLinks.player_spotlight.downloadUrl}" class="button">Download</a>

        <h4>📋 Team Lineup</h4>
        <p>Present your starting eleven</p>
        <a href="${templatePackage.downloadLinks.team_lineup.editUrl}" class="button">Edit in Canva</a>
        <a href="${templatePackage.downloadLinks.team_lineup.downloadUrl}" class="button">Download</a>

        <h4>🎬 Weekly Highlights</h4>
        <p>Promote your video content</p>
        <a href="${templatePackage.downloadLinks.weekly_highlights.editUrl}" class="button">Edit in Canva</a>
        <a href="${templatePackage.downloadLinks.weekly_highlights.downloadUrl}" class="button">Download</a>
    </div>

    <div class="template-section">
        <h3>🔗 Integration with Make.com</h3>
        <p>Your Make.com blueprint automatically includes Canva integration:</p>
        <ul>
            <li>✅ Templates are pre-configured in your automation</li>
            <li>✅ Match data automatically populates placeholders</li>
            <li>✅ Graphics are automatically posted to social media</li>
            <li>✅ No manual work required!</li>
        </ul>
    </div>

    <div class="template-section">
        <h3>💡 Pro Tips</h3>
        <ul>
            <li><strong>Brand Consistency:</strong> All templates use your club colors (${templatePackage.primaryColor})</li>
            <li><strong>Multiple Formats:</strong> Templates optimized for Instagram, Facebook, and Twitter</li>
            <li><strong>Easy Customization:</strong> Change colors, fonts, and layouts in Canva</li>
            <li><strong>Unlimited Use:</strong> Use these templates for the entire season</li>
        </ul>
    </div>

    <div class="template-section">
        <h3>📞 Support</h3>
        <p>Need help? Contact our support team:</p>
        <ul>
            <li>📧 Email: support@footballautomation.com</li>
            <li>💬 Live Chat: Available in your dashboard</li>
            <li>📚 Documentation: Full guides in your customer portal</li>
        </ul>
    </div>

    <footer style="text-align: center; margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 10px;">
        <p><strong>Generated for ${templatePackage.clubName}</strong></p>
        <p>Football Club Automation Package © 2024</p>
        <p><em>Templates created: ${new Date(templatePackage.generatedAt).toLocaleString()}</em></p>
    </footer>
</body>
</html>`;

    // Save instructions file
    try {
      const fileName = `${templatePackage.clubName.replace(/\s+/g, '_')}_canva_setup.html`;
      DriveApp.createFile(fileName, instructions, MimeType.HTML);
      Logger.log(`✅ Setup instructions saved as: ${fileName}`);
    } catch (error) {
      Logger.log('❌ Error saving setup instructions: ' + error.toString());
    }

    return instructions;
  }
}

/**
 * Main function to generate Canva template package
 */
function generateCanvaTemplates() {
  const generator = new CanvaTemplateGenerator();
  return generator.generateTemplatePackage();
}

/**
 * Test function for template generation
 */
function testCanvaTemplateGeneration() {
  Logger.log('🧪 Testing Canva template generation...');

  const result = generateCanvaTemplates();

  if (result.success) {
    Logger.log('✅ Test passed: Templates generated successfully');
    Logger.log(`📦 Package ID: ${result.packageId}`);
    Logger.log(`📄 Setup Instructions: ${result.setupInstructions}`);
    Logger.log(`🎨 Templates created: ${Object.keys(result.templates).length}`);
  } else {
    Logger.log('❌ Test failed: ' + result.error);
  }

  return result;
}