import fs from 'fs-extra';
import path from 'path';

export class InstallerIntegration {
  constructor() {
    this.configPath = path.join(process.cwd(), 'football-highlights-system', 'config.json');
    this.accountsPath = path.join(process.cwd(), 'football-highlights-system', '.accounts.json');
    this.deploymentsPath = path.join(process.cwd(), 'football-highlights-system', '.deployments.json');
  }

  async loadInstallerConfig() {
    try {
      const config = await fs.readJson(this.configPath);
      const accounts = await fs.readJson(this.accountsPath);
      const deployments = await fs.readJson(this.deploymentsPath);

      return {
        config,
        accounts,
        deployments
      };
    } catch (error) {
      throw new Error('Football Highlights System not found. Please run the installer first: npx create-football-highlights');
    }
  }

  generateProcessorConfig(installerData) {
    const { config, accounts, deployments } = installerData;

    return {
      // System Configuration
      club: {
        name: config.clubName,
        season: config.season,
        region: config.region,
        email: config.email
      },

      // Processing Settings
      processing: {
        quality: config.videoQuality || 'medium',
        concurrency: this.getConcurrencyByRegion(config.region),
        timeout: 900000, // 15 minutes
        retries: 3
      },

      // Google Services
      google: {
        credentials: accounts.google.serviceAccount,
        driveFolder: accounts.google.driveFolder,
        sheetsId: accounts.google.managementSheetId
      },

      // Deployment Endpoints
      endpoints: {
        primary: deployments.railway.url,
        backup: deployments.render.url,
        coordinator: deployments.cloudflare.url,
        dashboard: `${deployments.railway.url}/admin/queues`
      },

      // Queue Configuration
      redis: {
        url: deployments.railway.redisUrl || deployments.render.redisUrl,
        maxJobs: 1000,
        cleanupInterval: 3600000 // 1 hour
      },

      // Notification Settings
      notifications: {
        email: config.email,
        webhooks: [
          deployments.cloudflare.webhookUrl
        ]
      },

      // Regional Settings
      region: {
        timezone: this.getTimezoneByRegion(config.region),
        ffmpegPreset: this.getFFmpegPresetByRegion(config.region)
      }
    };
  }

  getConcurrencyByRegion(region) {
    const concurrencyMap = {
      'us-east': 3,
      'us-west': 3,
      'europe': 2,
      'asia': 2
    };
    return concurrencyMap[region] || 2;
  }

  getTimezoneByRegion(region) {
    const timezoneMap = {
      'us-east': 'America/New_York',
      'us-west': 'America/Los_Angeles',
      'europe': 'Europe/London',
      'asia': 'Asia/Singapore'
    };
    return timezoneMap[region] || 'UTC';
  }

  getFFmpegPresetByRegion(region) {
    const presetMap = {
      'us-east': 'fast',
      'us-west': 'fast',
      'europe': 'medium',
      'asia': 'medium'
    };
    return presetMap[region] || 'medium';
  }

  async validateInstallerIntegration() {
    try {
      const installerData = await this.loadInstallerConfig();

      const requiredFields = {
        config: ['clubName', 'season', 'region', 'email'],
        accounts: ['google', 'github', 'railway', 'cloudflare'],
        deployments: ['railway', 'render', 'cloudflare']
      };

      for (const [section, fields] of Object.entries(requiredFields)) {
        for (const field of fields) {
          if (!installerData[section][field]) {
            throw new Error(`Missing ${section}.${field} in installer configuration`);
          }
        }
      }

      return {
        valid: true,
        data: installerData
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async createManagementIntegration(installerData) {
    const { config, accounts } = installerData;

    return {
      sheets: {
        managementId: accounts.google.managementSheetId,
        templates: {
          match: 'Matches',
          players: 'Players',
          highlights: 'Generated Highlights',
          stats: 'Processing Stats'
        }
      },

      automation: {
        matchProcessor: {
          triggerUrl: `${installerData.deployments.cloudflare.url}/process`,
          apiKey: accounts.cloudflare.apiKey,
          notificationEmail: config.email
        },

        youtubeUpload: {
          enabled: accounts.google.youtubeEnabled || false,
          channelId: accounts.google.youtubeChannelId || null,
          defaultSettings: {
            privacy: 'unlisted',
            category: '17', // Sports
            tags: [config.clubName, 'football', 'highlights', config.season]
          }
        },

        socialMedia: {
          formats: ['16:9', '1:1', '9:16'],
          platforms: ['youtube', 'facebook', 'instagram', 'tiktok'],
          autoGenerate: true
        }
      },

      monitoring: {
        healthCheck: `${installerData.deployments.railway.url}/health`,
        dashboard: `${installerData.deployments.railway.url}/admin/queues`,
        alertEmail: config.email,
        checkInterval: 300000 // 5 minutes
      }
    };
  }

  generateEnvironmentFile(processorConfig) {
    const env = [
      '# Football Highlights Processor Configuration',
      `# Generated by installer for ${processorConfig.club.name}`,
      `# Region: ${processorConfig.club.region}`,
      '',
      '# Application',
      'NODE_ENV=production',
      'PORT=8080',
      `LOG_LEVEL=${processorConfig.processing.quality === 'high' ? 'debug' : 'info'}`,
      '',
      '# Club Configuration',
      `CLUB_NAME="${processorConfig.club.name}"`,
      `CLUB_SEASON="${processorConfig.club.season}"`,
      `CLUB_REGION="${processorConfig.club.region}"`,
      '',
      '# Processing',
      `WORKER_CONCURRENCY=${processorConfig.processing.concurrency}`,
      `PROCESSING_TIMEOUT=${processorConfig.processing.timeout}`,
      `VIDEO_QUALITY=${processorConfig.processing.quality}`,
      `FFMPEG_PRESET=${processorConfig.region.ffmpegPreset}`,
      '',
      '# Redis/Queue',
      `REDIS_URL="${processorConfig.redis.url}"`,
      `MAX_JOBS=${processorConfig.redis.maxJobs}`,
      '',
      '# Google Services',
      `GOOGLE_CREDENTIALS='${JSON.stringify(processorConfig.google.credentials)}'`,
      `DRIVE_FOLDER_ID="${processorConfig.google.driveFolder}"`,
      `MANAGEMENT_SHEET_ID="${processorConfig.google.sheetsId}"`,
      '',
      '# Endpoints',
      `PRIMARY_ENDPOINT="${processorConfig.endpoints.primary}"`,
      `BACKUP_ENDPOINT="${processorConfig.endpoints.backup}"`,
      `COORDINATOR_URL="${processorConfig.endpoints.coordinator}"`,
      `DASHBOARD_URL="${processorConfig.endpoints.dashboard}"`,
      '',
      '# Notifications',
      `NOTIFICATION_EMAIL="${processorConfig.notifications.email}"`,
      `WEBHOOK_URLS="${processorConfig.notifications.webhooks.join(',')}"`,
      '',
      '# Regional Settings',
      `TZ="${processorConfig.region.timezone}"`,
      ''
    ];

    return env.join('\\n');
  }

  async saveIntegrationFiles(processorConfig, managementIntegration) {
    const integrationDir = path.join(process.cwd(), 'football-highlights-system', 'integration');
    await fs.ensureDir(integrationDir);

    // Save processor configuration
    await fs.writeJson(
      path.join(integrationDir, 'processor-config.json'),
      processorConfig,
      { spaces: 2 }
    );

    // Save management integration
    await fs.writeJson(
      path.join(integrationDir, 'management-config.json'),
      managementIntegration,
      { spaces: 2 }
    );

    // Save environment file
    const envContent = this.generateEnvironmentFile(processorConfig);
    await fs.writeFile(
      path.join(integrationDir, '.env.production'),
      envContent
    );

    // Save Docker compose with proper config
    const dockerCompose = this.generateDockerCompose(processorConfig);
    await fs.writeFile(
      path.join(integrationDir, 'docker-compose.yml'),
      dockerCompose
    );

    return {
      configFile: path.join(integrationDir, 'processor-config.json'),
      managementFile: path.join(integrationDir, 'management-config.json'),
      envFile: path.join(integrationDir, '.env.production'),
      dockerFile: path.join(integrationDir, 'docker-compose.yml')
    };
  }

  generateDockerCompose(config) {
    return `version: '3.8'

services:
  processor:
    image: football-highlights-processor:latest
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - CLUB_NAME="${config.club.name}"
      - CLUB_SEASON="${config.club.season}"
      - CLUB_REGION="${config.club.region}"
      - WORKER_CONCURRENCY=${config.processing.concurrency}
      - VIDEO_QUALITY=${config.processing.quality}
      - REDIS_URL=${config.redis.url}
      - TZ=${config.region.timezone}
    env_file:
      - .env.production
    volumes:
      - ./logs:/app/logs
      - temp_data:/tmp
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 2G
          cpus: '1.0'

volumes:
  temp_data:`;
  }

  async testIntegration() {
    try {
      const validation = await this.validateInstallerIntegration();

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const processorConfig = this.generateProcessorConfig(validation.data);
      const managementIntegration = await this.createManagementIntegration(validation.data);

      // Test endpoint connectivity
      const endpoints = [
        processorConfig.endpoints.primary + '/health',
        processorConfig.endpoints.backup + '/health',
        processorConfig.endpoints.coordinator + '/status'
      ];

      const connectivity = await Promise.allSettled(
        endpoints.map(url => fetch(url, { timeout: 5000 }))
      );

      const healthyEndpoints = connectivity.filter(result =>
        result.status === 'fulfilled' && result.value.ok
      ).length;

      return {
        success: true,
        config: processorConfig,
        management: managementIntegration,
        connectivity: {
          total: endpoints.length,
          healthy: healthyEndpoints,
          ratio: healthyEndpoints / endpoints.length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}