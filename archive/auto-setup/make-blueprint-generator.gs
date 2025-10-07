/**
 * Make.com Blueprint Auto-Generator
 *
 * This system automatically generates a complete Make.com scenario blueprint
 * that customers can import with one click, eliminating manual setup.
 */

/**
 * Generate complete Make.com blueprint for a customer
 */
function generateMakeBlueprint() {
  try {
    const ui = SpreadsheetApp.getUi();

    ui.alert(
      '🔧 Make.com Blueprint Generator',
      'This will create a complete Make.com automation blueprint for your club.\n\n' +
      'The blueprint includes:\n' +
      '⚽ Live match event automation\n' +
      '🎬 Video processing triggers\n' +
      '📱 Social media posting to all platforms\n' +
      '🎨 Canva graphics generation\n' +
      '📊 Analytics and tracking\n\n' +
      'Generated blueprint can be imported into Make.com with one click!',
      ui.ButtonSet.OK
    );

    // Get customer configuration
    const customerConfig = getCustomerConfiguration();
    if (!customerConfig.success) {
      ui.alert('Configuration Required', 'Please complete your system configuration first.', ui.ButtonSet.OK);
      return;
    }

    // Generate the blueprint
    const blueprint = createMakeBlueprint(customerConfig.data);

    // Save blueprint to Google Drive
    const blueprintFile = saveBlueprintToFile(blueprint, customerConfig.data.clubName);

    // Create setup instructions
    const instructions = createSetupInstructions(blueprintFile.url, customerConfig.data);

    // Show success message with instructions
    showBlueprintSuccess(blueprintFile, instructions);

    return { success: true, blueprint: blueprint, file: blueprintFile };

  } catch (error) {
    Logger.log('Blueprint generation error: ' + error.toString());
    SpreadsheetApp.getUi().alert(
      'Blueprint Generation Error',
      'Failed to generate blueprint: ' + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return { success: false, error: error.message };
  }
}

/**
 * Get customer configuration for blueprint generation
 */
function getCustomerConfiguration() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = spreadsheet.getSheetByName('📋 System Configuration');

    if (!configSheet) {
      return { success: false, error: 'Configuration sheet not found' };
    }

    const data = configSheet.getDataRange().getValues();
    const config = {};

    // Extract configuration values
    data.forEach(row => {
      if (row[0] && row[1]) {
        switch (row[0]) {
          case 'Club Name':
            config.clubName = row[1];
            break;
          case 'League/Division':
            config.league = row[1];
            break;
          case 'Current Season':
            config.season = row[1];
            break;
          case 'Age Group':
            config.ageGroup = row[1];
            break;
          case 'Team Colors':
            config.teamColors = row[1];
            break;
        }
      }
    });

    // Get spreadsheet webhook URL
    const spreadsheetId = spreadsheet.getId();
    config.webhookUrl = `https://script.google.com/macros/s/${ScriptApp.getScriptId()}/exec`;
    config.spreadsheetId = spreadsheetId;

    // Validate required fields
    const required = ['clubName', 'league', 'season'];
    const missing = required.filter(field => !config[field]);

    if (missing.length > 0) {
      return { success: false, error: `Missing required configuration: ${missing.join(', ')}` };
    }

    return { success: true, data: config };

  } catch (error) {
    Logger.log('Error getting customer configuration: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Create complete Make.com blueprint JSON
 */
function createMakeBlueprint(config) {
  const blueprint = {
    name: `${config.clubName} - Football Automation`,
    description: `Complete football club automation for ${config.clubName}`,
    version: "1.0.0",
    schemaVersion: "1.0.0",
    modules: [],
    metadata: {
      "instant": false,
      "designer": {
        "canvas": {
          "version": "2.0",
          "zoom": 1
        }
      }
    }
  };

  // Module 1: Webhook Listener for Live Events
  blueprint.modules.push(createWebhookModule(config));

  // Module 2: Router for Event Types
  blueprint.modules.push(createRouterModule());

  // Module 3: Goal Event Processing
  blueprint.modules.push(createGoalProcessingModule(config));

  // Module 4: Card Event Processing
  blueprint.modules.push(createCardProcessingModule(config));

  // Module 5: Video Processing Trigger
  blueprint.modules.push(createVideoProcessingModule(config));

  // Module 6: Canva Graphics Generation
  blueprint.modules.push(createCanvaModule(config));

  // Module 7: Facebook Posting
  blueprint.modules.push(createFacebookModule(config));

  // Module 8: Twitter Posting
  blueprint.modules.push(createTwitterModule(config));

  // Module 9: Instagram Posting
  blueprint.modules.push(createInstagramModule(config));

  // Module 10: Analytics Tracking
  blueprint.modules.push(createAnalyticsModule(config));

  // Add connections between modules
  blueprint.connections = createModuleConnections();

  return blueprint;
}

/**
 * Create webhook listener module
 */
function createWebhookModule(config) {
  return {
    "id": 1,
    "module": "webhook:webhook",
    "version": 1,
    "parameters": {
      "hook": `${config.clubName.toLowerCase().replace(/\s+/g, '-')}-events`,
      "maxResults": 1
    },
    "mapper": {},
    "metadata": {
      "designer": {
        "x": 0,
        "y": 0
      },
      "restore": {},
      "parameters": [
        {
          "name": "hook",
          "type": "hook",
          "label": "Webhook",
          "required": true
        }
      ],
      "interface": [
        {
          "name": "event_type",
          "type": "text",
          "label": "Event Type"
        },
        {
          "name": "player_name",
          "type": "text",
          "label": "Player Name"
        },
        {
          "name": "minute",
          "type": "number",
          "label": "Minute"
        },
        {
          "name": "home_score",
          "type": "number",
          "label": "Home Score"
        },
        {
          "name": "away_score",
          "type": "number",
          "label": "Away Score"
        },
        {
          "name": "match_date",
          "type": "date",
          "label": "Match Date"
        },
        {
          "name": "opponent",
          "type": "text",
          "label": "Opponent"
        },
        {
          "name": "assist_by",
          "type": "text",
          "label": "Assist By"
        },
        {
          "name": "card_type",
          "type": "text",
          "label": "Card Type"
        },
        {
          "name": "club_name",
          "type": "text",
          "label": "Club Name"
        },
        {
          "name": "season",
          "type": "text",
          "label": "Season"
        }
      ]
    }
  };
}

/**
 * Create router module for event type filtering
 */
function createRouterModule() {
  return {
    "id": 2,
    "module": "util:router",
    "version": 1,
    "parameters": {},
    "mapper": {
      "routes": [
        {
          "label": "Goal Events",
          "condition": "{{1.event_type}} = goal_scored OR {{1.event_type}} = goal_opposition"
        },
        {
          "label": "Card Events",
          "condition": "{{1.event_type}} = card_shown OR {{1.event_type}} = card_opposition OR {{1.event_type}} = card_second_yellow"
        },
        {
          "label": "Match Status",
          "condition": "{{1.event_type}} = match_kickoff OR {{1.event_type}} = match_halftime OR {{1.event_type}} = match_second_half OR {{1.event_type}} = match_fulltime"
        },
        {
          "label": "Video Processing",
          "condition": "{{1.event_type}} = goal_scored OR {{1.event_type}} = card_second_yellow"
        }
      ]
    },
    "metadata": {
      "designer": {
        "x": 300,
        "y": 0
      }
    }
  };
}

/**
 * Create goal processing module
 */
function createGoalProcessingModule(config) {
  return {
    "id": 3,
    "module": "util:compose",
    "version": 1,
    "parameters": {},
    "mapper": {
      "goal_text": `⚽ GOAL! {{1.player_name}} scores for ${config.clubName}!`,
      "score_text": "{{1.home_score}} - {{1.away_score}}",
      "minute_text": "{{1.minute}}'",
      "assist_text": "{{if(1.assist_by; \"Assist: \" + 1.assist_by; \"\")}}",
      "hashtags": `#${config.clubName.replace(/\s+/g, '')} #Goal #${config.league.replace(/\s+/g, '')} #Football`,
      "post_content": `⚽ GOAL! {{1.player_name}} scores for ${config.clubName}!\n\n📊 Score: {{1.home_score}} - {{1.away_score}}\n⏰ {{1.minute}}'\n{{if(1.assist_by; \"🎯 Assist: \" + 1.assist_by; \"\")}}\n\n#${config.clubName.replace(/\s+/g, '')} #Goal #Football`
    },
    "metadata": {
      "designer": {
        "x": 600,
        "y": -100
      }
    }
  };
}

/**
 * Create card processing module
 */
function createCardProcessingModule(config) {
  return {
    "id": 4,
    "module": "util:compose",
    "version": 1,
    "parameters": {},
    "mapper": {
      "card_emoji": "{{if(contains(1.card_type; \"red\"); \"🟥\"; \"🟨\")}}",
      "card_text": `{{if(contains(1.card_type; \"red\"); \"🟥 RED CARD\"; \"🟨 YELLOW CARD\")}} - {{1.player_name}}`,
      "minute_text": "{{1.minute}}'",
      "hashtags": `#${config.clubName.replace(/\s+/g, '')} #Card #${config.league.replace(/\s+/g, '')} #Football`,
      "post_content": `{{if(contains(1.card_type; \"red\"); \"🟥 RED CARD\"; \"🟨 YELLOW CARD\")}} - {{1.player_name}}\n\n⏰ {{1.minute}}'\n📊 Current Score: {{1.home_score}} - {{1.away_score}}\n\n#${config.clubName.replace(/\s+/g, '')} #Football`
    },
    "metadata": {
      "designer": {
        "x": 600,
        "y": 0
      }
    }
  };
}

/**
 * Create video processing trigger module
 */
function createVideoProcessingModule(config) {
  return {
    "id": 5,
    "module": "http:send-request",
    "version": 3,
    "parameters": {
      "handleErrors": true,
      "timeout": 300
    },
    "mapper": {
      "url": "{{1.video_service_url}}/api/process-clip",
      "method": "POST",
      "headers": [
        {
          "name": "Content-Type",
          "value": "application/json"
        },
        {
          "name": "Authorization",
          "value": "Bearer {{1.api_key}}"
        }
      ],
      "body": JSON.stringify({
        "event_type": "{{1.event_type}}",
        "player": "{{1.player_name}}",
        "minute": "{{1.minute}}",
        "club_name": config.clubName,
        "priority": "high",
        "formats": ["16:9", "1:1", "9:16"],
        "branding": {
          "club_name": config.clubName,
          "team_colors": config.teamColors,
          "include_logo": true
        }
      })
    },
    "metadata": {
      "designer": {
        "x": 600,
        "y": 100
      }
    }
  };
}

/**
 * Create Canva graphics module
 */
function createCanvaModule(config) {
  return {
    "id": 6,
    "module": "canva:create-design",
    "version": 1,
    "parameters": {},
    "mapper": {
      "template_id": "{{if(1.event_type = \"goal_scored\"; \"GOAL_TEMPLATE_ID\"; if(contains(1.event_type; \"card\"); \"CARD_TEMPLATE_ID\"; \"MATCH_TEMPLATE_ID\"))}}",
      "title": `${config.clubName} - {{1.event_type}}`,
      "elements": [
        {
          "id": "player_name",
          "text": "{{1.player_name}}"
        },
        {
          "id": "club_name",
          "text": config.clubName
        },
        {
          "id": "minute",
          "text": "{{1.minute}}'"
        },
        {
          "id": "score",
          "text": "{{1.home_score}} - {{1.away_score}}"
        },
        {
          "id": "opponent",
          "text": "{{1.opponent}}"
        },
        {
          "id": "season",
          "text": config.season
        }
      ]
    },
    "metadata": {
      "designer": {
        "x": 900,
        "y": 0
      }
    }
  };
}

/**
 * Create Facebook posting module
 */
function createFacebookModule(config) {
  return {
    "id": 7,
    "module": "facebook:create-post",
    "version": 2,
    "parameters": {},
    "mapper": {
      "page_id": "YOUR_FACEBOOK_PAGE_ID",
      "message": "{{3.post_content}}{{4.post_content}}",
      "link": "{{6.design_url}}",
      "published": true
    },
    "metadata": {
      "designer": {
        "x": 1200,
        "y": -100
      }
    }
  };
}

/**
 * Create Twitter posting module
 */
function createTwitterModule(config) {
  return {
    "id": 8,
    "module": "twitter:create-tweet",
    "version": 1,
    "parameters": {},
    "mapper": {
      "status": "{{3.post_content}}{{4.post_content}}",
      "media": "{{6.design_url}}"
    },
    "metadata": {
      "designer": {
        "x": 1200,
        "y": 0
      }
    }
  };
}

/**
 * Create Instagram posting module
 */
function createInstagramModule(config) {
  return {
    "id": 9,
    "module": "instagram:create-media-post",
    "version": 1,
    "parameters": {},
    "mapper": {
      "caption": "{{3.post_content}}{{4.post_content}}",
      "image_url": "{{6.design_url}}"
    },
    "metadata": {
      "designer": {
        "x": 1200,
        "y": 100
      }
    }
  };
}

/**
 * Create analytics tracking module
 */
function createAnalyticsModule(config) {
  return {
    "id": 10,
    "module": "google-sheets:add-row",
    "version": 2,
    "parameters": {},
    "mapper": {
      "spreadsheet_id": "{{1.spreadsheet_id}}",
      "sheet_name": "Analytics",
      "values": [
        "{{formatDate(now; \"YYYY-MM-DD HH:mm:ss\")}}",
        "{{1.event_type}}",
        "{{1.player_name}}",
        "{{1.minute}}",
        "Social Media Posted",
        "{{6.design_url}}",
        "{{7.post_id}}{{8.tweet_id}}{{9.media_id}}"
      ]
    },
    "metadata": {
      "designer": {
        "x": 1500,
        "y": 0
      }
    }
  };
}

/**
 * Create connections between modules
 */
function createModuleConnections() {
  return [
    {
      "id": 1,
      "src": {
        "moduleId": 1,
        "portType": "source"
      },
      "dst": {
        "moduleId": 2,
        "portType": "target"
      }
    },
    {
      "id": 2,
      "src": {
        "moduleId": 2,
        "portType": "source",
        "portName": "route1"
      },
      "dst": {
        "moduleId": 3,
        "portType": "target"
      }
    },
    {
      "id": 3,
      "src": {
        "moduleId": 2,
        "portType": "source",
        "portName": "route2"
      },
      "dst": {
        "moduleId": 4,
        "portType": "target"
      }
    },
    {
      "id": 4,
      "src": {
        "moduleId": 2,
        "portType": "source",
        "portName": "route4"
      },
      "dst": {
        "moduleId": 5,
        "portType": "target"
      }
    },
    {
      "id": 5,
      "src": {
        "moduleId": 3,
        "portType": "source"
      },
      "dst": {
        "moduleId": 6,
        "portType": "target"
      }
    },
    {
      "id": 6,
      "src": {
        "moduleId": 4,
        "portType": "source"
      },
      "dst": {
        "moduleId": 6,
        "portType": "target"
      }
    },
    {
      "id": 7,
      "src": {
        "moduleId": 6,
        "portType": "source"
      },
      "dst": {
        "moduleId": 7,
        "portType": "target"
      }
    },
    {
      "id": 8,
      "src": {
        "moduleId": 6,
        "portType": "source"
      },
      "dst": {
        "moduleId": 8,
        "portType": "target"
      }
    },
    {
      "id": 9,
      "src": {
        "moduleId": 6,
        "portType": "source"
      },
      "dst": {
        "moduleId": 9,
        "portType": "target"
      }
    },
    {
      "id": 10,
      "src": {
        "moduleId": 7,
        "portType": "source"
      },
      "dst": {
        "moduleId": 10,
        "portType": "target"
      }
    }
  ];
}

/**
 * Save blueprint to Google Drive as downloadable file
 */
function saveBlueprintToFile(blueprint, clubName) {
  try {
    const fileName = `${clubName.replace(/\s+/g, '-')}-Make-Blueprint.json`;
    const jsonContent = JSON.stringify(blueprint, null, 2);

    const blob = Utilities.newBlob(jsonContent, 'application/json', fileName);
    const file = DriveApp.createFile(blob);

    // Make file public for download
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileUrl = file.getDownloadUrl();

    Logger.log(`Blueprint saved: ${fileName} (${file.getId()})`);

    return {
      id: file.getId(),
      name: fileName,
      url: fileUrl,
      directUrl: `https://drive.google.com/file/d/${file.getId()}/view?usp=sharing`
    };

  } catch (error) {
    Logger.log('Error saving blueprint file: ' + error.toString());
    throw error;
  }
}

/**
 * Create setup instructions for the customer
 */
function createSetupInstructions(blueprintUrl, config) {
  return {
    title: `${config.clubName} - Make.com Setup Instructions`,
    steps: [
      {
        step: 1,
        title: "Download Your Blueprint",
        description: "Click the link below to download your custom Make.com blueprint",
        action: `Download: ${blueprintUrl}`
      },
      {
        step: 2,
        title: "Create Make.com Account",
        description: "Sign up for a free Make.com account at make.com",
        action: "Visit: https://make.com"
      },
      {
        step: 3,
        title: "Import Blueprint",
        description: "In Make.com, click 'Create Scenario' → 'Import Blueprint' → Upload your JSON file",
        action: "Import the downloaded JSON file"
      },
      {
        step: 4,
        title: "Connect Social Media",
        description: "Connect your Facebook, Twitter, and Instagram accounts in Make.com",
        action: "Follow Make.com's connection wizards for each platform"
      },
      {
        step: 5,
        title: "Configure Canva",
        description: "Connect your Canva account and set up templates (we'll provide template IDs)",
        action: "Use the Canva template package (coming next)"
      },
      {
        step: 6,
        title: "Test Your Automation",
        description: "Activate the scenario and test with a sample goal event",
        action: "Input a test goal in your Live Match Updates sheet"
      }
    ],
    webhookUrl: `https://script.google.com/macros/s/${ScriptApp.getScriptId()}/exec`,
    templateIds: {
      goal: "GOAL_TEMPLATE_ID",
      card: "CARD_TEMPLATE_ID",
      match: "MATCH_TEMPLATE_ID"
    }
  };
}

/**
 * Show blueprint success message with instructions
 */
function showBlueprintSuccess(blueprintFile, instructions) {
  const ui = SpreadsheetApp.getUi();

  let message = `🎉 Make.com Blueprint Generated Successfully!\n\n`;
  message += `📁 File: ${blueprintFile.name}\n`;
  message += `🔗 Download: ${blueprintFile.directUrl}\n\n`;
  message += `📋 Next Steps:\n`;
  instructions.steps.slice(0, 3).forEach(step => {
    message += `${step.step}. ${step.title}\n`;
  });
  message += `\n💡 Complete setup instructions are saved with your blueprint.\n`;
  message += `\n🚀 After setup, your club will have:\n`;
  message += `• Automatic social media posting for goals & cards\n`;
  message += `• Professional Canva graphics for every event\n`;
  message += `• Video processing triggers for highlights\n`;
  message += `• Complete analytics tracking\n\n`;
  message += `Ready to revolutionize your club's social media! 🏈⚽`;

  ui.alert('Blueprint Ready! 🎉', message, ui.ButtonSet.OK);
}