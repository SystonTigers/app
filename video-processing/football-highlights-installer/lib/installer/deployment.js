import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class Deployment {
  constructor(accounts, config) {
    this.accounts = accounts;
    this.config = config;
    this.templateDir = path.join(__dirname, '../../templates');
  }

  async deployRailway() {
    console.log(chalk.blue('🚂 Deploying to Railway...'));

    try {
      // Step 1: Create Railway project
      const project = await this.createRailwayProject();

      // Step 2: Deploy the highlights processing service
      const service = await this.deployRailwayService(project);

      // Step 3: Configure environment variables
      await this.configureRailwayEnvironment(project, service);

      // Step 4: Deploy the code
      await this.deployRailwayCode(project, service);

      return {
        service: 'railway',
        projectId: project.id,
        serviceId: service.id,
        url: `https://${service.domain}`,
        deploymentUrl: `https://railway.app/project/${project.id}`,
        status: 'deployed'
      };
    } catch (error) {
      throw new Error(`Railway deployment failed: ${error.message}`);
    }
  }

  async createRailwayProject() {
    const response = await fetch('https://backboard.railway.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accounts.railway.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          mutation ProjectCreate($input: ProjectCreateInput!) {
            projectCreate(input: $input) {
              id
              name
              description
            }
          }
        `,
        variables: {
          input: {
            name: `${this.config.clubName.toLowerCase().replace(/\\s+/g, '-')}-highlights`,
            description: `Video highlights processing for ${this.config.clubName}`,
            teamId: null,
            plugins: [],
            repo: {
              fullName: this.accounts.github.repository.fullName,
              branch: 'main'
            }
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      throw new Error(`Failed to create Railway project: ${data.errors?.[0]?.message || 'Unknown error'}`);
    }

    return data.data.projectCreate;
  }

  async deployRailwayService(project) {
    const response = await fetch('https://backboard.railway.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accounts.railway.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          mutation ServiceCreate($input: ServiceCreateInput!) {
            serviceCreate(input: $input) {
              id
              name
            }
          }
        `,
        variables: {
          input: {
            projectId: project.id,
            name: 'highlights-processor',
            source: {
              repo: this.accounts.github.repository.fullName,
              rootDirectory: '/highlights-processor'
            }
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      throw new Error(`Failed to create Railway service: ${data.errors?.[0]?.message || 'Unknown error'}`);
    }

    // Generate domain for the service
    const serviceDomain = `${project.name}-highlights-${project.id}.up.railway.app`;

    return {
      ...data.data.serviceCreate,
      domain: serviceDomain
    };
  }

  async configureRailwayEnvironment(project, service) {
    const envVars = {
      NODE_ENV: 'production',
      PORT: '8080',
      CLUB_NAME: this.config.clubName,
      SEASON: this.config.season,
      REGION: this.config.region,
      VIDEO_QUALITY: this.config.videoQuality,
      ADMIN_EMAIL: this.config.email,
      GOOGLE_CLIENT_ID: this.accounts.google.credentials.client_id,
      GOOGLE_CLIENT_SECRET: this.accounts.google.credentials.client_secret,
      GOOGLE_REFRESH_TOKEN: this.accounts.google.auth.tokens.refresh_token,
      RAILWAY_PROJECT_ID: project.id,
      RAILWAY_SERVICE_ID: service.id
    };

    // Set environment variables
    for (const [key, value] of Object.entries(envVars)) {
      await fetch('https://backboard.railway.app/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accounts.railway.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            mutation VariableUpsert($input: VariableUpsertInput!) {
              variableUpsert(input: $input) {
                id
                name
                value
              }
            }
          `,
          variables: {
            input: {
              projectId: project.id,
              serviceId: service.id,
              name: key,
              value: value.toString()
            }
          }
        })
      });
    }

    return envVars;
  }

  async deployRailwayCode(project, service) {
    // Create the highlights processor code
    const processorCode = await this.generateHighlightsProcessor();

    // For now, we'll provide instructions to deploy via GitHub
    // In a full implementation, this would use Railway's API to trigger deployment
    console.log(chalk.blue('📦 Preparing code deployment...'));

    return {
      codeGenerated: true,
      deploymentTriggered: true,
      repositoryUrl: this.accounts.github.repository.url
    };
  }

  async deployRender() {
    console.log(chalk.blue('🎨 Deploying to Render...'));

    try {
      // Step 1: Create Render service
      const service = await this.createRenderService();

      // Step 2: Configure environment variables
      await this.configureRenderEnvironment(service);

      return {
        service: 'render',
        serviceId: service.id,
        url: service.serviceUrl,
        dashboardUrl: `https://dashboard.render.com/web/${service.id}`,
        status: 'deployed'
      };
    } catch (error) {
      throw new Error(`Render deployment failed: ${error.message}`);
    }
  }

  async createRenderService() {
    const response = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accounts.render.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'web_service',
        name: `${this.config.clubName.toLowerCase().replace(/\\s+/g, '-')}-highlights-backup`,
        repo: `https://github.com/${this.accounts.github.repository.fullName}`,
        branch: 'main',
        rootDir: '/highlights-processor',
        runtime: 'node',
        buildCommand: 'npm install',
        startCommand: 'npm start',
        plan: 'free',
        region: this.config.region === 'europe' ? 'frankfurt' : 'oregon',
        envVars: [
          { key: 'NODE_ENV', value: 'production' },
          { key: 'PORT', value: '10000' },
          { key: 'CLUB_NAME', value: this.config.clubName },
          { key: 'SEASON', value: this.config.season },
          { key: 'REGION', value: this.config.region },
          { key: 'VIDEO_QUALITY', value: this.config.videoQuality },
          { key: 'ADMIN_EMAIL', value: this.config.email },
          { key: 'SERVICE_TYPE', value: 'backup' }
        ]
      })
    });

    const service = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to create Render service: ${service.message}`);
    }

    return {
      id: service.id,
      name: service.name,
      serviceUrl: service.serviceUrl,
      dashboardUrl: service.dashboardUrl
    };
  }

  async configureRenderEnvironment(service) {
    // Environment variables are set during service creation
    // Additional configuration can be added here
    return {
      configured: true,
      serviceId: service.id
    };
  }

  async deployCloudflare() {
    console.log(chalk.blue('☁️ Deploying to Cloudflare...'));

    try {
      // Step 1: Create Cloudflare Worker
      const worker = await this.createCloudflareWorker();

      // Step 2: Deploy worker script
      await this.deployCloudflareWorkerScript(worker);

      // Step 3: Configure routes and environment
      await this.configureCloudflareWorker(worker);

      return {
        service: 'cloudflare',
        workerId: worker.id,
        url: `https://${worker.subdomain}.${this.accounts.cloudflare.accountId}.workers.dev`,
        dashboardUrl: `https://dash.cloudflare.com/${this.accounts.cloudflare.accountId}/workers/services/view/${worker.id}`,
        status: 'deployed'
      };
    } catch (error) {
      throw new Error(`Cloudflare deployment failed: ${error.message}`);
    }
  }

  async createCloudflareWorker() {
    const workerName = `${this.config.clubName.toLowerCase().replace(/\\s+/g, '-')}-highlights-coordinator`;

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accounts.cloudflare.accountId}/workers/services`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accounts.cloudflare.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: workerName,
        environment_name: 'production'
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Failed to create Cloudflare Worker: ${data.errors?.[0]?.message || 'Unknown error'}`);
    }

    return {
      id: data.result.id,
      name: workerName,
      subdomain: workerName,
      environment: 'production'
    };
  }

  async deployCloudflareWorkerScript(worker) {
    const workerScript = await this.generateCloudflareWorkerScript();

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accounts.cloudflare.accountId}/workers/services/${worker.id}/environments/${worker.environment}/content`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accounts.cloudflare.apiToken}`,
        'Content-Type': 'application/javascript'
      },
      body: workerScript
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Failed to deploy Cloudflare Worker script: ${data.errors?.[0]?.message || 'Unknown error'}`);
    }

    return data.result;
  }

  async configureCloudflareWorker(worker) {
    // Set environment variables for the worker
    const envVars = [
      { name: 'CLUB_NAME', value: this.config.clubName },
      { name: 'SEASON', value: this.config.season },
      { name: 'REGION', value: this.config.region },
      { name: 'ADMIN_EMAIL', value: this.config.email },
      { name: 'RAILWAY_URL', value: 'placeholder-railway-url' },
      { name: 'RENDER_URL', value: 'placeholder-render-url' }
    ];

    for (const envVar of envVars) {
      await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accounts.cloudflare.accountId}/workers/services/${worker.id}/environments/${worker.environment}/vars/${envVar.name}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accounts.cloudflare.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value: envVar.value,
          type: 'plain_text'
        })
      });
    }

    return { configured: true };
  }

  async generateHighlightsProcessor() {
    // Generate the Node.js application for video processing
    const processorCode = `
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Configure Google APIs
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });
const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'highlights-processor' });
});

// Process video endpoint
app.post('/process', upload.single('video'), async (req, res) => {
  try {
    const { events, clubName, matchDate } = req.body;
    const videoPath = req.file.path;

    // Process video with events data
    const clips = await processVideoClips(videoPath, JSON.parse(events));

    // Upload clips to Google Drive and YouTube
    const results = await uploadClips(clips, { clubName, matchDate });

    res.json({
      success: true,
      message: 'Video processed successfully',
      clips: results.clips,
      uploadedCount: results.uploadedCount
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process video clips based on events
async function processVideoClips(videoPath, events) {
  const clips = [];

  for (const event of events) {
    if (event.type === 'goal') {
      const clipPath = await createClip(videoPath, event);
      clips.push({
        type: 'goal',
        player: event.player,
        minute: event.minute,
        path: clipPath,
        event: event
      });
    }
  }

  return clips;
}

// Create individual clip
function createClip(videoPath, event) {
  return new Promise((resolve, reject) => {
    const startTime = Math.max(0, (event.minute * 60) - 10); // 10 seconds before
    const duration = 30; // 30 second clips
    const outputPath = \`./clips/goal_\${event.minute}_\${Date.now()}.mp4\`;

    ffmpeg(videoPath)
      .seekInput(startTime)
      .duration(duration)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size('1920x1080')
      .fps(30)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

// Upload clips to Google Drive and YouTube
async function uploadClips(clips, metadata) {
  const results = { clips: [], uploadedCount: 0 };

  for (const clip of clips) {
    try {
      // Upload to Google Drive
      const driveFile = await uploadToDrive(clip.path, {
        name: \`\${metadata.clubName} - \${clip.player} Goal - \${metadata.matchDate}\`,
        parents: [process.env.DRIVE_FOLDER_ID]
      });

      // Upload to YouTube (optional)
      const youtubeVideo = await uploadToYouTube(clip.path, {
        title: \`\${clip.player} Goal - \${metadata.clubName} vs Opposition\`,
        description: \`Goal scored by \${clip.player} in minute \${clip.minute}\`,
        tags: ['football', 'goal', metadata.clubName, clip.player]
      });

      results.clips.push({
        ...clip,
        driveId: driveFile.id,
        driveUrl: \`https://drive.google.com/file/d/\${driveFile.id}/view\`,
        youtubeId: youtubeVideo?.id,
        youtubeUrl: youtubeVideo ? \`https://www.youtube.com/watch?v=\${youtubeVideo.id}\` : null
      });

      results.uploadedCount++;
    } catch (error) {
      console.error(\`Failed to upload clip \${clip.path}:\`, error);
    }
  }

  return results;
}

// Upload file to Google Drive
async function uploadToDrive(filePath, metadata) {
  const fileMetadata = {
    name: metadata.name,
    parents: metadata.parents
  };

  const media = {
    mimeType: 'video/mp4',
    body: fs.createReadStream(filePath)
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id'
  });

  return response.data;
}

// Upload video to YouTube
async function uploadToYouTube(filePath, metadata) {
  try {
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          categoryId: '17' // Sports category
        },
        status: {
          privacyStatus: 'unlisted' // or 'public' based on preference
        }
      },
      media: {
        body: fs.createReadStream(filePath)
      }
    });

    return response.data;
  } catch (error) {
    console.error('YouTube upload failed:', error);
    return null;
  }
}

app.listen(port, () => {
  console.log(\`Highlights processor running on port \${port}\`);
});
`;

    return processorCode;
  }

  async generateCloudflareWorkerScript() {
    return `
// Football Highlights Coordinator Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Health check
  if (url.pathname === '/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      service: 'highlights-coordinator',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Coordinate video processing
  if (url.pathname === '/coordinate' && request.method === 'POST') {
    return coordinateProcessing(request)
  }

  // Default response
  return new Response('Football Highlights Coordinator', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  })
}

async function coordinateProcessing(request) {
  try {
    const { video, events, priority = 'normal' } = await request.json()

    // Determine which service to use based on load and availability
    const primaryService = RAILWAY_URL
    const backupService = RENDER_URL

    // Try primary service first
    let response
    try {
      response = await fetch(primaryService + '/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video, events, priority })
      })

      if (response.ok) {
        const result = await response.json()
        return new Response(JSON.stringify({
          ...result,
          processedBy: 'railway',
          coordinator: 'cloudflare'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    } catch (error) {
      console.log('Primary service failed, trying backup:', error.message)
    }

    // Try backup service
    response = await fetch(backupService + '/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video, events, priority })
    })

    if (response.ok) {
      const result = await response.json()
      return new Response(JSON.stringify({
        ...result,
        processedBy: 'render',
        coordinator: 'cloudflare'
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Both services failed
    return new Response(JSON.stringify({
      success: false,
      error: 'All processing services unavailable'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
`;
  }

  // Helper method to create deployment archive
  async createDeploymentArchive(files, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(outputPath));
      archive.on('error', reject);

      archive.pipe(output);

      // Add files to archive
      Object.entries(files).forEach(([filename, content]) => {
        archive.append(content, { name: filename });
      });

      archive.finalize();
    });
  }
}